"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Trash2 } from "lucide-react";
import { getTopicDisplayName } from "@/lib/content-processing";
import type { ProcessContentResponse } from "@/types/process-content";

export type ProcessedResultsListProps = {
  results: ProcessContentResponse[];
  pdfFiles: File[];
  imageFiles: File[];
  onRemoveResult?: (index: number) => void;
  children: React.ReactNode;
};

export const ProcessedResultsList = forwardRef<HTMLDivElement, ProcessedResultsListProps>(
  function ProcessedResultsList(
    { results, pdfFiles, imageFiles, onRemoveResult, children },
    ref
  ) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 space-y-6 p-6 rounded-xl border bg-card"
      >
        <div className="flex items-center gap-2 text-success">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            {results.length} {results.length === 1 ? "tópico gerado" : "tópicos gerados"}
          </span>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="relative p-4 rounded-lg border bg-background/50 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {getTopicDisplayName(idx, pdfFiles, imageFiles)}
                </h3>
                {onRemoveResult && (
                  <button
                    type="button"
                    onClick={() => onRemoveResult(idx)}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Excluir tópico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-foreground leading-relaxed text-sm line-clamp-3">
                {result.resumo}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.cards.length} card(s)
              </p>
            </div>
          ))}
        </div>

        {children}
      </motion.div>
    );
  }
);
