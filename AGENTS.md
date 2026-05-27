# AGENTS.md — digiai

> **Porta de entrada padronizada** para qualquer agente IA (Claude, Cursor, Cline, Copilot, Aider) entrando neste app. Convenção definida em [ADR-0024](../Cockpit/ADR/ADR-0024-agents-md-por-app-aguardando-design-system.md).
>
> Criado em 2026-05-25, replicando o piloto do `clearix_hub`.

---

## 1. O que é (1 frase)

**Painel operacional interno (control plane) da DIGIAI ÓTICA E TECNOLOGIA LTDA** — orquestra Verdades Canônicas, Roadmap de 8 fases, Decisões, Backlog, Cadastro da Empresa, Funil OSI, Financeiro, Academy, Biblioteca, Comercial, Brand Guidelines e a Central do ecossistema Clearix.

## 2. Posição na DIGIAI

- **Verdade Canônica que rege:** *"DIGIAI App é infraestrutura interna, não produto de mercado"* (MÉDIO)
- **Fase atual do app:** Em uso interno diário (Fase 1, infraestrutura interna)
- **Prioridade na matriz:** **INFRAESTRUTURA INTERNA** (não-SaaS — uso interno do dono e da equipe)
- **Categoria portfólio:** INFRAESTRUTURA INTERNA (não compete com Clearix; serve o dono)
- **Pacote comercial:** **não aplicável** (uso interno único — não é vendido)
- **SLA:** **mais rigoroso que qualquer produto individual** (decisão 17/04/2026, [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md)) — qualquer downtime quebra a gestão central da empresa

## 3. Onde está a verdade (leituras obrigatórias antes de editar)

- **Spec própria:** [`../Cockpit/Spec/digiai.md`](../Cockpit/Spec/digiai.md) (218+ linhas; verificada no navegador 2026-05-22)
- **ADRs aplicáveis:**
  - [ADR-0001 v3](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md) — isolamento DB Clearix (digiai usa banco próprio; Central Clearix é a única exceção via auth super_admin separado)
  - [ADR-0004](../Cockpit/ADR/ADR-0004-digiai-app-control-plane.md) — DIGIAI App = control plane interno
  - [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md) — SLA rigoroso
  - [ADR-0006](../Cockpit/ADR/ADR-0006-jwt-central.md) — JWT central
  - [ADR-0007](../Cockpit/ADR/ADR-0007-entitlements-pull-push.md) — entitlements pull-push
  - [ADR-0008](../Cockpit/ADR/ADR-0008-billing-gateway-mais-cache.md) — billing gateway + cache
  - [ADR-0009](../Cockpit/ADR/ADR-0009-regua-inadimplencia.md) — régua de inadimplência
- **Regras Harness críticas:**
  - **R-001** — `docs/` obrigatório (existe em `digiai/docs/`)
  - **R-003** — não commit sem pedido
  - **R-004** — ação destrutiva exige confirmação humana (banco próprio digiai, mas afeta gestão central)
  - **R-005** — UI verificada no navegador
  - **R-009** — banco Clearix isolado (digiai usa banco próprio `hswyopqvnolqpmprqvzh`; **não** o Clearix)
  - **R-010** — Pergunta de Ouro filtra toda decisão
  - **R-011** — Cotrabalho AI/humano (digiai contém Financeiro/Cadastro Empresa — dados sensíveis)
  - **R-013** — schema obrigatório de cadastros de pessoa (USUUID + BSUID)
  - **R-024** — Baseline AppSec (OWASP Top 10): RLS · parametrized queries · webhooks com signature · headers de segurança · `dangerouslySetInnerHTML` e `execute_sql` interpolado bloqueados por hook T-005
- **NÃO se aplica:** R-014 (clearix_design). digiai **não** é Clearix — tem identidade visual própria funcional.
- **Documentação do app:** [`docs/README.md`](docs/README.md) + [`docs/changelog.md`](docs/changelog.md) + `docs/treinamentos/`, `docs/aulas/`, `docs/divulgacao/`
- **🏢 Brand da DIGIAI mãe (institucional):** [`docs/brand/`](docs/brand/) — **fonte canônica** da identidade visual da holding DIGIAI (Editorial Forest Green / Convergence Grid · Stitch v2 ativo desde 2026-05-26)
  - [`docs/brand/README.md`](docs/brand/README.md) — visão geral
  - [`docs/brand/prompts-stitch-rebrand-v2.md`](docs/brand/prompts-stitch-rebrand-v2.md) — 603 linhas, prompts sequenciais v2
  - [`docs/brand/GUIA-aplicar-nas-redes-sociais.md`](docs/brand/GUIA-aplicar-nas-redes-sociais.md) — aplicação prática
  - [`docs/brand/stitch_final/`](docs/brand/stitch_final/) — 8 subpastas (design system, logo, lockups, telas, redes, papelaria, pitch deck, sub-produtos)
  - **Mapa cross-app** das identidades em [`../Cockpit/marca-institucional.md`](../Cockpit/marca-institucional.md) §"Mapa cross-app de identidades visuais"
  - **Princípio:** brand DIGIAI mãe ≠ brand Clearix. Clearix tem `Cockpit/clearix_design/` (R-014). digiai App é dono da brand DIGIAI **institucional** (holding).

