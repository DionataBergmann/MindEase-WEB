"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Loader2, Plus, BookMarked, CheckCircle, MoreVertical, Pencil, Trash2, FileQuestion, Upload, GripVertical } from "lucide-react";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { Progress } from "@/components/ui/progress";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { getPreferences } from "@/lib/preferences";
import { getNextReviewDateFromLevel } from "@/lib/spaced-repetition";
import type { Project, ProjectCard, Material, MaterialStatus } from "@/types/project";

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

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [editProjectTitle, setEditProjectTitle] = useState("");
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [editMaterial, setEditMaterial] = useState<{ projectId: string; m: Material } | null>(null);
  const [editMaterialName, setEditMaterialName] = useState("");
  const [deleteMaterial, setDeleteMaterial] = useState<{ projectId: string; materialId: string } | null>(null);
  const [materialMenuOpenId, setMaterialMenuOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [transitionModal, setTransitionModal] = useState<{ open: boolean; href: string; message: string }>({ open: false, href: "", message: "" });
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingMaterialIdRef = useRef<string | null>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const materialMenuRef = useRef<HTMLDivElement>(null);

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
          lastAccess: formatLastAccess(data.updatedAt),
          tags: Array.isArray(data.tags) ? data.tags : undefined,
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) setProjectMenuOpen(false);
      if (materialMenuRef.current && !materialMenuRef.current.contains(target)) setMaterialMenuOpenId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveProjectTitle = async () => {
    if (!project || !editProjectTitle.trim()) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        title: editProjectTitle.trim(),
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, title: editProjectTitle.trim() } : null));
      setShowEditProject(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "projects", project.id));
      router.push("/home");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaterialName = async () => {
    if (!project || !editMaterial || !editMaterialName.trim()) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      const updated = (project.materiais ?? []).map((m) =>
        m.id === editMaterial.m.id ? { ...m, nomeArquivo: editMaterialName.trim() } : m
      );
      await updateDoc(doc(db, "projects", project.id), {
        materiais: updated,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated } : null));
      setEditMaterial(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterialConfirm = async () => {
    if (!project || !deleteMaterial || deleteMaterial.projectId !== project.id) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      const updated = (project.materiais ?? []).filter((m) => m.id !== deleteMaterial.materialId);
      const completedCount = updated.filter((m) => (m.status ?? "pending") === "completed").length;
      const progress = updated.length === 0 ? 0 : Math.round((completedCount / updated.length) * 100);
      await updateDoc(doc(db, "projects", project.id), {
        materiais: updated,
        pdfCount: updated.length,
        progress,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated, pdfCount: updated.length, progress } : null));
      setDeleteMaterial(null);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveMaterial = async (materialId: string, newStatus: MaterialStatus) => {
    if (!project) return;
    const db = getFirestoreDb();
    if (!db) return;
    const updated = (project.materiais ?? []).map((m) => {
      if (m.id !== materialId) return m;
      const next = { ...m, status: newStatus };
      if (newStatus === "completed" && !m.nextReviewAt) {
        next.nextReviewAt = getNextReviewDateFromLevel(0);
        next.intervalLevel = 0;
      }
      if (newStatus !== "completed") {
        next.nextReviewAt = undefined;
        next.lastReviewedAt = undefined;
        next.intervalLevel = undefined;
      }
      return next;
    });
    const completedCount = updated.filter((m) => (m.status ?? "pending") === "completed").length;
    const progress = updated.length === 0 ? 0 : Math.round((completedCount / updated.length) * 100);
    setProject((p) => (p ? { ...p, materiais: updated, progress } : null));
    setDraggingId(null);
    draggingMaterialIdRef.current = null;
    if (typeof document !== "undefined") document.body.classList.remove("is-dragging-kanban");
    try {
      await updateDoc(doc(db, "projects", project.id), {
        materiais: updated,
        progress,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setProject((p) => (p ? { ...p, materiais: project.materiais, progress: project.progress } : null));
    }
  };

  const handleAddTask = async () => {
    if (!project || !newTaskTitle.trim()) return;
    const db = getFirestoreDb();
    if (!db) return;
    setSaving(true);
    try {
      const newMaterial: Material = {
        id: crypto.randomUUID(),
        nomeArquivo: newTaskTitle.trim(),
        resumo: "",
        cards: [],
        status: "pending",
      };
      const updated = [...(project.materiais ?? []), newMaterial];
      await updateDoc(doc(db, "projects", project.id), {
        materiais: updated,
        pdfCount: updated.length,
        updatedAt: serverTimestamp(),
      });
      setProject((p) => (p ? { ...p, materiais: updated, pdfCount: updated.length } : null));
      setShowNewTaskModal(false);
      setNewTaskTitle("");
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

  // Lista de PDFs/tópicos: use materiais ou um único "material" legado
  const materials: Material[] =
    project.materiais && project.materiais.length > 0
      ? project.materiais
      : project.resumo || (project.cards && project.cards.length > 0)
        ? [
            {
              id: "legacy",
              nomeArquivo: "PDF",
              resumo: project.resumo ?? "",
              cards: Array.isArray(project.cards) ? project.cards : [],
            },
          ]
        : [];

  const getStatus = (m: Material): MaterialStatus => m.status ?? "pending";
  const paraEstudar = materials.filter((m) => getStatus(m) === "pending");
  const emProgresso = materials.filter((m) => getStatus(m) === "in_progress");
  const concluidos = materials.filter((m) => getStatus(m) === "completed");
  const totalConcluidos = concluidos.length;

  const estimateMin = (m: Material) => Math.max(5, (m.cards?.length ?? 0) * 3);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Biblioteca
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Cabeçalho: ícone + título (ocupa 100%) + menu ⋮ à direita, depois botões */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex flex-1 min-w-0 items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                {project.emoji}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-foreground truncate">
                  {project.title}
                </h1>
                <p className="text-muted-foreground mt-0.5">
                  {materials.length} tópico{materials.length !== 1 ? "s" : ""} · {totalConcluidos} concluído{totalConcluidos !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="shrink-0" ref={projectMenuRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setProjectMenuOpen((o) => !o)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {projectMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border bg-card py-1 shadow-lg z-30">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted"
                    onClick={() => {
                      setEditProjectTitle(project.title);
                      setShowEditProject(true);
                      setProjectMenuOpen(false);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar nome
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setShowDeleteProject(true);
                      setProjectMenuOpen(false);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir projeto
                  </button>
                </div>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setShowNewTaskModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova tarefa
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/project/${project.id}/add-pdf`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar PDF
                </Link>
              </Button>
              {getPreferences().avisoTransicao ? (
                <Button
                  size="sm"
                  onClick={() => setTransitionModal({
                    open: true,
                    href: `/project/${project.id}/estudar`,
                    message: `Você vai para "Estudar: ${project.title}". Pronto para continuar?`,
                  })}
                >
                  <BookMarked className="w-4 h-4 mr-2" />
                  Estudar todos
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href={`/project/${project.id}/estudar`}>
                    <BookMarked className="w-4 h-4 mr-2" />
                    Estudar todos
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Tópicos: Kanban Para estudar | Em progresso | Concluído */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Arraste os cards entre as colunas ou clique para estudar. Use o menu ⋮ para editar ou excluir.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Column
              title="Para estudar"
              status="pending"
              count={paraEstudar.length}
              materials={paraEstudar}
              projectId={project.id}
              estimateMin={estimateMin}
              draggingId={draggingId}
              getDraggingMaterialId={() => draggingMaterialIdRef.current}
              onDragStart={(mid) => {
                draggingMaterialIdRef.current = mid;
                setTimeout(() => {
                  setDraggingId(mid);
                  if (typeof document !== "undefined") document.body.classList.add("is-dragging-kanban");
                }, 0);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                draggingMaterialIdRef.current = null;
                if (typeof document !== "undefined") document.body.classList.remove("is-dragging-kanban");
              }}
              onDrop={(mid) => handleMoveMaterial(mid, "pending")}
              openMenuId={materialMenuOpenId}
              onOpenMenu={setMaterialMenuOpenId}
              menuRef={materialMenuRef}
              onEditMaterial={(m) => { setEditMaterial({ projectId: project.id, m }); setEditMaterialName(m.nomeArquivo ?? ""); }}
              onDeleteMaterial={(m) => setDeleteMaterial({ projectId: project.id, materialId: m.id })}
              onStudyClick={getPreferences().avisoTransicao ? (m) => setTransitionModal({
                open: true,
                href: `/project/${project.id}/material/${m.id}`,
                message: `Você vai estudar "${m.nomeArquivo ?? "tópico"}". Pronto para continuar?`,
              }) : undefined}
            />
            <Column
              title="Em progresso"
              status="in_progress"
              count={emProgresso.length}
              materials={emProgresso}
              projectId={project.id}
              estimateMin={estimateMin}
              draggingId={draggingId}
              getDraggingMaterialId={() => draggingMaterialIdRef.current}
              onDragStart={(mid) => {
                draggingMaterialIdRef.current = mid;
                setTimeout(() => {
                  setDraggingId(mid);
                  if (typeof document !== "undefined") document.body.classList.add("is-dragging-kanban");
                }, 0);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                draggingMaterialIdRef.current = null;
                if (typeof document !== "undefined") document.body.classList.remove("is-dragging-kanban");
              }}
              onDrop={(mid) => handleMoveMaterial(mid, "in_progress")}
              openMenuId={materialMenuOpenId}
              onOpenMenu={setMaterialMenuOpenId}
              menuRef={materialMenuRef}
              onEditMaterial={(m) => { setEditMaterial({ projectId: project.id, m }); setEditMaterialName(m.nomeArquivo ?? ""); }}
              onDeleteMaterial={(m) => setDeleteMaterial({ projectId: project.id, materialId: m.id })}
              onStudyClick={getPreferences().avisoTransicao ? (m) => setTransitionModal({
                open: true,
                href: `/project/${project.id}/material/${m.id}`,
                message: `Você vai estudar "${m.nomeArquivo ?? "tópico"}". Pronto para continuar?`,
              }) : undefined}
            />
            <Column
              title="Concluído"
              status="completed"
              count={concluidos.length}
              materials={concluidos}
              projectId={project.id}
              estimateMin={estimateMin}
              isCompleted
              draggingId={draggingId}
              getDraggingMaterialId={() => draggingMaterialIdRef.current}
              onDragStart={(mid) => {
                draggingMaterialIdRef.current = mid;
                setTimeout(() => {
                  setDraggingId(mid);
                  if (typeof document !== "undefined") document.body.classList.add("is-dragging-kanban");
                }, 0);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                draggingMaterialIdRef.current = null;
                if (typeof document !== "undefined") document.body.classList.remove("is-dragging-kanban");
              }}
              onDrop={(mid) => handleMoveMaterial(mid, "completed")}
              openMenuId={materialMenuOpenId}
              onOpenMenu={setMaterialMenuOpenId}
              menuRef={materialMenuRef}
              onEditMaterial={(m) => { setEditMaterial({ projectId: project.id, m }); setEditMaterialName(m.nomeArquivo ?? ""); }}
              onDeleteMaterial={(m) => setDeleteMaterial({ projectId: project.id, materialId: m.id })}
              onStudyClick={getPreferences().avisoTransicao ? (m) => setTransitionModal({
                open: true,
                href: `/project/${project.id}/material/${m.id}`,
                message: `Você vai estudar "${m.nomeArquivo ?? "tópico"}". Pronto para continuar?`,
              }) : undefined}
            />
            </div>
          </div>

          {materials.length === 0 && (
            <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum tópico ainda. Use &quot;Adicionar PDF&quot; para enviar o primeiro.
              </p>
              <Button asChild>
                <Link href={`/project/${project.id}/add-pdf`}>Adicionar PDF</Link>
              </Button>
            </div>
          )}
        </motion.div>

        {/* Modal: Editar nome do projeto */}
        {showEditProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setShowEditProject(false)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Editar projeto</h3>
              <Input
                value={editProjectTitle}
                onChange={(e) => setEditProjectTitle(e.target.value)}
                placeholder="Nome do projeto"
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setShowEditProject(false)}>Cancelar</Button>
                <Button disabled={saving || !editProjectTitle.trim()} onClick={handleSaveProjectTitle}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Nova tarefa */}
        {showNewTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setShowNewTaskModal(false)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Nova tarefa</h3>
              <p className="text-sm text-muted-foreground mb-3">Tarefa ou tópico sem PDF. Você pode adicionar um PDF depois ou usar como lembrete.</p>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex.: Revisar cap. 3"
                className="mb-4"
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => { setShowNewTaskModal(false); setNewTaskTitle(""); }}>Cancelar</Button>
                <Button disabled={saving || !newTaskTitle.trim()} onClick={handleAddTask}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Aviso de transição (ir estudar) */}
        {transitionModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTransitionModal((t) => ({ ...t, open: false }))}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-foreground mb-4">{transitionModal.message}</p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setTransitionModal((t) => ({ ...t, open: false }))}>
                  Voltar
                </Button>
                <Button onClick={() => { router.push(transitionModal.href); setTransitionModal((t) => ({ ...t, open: false })); }}>
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Excluir projeto */}
        {showDeleteProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setShowDeleteProject(false)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-2">Excluir projeto?</h3>
              <p className="text-muted-foreground text-sm mb-4">Esta ação não pode ser desfeita. Todos os materiais e cards serão removidos.</p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setShowDeleteProject(false)}>Cancelar</Button>
                <Button variant="destructive" disabled={saving} onClick={handleDeleteProject}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar nome do PDF/material */}
        {editMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setEditMaterial(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-3">Editar nome do tópico</h3>
              <Input
                value={editMaterialName}
                onChange={(e) => setEditMaterialName(e.target.value)}
                placeholder="Nome do PDF / tópico"
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setEditMaterial(null)}>Cancelar</Button>
                <Button disabled={saving || !editMaterialName.trim()} onClick={handleSaveMaterialName}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Excluir PDF/material */}
        {deleteMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setDeleteMaterial(null)}>
            <div className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-2">Excluir este tópico?</h3>
              <p className="text-muted-foreground text-sm mb-4">O PDF e os cards deste tópico serão removidos do projeto.</p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setDeleteMaterial(null)}>Cancelar</Button>
                <Button variant="destructive" disabled={saving} onClick={handleDeleteMaterialConfirm}>
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

function Column({
  title,
  status,
  count,
  materials,
  projectId,
  estimateMin,
  isCompleted,
  draggingId,
  getDraggingMaterialId,
  onDragStart,
  onDragEnd,
  onDrop,
  openMenuId,
  onOpenMenu,
  menuRef,
  onEditMaterial,
  onDeleteMaterial,
  onStudyClick,
}: {
  title: string;
  status: MaterialStatus;
  count: number;
  materials: Material[];
  projectId: string;
  estimateMin: (m: Material) => number;
  isCompleted?: boolean;
  draggingId?: string | null;
  getDraggingMaterialId?: () => string | null;
  onDragStart?: (materialId: string) => void;
  onDragEnd?: () => void;
  onDrop?: (materialId: string) => void;
  openMenuId?: string | null;
  onOpenMenu?: (id: string | null) => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  onEditMaterial?: (m: Material) => void;
  onDeleteMaterial?: (m: Material) => void;
  onStudyClick?: (m: Material) => void;
}) {
  const hasNoContent = (m: Material) => (m.cards?.length ?? 0) === 0 && !(m.resumo?.trim?.() ?? "");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = getDraggingMaterialId?.() ?? e.dataTransfer.getData("materialId") ?? e.dataTransfer.getData("text/plain");
    if (id && onDrop) onDrop(id);
  };

  return (
    <div className="relative rounded-xl border bg-card/50 p-4">
      <h2
        className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {title} {count > 0 && <span className="text-foreground">({count})</span>}
      </h2>
      <div
        className="space-y-2 min-h-[80px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {materials.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 px-2">Arraste um tópico aqui</p>
        ) : materials.map((m, i) => {
          const noContent = hasNoContent(m);
          return (
            <div
            key={m.id}
            data-kanban-card
            className={`relative rounded-lg border p-4 pl-3 transition-all text-left group flex items-start gap-2 ${noContent ? "border-dashed border-muted-foreground/40 bg-muted/30 hover:border-primary/40 hover:bg-primary/5" : "border bg-card hover:border-primary/30 hover:bg-primary/5"} ${draggingId === m.id ? "opacity-50" : ""}`}
            ref={openMenuId === m.id ? menuRef : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = getDraggingMaterialId?.() ?? e.dataTransfer.getData("materialId") ?? e.dataTransfer.getData("text/plain");
              if (id && onDrop) onDrop(id);
            }}
          >
            <span
              data-drag-handle
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("materialId", m.id);
                e.dataTransfer.setData("text/plain", m.id);
                e.dataTransfer.effectAllowed = "move";
                const card = (e.currentTarget as HTMLElement).closest("[data-kanban-card]");
                if (card) e.dataTransfer.setDragImage(card as HTMLElement, 0, 0);
                onDragStart?.(m.id);
              }}
              onDragEnd={() => onDragEnd?.()}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none text-muted-foreground hover:text-foreground"
              aria-label="Arrastar"
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <div
              className="flex-1 min-w-0"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = getDraggingMaterialId?.() ?? e.dataTransfer.getData("materialId") ?? e.dataTransfer.getData("text/plain");
                if (id && onDrop) onDrop(id);
              }}
            >
            {noContent ? (
              <Link href={`/project/${projectId}/add-pdf?materialId=${m.id}`} className="block pr-8 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = getDraggingMaterialId?.() ?? e.dataTransfer.getData("materialId") ?? e.dataTransfer.getData("text/plain"); if (id && onDrop) onDrop(id); }}>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-0.5 mb-2">
                  <FileQuestion className="w-3 h-3" />
                  Sem PDF
                </span>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground truncate flex-1">
                    {m.nomeArquivo ?? `Tarefa ${i + 1}`}
                  </span>
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Clique para adicionar PDF
                </p>
              </Link>
            ) : onStudyClick ? (
              <button
                type="button"
                onClick={() => onStudyClick(m)}
                className="block w-full text-left pr-8 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const id = getDraggingMaterialId?.() ?? e.dataTransfer.getData("materialId") ?? e.dataTransfer.getData("text/plain"); if (id && onDrop) onDrop(id); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground truncate flex-1">
                    {m.nomeArquivo ?? `PDF ${i + 1}`}
                  </span>
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{estimateMin(m)} min
                </p>
              </button>
            ) : (
              <Link href={`/project/${projectId}/material/${m.id}`} className="block pr-8" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = getDraggingMaterialId?.() ?? e.dataTransfer.getData("materialId") ?? e.dataTransfer.getData("text/plain"); if (id && onDrop) onDrop(id); }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground truncate flex-1">
                    {m.nomeArquivo ?? `PDF ${i + 1}`}
                  </span>
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{estimateMin(m)} min
                </p>
              </Link>
            )}
            </div>
            {onOpenMenu && onEditMaterial && onDeleteMaterial && (
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenMenu(openMenuId === m.id ? null : m.id);
                  }}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
                {openMenuId === m.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border bg-card py-1 shadow-lg z-30">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted"
                      onClick={(e) => {
                        e.preventDefault();
                        onEditMaterial(m);
                        onOpenMenu(null);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar nome
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault();
                        onDeleteMaterial(m);
                        onOpenMenu(null);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>
      {/* Camada de drop por cima de tudo; ativa só com body.is-dragging-kanban */}
      <div
        className="column-drop-overlay absolute inset-0 z-[100] rounded-xl pointer-events-none"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-hidden
      />
    </div>
  );
}
