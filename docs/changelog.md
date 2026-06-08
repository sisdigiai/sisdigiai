# Changelog — digiai

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), simplificado.

## [Não lançado]

### Corrigido
- **Varredura módulo-a-módulo + polish** (2026-06-08) — auditoria técnica completa (agente consultor-tecnico) + verificação no navegador (R-005) de Marketplace/Mapa OSI/Visão/Comercial (todos saudáveis lendo dados reais). Correções aplicadas: (1) `academyStore` preço fallback **47,90 → 48,50** (eliminava auto-contradição "divergência de preço" no Marketplace/Mapa OSI; banco confirmado 48,50); (2) `academyStore.ensureRemoteProduct` `.single()` → `.maybeSingle()` (robustez); (3) `funnelStore` 3 ocorrências 47,90 → 48,50; (4) `Biblioteca` "Plano Clearix Academy" → **DIGIAI Academy** (ADR-0037); (5) `Portfolio` status "16 módulos + 2 stubs" → **24 módulos · 0 stubs** + data; (6) `Visão` removido card "1ª entrevista feita" hardcoded-falso (sem fonte real; tracking vive no Roadmap). **Itens médios:** `BrandGuidelines` botão de download fake (`alert`) → `<a download>` do logo SVG real; **Sidebar URLs do ecossistema agora vêm de `company.digital_assets`** (novo `useEcosystemUrls`, fallback nas constantes) — corrigiu 2 URLs driftadas (Lumina `lumina`→`luminabox`, Easy `easyidiomas`→`easyidioma`). Não-problemas confirmados: views `v_marketing_hotmart_stats`/`v_marketing_geo_funnel` existem e funcionam.
- **Gaps de dado do app** (2026-06-06): (B2) Portfólio + `academyStore` default `Clearix Academy`/`clearix_academy` → **DIGIAI Academy/`digiai_academy`** (ADR-0037). (B1) **`finance.subscriptions` populado** — 12 assinaturas ativas derivadas de `finance.expenses` (kind=subscription, último mês ≥ 2026-04): Anthropic, Supabase, Google/Google Cloud, Canva+Microsoft (polapetit), Higgsfield, ElevenLabs, Z-API, Netlify, Pagar.me, EBANX (~R$ 1.336/mês). Antes a aba Subscriptions estava vazia (0).
- **Marca "Ótica Sem Achismo" no checkout Kiwify** (2026-06-06) — o produto OSI no Kiwify tinha o nome antigo errado ("Achismo") visível no checkout. Re-salvar o produto + checkout propagou o nome correto **"Ótica Sem Improviso"** ao cabeçalho e título da página renderizada (verificado na página ao vivo). Resíduo "Achismo" restante existe só num campo de config interno **não renderizado** (invisível ao cliente) — limpeza opcional via suporte Kiwify.
- **Módulo Marketplace estava inacessível** (2026-06-06) — `'marketplace'` faltava no array `MODULES` (validação de rota em `App.tsx`). Clicar no item bouncava de volta pra Visão (o listener de `hashchange` chamava `moduleFromHash()`, que não reconhecia a rota e caía no default `visao`). Import, `case`, sidebar e labels já existiam; só faltava o id na whitelist. Fix: adicionado `'marketplace'` a `MODULES`.

### Adicionado
- **Kiwify (marketplace secundário OSI) configurado completo** (2026-06-06):
  - Programa de afiliados ON: comissão **52%** (afiliado ~R$ 21,66, paridade c/ Hotmart R$ 21,78), aprovação manual, estratégia de vendas. E-mail de suporte de afiliados corrigido `oticastatymello@gmail.com` → **`vendas@digiai.app.br`**.
  - **Pixels no checkout Kiwify**: Meta `1010582578011237` + TikTok `D8HQ7JJC77U8POE06IQG` (mesmos IDs da landing).
  - Pagamento: Cartão+Boleto+Pix, até 5x, 2 cartões, Apple Pay. Produto Ativo R$ 48,50, reconciliado c/ Hotmart e doc.
  - `company.digital_assets` (linha "Conta Kiwify") atualizado com toda a config.
  - **Entrega (webhook Kiwify→Nexus) pendente** — registrada como tarefa; caminho financeiro crítico, fazer com calma. Pré-requisito: `HOTMART_HOTTOK` (canal primário) ainda não setado → o `hotmart-webhook` é fail-closed e hoje **não processa** vendas reais (grava raw, não provisiona Nexus/e-mail).
