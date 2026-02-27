"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  Save,
} from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AppShell } from "@/components/organisms";
import { UploadSourcesForm, ProcessedResultsList } from "@/components/upload";
import { Button } from "@/components/atoms";
import { scrollToElement } from "@/lib/scroll";
import { useFirebaseGuard } from "@/hooks/useFirebaseGuard";
import { processSources, getTopicDisplayName, getSingleTopicDisplayName } from "@/lib/content-processing";
import type { ProcessContentResponse } from "@/types/process-content";
import type { Material } from "@/types/project";

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

  const firebaseGuard = useFirebaseGuard(setError, {
    loginMessage: "Faça login para continuar.",
    firebaseMessage: "Firebase não está configurado.",
  });

  const handleProcess = async () => {
    if (topicCountAddToProject === 0) {
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
        if (isSingleTopic && allResults.length === 1) {
          setResult(allResults[0]);
        } else if (isSingleTopic) {
          setResult(null);
        }
        setTimeout(() => {
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

  const handleAddToProject = async () => {
    if (isSingleTopic && !result && results.length === 0) return;
    if (!isSingleTopic && results.length === 0) return;
    if (!projectId) return;
    const ctx = await firebaseGuard();
    if (!ctx) return;
    const { user, db } = ctx;
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
          nomeArquivo: getSingleTopicDisplayName(pdfFiles, imageFiles),
          resumo: result.resumo,
          resumoBreve: result.resumoBreve,
          resumoMedio: result.resumoMedio,
          resumoCompleto: result.resumoCompleto,
          cards: result.cards,
        };
      } else {
        const newMateriais: Material[] = results.map((r, i) => ({
          id: crypto.randomUUID(),
          nomeArquivo: getTopicDisplayName(i, pdfFiles, imageFiles),
          resumo: r.resumo,
          resumoBreve: r.resumoBreve,
          resumoMedio: r.resumoMedio,
          resumoCompleto: r.resumoCompleto,
          cards: r.cards,
        }));
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
            <UploadSourcesForm
              pdfFiles={pdfFiles}
              imageFiles={imageFiles}
              mergeAllIntoOne={mergeAllIntoOne}
              onPdfFilesChange={setPdfFiles}
              onImageFilesChange={setImageFiles}
              onMergeAllIntoOneChange={setMergeAllIntoOne}
              onResultsClear={() => {
                setResults([]);
                setResult(null);
                setError(null);
              }}
              error={error}
              topicCount={topicCountAddToProject}
              processingIndex={processingIndex}
              onProcess={handleProcess}
            />
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
            <ProcessedResultsList
              ref={resultsSectionRef}
              results={results}
              pdfFiles={pdfFiles}
              imageFiles={imageFiles}
            >
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
            </ProcessedResultsList>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
