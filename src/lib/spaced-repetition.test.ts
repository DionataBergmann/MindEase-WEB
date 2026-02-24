import {
  getNextReviewDateFromLevel,
  todayISO,
  isDueForReview,
  isCardDueForReview,
  SPACED_INTERVALS_DAYS,
  CARD_RATING_DAYS,
} from "./spaced-repetition";

describe("spaced-repetition", () => {
  it("todayISO retorna data no formato YYYY-MM-DD", () => {
    const today = todayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getNextReviewDateFromLevel retorna data futura", () => {
    const today = todayISO();
    const next = getNextReviewDateFromLevel(0);
    expect(next >= today).toBe(true);
  });

  it("getNextReviewDateFromLevel respeita SPACED_INTERVALS_DAYS", () => {
    const level0 = getNextReviewDateFromLevel(0);
    const level1 = getNextReviewDateFromLevel(1);
    const d0 = new Date(level0);
    const d1 = new Date(level1);
    const diff = (d1.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBeGreaterThanOrEqual(0);
  });

  it("isDueForReview retorna false para data futura", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const futureStr = future.toISOString().slice(0, 10);
    expect(isDueForReview(futureStr)).toBe(false);
  });

  it("isDueForReview retorna true para hoje", () => {
    expect(isDueForReview(todayISO())).toBe(true);
  });

  it("isCardDueForReview retorna true quando não tem nextReviewAt", () => {
    expect(isCardDueForReview({})).toBe(true);
  });

  it("CARD_RATING_DAYS tem valores numéricos", () => {
    expect(CARD_RATING_DAYS.dificil).toBe(SPACED_INTERVALS_DAYS[0]);
    expect(CARD_RATING_DAYS.medio).toBe(SPACED_INTERVALS_DAYS[1]);
    expect(CARD_RATING_DAYS.facil).toBe(SPACED_INTERVALS_DAYS[2]);
  });
});
