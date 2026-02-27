"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, ArrowLeft, CheckCircle, Save } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { getFirebaseAuth, getFirestoreDb, getCurrentUserWhenReady } from "@/lib/firebase";
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

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProcessContentResponse[]>([]);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
    setFiles(pdfs);
    setResults([]);
    setError(null);
    e.target.value = "";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const list = e.dataTransfer.files;
    if (!list?.length) return;
    const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
    if (pdfs.length) {
      setFiles(pdfs);
      setResults([]);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = async () => {
    if (!files.length) {
      setError("Selecione um ou mais PDFs.");
      return;
    }
    setError(null);
    setResults([]);

    const allResults: ProcessContentResponse[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingIndex(i);
      try {
        const text = await extractTextFromPdf(file);
        if (!text) {
          setError(`Não foi possível extrair texto de "${file.name}" (pode estar vazio ou ser imagem).`);
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
          setError(data.error ?? `Erro ao processar "${file.name}" com a IA.`);
          setProcessingIndex(null);
          return;
        }
        allResults.push(data as ProcessContentResponse);
        setResults([...allResults]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Erro ao processar "${file.name}".`);
        setProcessingIndex(null);
        return;
      }
    }
    setProcessingIndex(null);
  };

  const handleSaveProject = async () => {
    if (!results.length || results.length !== files.length) return;
    const auth = getFirebaseAuth();
    const user = await getCurrentUserWhenReady(auth);
    if (!user) {
      setError("Faça login para salvar o projeto.");
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
      const title =
        projectName.trim() ||
        (files[0]?.name ?? "").replace(/\.pdf$/i, "") ||
        "Sem título";
      const materiais = results.map((result, i) => ({
        id: crypto.randomUUID(),
        nomeArquivo: files[i]?.name ?? undefined,
        resumo: result.resumo,
        resumoBreve: result.resumoBreve,
        resumoMedio: result.resumoMedio,
        resumoCompleto: result.resumoCompleto,
        cards: result.cards,
      }));
      await addDoc(collection(db, "projects"), {
        userId: user.uid,
        title,
        emoji: "📚",
        pdfCount: materiais.length,
        progress: 0,
        materiais,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      router.push("/home");
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
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Novo projeto de estudo
          </h1>
          <p className="text-muted-foreground mb-8">
            Envie um ou vários PDFs. O texto é extraído no navegador e enviado à IA para gerar resumo e cards de estudo — cada PDF vira um tópico do projeto.
          </p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome do projeto (opcional)
              </label>
              <Input
                id="name"
                placeholder="Ex.: Biologia Celular"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Arquivos PDF (vários de uma vez)
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
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById("pdf-input")?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Arraste e solte os PDFs aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique para selecionar vários
                </p>
                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {files.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        {f.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
                          aria-label="Remover arquivo"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleProcess}
              disabled={!files.length || processingIndex !== null}
              size="lg"
              className="w-full"
            >
              {processingIndex !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando {processingIndex + 1} de {files.length}…
                </>
              ) : (
                `Extrair e gerar resumo e cards${files.length > 1 ? ` (${files.length} PDFs)` : ""}`
              )}
            </Button>
          </div>

          {results.length === files.length && results.length > 0 && (
            <motion.div
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
                {results.map((result, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-background/50 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {files[idx]?.name ?? `PDF ${idx + 1}`}
                    </h3>
                    <p className="text-foreground leading-relaxed text-sm line-clamp-3">
                      {result.resumo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.cards.length} card(s)
                    </p>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSaveProject}
                disabled={isSaving}
                size="lg"
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar projeto com {results.length} tópico(s)
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
