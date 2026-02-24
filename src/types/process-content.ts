export type ProcessContentResponse = {
  /** Resumo principal (sempre; compatível com uso anterior) */
  resumo: string;
  /** Resumo breve: 2-3 frases (opcional) */
  resumoBreve?: string;
  /** Resumo médio: 1 parágrafo (opcional) */
  resumoMedio?: string;
  /** Resumo completo: 2-3 parágrafos (opcional) */
  resumoCompleto?: string;
  cards: Array<{ titulo: string; conteudo: string }>;
};
