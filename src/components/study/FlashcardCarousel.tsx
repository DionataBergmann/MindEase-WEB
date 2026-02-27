import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/atoms";
import type { ProjectCard } from "@/types/project";

type FlashcardCarouselMode = "project" | "material";

type FlashcardCarouselProps = {
  cards: ProjectCard[];
  cardIndex: number;
  onCardIndexChange: (index: number) => void;
  flipped: boolean;
  onFlippedChange: (flipped: boolean) => void;
  mode: FlashcardCarouselMode;
};

export function FlashcardCarousel({
  cards,
  cardIndex,
  onCardIndexChange,
  flipped,
  onFlippedChange,
  mode,
}: FlashcardCarouselProps) {
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

  const hasPrev = cardIndex > 0;
  const hasNext = cardIndex < cards.length - 1;
  const currentCard = cards[cardIndex] ?? null;

  const handlePrev = () => {
    if (!hasPrev) return;
    setSlideDirection(-1);
    onCardIndexChange(cardIndex - 1);
    onFlippedChange(false);
  };

  const handleNext = () => {
    if (!hasNext) return;
    setSlideDirection(1);
    onCardIndexChange(cardIndex + 1);
    onFlippedChange(false);
  };

  const footerText =
    mode === "material"
      ? flipped
        ? "Próximo ou Anterior para navegar."
        : "Clique para ver a resposta"
      : "Clique para ver a resposta";

  return (
    <>
      <div
        className="cursor-pointer select-none min-h-[220px] [perspective:1000px] overflow-hidden"
        onClick={() => onFlippedChange(!flipped)}
      >
        <AnimatePresence initial={false} mode="wait" custom={slideDirection}>
          <motion.div
            key={cardIndex}
            custom={slideDirection}
            initial={{ x: slideDirection * 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -slideDirection * 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative w-full h-full min-h-[220px]"
          >
            {currentCard && (
              <motion.div
                className="w-full h-full min-h-[220px]"
                style={{ transformStyle: "preserve-3d" }}
                initial={false}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <div
                  className="absolute inset-0 rounded-xl border bg-card p-8 flex flex-col justify-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    Pergunta
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {currentCard.titulo}
                  </p>
                </div>
                <div
                  className="absolute inset-0 rounded-xl border bg-card p-8 flex flex-col justify-center"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    Resposta
                  </p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {currentCard.conteudo}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        {footerText} · {cardIndex + 1}/{cards.length}
      </p>
      <div className="flex justify-center gap-4 mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={handlePrev}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={handleNext}
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </>
  );
}

