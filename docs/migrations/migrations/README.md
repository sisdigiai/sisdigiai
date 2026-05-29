# Estado real das migrations — DIGIAI App

> Atualizado 2026-05-28. Este README existe porque o histórico de migrations
> **divergiu** do que está aplicado no banco `hswyopqvnolqpmprqvzh`. Leia antes
> de rodar `supabase db push` ou reconstruir o banco do zero.

## 1. Migrations numeradas (`migrations/NNN_*.sql`)

`001` → `025`. São a fonte versionada do schema base (`company`, `finance`,
`iam`, `ops`, `academy`) + Marketing & SEO (`019`–`024`) + R-013 (`025`).

⚠️ **Divergência com `supabase_migrations.schema_migrations`:** a tabela de
ledger do banco só registra parte delas (os `finance_*` de 2026-04-22 e
`019`–`024`). As `001`–`018` foram aplicadas cedo via Dashboard/SQL Editor e
**não** estão no ledger. Por isso `supabase db push` num clone tentaria
reaplicar `001`–`018`. Hoje o deploy de schema é feito via **Management API /
SQL Editor**, não via `supabase db push`.

- `025_r013_iam_users_identity.sql` foi aplicada em **2026-05-28 via Management
  API** (aditiva e idempotente — `ADD COLUMN IF NOT EXISTS`). Não está no ledger;
  reaplicar é seguro.

## 2. SQL solto em `supabase/*.sql` (FORA da sequência numerada)

Todo o módulo **Marketing** (schema `marketing`, 16 tabelas) foi aplicado via
estes arquivos ad-hoc — **não estão em `migrations/` nem no ledger**, mas já
estão **vivos em produção**:

| Arquivo | Cria / faz | Reaplicar é seguro? |
|---|---|---|
| `marketing-fase-2-completa.sql` | Schema núcleo: pilares, ideias, calendário, copy, brief, artes, platforms, materiais/afiliados, RPCs | Parcial (usa `IF NOT EXISTS` em parte) — revisar |
| `rpc-marketing.sql` | RPCs `marketing_*` (`CREATE OR REPLACE`) | ✅ Sim (idempotente) |
| `marketing-ai-prompts.sql` | `ai_prompt_templates` + RPCs de prompt | revisar |
| `marketing-promote-post.sql` | RPC promover post → material | ✅ provável |
| `marketing-hotmart-tracking.sql` | `hotmart_events_raw`, `hotmart_sales` + ingest | revisar |
| `marketing-testimonials.sql` | `testimonials` + RPCs | revisar |
| `marketing-bulk-schedule.sql` | RPC agendamento em lote | ✅ provável |
| `marketing-platforms-tune.sql` | ajustes em `platforms` | revisar |
| `marketing-community.sql` | `community_members` | revisar |
| `marketing-challenges.sql` | `challenges`, `challenge_participations` | revisar |
| `marketing-post-outputs.sql` | `post_ai_outputs` | revisar |
| `marketing-affiliates-active.sql` | afiliados ativos, comissão, payouts | revisar |
| `company-seed-extras.sql` | **SEED** de 6 ativos digitais | ❌ **NÃO reaplicar** (duplica/seed) |
| `fix-marketing-encoding.sql` | **DATA-FIX**: `DELETE FROM content_ideas/pillars` + reinsere | ❌ **NUNCA reaplicar** — apaga as ideias reais |

## 3. Regras

- **No banco vivo:** nunca rode `company-seed-extras.sql` nem
  `fix-marketing-encoding.sql` de novo — eles apagam/duplicam dados reais
  (hoje há 99 `content_ideas` e 61 posts no calendário).
- **Rebuild do zero (staging):** ordem = numeradas `001`→`025` →
  schema do Marketing (`marketing-fase-2-completa` → `*-tracking` →
  `*-ai-prompts` → demais RPCs/tabelas) → seeds (`company-seed-extras`,
  `fix-marketing-encoding`) por último.
- **Pendência (follow-up):** consolidar o SQL solto em migrations numeradas
  `026+` idempotentes **exige revisão de idempotência arquivo a arquivo** e um
  drill de rebuild em staging (R-017) antes de virar fonte de verdade. Não foi
  feito automaticamente para não arriscar reaplicar os data-fixes destrutivos.
