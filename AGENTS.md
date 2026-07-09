# Roteamento documental operacional

Antes de qualquer alteracao neste app, leia tambem:

D:\projetos\Cockpit\Apps\digiai\README.md

O app/codigo/filesystem e a verdade factual. O Cockpit e a fonte documental operacional. Se divergirem, o app vence e o Cockpit deve ser atualizado no mesmo turno.

---
# AGENTS.md â€” digiai

> **Porta de entrada padronizada** para qualquer agente IA (Claude, Cursor, Cline, Copilot, Aider) entrando neste app. ConvenÃ§Ã£o definida em [ADR-0024](../Cockpit/ADR/ADR-0024-agents-md-por-app-aguardando-design-system.md).
>
> Criado em 2026-05-25, replicando o piloto do `clearix_hub`.

---

## 1. O que Ã© (1 frase)

**Painel operacional interno (control plane) da DIGIAI Ã“TICA E TECNOLOGIA LTDA** â€” orquestra Verdades CanÃ´nicas, Roadmap de 8 fases, DecisÃµes, Backlog, Cadastro da Empresa, Funil OSI, Financeiro, Academy, Biblioteca, Comercial, Brand Guidelines e a Central do ecossistema Clearix.

## 2. PosiÃ§Ã£o na DIGIAI

- **Verdade CanÃ´nica que rege:** *"DIGIAI App Ã© infraestrutura interna, nÃ£o produto de mercado"* (MÃ‰DIO)
- **Fase atual do app:** Em uso interno diÃ¡rio (Fase 1, infraestrutura interna)
- **Prioridade na matriz:** **INFRAESTRUTURA INTERNA** (nÃ£o-SaaS â€” uso interno do dono e da equipe)
- **Categoria portfÃ³lio:** INFRAESTRUTURA INTERNA (nÃ£o compete com Clearix; serve o dono)
- **Pacote comercial:** **nÃ£o aplicÃ¡vel** (uso interno Ãºnico â€” nÃ£o Ã© vendido)
- **SLA:** **mais rigoroso que qualquer produto individual** (decisÃ£o 17/04/2026, [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md)) â€” qualquer downtime quebra a gestÃ£o central da empresa

## 3. Onde estÃ¡ a verdade (leituras obrigatÃ³rias antes de editar)

- **Spec prÃ³pria:** [`../Cockpit/Spec/digiai.md`](../Cockpit/Spec/digiai.md) (218+ linhas; verificada no navegador 2026-05-22)
- **ADRs aplicÃ¡veis:**
  - [ADR-0001 v3](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md) â€” isolamento DB Clearix (digiai usa banco prÃ³prio; Central Clearix Ã© a Ãºnica exceÃ§Ã£o via auth super_admin separado)
  - [ADR-0004](../Cockpit/ADR/ADR-0004-digiai-app-control-plane.md) â€” DIGIAI App = control plane interno
  - [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md) â€” SLA rigoroso
  - [ADR-0006](../Cockpit/ADR/ADR-0006-jwt-central.md) â€” JWT central
  - [ADR-0007](../Cockpit/ADR/ADR-0007-entitlements-pull-push.md) â€” entitlements pull-push
  - [ADR-0008](../Cockpit/ADR/ADR-0008-billing-gateway-mais-cache.md) â€” billing gateway + cache
  - [ADR-0009](../Cockpit/ADR/ADR-0009-regua-inadimplencia.md) â€” rÃ©gua de inadimplÃªncia
- **Regras Harness crÃ­ticas:**
  - **R-001** â€” `docs/` obrigatÃ³rio (existe em `digiai/docs/`)
  - **R-003** â€” nÃ£o commit sem pedido
  - **R-004** â€” aÃ§Ã£o destrutiva exige confirmaÃ§Ã£o humana (banco prÃ³prio digiai, mas afeta gestÃ£o central)
  - **R-005** â€” UI verificada no navegador
  - **R-009** â€” banco Clearix isolado (digiai usa banco prÃ³prio `hswyopqvnolqpmprqvzh`; **nÃ£o** o Clearix)
  - **R-010** â€” Pergunta de Ouro filtra toda decisÃ£o
  - **R-011** â€” Cotrabalho AI/humano (digiai contÃ©m Financeiro/Cadastro Empresa â€” dados sensÃ­veis)
  - **R-013** â€” schema obrigatÃ³rio de cadastros de pessoa (USUUID + BSUID)
  - **R-024** â€” Baseline AppSec (OWASP Top 10): RLS Â· parametrized queries Â· webhooks com signature Â· headers de seguranÃ§a Â· `dangerouslySetInnerHTML` e `execute_sql` interpolado bloqueados por hook T-005
