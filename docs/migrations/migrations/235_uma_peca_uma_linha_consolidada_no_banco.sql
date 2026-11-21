-- Conserto de desempenho da v_mkt_peca_consolidada, medido no ar logo depois de subir: a view
-- levava 8,4 s para chegar na tela.
--
-- A CULPA ERA MINHA, e era de livro: o casamento com a publicação estava em LATERAL com
-- `pb.id::text = p.peca_ref`. Cast do lado da coluna mata o índice, então era uma varredura das
-- 3.072 publicações para CADA uma das 1.112 peças — 3,4 milhões de comparações para achar uma data.
-- Agora a tabela de publicações é lida UMA vez, vira um mapa (id e corte_peca_id apontando para a
-- mesma linha) e o casamento é um hash join.
create or replace view public.v_mkt_peca_consolidada
with (security_invoker = true) as
with por_peca as (
  select
    l.origem,
    l.marca,
    l.conta,
    l.rede,
    l.peca_ref,
    max(l.tipo)                                                                   as tipo,
    count(*)::int                                                                 as leituras,
    min(l.data)                                                                   as primeira_leitura,
    max(l.data)                                                                   as ultima_leitura,
    (array_agg(l.views                order by l.data desc) filter (where l.views is not null))[1]                as views,
    (array_agg(l.curtidas             order by l.data desc) filter (where l.curtidas is not null))[1]             as curtidas,
    (array_agg(l.comentarios          order by l.data desc) filter (where l.comentarios is not null))[1]          as comentarios,
    (array_agg(l.compartilhamentos    order by l.data desc) filter (where l.compartilhamentos is not null))[1]    as compartilhamentos,
    (array_agg(l.retencao_media_pct   order by l.data desc) filter (where l.retencao_media_pct is not null))[1]   as retencao_media_pct,
    (array_agg(l.horas_exibicao       order by l.data desc) filter (where l.horas_exibicao is not null))[1]       as horas_exibicao,
    (array_agg(l.link                 order by l.data desc) filter (where l.link is not null))[1]                 as link,
    (array_agg(l.conta_nome           order by l.data desc) filter (where l.conta_nome is not null))[1]           as conta_nome
  from public.v_mkt_analytics_peca_dia l
  group by l.origem, l.marca, l.conta, l.rede, l.peca_ref
),
refs as (
  select pb.id::text as ref, pb.published_at,
         ((pb.metadata ->> 'excluido_em') is not null
           or coalesce((pb.metadata ->> 'teste_de_conexao')::boolean, false)) as apagada
  from mkt.publications pb
  union all
  select pb.metadata ->> 'corte_peca_id', pb.published_at,
         ((pb.metadata ->> 'excluido_em') is not null
           or coalesce((pb.metadata ->> 'teste_de_conexao')::boolean, false))
  from mkt.publications pb
  where coalesce(pb.metadata ->> 'corte_peca_id', '') <> ''
),
pub as (
  select distinct on (ref) ref, published_at, apagada
  from refs
  order by ref, published_at
)
select
  p.*,
  pub.published_at as publicada_em,
  coalesce(pub.apagada, false) as apagada,
  -- A data que cada tela usa para recortar. Quando a peça casa com uma publicação, vale a data de
  -- PUBLICAÇÃO; quando não casa (corte que saiu em conta do Pulso, sem registro aqui), vale a
  -- primeira leitura — é aproximação, e a tela diz isso.
  coalesce(pub.published_at::date, p.primeira_leitura) as dia_publicacao,
  (pub.published_at is null) as publicacao_estimada
from por_peca p
left join pub on pub.ref = p.peca_ref;

comment on view public.v_mkt_peca_consolidada is
  'Uma peça, uma linha: última leitura de cada campo (leitura_dia guarda acumulado) + data de publicação. Regra igual à de lib/leituraPorPeca.ts, feita uma vez no banco. 21/11/2026.';

grant select on public.v_mkt_peca_consolidada to authenticated;
