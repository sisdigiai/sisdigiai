-- ============================================================
-- Marketing — Sistema de Produção Independente
-- ============================================================
-- Cada vez que você gera um prompt e cola a resposta da IA, vira
-- uma linha em post_ai_outputs. Permite ver depois "o que já temos
-- pra esse post" e continuar de onde parou — sem depender de Claude.
--
-- Pipeline automático: trigger promove post status conforme outputs
-- são adicionados.
-- ============================================================

-- ─── Tabela ───
CREATE TABLE IF NOT EXISTS marketing.post_ai_outputs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES marketing.content_calendar(id) ON DELETE CASCADE,
  -- Template usado (snapshot — preserva mesmo se template for editado/deletado)
  template_id     uuid REFERENCES marketing.ai_prompt_templates(id) ON DELETE SET NULL,
  template_code   text,
  template_name   text,
  ai_target       text,
  ai_provider     text,              -- chatgpt, midjourney, dalle, sora, elevenlabs, suno, claude, etc
  category        text,              -- text, image, video, audio, music
  -- Prompt + resposta
  prompt_rendered text NOT NULL,     -- snapshot do prompt enviado
  output_text     text,              -- resposta texto (se aplicável)
  output_url      text,              -- URL do asset gerado (Storage ou externo)
  output_storage_path text,          -- path no bucket marketing-assets, se subido
  -- Meta
  notes           text,
  status          text NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('pending','completed','skipped','superseded')),
  generated_at    timestamptz DEFAULT now(),
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outputs_post     ON marketing.post_ai_outputs(post_id);
CREATE INDEX IF NOT EXISTS idx_outputs_template ON marketing.post_ai_outputs(template_id);
CREATE INDEX IF NOT EXISTS idx_outputs_provider ON marketing.post_ai_outputs(ai_provider);
CREATE INDEX IF NOT EXISTS idx_outputs_category ON marketing.post_ai_outputs(category);

ALTER TABLE marketing.post_ai_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outputs_staff_all ON marketing.post_ai_outputs;
CREATE POLICY outputs_staff_all ON marketing.post_ai_outputs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ─── View pública (com nome bonitinho do template) ───
CREATE OR REPLACE VIEW public.v_marketing_post_outputs AS
SELECT
  o.*,
  t.name AS template_current_name,
  c.hook AS post_hook,
  c.scheduled_date AS post_scheduled_date
FROM marketing.post_ai_outputs o
LEFT JOIN marketing.ai_prompt_templates t ON t.id = o.template_id
LEFT JOIN marketing.content_calendar c ON c.id = o.post_id
ORDER BY o.generated_at DESC;

GRANT SELECT ON public.v_marketing_post_outputs TO authenticated;

-- ─── Stats por post (quanto já tá pronto) ───
CREATE OR REPLACE VIEW public.v_marketing_post_production_stats AS
SELECT
  c.id AS post_id,
  COUNT(o.id) AS outputs_total,
  COUNT(o.id) FILTER (WHERE o.category = 'text') AS outputs_text,
  COUNT(o.id) FILTER (WHERE o.category = 'image') AS outputs_image,
  COUNT(o.id) FILTER (WHERE o.category = 'video') AS outputs_video,
  COUNT(o.id) FILTER (WHERE o.category = 'audio') AS outputs_audio,
  COUNT(o.id) FILTER (WHERE o.category = 'music') AS outputs_music,
  COUNT(o.id) FILTER (WHERE o.output_url IS NOT NULL) AS with_url,
  ARRAY_AGG(DISTINCT o.ai_provider) FILTER (WHERE o.ai_provider IS NOT NULL) AS providers_used,
  MAX(o.generated_at) AS last_output_at
FROM marketing.content_calendar c
LEFT JOIN marketing.post_ai_outputs o ON o.post_id = c.id AND o.status = 'completed'
WHERE c.deleted_at IS NULL
GROUP BY c.id;

GRANT SELECT ON public.v_marketing_post_production_stats TO authenticated;

-- ─── Trigger: auto-avança status do post conforme outputs ───
CREATE OR REPLACE FUNCTION marketing.tg_post_outputs_advance_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketing, public
AS $$
DECLARE
  v_post   record;
  v_text   int;
  v_image  int;
  v_video  int;
  v_url    int;
BEGIN
  SELECT * INTO v_post FROM marketing.content_calendar WHERE id = NEW.post_id;
  IF NOT FOUND OR v_post.status NOT IN ('planned','in_production') THEN
    RETURN NEW;
  END IF;

  -- Conta outputs por categoria
  SELECT
    COUNT(*) FILTER (WHERE category = 'text'),
    COUNT(*) FILTER (WHERE category = 'image'),
    COUNT(*) FILTER (WHERE category = 'video'),
    COUNT(*) FILTER (WHERE output_url IS NOT NULL)
  INTO v_text, v_image, v_video, v_url
  FROM marketing.post_ai_outputs
  WHERE post_id = NEW.post_id AND status = 'completed';

  -- Tem 1+ output → vira in_production
  IF v_post.status = 'planned' AND (v_text + v_image + v_video) > 0 THEN
    UPDATE marketing.content_calendar
    SET status = 'in_production', updated_at = now()
    WHERE id = NEW.post_id;
  END IF;

  -- Tem texto + (imagem OU vídeo) + URL → ready
  IF v_post.status = 'in_production'
     AND v_text > 0
     AND (v_image > 0 OR v_video > 0)
     AND v_url > 0 THEN
    UPDATE marketing.content_calendar
    SET status = 'ready', updated_at = now()
    WHERE id = NEW.post_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS outputs_advance_status ON marketing.post_ai_outputs;
