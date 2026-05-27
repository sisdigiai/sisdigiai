# Setup — Bing Webmaster API Key (módulo Marketing & SEO)

Doc de uso interno. Gera 1 API key que a edge function `marketing-sync-bing` usa pra ler dados do Bing Webmaster Tools.

## Pré-requisitos

- Conta Microsoft `sisdigiai@gmail.com` (mesma que verificou `digiai.app.br` no Bing Webmaster).
- Acesso ao Supabase project `hswyopqvnolqpmprqvzh`.

---

## Passo 1 — Gerar API key

1. Abrir <https://www.bing.com/webmasters>. Logar com `sisdigiai@gmail.com`.
2. Confirmar que a propriedade `digiai.app.br` aparece na lista.
3. Topo direito → ícone de engrenagem → **Settings** (ou direto em <https://www.bing.com/webmasters/settings/api-key>).
4. Aba **API access** → **Generate** (se ainda não houver) → copiar a chave gerada (string ~32 caracteres). **Guardar imediatamente** — Bing mostra a chave só uma vez no momento da geração.

## Passo 2 — Validar a key com curl

```sh
curl "https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=<API_KEY>"
```

Esperado: JSON com lista de sites onde a chave dá acesso (inclui `digiai.app.br`). Se voltar `401` ou `InvalidApiKey`, regenerar.

## Passo 3 — Cadastrar no banco (via SQL editor Supabase)

```sql
WITH s AS (
  SELECT vault.create_secret(
    '<API_KEY>',
    'bing_webmaster_api_key_sisdigiai',
    'API key Bing Webmaster — conta sisdigiai@gmail.com'
  ) AS id
)
INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, scope, notes)
SELECT 'bing_webmaster', 'api_key', s.id, 'sisdigiai-bing',
       'GetPageStats, GetQueryStats, GetCrawlStats, AI Performance (BETA)',
       'Gerada em https://www.bing.com/webmasters/settings/api-key — conta Microsoft sisdigiai@gmail.com'
FROM s;

-- Conferir
SELECT provider, credential_type, label, created_at
FROM company.api_credentials
WHERE provider = 'bing_webmaster' AND deleted_at IS NULL;
```

## Passo 4 — Testar edge function

No DIGIAI App → módulo **Marketing & SEO** → card **Bing Webmaster** → clicar **Sincronizar agora**. Espera-se `configured: true`.

## Notas

- **AI Performance (Bing Copilot)** está em **BETA**. Algumas contas não têm acesso ainda — a edge function trata o erro como soft-fail (card mostra "AI Performance indisponível na sua conta").
- API base: `https://ssl.bing.com/webmaster/api.svc/json/<Method>?apikey=<KEY>&siteUrl=https://digiai.app.br`.
- **Rotação a cada 90 dias** (R-021): gerar nova key no painel → `UPDATE company.api_credentials` com novo `vault_secret_id` → soft-delete a antiga via `deleted_at`.
- Endpoints úteis ([docs MS](https://learn.microsoft.com/en-us/bingwebmaster/)):
  - `GetUserSites` — lista de sites
  - `GetPageStats` — clicks, impressions por página
  - `GetQueryStats` — top queries
  - `GetCrawlStats` — saúde de crawl
  - `GetUrlInfo` — info detalhada de URL específica
  - `SubmitUrl` / `SubmitUrlBatch` — submeter URL pra indexação (já temos IndexNow ativo, mas isso é fallback)
