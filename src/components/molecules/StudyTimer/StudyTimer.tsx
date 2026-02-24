"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StudyTimerProps {
  /** Duração inicial em minutos */
  initialMinutes: number;
  /** Chamado quando o timer chega a 0 */
  onComplete?: () => void;
  className?: string;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function StudyTimer({ initialMinutes, onComplete, className }: StudyTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isRunning || secondsRemaining <= 0) return;
    const t = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, secondsRemaining]);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(initialMinutes * 60);
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/15 px-3 border border-primary/20",
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Timer de sessão: ${formatTime(secondsRemaining)} restantes`}
    >
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground min-w-[2.75rem]">
        {formatTime(secondsRemaining)}
      </span>
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
  );
}