CREATE TRIGGER outputs_advance_status
AFTER INSERT OR UPDATE OF status ON marketing.post_ai_outputs
FOR EACH ROW
EXECUTE FUNCTION marketing.tg_post_outputs_advance_status();

-- ─── RPC: salvar output (Cola resposta da IA → grava + atualiza pipeline) ───
DROP FUNCTION IF EXISTS public.marketing_save_post_output(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_save_post_output(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_id            uuid;
  v_post_id       uuid;
  v_template_id   uuid;
  v_template      record;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  v_post_id     := (p_payload->>'post_id')::uuid;
  v_template_id := NULLIF(p_payload->>'template_id','')::uuid;

  -- Pega snapshot do template (se houver)
  IF v_template_id IS NOT NULL THEN
    SELECT code, name, ai_target, category INTO v_template
    FROM marketing.ai_prompt_templates WHERE id = v_template_id;
  END IF;

  -- Verifica se já existe output desse template pra esse post
  -- Se existir, marca o anterior como superseded antes de inserir novo
  IF v_template_id IS NOT NULL THEN
    UPDATE marketing.post_ai_outputs
    SET status = 'superseded', updated_at = now()
    WHERE post_id = v_post_id AND template_id = v_template_id AND status = 'completed';
  END IF;

  INSERT INTO marketing.post_ai_outputs (
    post_id, template_id, template_code, template_name,
    ai_target, ai_provider, category,
    prompt_rendered, output_text, output_url, output_storage_path,
    notes, status, metadata
  ) VALUES (
    v_post_id,
    v_template_id,
    COALESCE(v_template.code, p_payload->>'template_code'),
    COALESCE(v_template.name, p_payload->>'template_name'),
    COALESCE(v_template.ai_target, p_payload->>'ai_target'),
    COALESCE(p_payload->>'ai_provider', v_template.ai_target),
    COALESCE(v_template.category, p_payload->>'category'),
    p_payload->>'prompt_rendered',
    NULLIF(p_payload->>'output_text',''),
    NULLIF(p_payload->>'output_url',''),
    NULLIF(p_payload->>'output_storage_path',''),
    NULLIF(p_payload->>'notes',''),
    COALESCE(p_payload->>'status', 'completed'),
    COALESCE(p_payload->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  -- Se output é texto e veio do template Reel/Post/Carrossel,
  -- também atualiza copy_full do post
  IF v_template.category = 'text' AND p_payload->>'output_text' IS NOT NULL THEN
    UPDATE marketing.content_calendar
    SET copy_full = p_payload->>'output_text', updated_at = now()
    WHERE id = v_post_id AND (copy_full IS NULL OR copy_full = '');
  END IF;

  -- Se output tem URL e categoria image/video, adiciona em arts
  IF p_payload->>'output_url' IS NOT NULL AND v_template.category IN ('image','video') THEN
    UPDATE marketing.content_calendar
    SET arts = COALESCE(arts, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'type', v_template.category,
          'format', COALESCE(p_payload->>'format', ''),
          'url', p_payload->>'output_url',
          'label', v_template.name,
          'output_id', v_id
        )
      ),
      updated_at = now()
    WHERE id = v_post_id;
  END IF;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_save_post_output TO authenticated, service_role;

-- ─── RPC: deletar output (soft via status) ───
DROP FUNCTION IF EXISTS public.marketing_delete_post_output(uuid);
CREATE OR REPLACE FUNCTION public.marketing_delete_post_output(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  DELETE FROM marketing.post_ai_outputs WHERE id = p_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_delete_post_output TO authenticated, service_role;

-- ─── Storage bucket: marketing-assets ───
-- (RLS configurado abaixo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('marketing-assets', 'marketing-assets', true, 52428800,
        ARRAY['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies do bucket: staff pode tudo
DROP POLICY IF EXISTS "marketing-assets staff upload" ON storage.objects;
CREATE POLICY "marketing-assets staff upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marketing-assets' AND public.is_staff());

DROP POLICY IF EXISTS "marketing-assets staff update" ON storage.objects;
CREATE POLICY "marketing-assets staff update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'marketing-assets' AND public.is_staff());

DROP POLICY IF EXISTS "marketing-assets staff delete" ON storage.objects;
CREATE POLICY "marketing-assets staff delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'marketing-assets' AND public.is_staff());

DROP POLICY IF EXISTS "marketing-assets public read" ON storage.objects;
CREATE POLICY "marketing-assets public read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'marketing-assets');

NOTIFY pgrst, 'reload schema';
