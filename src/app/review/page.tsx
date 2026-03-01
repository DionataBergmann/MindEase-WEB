"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Layers } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, query, where, orderBy, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { AppShell } from "@/components/organisms";
import { Button } from "@/components/atoms";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { isCardDueForReview, getNextReviewDateFromLevel, CARD_RATING_LEVEL, CARD_RATING_DAYS } from "@/lib/spaced-repetition";
import type { Project, Material, ProjectCard } from "@/types/project";

type DueCardItem = { project: Project; material: Material; cardIndex: number; card: ProjectCard };

export default function ReviewPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionCards, setSessionCards] = useState<DueCardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const q = query(
        collection(db, "projects"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          const list: Project[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const materiais: Material[] = Array.isArray(data.materiais)
              ? data.materiais
              : data.resumo || (data.cards?.length ?? 0) > 0
                ? [{ id: "legacy", nomeArquivo: "PDF", resumo: data.resumo ?? "", cards: data.cards ?? [] }]
                : [];
            return {
              id: docSnap.id,
              userId: data.userId,
              title: data.title ?? "Sem título",
              emoji: data.emoji ?? "📚",
              pdfCount: data.pdfCount ?? materiais.length,
              progress: data.progress ?? 0,
              lastAccess: "",
              resumo: data.resumo,
              cards: data.cards,
              materiais,
              createdAt: data.createdAt,
            };
          });
          setProjects(list);
          setLoading(false);
        },
        () => setLoading(false)
      );
    });
    return () => {
      unsubAuth();
      if (unsub) unsub();
    };
  }, [router]);

  const dueCardsList = useMemo(() => {
    const out: DueCardItem[] = [];
    projects.forEach((p) => {
      p.materiais?.forEach((m) => {
        (m.cards ?? []).forEach((card, cardIndex) => {
          if (isCardDueForReview(card)) out.push({ project: p, material: m, cardIndex, card });
        });
      });
    });
    return out;
  }, [projects]);

  useEffect(() => {
    if (dueCardsList.length > 0 && sessionCards.length === 0) {
      setSessionCards(dueCardsList);
      setCurrentIndex(0);
      setFlipped(false);
    }
  }, [dueCardsList, sessionCards.length]);

  const current = sessionCards[currentIndex] ?? null;

  const handleRate = async (rating: "dificil" | "medio" | "facil") => {
    if (!current) return;
    const db = getFirestoreDb();
    if (!db) return;
    const level = CARD_RATING_LEVEL[rating];
    const nextReviewAt = getNextReviewDateFromLevel(level);
    const { project, material, cardIndex } = current;
    const updatedCards = (material.cards ?? []).map((c, i) =>
      i === cardIndex ? { ...c, nextReviewAt, intervalLevel: level } : c
    );
    const updatedMateriais = (project.materiais ?? []).map((m) =>
      m.id === material.id ? { ...m, cards: updatedCards } : m
    );
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        materiais: updatedMateriais,
        updatedAt: serverTimestamp(),
      });
      setFlipped(false);
      if (currentIndex < sessionCards.length - 1) setCurrentIndex((i) => i + 1);
      else setCurrentIndex(sessionCards.length);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-16 flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (sessionCards.length === 0) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-12">
          <Link href="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar à Biblioteca
          </Link>
          <div className="rounded-xl border bg-card p-12 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-foreground mb-2">Nenhum card para revisar</h1>
            <p className="text-muted-foreground mb-6">
              Quando você classificar cards como Fácil, Médio ou Difícil, eles entrarão na fila de revisão e aparecerão aqui.
            </p>
            <Button asChild>
              <Link href="/home">Ir para Biblioteca</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (currentIndex >= sessionCards.length) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-12">
          <Link href="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar à Biblioteca
          </Link>
          <div className="rounded-xl border bg-card p-12 text-center">
            <Layers className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-foreground mb-2">Revisão concluída</h1>
            <p className="text-muted-foreground mb-6">
              Você revisou {sessionCards.length} card{sessionCards.length !== 1 ? "s" : ""}.
            </p>
            <Button asChild>
              <Link href="/home">Voltar à Biblioteca</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8">
        <Link href="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar à Biblioteca
        </Link>

        <p className="text-sm text-muted-foreground mb-4">
          Revisão · {currentIndex + 1} de {sessionCards.length} card{sessionCards.length !== 1 ? "s" : ""}
        </p>

        <div
          className="cursor-pointer select-none min-h-[260px] [perspective:1000px] overflow-hidden"
          onClick={() => setFlipped((f) => !f)}
        >
          <AnimatePresence initial={false} mode="wait" custom={1}>
            <motion.div
              key={currentIndex}
              custom={1}
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="relative w-full h-full min-h-[260px]"
            >
              <motion.div
                className="relative w-full h-full min-h-[260px]"
                style={{ transformStyle: "preserve-3d" }}
                initial={false}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <div
                  className="absolute inset-0 rounded-xl border bg-card p-8 flex flex-col justify-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Pergunta</p>
                  <p className="font-display text-lg font-bold text-foreground">{current!.card.titulo}</p>
                </div>
                <div
                  className="absolute inset-0 rounded-xl border bg-card p-8 flex flex-col justify-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Resposta</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{current!.card.conteudo}</p>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          {flipped ? "Como foi? Escolha para agendar a próxima revisão." : "Clique para ver a resposta"}
        </p>

        {flipped && (
          <div className="flex flex-wrap justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              size="lg"
              className="min-w-[120px] border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={saving}
              onClick={() => handleRate("dificil")}
            >
              Difícil ({CARD_RATING_DAYS.dificil} dia{CARD_RATING_DAYS.dificil !== 1 ? "s" : ""})
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-w-[120px]"
              disabled={saving}
              onClick={() => handleRate("medio")}
            >
              Médio ({CARD_RATING_DAYS.medio} dias)
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-w-[120px] border-success/50 text-success hover:bg-success/10"
              disabled={saving}
              onClick={() => handleRate("facil")}
            >
              Fácil ({CARD_RATING_DAYS.facil} dias)
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