- **Funil de conversão first-party no painel** (2026-06-06) — fecha o loop tráfego→conversão sem depender das APIs de Meta/TikTok nem da conta de anúncios restrita:
  - Migration `034_analytics_funnel_views.sql`: RLS staff-read em `analytics.events_log` + views públicas `v_analytics_funnel_summary` (7d/30d/total por evento) e `v_analytics_funnel_daily` (90d). A ingestão já existia (`fn_log_event`, migration 032).
  - Edge function **`events-ingest`** (`verify_jwt=false`): a landing OSI POSTa eventos (keyless) → `fn_log_event` via service_role → `analytics.events_log`. Só aceita os 3 eventos client-side (`landing_visit`/`click_checkout`/`checkout_started`); `purchase_approved`/`first_login_nexus` seguem server-side (anti-spoof). R-013: só `session_id` anônimo + UTM + user_agent, **zero PII**.
  - Landing `tracker.ts` (repo `otica_sem_improviso`): `trackEvent` agora **também** envia ao `events-ingest` via `sendBeacon`/fetch keepalive — captura o funil **completo, inclusive de quem tem ad blocker** (nosso endpoint não é alvo de bloqueador, ≠ pixels).
  - **Mapa OSI** ganhou o card **"Funil de conversão · first-party"**: visitas/cliques/checkout/compra (7d/30d) + taxa de conversão 7d, lendo `v_analytics_funnel_summary`.
  - **Verificado end-to-end em produção**: a landing deployada disparou um `landing_visit` real (session anônima) → `events_log` → card no painel.
- **Pixels TikTok + Meta da landing OSI no ar** (2026-06-06): ambos ativados via `netlify.toml` do repo `otica_sem_improviso` (IDs públicos/client-side) e verificados disparando em produção.
  - **TikTok**: criado Ads Account (conta `Digiai Academy_adv`, aadvid `7648134658340765716`) → Events Manager > Web > Manual > pixel "OSI - Ótica Sem Improviso" (ID `D8HQ7JJC77U8POE06IQG`) → `VITE_TIKTOK_PIXEL_ID`.
  - **Meta**: dataset/pixel "OSI Landing" (ID `1010582578011237`, Business `Digiai` 1330524481742986) **já existia** — instalado via `VITE_META_PIXEL_ID`. Coleta de eventos **independe** da conta de anúncios (`act 635388131903898`) que segue RESTRITA; só *rodar anúncios* depende dela.
  - Ambos catalogados em `company.digital_assets` (categoria `outro`, owner `osi`). Item Pixel do Mapa OSI → `done`.
- **Programa de afiliados OSI ponta-a-ponta + Central de Materiais** (2026-06-06):
  - Edge function `affiliate-materials-public` (Deno, `verify_jwt=false`) deployada em `hswyopqvnolqpmprqvzh`: GET serve `v_marketing_affiliate_materials` ativos; POST `{action:'download',id}` incrementa `downloads_count`. Usa service_role internamente (auto-injetado) — a landing OSI não carrega chave Supabase.
  - 10 materiais ativos em `marketing.affiliate_materials`: **3 reels AI** (voz da Taty clonada no ElevenLabs + avatar falante lip-sync), 4 imagens (carrossel 5 Movimentos, banner quadrado, banner story 9:16, card autoridade), 3 textos (e-mail, WhatsApp, legenda). `art_urls`/`preview_url` apontam pros estáticos servidos pela landing (`landingoticasemimproviso.netlify.app/materiais-afiliado/...`) — **sem Storage/service_role, sem Google Drive**.
  - Marca corrigida e propagada: as 5 artes (avatar, capa hero, card autoridade, banner quadrado, banner story) refeitas com **avatar REAL da Taty + DIGIAI Academy / "Ótica Sem Improviso"** — substituindo o "Clearix Academy / Ótica Sem Achismo" que estava no ar (landing + capa Hotmart).
  - E-mail canônico de suporte ao afiliado: **vendas@digiai.app.br** (criado via Cloudflare Email Routing).
