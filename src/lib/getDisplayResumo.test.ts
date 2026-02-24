import { getDisplayResumo } from "./preferences";

describe("getDisplayResumo", () => {
  it("retorna resumoCompleto quando nivel é completo e existe", () => {
    const material = {
      resumo: "Resumo padrão",
      resumoBreve: "Breve",
      resumoMedio: "Médio",
      resumoCompleto: "Completo aqui",
    };
    expect(getDisplayResumo(material, "completo")).toBe("Completo aqui");
  });

  it("retorna resumoMedio quando nivel é medio e existe", () => {
    const material = {
      resumo: "Resumo padrão",
      resumoMedio: "Um parágrafo médio",
    };
    expect(getDisplayResumo(material, "medio")).toBe("Um parágrafo médio");
  });

  it("retorna resumoBreve quando nivel é breve e existe", () => {
    const material = {
      resumo: "Resumo padrão",
      resumoBreve: "Breve",
    };
    expect(getDisplayResumo(material, "breve")).toBe("Breve");
  });

  it("retorna resumo quando nivel pede variante mas não existe", () => {
    const material = { resumo: "Só tenho resumo" };
    expect(getDisplayResumo(material, "completo")).toBe("Só tenho resumo");
    expect(getDisplayResumo(material, "medio")).toBe("Só tenho resumo");
    expect(getDisplayResumo(material, "breve")).toBe("Só tenho resumo");
  });

  it("retorna string vazia quando não há resumo", () => {
    expect(getDisplayResumo({ resumo: "" }, "medio")).toBe("");
    expect(getDisplayResumo({ resumo: "  " }, "breve")).toBe("");
  });
});
