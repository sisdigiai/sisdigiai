-- FATOS publicáveis — fonte única de verdade pra IA do MKT citar em publicações.
-- As travas por marca (mkt.content_rules) já proíbem "citar número fora dos FATOS";
-- esta tabela é onde os FATOS moram: cada um com fonte, data de verificação e validade.
-- Regra de consumo: a IA SÓ pode citar fatos com fresco = true. Fato vencido = silêncio.
-- Curadoria: digiai (cérebro). Números vivos de Pulso/Limelight: ler também os
-- endpoints v_espelho_pulso / v_espelho_limelight (bancos próprios, anon read).

create table if not exists mkt.fatos (
  id uuid primary key default gen_random_uuid(),
  brand_slug text,                       -- null = vale pra qualquer marca
  chave text unique not null,
  fato text not null,                    -- frase pronta, do jeito que pode ser citada
  valor_numerico numeric,
  fonte text not null,                   -- de onde saiu (view/api/verificação manual)
  verificado_em date not null,
  validade_dias int not null default 30,
  publico boolean not null default true, -- false = uso interno, IA não cita
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mkt.fatos enable row level security;

insert into mkt.fatos (brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico) values
  ('pulso',  'pulso_views_total',
   'O canal PULSO acumula 289,5 mil visualizações em 475 publicações distribuídas em 5 plataformas (YouTube, TikTok, Instagram, Facebook e Kwai).',
   289528, 'v_espelho_pulso (banco Pulso — coleta automática diária 11h; nº vivo: ler a view)', '2026-07-31', 7, true),
  ('pulso',  'pulso_youtube_crescimento',
   'O canal PULSO no YouTube tem 223 inscritos, com +114 novos nos últimos 28 dias e 21,7 mil visualizações no período.',
   223, 'YouTube Studio (verificação direta na fonte)', '2026-07-31', 7, true),
  ('mello',  'mello_serie_no_ar',
   'A série "Transforme Sua Visão" da Mello Óticas está no ar, com episódios produzidos com apoio de IA (roteiro, imagem e áudio) e publicação com curadoria humana.',
   null, 'limelight_medicao.fila_publicacao (12 publicados, último 28/07)', '2026-07-31', 14, true),
  ('digiai', 'digiai_custo_roteiro',
   'O motor de conteúdo da DIGIAI produz um roteiro completo de episódio por cerca de US$ 0,006 (menos de 4 centavos de real).',
   0.006, 'limelight_fabrica.custos (ledger real por execução)', '2026-07-31', 30, true),
  ('clearix', 'clearix_suite_producao',
   'O Clearix é uma suíte de 17 aplicativos integrados para varejo óptico, rodando em produção real.',
   17, 'Central Clearix (tenants ativos verificados no banco de produção)', '2026-07-30', 30, true),
  ('osi',    'osi_oferta',
   'O Ótica Sem Improviso é o método em 5 movimentos da DIGIAI Academy: ebook + manual digital por R$ 48,50, disponível na Hotmart e na Kiwify.',
   48.50, 'academy.products + checkout Hotmart/Kiwify (preço reconciliado)', '2026-07-13', 60, true),
  ('digiai', 'digiai_portfolio',
   'A DIGIAI opera 18 frentes de produto com painel operacional próprio, telemetria first-party e agentes de IA no dia a dia.',
   18, 'Portfólio do painel (app.digiai.app.br) — cada frente com data de verificação', '2026-07-31', 30, true)
on conflict (chave) do nothing;

-- View de consumo: a IA do MKT lê daqui. fresco = pode citar; vencido = não usar.
create or replace view public.v_mkt_fatos as
select
  brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico,
  (verificado_em + validade_dias) as valido_ate,
  (current_date <= verificado_em + validade_dias) as fresco
from mkt.fatos
where ativo
order by brand_slug nulls last, chave;

grant select on public.v_mkt_fatos to authenticated;

-- Atualização de fato (re-verificação) — staff only, mesmo padrão da casa
create or replace function public.fn_mkt_fato_reverificar(
  p_chave text,
  p_fato text default null,
  p_valor numeric default null,
  p_verificado_em date default current_date
) returns void
language plpgsql
security definer
set search_path = public, mkt
as $$
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  update mkt.fatos
     set fato = coalesce(p_fato, fato),
         valor_numerico = coalesce(p_valor, valor_numerico),
         verificado_em = p_verificado_em,
         updated_at = now()
   where chave = p_chave and ativo;
  if not found then raise exception 'fato_desconhecido: %', p_chave; end if;
end;
$$;

revoke all on function public.fn_mkt_fato_reverificar(text, text, numeric, date) from public, anon;
grant execute on function public.fn_mkt_fato_reverificar(text, text, numeric, date) to authenticated;
