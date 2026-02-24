import type { IPreferencesStorage } from "@/ports/preferences-storage";
import {
  getPreferredStudyTab as domainGetPreferredStudyTab,
  getSessionDuration as domainGetSessionDuration,
  getDisplayResumo as domainGetDisplayResumo,
  type UserPreferences,
  type NivelResumo,
  type StudyTab,
} from "@/domain/preferences";

/**
 * Caso de uso: obter preferências do usuário (via adapter de persistência).
 */
export function getUserPreferences(storage: IPreferencesStorage): UserPreferences {
  return storage.get();
}

/**
 * Caso de uso: salvar preferências (parcial) e retornar o estado atual.
 */
export function setUserPreferences(storage: IPreferencesStorage, partial: Partial<UserPreferences>): UserPreferences {
  return storage.set(partial);
}

/** Retorna a aba preferida de estudo (usa preferências do storage). */
export function getPreferredStudyTab(storage: IPreferencesStorage): StudyTab {
  return domainGetPreferredStudyTab(storage.get());
}

/** Retorna duração de sessão em minutos e label (usa preferências do storage). */
export function getSessionDuration(storage: IPreferencesStorage): { minutes: number; label: string } {
  return domainGetSessionDuration(storage.get());
}

/**
 * Retorna o texto de resumo a exibir conforme preferência de nível (usa storage para prefs).
 * Material pode ter resumo, resumoBreve, resumoMedio, resumoCompleto.
 */
export function getDisplayResumo(
  storage: IPreferencesStorage,
  material: { resumo: string; resumoBreve?: string; resumoMedio?: string; resumoCompleto?: string }
): string {
  const prefs = storage.get();
  return domainGetDisplayResumo(material, prefs.nivelResumo);
}