## 4. Stack + dev

- **Stack:** **Vite 6.2** + React 19 + TypeScript 5.8 + TailwindCSS 4.1 + Motion + Chart.js + Lucide React + `@google/genai` 1.29
- **Porta dev:** **3000** (host `0.0.0.0` — `npm run dev` em `vite --port=3000 --host=0.0.0.0`) — **conflita com `clearix_hub`** ao rodar local; mudar uma das duas
- **URL produção:** ⚠️ A verificar (não documentado no README) — link no header do app aponta para `digiaiatlas.netlify.app` (clearix_atlas, app diferente)
- **Como rodar:**
  ```bash
  npm install
  npm run dev      # http://localhost:3000 (host 0.0.0.0)
  npm run build    # build de produção (dist/)
  npm run preview  # serve build local
  npm run lint     # tsc --noEmit (typecheck — sem ESLint)
  npm run clean    # rm -rf dist
  ```
- **Hospedagem:** ⚠️ A verificar (Spec §13 gap: "Confirmar hospedagem — Netlify? Vercel? Cloud Run?")
- **Repositório:** `https://github.com/sisdigiai/sisdigiai.git`
- **Modo offline/fallback:** ✅ funciona sem `.env` — dev local sem chaves usa `localStorage`

## 5. Banco + permissões

- **Projeto Supabase próprio:** `hswyopqvnolqpmprqvzh.supabase.co` (banco DIGIAI **isolado** do Clearix por [ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md))
- **MCP Supabase tem acesso direto?** ❌ Não (MCP só vê banco Clearix `mhgbuplnxtfgipbemchb`). Operações DB aqui são via SDK Supabase normal usando `VITE_SUPABASE_*`.
- **Schemas locais:**
  - `company.*` — identidade legal, contatos, ativos digitais, ferramentas, snapshots financeiros, status LGPD
  - `finance.*` — produtos, vendors, despesas, subscriptions, infra costs, revenue, founder time
  - `iam.*` — usuários e auditoria
  - `academy.*` (mig 015) — produtos digitais Academy
  - `roadmap.*` — fases/tarefas do Roadmap 8 fases
- **Migrations:** 17 versionadas em `supabase/migrations/` (ordem: schemas → IAM → company → finance → ops → academy → roadmap → copy)
- **Auth:** Supabase Auth — gate "Acesso restrito" na entrada
- **Central Clearix (módulo interno):** **única exceção ao isolamento** — usa `VITE_CLEARIX_SUPABASE_URL` + auth super_admin **separada** do login DigiAI normal (gate explícito no UI). Usuário comum digiai **NUNCA** vê o banco Clearix.

## 6. Comandos

### ✅ Verde (rodar sem confirmar)

- `npm install` — primeira vez
- `npm run dev` — sobe Vite dev na porta 3000
- `npm run build` — build de produção
- `npm run preview` — serve o build local
- `npm run lint` — typecheck (tsc --noEmit)
- `npm run clean` — remove `dist/`
- `git status` / `git diff` / `git log` — leitura git
- SELECT no banco próprio digiai via SDK

### 🟡 Confirma antes

- `npm install <pacote>` — adiciona dependência
- Criar nova migration em `supabase/migrations/NNN_*.sql` — afeta banco da gestão central
- DDL em `company.*` / `finance.*` / `iam.*` — dados de identidade e financeiros da empresa
- Editar `docs_sync/` (⚠️ NÃO é doc — é fonte de dados runtime; quebra Biblioteca/Academy)
- Mudanças no módulo Clearix Central (afeta auth super_admin separado)

### 🔴 Nunca sem permissão explícita (R-003, R-004, R-011)

- `git push` / `git commit` — exige instrução explícita
- DELETE / TRUNCATE / DROP em qualquer schema (`company`, `finance`, `iam`, `academy`, `roadmap`)
- Renomear ou mover `docs_sync/` (quebra runtime de Biblioteca/Academy/copy seed)
- Modificar `finance.expenses` ou `finance.snapshots` (188+ lançamentos reconciliados via OFX jan→mai/2026 — fonte da verdade financeira da empresa)
- Apagar/alterar Verdades Canônicas (requer ADR — ver Spec §3)
- Apagar Decisões registradas (14 decisões formais, base auditável)
- Modificar gate super_admin do módulo Central Clearix (vazaria acesso Clearix a usuário digiai)
- Deploy produção (afeta gestão central diária do dono)
- `dangerouslySetInnerHTML` sem DOMPurify (hook T-005 bloqueia — R-024)
- `execute_sql` com template literal interpolado (hook T-005 bloqueia — R-024)

## 7. Módulos do painel

