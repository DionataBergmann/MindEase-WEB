"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Brain, Clock, Loader2, Layers, MessageCircle, HelpCircle, FileQuestion, Pencil } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { getPreferredStudyTab, getSessionDuration, getPreferences, setPreferences, getDisplayResumo } from "@/lib/preferences";
import { scrollToElement } from "@/lib/scroll";
import { StudyTimer } from "@/components/molecules";
import { FlashcardCarousel } from "@/components/study/FlashcardCarousel";
import { StudyQuizPanel } from "@/components/study/StudyQuizPanel";
import { StudyChat } from "@/components/study/StudyChat";
import { ProjectFlashcardEditor } from "@/components/study/StudyFlashcardEditor";
import type { Project, ProjectCard, Material } from "@/types/project";

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
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz" | "chat" | "minhas_questoes">(() => getPreferredStudyTab());
  const [showSessionReminder, setShowSessionReminder] = useState(false);
  const [modoFoco, setModoFoco] = useState(() => (typeof window !== "undefined" ? getPreferences().modoFoco : false));
  const [pomodoroBreak, setPomodoroBreak] = useState<{ active: boolean; secondsLeft: number }>({ active: false, secondsLeft: 0 });
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [editResumoMaterialId, setEditResumoMaterialId] = useState<string | null>(null);
  const [editResumoValue, setEditResumoValue] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSaveCard = async (opts: {
    mode: "edit" | "new";
    materialId: string;
    indexInMaterial?: number;
    titulo: string;
    conteudo: string;
  }) => {
    if (!id || !project) return;
    const db = getFirestoreDb();
    if (!db) return;
    const materiais = project.materiais ?? (project.resumo ? [{ id: "legacy", nomeArquivo: "PDF", resumo: project.resumo ?? "", cards: project.cards ?? [] }] : []);
    setSaving(true);
    try {
      let updated: Material[];
      if (opts.mode === "edit" && typeof opts.indexInMaterial === "number") {
        const mat = materiais.find((m) => m.id === opts.materialId);
        if (!mat) return;
        const newCards = (mat.cards ?? []).map((c, i) =>
          i === opts.indexInMaterial ? { titulo: opts.titulo, conteudo: opts.conteudo } : c
        );
        updated = materiais.map((m) =>
          m.id === opts.materialId ? { ...m, cards: newCards } : m
        );
      } else if (opts.mode === "new") {
        const mat = materiais.find((m) => m.id === opts.materialId);
        if (!mat) return;
        const newCards = [...(mat.cards ?? []), { titulo: opts.titulo, conteudo: opts.conteudo }];
        updated = materiais.map((m) =>
          m.id === opts.materialId ? { ...m, cards: newCards } : m
        );
      } else return;
      await updateDoc(doc(db, "projects", id), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated } : null));
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
    } finally {
      setSaving(false);
    }
  };

  const cards = project ? getAllCards(project) : [];

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
            <StudyQuizPanel
              cards={cards}
              emptyText="Nenhum card para quiz. Adicione PDFs ao projeto."
            />
          </div>
        ) : activeTab === "chat" ? (
          <StudyChat
            headerText="Pergunte sobre o conteúdo do projeto. A IA usa os resumos como contexto."
            buildContext={() =>
              resumosWithMaterial.map((b) => `${b.nomeArquivo}:\n${b.resumo}`).join("\n\n")
            }
          />
        ) : activeTab === "minhas_questoes" ? (
          <ProjectFlashcardEditor
            items={cardsWithSource}
            materiais={materiais}
            saving={saving}
            onSaveCard={handleSaveCard}
            onDeleteCard={handleDeleteCard}
          />
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
            <FlashcardCarousel
              cards={cards}
              cardIndex={cardIndex}
              onCardIndexChange={setCardIndex}
              flipped={flipped}
              onFlippedChange={setFlipped}
              mode="project"
            />

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

      </div>
    </Wrapper>
  );
}
