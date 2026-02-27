import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/atoms";
import type { Material, ProjectCard } from "@/types/project";

export type ProjectCardWithSource = {
  materialId: string;
  materialName: string;
  card: ProjectCard;
  indexInMaterial: number;
};

type ProjectFlashcardEditorProps = {
  items: ProjectCardWithSource[];
  materiais: Material[];
  saving: boolean;
  onSaveCard: (opts: {
    mode: "edit" | "new";
    materialId: string;
    indexInMaterial?: number;
    titulo: string;
    conteudo: string;
  }) => Promise<void> | void;
  onDeleteCard: (item: ProjectCardWithSource) => Promise<void> | void;
};

export function ProjectFlashcardEditor({
  items,
  materiais,
  saving,
  onSaveCard,
  onDeleteCard,
}: ProjectFlashcardEditorProps) {
  const [editItem, setEditItem] = useState<ProjectCardWithSource | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editConteudo, setEditConteudo] = useState("");

  const [newMaterialId, setNewMaterialId] = useState<string | null>(null);
  const [newTitulo, setNewTitulo] = useState("");
  const [newConteudo, setNewConteudo] = useState("");

  const [deleteItem, setDeleteItem] = useState<ProjectCardWithSource | null>(null);

  const hasMateriais = materiais.length > 0;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display font-semibold text-foreground">
          Editar e criar flashcards
        </h3>
        {hasMateriais && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setNewMaterialId(materiais[0].id);
              setNewTitulo("");
              setNewConteudo("");
              setEditItem(null);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova flashcard
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={`${item.materialId}-${item.indexInMaterial}`}
            className="rounded-lg border bg-card p-4 flex items-start justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">
                {item.materialName}
              </p>
              <p className="font-medium text-foreground truncate">
                {item.card.titulo}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {item.card.conteudo}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditItem(item);
                  setEditTitulo(item.card.titulo);
                  setEditConteudo(item.card.conteudo);
                  setNewMaterialId(null);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteItem(item)}
                disabled={saving}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma flashcard no projeto. Adicione PDFs ou crie em cada tópico.
        </p>
      )}

      {/* Modal: Editar flashcard */}
      {editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditItem(null)}
        >
          <div
            className="rounded-xl border bg-card p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg mb-3">
              Editar flashcard
            </h3>
            <label className="text-sm font-medium text-foreground block mb-1">
              Pergunta (frente)
            </label>
            <Input
              value={editTitulo}
              onChange={(e) => setEditTitulo(e.target.value)}
              placeholder="Título / pergunta"
              className="mb-4"
            />
            <label className="text-sm font-medium text-foreground block mb-1">
              Resposta (verso)
            </label>
            <textarea
              value={editConteudo}
              onChange={(e) => setEditConteudo(e.target.value)}
              placeholder="Resposta..."
              className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEditItem(null)}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  saving || !editTitulo.trim() || !editConteudo.trim()
                }
                onClick={async () => {
                  if (!editItem) return;
                  await onSaveCard({
                    mode: "edit",
                    materialId: editItem.materialId,
                    indexInMaterial: editItem.indexInMaterial,
                    titulo: editTitulo,
                    conteudo: editConteudo,
                  });
                  setEditItem(null);
                }}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova flashcard (escolher tópico) */}
      {newMaterialId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setNewMaterialId(null)}
        >
          <div
            className="rounded-xl border bg-card p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg mb-3">
              Nova flashcard
            </h3>
            <label className="text-sm font-medium text-foreground block mb-1">
              Tópico
            </label>
            <select
              value={newMaterialId}
              onChange={(e) => setNewMaterialId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4"
            >
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nomeArquivo ?? m.id}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium text-foreground block mb-1">
              Pergunta (frente)
            </label>
            <Input
              value={newTitulo}
              onChange={(e) => setNewTitulo(e.target.value)}
              placeholder="Título / pergunta"
              className="mb-4"
            />
            <label className="text-sm font-medium text-foreground block mb-1">
              Resposta (verso)
            </label>
            <textarea
              value={newConteudo}
              onChange={(e) => setNewConteudo(e.target.value)}
              placeholder="Resposta..."
              className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setNewMaterialId(null)}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  saving ||
                  !newTitulo.trim() ||
                  !newConteudo.trim() ||
                  !newMaterialId
                }
                onClick={async () => {
                  if (!newMaterialId) return;
                  await onSaveCard({
                    mode: "new",
                    materialId: newMaterialId,
                    titulo: newTitulo,
                    conteudo: newConteudo,
                  });
                  setNewMaterialId(null);
                  setNewTitulo("");
                  setNewConteudo("");
                }}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão de flashcard */}
      {deleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setDeleteItem(null)}
        >
          <div
            className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg mb-2">
              Excluir esta flashcard?
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              A pergunta e a resposta serão removidas. Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDeleteItem(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={async () => {
                  if (!deleteItem) return;
                  await onDeleteCard(deleteItem);
                  setDeleteItem(null);
                }}
              >
                {saving ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type MaterialFlashcardEditorProps = {
  cards: ProjectCard[];
  saving: boolean;
  onSaveCard: (opts: {
    mode: "edit" | "new";
    index?: number;
    titulo: string;
    conteudo: string;
  }) => Promise<void> | void;
  onDeleteCard: (index: number) => Promise<void> | void;
};

export function MaterialFlashcardEditor({
  cards,
  saving,
  onSaveCard,
  onDeleteCard,
}: MaterialFlashcardEditorProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editConteudo, setEditConteudo] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const openNew = () => {
    setIsNew(true);
    setEditIndex(null);
    setEditTitulo("");
    setEditConteudo("");
  };

  const openEdit = (index: number) => {
    const card = cards[index];
    setIsNew(false);
    setEditIndex(index);
    setEditTitulo(card.titulo);
    setEditConteudo(card.conteudo);
  };

  const closeEditor = () => {
    setIsNew(false);
    setEditIndex(null);
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">
          Editar e criar flashcards
        </h3>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nova flashcard
        </Button>
      </div>
      <div className="space-y-2">
        {cards.map((c, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 flex items-start justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">
                {c.titulo}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {c.conteudo}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEdit(i)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteIndex(i)}
                disabled={saving}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {cards.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma flashcard ainda. Clique em &quot;Nova flashcard&quot; para
          criar.
        </p>
      )}

      {/* Modal: Editar / Nova flashcard */}
      {(editIndex !== null || isNew) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && closeEditor()}
        >
          <div
            className="rounded-xl border bg-card p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg mb-3">
              {isNew ? "Nova flashcard" : "Editar flashcard"}
            </h3>
            <label className="text-sm font-medium text-foreground block mb-1">
              Pergunta (frente)
            </label>
            <Input
              value={editTitulo}
              onChange={(e) => setEditTitulo(e.target.value)}
              placeholder="Título / pergunta"
              className="mb-4"
            />
            <label className="text-sm font-medium text-foreground block mb-1">
              Resposta (verso)
            </label>
            <textarea
              value={editConteudo}
              onChange={(e) => setEditConteudo(e.target.value)}
              placeholder="Resposta..."
              className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4 resize-y"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={closeEditor}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  saving || !editTitulo.trim() || !editConteudo.trim()
                }
                onClick={async () => {
                  if (isNew) {
                    await onSaveCard({
                      mode: "new",
                      titulo: editTitulo,
                      conteudo: editConteudo,
                    });
                  } else if (editIndex !== null) {
                    await onSaveCard({
                      mode: "edit",
                      index: editIndex,
                      titulo: editTitulo,
                      conteudo: editConteudo,
                    });
                  }
                  closeEditor();
                }}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão de flashcard */}
      {deleteIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setDeleteIndex(null)}
        >
          <div
            className="rounded-xl border bg-card p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg mb-2">
              Excluir esta flashcard?
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              A pergunta e a resposta serão removidas. Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDeleteIndex(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={async () => {
                  if (deleteIndex === null) return;
                  await onDeleteCard(deleteIndex);
                  setDeleteIndex(null);
                }}
              >
                {saving ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

