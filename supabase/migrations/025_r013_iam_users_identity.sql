-- Migration 025: R-013 — identidade padronizada em iam.users (USUUID + WhatsApp + LGPD)
--
-- iam.users e o staff interno da DIGIAI (single-org, sem multitenancy).
-- Por isso NAO tem tenant_id (conceito do Clearix) nem constraints por tenant.
-- Aditivo e idempotente (ADD COLUMN IF NOT EXISTS) — seguro de reaplicar.
-- Ref: Cockpit/Harness/padroes-identidade-cadastros.md §3 + R-013.

ALTER TABLE iam.users
  ADD COLUMN IF NOT EXISTS digiai_user_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS phone_e164       text,
  ADD COLUMN IF NOT EXISTS wa_bsuid         text,
  ADD COLUMN IF NOT EXISTS wa_username      text,
  ADD COLUMN IF NOT EXISTS wa_phone_legacy  text,
  ADD COLUMN IF NOT EXISTS lgpd_request_at   timestamptz,
  ADD COLUMN IF NOT EXISTS lgpd_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at     timestamptz;

-- USUUID estavel e unico (chave de cross-app DIGIAI)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'iam_users_digiai_user_uuid_key') THEN
    ALTER TABLE iam.users ADD CONSTRAINT iam_users_digiai_user_uuid_key UNIQUE (digiai_user_uuid);
  END IF;
END $$;

-- BSUID unico quando presente (single-org => unicidade global, nao por tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_iam_users_wa_bsuid ON iam.users(wa_bsuid) WHERE wa_bsuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iam_users_digiai_uuid ON iam.users(digiai_user_uuid);

COMMENT ON COLUMN iam.users.digiai_user_uuid IS 'USUUID interno DIGIAI — chave estavel cross-app (R-013)';
COMMENT ON COLUMN iam.users.wa_bsuid        IS 'WhatsApp Business-Scoped User ID, formato CC.alfanumerico (R-013, Meta jun-jul/2026)';
COMMENT ON COLUMN iam.users.wa_username     IS 'WhatsApp @handle, mutavel — nunca usar como chave (R-013)';
COMMENT ON COLUMN iam.users.wa_phone_legacy IS 'Telefone que servia de wa_id antes de jun/2026 (R-013 legacy)';
