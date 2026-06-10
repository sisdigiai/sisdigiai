-- C3 (R-013) — aplicada em produção via MCP 2026-06-08.
-- ops.commercial_leads é tabela de pessoa (lead) criada após o R-013 sem o schema de
-- identidade obrigatório. Adição ADITIVA (nullable, exceto digiai_user_uuid com default) —
-- não quebra app nem o lead existente. Sem CHECK de identificador (dados atuais usam o campo
-- livre 'contact'; backfill estruturado é fase posterior). Ref: Harness/padroes-identidade-cadastros.md §3.
alter table ops.commercial_leads
  add column if not exists digiai_user_uuid uuid not null default gen_random_uuid(),
  add column if not exists email text,
  add column if not exists phone_e164 text,
  add column if not exists wa_bsuid text,
  add column if not exists wa_username text,
  add column if not exists wa_phone_legacy text,
  add column if not exists lgpd_request_at timestamptz,
  add column if not exists anonymized_at timestamptz;

create unique index if not exists idx_commercial_leads_digiai_uuid on ops.commercial_leads(digiai_user_uuid);
create index if not exists idx_commercial_leads_wa_bsuid on ops.commercial_leads(wa_bsuid) where wa_bsuid is not null;
create index if not exists idx_commercial_leads_email on ops.commercial_leads(lower(email)) where email is not null;
