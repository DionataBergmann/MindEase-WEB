"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Save,
  Camera,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { getFirebaseAuth, getFirestoreDb, getCurrentUserWhenReady } from "@/lib/firebase";
import { imageDataUrlToSupported, compressImageForApi } from "@/lib/image-utils";
import type { ProcessContentResponse } from "@/types/process-content";
import type { Material } from "@/types/project";

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

export default function AddPdfPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? params.id : "";
  const materialId = searchParams.get("materialId") ?? undefined;
  const isSingleTopic = Boolean(materialId);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [mergeAllIntoOne, setMergeAllIntoOne] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessContentResponse | null>(null);
  const [results, setResults] = useState<ProcessContentResponse[]>([]);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  const hasSources = pdfFiles.length > 0 || imageFiles.length > 0;
  const topicCountAddToProject = mergeAllIntoOne
    ? hasSources ? 1 : 0
    : pdfFiles.length + imageFiles.length;
  const topicCountSingleTopic = topicCountAddToProject;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;
      const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
      if (pdfs.length) {
        setPdfFiles((prev) => [...prev, ...pdfs]);
        setResults([]);
        setResult(null);
      }
      setError(null);
      e.target.value = "";
    },
    []
  );

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setImageFiles((prev) => [...prev, ...images]);
    setResults([]);
    setResult(null);
    setError(null);
    e.target.value = "";
  }, []);

  const handlePdfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const list = e.dataTransfer.files;
    if (!list?.length) return;
    const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
    if (pdfs.length) {
      setPdfFiles((prev) => [...prev, ...pdfs]);
      setResults([]);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const list = e.dataTransfer.files;
    if (!list?.length) return;
    const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
    if (pdfs.length) {
      setPdfFiles((prev) => [...prev, ...pdfs]);
      setResults([]);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const removePdf = useCallback((index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
    setResults([]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setResults([]);
  }, []);

  const clearImageGroup = useCallback(() => {
    setImageFiles([]);
  }, []);

  const removeResult = useCallback((index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeFile = useCallback((index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = async () => {
    const topicCount = isSingleTopic ? topicCountSingleTopic : topicCountAddToProject;
    if (topicCount === 0) {
      setError("Adicione PDFs e/ou fotos.");
      return;
    }
    setError(null);
    setResults([]);
    const allResults: ProcessContentResponse[] = [];

    if (mergeAllIntoOne) {
      setProcessingIndex(0);
      try {
        let mergedText = "";
        for (const f of pdfFiles) {
          const text = await extractTextFromPdf(f);
          if (text) mergedText += (mergedText ? "\n\n" : "") + text;
        }
        const compressedImages: string[] = [];
        if (imageFiles.length > 0) {
          const rawUrls = await Promise.all(imageFiles.map(fileToDataUrl));
          const imageDataUrls = await Promise.all(rawUrls.map(imageDataUrlToSupported));
          compressedImages.push(...(await Promise.all(imageDataUrls.map(compressImageForApi))));
        }
        const body: { text?: string; images?: string[] } = {};
        if (mergedText) body.text = mergedText;
        if (compressedImages.length > 0) body.images = compressedImages;
        if (!body.text && !body.images?.length) {
          setError("Não foi possível extrair conteúdo dos arquivos.");
          setProcessingIndex(null);
          return;
        }
        const res = await fetch("/api/process-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erro ao processar com a IA.");
          setProcessingIndex(null);
          return;
        }
        allResults.push(data as ProcessContentResponse);
        setResults([...allResults]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar.");
        setProcessingIndex(null);
        return;
      }
    } else {
      for (let i = 0; i < pdfFiles.length; i++) {
        const f = pdfFiles[i];
        setProcessingIndex(i);
        try {
          const text = await extractTextFromPdf(f);
          if (!text) {
            setError(`Não foi possível extrair texto de "${f.name}" (pode estar vazio ou ser imagem).`);
            setProcessingIndex(null);
            return;
          }
          const res = await fetch("/api/process-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? `Erro ao processar "${f.name}" com a IA.`);
            setProcessingIndex(null);
            return;
          }
          allResults.push(data as ProcessContentResponse);
          setResults([...allResults]);
        } catch (err) {
          setError(err instanceof Error ? err.message : `Erro ao processar "${f.name}".`);
          setProcessingIndex(null);
          return;
        }
      }
      for (let i = 0; i < imageFiles.length; i++) {
        setProcessingIndex(pdfFiles.length + i);
        try {
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
            setError(data.error ?? `Erro ao processar a foto ${i + 1} com a IA.`);
            setProcessingIndex(null);
            return;
          }
          allResults.push(data as ProcessContentResponse);
          setResults([...allResults]);
        } catch (err) {
          setError(err instanceof Error ? err.message : `Erro ao processar a foto ${i + 1}.`);
          setProcessingIndex(null);
          return;
        }
      }
    }
    setProcessingIndex(null);
    if (allResults.length > 0) {
      if (isSingleTopic && allResults.length === 1) setResult(allResults[0]);
      else if (isSingleTopic) setResult(null);
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  };

  const handleAddToProject = async () => {
    if (isSingleTopic && !result && results.length === 0) return;
    if (!isSingleTopic && results.length === 0) return;
    if (!projectId) return;
    const auth = getFirebaseAuth();
    const user = await getCurrentUserWhenReady(auth);
    if (!user) {
      setError("Faça login para continuar.");
      return;
    }
    const db = getFirestoreDb();
    if (!db) {
      setError("Firebase não está configurado.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const projectRef = doc(db, "projects", projectId);
      const snap = await getDoc(projectRef);
      if (!snap.exists()) {
        setError("Projeto não encontrado.");
        return;
      }
      const data = snap.data();
      if (data.userId !== user.uid) {
        setError("Você não tem permissão para editar este projeto.");
        return;
      }
      let currentMateriais: Material[] = Array.isArray(data.materiais)
        ? data.materiais
        : [];
      if (currentMateriais.length === 0 && (data.resumo || (data.cards?.length ?? 0) > 0)) {
        currentMateriais = [
          {
            id: crypto.randomUUID(),
            nomeArquivo: "PDF",
            resumo: data.resumo ?? "",
            cards: Array.isArray(data.cards) ? data.cards : [],
          },
        ];
      }
      let updatedMateriais: Material[];
      if (materialId && result) {
        const idx = currentMateriais.findIndex((m) => m.id === materialId);
        if (idx === -1) {
          setError("Tópico não encontrado neste projeto.");
          return;
        }
        const existing = currentMateriais[idx];
        updatedMateriais = currentMateriais.slice();
        updatedMateriais[idx] = {
          ...existing,
          nomeArquivo: pdfFiles.length > 0 ? pdfFiles[0].name : imageFiles.length > 1 ? `Fotos (${imageFiles.length})` : imageFiles.length === 1 ? "Foto" : existing.nomeArquivo,
          resumo: result.resumo,
          resumoBreve: result.resumoBreve,
          resumoMedio: result.resumoMedio,
          resumoCompleto: result.resumoCompleto,
          cards: result.cards,
        };
      } else {
        const newMateriais: Material[] = results.map((r, i) => {
          const nomeArquivo =
            i < pdfFiles.length
              ? pdfFiles[i].name
              : imageFiles.length > 1
                ? `Fotos (${imageFiles.length})`
                : "Foto";
          return {
            id: crypto.randomUUID(),
            nomeArquivo,
            resumo: r.resumo,
            resumoBreve: r.resumoBreve,
            resumoMedio: r.resumoMedio,
            resumoCompleto: r.resumoCompleto,
            cards: r.cards,
          };
        });
        updatedMateriais = [...currentMateriais, ...newMateriais];
      }
      const completedCount = updatedMateriais.filter((m) => (m.status ?? "pending") === "completed").length;
      const progress = updatedMateriais.length === 0 ? 0 : Math.round((completedCount / updatedMateriais.length) * 100);
      await updateDoc(projectRef, {
        materiais: updatedMateriais,
        pdfCount: updatedMateriais.length,
        progress,
        updatedAt: serverTimestamp(),
      });
      router.push(`/project/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar no Firebase.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href={projectId ? `/project/${projectId}` : "/home"}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao projeto
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {materialId ? "Adicionar material a este tópico" : "Adicionar PDF ao projeto"}
          </h1>
          <p className="text-muted-foreground mb-8">
            Envie PDFs e/ou fotos de páginas. Abaixo você escolhe se quer um tópico por arquivo ou juntar tudo em um único tópico com resumo e cards.
          </p>

          <div className="space-y-6">
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  PDFs
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-input"
                />
                <div
                  onDrop={handlePdfDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById("pdf-input")?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Enviar PDFs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">vários de uma vez</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Fotos para 1 tópico
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-input"
                />
                <div
                  onClick={() => document.getElementById("image-input")?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Tirar foto ou enviar da galeria</p>
                  <p className="text-xs text-muted-foreground mt-0.5">várias fotos = 1 tópico</p>
                </div>
                {imageFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {imageFiles.map((_, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
                      >
                        <ImageIcon className="w-4 h-4 shrink-0" />
                        Foto {i + 1}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
                          aria-label="Remover foto"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={clearImageGroup}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Limpar todas
                    </button>
                  </div>
                )}
              </div>
            </div>

            {pdfFiles.length > 0 && (
              <div>
                <span className="text-sm font-medium text-foreground">PDFs: </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pdfFiles.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      {f.name}
                      <button
                        type="button"
                        onClick={() => removePdf(i)}
                        className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
                        aria-label="Remover"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasSources && (
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {mergeAllIntoOne ? "Tudo em um único tópico" : "Cada arquivo = 1 tópico"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mergeAllIntoOne
                      ? "PDFs e fotos serão combinados em um só resumo e cards."
                      : "Cada PDF e cada foto geram um tópico separado."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mergeAllIntoOne}
                  aria-label={mergeAllIntoOne ? "Juntar tudo em um tópico (ativado)" : "Cada arquivo um tópico (ativado)"}
                  onClick={() => setMergeAllIntoOne((prev) => !prev)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    mergeAllIntoOne ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      mergeAllIntoOne ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleProcess}
              disabled={topicCountAddToProject === 0 || processingIndex !== null}
              size="lg"
              className="w-full"
            >
              {processingIndex !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando {processingIndex + 1} de {topicCountAddToProject}…
                </>
              ) : (
                `Gerar resumo e cards${topicCountAddToProject > 1 ? ` (${topicCountAddToProject} tópicos)` : topicCountAddToProject === 1 ? " (1 tópico)" : ""}`
              )}
            </Button>
            </>

          </div>

          {isSingleTopic && result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 space-y-6 p-6 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Conteúdo gerado</span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Resumo
                </h3>
                <p className="text-foreground leading-relaxed">{result.resumo}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Cards / Tópicos
                </h3>
                <ul className="space-y-4">
                  {result.cards.map((card, i) => (
                    <li
                      key={i}
                      className="p-4 rounded-lg border bg-background/50"
                    >
                      <h4 className="font-display font-bold text-foreground mb-1">
                        {card.titulo}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {card.conteudo}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleAddToProject}
                disabled={isSaving}
                size="lg"
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando ao projeto...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {materialId ? "Salvar neste tópico" : "Adicionar ao projeto"}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {(results.length > 0 && (!isSingleTopic || !result)) && (
            <motion.div
              ref={resultsSectionRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 space-y-6 p-6 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  {results.length} {results.length === 1 ? "tópico gerado" : "tópicos gerados"}
                </span>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {results.map((r, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-background/50 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {idx < pdfFiles.length
                        ? pdfFiles[idx].name
                        : imageFiles.length > 1
                          ? `Foto ${idx - pdfFiles.length + 1}`
                          : "Foto"}
                    </h3>
                    <p className="text-foreground leading-relaxed text-sm line-clamp-3">{r.resumo}</p>
                    <p className="text-xs text-muted-foreground">{r.cards.length} card(s)</p>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleAddToProject}
                disabled={isSaving}
                size="lg"
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando ao projeto...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Adicionar {results.length} tópico(s) ao projeto
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
