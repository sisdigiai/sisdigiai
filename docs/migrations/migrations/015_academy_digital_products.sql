-- Migration 015: Academy / Produtos Digitais
-- Estrutura para registrar produtos digitais, assets (capa, PDF, mockup),
-- dados de criacao e operacao do lancamento.

BEGIN;

CREATE SCHEMA IF NOT EXISTS academy;

COMMENT ON SCHEMA academy IS 'Produtos digitais do Academy: oferta, assets, criacao e operacao';

-- ========== Produto principal ==========
CREATE TABLE academy.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  line text NOT NULL DEFAULT 'clearix_academy',
  product_name text NOT NULL,
  subtitle text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planned','in_production','ready_for_sale','live','archived')),
  offer_type text NOT NULL DEFAULT 'low_ticket'
    CHECK (offer_type IN ('lead_magnet','low_ticket','workshop','manual','course','consulting','other')),
  price_brl numeric(12,2),
  launch_condition text,
  promise text,
  main_cta text,
  secondary_cta text,
  primary_audience text,
  secondary_audience text,
  core_delivery text,
  current_focus text,
  notes text,
  sales_page_url text,
  checkout_url text,
  delivery_mode text,
  delivery_provider text,
  access_duration_days smallint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id) DEFAULT public.current_user_id()
);

CREATE INDEX idx_academy_products_status ON academy.products(status);
CREATE INDEX idx_academy_products_line ON academy.products(line);

ALTER TABLE academy.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_products_staff_all ON academy.products FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON academy.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_academy_products AFTER INSERT OR UPDATE OR DELETE ON academy.products
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Assets do produto ==========
CREATE TABLE academy.product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES academy.products(id) ON DELETE CASCADE,
  asset_type text NOT NULL
    CHECK (asset_type IN ('cover','pdf','mockup','thumbnail','bonus','checkout','supporting_doc','other')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','archived')),
  version_label text,
  storage_provider text,
  storage_bucket text,
  storage_path text,
  file_url text,
  mime_type text,
  file_size_bytes bigint,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id) DEFAULT public.current_user_id()
);

CREATE INDEX idx_academy_assets_product ON academy.product_assets(product_id);
CREATE INDEX idx_academy_assets_type ON academy.product_assets(asset_type);

CREATE UNIQUE INDEX idx_academy_assets_primary_per_type
  ON academy.product_assets(product_id, asset_type)
  WHERE is_primary = true AND deleted_at IS NULL;

ALTER TABLE academy.product_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_assets_staff_all ON academy.product_assets FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON academy.product_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_academy_assets AFTER INSERT OR UPDATE OR DELETE ON academy.product_assets
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Dados de criacao ==========
CREATE TABLE academy.product_creation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES academy.products(id) ON DELETE CASCADE,
  record_type text NOT NULL
    CHECK (record_type IN ('brief','prompt','copy','design','research','editorial','operation','decision','other')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','archived')),
  content_md text,
  source_path text,
  external_url text,
  model_name text,
  created_via text,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id) DEFAULT public.current_user_id()
);

CREATE INDEX idx_academy_creation_product ON academy.product_creation_records(product_id);
CREATE INDEX idx_academy_creation_type ON academy.product_creation_records(record_type);

ALTER TABLE academy.product_creation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_creation_staff_all ON academy.product_creation_records FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON academy.product_creation_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_academy_creation AFTER INSERT OR UPDATE OR DELETE ON academy.product_creation_records
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Cenarios operacionais ==========
CREATE TABLE academy.product_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES academy.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('recommended','testing','draft','hold','rejected')),
  landing text,
  checkout text,
  delivery text,
  access_release text,
  support text,
  summary text,
  pros text,
  cons text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id) DEFAULT public.current_user_id()
);

CREATE INDEX idx_academy_scenarios_product ON academy.product_scenarios(product_id);
CREATE INDEX idx_academy_scenarios_order ON academy.product_scenarios(product_id, sort_order, created_at);

ALTER TABLE academy.product_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_scenarios_staff_all ON academy.product_scenarios FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON academy.product_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_academy_scenarios AFTER INSERT OR UPDATE OR DELETE ON academy.product_scenarios
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Questoes em aberto ==========
CREATE TABLE academy.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES academy.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','deciding','blocked','done')),
  owner text,
  next_step text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id) DEFAULT public.current_user_id()
);

CREATE INDEX idx_academy_questions_product ON academy.product_questions(product_id);
CREATE INDEX idx_academy_questions_order ON academy.product_questions(product_id, sort_order, created_at);

ALTER TABLE academy.product_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_questions_staff_all ON academy.product_questions FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON academy.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_academy_questions AFTER INSERT OR UPDATE OR DELETE ON academy.product_questions
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Checklist operacional ==========
CREATE TABLE academy.product_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES academy.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  area text NOT NULL CHECK (area IN ('offer','sales','delivery','analytics','support')),
  done boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id) DEFAULT public.current_user_id()
);

