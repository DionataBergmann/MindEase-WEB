"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import { AppShell } from "@/components/organisms";
import { UploadSourcesForm, ProcessedResultsList } from "@/components/upload";
import { Button, Input } from "@/components/atoms";
import { scrollToElement } from "@/lib/scroll";
import { useFirebaseGuard } from "@/hooks/useFirebaseGuard";
import { processSources, getTopicDisplayName } from "@/lib/content-processing";
import type { ProcessContentResponse } from "@/types/process-content";

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProcessContentResponse[]>([]);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mergeAllIntoOne, setMergeAllIntoOne] = useState(false);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  const hasSources = pdfFiles.length > 0 || imageFiles.length > 0;
  const topicCount = mergeAllIntoOne
    ? hasSources ? 1 : 0
    : pdfFiles.length + imageFiles.length;

  const removeResult = useCallback((index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const firebaseGuard = useFirebaseGuard(setError, {
    loginMessage: "Faça login para salvar o projeto.",
    firebaseMessage: "Firebase não está configurado.",
  });

  const handleProcess = async () => {
    if (topicCount === 0) {
      setError("Adicione PDFs e/ou fotos.");
      return;
    }
    setError(null);
    setResults([]);

    try {
      const allResults = await processSources({
        pdfFiles,
        imageFiles,
        mergeAllIntoOne,
        onStep: (index) => setProcessingIndex(index),
      });
      setProcessingIndex(null);
      setResults(allResults);
      if (allResults.length > 0) {
        setTimeout(() => {
          setPdfFiles([]);
          setImageFiles([]);
          if (resultsSectionRef.current) {
            scrollToElement(resultsSectionRef.current, { block: "start" });
          }
        }, 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar.");
      setProcessingIndex(null);
    }
  };

  const handleSaveProject = async () => {
    if (!results.length) return;
    const ctx = await firebaseGuard();
    if (!ctx) return;
    const { user, db } = ctx;
    setIsSaving(true);
    setError(null);
    try {
      const firstName = pdfFiles[0]?.name ?? (imageFiles.length > 0 ? "Fotos" : "");
      const title =
        projectName.trim() ||
        firstName.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, "") ||
        "Sem título";
      const materiais = results.map((result, i) => ({
        id: crypto.randomUUID(),
        nomeArquivo: getTopicDisplayName(i, pdfFiles, imageFiles),
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
            Envie PDFs e/ou fotos de páginas. Abaixo você escolhe se quer um tópico por arquivo ou juntar tudo em um único tópico com resumo e cards.
          </p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome do projeto
              </label>
              <Input
                id="name"
                placeholder="Ex.: Projeto"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <UploadSourcesForm
              pdfFiles={pdfFiles}
              imageFiles={imageFiles}
              mergeAllIntoOne={mergeAllIntoOne}
              onPdfFilesChange={setPdfFiles}
              onImageFilesChange={setImageFiles}
              onMergeAllIntoOneChange={setMergeAllIntoOne}
              onResultsClear={() => {
                setResults([]);
                setError(null);
              }}
              error={error}
              topicCount={topicCount}
              processingIndex={processingIndex}
              onProcess={handleProcess}
            />
          </div>

          {results.length > 0 && (
            <ProcessedResultsList
              ref={resultsSectionRef}
              results={results}
              pdfFiles={pdfFiles}
              imageFiles={imageFiles}
              onRemoveResult={removeResult}
            >
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
            </ProcessedResultsList>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