- **NÃƒO se aplica:** R-014 (clearix_design). digiai **nÃ£o** Ã© Clearix â€” tem identidade visual prÃ³pria funcional.
- **DocumentaÃ§Ã£o do app:** [`docs/README.md`](docs/README.md) + [`docs/changelog.md`](docs/changelog.md) + `docs/treinamentos/`, `docs/aulas/`, `docs/divulgacao/`
- **ðŸ¢ Brand da DIGIAI mÃ£e (institucional):** [`docs/brand/`](docs/brand/) â€” **fonte canÃ´nica** da identidade visual da holding DIGIAI (Editorial Forest Green / Convergence Grid Â· Stitch v2 ativo desde 2026-05-26)
  - [`docs/brand/README.md`](docs/brand/README.md) â€” visÃ£o geral
  - [`docs/brand/prompts-stitch-rebrand-v2.md`](docs/brand/prompts-stitch-rebrand-v2.md) â€” 603 linhas, prompts sequenciais v2
  - [`docs/brand/GUIA-aplicar-nas-redes-sociais.md`](docs/brand/GUIA-aplicar-nas-redes-sociais.md) â€” aplicaÃ§Ã£o prÃ¡tica
  - `docs/brand/` â€” assets de brand em arquivos `.zip` (ex.: `stitch_digiai_systemic_rebrand_strategy.zip`). **NÃ£o existe** pasta `stitch_final/`/`stitch_digiai_final/` descompactada.
  - **Mapa cross-app** das identidades em [`../Cockpit/marca-institucional.md`](../Cockpit/marca-institucional.md) Â§"Mapa cross-app de identidades visuais"
  - **PrincÃ­pio:** brand DIGIAI mÃ£e â‰  brand Clearix. Clearix tem `Cockpit/clearix_design/` (R-014). digiai App Ã© dono da brand DIGIAI **institucional** (holding).

## 4. Stack + dev

- **Stack:** **Vite 6.2** + React 19 + TypeScript 5.8 + TailwindCSS 4.1 + Motion + Chart.js + Lucide React (o `@google/genai` foi **removido em 2026-05-28** â€” era dependÃªncia morta; a geraÃ§Ã£o de IA do Marketing Ã© server-side via RPC `marketing_render_prompt`)
- **Porta dev:** **3000** (host `0.0.0.0` â€” `npm run dev` em `vite --port=3000 --host=0.0.0.0`) â€” **conflita com `clearix_hub`** ao rodar local; mudar uma das duas
- **URL produÃ§Ã£o:** **https://sisdigiai.netlify.app** (auto-deploy do branch `main`; repo `sisdigiai/sisdigiai`). Verificado logado em 2026-05-28. O `digiaiatlas.netlify.app` Ã© sÃ³ um **link externo** do grupo Ecossistemas (Atlas), nÃ£o o host deste app.
- **Como rodar:**
  ```bash
  npm install
  npm run dev      # http://localhost:3000 (host 0.0.0.0)
  npm run build    # build de produÃ§Ã£o (dist/)
  npm run preview  # serve build local
  npm run lint     # tsc --noEmit (typecheck â€” sem ESLint)
  npm run clean    # rm -rf dist
  ```
- **Hospedagem:** **Netlify** (consome `public/_headers`, que jÃ¡ traz HSTS + X-Frame-Options + CSP). R-025: Cloudflare Ã© o host canÃ´nico â€” migraÃ§Ã£o conforme priorizaÃ§Ã£o do dono.
- **RepositÃ³rio:** `https://github.com/sisdigiai/sisdigiai.git`
- **Modo offline/fallback:** âœ… funciona sem `.env` â€” dev local sem chaves usa `localStorage`