CREATE INDEX idx_academy_checklist_product ON academy.product_checklist_items(product_id);
CREATE INDEX idx_academy_checklist_order ON academy.product_checklist_items(product_id, sort_order, created_at);

ALTER TABLE academy.product_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_checklist_staff_all ON academy.product_checklist_items FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON academy.product_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_academy_checklist AFTER INSERT OR UPDATE OR DELETE ON academy.product_checklist_items
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Views publicas ==========
CREATE OR REPLACE VIEW public.v_academy_products AS
SELECT * FROM academy.products
WHERE deleted_at IS NULL
ORDER BY updated_at DESC, product_name;

CREATE OR REPLACE VIEW public.v_academy_product_assets AS
SELECT * FROM academy.product_assets
WHERE deleted_at IS NULL
ORDER BY product_id, asset_type, is_primary DESC, created_at DESC;

CREATE OR REPLACE VIEW public.v_academy_product_creation_records AS
SELECT * FROM academy.product_creation_records
WHERE deleted_at IS NULL
ORDER BY product_id, created_at DESC;

CREATE OR REPLACE VIEW public.v_academy_product_scenarios AS
SELECT * FROM academy.product_scenarios
WHERE deleted_at IS NULL
ORDER BY product_id, sort_order, created_at;

CREATE OR REPLACE VIEW public.v_academy_product_questions AS
SELECT * FROM academy.product_questions
WHERE deleted_at IS NULL
ORDER BY product_id, sort_order, created_at;

CREATE OR REPLACE VIEW public.v_academy_product_checklist_items AS
SELECT * FROM academy.product_checklist_items
WHERE deleted_at IS NULL
ORDER BY product_id, sort_order, created_at;

-- ========== Grants ==========
REVOKE ALL ON SCHEMA academy FROM anon;
GRANT USAGE ON SCHEMA academy TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA academy TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA academy TO authenticated;

GRANT SELECT ON public.v_academy_products TO authenticated;
GRANT SELECT ON public.v_academy_product_assets TO authenticated;
GRANT SELECT ON public.v_academy_product_creation_records TO authenticated;
GRANT SELECT ON public.v_academy_product_scenarios TO authenticated;
GRANT SELECT ON public.v_academy_product_questions TO authenticated;
GRANT SELECT ON public.v_academy_product_checklist_items TO authenticated;

-- ========== Seed inicial do primeiro produto ==========
INSERT INTO academy.products (
  slug,
  product_name,
  subtitle,
  status,
  offer_type,
  price_brl,
  launch_condition,
  promise,
  main_cta,
  secondary_cta,
  primary_audience,
  secondary_audience,
  core_delivery,
  current_focus,
  notes,
  delivery_mode,
  delivery_provider,
  access_duration_days
)
VALUES (
  'otica-sem-achismo',
  'Otica Sem Achismo',
  'Manual Visual de Atendimento e Conversao para Oticas',
  'in_production',
  'low_ticket',
  97,
  'Preco de estreia para a turma inicial',
  'Em 3 dias, voce sai do atendimento no improviso, responde melhor no WhatsApp e vende com mais seguranca sem depender de desconto.',
  'Quero sair do improviso',
  'Ver o que vem dentro',
  'Vendedor, atendente, consultor optico e colaborador de linha de frente.',
  'Gestores e donos que querem treinar a equipe sem virar curso generico.',
  'PDF visual principal + scripts de WhatsApp + respostas para objecoes + acesso de apoio no Nexus.',
  'Fechar arquitetura de venda, transacao e entrega sem perder velocidade de lancamento.',
  'Nexus entra como apoio e continuidade. Clearix aparece apenas como ecossistema.',
  'nexus',
  'Nexus',
  90
)
ON CONFLICT (slug) DO UPDATE
SET
  product_name = EXCLUDED.product_name,
  subtitle = EXCLUDED.subtitle,
  status = EXCLUDED.status,
  offer_type = EXCLUDED.offer_type,
  price_brl = EXCLUDED.price_brl,
  launch_condition = EXCLUDED.launch_condition,
  promise = EXCLUDED.promise,
  main_cta = EXCLUDED.main_cta,
  secondary_cta = EXCLUDED.secondary_cta,
  primary_audience = EXCLUDED.primary_audience,
  secondary_audience = EXCLUDED.secondary_audience,
  core_delivery = EXCLUDED.core_delivery,
  current_focus = EXCLUDED.current_focus,
  notes = EXCLUDED.notes,
  delivery_mode = EXCLUDED.delivery_mode,
  delivery_provider = EXCLUDED.delivery_provider,
  access_duration_days = EXCLUDED.access_duration_days;

