/**
 * Facade de preferências: usa domain + adapter (Clean Architecture).
 * Regras puras em src/domain/preferences.ts; persistência em src/adapters/local-storage-preferences.ts.
 */
import {
  DEFAULT_USER_PREFERENCES,
  getDisplayResumo as domainGetDisplayResumo,
  getPreferredStudyTab as domainGetPreferredStudyTab,
  getSessionDuration as domainGetSessionDuration,
  type UserPreferences,
  type NivelResumo,
  type StudyTab,
} from "@/domain/preferences";
import { localStoragePreferencesStorage } from "@/adapters/local-storage-preferences";

export type { FormatoPreferido, DuracaoSessao, TamanhoFonte, Contraste, Espacamento, Animacoes, NivelResumo, UserPreferences, StudyTab } from "@/domain/preferences";

export function getPreferences(): UserPreferences {
  return localStoragePreferencesStorage.get();
}

export function setPreferences(prefs: Partial<UserPreferences>): UserPreferences {
  return localStoragePreferencesStorage.set(prefs);
}

export function applyPreferencesToDocument(prefs: UserPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.fontSize = prefs.tamanhoFonte;
  root.dataset.contrast = prefs.contraste;
  root.dataset.spacing = prefs.espacamento;
  root.dataset.animations = prefs.animacoes;
}

export function getPreferredStudyTab(): StudyTab {
  return domainGetPreferredStudyTab(getPreferences());
}

export function getSessionDuration(): { minutes: number; label: string } {
  return domainGetSessionDuration(getPreferences());
}

/** Exibe resumo conforme nível; se nivel omitido, usa preferência do usuário. */
export function getDisplayResumo(
  material: { resumo: string; resumoBreve?: string; resumoMedio?: string; resumoCompleto?: string },
  nivel?: NivelResumo
): string {
  const n = nivel ?? getPreferences().nivelResumo;
  return domainGetDisplayResumo(material, n);
}
