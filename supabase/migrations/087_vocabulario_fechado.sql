-- ============================================================
-- 087 — vocabulário fechado: plataformas e serviços viram tabela
-- ============================================================
-- Conciliado entre `digiai` e `digiai_mkt` em 2026-08-28. A lista de 9 plataformas
-- foi medida por eles em `mkt.accounts` (7 em uso) mais 2 aprovadas pelo dono hoje
-- (`google_business`, `youtube`); a lista de serviços é desta casa.
--
-- ── POR QUE TABELA E NÃO CONVENÇÃO ──
-- `servico` e `platform` são texto livre nos dois lados, e texto livre rachou duas
-- vezes em duas semanas, cada vez de um lado:
--   · `facebook_page` nasceu ao lado de `rede_facebook` (lote do P4)
--   · `Programações Gerais` nasceu ao lado de `Programacoes Gerais` (campo `navegador`)
-- Combinar um vocabulário e não travá-lo é repetir o mesmo erro com data marcada.
-- Por isso a lista vira dado com chave estrangeira: o banco recusa o que está fora.
-- Acrescentar serviço continua sendo INSERT — schema não muda para crescer.
--
-- ── DOIS CONCEITOS, NÃO UM ──
-- `plataforma` é onde se publica. `servico` é o tipo de ativo, e cobre coisa que não
-- é plataforma nenhuma: `supabase`, `cloudflare`, `github`, `openai`. Forçar os dois
-- na mesma lista quebraria ambos. A sobreposição é o subconjunto social, e ali a
-- relação é derivável: `rede_instagram` ↔ `instagram`.
--
-- ── UMA DISTINÇÃO QUE O AGENTE DO MKT PEDIU E ESTÁ CERTA ──
-- Vocabulário alinhado não vira capacidade. `rede_google_business` entra como tipo de
-- ATIVO porque o perfil existe (257 interações) — e NÃO como fonte de dado: não há
-- coletor nem publicador escritos para ele em nenhum dos dois apps. Quem ler isto em
-- três meses não deve concluir que existe canal. Por isso a coluna `tem_canal`, que
-- hoje é falsa para google_business e youtube.
-- ============================================================