WITH product_ref AS (
  SELECT id FROM academy.products WHERE slug = 'otica-sem-achismo'
)
INSERT INTO academy.product_scenarios (product_id, name, status, landing, checkout, delivery, access_release, support, summary, pros, cons, notes, sort_order)
SELECT
  product_ref.id,
  seed.name,
  seed.status,
  seed.landing,
  seed.checkout,
  seed.delivery,
  seed.access_release,
  seed.support,
  seed.summary,
  seed.pros,
  seed.cons,
  seed.notes,
  seed.sort_order
FROM product_ref
CROSS JOIN (
  VALUES
    (
      'Landing propria + Hotmart + Nexus',
      'recommended',
      'Landing publica propria da oferta',
      'Hotmart',
      'Nexus',
      'Liberacao apos pagamento aprovado na plataforma',
      'WhatsApp DIGIAI + email complementar',
      'Cenario principal para lancamento controlado com checkout conhecido e entrega premium.',
      'Checkout confiavel, afiliados, seller of record claro, Nexus segue como ativo proprio.',
      'Automacao de acesso precisa disciplina; operacao cruza duas plataformas.',
      'Melhor equilibrio entre velocidade comercial e experiencia propria.',
      10
    ),
    (
      'Landing propria + Kiwify + Nexus',
      'testing',
      'Landing publica propria da oferta',
      'Kiwify',
      'Nexus',
      'Liberacao apos compra confirmada em campanha marcada',
      'WhatsApp DIGIAI + email complementar',
      'Bom trilho de teste para campanhas especificas e comparacao de conversao.',
      'Rapidez operacional, checkout builder simples, bom para testes de copy e trafego.',
      'Nao deve virar operacao paralela caotica sem origem rastreada.',
      'Usar apenas em campanhas identificadas por URL e UTM.',
      20
    ),
    (
      'Tudo na plataforma de venda',
      'hold',
      'Pagina interna da plataforma',
      'Hotmart/Kiwify/HeroSpark',
      'Area de membros da propria plataforma',
      'Automatico dentro da plataforma',
      'Suporte da plataforma + suporte DIGIAI',
      'Menos integracao propria, mais rapidez, mas reduz controle do ativo Nexus.',
      'Operacao mais simples no curto prazo.',
      'Entrega premium cai, Nexus perde protagonismo e a experiencia fica terceirizada.',
      'Vale como contingencia, nao como narrativa principal do ecossistema.',
      30
    ),
    (
      'Landing no app + formulario/lista de espera',
      'draft',
      'Pagina publica no proprio app',
      'Sem checkout imediato',
      'Definir depois',
      'Contato manual ou futura automacao',
      'WhatsApp DIGIAI',
      'Bom para capturar demanda enquanto a esteira comercial final nao fecha.',
      'Ja podemos publicar narrativa e captar leads qualificados.',
      'Nao fecha venda imediata e pode atrasar validacao de ticket.',
      'Util para pre-lancamento ou lista de espera controlada.',
      40
    )
) AS seed(name, status, landing, checkout, delivery, access_release, support, summary, pros, cons, notes, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM academy.product_scenarios existing
  WHERE existing.product_id = product_ref.id
    AND existing.name = seed.name
    AND existing.deleted_at IS NULL
);

WITH product_ref AS (
  SELECT id FROM academy.products WHERE slug = 'otica-sem-achismo'
)
INSERT INTO academy.product_questions (product_id, title, status, owner, next_step, notes, sort_order)
SELECT
  product_ref.id,
  seed.title,
  seed.status,
  seed.owner,
  seed.next_step,
  seed.notes,
  seed.sort_order
FROM product_ref
CROSS JOIN (
  VALUES
    (
      'Qual plataforma sera o seller of record principal no MVP?',
      'deciding',
      'Fundador',
      'Comparar Hotmart x Kiwify com criterio de operacao, taxa e confianca percebida.',
      'Hoje a recomendacao documental pende para Hotmart como trilho principal.',
      10
    ),
    (
      'Como sera a liberacao de acesso no Nexus apos pagamento aprovado?',
      'open',
      'App + Nexus',
      'Definir se a primeira versao sera manual, webhook ou rotina assistida.',
      'Nao prometer automacao plena antes de testar 1 compra ponta a ponta.',
      20
    ),
    (
      'Precisamos de pagina de obrigado padronizada fora da plataforma?',
      'open',
      'Academy',
      'Fechar fluxo entre landing, obrigado, onboarding e suporte.',
      'Importante para manter consistencia mesmo com checkout externo.',
      30
    )
) AS seed(title, status, owner, next_step, notes, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM academy.product_questions existing
  WHERE existing.product_id = product_ref.id
    AND existing.title = seed.title
    AND existing.deleted_at IS NULL
);