- **Módulo Mapa OSI (`FluxoOSI.tsx`) atualizado** pra refletir a realidade:
  - FASE 0 agora `5/7`: item novo **"Central de Materiais do afiliado no ar"** (lê `marketing.affiliate_materials` ao vivo — total, reels, com-arte) com link pra `/materiais-afiliado`.
  - Item **Pixel** atualizado: 🔴 bloqueado no Meta (conta de anúncios RESTRITA + Business não verificado, 2026-06-05) — Events Manager nega criar pixel; TikTok pode seguir sozinho; adiado por canon.
  - Item **Capa Hotmart** virou **"Marca DIGIAI + avatar real propagados"** (capa, card, landing, Hotmart) — re-verificado 2026-06-06.
  - Card Marketing ganhou métrica **"Materiais na Central"** (`marketingStore.listMaterials()`).
- **Marketing & SEO virou centro de controle multi-domínio (abas por site)** — migration `seo_multisite` + `seo_sites_view`:
  - Nova tabela `company.seo_sites` (registro data-driven: `gsc_property`, `bing_site_url`, `cloudflare_zone_id`, `indexnow_key`, `github_repo`, `label`, `color`, `active`, `sort_order`) + view `public.v_seo_sites`. Seed: `digiai.app.br` + `clearix.app.br`. Adicionar domínio = 1 INSERT (sem deploy).
  - `company.metrics` ganhou coluna `site` (backfill `digiai.app.br`); cache passa a ser por `(site, source)`. `fn_replace_metrics` ganhou overload `(p_source, p_site, p_rows)`. `v_company_metrics` expõe `site`.
  - As 3 edge functions (`marketing-sync-{gsc,bing,cloudflare}`) reescritas multi-site: `{site}` no body sincroniza 1 site; sem body (cron) itera todos os ativos — **cron `marketing-sync-daily` não mudou** e agora cobre todos os sites.
  - UI: `MarketingSEO.tsx` com abas por domínio (lê `v_seo_sites`); hook `useSeoSites` + `seoUrls`; `useMarketingMetrics(source, site)`; `triggerSync(provider, site)`; cards recebem prop `SeoSite` e computam URLs de console por site.
  - **Validação real**: clearix já tem GSC (6), Bing (3) e Sitemap (3) populados (mesma conta sisdigiai valida). Cloudflare do clearix fica em "configurar" (amarelo) — o token CF atual é escopado só à zona `digiai.app.br`; **pendência humana**: ampliar o escopo do token (Analytics:Read incluindo a zona do clearix) e setar `cloudflare_zone_id` em `company.seo_sites`.
  - Consoles SEO do clearix catalogados em `company.digital_assets` (GSC/Bing/IndexNow).
