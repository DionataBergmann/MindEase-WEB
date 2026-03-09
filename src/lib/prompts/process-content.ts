function normalizeMultilineEnv(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

/**
 * Retorna o prompt a ser usado na API de process-content (lê de .env).
 * @throws Se PROCESS_CONTENT_SYSTEM_PROMPT não estiver configurado
 */
export function getProcessContentSystemPrompt(): string {
  const envPrompt = process.env.PROCESS_CONTENT_SYSTEM_PROMPT;
  if (typeof envPrompt === "string" && envPrompt.trim().length > 0) {
    return normalizeMultilineEnv(envPrompt);
  }
  throw new Error(
    "Configure PROCESS_CONTENT_SYSTEM_PROMPT no .env (copie o valor de .env.example)."
  );
}
