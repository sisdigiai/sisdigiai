# Roteamento documental operacional

Antes de qualquer alteracao neste app, leia tambem:

D:\projetos\Cockpit\Apps\digiai\README.md

O app/codigo/filesystem e a verdade factual. O Cockpit e a fonte documental operacional. Se divergirem, o app vence e o Cockpit deve ser atualizado no mesmo turno.

---

## Ordens ativas (handoffs — ler antes de mexer em Comercial/Marketing/Billing)

1. **Leads de prospeccao (Kimi/SP) — CRM ja populado, falta o MKT.** 5 oticas qualificadas ja inseridas em `ops.commercial_leads` (stage `lead`, source "Prospeccao IA (Kimi)..."), com dor + plano-alvo + mensagem de WhatsApp no `notes`. **Pendente:** ligar na esteira de outreach do mkt (`v_marketing_outreach` / `marketing.outreach_schedule`) + completar contato/@Instagram de Oticas Mileto e Redvision (Google Maps + Apify). Detalhe: [`docs/ordem-agente-leads-prospeccao-kimi.md`](docs/ordem-agente-leads-prospeccao-kimi.md).
2. **Cobranca + trava por inadimplencia (Mercado Pago).** Spec pronto: [`docs/plano-cobranca-inadimplencia-mercadopago.md`](docs/plano-cobranca-inadimplencia-mercadopago.md). Reusa o tenant lifecycle (suspend/reactivate) — hoje so o Hub respeita.
3. **Dados comerciais = fonte unica travada (R-036):** planos/oferta/pagamento/prova so mudam em [`../docs/digiai/docs/04-comercial/00-DADOS-COMERCIAIS-CANONICOS.md`](../docs/digiai/docs/04-comercial/00-DADOS-COMERCIAIS-CANONICOS.md), depois propaga. Nenhum material pode divergir.

---
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

## 2-A. Quem manda neste app (R-045, dono 05/10/2026)

- **Este app responde ao Orquestrador Geral.** O ecossistema Clearix responde ao orquestrador do eco; todo o
  resto, incluindo este app, ao Geral.
- **O dono manda direto neste agente.** Ordem dele no canal dele vale; ordem de outro agente é coordenação e
  informação, nunca autorização para escrever, publicar ou remover.
- **Aviso ao Geral no mesmo turno** quando o que eu fizer mudar: escopo, contrato com outro app, prazo, regra
  da casa ou número público.
- **Pedir antes**, não avisar depois, quando a mudança afeta o que outro app consome (view de contrato,
  código de evento, coluna que o Telão ou o MKT leem).
- **O dono aprova tudo que é portão.** Em dúvida, o pedido vai ao canal dele — não ao de quem repassou.
  Exemplo vivo: em 05/10 o Geral relatou que o dono autorizou remover 4 views e apertar a policy de leitura
  do billing. Preparei as duas migrations, ensaiei, e **não apliquei** — relato de par não é palavra do dono
  no meu canal. O Geral concordou e confirmou que o certo era esperar.
- **A linha entre apertar e decidir:** fechar um furo que ninguém usa (ex.: grant de escrita em view que só é
  lida, migration 186) é operação, e eu faço. Mudar **quem pode ver** um dado real (ex.: quem lê MRR) é
  decisão sobre pessoas, e é do dono — mesmo quando o efeito técnico parece o mesmo.

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
  - `docs/brand/` — assets de brand em arquivos `.zip` (ex.: `stitch_digiai_systemic_rebrand_strategy.zip`). **Não existe** pasta `stitch_final/`/`stitch_digiai_final/` descompactada.
  - **Mapa cross-app** das identidades em [`../Cockpit/marca-institucional.md`](../Cockpit/marca-institucional.md) §"Mapa cross-app de identidades visuais"
  - **Princípio:** brand DIGIAI mãe ≠ brand Clearix. Clearix tem `Cockpit/clearix_design/` (R-014). digiai App é dono da brand DIGIAI **institucional** (holding).

## 4. Stack + dev