WITH product_ref AS (
  SELECT id FROM academy.products WHERE slug = 'otica-sem-achismo'
)
INSERT INTO academy.product_checklist_items (product_id, title, area, done, notes, sort_order)
SELECT
  product_ref.id,
  seed.title,
  seed.area,
  seed.done,
  seed.notes,
  seed.sort_order
FROM product_ref
CROSS JOIN (
  VALUES
    ('Fechar narrativa oficial da oferta e promessa curta', 'offer', true,  'Produto, subtitulo, promessa e CTA principal ja estao documentados.', 10),
    ('Publicar landing publica com CTA preparado para checkout ou formulario', 'sales', false, 'Pode nascer no proprio app com rota publica minima.', 20),
    ('Definir seller of record principal', 'sales', false, 'Hotmart lidera como cenario principal; Kiwify fica como teste.', 30),
    ('Padronizar pagina de obrigado e onboarding', 'delivery', false, 'Fluxo recomendado: compra aprovada -> obrigado -> acesso Nexus -> onboarding.', 40),
    ('Definir regra de acesso no Nexus por 90 dias', 'delivery', false, 'Consumo e curto, mas precisa janela para revisao e suporte.', 50),
    ('Mapear eventos minimos de analytics', 'analytics', false, 'Landing visit, click checkout, checkout started, purchase approved, first login Nexus.', 60),
    ('Centralizar canal de suporte do lancamento', 'support', false, 'WhatsApp DIGIAI deve aparecer em obrigado, onboarding e email complementar.', 70)
) AS seed(title, area, done, notes, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM academy.product_checklist_items existing
  WHERE existing.product_id = product_ref.id
    AND existing.title = seed.title
    AND existing.deleted_at IS NULL
);

WITH product_ref AS (
  SELECT id FROM academy.products WHERE slug = 'otica-sem-achismo'
)
INSERT INTO academy.product_assets (
  product_id,
  asset_type,
  title,
  status,
  version_label,
  storage_provider,
  mime_type,
  is_primary,
  notes
)
SELECT
  product_ref.id,
  seed.asset_type,
  seed.title,
  seed.status,
  seed.version_label,
  seed.storage_provider,
  seed.mime_type,
  seed.is_primary,
  seed.notes
FROM product_ref
CROSS JOIN (
  VALUES
    ('cover', 'Capa principal', 'draft', 'v1', 'supabase_storage', 'image/png', true, 'Registrar aqui a capa final aprovada do produto.'),
    ('pdf', 'PDF master do produto', 'draft', 'v1', 'supabase_storage', 'application/pdf', true, 'Subir aqui o PDF pronto para entrega e marcar a versao final.')
) AS seed(asset_type, title, status, version_label, storage_provider, mime_type, is_primary, notes)
WHERE NOT EXISTS (
  SELECT 1
  FROM academy.product_assets existing
  WHERE existing.product_id = product_ref.id
    AND existing.asset_type = seed.asset_type
    AND existing.title = seed.title
    AND existing.deleted_at IS NULL
);

WITH product_ref AS (
  SELECT id FROM academy.products WHERE slug = 'otica-sem-achismo'
)
INSERT INTO academy.product_creation_records (
  product_id,
  record_type,
  title,
  status,
  source_path,
  created_via,
  tags,
  notes
)
SELECT
  product_ref.id,
  seed.record_type,
  seed.title,
  seed.status,
  seed.source_path,
  seed.created_via,
  seed.tags,
  seed.notes
FROM product_ref
CROSS JOIN (
  VALUES
    ('prompt', 'Prompt de implementacao da landing', 'ready', 'PROMPTS_PRIMEIRO_PRODUTO_E_LANDING.md', 'manual', ARRAY['landing','frontend','academy'], 'Documento base usado para orientar a implementacao da landing no app.'),
    ('copy', 'Prompt da copy da landing', 'ready', 'PROMPT_COPY_LANDING_CLEARIX_ACADEMY.md', 'manual', ARRAY['copy','landing','academy'], 'Base textual da narrativa comercial da oferta.'),
    ('editorial', 'Estrutura editorial do PDF', 'ready', 'docs_sync/05-marketing/produtos/otica-sem-achismo/03-pdf-manual/estrutura-editorial-pdf-otica-sem-achismo.md', 'manual', ARRAY['pdf','editorial','manual'], 'Estrutura do manual principal para apoiar capa, PDF final e assets complementares.')
) AS seed(record_type, title, status, source_path, created_via, tags, notes)
WHERE NOT EXISTS (
  SELECT 1
  FROM academy.product_creation_records existing
  WHERE existing.product_id = product_ref.id
    AND existing.title = seed.title
    AND existing.deleted_at IS NULL
);

COMMIT;
