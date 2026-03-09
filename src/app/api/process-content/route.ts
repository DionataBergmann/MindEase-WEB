import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getProcessContentSystemPrompt } from "@/lib/prompts/process-content";
import type { ProcessContentResponse } from "@/types/process-content";

const SUPPORTED_IMAGE_PREFIX = /^data:image\/(jpeg|png|gif|webp);base64,/i;
const HEIC_HEIF_PREFIX = /^data:image\/(heic|heif)(-sequence)?/i;
const DATA_URL_PREFIX = /^data:[^;]+;base64,/;
function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const ftyp = buffer.toString("ascii", 4, 8);
  if (ftyp !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12);
  const heicBrands = ["heic", "heix", "mif1", "hevc", "hevx", "hevm", "hevs", "heif", "msf1"];
  return heicBrands.includes(brand);
}

async function normalizeImageDataUrl(dataUrl: string): Promise<string> {
  if (SUPPORTED_IMAGE_PREFIX.test(dataUrl)) return dataUrl;
  if (!DATA_URL_PREFIX.test(dataUrl)) return dataUrl;
  const base64 = dataUrl.replace(DATA_URL_PREFIX, "");
  const inputBuffer = Buffer.from(base64, "base64");
  const isHeic = HEIC_HEIF_PREFIX.test(dataUrl) || isHeicBuffer(inputBuffer);
  if (!isHeic) return dataUrl;
  try {
    const convert = (await import("heic-convert")).default;
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.9,
    });
    const outBase64 = (outputBuffer as Buffer).toString("base64");
    return `data:image/jpeg;base64,${outBase64}`;
  } catch (err) {
    console.error("HEIC conversion error:", err);
    throw new Error(
      "Não foi possível converter a foto (formato HEIC). Tente enviar em JPEG ou PNG."
    );
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada." }, { status: 500 });
  }

  let body: { text?: string; image?: string; images?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido. Envie JSON com 'text', 'image' ou 'images' (data URLs)." },
      { status: 400 }
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const singleImage = typeof body.image === "string" ? body.image.trim() : "";
  const isImageDataUrl = (u: string) =>
    typeof u === "string" &&
    u.startsWith("data:") &&
    (u.startsWith("data:image/") || u.startsWith("data:application/octet-stream;base64,"));
  const imageList = Array.isArray(body.images)
    ? body.images.filter((u): u is string => isImageDataUrl(u))
    : [];
  let imageUrls: string[] =
    imageList.length > 0 ? imageList : isImageDataUrl(singleImage) ? [singleImage] : [];
  // Converter HEIC (iPhone) para JPEG no servidor — a API Vision não aceita HEIC
  if (imageUrls.length > 0) {
    imageUrls = await Promise.all(imageUrls.map(normalizeImageDataUrl));
  }
  const hasText = text.length > 0;
  const hasImages = imageUrls.length > 0;

  if (!hasText && !hasImages) {
    return NextResponse.json(
      { error: "Envie 'text', 'image' ou 'images' (array de data URLs)." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const textInstruction = hasImages
    ? imageUrls.length > 1
      ? "Analisa estas imagens (fotos de páginas do mesmo material). Gera o JSON conforme as instruções do sistema (formato PADRÃO ou QUESTÕES, conforme o tipo de conteúdo). Se for prova/questões: transcreve o enunciado e as alternativas exatamente como aparecem na imagem, palavra por palavra, sem resumir."
      : "Analisa esta imagem e gera o JSON conforme as instruções do sistema (formato PADRÃO ou QUESTÕES, conforme o tipo de conteúdo). Se for prova/questão: transcreve o enunciado e as alternativas exatamente como aparecem na imagem, palavra por palavra, sem resumir."
    : "";
  const textBlock = hasText
    ? textInstruction
      ? `Texto extraído de PDFs:\n\n${text.slice(0, 10000)}\n\n${textInstruction}`
      : text.slice(0, 12000)
    : textInstruction;
  const userContent: ContentPart[] = hasImages
    ? [
        ...(textBlock ? [{ type: "text" as const, text: textBlock }] : []),
        ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
      ]
    : [{ type: "text", text: text.slice(0, 12000) }];

  try {
    const systemPrompt = getProcessContentSystemPrompt();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    let raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ error: "A IA não retornou conteúdo." }, { status: 502 });
    }
    // Remover bloco markdown se a IA envolveu o JSON em ```json ... ```
    const jsonMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
    if (jsonMatch) raw = jsonMatch[1].trim();

    let parsed: ProcessContentResponse;
    try {
      parsed = JSON.parse(raw) as ProcessContentResponse;
    } catch {
      return NextResponse.json({ error: "Resposta da IA em formato inesperado." }, { status: 502 });
    }
    if (
      typeof parsed.resumo !== "string" ||
      !Array.isArray(parsed.cards) ||
      !parsed.cards.every(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          typeof c.titulo === "string" &&
          typeof c.conteudo === "string"
      )
    ) {
      return NextResponse.json({ error: "Resposta da IA em formato inesperado." }, { status: 502 });
    }
    // Normalize cards: aceitar opcoes/options e correctOptionIndex (número ou string); descartar se inválido
    const cards = parsed.cards.map((c) => {
      const card: ProcessContentResponse["cards"][number] = { titulo: c.titulo, conteudo: c.conteudo };
      const raw = c as Record<string, unknown>;
      const opcoes = Array.isArray(c.opcoes)
        ? c.opcoes
        : Array.isArray(raw.options) && raw.options.every((o: unknown) => typeof o === "string")
          ? (raw.options as string[])
          : null;
      let idx = typeof c.correctOptionIndex === "number" ? c.correctOptionIndex : NaN;
      if (Number.isNaN(idx) && typeof raw.correctOptionIndex === "string") {
        idx = parseInt(raw.correctOptionIndex, 10);
      }
      if (Number.isNaN(idx) && typeof raw.correctIndex === "number") idx = raw.correctIndex;
      if (
        opcoes &&
        opcoes.length > 0 &&
        opcoes.every((o) => typeof o === "string") &&
        Number.isInteger(idx) &&
        idx >= 0 &&
        idx < opcoes.length
      ) {
        card.opcoes = opcoes;
        card.correctOptionIndex = idx;
      }
      return card;
    });
    const resumoBreve = typeof parsed.resumoBreve === "string" ? parsed.resumoBreve : undefined;
    const resumoMedio = typeof parsed.resumoMedio === "string" ? parsed.resumoMedio : undefined;
    const resumoCompleto =
      typeof parsed.resumoCompleto === "string" ? parsed.resumoCompleto : undefined;
    const flashcardsRaw = (parsed as ProcessContentResponse & { flashcards?: unknown }).flashcards;
    const flashcards =
      Array.isArray(flashcardsRaw) &&
      flashcardsRaw.every(
        (f): f is { titulo: string; conteudo: string } =>
          typeof f === "object" &&
          f !== null &&
          typeof (f as { titulo?: unknown }).titulo === "string" &&
          typeof (f as { conteudo?: unknown }).conteudo === "string"
      )
        ? flashcardsRaw
        : undefined;
    const out: ProcessContentResponse = {
      resumo: parsed.resumo,
      cards,
    };
    if (resumoBreve) out.resumoBreve = resumoBreve;
    if (resumoMedio) out.resumoMedio = resumoMedio;
    if (resumoCompleto) out.resumoCompleto = resumoCompleto;
    if (flashcards && flashcards.length > 0) out.flashcards = flashcards;

    return NextResponse.json(out);
  } catch (err) {
    console.error("OpenAI error:", err);
    const message = err instanceof Error ? err.message : "Erro ao processar com a IA.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
