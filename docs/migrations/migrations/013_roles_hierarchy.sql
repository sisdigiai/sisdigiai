-- Migration 013: Hierarquia de roles + atualização do seed
-- Roles disponíveis (do mais alto ao mais baixo):
--   super_admin — controle total, pode gerenciar outros usuários
--   admin       — administrativo, pode gerenciar dados mas não usuários
--   founder     — alias histórico (equivale a super_admin)
--   staff       — operacional, CRUD em dados do dia a dia
--   viewer      — somente leitura via views

-- Atualizar CHECK constraint
ALTER TABLE iam.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE iam.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin','admin','founder','staff','viewer'));

-- Atualizar seed: troca email e eleva para super_admin
UPDATE iam.users
SET email = 'junior@oticastatymello.com.br',
    full_name = 'Junior — Fundador DIGIAI',
    role = 'super_admin'
WHERE email = 'oticastatymello@gmail.com';

-- Novas helper functions (em public, seguindo o padrão)

-- is_super_admin: topo da hierarquia
CREATE OR REPLACE FUNCTION public.is_super_admin()
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
      AND role IN ('super_admin','founder')  -- founder é alias
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$;

-- is_admin: super_admin + admin
CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND role IN ('super_admin','admin','founder')
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$;

-- Atualizar is_staff para incluir nova hierarquia (tudo menos viewer e null)
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
      AND role IN ('super_admin','admin','founder','staff')
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$;

-- is_viewer: tem qualquer nível de acesso (incluindo viewer read-only)
CREATE OR REPLACE FUNCTION public.is_viewer()
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
      AND role IN ('super_admin','admin','founder','staff','viewer')
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$;

-- Retorna o role_code do usuário atual (útil para UI condicional)
CREATE OR REPLACE FUNCTION public.current_role_code()
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, iam
AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT role INTO v_role FROM iam.users
  WHERE auth_id = auth.uid() AND deleted_at IS NULL AND status = 'active'
  LIMIT 1;
  RETURN v_role;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role_code() TO authenticated;
