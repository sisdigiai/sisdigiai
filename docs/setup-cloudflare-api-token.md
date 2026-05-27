# Setup — Cloudflare API Token (módulo Marketing & SEO)

Doc de uso interno. Gera 1 API token com escopo restrito que a edge function `marketing-sync-cloudflare` usa pra ler analytics da zona `digiai.app.br`.

## Pré-requisitos

- Conta Cloudflare `Sisdigiai@gmail.com's Account` (account_id `135d7fae19fe4fac099b241fec40fba1`).
- Zona `digiai.app.br` ativa (zone_id `b449527cc352374d312fe8ebd2937060`).
- Acesso ao Supabase project `hswyopqvnolqpmprqvzh`.

---

## Passo 1 — Gerar token

1. Abrir <https://dash.cloudflare.com/profile/api-tokens>.
2. **Create Token** → escolher **Create Custom Token** (não usar template).
3. Token name: `digiai-marketing-readonly`.
4. **Permissions** (adicionar 3 linhas):
   - `Account` · `Account Analytics` · `Read`
   - `Zone` · `Zone Analytics` · `Read`
   - `Zone` · `Zone` · `Read`
5. **Account Resources**: Include → Specific account → `Sisdigiai@gmail.com's Account`.
6. **Zone Resources**: Include → Specific zone → `digiai.app.br`.
7. **Client IP Address Filtering** (opcional): deixar em branco — edge function Supabase tem IP dinâmico.
8. **TTL** (opcional): deixar em branco (sem expiração automática — rotação é manual via R-021).
9. **Continue to summary** → **Create Token**.
10. **Copiar o token imediatamente** — Cloudflare mostra só uma vez.

## Passo 2 — Validar com curl

```sh
curl -H "Authorization: Bearer <TOKEN>" \
     "https://api.cloudflare.com/client/v4/user/tokens/verify"
```

Esperado: `{"result": {"status": "active"}, "success": true, ...}`.

Teste extra (analytics da zona):

```sh
curl -H "Authorization: Bearer <TOKEN>" \
     "https://api.cloudflare.com/client/v4/zones/b449527cc352374d312fe8ebd2937060/analytics/dashboard?since=-10080"
```

Esperado: JSON com totals/timeseries (ou estrutura vazia se site tem volume baixo — ok, vamos ver crescer).

## Passo 3 — Cadastrar no banco (via SQL editor Supabase)

```sql
WITH s AS (
  SELECT vault.create_secret(
    '<TOKEN>',
    'cloudflare_api_token_digiai_marketing',
    'API token Cloudflare — scopes: Account Analytics:Read, Zone Analytics:Read, Zone:Read. Restrito a zona digiai.app.br.'
  ) AS id
)
INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, scope, notes)
SELECT 'cloudflare', 'api_token', s.id, 'digiai-app-br-readonly',
       'Account.Analytics:Read, Zone.Analytics:Read, Zone:Read',
       'Token "digiai-marketing-readonly" na conta Sisdigiai@gmail.com. zone_id b449527cc352374d312fe8ebd2937060.'
FROM s;

-- Conferir
SELECT provider, credential_type, label, created_at
FROM company.api_credentials
WHERE provider = 'cloudflare' AND deleted_at IS NULL;
```

## Passo 4 — Testar edge function

No DIGIAI App → módulo **Marketing & SEO** → card **Cloudflare** → **Sincronizar agora**. Espera-se `configured: true`.

## Notas

- Free plan do Cloudflare tem **latência de ~1h** nos dados de Analytics (e o site só está no ar desde 2026-05-26) — cards podem mostrar "sem dados ainda" inicialmente. Esperado.
- Token está **restrito à zona digiai.app.br** — se comprometido, atacante só lê analytics dessa zona, não muda DNS nem toca outras zonas.
- **GraphQL Analytics** (mais granular) é endpoint separado: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/graphql`. Mesmo token funciona se tiver os scopes corretos.
- **Rotação a cada 90 dias** (R-021): gerar novo token → `UPDATE company.api_credentials` com novo `vault_secret_id` → soft-delete o antigo → revogar o antigo no painel Cloudflare.
