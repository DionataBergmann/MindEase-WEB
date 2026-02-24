import type { UserPreferences } from "@/domain/preferences";

/**
 * Porta (interface) para persistência de preferências.
 * O domínio não conhece localStorage; o adapter implementa esta interface.
 */
export interface IPreferencesStorage {
  get(): UserPreferences;
  set(partial: Partial<UserPreferences>): UserPreferences;
}