| Sidebar label       | Componente                                     |
|---------------------|------------------------------------------------|
| Visão               | `src/modules/Visao.tsx`                        |
| Portfólio           | `src/modules/Portfolio.tsx`                    |
| Roadmap             | `src/modules/Trilha.tsx` (importa `RoadmapCalendar` + `RoadmapHistorico`) |
| Lista Mestra        | `src/modules/ListaMestra.tsx`                  |
| Backlog Executivo   | `src/modules/Backlog.tsx`                      |
| Cadastro Empresa    | `src/modules/CadastroEmpresa.tsx`              |
| **Clearix (central)** | `src/modules/Clearix.tsx` + `clearix/*` — auth super_admin **separado** |
| Atlas               | link externo → `digiaiatlas.netlify.app`       |
| Comercial           | `src/modules/Comercial.tsx`                    |
| Academy             | `src/modules/Academy.tsx`                      |
| Funil OSI           | `src/modules/Funil.tsx` (OSI = Ótica Sem Improviso) |
| Financeiro          | `src/modules/Financeiro.tsx` (toggle "Ocultar aporte intelectual") |
| Decisões            | `src/modules/Decisoes.tsx`                     |
| Biblioteca          | `src/modules/Biblioteca.tsx` (consome `docs_sync/`) |
| Brand Guidelines    | `src/components/BrandGuidelines.tsx`           |

## 8. NÃO fazer (antipatterns específicos deste app)

- **Acessar o banco Clearix** sem passar pelo gate super_admin do módulo Central (viola [ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md) + R-009)
- Renomear / mover `docs_sync/` — é fonte de dados runtime, **não documentação** (lido por `copySeedData.ts`, `academyStore.ts`, `Biblioteca.tsx`, mig 015)
- Adicionar dependência externa sem necessidade forte (SLA rigoroso ADR-0005 — cada dep externa adiciona ponto de falha)
- Hardcodar URLs de outros apps (usar `VITE_ATLAS_URL` e equivalentes)
- Esquecer R-013 e criar nova tabela de pessoa sem `digiai_user_uuid` + `wa_bsuid`
- Comentar em código o que o código óbvio faz (CLAUDE.md §5 — só comentário para *porquês* não óbvios)
- Mudar verdades canônicas, decisões registradas ou ADRs sem ADR formal
- Tratar este app como produto comercial (é infraestrutura interna por Verdade Canônica)

## 9. Secrets

- **Onde:** sempre via `.env` na raiz do app — nunca hardcoded
- **Variáveis exigidas (mas opcionais para dev — modo fallback):**
  - `VITE_SUPABASE_URL` — `https://hswyopqvnolqpmprqvzh.supabase.co` (banco próprio digiai)
  - `VITE_SUPABASE_ANON_KEY` — anon public key do projeto digiai
- **Variáveis opcionais:**
  - `VITE_CLEARIX_SUPABASE_URL` — projeto Clearix (para módulo Central Clearix — auth super_admin separado)
  - `VITE_CLEARIX_SUPABASE_ANON_KEY`
  - `VITE_ATLAS_URL` — default `https://digiaiatlas.netlify.app` (link no header)
- **IA:**
  - Configuração `@google/genai` — chave a verificar (não está em `.env.example` na raiz do README)
- **NUNCA commitar `.env*`** — verificar `.gitignore` antes de qualquer push

## 10. Pendências conhecidas (do Spec §13 + §8)

- [ ] Confirmar hospedagem (Netlify? Vercel? Cloud Run?) — gap aberto na Spec
- [ ] Documentar identidade visual em `Cockpit/marca-institucional.md` (decisão 17/04 sobre marca "Clearix Academy, by DIGIAI" sugere material disponível)
- [ ] DPO nomeado (Cadastro Empresa → LGPD) — marco pendente
- [ ] Snapshot financeiro consolidado em `company.financial_snapshots` (parcialmente atendido — falta agregado mensal)
- [ ] 1ª entrevista feita (Fase 0 do Roadmap — métrica única: 20 entrevistas honestas + 3 cartas de intenção)
- [ ] Migrar `iam.users` para R-013 (USUUID + WhatsApp fields)
- [ ] Resolver 58 tarefas atrasadas do Roadmap + 13 itens críticos do Backlog (Spec §5)

## 11. Pergunta de Ouro pra qualquer decisão

> *"Isso fortalece a DIGIAI, o Clearix e a implantação da empresa segundo a verdade canônica atual?"*

Se não → pause e questione. Em caso de dúvida ou ambiguidade, **pause e pergunte ao humano**. Este app é o painel-mestre interno; erro aqui quebra a gestão central da empresa.

---

## Notas para quem mantém este arquivo

- **Última atualização:** 2026-05-25 (criação seguindo padrão piloto `clearix_hub`)
- **Versão do template base:** v1.0 (espelhando `Templates/AGENTS.md`)
- **Validação em produção:** ⚠️ A verificar (Spec foi verificada no navegador em 2026-05-22)
- **Referências:** [Spec/digiai.md](../Cockpit/Spec/digiai.md), [CLAUDE.md](../CLAUDE.md), [ADR-0004](../Cockpit/ADR/ADR-0004-digiai-app-control-plane.md), [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md), [docs/README.md](docs/README.md)
