-- Migration 017: Multi-images em copy_assets
-- Adiciona coluna `images` (jsonb array) para suportar carrosséis e múltiplos
-- criativos em categorias como stories_carrossel e ads.
-- A coluna legada `image_url`/`image_path` é mantida por backward compat e
-- sincronizada com images[0] via trigger.

BEGIN;

-- ========== Adicionar coluna images ==========
ALTER TABLE ops.copy_assets
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ops.copy_assets.images IS
  'Array de imagens [{url, path}]. Para carrosséis (stories_carrossel) e múltiplos criativos (ads).';

-- Constraint: deve ser sempre um array
ALTER TABLE ops.copy_assets
  ADD CONSTRAINT copy_assets_images_is_array
  CHECK (jsonb_typeof(images) = 'array');

-- ========== Backfill: image_url existente vai para images[0] ==========
UPDATE ops.copy_assets
SET images = jsonb_build_array(
  jsonb_build_object('url', image_url, 'path', image_path)
)
WHERE image_url IS NOT NULL
  AND jsonb_array_length(images) = 0;

-- ========== Trigger: manter image_url/image_path em sincronia com images[0] ==========
-- (preserva backward compat para qualquer leitor antigo)
CREATE OR REPLACE FUNCTION ops.sync_copy_assets_legacy_image()
RETURNS TRIGGER AS $$
BEGIN
  IF jsonb_array_length(NEW.images) > 0 THEN
    NEW.image_url := NEW.images->0->>'url';
    NEW.image_path := NEW.images->0->>'path';
  ELSE
    NEW.image_url := NULL;
    NEW.image_path := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_copy_assets_sync_legacy_image ON ops.copy_assets;
CREATE TRIGGER trg_copy_assets_sync_legacy_image
  BEFORE INSERT OR UPDATE OF images ON ops.copy_assets
  FOR EACH ROW EXECUTE FUNCTION ops.sync_copy_assets_legacy_image();

-- ========== Recriar view pública para incluir images ==========
CREATE OR REPLACE VIEW public.v_copy_assets AS
  SELECT * FROM ops.copy_assets WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.v_copy_assets TO authenticated;

COMMIT;