- **Módulo Marketing & SEO** — `src/modules/MarketingSEO.tsx` + 6 cards (`CardGSC`, `CardBing`, `CardCloudflare`, `CardSitemap`, `CardBacklinks`, `CardIndexNow` em `src/components/marketing-seo/`) + hook `src/hooks/useMarketingMetrics.ts`. Item novo no sidebar (`marketing-seo`, grupo Operacional, ícone `Search`). Placeholders amigáveis quando credenciais não estão configuradas.
- **Tabela `company.api_credentials`** (migration `019_marketing_seo_credentials_metrics.sql`) — ponteiros pra credenciais externas, com valor encriptado em `vault.secrets`. Acesso só `service_role`. Provider ∈ {`google_search_console`, `bing_webmaster`, `cloudflare`}.
- **Tabela `company.metrics`** — cache de métricas vindas de APIs externas (clicks, impressions, requests, etc.). Source ∈ {`gsc`, `bing`, `cloudflare`, `indexnow`, `sitemap`}. Leitura: staff. Escrita: service_role.
- **3 edge functions stub deployadas** em `hswyopqvnolqpmprqvzh`: `marketing-sync-gsc`, `marketing-sync-bing`, `marketing-sync-cloudflare`. Cada uma chama RPC `public.fn_marketing_credential_status(provider)` e responde 503 com mensagem amigável + link pra doc se credencial ainda não foi cadastrada. Lógica de sync real fica pra F5 (depende de credenciais reais fornecidas pelo dono).
- **View `public.v_company_metrics`** (migration `020_v_company_metrics.sql`) — espelho de `company.metrics` em schema público. Frontend lê via essa view (padrão da casa: schema `company` não exposto via PostgREST, só via views `v_company_*`).
- **RPC `public.fn_marketing_credential_status(text)`** (migration `021_fn_marketing_credential_status.sql`) — SECURITY DEFINER. Edge functions checam existência de credencial via RPC sem expor `company` schema. Retorna só campos seguros (id, label, last_sync_at, last_sync_status) — `vault_secret_id` permanece restrito.
- **Docs de setup** em `docs/setup-gsc-oauth.md`, `docs/setup-bing-api-key.md`, `docs/setup-cloudflare-api-token.md` com passo-a-passo pra gerar OAuth refresh token (Google), API key (Bing), API token (Cloudflare) e cadastrar em `company.api_credentials` via Supabase Vault.

- **Sync real implementado nas 3 edge functions** (deploy v3) — não são mais stubs:
  - `marketing-sync-gsc`: OAuth refresh_token → access_token → Google Search Console searchAnalytics (clicks/impressions/ctr/position 7d+30d, top queries, top pages). Suporta `action: "exchange_code"` pra trocar authorization code por refresh_token.
  - `marketing-sync-bing`: Bing Webmaster `GetQueryStats` (clicks/impressions/top queries) + `GetLinkCounts` (backlinks).
  - `marketing-sync-cloudflare`: GraphQL Analytics API (`httpRequests1dGroups`) → requests/bandwidth/threats 7d + SSL status.
- **Credenciais reais cadastradas** em `company.api_credentials` (via Supabase Vault): Bing API key, Cloudflare API token (escopo readonly em `digiai.app.br`), GSC OAuth (client_id + client_secret + refresh_token). Projeto Google Cloud `digiai-marketing` criado, Search Console API habilitada, OAuth client Desktop `digiai-marketing-cli`.
- **RPCs SECURITY DEFINER** (migrations 022/023/024): `fn_marketing_register_credential` (cadastro via staff), `fn_get_credential_secret` + `fn_set_credential_service` + `fn_mark_sync` (service_role, pra edge functions), `fn_replace_metrics` (substituição atômica de cache por source).
- **Primeira métrica real**: Cloudflare retornou 863 requests / 2.9 MB / 20 threats bloqueados nos últimos 7 dias de `digiai.app.br`. GSC e Bing ainda 0 (site recém-indexado).

