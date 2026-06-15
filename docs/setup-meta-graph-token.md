# Setup — Token Meta Graph (leitura) para a Central de Postagens

> ADR-0039 / F1. Token de **LEITURA** de métricas (impressões, alcance, seguidores) das contas
> Meta OSI + DIGIAI. **Não publica nada** — publicação segue humana via Business Suite (T-9/T-10).
> Ações deste doc são do **dono** (criar app, gerar token); o agente só cadastra o token no Vault.

## Por que um app novo (e não o do Pulso)

O Pulso tem app Meta próprio noutro Business Manager (`1539817773572500`). As contas OSI + DIGIAI
vivem no **BM "Digiai"** (`1330524481742986`). Token de um BM não lê assets do outro → precisamos de
um app/token no BM Digiai.

## Passo a passo (dono, em developers.facebook.com)

1. **Criar o App**: developers.facebook.com → Meus Apps → Criar app → tipo **"Empresa"** →
   vincular ao **Business Manager "Digiai"**. Nome sugerido: `DIGIAI Social Metrics`.
2. **Adicionar produto** "Instagram Graph API" (e "Facebook Login for Business" se pedir).
3. **System User token** (recomendado, não expira): Business Settings → Usuários → Usuários do sistema →
   criar/usar um system user → **Gerar token** para o app `DIGIAI Social Metrics` com os escopos:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
   - `read_insights`
4. **Atribuir os ativos** ao system user: as Páginas (OSI `1079807541890310`, DIGIAI) e as contas IG
   (OSI `17841422939800023`, @_digiai) com permissão de **Visualizar/Analisar**.
5. **Copiar o token gerado** e me passar (ou colar quando eu pedir). Eu cadastro no **Vault** via RPC
   `fn_register_credential` (provider `meta_graph`, label `digiai-bm-readonly`) — nunca vai pro `.env`
   nem pro git. Também seto o secret na edge function.

## Depois do token (agente faz)

1. Descobrir/preencher os IDs faltantes (IG user id do @_digiai, etc.) via `GET /me/accounts`.
2. `UPDATE marketing.social_accounts SET metrics_enabled = true` nas contas com id completo.
3. Deploy das edge functions `social-sync-accounts` + `social-sync-metrics`.
4. Agendar sync diário por `pg_cron` (1×/dia) + botão "Atualizar agora" na aba Performance.

## Teste de fumaça (após cadastro)

```
GET https://graph.facebook.com/v23.0/17841422939800023?fields=followers_count,media_count&access_token=TOKEN
```
Deve retornar `followers_count` do @oticasemimproviso. Se vier `error`, revisar escopos/ativos do passo 4.
