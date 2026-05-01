-- Migration 003: Usuários internos + auditoria universal

-- ========== iam.users ==========
CREATE TABLE iam.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('founder','staff','viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_iam_users_auth_id ON iam.users(auth_id);
CREATE INDEX idx_iam_users_email ON iam.users(email);

ALTER TABLE iam.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_staff_all ON iam.users FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON iam.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== iam.audit_logs ==========
CREATE TABLE iam.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES iam.users(id),
  user_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_resource ON iam.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON iam.audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON iam.audit_logs(user_id);

ALTER TABLE iam.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_read_staff ON iam.audit_logs FOR SELECT
  USING (public.is_staff());
-- Sem policy de INSERT — apenas o trigger audit_log escreve (SECURITY DEFINER)

-- ========== Trigger de auditoria genérico ==========
CREATE OR REPLACE FUNCTION iam.tg_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, iam AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_resource_id uuid;
BEGIN
  SELECT u.id, u.email INTO v_user_id, v_email
  FROM iam.users u WHERE u.auth_id = auth.uid() LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    v_resource_id := OLD.id;
  ELSE
    v_resource_id := NEW.id;
  END IF;

  INSERT INTO iam.audit_logs (user_id, user_email, action, resource_type, resource_id, details)
  VALUES (
    v_user_id, v_email, TG_OP,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    jsonb_build_object(
      'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