### Mudado
- **Rebrand estrutural: academy elevada "Clearix Academy" → "DIGIAI Academy"** (2026-06-06, decisão do dono — **[ADR-0037](../../Cockpit/ADR/ADR-0037-academy-elevada-clearix-para-digiai-company-level.md)**) — escopo **B (elevação a nível company)**: a academy de low-ticket/lead-gen sobe de nível-produto (Clearix) para nível-company (DIGIAI mãe, product-agnostic); o funil deixa de ser exclusivo do Clearix → portfólio DIGIAI (Clearix segue âncora). `academy.products.line` → **`digiai_academy`**. Reconciliado: ADR-0037 criado+indexado, `estrategia-academy-como-lead-gen.md` reescrito, `README`/`plano-mestre-marketing` + `ops.backlog_items` atualizados, 5 docs `*clearix-academy*` flagueados. Rename+reescrita dos 5 docs detalhados = follow-up.
- **Reconciliação do Roadmap (tracking defasado → realidade)** (2026-06-06) — 13 tarefas marcadas `done` em `ops.roadmap_tasks` (nota de auditoria `reconciliado 2026-06-06`): landing v1, pixels (GA+Meta), 3 conteúdos/reels, e itens Academy (nome/promessa/domínio, peças visuais, capas, copy/checkout/entrega da página de vendas, PDF principal) + Kiwify configurada (checkout vivo verificado). Roadmap geral **17% → ~33%**; Fase 0 "Validação do Problema" **38% → 47%**. A infra está à frente da validação de mercado (gargalo real = entrevistas com óticas).
- **`tsconfig.json`** — adicionado `exclude` pra `supabase/functions`, `node_modules`, `dist` (edge functions rodam em Deno, não devem entrar no tsc do frontend).

### Removido
-

---

## [2026-05-22 — sessão tarde/noite]

### Mudado
- **Visão → Verdades Canônicas:** texto da 5ª verdade (prioridade ALTO) atualizado em `src/modules/Visao.tsx` de *"Lumina entra como upsell no momento comercial certo"* para *"Lumina já valida uso interno, próxima fase é monetização externa"* conforme [ADR-0021](../../Cockpit/ADR/ADR-0021-lumina-uso-interno-validado.md). Validado no navegador. Reflete a realidade verificada: Lumina em produção real na Lancaster Suzano desde 27/03/2026.

---

## [2026-05-22]

### Adicionado
- **Financeiro → Dashboard:** toggle "Ocultar aporte intelectual" na barra de filtros. Exclui despesas do vendor `aporte-fundador` (R$ 532k em 36 lançamentos valorados) de KPIs, gráfico mensal, Top Vendors e tabela. Combina com o filtro de projeto. Commit [`90781f4`](https://github.com/sisdigiai/sisdigiai/commit/90781f4) em `src/modules/Financeiro.tsx`.
- **Cadastro Empresa → Identidade Legal:** preenchimento via Supabase (`company.identity`) com dados do Contrato Social assinado em 21/05/2026 em Suzano-SP: razão social `DIGIAI ÓTICA E TECNOLOGIA LTDA`, LTDA, Microempresa LC 123/2006, capital R$ 50.000 (100% sócio Gilberto), endereço Rua General Francisco Glicério 940 - Jardim Guaio, CNAE principal `6202-3/00` (software customizável) + 5 secundários, regime Simples Nacional. CNPJ `12.549.582/0001-49` em transição na RFB.
- **Financeiro → finance.vendors:** 7 vendors novos criados (`google_cloud`, `canva`, `higgsfield`, `microsoft`, `yampa`, `ebanx`, `google_misc`).
- **Financeiro → finance.expenses:** 32 lançamentos novos reconciliados via extratos OFX (Nubank PJ + InfinitePay CloudWalk) cobrindo jan→mai/2026.

### Mudado
- **Financeiro → Anthropic abr/2026:** reconciliação completa contra extrato InfinitePay. Soft-deletada 1 entry manual de R$ 258 que arredondava cobranças travadas; inseridas 4 entries que faltavam (cobranças de 22/04 e 30/04 + IOFs). Total mensal agora fecha exato em R$ 2.129,93 batendo com extrato.

### Removido
- Nada removido nesta data.

## [Histórico]

- 2026-05-22 — Pasta `docs/` criada como parte da padronização do workspace DIGIAI.
