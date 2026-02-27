"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Layers,
  MessageCircle,
  HelpCircle,
  FileQuestion,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { getPreferredStudyTab, getSessionDuration, getPreferences, setPreferences, getDisplayResumo } from "@/lib/preferences";
import { scrollToElement } from "@/lib/scroll";
import { StudyTimer } from "@/components/molecules";
import type { Project, ProjectCard, Material } from "@/types/project";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type QuizItem = { question: string; correctAnswer: string; options: string[] };
function buildQuizItems(cards: ProjectCard[]): QuizItem[] {
  if (cards.length === 0) return [];
  const allAnswers = cards.map((c) => c.conteudo);
  return shuffle(cards).map((card) => {
    const others = allAnswers.filter((a) => a !== card.conteudo);
    const wrong = shuffle(others).slice(0, Math.min(3, others.length));
    return { question: card.titulo, correctAnswer: card.conteudo, options: shuffle([card.conteudo, ...wrong]) };
  });
}

function getAllCards(project: Project): ProjectCard[] {
  if (project.materiais && project.materiais.length > 0) {
    return project.materiais.flatMap((m) => m.cards ?? []);
  }
  if (project.cards && project.cards.length > 0) {
    return project.cards;
  }
  return [];
}

type ResumoBlock = { materialId: string; nomeArquivo: string; resumo: string };
function getResumosWithMaterial(project: Project, nivelResumo: "breve" | "medio" | "completo"): ResumoBlock[] {
  if (project.materiais && project.materiais.length > 0) {
    return project.materiais
      .filter((m) => m.resumo || m.resumoBreve || m.resumoMedio || m.resumoCompleto)
      .map((m) => ({
        materialId: m.id,
        nomeArquivo: m.nomeArquivo ?? "PDF",
        resumo: getDisplayResumo(m, nivelResumo),
      }))
      .filter((b) => b.resumo);
  }
  if (project.resumo) {
    return [{ materialId: "legacy", nomeArquivo: "PDF", resumo: project.resumo }];
  }
  return [];
}

type CardWithSource = { materialId: string; materialName: string; card: ProjectCard; indexInMaterial: number };
function getCardsWithSource(project: Project): CardWithSource[] {
  if (project.materiais && project.materiais.length > 0) {
    return project.materiais.flatMap((m) =>
      (m.cards ?? []).map((card, i) => ({
        materialId: m.id,
        materialName: m.nomeArquivo ?? "PDF",
        card,
        indexInMaterial: i,
      }))
    );
  }
  if (project.cards && project.cards.length > 0) {
    return project.cards.map((card, i) => ({
      materialId: "legacy",
      materialName: "PDF",
      card,
      indexInMaterial: i,
    }));
  }
  return [];
}