- **Stack:** **Vite 6.2** + React 19 + TypeScript 5.8 + TailwindCSS 4.1 + Motion + Chart.js + Lucide React (o `@google/genai` foi **removido em 2026-05-28** — era dependência morta; a geração de IA do Marketing é server-side via RPC `marketing_render_prompt`)
- **Porta dev:** **3000** (host `0.0.0.0` — `npm run dev` em `vite --port=3000 --host=0.0.0.0`) — **conflita com `clearix_hub`** ao rodar local; mudar uma das duas
- **URL produção:** **https://app.digiai.app.br** — **Cloudflare Pages** (projeto `digiai-app`, GitHub-linkado ao repo `sisdigiai/sisdigiai`, build `npm run build` → `dist`). Migração concluída em 2026-07-30 ([ADR-0028]); reconfirmado no ar em 2026-08-13. ⚠ **`sisdigiai.netlify.app` NÃO é mais produção**: segue online como rollback, congelado no commit `5c919f3` (30/07) e com todos os deploys do Git em "Skipped". Não use como referência — foi exatamente o que induziu um agente ao erro em 2026-08-13. O `digiaiatlas.netlify.app` é só link externo do grupo Ecossistemas (Atlas).
- **Como rodar:**
  ```bash
  npm install
  npm run dev      # http://localhost:3000 (host 0.0.0.0)
  npm run build    # build de produção (dist/)
  npm run preview  # serve build local
  npm run lint     # tsc --noEmit (typecheck — sem ESLint)
  npm run clean    # rm -rf dist
  ```
- **Hospedagem:** **Cloudflare Pages** — host canônico por R-025, migração feita em 2026-07-30. O `public/_headers` (HSTS + X-Frame-Options + CSP) é consumido pelo Pages. ⚠ Antes de desligar o Netlify de vez: migrar o keep-alive `netlify/functions/supabase-keepalive.mjs` (seg+qui) para um Worker com cron trigger — o Pages não executa scheduled functions.
- **Repositório:** `https://github.com/sisdigiai/sisdigiai.git`
- **Modo offline/fallback:** ✅ funciona sem `.env` — dev local sem chaves usa `localStorage`

## 5. Banco + permissões

- **Projeto Supabase próprio:** `hswyopqvnolqpmprqvzh.supabase.co` (banco DIGIAI **isolado** do Clearix por [ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md))
- **MCP Supabase tem acesso direto?** ❌ Não — o MCP do workspace só enxerga o Clearix `mhgbuplnxtfgipbemchb` (R-012). Para operar o banco digiai há **dois caminhos**: (a) SDK no app via `VITE_SUPABASE_*`; (b) **Management API** com o `SUPABASE_TOKEN` (PAT) do `.env` — permite SQL/migrations diretas (`POST https://api.supabase.com/v1/projects/hswyopqvnolqpmprqvzh/database/query`).
- **Schemas locais (verificados no banco 2026-05-28):**
  - `company.*` — identity, partners, contacts, digital_assets, tools, financial_snapshots, legal_status, api_credentials, metrics
  - `finance.*` — products, vendors, expenses, subscriptions, infra_costs, revenue, founder_time
  - `iam.*` — users (+ R-013: digiai_user_uuid/wa_bsuid/wa_username/wa_phone_legacy desde mig 025) e audit_logs
  - `ops.*` — backlog_items, decisions, milestones, **roadmap_phases**, **roadmap_tasks**, copy_assets — o Roadmap mora em `ops`, **não** num schema `roadmap`
  - `academy.*` (mig 015) — products + assets/checklist/questions/scenarios/creation_records
  - `marketing.*` — **16 tabelas** (content_pillars/ideas/calendar, affiliates/materials/payouts, community, challenges, testimonials, hotmart_events_raw/sales, platforms, ai_prompt_templates, post_ai_outputs)
