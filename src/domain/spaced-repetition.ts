/**
 * Regras de domínio: repetição espaçada (intervalos em dias, próxima revisão, due).
 * Sem I/O; 100% testável.
 */

/** Intervalos em dias: 1º 1d, 2º 3d, 3º 7d, 4º 14d, 5º 30d. intervalLevel 0 = primeira revisão. */
export const SPACED_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
const MAX_LEVEL = SPACED_INTERVALS_DAYS.length - 1;

/** Retorna a data da próxima revisão (ISO YYYY-MM-DD) a partir de hoje, dado o nível. */
export function getNextReviewDateFromLevel(level: number): string {
  const safeLevel = Math.min(Math.max(0, level), MAX_LEVEL);
  const days = SPACED_INTERVALS_DAYS[safeLevel];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data de hoje em YYYY-MM-DD. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Verifica se nextReviewAt está no passado ou hoje (está na hora de revisar). */
export function isDueForReview(nextReviewAt: string | undefined): boolean {
  if (!nextReviewAt) return false;
  return nextReviewAt <= todayISO();
}

/** Níveis ao classificar card: Difícil = 1d, Médio = 3d, Fácil = 7d. */
export const CARD_RATING_LEVEL = { dificil: 0, medio: 1, facil: 2 } as const;

/** Dias para próxima revisão por classificação (para exibir nos botões). */
export const CARD_RATING_DAYS: Record<keyof typeof CARD_RATING_LEVEL, number> = {
  dificil: SPACED_INTERVALS_DAYS[0],
  medio: SPACED_INTERVALS_DAYS[1],
  facil: SPACED_INTERVALS_DAYS[2],
};

/** Verifica se um card está due para revisão (nunca revisado ou nextReviewAt <= hoje). */
export function isCardDueForReview(card: { nextReviewAt?: string }): boolean {
  if (!card.nextReviewAt) return true;
  return card.nextReviewAt <= todayISO();
}
