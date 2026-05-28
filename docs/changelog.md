# Changelog — digiai

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), simplificado.

## [Não lançado]

### Adicionado
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