- **Migrations:** `001`–`025` em `supabase/migrations/` + **SQL solto** que cria o schema Marketing. ⚠️ o ledger remoto (`schema_migrations`) diverge das numeradas — ler [`supabase/migrations/README.md`](supabase/migrations/README.md) antes de qualquer rebuild. **RLS habilitado em todas as tabelas** (`api_credentials` é service_role-only, sem policy — proposital).
- **Auth:** Supabase Auth — gate "Acesso restrito" na entrada
- **Central Clearix (módulo interno):** **única exceção ao isolamento** — usa `VITE_CLEARIX_SUPABASE_URL` + auth super_admin **separada** do login DigiAI normal (gate explícito no UI). Usuário comum digiai **NUNCA** vê o banco Clearix.

### 5.1 Checklist de view INVOKER — escrito depois de eu partir uma tela de outro app

Aprendido em 09/09/2026 (migrations 106/107/108). Vale para **toda** view com
`security_invoker = true` neste banco.

1. **Toda tabela que a view toca precisa do GRANT no CHAMADOR**, não no dono.
   Numa view invoker o `authenticated` é quem lê — e pela 098 nada nasce
   concedido. Acrescentar uma coluna que faz join com uma tabela nova sem
   conceder essa tabela mata a consulta inteira com **42501**.

2. **O Postgres PODA subquery escalar cuja coluna ninguém pede** — e é por isso
   que o defeito não aparece na hora. `select id, company` não referencia a
   tabela do join no plano; `select *` traz o SubPlan e morre. Confirma com
   `explain (costs off)` nas duas formas.
   Consequência prática: **a avaria só surge quando alguém começa a usar a
   coluna nova** — noutro app, dias depois, com a aparência de ter sido a
   mudança dele que partiu.

3. **Trava de migration corre como `postgres`, e postgres lê tudo.** Contar
   colunas em `information_schema` e conferir valores não prova permissão
   nenhuma. A verificação tem de:
   - fazer `set local role authenticated`, **e**
   - **pedir as colunas novas** (`count(*)` não serve — é podado na mesma).

4. **`set role` prova GRANT, não RLS.** Para RLS continua a ser preciso chamada
   real com JWT do papel. As duas coisas falham de formas diferentes e nenhuma
   substitui a outra.

5. **Não fugir do grant com uma view definer que já exista.** Foi a tentação
   aqui (`v_vendas_motivos`): funcionaria hoje e falharia em silêncio depois,
   porque ela filtra `where ativo` e um motivo aposentado passaria a devolver
   NULO. Grant explícito numa lista de domínio sem PII é a resposta certa.

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

Roteamento real em `App.tsx` (`activeModule` por estado, não por URL). **~22 módulos roteados; só `Comercial` é stub** (reconciliado no código 2026-06-02):