## 5. Banco + permissÃµes

- **Projeto Supabase prÃ³prio:** `hswyopqvnolqpmprqvzh.supabase.co` (banco DIGIAI **isolado** do Clearix por [ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md))
- **MCP Supabase tem acesso direto?** âŒ NÃ£o â€” o MCP do workspace sÃ³ enxerga o Clearix `mhgbuplnxtfgipbemchb` (R-012). Para operar o banco digiai hÃ¡ **dois caminhos**: (a) SDK no app via `VITE_SUPABASE_*`; (b) **Management API** com o `SUPABASE_TOKEN` (PAT) do `.env` â€” permite SQL/migrations diretas (`POST https://api.supabase.com/v1/projects/hswyopqvnolqpmprqvzh/database/query`).
- **Schemas locais (verificados no banco 2026-05-28):**
  - `company.*` â€” identity, partners, contacts, digital_assets, tools, financial_snapshots, legal_status, api_credentials, metrics
  - `finance.*` â€” products, vendors, expenses, subscriptions, infra_costs, revenue, founder_time
  - `iam.*` â€” users (+ R-013: digiai_user_uuid/wa_bsuid/wa_username/wa_phone_legacy desde mig 025) e audit_logs
  - `ops.*` â€” backlog_items, decisions, milestones, **roadmap_phases**, **roadmap_tasks**, copy_assets â€” o Roadmap mora em `ops`, **nÃ£o** num schema `roadmap`
  - `academy.*` (mig 015) â€” products + assets/checklist/questions/scenarios/creation_records
  - `marketing.*` â€” **16 tabelas** (content_pillars/ideas/calendar, affiliates/materials/payouts, community, challenges, testimonials, hotmart_events_raw/sales, platforms, ai_prompt_templates, post_ai_outputs)
- **Migrations:** `001`â€“`025` em `supabase/migrations/` + **SQL solto** que cria o schema Marketing. âš ï¸ o ledger remoto (`schema_migrations`) diverge das numeradas â€” ler [`supabase/migrations/README.md`](supabase/migrations/README.md) antes de qualquer rebuild. **RLS habilitado em todas as tabelas** (`api_credentials` Ã© service_role-only, sem policy â€” proposital).
- **Auth:** Supabase Auth â€” gate "Acesso restrito" na entrada
- **Central Clearix (mÃ³dulo interno):** **Ãºnica exceÃ§Ã£o ao isolamento** â€” usa `VITE_CLEARIX_SUPABASE_URL` + auth super_admin **separada** do login DigiAI normal (gate explÃ­cito no UI). UsuÃ¡rio comum digiai **NUNCA** vÃª o banco Clearix.

## 6. Comandos

### âœ… Verde (rodar sem confirmar)

- `npm install` â€” primeira vez
- `npm run dev` â€” sobe Vite dev na porta 3000
- `npm run build` â€” build de produÃ§Ã£o
- `npm run preview` â€” serve o build local
- `npm run lint` â€” typecheck (tsc --noEmit)
- `npm run clean` â€” remove `dist/`
- `git status` / `git diff` / `git log` â€” leitura git
- SELECT no banco prÃ³prio digiai via SDK

### ðŸŸ¡ Confirma antes

- `npm install <pacote>` â€” adiciona dependÃªncia
- Criar nova migration em `supabase/migrations/NNN_*.sql` â€” afeta banco da gestÃ£o central
- DDL em `company.*` / `finance.*` / `iam.*` â€” dados de identidade e financeiros da empresa
- Editar `docs_sync/` (âš ï¸ NÃƒO Ã© doc â€” Ã© fonte de dados runtime; quebra Biblioteca/Academy)
- MudanÃ§as no mÃ³dulo Clearix Central (afeta auth super_admin separado)

### ðŸ”´ Nunca sem permissÃ£o explÃ­cita (R-003, R-004, R-011)

