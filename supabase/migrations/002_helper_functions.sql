-- Migration 002: Helper functions centralizadas em public
-- Estas funções são usadas pelas RLS policies para ficarem curtas e legíveis.

-- Retorna true se o usuário autenticado está em iam.users ativo
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, iam
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM iam.users
    WHERE auth_id = auth.uid()
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$;

-- Retorna true se o usuário é o founder
CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, iam
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM iam.users
    WHERE auth_id = auth.uid()
      AND role = 'founder'
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$;

-- Retorna o id interno em iam.users a partir do auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, iam
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_id FROM iam.users
  WHERE auth_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- Levanta exceção se não autenticado
CREATE OR REPLACE FUNCTION public.require_auth()
RETURNS void
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Trigger genérico para atualizar updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Conceder execute para authenticated (funções SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_auth() TO authenticated;