export default function EstudarPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz" | "chat" | "minhas_questoes">(() => getPreferredStudyTab());
  const [showSessionReminder, setShowSessionReminder] = useState(false);
  const [modoFoco, setModoFoco] = useState(() => (typeof window !== "undefined" ? getPreferences().modoFoco : false));
  const [pomodoroBreak, setPomodoroBreak] = useState<{ active: boolean; secondsLeft: number }>({ active: false, secondsLeft: 0 });
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedIndex, setQuizSelectedIndex] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizNextLoading, setQuizNextLoading] = useState(false);
  const quizFeedbackRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [editResumoMaterialId, setEditResumoMaterialId] = useState<string | null>(null);
  const [editResumoValue, setEditResumoValue] = useState("");
  const [editCard, setEditCard] = useState<CardWithSource | null>(null);
  const [editCardTitulo, setEditCardTitulo] = useState("");
  const [editCardConteudo, setEditCardConteudo] = useState("");
  const [newCardMaterialId, setNewCardMaterialId] = useState<string | null>(null);
  const [newCardTitulo, setNewCardTitulo] = useState("");
  const [newCardConteudo, setNewCardConteudo] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteCardItem, setDeleteCardItem] = useState<CardWithSource | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!id || !auth || !db) {
      setLoading(false);
      setNotFound(!id);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProject(null);
        setLoading(false);
        setNotFound(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "projects", id));
        if (!snap.exists()) {
          setNotFound(true);
          setProject(null);
          return;
        }
        const data = snap.data();
        if (data.userId !== user.uid) {
          setNotFound(true);
          setProject(null);
          return;
        }
        setProject({
          id: snap.id,
          userId: data.userId,
          title: data.title ?? "Sem título",
          emoji: data.emoji ?? "📚",
          pdfCount: data.pdfCount ?? 0,
          progress: data.progress ?? 0,
          lastAccess: "",
          materiais: data.materiais ?? undefined,
          resumo: data.resumo,
          cards: data.cards ?? [],
          createdAt: data.createdAt,
        });
      } catch {
        setNotFound(true);
        setProject(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id]);

  const handleSaveResumo = async () => {
    if (!id || !project || !editResumoMaterialId) return;
    const db = getFirestoreDb();
    if (!db) return;
    const materiais = project.materiais ?? (project.resumo ? [{ id: "legacy", nomeArquivo: "PDF", resumo: project.resumo, cards: project.cards ?? [] }] : []);
    const nivel = getPreferences().nivelResumo;
    const field = nivel === "breve" ? "resumoBreve" : nivel === "medio" ? "resumoMedio" : nivel === "completo" ? "resumoCompleto" : "resumo";
    setSaving(true);
    try {
      const updated = materiais.map((m) =>
        m.id === editResumoMaterialId ? { ...m, [field]: editResumoValue } : m
      );
      await updateDoc(doc(db, "projects", id), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      setEditResumoMaterialId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async () => {
    if (!id || !project) return;
    const db = getFirestoreDb();
    if (!db) return;
    const materiais = project.materiais ?? (project.resumo ? [{ id: "legacy", nomeArquivo: "PDF", resumo: project.resumo ?? "", cards: project.cards ?? [] }] : []);
    setSaving(true);
    try {
      let updated: Material[];
      if (editCard) {
        const mat = materiais.find((m) => m.id === editCard.materialId);
        if (!mat) return;
        const newCards = (mat.cards ?? []).map((c, i) =>
          i === editCard.indexInMaterial ? { titulo: editCardTitulo, conteudo: editCardConteudo } : c
        );
        updated = materiais.map((m) =>
          m.id === editCard.materialId ? { ...m, cards: newCards } : m
        );
      } else if (newCardMaterialId) {
        const mat = materiais.find((m) => m.id === newCardMaterialId);
        if (!mat) return;
        const newCards = [...(mat.cards ?? []), { titulo: newCardTitulo, conteudo: newCardConteudo }];
        updated = materiais.map((m) =>
          m.id === newCardMaterialId ? { ...m, cards: newCards } : m
        );
      } else return;
      await updateDoc(doc(db, "projects", id), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      setEditCard(null);
      setNewCardMaterialId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (item: CardWithSource) => {
    if (!id || !project) return;
    const db = getFirestoreDb();
    if (!db) return;
    const materiais = project.materiais ?? (project.resumo ? [{ id: "legacy", nomeArquivo: "PDF", resumo: project.resumo ?? "", cards: project.cards ?? [] }] : []);
    const mat = materiais.find((m) => m.id === item.materialId);
    if (!mat) return;
    const newCards = (mat.cards ?? []).filter((_, i) => i !== item.indexInMaterial);
    const updated = materiais.map((m) =>
      m.id === item.materialId ? { ...m, cards: newCards } : m
    );
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", id), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      setEditCard(null);
    } finally {
      setSaving(false);
    }
  };

  const cards = project ? getAllCards(project) : [];
  const quizItems = useMemo(() => buildQuizItems(cards), [cards]);
  const currentQuiz = quizItems[quizIndex] ?? null;
  const quizAnswered = quizSelectedIndex !== null;
  const quizCorrect = currentQuiz !== null && quizSelectedIndex !== null && currentQuiz.options[quizSelectedIndex] === currentQuiz.correctAnswer;
  const isQuizEnd = quizStarted && quizItems.length > 0 && quizIndex >= quizItems.length;

  useEffect(() => {
    if (!quizAnswered || !quizCorrect || quizItems.length === 0 || quizIndex >= quizItems.length - 1) return;
    const t1 = setTimeout(() => setQuizNextLoading(true), 2100);
    const t2 = setTimeout(() => {
      setQuizIndex((i) => i + 1);
      setQuizSelectedIndex(null);
      setQuizNextLoading(false);
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [quizAnswered, quizCorrect, quizIndex, quizItems.length]);

  useEffect(() => {
    if (quizAnswered && quizFeedbackRef.current) {
      scrollToElement(quizFeedbackRef.current, { block: "start", durationMs: 2000 });
    }
  }, [quizAnswered, quizSelectedIndex]);

  useEffect(() => {
    if ((activeTab === "flashcards" || activeTab === "quiz" || activeTab === "chat" || activeTab === "minhas_questoes") && tabContentRef.current) {
      scrollToElement(tabContentRef.current, { block: "start" });
    }
  }, [activeTab]);

  // Lembrete de tempo de sessão (preferência "Alertas de tempo") — usa o menor entre preferência e duração do conteúdo
  useEffect(() => {
    if (loading || !project || !getPreferences().alertasTempo) return;
    const preferred = getSessionDuration().minutes;
    const totalMin = Math.max(5, getAllCards(project).length * 3);
    const effectiveMinutes = Math.min(preferred, totalMin);
    const ms = effectiveMinutes * 60 * 1000;
    const t = setTimeout(() => setShowSessionReminder(true), ms);
    return () => clearTimeout(t);
  }, [loading, project]);

  useEffect(() => {
    if (quizStarted && activeTab === "quiz" && tabContentRef.current) {
      scrollToElement(tabContentRef.current, { block: "start" });
    }
  }, [quizStarted, activeTab]);

  useEffect(() => {
    if (!pomodoroBreak.active || pomodoroBreak.secondsLeft <= 0) return;
    const t = setInterval(() => {
      setPomodoroBreak((p) => (p.secondsLeft <= 1 ? { ...p, secondsLeft: 0 } : { ...p, secondsLeft: p.secondsLeft - 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [pomodoroBreak.active, pomodoroBreak.secondsLeft]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !project) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-muted-foreground mb-4">
            Projeto não encontrado ou você não tem acesso.
          </p>
          <Button asChild>
            <Link href="/home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para a Biblioteca
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const resumosWithMaterial = getResumosWithMaterial(project, getPreferences().nivelResumo);
  const cardsWithSource = getCardsWithSource(project);
  const currentCard = cards[cardIndex] ?? null;
  const hasPrev = cardIndex > 0;
  const hasNext = cardIndex < cards.length - 1;
  const totalMin = Math.max(5, cards.length * 3);
  const materiais = project.materiais ?? (project.resumo || (project.cards?.length ?? 0) > 0 ? [{ id: "legacy", nomeArquivo: "PDF", resumo: project.resumo ?? "", cards: project.cards ?? [] }] : []);
  const sessionDuration = getSessionDuration();
  const effectiveMinutes = Math.min(sessionDuration.minutes, totalMin);
  const effectiveLabel = effectiveMinutes < sessionDuration.minutes ? `${effectiveMinutes} min` : sessionDuration.label;

  const enterModoFoco = () => {
    setPreferences({ modoFoco: true });
    setModoFoco(true);
  };
  const exitModoFoco = () => {
    setPreferences({ modoFoco: false });
    setModoFoco(false);
  };

  const hideMenu = modoFoco && typeof window !== "undefined" && getPreferences().modoFocoEsconderMenu;
  const Wrapper = hideMenu
    ? ({ children }: { children: React.ReactNode }) => <div className="min-h-screen bg-background pt-6 pb-8 px-4">{children}</div>
    : AppShell;

  return (
    <Wrapper>
      <div className="max-w-4xl mx-auto">
        {!modoFoco && (
          <Link
            href={`/project/${id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao projeto
          </Link>
        )}

        <div className={`mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${modoFoco ? "mt-4" : ""}`}>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Estudar: {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground mt-0.5">
              <span>~{totalMin} min · {cards.length} card{cards.length !== 1 ? "s" : ""}</span>
              {!modoFoco && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Duração sugerida: {effectiveLabel}
                </span>
              )}
            </div>
            {showSessionReminder && !pomodoroBreak.active && (
              <p className="mt-2 text-sm text-primary font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Você está estudando há um tempo. Que tal uma pausa?
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StudyTimer
              initialMinutes={effectiveMinutes}
              onComplete={() => {
                if (getPreferences().pausasPomodoro) {
                  setPomodoroBreak({ active: true, secondsLeft: 5 * 60 });
                } else {
                  setShowSessionReminder(true);
                }
              }}
            />
            {modoFoco ? (
              <Button variant="outline" size="sm" onClick={exitModoFoco} className="h-9 gap-1 px-3">
                Sair do modo foco
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={enterModoFoco} className="h-9 gap-1 px-3">
                <Brain className="w-3.5 h-3.5" />
                Modo foco
              </Button>
            )}
          </div>
        </div>

        {pomodoroBreak.active && (
          <div className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/10 p-6 text-center">
            {pomodoroBreak.secondsLeft > 0 ? (
              <>
                <p className="text-sm font-medium text-foreground mb-2">Pausa de 5 min</p>
                <p className="font-mono text-2xl font-semibold text-foreground">
                  {String(Math.floor(pomodoroBreak.secondsLeft / 60)).padStart(2, "0")}:{String(pomodoroBreak.secondsLeft % 60).padStart(2, "0")}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground mb-3">Pausa concluída.</p>
                <Button onClick={() => { setPomodoroBreak({ active: false, secondsLeft: 0 }); setShowSessionReminder(true); }}>
                  Voltar ao estudo
                </Button>
              </>
            )}
          </div>
        )}

        {/* Resumo (todos os resumos do projeto) - oculto no modo foco */}
        {!modoFoco && resumosWithMaterial.length > 0 && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 mb-8 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Resumo do projeto
            </h2>
            {resumosWithMaterial.map((block) => (
              <div key={block.materialId} className="relative group">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{block.nomeArquivo}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditResumoMaterialId(block.materialId);
                      setEditResumoValue(block.resumo);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {block.resumo}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs: Flashcards | Quiz | Chat IA | Minhas questões - ocultas no modo foco */}
        {!modoFoco && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/50 mb-6 md:flex md:flex-row">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors md:justify-start md:gap-2 md:px-4 md:text-sm ${
              activeTab === "flashcards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("flashcards")}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="md:hidden">Cards</span>
            <span className="hidden md:inline">Flashcards</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors md:justify-start md:gap-2 md:px-4 md:text-sm ${
              activeTab === "quiz" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("quiz")}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            Quiz
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors md:justify-start md:gap-2 md:px-4 md:text-sm ${
              activeTab === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="md:hidden">Chat</span>
            <span className="hidden md:inline">Chat IA</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors md:justify-start md:gap-2 md:px-4 md:text-sm ${
              activeTab === "minhas_questoes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("minhas_questoes")}
          >
            <FileQuestion className="w-4 h-4 shrink-0" />
            <span className="md:hidden">Editar cards</span>
            <span className="hidden md:inline">Minhas flashcards</span>
          </button>
        </div>
        )}

        <div ref={tabContentRef}>
        {activeTab === "quiz" ? (
          <div className="space-y-6 mb-8">
            {cards.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <p className="text-muted-foreground mb-4">Nenhum card para quiz. Adicione PDFs ao projeto.</p>
              </div>
            ) : !quizStarted ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">Quiz</h3>
                <p className="text-muted-foreground text-sm mb-6">{quizItems.length} pergunta{quizItems.length !== 1 ? "s" : ""} com múltipla escolha.</p>
                <Button onClick={() => { setQuizStarted(true); setQuizIndex(0); setQuizSelectedIndex(null); setQuizScore(0); }}>Iniciar quiz</Button>
              </div>
            ) : isQuizEnd ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">Quiz concluído</h3>
                <p className="text-2xl font-bold text-foreground mb-2">{quizScore} / {quizItems.length}</p>
                <p className="text-muted-foreground text-sm mb-6">{quizItems.length > 0 ? Math.round((quizScore / quizItems.length) * 100) : 0}% de acertos</p>
                <Button variant="outline" onClick={() => { setQuizStarted(false); setQuizIndex(0); setQuizSelectedIndex(null); }}>Fazer de novo</Button>
              </div>
            ) : currentQuiz ? (
              <>
                <motion.div
                  key={quizIndex}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="rounded-xl border bg-card p-6"
                >
                  <p className="text-sm text-muted-foreground mb-2">Pergunta {quizIndex + 1} de {quizItems.length}</p>
                  <p className="font-display font-semibold text-lg text-foreground mb-4">{currentQuiz.question}</p>
                  <div className="space-y-2">
                    {currentQuiz.options.map((opt, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant={quizAnswered ? (i === currentQuiz.options.indexOf(currentQuiz.correctAnswer) ? "default" : quizSelectedIndex === i ? "destructive" : "outline") : "outline"}
                        className="w-full min-w-0 justify-start text-left h-auto min-h-[2.75rem] py-3 px-4 whitespace-normal break-words"
                        disabled={quizAnswered}
                        onClick={() => {
                          if (quizSelectedIndex !== null) return;
                          setQuizSelectedIndex(i);
                          if (opt === currentQuiz.correctAnswer) setQuizScore((s) => s + 1);
                        }}
                      >
                        <span className="text-left">{opt}</span>
                      </Button>
                    ))}
                  </div>
                </motion.div>
                <div ref={quizFeedbackRef} className="mt-4">
                  {quizAnswered && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.1 }}
                      className={`rounded-lg p-4 ${quizCorrect ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                    >
                      {quizCorrect ? "Correto!" : `Resposta correta: ${currentQuiz.correctAnswer}`}
                    </motion.div>
                  )}
                  {quizAnswered && quizCorrect && quizNextLoading && (
                    <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Próxima pergunta...
                    </p>
                  )}
                  {quizAnswered && (
                    <div className="flex justify-between gap-4 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => { setQuizIndex((i) => i - 1); setQuizSelectedIndex(null); }}
                        disabled={quizIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button onClick={() => { setQuizIndex((i) => i + 1); setQuizSelectedIndex(null); }}>
                        Próxima
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : activeTab === "chat" ? (
          <div className="rounded-xl border bg-card overflow-hidden mb-8 flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <p className="text-sm text-muted-foreground">Pergunte sobre o conteúdo do projeto. A IA usa os resumos como contexto.</p>
            </div>
            <div className="min-h-[200px] max-h-[360px] overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">Envie uma mensagem para começar.</p>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">...</div>
                </div>
              )}
            </div>
            <form
              className="p-4 border-t flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const text = chatInput.trim();
                if (!text || chatLoading) return;
                setChatInput("");
                setChatMessages((prev) => [...prev, { role: "user", content: text }]);
                setChatLoading(true);
                try {
                  const context = resumosWithMaterial.map((b) => `${b.nomeArquivo}:\n${b.resumo}`).join("\n\n");
                  const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      context,
                      messages: [...chatMessages, { role: "user", content: text }],
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "Erro ao enviar mensagem.");
                  setChatMessages((prev) => [...prev, { role: "assistant", content: data.message ?? "" }]);
                } catch (err) {
                  setChatMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: err instanceof Error ? err.message : "Erro ao conversar." },
                  ]);
                } finally {
                  setChatLoading(false);
                }
              }}
            >
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Sua pergunta..." className="flex-1" disabled={chatLoading} />
              <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
              </Button>
            </form>
          </div>
        ) : activeTab === "minhas_questoes" ? (
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display font-semibold text-foreground">Editar e criar flashcards</h3>
              {materiais.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setNewCardMaterialId(materiais[0].id);
                    setNewCardTitulo("");
                    setNewCardConteudo("");
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova flashcard
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {cardsWithSource.map((item, i) => (
                <div
                  key={`${item.materialId}-${item.indexInMaterial}`}
                  className="rounded-lg border bg-card p-4 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.materialName}</p>
                    <p className="font-medium text-foreground truncate">{item.card.titulo}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.card.conteudo}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditCard(item);
                        setEditCardTitulo(item.card.titulo);
                        setEditCardConteudo(item.card.conteudo);
                        setNewCardMaterialId(null);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteCardItem(item)}
                      disabled={saving}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {cardsWithSource.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhuma flashcard no projeto. Adicione PDFs ou crie em cada tópico.</p>
            )}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum card para estudar. Adicione PDFs ao projeto para gerar
              cards.
            </p>
            <Button asChild>
              <Link href={`/project/${id}`}>Voltar ao projeto</Link>
            </Button>
          </div>
        ) : (
          <>
            <div
              className="cursor-pointer select-none min-h-[220px] [perspective:1000px] overflow-hidden"
              onClick={() => setFlipped((f) => !f)}
            >
              <AnimatePresence initial={false} mode="wait" custom={slideDirection}>
                <motion.div
                  key={cardIndex}
                  custom={slideDirection}
                  initial={{ x: slideDirection * 120, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -slideDirection * 120, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  className="relative w-full h-full min-h-[220px]"
                >
                  {currentCard && (
                    <motion.div
                      className="w-full h-full min-h-[220px]"
                      style={{ transformStyle: "preserve-3d" }}
                      initial={false}
                      animate={{ rotateY: flipped ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      {/* Frente: pergunta */}
                      <div
                        className="absolute inset-0 rounded-xl border bg-card p-8 flex flex-col justify-center"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                          Pergunta
                        </p>
                        <p className="font-display text-lg font-bold text-foreground">
                          {currentCard.titulo}
                        </p>
                      </div>
                      {/* Verso: resposta */}
                      <div
                        className="absolute inset-0 rounded-xl border bg-card p-8 flex flex-col justify-center"
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                      >
                        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                          Resposta
                        </p>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {currentCard.conteudo}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Clique para ver a resposta · {cardIndex + 1}/{cards.length}
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={() => {
                  setSlideDirection(-1);
                  setCardIndex((i) => i - 1);
                  setFlipped(false);
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => {
                  setSlideDirection(1);
                  setCardIndex((i) => i + 1);
                  setFlipped(false);
                }}
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="mt-10 flex justify-center">
              <Button asChild variant="secondary">
                <Link href={`/project/${id}`}>Voltar ao projeto</Link>
              </Button>
            </div>
          </>
        )}
        </div>

        {/* Modal: Editar resumo */}
        {editResumoMaterialId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setEditResumoMaterialId(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Editar resumo</h3>
              <textarea
                value={editResumoValue}
                onChange={(e) => setEditResumoValue(e.target.value)}
                placeholder="Resumo..."
                className="min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setEditResumoMaterialId(null)}>Cancelar</Button>
                <Button disabled={saving} onClick={handleSaveResumo}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar flashcard */}
        {editCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setEditCard(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Editar flashcard</h3>
              <label className="text-sm font-medium text-foreground block mb-1">Pergunta (frente)</label>
              <Input value={editCardTitulo} onChange={(e) => setEditCardTitulo(e.target.value)} placeholder="Título / pergunta" className="mb-4" />
              <label className="text-sm font-medium text-foreground block mb-1">Resposta (verso)</label>
              <textarea
                value={editCardConteudo}
                onChange={(e) => setEditCardConteudo(e.target.value)}
                placeholder="Resposta..."
                className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setEditCard(null)}>Cancelar</Button>
                <Button disabled={saving || !editCardTitulo.trim() || !editCardConteudo.trim()} onClick={handleSaveCard}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Nova flashcard (escolher tópico) */}
        {newCardMaterialId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setNewCardMaterialId(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Nova flashcard</h3>
              <label className="text-sm font-medium text-foreground block mb-1">Tópico</label>
              <select
                value={newCardMaterialId}
                onChange={(e) => setNewCardMaterialId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4"
              >
                {materiais.map((m) => (
                  <option key={m.id} value={m.id}>{m.nomeArquivo ?? m.id}</option>
                ))}
              </select>
              <label className="text-sm font-medium text-foreground block mb-1">Pergunta (frente)</label>
              <Input value={newCardTitulo} onChange={(e) => setNewCardTitulo(e.target.value)} placeholder="Título / pergunta" className="mb-4" />
              <label className="text-sm font-medium text-foreground block mb-1">Resposta (verso)</label>
              <textarea
                value={newCardConteudo}
                onChange={(e) => setNewCardConteudo(e.target.value)}
                placeholder="Resposta..."
                className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setNewCardMaterialId(null)}>Cancelar</Button>
                <Button disabled={saving || !newCardTitulo.trim() || !newCardConteudo.trim()} onClick={handleSaveCard}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmar exclusão de flashcard */}
        {deleteCardItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setDeleteCardItem(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-2">Excluir esta flashcard?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                A pergunta e a resposta serão removidas. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setDeleteCardItem(null)}>Cancelar</Button>
                <Button
                  variant="destructive"
                  disabled={saving}
                  onClick={async () => {
                    if (deleteCardItem) {
                      await handleDeleteCard(deleteCardItem);
                      setDeleteCardItem(null);
                    }
                  }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
