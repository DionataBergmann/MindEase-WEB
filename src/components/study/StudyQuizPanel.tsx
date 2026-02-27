import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Trophy, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/atoms";
import { scrollToElement } from "@/lib/scroll";
import type { ProjectCard } from "@/types/project";

type QuizItem = { question: string; correctAnswer: string; options: string[] };

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildQuizItems(cards: ProjectCard[]): QuizItem[] {
  if (cards.length === 0) return [];
  const allAnswers = cards.map((c) => c.conteudo);
  return shuffle(cards).map((card) => {
    const others = allAnswers.filter((a) => a !== card.conteudo);
    const wrong = shuffle(others).slice(0, Math.min(3, others.length));
    const options = shuffle([card.conteudo, ...wrong]);
    return { question: card.titulo, correctAnswer: card.conteudo, options };
  });
}

type StudyQuizPanelProps = {
  cards: ProjectCard[];
  emptyText: string;
};

export function StudyQuizPanel({ cards, emptyText }: StudyQuizPanelProps) {
  const quizItems = useMemo(() => buildQuizItems(cards), [cards]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedIndex, setQuizSelectedIndex] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizNextLoading, setQuizNextLoading] = useState(false);
  const quizFeedbackRef = useRef<HTMLDivElement>(null);

  const currentQuiz = quizItems[quizIndex] ?? null;
  const quizAnswered = quizSelectedIndex !== null;
  const quizCorrect =
    currentQuiz !== null &&
    quizSelectedIndex !== null &&
    currentQuiz.options[quizSelectedIndex] === currentQuiz.correctAnswer;
  const isQuizEnd = quizStarted && quizItems.length > 0 && quizIndex >= quizItems.length;

  useEffect(() => {
    if (!quizAnswered || !quizCorrect || quizItems.length === 0 || quizIndex >= quizItems.length - 1) return;
    const t1 = setTimeout(() => setQuizNextLoading(true), 2100);
    const t2 = setTimeout(() => {
      setQuizIndex((i) => i + 1);
      setQuizSelectedIndex(null);
      setQuizNextLoading(false);
    }, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [quizAnswered, quizCorrect, quizIndex, quizItems.length]);

  useEffect(() => {
    if (quizAnswered && quizFeedbackRef.current) {
      scrollToElement(quizFeedbackRef.current, { block: "start", durationMs: 2000 });
    }
  }, [quizAnswered, quizSelectedIndex]);

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-4">{emptyText}</p>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="font-display font-semibold text-lg mb-2">Quiz</h3>
        <p className="text-muted-foreground text-sm mb-6">
          {quizItems.length} pergunta{quizItems.length !== 1 ? "s" : ""} com múltipla escolha.
        </p>
        <Button
          onClick={() => {
            setQuizStarted(true);
            setQuizIndex(0);
            setQuizSelectedIndex(null);
            setQuizScore(0);
          }}
        >
          Iniciar quiz
        </Button>
      </div>
    );
  }

  if (isQuizEnd) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="font-display font-semibold text-lg mb-2">Quiz concluído</h3>
        <p className="text-2xl font-bold text-foreground mb-2">
          {quizScore} / {quizItems.length}
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          {quizItems.length > 0 ? Math.round((quizScore / quizItems.length) * 100) : 0}% de acertos
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setQuizStarted(false);
            setQuizIndex(0);
            setQuizSelectedIndex(null);
          }}
        >
          Fazer de novo
        </Button>
      </div>
    );
  }

  if (!currentQuiz) return null;

  return (
    <>
      <motion.div
        key={quizIndex}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-xl border bg-card p-6"
      >
        <p className="text-sm text-muted-foreground mb-2">
          Pergunta {quizIndex + 1} de {quizItems.length}
        </p>
        <p className="font-display font-semibold text-lg text-foreground mb-4">{currentQuiz.question}</p>
        <div className="space-y-2">
          {currentQuiz.options.map((opt, i) => (
            <Button
              key={i}
              type="button"
              variant={
                quizAnswered
                  ? i === currentQuiz.options.indexOf(currentQuiz.correctAnswer)
                    ? "default"
                    : quizSelectedIndex === i
                    ? "destructive"
                    : "outline"
                  : "outline"
              }
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
              onClick={() => {
                setQuizIndex((i) => i - 1);
                setQuizSelectedIndex(null);
              }}
              disabled={quizIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button
              onClick={() => {
                setQuizIndex((i) => i + 1);
                setQuizSelectedIndex(null);
              }}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

