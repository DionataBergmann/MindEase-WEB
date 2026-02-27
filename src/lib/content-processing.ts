import { imageDataUrlToSupported, compressImageForApi } from "@/lib/image-utils";
import type { ProcessContentResponse } from "@/types/process-content";

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const version = (pdfjsLib as { version?: string }).version ?? "4.7.76";
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let fullText = "";

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText.trim();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export type ProcessSourcesOptions = {
  pdfFiles: File[];
  imageFiles: File[];
  mergeAllIntoOne: boolean;
  onStep?: (index: number) => void;
};

export async function processSources({
  pdfFiles,
  imageFiles,
  mergeAllIntoOne,
  onStep,
}: ProcessSourcesOptions): Promise<ProcessContentResponse[]> {
  const allResults: ProcessContentResponse[] = [];

  if (mergeAllIntoOne) {
    if (pdfFiles.length === 0 && imageFiles.length === 0) {
      return [];
    }
    onStep?.(0);

    let mergedText = "";
    for (const file of pdfFiles) {
      const text = await extractTextFromPdf(file);
      if (text) {
        mergedText += (mergedText ? "\n\n" : "") + text;
      }
    }

    const compressedImages: string[] = [];
    if (imageFiles.length > 0) {
      const rawUrls = await Promise.all(imageFiles.map(fileToDataUrl));
      const imageDataUrls = await Promise.all(rawUrls.map(imageDataUrlToSupported));
      const compressed = await Promise.all(imageDataUrls.map(compressImageForApi));
      compressedImages.push(...compressed);
    }

    const body: { text?: string; images?: string[] } = {};
    if (mergedText) body.text = mergedText;
    if (compressedImages.length > 0) body.images = compressedImages;
    if (!body.text && !body.images?.length) {
      throw new Error("Não foi possível extrair conteúdo dos arquivos.");
    }

    const res = await fetch("/api/process-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Erro ao processar com a IA.");
    }
    allResults.push(data as ProcessContentResponse);
    return allResults;
  }

  // Cada arquivo gera um tópico separado
  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    onStep?.(i);
    const text = await extractTextFromPdf(file);
    if (!text) {
      throw new Error(
        `Não foi possível extrair texto de "${file.name}" (pode estar vazio ou ser imagem).`
      );
    }
    const res = await fetch("/api/process-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? `Erro ao processar "${file.name}" com a IA.`);
    }
    allResults.push(data as ProcessContentResponse);
  }

  for (let i = 0; i < imageFiles.length; i++) {
    onStep?.(pdfFiles.length + i);
    const rawUrl = await fileToDataUrl(imageFiles[i]);
    const dataUrl = await imageDataUrlToSupported(rawUrl);
    const compressed = await compressImageForApi(dataUrl);
    const res = await fetch("/api/process-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [compressed] }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.error ?? `Erro ao processar a foto ${i + 1} com a IA.`
      );
    }
    allResults.push(data as ProcessContentResponse);
  }

  return allResults;
}

/**
 * Nome de exibição do tópico no índice i (para lista de resultados e materiais).
 * Ordem: PDFs primeiro, depois fotos (Foto 1, Foto 2… ou "Foto" se uma só).
 */
export function getTopicDisplayName(
  index: number,
  pdfFiles: File[],
  imageFiles: File[]
): string {
  if (index < pdfFiles.length) return pdfFiles[index].name;
  if (imageFiles.length > 1)
    return `Foto ${index - pdfFiles.length + 1}`;
  return imageFiles.length === 1 ? "Foto" : `Tópico ${index + 1}`;
}

/** Nome para um único tópico gerado a partir de vários arquivos (ex.: "Fotos (3)" ou nome do PDF). */
export function getSingleTopicDisplayName(pdfFiles: File[], imageFiles: File[]): string {
  if (pdfFiles.length > 0) return pdfFiles[0].name;
  if (imageFiles.length > 1) return `Fotos (${imageFiles.length})`;
  return imageFiles.length === 1 ? "Foto" : "Tópico";
}

