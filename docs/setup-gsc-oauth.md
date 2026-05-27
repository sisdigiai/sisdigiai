# Setup — Google Search Console OAuth (módulo Marketing & SEO)

Doc de uso interno. Cria 1 OAuth client + 1 refresh token de longa duração que a edge function `marketing-sync-gsc` usa pra ler dados do GSC.

## Pré-requisitos

- Conta Google `sisdigiai@gmail.com` (mesma que verificou a propriedade `digiai.app.br` no GSC).
- Acesso ao Supabase project `hswyopqvnolqpmprqvzh`.
- Browser de uso normal (Chrome perfil sisdigiai recomendado).

---

## Passo 1 — Criar projeto no Google Cloud Console

1. Abrir <https://console.cloud.google.com/>.
2. Topo da tela → seletor de projeto → **NEW PROJECT**.
3. Nome: `digiai-marketing`. Sem organização.
4. Aguardar criação (~10s).
5. Confirmar projeto selecionado no topo.

## Passo 2 — Habilitar Search Console API

1. Menu lateral → **APIs & Services** → **Library**.
2. Buscar `Search Console API`. Abrir o resultado.
3. Clicar **ENABLE**.

## Passo 3 — Configurar OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. User Type: **External**. Próximo.
3. App info:
   - App name: `DIGIAI Marketing Sync`
   - User support email: `sisdigiai@gmail.com`
   - Developer contact: `sisdigiai@gmail.com`
4. Próximo (Scopes) → **ADD OR REMOVE SCOPES** → buscar `webmasters.readonly` → marcar `.../auth/webmasters.readonly` → Update → Save and continue.
5. Test users → **ADD USERS** → adicionar `sisdigiai@gmail.com` → Save.
6. Voltar pro Dashboard. App fica em "Testing" — OK, refresh token de test users não expira em 7 dias se você adicionar o user à lista de testers (não publicar app).

## Passo 4 — Criar OAuth client ID

1. **APIs & Services** → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**.
2. Application type: **Desktop app**.
3. Name: `digiai-marketing-cli`.
4. **CREATE** → janela mostra `Client ID` e `Client secret`. **Copiar e guardar temporariamente** — vai colar no Supabase em seguida.

## Passo 5 — Gerar refresh token (uma vez só)

Use o OAuth Playground (caminho mais rápido sem rodar script local):

1. Abrir <https://developers.google.com/oauthplayground/>.
2. Engrenagem (canto superior direito) → marcar **Use your own OAuth credentials** → colar Client ID e Client secret do passo 4 → Close.
3. Coluna esquerda → seção **Step 1 Select & authorize APIs** → no campo de input colar manualmente: `https://www.googleapis.com/auth/webmasters.readonly`.
4. **Authorize APIs** → login `sisdigiai@gmail.com` → tela de aviso "App não verificado" → **Advanced** → **Go to DIGIAI Marketing Sync (unsafe)** → Allow → Allow.
5. De volta no Playground, **Step 2 → Exchange authorization code for tokens**.
6. Aparece JSON com `access_token` (curto, ignora) e `refresh_token` (longo, **este é o que guarda**). Copiar refresh_token.

## Passo 6 — Cadastrar no banco (via SQL editor Supabase)

1. Supabase Dashboard → SQL Editor.
2. Rodar (substituindo `<REFRESH_TOKEN>`, `<CLIENT_ID>`, `<CLIENT_SECRET>` pelos valores reais):

```sql
-- 1. Guardar refresh token no Vault
WITH s AS (
  SELECT vault.create_secret(
    '<REFRESH_TOKEN>',
    'gsc_refresh_token_sisdigiai',
    'OAuth refresh token GSC — sisdigiai@gmail.com, scope webmasters.readonly'
  ) AS id
)
INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, scope, notes)
SELECT 'google_search_console', 'oauth_refresh_token', s.id, 'sisdigiai-gmail',
       'https://www.googleapis.com/auth/webmasters.readonly',
       'OAuth client desktop "digiai-marketing-cli" do projeto google cloud "digiai-marketing"'
FROM s;

-- 2. Guardar client_id (visível, mas guarda junto pra edge function montar token request)
WITH s AS (
  SELECT vault.create_secret('<CLIENT_ID>', 'gsc_oauth_client_id_sisdigiai', 'OAuth client_id GSC') AS id
)
INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, notes)
SELECT 'google_search_console', 'oauth_client_secret', s.id, 'sisdigiai-client-id', 'pareado com gsc_refresh_token_sisdigiai'
FROM s;

-- 3. Guardar client_secret
WITH s AS (
  SELECT vault.create_secret('<CLIENT_SECRET>', 'gsc_oauth_client_secret_sisdigiai', 'OAuth client_secret GSC') AS id
)
INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, notes)
SELECT 'google_search_console', 'oauth_client_secret', s.id, 'sisdigiai-client-secret', 'pareado com gsc_refresh_token_sisdigiai'
FROM s;
```

3. Verificar:

```sql
SELECT provider, credential_type, label, created_at
FROM company.api_credentials
WHERE provider = 'google_search_console' AND deleted_at IS NULL;
```

## Passo 7 — Testar edge function

No DIGIAI App, abrir o módulo **Marketing & SEO** e clicar **Sincronizar agora** no card Google Search Console. Esperado:

- Antes do cadastro: card mostra "Credenciais não configuradas. Veja `/docs/setup-gsc-oauth.md`".
- Depois do cadastro: card mostra `configured: true`, `credential_id`, `label`. (Sync real será implementado em F5.)

## Notas

- **Refresh token "Testing" expira em 7 dias** se o app não tiver pelo menos 1 test user explícito. Como adicionamos `sisdigiai@gmail.com` no passo 3.5, ele **NÃO** expira.
- Se algum dia precisar revogar: <https://myaccount.google.com/permissions> → encontrar "DIGIAI Marketing Sync" → revogar acesso. Depois disso, qualquer chamada usando o refresh token devolve `invalid_grant` — rodar o setup de novo.
- **Rotação a cada 90 dias** (R-021): refazer passo 5 (gerar novo refresh token), `UPDATE company.api_credentials` com novo `vault_secret_id`, soft-delete o antigo via `deleted_at`.
