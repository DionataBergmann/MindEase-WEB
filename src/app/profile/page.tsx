"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { User, LogOut, BookOpen, Eye, Brain } from "lucide-react";
import { AppShell } from "@/components/organisms";
import { Button, Input } from "@/components/atoms";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  getPreferences,
  setPreferences,
  applyPreferencesToDocument,
  type UserPreferences,
  type FormatoPreferido,
  type DuracaoSessao,
  type NivelResumo,
  type TamanhoFonte,
  type Contraste,
  type Espacamento,
  type Animacoes,
} from "@/lib/preferences";

const FORMATO_OPTIONS: { value: FormatoPreferido; label: string }[] = [
  { value: "resumo", label: "Resumo" },
  { value: "flashcards", label: "Flashcards" },
  { value: "quiz", label: "Quiz" },
  { value: "chat", label: "Chat" },
];

const DURACAO_OPTIONS: { value: DuracaoSessao; label: string }[] = [
  { value: "curta", label: "Curta (15-20 min)" },
  { value: "media", label: "Média (25-30 min)" },
  { value: "longa", label: "Longa (45+ min)" },
];

const NIVEL_RESUMO_OPTIONS: { value: NivelResumo; label: string }[] = [
  { value: "breve", label: "Breve (2-3 frases)" },
  { value: "medio", label: "Médio (1 parágrafo)" },
  { value: "completo", label: "Completo (2-3 parágrafos)" },
];

const FONTE_OPTIONS: { value: TamanhoFonte; label: string }[] = [
  { value: "P", label: "P" },
  { value: "M", label: "M" },
  { value: "G", label: "G" },
];

const CONTRASTE_OPTIONS: { value: Contraste; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "alto", label: "Alto" },
];

const ESPACAMENTO_OPTIONS: { value: Espacamento; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "amplo", label: "Amplo" },
];

const ANIMACOES_OPTIONS: { value: Animacoes; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "reduzidas", label: "Reduzidas" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setDisplayName(user.displayName ?? "");
      setEmail(user.email ?? "");
      setPrefs(getPreferences());
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSair = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    router.replace("/");
  };

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const next = setPreferences({ [key]: value });
    setPrefs(next);
    applyPreferencesToDocument(next);
  };

  if (loading || !prefs) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-12 text-center text-muted-foreground">
          Carregando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Perfil e Configurações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina como prefere estudar: formato inicial (flashcards, quiz), duração das sessões, tamanho do resumo, modo foco e mais.
          </p>
        </div>

        {/* Perfil */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold text-foreground mb-4">
            <User className="w-5 h-5" />
            Perfil
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Nome</label>
              <Input value={displayName} readOnly className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">E-mail</label>
              <Input value={email} readOnly className="bg-muted/50" />
            </div>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={handleSair}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </section>

        {/* Preferências de estudo */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold text-foreground mb-4">
            <BookOpen className="w-5 h-5" />
            Preferências de estudo
          </h2>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Formato preferido</p>
              <div className="flex flex-wrap gap-2">
                {FORMATO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("formatoPreferido", opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.formatoPreferido === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Duração da sessão</p>
              <div className="flex flex-wrap gap-2">
                {DURACAO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("duracaoSessao", opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.duracaoSessao === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Tamanho do resumo</p>
              <p className="text-xs text-muted-foreground mb-2">
                Nas telas de estudo, o resumo de cada tópico pode ser exibido em 3 níveis. Escolha o que você prefere (quando o PDF tiver sido processado com essa opção).
              </p>
              <div className="flex flex-wrap gap-2">
                {NIVEL_RESUMO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("nivelResumo", opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.nivelResumo === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Modo foco */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold text-foreground mb-4">
            <Brain className="w-5 h-5" />
            Modo foco
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Nas telas de estudo, esconde resumo, abas e links. Mostra apenas o formato que você escolheu (ex.: só Quiz ou só Flashcards) e o timer. Recomendado se muitas opções na tela atrapalham o foco. Este toggle define o <strong>padrão</strong> ao abrir; você também pode ativar e desativar direto na tela de estudo.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Modo foco como padrão</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.modoFoco}
              onClick={() => updatePref("modoFoco", !prefs.modoFoco)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                prefs.modoFoco ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  prefs.modoFoco ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Esconder menu no modo foco</p>
              <p className="text-xs text-muted-foreground">Esconde também a barra superior</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.modoFocoEsconderMenu}
              onClick={() => updatePref("modoFocoEsconderMenu", !prefs.modoFocoEsconderMenu)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                prefs.modoFocoEsconderMenu ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs.modoFocoEsconderMenu ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </section>

        {/* Avisos e pausas */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-display font-semibold text-foreground mb-4">Avisos e pausas</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Aviso antes de ir estudar</p>
                <p className="text-xs text-muted-foreground">Pergunta &quot;Pronto para continuar?&quot; antes de abrir a tela de estudo</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.avisoTransicao}
                onClick={() => updatePref("avisoTransicao", !prefs.avisoTransicao)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs.avisoTransicao ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs.avisoTransicao ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Pausas tipo Pomodoro</p>
                <p className="text-xs text-muted-foreground">Após o timer de sessão, oferece pausa de 5 min</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.pausasPomodoro}
                onClick={() => updatePref("pausasPomodoro", !prefs.pausasPomodoro)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs.pausasPomodoro ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs.pausasPomodoro ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Conforto visual */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold text-foreground mb-4">
            <Eye className="w-5 h-5" />
            Conforto visual
          </h2>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Tamanho da fonte</p>
              <p className="text-xs text-muted-foreground mb-2">Melhor leitura</p>
              <div className="flex gap-2">
                {FONTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("tamanhoFonte", opt.value)}
                    className={`w-12 h-12 rounded-lg text-sm font-bold transition-colors ${
                      prefs.tamanhoFonte === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Contraste</p>
              <p className="text-xs text-muted-foreground mb-2">Melhor para foco</p>
              <div className="flex gap-2">
                {CONTRASTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("contraste", opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.contraste === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Espaçamento</p>
              <div className="flex gap-2">
                {ESPACAMENTO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("espacamento", opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.espacamento === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Animações</p>
              <p className="text-xs text-muted-foreground mb-2">
                Reduzidas: transições e animações quase instantâneas e rolagens sem animação. Recomendado se movimento na tela incomoda ou você prefere menos estímulos visuais.
              </p>
              <div className="flex gap-2">
                {ANIMACOES_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePref("animacoes", opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.animacoes === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-foreground">Alertas de tempo</p>
                <p className="text-xs text-muted-foreground">Lembrete a cada intervalo</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.alertasTempo}
                onClick={() => updatePref("alertasTempo", !prefs.alertasTempo)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  prefs.alertasTempo ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    prefs.alertasTempo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-dashed bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Quer ver de novo a dica &quot;Personalize sua experiência&quot; na Biblioteca?{" "}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("mindease_setup_suggestion_dismissed");
                }
              }}
              className="text-primary font-medium hover:underline"
            >
              Mostrar novamente
            </button>
          </p>
        </section>
      </div>
    </AppShell>
  );
}
