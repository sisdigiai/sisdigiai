# DIGIAI App

Painel operacional interno da **DIGIAI ÓTICA E TECNOLOGIA LTDA**. Orquestra Verdades Canônicas, Roadmap de 8 fases, Decisões, Backlog, Cadastro da Empresa, Funil OSI, Financeiro, Academy, Biblioteca, Comercial, Brand Guidelines e a central do ecossistema Clearix.

> **Posição estratégica:** infraestrutura interna, **não é produto de mercado**. Ver [Spec/digiai.md](../Cockpit/Spec/digiai.md) para a versão canônica e [Verdades Canônicas](../Cockpit/Spec/digiai.md#3-verdades-canônicas-regras-imutáveis-do-produto).

## Stack

- **Frontend:** Vite 6.2 · React 19 · TypeScript 5.8 · TailwindCSS 4.1 · Motion · Chart.js
- **Backend:** Supabase (auth + Postgres + RLS) — projeto `hswyopqvnolqpmprqvzh`
- **IA:** Google GenAI (`@google/genai`)
- **Ícones:** Lucide React

## Pré-requisitos

- Node.js 20+ (testado com 22)
- npm 10+
- Conta Supabase com as variáveis abaixo configuradas

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://hswyopqvnolqpmprqvzh.supabase.co
VITE_SUPABASE_ANON_KEY=...               # anon public key do projeto digiai
VITE_CLEARIX_SUPABASE_URL=...            # projeto Clearix (multi-tenant)
VITE_CLEARIX_SUPABASE_ANON_KEY=...
VITE_ATLAS_URL=https://digiaiatlas.netlify.app   # opcional
```

O app **funciona em modo offline/fallback sem `.env`** — preserva dev local sem chaves, com dados em `localStorage`.

## Comandos

```bash
npm run dev      # Vite em http://localhost:3000 (host 0.0.0.0)
npm run build    # build de produção (dist/)
npm run preview  # serve o build local
npm run lint     # tsc --noEmit (typecheck)
npm run clean    # remove dist/
```

## Estrutura

```
digiai/
├── docs/                   # documentação humana (treinamentos, aulas, divulgação, changelog)
├── docs_sync/              # ⚠️ NÃO é documentação — é fonte de dados em runtime
│                           # (lido por copySeedData.ts, academyStore.ts, Biblioteca.tsx)
├── scripts/                # utilitários de build (inject-task-ids, sync-manifest)
├── src/
│   ├── components/         # Sidebar, Login, Logo, BrandGuidelines compartilhados
│   ├── contexts/           # AuthContext
│   ├── lib/                # stores, supabase clients, helpers
│   ├── modules/            # módulos do painel (Visao, Portfolio, Trilha, Backlog, etc.)
│   │   ├── clearix/        # central de comando do ecossistema Clearix (auth super_admin)
│   │   └── funnel/         # Funil OSI (Ótica Sem Improviso)
│   └── App.tsx             # roteador interno (case por ModuleId)
├── supabase/
│   ├── migrations/         # 17 migrations versionadas
│   └── README.md
└── package.json
```

## Módulos do painel

| Sidebar label | Componente |
|---------------|------------|
| Visão | `src/modules/Visao.tsx` |
| Portfólio | `src/modules/Portfolio.tsx` |
| Roadmap | `src/modules/Trilha.tsx` (importa `RoadmapCalendar` + `RoadmapHistorico`) |
| Lista Mestra | `src/modules/ListaMestra.tsx` |
| Backlog Executivo | `src/modules/Backlog.tsx` |
| Cadastro Empresa | `src/modules/CadastroEmpresa.tsx` |
| Clearix (central) | `src/modules/Clearix.tsx` + `clearix/*` |
| Atlas | link externo `digiaiatlas.netlify.app` |
| Comercial | `src/modules/Comercial.tsx` |
| Academy | `src/modules/Academy.tsx` |
| Funil OSI | `src/modules/Funil.tsx` |
| Financeiro | `src/modules/Financeiro.tsx` |
| Decisões | `src/modules/Decisoes.tsx` |
| Biblioteca | `src/modules/Biblioteca.tsx` (consome `docs_sync/`) |
| Brand Guidelines | `src/components/BrandGuidelines.tsx` |

## Banco de dados

Schema separado por contexto, em **projeto Supabase próprio** (`hswyopqvnolqpmprqvzh`) — **isolado do banco Clearix** por decisão arquitetural ([ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md)):

- `company.*` — identidade legal, contatos, ativos digitais, ferramentas, snapshots financeiros, status LGPD
- `finance.*` — produtos, vendors, despesas, subscriptions, infra costs, revenue, founder time
- `iam.*` — usuários e auditoria
- 17 migrations em `supabase/migrations/` (ordem: schemas → IAM → company → finance → ops → academy → roadmap → copy)

A central **Clearix** dentro do app usa **auth super_admin separado** contra outro projeto Supabase (`mhgbuplnxtfgipbemchb`, ecossistema multi-tenant) — é a única exceção ao isolamento.

## Documentação

| Onde | O quê |
|------|-------|
| [`docs/`](docs/) | Documentação humana: treinamentos, aulas, divulgação, [changelog](docs/changelog.md) |
| [`../Cockpit/Spec/digiai.md`](../Cockpit/Spec/digiai.md) | **Spec canônica** — verdade do produto |
| [`../Cockpit/ADR/`](../Cockpit/ADR/) | Decisões arquiteturais datadas e imutáveis |
| [`../CLAUDE.md`](../CLAUDE.md) | Regras duras do workspace DIGIAI |
| [`supabase/README.md`](supabase/README.md) | Notas do banco |

## Convenções

- Código vence documentação. Divergência = corrigir a doc no mesmo turno.
- Nenhum commit sem o usuário pedir.
- Mudança não-óbvia passa pela **Pergunta de Ouro**: *"isso fortalece a DIGIAI, o Clearix e a implantação da empresa?"*
- Comentários em código: só pra **porquês não óbvios** (constraint escondida, workaround de bug específico). Nada de comentário descrevendo o que o código óbvio faz.

## Onde reportar

- Issues: [github.com/sisdigiai/sisdigiai/issues](https://github.com/sisdigiai/sisdigiai/issues)
- Decisões arquiteturais novas → criar `ADR-NNNN-titulo.md` em [`../Cockpit/ADR/`](../Cockpit/ADR/)
- Mudança de Verdade Canônica → exige ADR + atualização em `Spec/digiai.md` §3
