/**
 * Re-exporta regras de domínio (Clean Architecture).
 * Código em src/domain/spaced-repetition.ts.
 */
export {
  SPACED_INTERVALS_DAYS,
  getNextReviewDateFromLevel,
  todayISO,
  isDueForReview,
  CARD_RATING_LEVEL,
  CARD_RATING_DAYS,
  isCardDueForReview,
} from "@/domain/spaced-repetition";
