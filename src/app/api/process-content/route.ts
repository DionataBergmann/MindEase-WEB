import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ProcessContentResponse } from "@/types/process-content";

const systemPrompt = `Tu és um assistente que organiza conteúdo de estudo. Recebes um texto extraído de um PDF e deves responder APENAS com um JSON válido, sem markdown nem texto antes/depois, no seguinte formato:
{
  "resumo": "Resumo principal do material (1 parágrafo; será usado como padrão).",
  "resumoBreve": "Resumo em 2-3 frases apenas, bem direto.",
  "resumoMedio": "Resumo em um parágrafo (4-6 frases), com os pontos principais.",
  "resumoCompleto": "Resumo em 2-3 parágrafos, com mais detalhes e contexto.",
  "cards": [
    { "titulo": "Título do tópico/card", "conteudo": "Conteúdo resumido desse tópico para estudo." },
    ...
  ]
}
Regras: divide o conteúdo em 3 a 8 cards lógicos (tópicos). Cada "conteudo" deve ser conciso (um parágrafo). Os três resumos (breve, médio, completo) devem cobrir o mesmo material em níveis de detalhe diferentes. Responde só o JSON.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada." },
      { status: 500 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido. Envie JSON com campo 'text'." },
      { status: 400 }
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "Campo 'text' é obrigatório e não pode estar vazio." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text.slice(0, 12000) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "A IA não retornou conteúdo." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as ProcessContentResponse;
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
      return NextResponse.json(
        { error: "Resposta da IA em formato inesperado." },
        { status: 502 }
      );
    }
    // Normalize: ensure at least resumo exists; optional resumoBreve/Medio/Completo
    const resumoBreve = typeof parsed.resumoBreve === "string" ? parsed.resumoBreve : undefined;
    const resumoMedio = typeof parsed.resumoMedio === "string" ? parsed.resumoMedio : undefined;
    const resumoCompleto = typeof parsed.resumoCompleto === "string" ? parsed.resumoCompleto : undefined;
    const out: ProcessContentResponse = {
      resumo: parsed.resumo,
      cards: parsed.cards,
    };
    if (resumoBreve) out.resumoBreve = resumoBreve;
    if (resumoMedio) out.resumoMedio = resumoMedio;
    if (resumoCompleto) out.resumoCompleto = resumoCompleto;

    return NextResponse.json(out);
  } catch (err) {
    console.error("OpenAI error:", err);
    const message = err instanceof Error ? err.message : "Erro ao processar com a IA.";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
