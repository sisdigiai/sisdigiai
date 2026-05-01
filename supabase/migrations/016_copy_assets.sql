-- Migration 016: Copy Assets & Storage
-- Tabela para gerenciar peças de copy (criativos, emails, vídeos, etc.)
-- e bucket para upload de imagens dos criativos finais.

BEGIN;

-- ========== Tabela copy_assets (schema ops) ==========
CREATE TABLE IF NOT EXISTS ops.copy_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL UNIQUE,
  category text NOT NULL
    CHECK (category IN ('landing','ads','stories_carrossel','video','email','whatsapp','pagina_obrigado')),
  title text NOT NULL,
  format text NOT NULL,
  angulo text,
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','criado','aprovado')),
  image_url text,
  image_path text,
  source_file text,
  sort_order smallint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE ops.copy_assets IS 'Peças de copy do OSI com status de produção e imagem do criativo final';

-- Index para queries por categoria
CREATE INDEX idx_copy_assets_category ON ops.copy_assets(category);
CREATE INDEX idx_copy_assets_status ON ops.copy_assets(status);

-- ========== RLS ==========
ALTER TABLE ops.copy_assets ENABLE ROW LEVEL SECURITY;

-- Staff pode ver e editar
CREATE POLICY "staff_read_copy_assets"
  ON ops.copy_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM iam.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('super_admin','admin','founder','staff')
    )
  );

CREATE POLICY "staff_write_copy_assets"
  ON ops.copy_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM iam.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('super_admin','admin','founder','staff')
    )
  );

-- ========== View pública (para PostgREST) ==========
CREATE OR REPLACE VIEW public.v_copy_assets AS
  SELECT * FROM ops.copy_assets WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.v_copy_assets TO authenticated;

-- ========== Trigger updated_at ==========
CREATE OR REPLACE FUNCTION ops.set_copy_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_copy_assets_updated_at
  BEFORE UPDATE ON ops.copy_assets
  FOR EACH ROW EXECUTE FUNCTION ops.set_copy_assets_updated_at();

-- ========== Storage Bucket ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'osi-criativos',
  'osi-criativos',
  true,
  5242880, -- 5MB
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: staff pode upload
CREATE POLICY "staff_upload_osi_criativos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'osi-criativos'
    AND EXISTS (
      SELECT 1 FROM iam.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('super_admin','admin','founder','staff')
    )
  );

-- Política de storage: staff pode deletar
CREATE POLICY "staff_delete_osi_criativos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'osi-criativos'
    AND EXISTS (
      SELECT 1 FROM iam.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('super_admin','admin','founder','staff')
    )
  );

-- Política de storage: público pode ler (bucket público)
CREATE POLICY "public_read_osi_criativos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'osi-criativos');

COMMIT;
