import { getPreferences } from "@/lib/preferences";

/** Ease-out cúbico: rápido no início, suave no fim */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Rola a página até o elemento. Respeita a preferência "Animações":
 * - Reduzidas: scroll instantâneo (previsível, menos estímulo).
 * - Normal: scroll suave com duração maior (1000ms) e easing para não parecer "violento".
 */
export function scrollToElement(element: HTMLElement, options?: { block?: ScrollLogicalPosition; durationMs?: number }): void {
  const { block = "start", durationMs = 2000 } = options ?? {};
  const reducedMotion = getPreferences().animacoes === "reduzidas";

  if (reducedMotion) {
    element.scrollIntoView({ behavior: "auto", block });
    return;
  }

  const startY = window.scrollY;
  const rect = element.getBoundingClientRect();
  const targetY = startY + rect.top - 24; // 24px de margem do topo
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = easeOutCubic(progress);
    window.scrollTo(0, startY + distance * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