- `git push` / `git commit` â€” exige instruÃ§Ã£o explÃ­cita
- DELETE / TRUNCATE / DROP em qualquer schema (`company`, `finance`, `iam`, `academy`, `roadmap`)
- Renomear ou mover `docs_sync/` (quebra runtime de Biblioteca/Academy/copy seed)
- Modificar `finance.expenses` ou `finance.snapshots` (188+ lanÃ§amentos reconciliados via OFX janâ†’mai/2026 â€” fonte da verdade financeira da empresa)
- Apagar/alterar Verdades CanÃ´nicas (requer ADR â€” ver Spec Â§3)
- Apagar DecisÃµes registradas (14 decisÃµes formais, base auditÃ¡vel)
- Modificar gate super_admin do mÃ³dulo Central Clearix (vazaria acesso Clearix a usuÃ¡rio digiai)
- Deploy produÃ§Ã£o (afeta gestÃ£o central diÃ¡ria do dono)
- `dangerouslySetInnerHTML` sem DOMPurify (hook T-005 bloqueia â€” R-024)
- `execute_sql` com template literal interpolado (hook T-005 bloqueia â€” R-024)

## 7. MÃ³dulos do painel

Roteamento real em `App.tsx` (`activeModule` por estado, nÃ£o por URL). **~22 mÃ³dulos roteados; sÃ³ `Comercial` Ã© stub** (reconciliado no cÃ³digo 2026-06-02):

| Sidebar label       | Componente / Origem                                  |
|---------------------|------------------------------------------------------|
| VisÃ£o               | `src/modules/Visao.tsx`                              |
| PortfÃ³lio           | `src/modules/Portfolio.tsx` (subtÃ­tulo auto-conta `PRODUTOS.length`) |
| Roadmap             | `src/modules/Trilha.tsx` (+ `RoadmapCalendar` + `RoadmapHistorico`) |
| Lista Mestra        | `src/modules/ListaMestra.tsx` â€” visÃ£o unificada filtrÃ¡vel de Backlog + Roadmap (119 itens) |
| Backlog Executivo   | `src/modules/Backlog.tsx`                            |
| Cadastro Empresa    | `src/modules/CadastroEmpresa.tsx`                    |
| Financeiro          | `src/modules/Financeiro.tsx` (toggle "Ocultar aporte intelectual") |
| Comercial           | **STUB** â€” objeto `STUBS` em `App.tsx` â†’ `ModuleStub` (sem arquivo) |
| Academy             | `src/modules/Academy.tsx`                            |
| Funil OSI           | `src/modules/Funil.tsx` (+ `funnel/*`)               |
| Marketing           | `src/modules/Marketing.tsx` (+ `marketing/*`) â€” 10 abas: CalendÃ¡rio, Planejador, Banco de Ideias, Prompts IA, ValidaÃ§Ã£o, Depoimentos, Comunidade OSI, Desafios, Materiais, Afiliados |
| Marketing & SEO     | `src/modules/MarketingSEO.tsx` â€” **centro de controle multi-domÃ­nio (abas por site)**. GSC/Bing/Cloudflare/IndexNow por domÃ­nio, lendo `company.seo_sites` (registro data-driven; add domÃ­nio = 1 INSERT). MÃ©tricas em `company.metrics` keyed por `(site, source)`. Edge fns `marketing-sync-*` iteram todos os sites ativos (cron) ou `{site}` especÃ­fico (botÃ£o). |
| Central Clearix     | `src/modules/Clearix.tsx` + `clearix/*` â€” auth super_admin **separado** (ADR-0001) |
| DecisÃµes            | `src/modules/Decisoes.tsx`                           |
| Biblioteca          | `src/modules/Biblioteca.tsx` (consome `docs_sync/`)  |
| Brand Guidelines    | `src/components/BrandGuidelines.tsx`                 |
| ReferÃªncias Design  | `src/modules/ReferenciasDesign.tsx`                  |
| Mock Vendas         | `src/modules/MockClearixEstilos.tsx`                 |
| Mapa OSI (Fluxo OSI) | `src/modules/FluxoOSI.tsx` â€” integra Academy+Funil+Marketing (espinha OSI â†’ Clearix), dado vivo dos 3 stores. Sidebar exibe como "Mapa OSI". |
| Marketplace         | `src/modules/Marketplace.tsx` â€” lÃª `academy.products` (preÃ§o canÃ´nico) + integra Hotmart/Kiwify. âš ï¸ esqueleto: API Hotmart ainda nÃ£o plugada. |
| Guia Operacional    | `src/modules/Guia.tsx` â€” guia operacional do painel |
| Travas Marketing    | `src/modules/TravasMarketing.tsx` â€” travas canÃ´nicas + `TravasBanner` plantado em Marketing/Funil/Academy |
| Ecossistemas (Painel) | `src/modules/Ecossistemas.tsx` â€” painel de status lendo `v_company_digital_assets` (ADR-0029) |

