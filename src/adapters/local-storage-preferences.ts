import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/domain/preferences";
import type { IPreferencesStorage } from "@/ports/preferences-storage";

const STORAGE_KEY = "mindease_preferences";

/**
 * Adapter: persiste preferências no localStorage (navegador).
 * Implementa a porta IPreferencesStorage.
 */
export class LocalStoragePreferencesStorage implements IPreferencesStorage {
  get(): UserPreferences {
    if (typeof window === "undefined") return DEFAULT_USER_PREFERENCES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_USER_PREFERENCES;
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return { ...DEFAULT_USER_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_USER_PREFERENCES;
    }
  }

  set(partial: Partial<UserPreferences>): UserPreferences {
    const next = { ...this.get(), ...partial };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  }
}

/** Instância singleton para uso nos use cases e em lib/preferences. */
export const localStoragePreferencesStorage = new LocalStoragePreferencesStorage();
