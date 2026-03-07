"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms";
import { Input } from "@/components/atoms";

export interface StudyTimerProps {
  /** Duração inicial em minutos */
  initialMinutes: number;
  /** Chamado quando o timer chega a 0 */
  onComplete?: () => void;
  editable?: boolean;
  onMinutesChange?: (minutes: number) => void;
  className?: string;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function StudyTimer({
  initialMinutes,
  onComplete,
  editable,
  onMinutesChange,
  className,
}: StudyTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMinutes, setEditMinutes] = useState(String(initialMinutes));
  const inputRef = useRef<HTMLInputElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setSecondsRemaining(initialMinutes * 60);
    setEditMinutes(String(initialMinutes));
  }, [initialMinutes]);

  useEffect(() => {
    if (!isRunning || secondsRemaining <= 0) return;
    const t = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          const cb = onCompleteRef.current;
          if (cb) setTimeout(cb, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, secondsRemaining]);

  useEffect(() => {
    if (secondsRemaining === 0 && !isRunning && initialMinutes >= 1) {
      setSecondsRemaining(initialMinutes * 60);
    }
  }, [secondsRemaining, isRunning, initialMinutes]);

  useEffect(() => {
    if (modalOpen) {
      setEditMinutes(String(Math.floor(secondsRemaining / 60) || 1));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modalOpen, secondsRemaining]);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(initialMinutes * 60);
  };

  const openModal = () => {
    if (!editable || isRunning) return;
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleApply = () => {
    const n = Math.max(1, Math.min(120, Number(editMinutes) || 1));
    setEditMinutes(String(n));
    setSecondsRemaining(n * 60);
    onMinutesChange?.(n);
    setModalOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/15 px-3 border border-primary/20",
          className
        )}
        role="timer"
        aria-live="polite"
        aria-label={`Timer de sessão: ${formatTime(secondsRemaining)} restantes`}
      >
        <button
          type="button"
          onClick={openModal}
          className={cn(
            "font-mono text-sm font-semibold tabular-nums text-foreground min-w-[2.75rem] text-left",
            editable && !isRunning && "cursor-pointer hover:bg-primary/20 rounded px-0.5 -mx-0.5"
          )}
          aria-label={editable && !isRunning ? "Editar duração do timer" : undefined}
        >
          {formatTime(secondsRemaining)}
        </button>
        <button
          type="button"
          onClick={() => setIsRunning((v) => !v)}
          className="p-1 rounded text-foreground hover:bg-primary/20 transition-colors"
          aria-label={isRunning ? "Pausar" : "Iniciar"}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="p-1 rounded text-foreground hover:bg-primary/20 transition-colors"
          aria-label="Reiniciar timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="rounded-xl border bg-card p-6 w-full max-w-xs shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="timer-edit-title"
          >
            <h3
              id="timer-edit-title"
              className="font-display font-bold text-lg text-foreground mb-3"
            >
              Editar duração do timer
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Defina por quantos minutos quer estudar nesta sessão (1 a 120).
            </p>
            <Input
              ref={inputRef}
              type="number"
              min={1}
              max={120}
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
                if (e.key === "Escape") closeModal();
              }}
              placeholder="Ex.: 25"
              className="mb-4"
              aria-label="Minutos"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={handleApply}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