**Ecossistemas (links externos â€” ADR-0029, via `EcossistemaLink.tsx`):** Clearix Hub, Clearix Atlas, OSI, Polapetit, Nipo School, Pulso Control, Qual a Foto, Lumina. NÃ£o sÃ£o mÃ³dulos embutidos â€” cada um tem banco/auth/deploy prÃ³prios. HÃ¡ tambÃ©m o mÃ³dulo **Painel** (`Ecossistemas.tsx`) que consolida status/URLs dos apps lendo o banco.

**Rota pÃºblica (sem login):** `/osi/depoimento` â†’ `src/components/TestimonialPublicForm.tsx` (coleta de depoimentos do funil OSI).

**Edge functions (`supabase/functions/`):** `hotmart-webhook` (ingest Hotmart, HOTTOK fail-closed), `marketing-sync-gsc|bing|cloudflare`, `health` (R-016 â€” deploy com `--no-verify-jwt`).

## 8. NÃƒO fazer (antipatterns especÃ­ficos deste app)

- **Acessar o banco Clearix** sem passar pelo gate super_admin do mÃ³dulo Central (viola [ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md) + R-009)
- Renomear / mover `docs_sync/` â€” Ã© fonte de dados runtime, **nÃ£o documentaÃ§Ã£o** (lido por `copySeedData.ts`, `academyStore.ts`, `Biblioteca.tsx`, mig 015)
- Adicionar dependÃªncia externa sem necessidade forte (SLA rigoroso ADR-0005 â€” cada dep externa adiciona ponto de falha)
- Hardcodar URLs de outros apps (usar `VITE_ATLAS_URL` e equivalentes)
- Esquecer R-013 e criar nova tabela de pessoa sem `digiai_user_uuid` + `wa_bsuid`
- Comentar em cÃ³digo o que o cÃ³digo Ã³bvio faz (CLAUDE.md Â§5 â€” sÃ³ comentÃ¡rio para *porquÃªs* nÃ£o Ã³bvios)
- Mudar verdades canÃ´nicas, decisÃµes registradas ou ADRs sem ADR formal
- Tratar este app como produto comercial (Ã© infraestrutura interna por Verdade CanÃ´nica)

## 9. Secrets

- **Onde:** sempre via `.env` na raiz do app â€” nunca hardcoded
- **VariÃ¡veis exigidas (mas opcionais para dev â€” modo fallback):**
  - `VITE_SUPABASE_URL` â€” `https://hswyopqvnolqpmprqvzh.supabase.co` (banco prÃ³prio digiai)
  - `VITE_SUPABASE_ANON_KEY` â€” anon public key do projeto digiai
- **VariÃ¡veis opcionais:**
  - `VITE_CLEARIX_SUPABASE_URL` â€” projeto Clearix (para mÃ³dulo Central Clearix â€” auth super_admin separado)
  - `VITE_CLEARIX_SUPABASE_ANON_KEY`
  - `VITE_ATLAS_URL` â€” default `https://digiaiatlas.netlify.app` (link no header)
