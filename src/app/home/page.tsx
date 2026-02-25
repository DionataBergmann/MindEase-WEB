"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, BookOpen, Clock, Leaf, Search, Loader2, BookMarked, MoreVertical, Pencil, Trash2, Settings, X, RefreshCw, Layers } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { Progress } from "@/components/ui/progress";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { isDueForReview, isCardDueForReview } from "@/lib/spaced-repetition";
import type { Project, Material } from "@/types/project";

function formatLastAccess(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  const d = ts.toDate();
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semana(s) atrás`;
  return `${Math.floor(diffDays / 30)} mês(es) atrás`;
}

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [setupSuggestionDismissed, setSetupSuggestionDismissed] = useState(true); // start true to avoid flash; useEffect will show if not dismissed
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem("mindease_setup_suggestion_dismissed") === "true";
    setSetupSuggestionDismissed(dismissed);
  }, []);

  const dismissSetupSuggestion = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mindease_setup_suggestion_dismissed", "true");
    }
    setSetupSuggestionDismissed(true);
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!auth || !db) {
      setProjects([]);
      setLoading(false);
      return;
    }
    let unsubSnapshot: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      if (!user) {
        setProjects([]);
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, "projects"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      unsubSnapshot = onSnapshot(
        q,
        (snap) => {
          const list: Project[] = snap.docs.map((doc) => {
            const data = doc.data();
            const materiais: Material[] = Array.isArray(data.materiais)
              ? data.materiais
              : data.resumo || (data.cards?.length ?? 0) > 0
                ? [{ id: "legacy", nomeArquivo: "PDF", resumo: data.resumo ?? "", cards: data.cards ?? [] }]
                : [];
            return {
              id: doc.id,
              userId: data.userId,
              title: data.title ?? "Sem título",
              emoji: data.emoji ?? "📚",
              pdfCount: data.pdfCount ?? materiais.length,
              progress: data.progress ?? 0,
              lastAccess: formatLastAccess(data.updatedAt),
              tags: Array.isArray(data.tags) ? data.tags : undefined,
              resumo: data.resumo,
              cards: data.cards,
              materiais,
              createdAt: data.createdAt,
            };
          });
          setProjects(list);
          setLoading(false);
        },
        (err) => {
          console.error("Firestore snapshot error:", err);
          setLoading(false);
        }
      );
    });
    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveProject = async () => {
    if (!editProject || !editTitle.trim()) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", editProject.id), {
        title: editTitle.trim(),
        tags: editTags,
        updatedAt: serverTimestamp(),
      });
      setEditProject(null);
      setEditTitle("");
      setEditTags([]);
      setNewTagInput("");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const addEditTag = () => {
    const t = newTagInput.trim().toLowerCase();
    if (!t || editTags.includes(t)) return;
    setEditTags((prev) => [...prev, t].sort((a, b) => a.localeCompare(b)));
    setNewTagInput("");
  };

  const removeEditTag = (tag: string) => {
    setEditTags((prev) => prev.filter((x) => x !== tag));
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "projects", deleteProjectId));
      setDeleteProjectId(null);
      router.push("/home");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags?.forEach((t) => set.add(t.trim())));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (selectedTag && !p.tags?.includes(selectedTag)) return false;
      if (!q) return true;
      if (p.title.toLowerCase().includes(q)) return true;
      for (const m of p.materiais ?? []) {
        if ((m.nomeArquivo ?? "").toLowerCase().includes(q)) return true;
        const resumoText = (m.resumo ?? "").toLowerCase();
        if (resumoText.includes(q)) return true;
      }
      if ((p.resumo ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [projects, search, selectedTag]);

  const totalProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((acc, p) => acc + p.progress, 0) / projects.length
        )
      : 0;

  const totalTopics = projects.reduce(
    (acc, p) => acc + (p.materiais?.length ?? (p.pdfCount || (p.resumo || (p.cards?.length ?? 0) > 0 ? 1 : 0))),
    0
  );
  const completedTopicCount = projects.reduce((acc, p) => {
    if (p.materiais?.length) return acc + p.materiais.filter((m) => (m.status ?? "pending") === "completed").length;
    if (p.progress === 100 && (p.pdfCount || p.resumo || (p.cards?.length ?? 0) > 0)) return acc + 1;
    return acc;
  }, 0);
  const topicProgress = totalTopics > 0 ? Math.round((completedTopicCount / totalTopics) * 100) : 0;

  const dueForReview: { project: Project; material: Material }[] = [];
  const dueCards: { project: Project; material: Material; cardIndex: number }[] = [];
  projects.forEach((p) => {
    p.materiais?.forEach((m) => {
      if (isDueForReview(m.nextReviewAt) && (m.cards?.length ?? 0) > 0) {
        dueForReview.push({ project: p, material: m });
      }
      (m.cards ?? []).forEach((card, cardIndex) => {
        if (isCardDueForReview(card)) dueCards.push({ project: p, material: m, cardIndex });
      });
    });
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/40 to-accent/10 border border-primary/10 p-8 mb-8"
        >
          <div className="absolute top-3 right-6 text-primary/15 rotate-12">
            <Leaf className="w-20 h-20" />
          </div>
          <div className="absolute bottom-2 right-24 text-primary/10 -rotate-45">
            <Leaf className="w-12 h-12" />
          </div>

          <div className="relative z-10">
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">
              Olá, bom te ver de volta! 🌿
            </h1>
            <p className="text-muted-foreground text-lg mb-5">
              Continue de onde parou nos seus estudos.
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="bg-card/80 backdrop-blur-sm rounded-xl px-5 py-3 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Projetos
                </p>
                <p className="text-2xl font-bold font-display text-foreground">
                  {loading ? "—" : projects.length}
                </p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-xl px-5 py-3 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Tópicos / PDFs
                </p>
                <p className="text-2xl font-bold font-display text-foreground">
                  {loading ? "—" : totalTopics}
                </p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-xl px-5 py-3 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Tópicos concluídos
                </p>
                <p className="text-2xl font-bold font-display text-success">
                  {loading ? "—" : completedTopicCount}
                </p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-xl px-5 py-3 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Progresso (tópicos)
                </p>
                <p className="text-2xl font-bold font-display text-primary">
                  {loading ? "—" : `${topicProgress}%`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dismissible suggestion to configure profile and preferences */}
        {!setupSuggestionDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex gap-3">
              <div className="rounded-lg bg-primary/10 p-2 h-fit shrink-0">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground mb-0.5">Personalize sua experiência</h2>
                <p className="text-sm text-muted-foreground">
                  Configure formato de estudo (flashcards, quiz), duração das sessões, tamanho do resumo e outras opções no seu perfil.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="default" size="sm">
                <Link href="/profile">Ir para Perfil e preferências</Link>
              </Button>
              <button
                type="button"
                onClick={dismissSetupSuggestion}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Para revisar hoje (repetição espaçada por tópico) */}
        {!loading && dueForReview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5"
          >
            <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
              <RefreshCw className="w-4 h-4 text-primary" />
              Para revisar hoje
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {dueForReview.length} tópico{dueForReview.length !== 1 ? "s" : ""} na fila de repetição espaçada.
            </p>
            <ul className="space-y-2">
              {dueForReview.slice(0, 10).map(({ project, material }) => (
                <li key={`${project.id}-${material.id}`}>
                  <Link
                    href={`/project/${project.id}/material/${material.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <span className="font-medium text-foreground truncate">
                      {material.nomeArquivo ?? "Tópico"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {project.emoji} {project.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {dueForReview.length > 10 && (
              <p className="text-xs text-muted-foreground mt-2">
                e mais {dueForReview.length - 10} tópico{dueForReview.length - 10 !== 1 ? "s" : ""} para revisar
              </p>
            )}
          </motion.div>
        )}

        {/* Search + Revisar + New Project */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar em projetos, tópicos e resumos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {!loading && dueCards.length > 0 && (
            <Button asChild variant="outline" size="default">
              <Link href="/review" className="inline-flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Revisar cards ({dueCards.length})
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/new-project">
              <Plus className="w-4 h-4 mr-2" />
              Novo projeto
            </Link>
          </Button>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs text-muted-foreground mr-1">Tag:</span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Todos
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Project grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="relative bg-card rounded-xl border p-6 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all group overflow-visible"
            >
              <div className="absolute top-3 right-3 z-20" ref={menuOpenId === project.id ? menuRef : undefined}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpenId((id) => (id === project.id ? null : project.id));
                  }}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {menuOpenId === project.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border bg-card py-1 shadow-lg z-30">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted"
                      onClick={() => {
                        setEditProject(project);
                        setEditTitle(project.title);
                        setEditTags(project.tags ?? []);
                        setNewTagInput("");
                        setMenuOpenId(null);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar projeto
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteProjectId(project.id);
                        setMenuOpenId(null);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              <Link
                href={`/project/${project.id}`}
                className="block relative z-10"
              >
                <div className="absolute -bottom-3 -right-3 text-primary/5 group-hover:text-primary/10 transition-colors rotate-45">
                  <Leaf className="w-16 h-16" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                      {project.emoji}
                    </div>
                    {project.progress === 100 && (
                      <span className="text-xs font-medium bg-success/15 text-success px-2.5 py-1 rounded-full">
                        ✓ Concluído
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                    {project.title}
                  </h3>
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {project.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {project.pdfCount} PDFs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {project.lastAccess}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold text-foreground">
                        {project.progress}%
                      </span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </div>
              </Link>
              <div className="mt-4 pt-4 border-t border-border">
                <Button asChild size="sm" className="w-full" variant="secondary">
                  <Link href={`/project/${project.id}/estudar`}>
                    <BookMarked className="w-4 h-4 mr-2" />
                    Estudar
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        )}

        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Leaf className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum projeto encontrado.
            </p>
          </motion.div>
        )}

        {/* Modal: Editar projeto (nome + tags) */}
        {editProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && (setEditProject(null), setEditTags([]), setNewTagInput(""))}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Editar projeto</h3>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Nome</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Nome do projeto"
                className="mb-4"
              />
              <label className="text-xs font-medium text-muted-foreground block mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
                  >
                    {tag}
                    <button type="button" onClick={() => removeEditTag(tag)} className="hover:opacity-80" aria-label={`Remover ${tag}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Nova tag"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEditTag())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addEditTag}>
                  Adicionar
                </Button>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => { setEditProject(null); setEditTags([]); setNewTagInput(""); }}>
                  Cancelar
                </Button>
                <Button disabled={saving || !editTitle.trim()} onClick={handleSaveProject}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmar exclusão do projeto */}
        {deleteProjectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setDeleteProjectId(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-2">Excluir projeto?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Esta ação não pode ser desfeita. Todos os materiais e cards serão removidos.
              </p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setDeleteProjectId(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" disabled={saving} onClick={handleDeleteProject}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
