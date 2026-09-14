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
6. Voltar pro Dashboard. ⚠️ **NÃO deixar em "Testing"** — **PUBLICAR o app (Production)**. Correção 2026-06-14: no modo Testing o refresh token expira em **7 dias mesmo com test user** (a crença antiga de que test user evita a expiração está ERRADA — foi o que quebrou o GSC). Em Production o refresh token não expira (salvo revogação / 6 meses sem uso).

## Passo 4 — Criar OAuth client ID

1. **APIs & Services** → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**.
2. Application type: **Aplicativo da Web** (não "Desktop": o botão do app precisa de URI de redirecionamento de site, ver Passo 5).
3. Name: `digiai-marketing-web`.
4. **CREATE** → janela mostra `Client ID` e `Client secret`. **Copiar e guardar temporariamente** — vai colar no Supabase em seguida.

## Passo 5 — Cadastrar o endereço de retorno do app no client (uma vez só)

> **Reescrito em 14/09/2026.** O caminho é o botão **Reautorizar Google** da tela **SEO** do app digiai. O Playground e o SQL de antes gravavam labels (`sisdigiai-gmail`, `sisdigiai-client-id`) que a edge nunca leu. Quem seguisse o doc gravava a credencial e o sync continuava sem a achar.

A edge `marketing-sync-gsc` lê três credenciais de `company.api_credentials`, `provider = 'google_search_console'`:

| label | o que é |
|---|---|
| `gsc-client-id` | Client ID do OAuth client |
| `gsc-client-secret` | Client secret do **mesmo** client |
| `gsc-refresh-token` | refresh token emitido **para esse client** |

O botão usa o client cujo ID está em `gsc-client-id`. No Google Cloud Console (projeto `digiai-marketing`) → **APIs & Services** → **Credentials**, abra esse client e confira:

1. **Tipo "Aplicativo da Web".** Um client "Desktop" não aceita URI de redirecionamento de site. Se for Desktop, crie um client Web e grave o ID e o secret dele pelo SQL do Passo 7 antes de usar o botão.
2. Em **URIs de redirecionamento autorizados**, adicione exatamente, com a barra final:
   - `https://app.digiai.app.br/`
   - (só para teste local: `http://localhost:3000/`)
3. **Save.** O Google pode levar alguns minutos para aceitar a URI nova.

Esses são os mesmos endereços que a edge aceita. Um endereço fora dessa lista é recusado com `redirect_uri_fora_da_lista`.

## Passo 6 — Reautorizar pelo app

1. Entrar no app digiai com um usuário de staff (`super_admin`, `admin`, `founder` ou `staff`). O botão não aparece para os outros papéis, e a edge confere `is_staff()` no banco.
2. Menu **Produtos → SEO** → **Reautorizar Google**.
3. Login com a conta que tem acesso às propriedades no Search Console (`sisdigiai@gmail.com`). Na tela "App não verificado": **Avançado** → **Acessar DIGIAI Marketing Sync** → **Permitir**.
4. O Google volta para o app, na mesma tela SEO:
   - **"Autorização gravada"**: a edge trocou o code e gravou o refresh token novo em `gsc-refresh-token`; o antigo fica com `deleted_at`.
   - **"Não gravou: …"** mostra o erro real. Os comuns:
     - `redirect_uri_mismatch`: falta o Passo 5, ou o Google ainda não propagou a URI.
     - `invalid_client`: `gsc-client-id` e `gsc-client-secret` são de clients diferentes.
     - `exchange_failed` sem refresh token: o Google não reemitiu; tente de novo (o botão já pede `prompt=consent`).
     - "não pertence a esta aba": a volta chegou numa aba sem o início do fluxo; clique no botão de novo na mesma aba.
5. Teste na hora pelo botão **Sincronizar** do card GSC, ou espere a coleta diária das 06:00 (Brasília). Confira `company.api_credentials.last_sync_status = 'ok'` para `google_search_console`.

## Passo 7 — Alternativa sem o botão (SQL editor do Supabase)

Serve para trocar o client ou quando o app estiver fora do ar. `fn_set_credential_service` faz soft delete da credencial anterior com o mesmo label e grava a nova no vault. Os labels são os que a edge lê:

```sql
select public.fn_set_credential_service('google_search_console', 'oauth_client_secret', '<CLIENT_ID>',     'gsc-client-id',     null, 'client Web digiai-marketing');
select public.fn_set_credential_service('google_search_console', 'oauth_client_secret', '<CLIENT_SECRET>', 'gsc-client-secret', null, 'client Web digiai-marketing');
-- só se já tiver um refresh token deste client; senão, use o botão (Passo 6)
select public.fn_set_credential_service('google_search_console', 'oauth_refresh_token', '<REFRESH_TOKEN>', 'gsc-refresh-token',
       'https://www.googleapis.com/auth/webmasters.readonly', 'gerado fora do app');
```

Conferir:

```sql
select label, credential_type, created_at, last_sync_at, last_sync_status, left(last_sync_error, 120)
from company.api_credentials
where provider = 'google_search_console' and deleted_at is null
order by label;
```

## Notas

- **Em "Testing", o refresh token expira em 7 dias, sempre**, mesmo com test user. Antes de reautorizar, confira em **OAuth consent screen** que o status é **In production**. Um token emitido enquanto o app estava em Testing continua a expirar. Em 14/09/2026 o `invalid_grant` apareceu depois de o sync ter ficado mostrando "ok" desde 22/06, porque um defeito no caminho de erro da edge escondia a falha (corrigido no commit d0360ce). A causa exata da revogação não foi medida.
- Se precisar revogar: <https://myaccount.google.com/permissions> → "DIGIAI Marketing Sync" → remover acesso. Toda chamada passa a devolver `invalid_grant` até reautorizar pelo botão.
- **Rotação a cada 90 dias** (R-021): basta clicar em **Reautorizar Google**. O token novo substitui o antigo.
- Quem pode disparar a edge (migration 125): o cron diário, com segredo do vault, ou staff logado. `exchange_code` e `auth_url` são só de staff. A chave anon recebe 401.