- **Edge functions (secrets no Supabase Vault / Dashboard, NÃƒO em `.env`):** `HOTMART_HOTTOK` (webhook Hotmart), credenciais GSC/Bing/Cloudflare do Marketing & SEO. **R-021:** as 3 credenciais de Marketing & SEO foram cadastradas em 2026-05-28 â†’ **rotacionar atÃ© 2026-08-26**.
- **NUNCA commitar `.env*`** â€” `.gitignore` cobre `.env*` e `.mcp.json` (verificado).

## 10. PendÃªncias conhecidas (do Spec Â§13 + Â§8)

- [x] ~~Confirmar hospedagem~~ â€” **Netlify** (`sisdigiai.netlify.app`), confirmado 2026-05-28
- [x] ~~Migrar `iam.users` para R-013~~ â€” **feito 2026-05-28** (mig 025: USUUID + wa_bsuid/username/phone_legacy + campos LGPD)
- [x] ~~Deploy `health` (R-016)~~ â€” **feito 2026-05-28**, pÃºblico em `/functions/v1/health` (HTTP 200, checa DB)
- [x] ~~CSP em produÃ§Ã£o~~ â€” **validada 2026-05-28** (app + conexÃ£o Supabase OK sob a CSP)
- [x] ~~hotmart-webhook fail-closed~~ â€” **deployado 2026-05-28** (GET â†’ 405; ingest sÃ³ com HOTTOK vÃ¡lido)
- [ ] Monitor UptimeRobot no `/health` (keyword `"status":"ok"`)
- [x] ~~DPO nomeado~~ â€” **Gilberto** registrado em `legal_status` 2026-05-28 (`dpo@digiai.app.br`, rota dedicada no Cloudflare + catch-all). Falta sÃ³ publicar polÃ­tica/ToS (revisÃ£o jurÃ­dica humana).
- [x] ~~Snapshot financeiro mensal~~ â€” **gerado 2026-05-28**: 13 meses em `company.financial_snapshots` (2025-05â†’2026-05; investimento acumulado R$ 547.293,37).
- [ ] 1Âª entrevista feita (Fase 0 do Roadmap â€” mÃ©trica Ãºnica: 20 entrevistas + 3 cartas de intenÃ§Ã£o)
- [ ] Resolver **65 tarefas atrasadas** do Roadmap + 13 itens crÃ­ticos do Backlog
- [ ] Rotacionar 3 credenciais Marketing & SEO atÃ© 2026-08-26 (R-021)
- [ ] **Cloudflare Analytics do `clearix.app.br`** no Marketing & SEO: o token CF atual (`digiai-app-br-readonly`) Ã© escopado sÃ³ Ã  zona `digiai.app.br`. Ampliar o escopo (Analytics:Read incluindo a zona do clearix, ou token novo) e setar `cloudflare_zone_id` em `company.seo_sites` p/ o site clearix. GSC/Bing/Sitemap/IndexNow do clearix jÃ¡ funcionam.

## 11. Pergunta de Ouro pra qualquer decisÃ£o

> *"Isso fortalece a DIGIAI, o Clearix e a implantaÃ§Ã£o da empresa segundo a verdade canÃ´nica atual?"*

Se nÃ£o â†’ pause e questione. Em caso de dÃºvida ou ambiguidade, **pause e pergunte ao humano**. Este app Ã© o painel-mestre interno; erro aqui quebra a gestÃ£o central da empresa.

---

## Notas para quem mantÃ©m este arquivo

- **Ãšltima atualizaÃ§Ã£o:** 2026-05-28 (auditoria completa: 18 mÃ³dulos verificados no navegador logado, banco lido via Management API, drift reconciliado, fixes A/B/C/D aplicados)
- **VersÃ£o do template base:** v1.0 (espelhando `Templates/AGENTS.md`)
- **ValidaÃ§Ã£o em produÃ§Ã£o:** âš ï¸ A verificar (Spec foi verificada no navegador em 2026-05-22)
- **ReferÃªncias:** [Spec/digiai.md](../Cockpit/Spec/digiai.md), [CLAUDE.md](../CLAUDE.md), [ADR-0004](../Cockpit/ADR/ADR-0004-digiai-app-control-plane.md), [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md), [docs/README.md](docs/README.md)

