-- ============================================================
-- 082 — Extratos InfinitePay jun–ago/2026 (21 linhas, R$ 7.847,53) + aportes de CAIXA
-- ============================================================
-- Fonte: Cockpit/Spec/_prompts/DESPACHO-lancar-extratos-infinitepay-2026.md
-- (classificado pelo agente do app em 28/08; autorizado pelo dono em 28/08;
-- executado pelo orquestrador na ordem noturna de 05/09, autorizacao textual).
-- Convencao da casa: IOF SOMADO ao principal (provado nas cobrancas Higgsfield
-- ja lancadas). Recorte a partir de 13/06 — o razao vai ate 12/06; nada antes
-- se reprocessa. Z-API usa o vendor legado Z-API.IO (8bdb56f4) — o id "Z-API"
-- (44718123) e duplicado e fica para fusao futura.

-- category e NOT NULL sem default: herda a de um vendor equivalente (fal.ai ~ OpenAI; JusBrasil ~ INPI/legal)
insert into finance.vendors (id, slug, name, category)
select gen_random_uuid(), 'fal-ai', 'fal.ai', (select category from finance.vendors where name='OpenAI' limit 1)
where not exists (select 1 from finance.vendors where name='fal.ai');
insert into finance.vendors (id, slug, name, category)
select gen_random_uuid(), 'jusbrasil', 'JusBrasil', (select category from finance.vendors where name like 'INPI%' limit 1)
where not exists (select 1 from finance.vendors where name='JusBrasil');

with v as (
  select name, id from finance.vendors
), linhas (product_id, category, kind, description, month, amount_brl, vendor) as (values
  ('clearix','infra_cloud','subscription','Netlify 2026-06 (1x c/ IOF)','2026-06-01'::date,26.39,'Netlify Inc'),
  ('clearix','infra_cloud','subscription','Supabase 2026-06 (1x c/ IOF)','2026-06-01',287.99,'Supabase Inc'),
  ('compartilhado','ai_api','subscription','Anthropic Claude 2026-06 (1x c/ IOF)','2026-06-01',1100.00,'Anthropic (Claude)'),
  ('compartilhado','ai_api','subscription','ElevenLabs 2026-06 (1x c/ IOF)','2026-06-01',105.43,'ElevenLabs'),
  ('pulso','ai_api','subscription','Higgsfield 2026-06 (1x c/ IOF)','2026-06-01',265.66,'Higgsfield Inc.'),
  ('clearix','infra_cloud','subscription','Netlify 2026-07 (6x c/ IOF)','2026-07-01',416.58,'Netlify Inc'),
  ('clearix','infra_cloud','subscription','Supabase 2026-07 (4x c/ IOF)','2026-07-01',699.07,'Supabase Inc'),
  ('clearix','integrations_sector','subscription','Z-API 2026-07 (1x c/ IOF)','2026-07-01',99.99,'Z-API.IO'),
  ('compartilhado','ai_api','subscription','Anthropic Claude 2026-07 (1x c/ IOF)','2026-07-01',1100.00,'Anthropic (Claude)'),
  ('compartilhado','ai_api','subscription','ElevenLabs 2026-07 (2x c/ IOF)','2026-07-01',226.02,'ElevenLabs'),
  ('compartilhado','dev_tools','subscription','Google assinatura 2026-07 (2x c/ IOF)','2026-07-01',99.89,'Google (assinaturas)'),
  ('compartilhado','ai_api','subscription','OpenAI 2026-07 (3x c/ IOF)','2026-07-01',133.96,'OpenAI'),
  ('compartilhado','ai_api','one_time','fal.ai 2026-07 (1x c/ IOF)','2026-07-01',54.00,'fal.ai'),
  ('pulso','ai_api','subscription','Higgsfield 2026-07 (3x c/ IOF)','2026-07-01',786.41,'Higgsfield Inc.'),
  ('clearix','infra_cloud','subscription','Netlify 2026-08 (6x c/ IOF)','2026-08-01',421.75,'Netlify Inc'),
  ('clearix','infra_cloud','subscription','Supabase 2026-08 (3x c/ IOF)','2026-08-01',332.39,'Supabase Inc'),
  ('clearix','integrations_sector','subscription','Z-API 2026-08 (2x c/ IOF)','2026-08-01',199.98,'Z-API.IO'),
  ('compartilhado','ai_api','subscription','Anthropic Claude 2026-08 (1x c/ IOF)','2026-08-01',1100.00,'Anthropic (Claude)'),
  ('compartilhado','ai_api','subscription','ElevenLabs 2026-08 (1x c/ IOF)','2026-08-01',116.84,'ElevenLabs'),
  ('compartilhado','other','subscription','JusBrasil 2026-08 (1x c/ IOF)','2026-08-01',39.90,'JusBrasil'),
  ('compartilhado','ai_api','subscription','OpenAI 2026-08 (5x c/ IOF)','2026-08-01',235.28,'OpenAI')
)
insert into finance.expenses (product_id, vendor_id, category, kind, description, month, amount_brl, notes)
select l.product_id, v.id, l.category::finance.expense_category, l.kind, l.description, l.month, l.amount_brl,
       'InfinitePay conta 29379484/20332770 - IOF somado - DESPACHO 28/08 - lancado 05/09'
from linhas l join v on v.name = l.vendor
where not exists (
  select 1 from finance.expenses e where e.description = l.description and e.month = l.month and e.deleted_at is null
);

-- Aportes de CAIXA (nao existia lugar: o schema finance so tinha aporte intelectual, nao-caixa)
create table if not exists finance.aportes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  origem text not null,
  valor_brl numeric not null check (valor_brl > 0),
  natureza text not null check (natureza in ('investimento','emprestimo','devolucao')),
  observacao text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table finance.aportes is
  'Aporte de CAIXA na DIGIAI (dinheiro que entrou/voltou), distinto do aporte intelectual (founder_time / expenses.kind=aporte_intelectual, nao-caixa). natureza: investimento (nao volta) | emprestimo (passivo que volta) | devolucao (saida no sentido inverso). Criada 05/09/2026 (ordem noturna) para o painel parar de mostrar o buraco de caixa sem mostrar quem o financiou.';
grant select on finance.aportes to authenticated;
grant all on finance.aportes to service_role;
alter table finance.aportes enable row level security;
drop policy if exists aportes_le on finance.aportes;
create policy aportes_le on finance.aportes for select to authenticated using (public.is_super_admin());

insert into finance.aportes (data, origem, valor_brl, natureza, observacao)
select * from (values
  ('2026-08-28'::date, 'DIGIAI OTICA E TECNOLOGIA LTDA (Pix, conta InfinitePay 29379484)', 5710.00, 'investimento', '29 Pix jul-ago/2026 - classificado pelo dono como investimento da otica na DIGIAI (capital, nao emprestimo)'),
  ('2026-08-28'::date, 'DIGIAI OTICA E TECNOLOGIA LTDA (Pix, sentido inverso)', 1000.00, 'devolucao', 'saida no sentido inverso no mesmo periodo - liquido do periodo = R$ 4.710,00')
) as x(data, origem, valor_brl, natureza, observacao)
where not exists (select 1 from finance.aportes where origem like 'DIGIAI OTICA E TECNOLOGIA LTDA%');
