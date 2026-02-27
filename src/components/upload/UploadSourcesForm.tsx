"use client";

import { useCallback, useId } from "react";
import { Upload, FileText, Loader2, Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/atoms";

export type UploadSourcesFormProps = {
  pdfFiles: File[];
  imageFiles: File[];
  mergeAllIntoOne: boolean;
  onPdfFilesChange: (files: File[]) => void;
  onImageFilesChange: (files: File[]) => void;
  onMergeAllIntoOneChange: (value: boolean) => void;
  onResultsClear?: () => void;
  error: string | null;
  topicCount: number;
  processingIndex: number | null;
  onProcess: () => void | Promise<void>;
};

export function UploadSourcesForm({
  pdfFiles,
  imageFiles,
  mergeAllIntoOne,
  onPdfFilesChange,
  onImageFilesChange,
  onMergeAllIntoOneChange,
  onResultsClear,
  error,
  topicCount,
  processingIndex,
  onProcess,
}: UploadSourcesFormProps) {
  const id = useId().replace(/:/g, "");
  const pdfInputId = `pdf-input-${id}`;
  const imageInputId = `image-input-${id}`;
  const hasSources = pdfFiles.length > 0 || imageFiles.length > 0;

  const clearResults = useCallback(() => {
    onResultsClear?.();
  }, [onResultsClear]);

  const handlePdfChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;
      const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
      if (pdfs.length) {
        onPdfFilesChange([...pdfFiles, ...pdfs]);
        clearResults();
      }
      e.target.value = "";
    },
    [pdfFiles, onPdfFilesChange, clearResults]
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;
      const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (images.length) {
        onImageFilesChange([...imageFiles, ...images]);
        clearResults();
      }
      e.target.value = "";
    },
    [imageFiles, onImageFilesChange, clearResults]
  );

  const handlePdfDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const list = e.dataTransfer.files;
      if (!list?.length) return;
      const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
      if (pdfs.length) {
        onPdfFilesChange([...pdfFiles, ...pdfs]);
        clearResults();
      }
    },
    [pdfFiles, onPdfFilesChange, clearResults]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const removePdf = useCallback(
    (index: number) => {
      onPdfFilesChange(pdfFiles.filter((_, i) => i !== index));
      clearResults();
    },
    [pdfFiles, onPdfFilesChange, clearResults]
  );

  const removeImage = useCallback(
    (index: number) => {
      onImageFilesChange(imageFiles.filter((_, i) => i !== index));
      clearResults();
    },
    [imageFiles, onImageFilesChange, clearResults]
  );

  const clearImageGroup = useCallback(() => {
    onImageFilesChange([]);
    clearResults();
  }, [onImageFilesChange, clearResults]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={pdfInputId} className="text-sm font-medium text-foreground block mb-2">
            PDFs
          </label>
          <input
            id={pdfInputId}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handlePdfChange}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={0}
            onDrop={handlePdfDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById(pdfInputId)?.click()}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById(pdfInputId)?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Enviar PDFs</p>
            <p className="text-xs text-muted-foreground mt-0.5">vários de uma vez</p>
          </div>
        </div>
        <div>
          <label htmlFor={imageInputId} className="text-sm font-medium text-foreground block mb-2">
            Fotos para 1 tópico
          </label>
          <input
            id={imageInputId}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => document.getElementById(imageInputId)?.click()}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById(imageInputId)?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Tirar foto ou enviar da galeria</p>
            <p className="text-xs text-muted-foreground mt-0.5">várias fotos = 1 tópico</p>
          </div>
          {imageFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imageFiles.map((_, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  Foto {i + 1}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
                    aria-label="Remover foto"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearImageGroup}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Limpar todas
              </button>
            </div>
          )}
        </div>
      </div>

      {pdfFiles.length > 0 && (
        <div>
          <span className="text-sm font-medium text-foreground">PDFs: </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {pdfFiles.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
              >
                <FileText className="w-4 h-4 shrink-0" />
                {f.name}
                <button
                  type="button"
                  onClick={() => removePdf(i)}
                  className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
                  aria-label="Remover"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {hasSources && (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {mergeAllIntoOne ? "Tudo em um único tópico" : "Cada arquivo = 1 tópico"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mergeAllIntoOne
                ? "PDFs e fotos serão combinados em um só resumo e cards."
                : "Cada PDF e cada foto geram um tópico separado."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mergeAllIntoOne}
            aria-label={
              mergeAllIntoOne
                ? "Juntar tudo em um tópico (ativado)"
                : "Cada arquivo um tópico (ativado)"
            }
            onClick={() => onMergeAllIntoOneChange(!mergeAllIntoOne)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              mergeAllIntoOne ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                mergeAllIntoOne ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={onProcess}
        disabled={topicCount === 0 || processingIndex !== null}
        size="lg"
        className="w-full"
      >
        {processingIndex !== null ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando {processingIndex + 1} de {topicCount}…
          </>
        ) : (
          `Gerar resumo e cards${topicCount > 1 ? ` (${topicCount} tópicos)` : topicCount === 1 ? " (1 tópico)" : ""}`
        )}
      </Button>
    </div>
  );
}