| Sidebar label       | Componente / Origem                                  |
|---------------------|------------------------------------------------------|
| Visão               | `src/modules/Visao.tsx`                              |
| Portfólio           | `src/modules/Portfolio.tsx` (subtítulo auto-conta `PRODUTOS.length`) |
| Roadmap             | `src/modules/Trilha.tsx` (+ `RoadmapCalendar` + `RoadmapHistorico`) |
| Lista Mestra        | `src/modules/ListaMestra.tsx` — visão unificada filtrável de Backlog + Roadmap (119 itens) |
| Backlog Executivo   | `src/modules/Backlog.tsx`                            |
| Cadastro Empresa    | `src/modules/CadastroEmpresa.tsx`                    |
| Financeiro          | `src/modules/Financeiro.tsx` (toggle "Ocultar aporte intelectual") |
| Comercial           | **STUB** — objeto `STUBS` em `App.tsx` → `ModuleStub` (sem arquivo) |
| Academy             | `src/modules/Academy.tsx`                            |
| Funil OSI           | `src/modules/Funil.tsx` (+ `funnel/*`)               |
| Marketing           | `src/modules/Marketing.tsx` (+ `marketing/*`) — 10 abas: Calendário, Planejador, Banco de Ideias, Prompts IA, Validação, Depoimentos, Comunidade OSI, Desafios, Materiais, Afiliados |
| Marketing & SEO     | `src/modules/MarketingSEO.tsx` — **centro de controle multi-domínio (abas por site)**. GSC/Bing/Cloudflare/IndexNow por domínio, lendo `company.seo_sites` (registro data-driven; add domínio = 1 INSERT). Métricas em `company.metrics` keyed por `(site, source)`. Edge fns `marketing-sync-*` iteram todos os sites ativos (cron) ou `{site}` específico (botão). |
| Central Clearix     | `src/modules/Clearix.tsx` + `clearix/*` — auth super_admin **separado** (ADR-0001) |
| Decisões            | `src/modules/Decisoes.tsx`                           |
| Biblioteca          | `src/modules/Biblioteca.tsx` (consome `docs_sync/`)  |
| Brand Guidelines    | `src/components/BrandGuidelines.tsx`                 |
| Referências Design  | `src/modules/ReferenciasDesign.tsx`                  |
| Mock Vendas         | `src/modules/MockClearixEstilos.tsx`                 |
| Mapa OSI (Fluxo OSI) | `src/modules/FluxoOSI.tsx` — integra Academy+Funil+Marketing (espinha OSI → Clearix), dado vivo dos 3 stores. Sidebar exibe como "Mapa OSI". |
| Marketplace         | `src/modules/Marketplace.tsx` — lê `academy.products` (preço canônico) + integra Hotmart/Kiwify. ⚠️ esqueleto: API Hotmart ainda não plugada. |
| Guia Operacional    | `src/modules/Guia.tsx` — guia operacional do painel |
| Travas Marketing    | `src/modules/TravasMarketing.tsx` — travas canônicas + `TravasBanner` plantado em Marketing/Funil/Academy |
| Ecossistemas (Painel) | `src/modules/Ecossistemas.tsx` — painel de status lendo `v_company_digital_assets` (ADR-0029) |

**Ecossistemas (links externos — ADR-0029, via `EcossistemaLink.tsx`):** Clearix Hub, Clearix Atlas, OSI, Polapetit, Nipo School, Pulso Control, Qual a Foto, Lumina. Não são módulos embutidos — cada um tem banco/auth/deploy próprios. Há também o módulo **Painel** (`Ecossistemas.tsx`) que consolida status/URLs dos apps lendo o banco.

**Rota pública (sem login):** `/osi/depoimento` → `src/components/TestimonialPublicForm.tsx` (coleta de depoimentos do funil OSI).

**Edge functions (`supabase/functions/`):** `hotmart-webhook` (ingest Hotmart, HOTTOK fail-closed), `marketing-sync-gsc|bing|cloudflare`, `health` (R-016 — deploy com `--no-verify-jwt`).

## 8. NÃO fazer (antipatterns específicos deste app)

- **Acessar o banco Clearix** sem passar pelo gate super_admin do módulo Central (viola [ADR-0001](../Cockpit/ADR/ADR-0001-clearix-db-isolamento.md) + R-009)
- Renomear / mover `docs_sync/` — é fonte de dados runtime, **não documentação** (lido por `copySeedData.ts`, `academyStore.ts`, `Biblioteca.tsx`, mig 015)
- Adicionar dependência externa sem necessidade forte (SLA rigoroso ADR-0005 — cada dep externa adiciona ponto de falha)
- Hardcodar URLs de outros apps (usar `VITE_ATLAS_URL` e equivalentes)
- Esquecer R-013 e criar nova tabela de pessoa sem `digiai_user_uuid` + `wa_bsuid`
- Comentar em código o que o código óbvio faz (CLAUDE.md §5 — só comentário para *porquês* não óbvios)
- Mudar verdades canônicas, decisões registradas ou ADRs sem ADR formal
- Tratar este app como produto comercial (é infraestrutura interna por Verdade Canônica)

## 9. Variáveis (R-042)

> Levantado do código em 23/09/2026: `import.meta.env.*` no `src/` (build) e `Deno.env.get()` nas 22 edge functions.
> **Quem digita segredo é o dono** (R-042 §6); o agente só prepara o nome e o lugar. `.env*` nunca vai ao git.

### 9.1 Públicas de build (vão ao navegador — nunca um segredo aqui)

