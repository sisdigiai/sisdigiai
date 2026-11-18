-- 251 · Fôlego é o que está NA FILA, não o que está na biblioteca
--
-- ERRO MEU, achado pelo Orquestrador na tela 40 minutos antes de o dono a abrir — e a minha leitura
-- estava EXATAMENTE INVERTIDA:
--
--   · eu dizia "Bastidores DIGIAI: 0 dias de fôlego, produzir antes das outras". **Medido na Lousa:
--     77 peças na fila do canal 1 e 80 do canal 2, marcadas até 28 e 30/11.** Eu mandaria o MKT
--     produzir para quem está mais abastecido da casa.
--   · eu dizia "Lancaster: 30,3 dias". **Medido: 1 peça na fila, publicando 31 por semana.** O alarme
--     de verdade estava pintado de verde.
--   · eu dizia "PULSO: não publicou nesta semana". **Medido: 42 publicadas em 7 dias.**
--
-- A CAUSA: eu media `mkt.assets` com status `a_postar` — que é **biblioteca de arte**, não fila. Arte
-- pode estar pronta e nunca agendada; e peça pode estar agendada sem passar por ali (as do Cortes
-- entram pela Lousa). Biblioteca e fila são coisas diferentes, e eu chamei uma pela outra.
--
-- AGORA: **fôlego = peças marcadas para o futuro ÷ ritmo medido**, lido da Lousa, que é onde a agenda
-- da casa inteira vive. A biblioteca continua à vista, com o nome dela — arte pronta sem agenda é
-- matéria-prima, e serve para outra decisão.

begin;

drop view if exists public.v_mkt_estoque_marca;

create view public.v_mkt_estoque_marca with (security_invoker = true) as
with fila as (
  select marca,
         count(*) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())::int as na_fila,
         count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int                     as publicadas_7d,
         max(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())    as ultima_marcada
    from public.v_lousa
   group by 1
), biblioteca as (
  select b.code as marca, count(*)::int as artes_prontas
    from mkt.assets a join mkt.brands b on b.id = a.brand_id
   where a.status = 'a_postar' group by 1
), marcas as (
  select marca from fila union select marca from biblioteca
)
select
  m.marca,
  coalesce(b2.name, initcap(m.marca))                              as marca_nome,
  b2.accent_hex,
  coalesce(f.na_fila, 0)                                           as na_fila,
  coalesce(bi.artes_prontas, 0)                                    as artes_prontas,
  coalesce(f.publicadas_7d, 0)                                     as publicadas_7d,
  round(coalesce(f.publicadas_7d, 0) / 7.0, 2)                     as ritmo_medido,
  f.ultima_marcada,
  case when coalesce(f.publicadas_7d, 0) > 0 then 'medido' else null end as ritmo_de,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(coalesce(f.na_fila, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end                                               as dias_de_estoque
from marcas m
left join fila f        on f.marca = m.marca
left join biblioteca bi on bi.marca = m.marca
left join mkt.brands b2 on b2.code = m.marca;

comment on view public.v_mkt_estoque_marca is
  'Folego por marca: pecas MARCADAS para o futuro (fila da Lousa) dividido pelo ritmo medido de 7 '
  'dias. `artes_prontas` e a biblioteca do MKT (arte sem agenda) e NAO entra no folego: biblioteca e '
  'fila sao coisas diferentes, e troca-las inverteu a leitura em 18/11.';

grant select on public.v_mkt_estoque_marca to authenticated;

do $$
declare v_bast int; v_lanc numeric; v_pulso int;
begin
  -- 1. O caso que motivou a migration: Bastidores tem fila, e fila não é zero.
  select na_fila into v_bast from public.v_mkt_estoque_marca where marca = 'bastidores';
  if coalesce(v_bast, 0) = 0 then
    raise exception 'PROVA 1 FALHOU: bastidores voltou a aparecer sem fila';
  end if;

  -- 2. O alarme de verdade aparece: marca que publica muito e tem pouca fila tem pouco fôlego.
  select dias_de_estoque into v_lanc from public.v_mkt_estoque_marca where marca = 'lancaster';
  if v_lanc is null or v_lanc > 7 then
    raise exception 'PROVA 2 FALHOU: lancaster com % dias, e tem 1 peça na fila', v_lanc;
  end if;

  -- 3. O Pulso publica, e a conta tem de enxergar isso (antes vinha só do MKT e dava zero).
  select publicadas_7d into v_pulso from public.v_mkt_estoque_marca where marca = 'pulso';
  if coalesce(v_pulso, 0) = 0 then
    raise exception 'PROVA 3 FALHOU: o pulso voltou a aparecer sem publicações';
  end if;

  -- 4. Marca sem ritmo não ganha fôlego — nulo é "não dá para saber", nunca infinito.
  if exists (select 1 from public.v_mkt_estoque_marca where ritmo_de is null and dias_de_estoque is not null) then
    raise exception 'PROVA 4 FALHOU: fôlego sem ritmo';
  end if;

  raise notice 'as 4 provas passaram (bastidores % na fila, lancaster % dias, pulso % publicadas)', v_bast, v_lanc, v_pulso;
end $$;

commit;