-- ── Plataformas: a lista canônica compartilhada ──
CREATE TABLE IF NOT EXISTS ops.plataformas (
  slug        text PRIMARY KEY,
  nome        text NOT NULL,
  -- Existe canal escrito (coletor e/ou publicador)? Nomear não implementa.
  tem_canal   boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 99,
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ops.plataformas IS
  'Lista canônica de plataformas de publicação, conciliada entre digiai e digiai_mkt em 2026-08-28. Escrita pelo digiai, lida pelo MKT por view.';
COMMENT ON COLUMN ops.plataformas.tem_canal IS
  'Se existe coletor/publicador escrito. Falso não significa conta ausente: significa que ninguém implementou o canal.';

INSERT INTO ops.plataformas (slug, nome, tem_canal, sort_order, notas) VALUES
  ('instagram',       'Instagram',              true,  1, '4 contas via API no MKT'),
  ('facebook',        'Facebook',               true,  2, '4 contas via API no MKT'),
  ('tiktok',          'TikTok',                 true,  3, '3 contas via API no MKT'),
  ('linkedin',        'LinkedIn',               true,  4, '2 contas'),
  ('pinterest',       'Pinterest',              false, 5, '4 contas em modo derivada (espelho), sem API ainda'),
  ('whatsapp',        'WhatsApp',               false, 6, '4 contas manuais; a Cloud API não publica Status'),
  ('x',               'X',                      false, 7, 'Conta pessoal em modo navegador. Fica na lista porque a lista é vocabulário, não roster de capacidade — tirá-la faria o cadastro deixar de refletir o que existe.'),
  ('google_business', 'Google Business Profile', false, 8, 'Perfil da Polá Petit ativo (257 interações), mas SEM canal escrito nos dois apps. Acesso à API exige aprovação do Google.'),
  ('youtube',         'YouTube',                false, 9, 'Aprovado pelo dono em 28/08 para reaproveitar vídeos do Instagram. Sem conta e sem canal ainda.')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, tem_canal = EXCLUDED.tem_canal,
  sort_order = EXCLUDED.sort_order, notas = EXCLUDED.notas;

-- ── Serviços: o vocabulário de `ops.contas_servicos.servico` ──
CREATE TABLE IF NOT EXISTS ops.servicos (
  slug            text PRIMARY KEY,
  nome            text NOT NULL,
  familia         text NOT NULL,
  plataforma_slug text REFERENCES ops.plataformas(slug),
  sort_order      integer NOT NULL DEFAULT 99,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ops.servicos IS
  'Vocabulário fechado de ops.contas_servicos.servico. Crescer é INSERT, não migration de schema.';

-- Serviços sociais: derivados da plataforma, prefixo `rede_`.
INSERT INTO ops.servicos (slug, nome, familia, plataforma_slug, sort_order)
SELECT 'rede_' || slug, nome, 'redes', slug, sort_order
FROM ops.plataformas
ON CONFLICT (slug) DO NOTHING;

-- Serviços que não são plataforma de publicação.
INSERT INTO ops.servicos (slug, nome, familia, sort_order) VALUES
  ('meta_bm',               'Business Manager (Meta)',   'meta',        10),
  ('meta_pixel',            'Pixel / dataset (Meta)',    'meta',        11),
  ('tiktok_pixel',          'Pixel do TikTok',           'dev',         12),
  ('google_search_console', 'Google Search Console',     'google',      20),
  ('google_analytics',      'Google Analytics',          'google',      21),
  ('google_workspace',      'Google Workspace',          'google',      22),
  ('supabase',              'Projeto Supabase',          'infra',       30),
  ('cloudflare',            'Cloudflare',                'infra',       31),
  ('netlify',               'Netlify',                   'infra',       32),
  ('github',                'GitHub',                    'infra',       33),
  ('tiktok_dev',            'App de dev do TikTok',      'dev',         40),
  ('linkedin_dev',          'App de dev do LinkedIn',    'dev',         41),
  ('pinterest_dev',         'App de dev do Pinterest',   'dev',         42),
  ('hotmart',               'Hotmart',                   'plataformas', 50),
  ('openai',                'OpenAI',                    'plataformas', 51),
  ('telegram_bot',          'Bot do Telegram',           'plataformas', 52)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, familia = EXCLUDED.familia, sort_order = EXCLUDED.sort_order;

-- ── Renomeia o GBP para casar com o prefixo derivado ──
UPDATE ops.contas_servicos
SET servico = 'rede_google_business'
WHERE servico = 'google_business_profile';

-- ── A trava: o banco passa a recusar `servico` fora da lista ──
-- Só depois de todas as linhas existentes estarem cobertas; se alguma faltar, o ALTER
-- falha e a migration inteira volta, que é o comportamento desejado.
ALTER TABLE ops.contas_servicos
  DROP CONSTRAINT IF EXISTS contas_servicos_servico_fk;
ALTER TABLE ops.contas_servicos
  ADD CONSTRAINT contas_servicos_servico_fk
  FOREIGN KEY (servico) REFERENCES ops.servicos(slug);

-- ── Leitura para o MKT ──
-- `reloptions` fica NULO de propósito: a view executa com os direitos do dono. Foi
-- adicionar `security_invoker=true` numa view desta família que derrubou o inventário
-- por 15 minutos em 28/08 — `authenticated` não tem grant nas tabelas de `ops`.
CREATE OR REPLACE VIEW public.v_ops_plataformas AS
SELECT slug, nome, tem_canal, sort_order, notas FROM ops.plataformas ORDER BY sort_order;

CREATE OR REPLACE VIEW public.v_ops_servicos AS
SELECT slug, nome, familia, plataforma_slug, sort_order FROM ops.servicos ORDER BY sort_order, slug;

REVOKE ALL ON public.v_ops_plataformas FROM anon;
REVOKE ALL ON public.v_ops_servicos    FROM anon;
GRANT SELECT ON public.v_ops_plataformas TO authenticated;
GRANT SELECT ON public.v_ops_servicos    TO authenticated;

NOTIFY pgrst, 'reload schema';
