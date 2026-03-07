import {
  getSessionDuration,
  getPreferredStudyTab,
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "./preferences";

describe("domain/preferences", () => {
  describe("getSessionDuration", () => {
    it("retorna 18 min e label 15-20 min para duracao curta", () => {
      const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES, duracaoSessao: "curta" };
      expect(getSessionDuration(prefs)).toEqual({ minutes: 18, label: "15-20 min" });
    });

    it("retorna 28 min e label 25-30 min para duracao media", () => {
      const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES, duracaoSessao: "media" };
      expect(getSessionDuration(prefs)).toEqual({ minutes: 28, label: "25-30 min" });
    });

    it("retorna 45 min e label 45+ min para duracao longa", () => {
      const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES, duracaoSessao: "longa" };
      expect(getSessionDuration(prefs)).toEqual({ minutes: 45, label: "45+ min" });
    });
  });

  describe("getPreferredStudyTab", () => {
    it("retorna flashcards quando formato é resumo", () => {
      const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES, formatoPreferido: "resumo" };
      expect(getPreferredStudyTab(prefs)).toBe("flashcards");
    });

    it("retorna quiz quando formato é quiz", () => {
      const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES, formatoPreferido: "quiz" };
      expect(getPreferredStudyTab(prefs)).toBe("quiz");
    });

    it("retorna chat quando formato é chat", () => {
      const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES, formatoPreferido: "chat" };
      expect(getPreferredStudyTab(prefs)).toBe("chat");
    });

    it("retorna flashcards quando formato é flashcards", () => {
      const prefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        formatoPreferido: "flashcards",
      };
      expect(getPreferredStudyTab(prefs)).toBe("flashcards");
    });
  });
});
