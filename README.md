# MindEase – Web

Plataforma web do **MindEase**, desenvolvida para o hackathon **FIAP**. Objetivo: facilitar a vida acadêmica e profissional de pessoas neurodivergentes e com desafios de processamento cognitivo (TDAH, TEA, dislexia, burnout, ansiedade, sobrecarga sensorial).

---

## Briefing atendido

### 1. Painel Cognitivo Personalizável
- **Nível de complexidade / modo resumo:** resumo em 3 níveis (breve, médio, completo) nas preferências.
- **Modo de foco:** esconde distrações (resumo, abas, opcionalmente menu); foco no conteúdo (flashcards/quiz/chat).
- **Contraste, espaçamento e tamanho de fonte:** no Perfil (contraste alto, espaçamento amplo, fonte P/M/G).
- **Alertas cognitivos:** alerta de tempo de sessão (“Você está estudando há um tempo. Que tal uma pausa?”); opção de pausas Pomodoro.

### 2. Organizador de Tarefas com Suporte Cognitivo
- **Etapas visuais:** Kanban em 3 colunas (Para estudar, Em progresso, Concluído).
- **Timers e Pomodoro:** timer de sessão por tópico; pausas de 5 min configuráveis (Pomodoro adaptado).
- **Checklist / cards:** flashcards e quiz por tópico; revisão espaçada (Fácil/Médio/Difícil).
- **Avisos de transição:** opção “Pronto para continuar?” antes de ir para a tela de estudo.

### 3. Perfil do Usuário + Configurações Persistentes
- Preferências salvas em `localStorage`: modo foco, contraste, espaçamento, fonte, animações (normal/reduzidas), alertas de tempo, aviso de transição, pausas Pomodoro, nível de resumo.

### Acessibilidade cognitiva (obrigatório)
- **Complexidade ajustável:** resumo breve/médio/completo; modo foco.
- **Componentes de foco:** modo foco nas telas de estudo.
- **Redução de estímulos:** animações controláveis (preferência “reduzidas”); contraste e espaçamento configuráveis.
- **Ritmos guiados:** timer de sessão e pausas Pomodoro.

---

## Stack

- **Next.js** (App Router), **TypeScript**, **React**
- **Firebase** (Auth, Firestore)
- **Tailwind CSS**, **Framer Motion**
- **OpenAI** (resumos e cards a partir do texto do PDF)

---

## Como rodar

```bash
# Instalar dependências
pnpm install

# Variáveis de ambiente: crie .env.local com:
# NEXT_PUBLIC_FIREBASE_* (API Key, Auth Domain, Project ID, etc.)
# OPENAI_API_KEY

# Desenvolvimento
pnpm dev

# Build
pnpm build
pnpm start
```

---

## Estrutura relevante

- `src/app/` – rotas (home, perfil, projeto, material, revisão, new-project, add-pdf).
- `src/components/` – átomos, moléculas, organismos.
- `src/lib/` – Firebase, facade de preferências/repetição (usa domain + adapters).
- `src/types/` – reexport de tipos de domínio e contratos (process-content, etc.).
- `src/app/api/` – API routes (process-content, chat).

---

## Clean Architecture (requisito briefing)

O projeto está organizado em camadas para **domínio**, **casos de uso** e **adaptadores**, conforme o briefing.

### Camadas

| Camada | Pasta | Responsabilidade |
|--------|--------|------------------|
| **Domínio** | `src/domain/` | Regras de negócio puras (sem I/O). Entidades e value objects. Ex.: repetição espaçada, preferências (tipos + funções puras), projeto/material. |
| **Portas** | `src/ports/` | Interfaces que o domínio/use cases esperam (ex.: `IPreferencesStorage`, `IProjectRepository`). Implementações ficam nos adapters. |
| **Casos de uso** | `src/use-cases/` | Orquestram domínio + portas. Ex.: obter/salvar preferências, duração de sessão, resumo a exibir. |
| **Adaptadores** | `src/adapters/` | Implementam as portas: persistência em localStorage (preferências), Firestore (projetos). |
| **Apresentação** | `src/app/`, `src/components/` | UI; consomem `lib/` (facade que usa domain + adapters) ou, quando fizer sentido, use-cases/adapters diretamente. |

### Fluxo

- **Domínio** não depende de nada externo (Firebase, localStorage, React).
- **Use cases** dependem apenas de **portas** (interfaces), não de Firebase ou localStorage.
- **Adaptadores** implementam as portas e conhecem Firebase/localStorage.
- **`src/lib/preferences.ts`** e **`src/lib/spaced-repetition.ts`** são facades que reexportam ou usam domain + adapter, para manter compatibilidade com o resto do app.

### Onde está o quê

- **Regras puras:** `domain/spaced-repetition.ts`, `domain/preferences.ts`, `domain/project.ts`.
- **Persistência de preferências:** porta `IPreferencesStorage`, adapter `LocalStoragePreferencesStorage`.
- **Projetos (Firestore):** porta `IProjectRepository`, adapter `FirebaseProjectRepository` (uso opcional; páginas podem continuar usando `getFirestoreDb()` e migrar gradualmente para o repositório).

---

## Testes

```bash
pnpm test
```

Testes com **Vitest**; ver `src/**/*.test.ts` ou `src/**/*.spec.ts`.

---

## Pendências / entrega FIAP (conforme briefing)

- [x] **Testes:** estrutura com Vitest; testes unitários em `src/lib/*.test.ts` (preferências, repetição espaçada). Ampliar cobertura conforme necessidade.
- [x] **CI/CD:** workflow em `.github/workflows/ci.yml` (lint → test → build). Configurar secrets no repositório para o step de build (Firebase + OPENAI_API_KEY).
- [x] **README:** este arquivo atende documentação do projeto e alinhamento ao briefing.
- [ ] **Entrega:** subir **link do vídeo** e **link do projeto** em arquivo .docx ou .txt na plataforma FIAP (use o modelo em `ENTREGA-FIAP.txt`).
- [ ] **Mobile:** versão Flutter ou React Native mantendo coerência cognitiva com a Web (se no escopo do hackathon).
- [x] **Arquitetura / Clean:** projeto organizado em domain, ports, use-cases e adapters; documentado acima e em `src/domain/`, `src/ports/`, `src/adapters/`, `src/use-cases/`.

---

## CI/CD

O workflow **CI** (`.github/workflows/ci.yml`) roda em todo push/PR nas branches `main` e `master`:

1. **Lint** – `yarn lint`
2. **Test** – `yarn test` (Vitest)
3. **Build** – `yarn build` (Next.js)

Para o build passar, configure os **secrets** no repositório (Settings → Secrets and variables → Actions):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `OPENAI_API_KEY`


---

## Licença

Projeto desenvolvido para o hackathon FIAP.