Ficam no `.env` local e no painel da Cloudflare Pages (projeto `digiai-app`). Todas são endereço ou **anon key**, que é pública por desenho.

| Nome | Para quê | Sem ela |
|---|---|---|
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` | banco próprio do digiai (`hswyopqvnolqpmprqvzh`) | app cai no modo offline, sem login |
| `VITE_CLEARIX_SUPABASE_URL` · `VITE_CLEARIX_SUPABASE_ANON_KEY` | Central Clearix (login próprio do Clearix, ADR-0001) | a aba mostra o aviso de configuração |
| `VITE_NEXUS_SUPABASE_URL` · `VITE_NEXUS_SUPABASE_ANON_KEY` | leitura do onboarding OSI no Nexus | o bloco do Nexus fica vazio |
| `VITE_PULSO_SUPABASE_URL` · `VITE_PULSO_SUPABASE_ANON_KEY` | espelho do Pulso (séries por dia) | "espelho desligado" no console e card vazio |
| `VITE_LIMELIGHT_SUPABASE_URL` · `VITE_LIMELIGHT_SUPABASE_ANON_KEY` | espelho do Limelight | idem |
| `VITE_BLOGS_SUPABASE_URL` · `VITE_BLOGS_SUPABASE_ANON_KEY` | espelho dos blogs (Ecoax) | idem |

### 9.2 Segredos de execução (só no servidor — secrets do projeto Supabase, nunca no `.env` do front)

Lidos por edge function deste repo. **Nenhum tem prefixo `VITE_`** — se algum ganhar, vai ao navegador de qualquer visitante.

| Nome | Quem usa | Para quê |
|---|---|---|
| `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_ANON_KEY` | todas | a função fala com o próprio banco (o service role passa por cima da RLS) |
| `HOTMART_HOTTOK` | `hotmart-webhook` | prova que o webhook é da Hotmart |
| `KIWIFY_WEBHOOK_TOKEN` | `kiwify-webhook` | idem, Kiwify |
| `MP_ACCESS_TOKEN` · `MP_WEBHOOK_SECRET` | `mercadopago-webhook`, `mp-sync` | cobrança Mercado Pago |
| `ESPELHO_SECRET` · `PULSO_URL` · `PULSO_ESPELHO_ROTA` | `espelho-pulso` | lê o espelho do Pulso pela rota dele (a chave-mestra do Pulso **não** mora aqui — portão 38) |
| `PULSO_ANON_KEY` | `verificar-fatos` | confere fato publicável contra o Pulso |
| `ESPELHO_DIGIAI_TOKEN` | `sync-aporte-digiai` | espelho do custo de infra vindo do Finance |
| `ESPELHO_TELAO_TOKEN` | `sync-telao-bi` | espelho do telão |
| `CONTENT_RULES_LIMELIGHT_SECRET` · `CONTENT_RULES_LIMELIGHT_BRANDS` | `espelho-content-rules` | travas de conteúdo servidas ao Limelight |
| `GJ_URL` · `GJ_SERVICE_ROLE_KEY` · `GJ_USER_ID` | `push-ordem-gj` | empurra a ordem para o app GJ (banco próprio dele) |
| `ROADMAP_GJ_SECRET` | `roadmap-gj` | portão do roadmap do GJ |
| `ESTADO_INGEST_SECRET` | `estado-ingest` | só o runner local do Cockpit entra (passo 4 do estado automático) |

O segredo do cron das coletas (`marketing_sync_cron_secret`) e a `supabase_anon_key` usada pelo pg_cron moram no **vault do banco**, não nos secrets da função — quem dispara é o banco (`run_marketing_sync_daily`, `run_sinais_deploy`).

### 9.3 A conferir no painel (auditoria do R-042 §4, aberta)

- O `.env` **local** ainda guarda `MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_PUBLIC_KEY`, `TELEGRAM_BOT_TOKEN`, `GITHUB_TOKEN_1` e `SUPABASE_TOKEN` (PAT da conta). Nenhum é lido pelo build; os do Mercado Pago já vivem nos secrets do projeto. **Ficam à espera da palavra do dono** para sair do arquivo — e a rotação vem depois da limpeza, nunca antes.
- O projeto Supabase é **compartilhado com o digiai_mkt**: secrets como `META_TOKEN*`, `TIKTOK_*`, `LINKEDIN_*`, `YOUTUBE_*`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `FAL_KEY`, `CLICKUP_TOKEN` e `WA_WEBHOOK_SECRET` são das funções do MKT, não deste app.
- Falta conferir a lista do painel da **Cloudflare Pages** contra a tabela 9.1 (só o dono enxerga o painel).

## 10. Pendências conhecidas (do Spec §13 + §8)

- [x] ~~Confirmar hospedagem~~ — **Cloudflare Pages** + domínio `app.digiai.app.br` (ADR-0028), migrado 2026-07-30 e reconfirmado no ar em 2026-08-13. Netlify permanece como rollback congelado.
- [x] ~~Migrar `iam.users` para R-013~~ — **feito 2026-05-28** (mig 025: USUUID + wa_bsuid/username/phone_legacy + campos LGPD)
- [x] ~~Deploy `health` (R-016)~~ — **feito 2026-05-28**, público em `/functions/v1/health` (HTTP 200, checa DB)
- [x] ~~CSP em produção~~ — **validada 2026-05-28** (app + conexão Supabase OK sob a CSP)
- [x] ~~hotmart-webhook fail-closed~~ — **deployado 2026-05-28** (GET → 405; ingest só com HOTTOK válido)
- [ ] Monitor UptimeRobot no `/health` (keyword `"status":"ok"`)
- [x] ~~DPO nomeado~~ — **Gilberto** registrado em `legal_status` 2026-05-28 (`dpo@digiai.app.br`, rota dedicada no Cloudflare + catch-all). Falta só publicar política/ToS (revisão jurídica humana).
- [x] ~~Snapshot financeiro mensal~~ — **gerado 2026-05-28**: 13 meses em `company.financial_snapshots` (2025-05→2026-05; investimento acumulado R$ 547.293,37).
- [ ] 1ª entrevista feita (Fase 0 do Roadmap — métrica única: 20 entrevistas + 3 cartas de intenção)
- [ ] Resolver **65 tarefas atrasadas** do Roadmap + 13 itens críticos do Backlog
- [ ] Rotacionar 3 credenciais Marketing & SEO até 2026-08-26 (R-021)
- [ ] **Cloudflare Analytics do `clearix.app.br`** no Marketing & SEO: o token CF atual (`digiai-app-br-readonly`) é escopado só à zona `digiai.app.br`. Ampliar o escopo (Analytics:Read incluindo a zona do clearix, ou token novo) e setar `cloudflare_zone_id` em `company.seo_sites` p/ o site clearix. GSC/Bing/Sitemap/IndexNow do clearix já funcionam.

## 11. Pergunta de Ouro pra qualquer decisão

> *"Isso fortalece a DIGIAI, o Clearix e a implantação da empresa segundo a verdade canônica atual?"*

Se não → pause e questione. Em caso de dúvida ou ambiguidade, **pause e pergunte ao humano**. Este app é o painel-mestre interno; erro aqui quebra a gestão central da empresa.

---

## Notas para quem mantém este arquivo

- **Última atualização:** 2026-05-28 (auditoria completa: 18 módulos verificados no navegador logado, banco lido via Management API, drift reconciliado, fixes A/B/C/D aplicados)
- **Versão do template base:** v1.0 (espelhando `Templates/AGENTS.md`)
- **Validação em produção:** ⚠️ A verificar (Spec foi verificada no navegador em 2026-05-22)
- **Referências:** [Spec/digiai.md](../Cockpit/Spec/digiai.md), [CLAUDE.md](../CLAUDE.md), [ADR-0004](../Cockpit/ADR/ADR-0004-digiai-app-control-plane.md), [ADR-0005](../Cockpit/ADR/ADR-0005-digiai-app-sla-rigoroso.md), [docs/README.md](docs/README.md)

