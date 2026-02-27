"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  CheckCircle,
  Layers,
  MessageCircle,
  HelpCircle,
  FileQuestion,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { getPreferredStudyTab, getSessionDuration, getPreferences, setPreferences, getDisplayResumo } from "@/lib/preferences";
import { scrollToElement } from "@/lib/scroll";
import { isDueForReview, getNextReviewDateFromLevel, todayISO, CARD_RATING_LEVEL, CARD_RATING_DAYS } from "@/lib/spaced-repetition";
import { StudyTimer } from "@/components/molecules";
import { FlashcardCarousel } from "@/components/study/FlashcardCarousel";
import { StudyQuizPanel } from "@/components/study/StudyQuizPanel";
import { StudyChat } from "@/components/study/StudyChat";
import { MaterialFlashcardEditor } from "@/components/study/StudyFlashcardEditor";
import type { Project, Material, ProjectCard } from "@/types/project";

function estimateMin(m: Material) {
  return Math.max(5, (m.cards?.length ?? 0) * 3);
}

export default function MaterialStudyPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? params.id : "";
  const materialId = typeof params.materialId === "string" ? params.materialId : "";
  const [project, setProject] = useState<Project | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz" | "chat" | "minhas_questoes">(() => getPreferredStudyTab());
  const [showSessionReminder, setShowSessionReminder] = useState(false);
  const [modoFoco, setModoFoco] = useState(() => (typeof window !== "undefined" ? getPreferences().modoFoco : false));
  const [pomodoroBreak, setPomodoroBreak] = useState<{ active: boolean; secondsLeft: number }>({ active: false, secondsLeft: 0 });
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [editResumoOpen, setEditResumoOpen] = useState(false);
  const [editResumoValue, setEditResumoValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [markedAsReviewed, setMarkedAsReviewed] = useState(false);
  const inProgressSent = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!projectId || !materialId || !auth || !db) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "projects", projectId));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        if (data.userId !== user.uid) {
          setNotFound(true);
          return;
        }
        const materiais: Material[] = Array.isArray(data.materiais)
          ? data.materiais
          : data.resumo || (data.cards?.length > 0)
            ? [
                {
                  id: "legacy",
                  nomeArquivo: "PDF",
                  resumo: data.resumo ?? "",
                  cards: data.cards ?? [],
                },
              ]
            : [];
        const mat = materiais.find((m) => m.id === materialId);
        if (!mat) {
          setNotFound(true);
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
          materiais,
          resumo: data.resumo,
          cards: data.cards ?? [],
        });
        setMaterial(mat);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [projectId, materialId]);

  // Ao abrir o tópico (PDF/estudo), marca como "Em progresso" se ainda estiver em "Para estudar"
  useEffect(() => {
    if (inProgressSent.current || !projectId || !materialId || !project?.materiais) return;
    if (material?.status === "in_progress" || material?.status === "completed") return;
    const db = getFirestoreDb();
    if (!db) return;
    inProgressSent.current = true;
    const updated = project.materiais.map((m) =>
      m.id === materialId ? { ...m, status: "in_progress" as const } : m
    );
    updateDoc(doc(db, "projects", projectId), {
      materiais: updated,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }, [projectId, materialId, project?.materiais, material?.status]);

  const cards: ProjectCard[] = material?.cards ?? [];

  useEffect(() => {
    if ((activeTab === "flashcards" || activeTab === "quiz" || activeTab === "chat" || activeTab === "minhas_questoes") && tabContentRef.current) {
      scrollToElement(tabContentRef.current, { block: "start" });
    }
  }, [activeTab]);

  // Lembrete de tempo de sessão (preferência "Alertas de tempo") — usa o menor entre preferência e duração do conteúdo
  useEffect(() => {
    if (loading || !material || !getPreferences().alertasTempo) return;
    const preferred = getSessionDuration().minutes;
    const contentMin = estimateMin(material);
    const effectiveMinutes = Math.min(preferred, contentMin);
    const ms = effectiveMinutes * 60 * 1000;
    const t = setTimeout(() => setShowSessionReminder(true), ms);
    return () => clearTimeout(t);
  }, [loading, material]);

  // Pausa Pomodoro: countdown 5 min
  useEffect(() => {
    if (!pomodoroBreak.active || pomodoroBreak.secondsLeft <= 0) return;
    const t = setInterval(() => {
      setPomodoroBreak((p) => (p.secondsLeft <= 1 ? { ...p, secondsLeft: 0 } : { ...p, secondsLeft: p.secondsLeft - 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [pomodoroBreak.active, pomodoroBreak.secondsLeft]);

  const handleConcluir = async () => {
    if (!projectId || !materialId || !project?.materiais) return;
    const db = getFirestoreDb();
    const auth = getFirebaseAuth();
    if (!db || !auth?.currentUser) return;
    const updated = project.materiais.map((m) =>
      m.id === materialId ? { ...m, status: "completed" as const } : m
    );
    const completedCount = updated.filter((m) => (m.status ?? "pending") === "completed").length;
    const progress = updated.length === 0 ? 0 : Math.round((completedCount / updated.length) * 100);
    await updateDoc(doc(db, "projects", projectId), {
      materiais: updated,
      progress,
      updatedAt: serverTimestamp(),
    });
    router.push(`/project/${projectId}`);
    router.refresh();
  };

  const handleSaveResumo = async () => {
    if (!projectId || !materialId || !project?.materiais) return;
    const db = getFirestoreDb();
    if (!db) return;
    const nivel = getPreferences().nivelResumo;
    const field = nivel === "breve" ? "resumoBreve" : nivel === "medio" ? "resumoMedio" : nivel === "completo" ? "resumoCompleto" : "resumo";
    setSaving(true);
    try {
      const updated = project.materiais.map((m) =>
        m.id === materialId ? { ...m, [field]: editResumoValue } : m
      );
      await updateDoc(doc(db, "projects", projectId), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setMaterial((m) => (m ? { ...m, [field]: editResumoValue } : null));
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      setEditResumoOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRateCard = async (rating: "dificil" | "medio" | "facil") => {
    if (!projectId || !materialId || !project?.materiais || !material || currentCard == null) return;
    const db = getFirestoreDb();
    if (!db) return;
    const level = CARD_RATING_LEVEL[rating];
    const nextReviewAt = getNextReviewDateFromLevel(level);
    const updatedCards = (material.cards ?? []).map((c, i) =>
      i === cardIndex ? { ...c, nextReviewAt, intervalLevel: level } : c
    );
    const updatedMateriais = project.materiais.map((m) =>
      m.id === materialId ? { ...m, cards: updatedCards } : m
    );
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        materiais: updatedMateriais,
        updatedAt: serverTimestamp(),
      });
      setMaterial((m) => (m ? { ...m, cards: updatedCards } : null));
      setProject((p) => (p ? { ...p, materiais: updatedMateriais } : null));
      setFlipped(false);
      if (cardIndex < cards.length - 1) setCardIndex((i) => i + 1);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsReviewed = async () => {
    if (!projectId || !materialId || !project?.materiais || !material) return;
    const db = getFirestoreDb();
    if (!db) return;
    const level = Math.min((material.intervalLevel ?? 0) + 1, 4);
    const nextReviewAt = getNextReviewDateFromLevel(level);
    const lastReviewedAt = todayISO();
    const updated = project.materiais.map((m) =>
      m.id === materialId
        ? { ...m, lastReviewedAt, nextReviewAt, intervalLevel: level }
        : m
    );
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setMaterial((m) => (m ? { ...m, lastReviewedAt, nextReviewAt, intervalLevel: level } : null));
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      setMarkedAsReviewed(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async (opts: { mode: "edit" | "new"; index?: number; titulo: string; conteudo: string }) => {
    if (!projectId || !materialId || !project?.materiais || !material) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      let newCards: ProjectCard[];
      if (opts.mode === "new") {
        newCards = [...(material.cards ?? []), { titulo: opts.titulo, conteudo: opts.conteudo }];
      } else if (opts.mode === "edit" && typeof opts.index === "number") {
        const prev = material.cards ?? [];
        newCards = prev.map((c, i) =>
          i === opts.index ? { titulo: opts.titulo, conteudo: opts.conteudo } : c
        );
      } else return;
      const updated = project.materiais.map((m) =>
        m.id === materialId ? { ...m, cards: newCards } : m
      );
      await updateDoc(doc(db, "projects", projectId), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setMaterial((m) => (m ? { ...m, cards: newCards } : null));
      setProject((p) => (p ? { ...p, materiais: updated } : null));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (index: number) => {
    if (!projectId || !materialId || !project?.materiais || !material) return;
    const db = getFirestoreDb();
    if (!db) return;
    const prev = material.cards ?? [];
    if (index < 0 || index >= prev.length) return;
    setSaving(true);
    try {
      const newCards = prev.filter((_, i) => i !== index);
      const updated = project.materiais.map((m) =>
        m.id === materialId ? { ...m, cards: newCards } : m
      );
      await updateDoc(doc(db, "projects", projectId), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setMaterial((m) => (m ? { ...m, cards: newCards } : null));
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      if (cardIndex >= newCards.length && newCards.length > 0) setCardIndex(newCards.length - 1);
      else if (newCards.length === 0) setCardIndex(0);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !project || !material) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-muted-foreground mb-4">Tópico não encontrado.</p>
          <Button asChild>
            <Link href={projectId ? `/project/${projectId}` : "/home"}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const currentCard = cards[cardIndex] ?? null;
  const minEst = estimateMin(material);
  const sessionDuration = getSessionDuration();
  const effectiveMinutes = Math.min(sessionDuration.minutes, minEst);
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
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao projeto
          </Link>
        )}

        <div className={`mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${modoFoco ? "mt-4" : ""}`}>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {material.nomeArquivo ?? "Tópico"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground mt-0.5">
              <span>~{minEst} min</span>
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
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            {activeTab === "flashcards" && (material?.cards?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleConcluir} className="h-9 gap-1 px-3">
                <CheckCircle className="w-3.5 h-3.5" />
                Concluir tópico
              </Button>
            )}
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

        {/* Pausa Pomodoro */}
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

        {/* Revisão espaçada: aviso e botão "Marquei como revisado" */}
        {!modoFoco && material && isDueForReview(material.nextReviewAt) && !markedAsReviewed && (
          <div className="mb-6 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-foreground">Revisão programada</p>
                <p className="text-sm text-muted-foreground">
                  Depois de estudar, marque como revisado para agendar a próxima (repetição espaçada).
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleMarkAsReviewed}
              disabled={saving}
              className="shrink-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marquei como revisado
                </>
              )}
            </Button>
          </div>
        )}

        {/* Resumo - oculto no modo foco */}
        {!modoFoco && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 mb-8 relative">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Resumo
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditResumoValue(getDisplayResumo(material, getPreferences().nivelResumo) || "");
                setEditResumoOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {getDisplayResumo(material, getPreferences().nivelResumo) || "Sem resumo."}
          </p>
        </div>
        )}

        {/* Tabs: Flashcards | Quiz | Chat IA | Minhas questões - ocultas no modo foco */}
        {!modoFoco && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/50 mb-6 md:flex md:flex-row">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors md:justify-start md:gap-2 md:px-4 md:text-sm ${
              activeTab === "flashcards"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
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
              activeTab === "minhas_questoes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("minhas_questoes")}
          >
            <FileQuestion className="w-4 h-4 shrink-0" />
            <span className="md:hidden">Editar cards</span>
            <span className="hidden md:inline">Minhas flashcards</span>
          </button>
        </div>
        )}

        {/* Conteúdo: Flashcards | Quiz | Chat | Minhas questões */}
        <div ref={tabContentRef}>
        {activeTab === "quiz" ? (
          <div className="space-y-6 mb-8">
            <StudyQuizPanel
              cards={cards}
              emptyText="Nenhum card para quiz. Adicione ou edite flashcards na aba Minhas flashcards."
            />
          </div>
        ) : activeTab === "chat" ? (
          <StudyChat
            headerText="Pergunte sobre o conteúdo do tópico. A IA usa o resumo como contexto."
            buildContext={() =>
              (getDisplayResumo(material, getPreferences().nivelResumo) || material.resumo) ?? ""
            }
          />
        ) : activeTab === "minhas_questoes" ? (
          <MaterialFlashcardEditor
            cards={cards}
            saving={saving}
            onSaveCard={handleSaveCard}
            onDeleteCard={handleDeleteCard}
          />
        ) : cards.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum card neste tópico.
            </p>
            <Button onClick={handleConcluir}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Concluir tópico
            </Button>
          </div>
        ) : (
          <>
            <FlashcardCarousel
              cards={cards}
              cardIndex={cardIndex}
              onCardIndexChange={setCardIndex}
              flipped={flipped}
              onFlippedChange={setFlipped}
              mode="material"
            />
          </>
        )}
        </div>

        {/* Modal: Editar resumo */}
        {editResumoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setEditResumoOpen(false)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Editar resumo</h3>
              <textarea
                value={editResumoValue}
                onChange={(e) => setEditResumoValue(e.target.value)}
                placeholder="Resumo do tópico..."
                className="min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setEditResumoOpen(false)}>Cancelar</Button>
                <Button disabled={saving} onClick={handleSaveResumo}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Wrapper>
  );
}
