-- 253 · Fôlego = o que está marcado MAIS o que está pronto para marcar
--
-- SEGUNDO CONSERTO DA MESMA CONTA EM UMA HORA, e o Orquestrador tinha razão das duas vezes.
--
--   · **A primeira versão** media só a biblioteca de artes e dizia "Bastidores, 0 dias" quando eles
--     tinham 157 peças na fila. Invertido.
--   · **A segunda** media só a fila e dizia "Lancaster, 0,2 dia, fila baixa". Também falso, e por um
--     motivo que só se vê medindo o MOTOR: a Lancaster é agendada **3,5 horas antes** da hora de sair
--     (mediana de 119 jobs em 30 dias; 90% até 11,5 h) e a Mello 8,5 h. **Fila com data perto de zero
--     é o funcionamento normal delas** — o robô tira da biblioteca e agenda no próprio dia. Já a OSI
--     nasce 44 h antes e a Pessoal 113 h.
--
-- A pergunta certa não é "quanto está marcado" nem "quanto está pronto", é: **se ninguém fizer nada,
-- até quando esta marca continua saindo?** São as duas parcelas somadas:
--
--     fôlego = dias até a última saída marcada  +  biblioteca pronta ÷ ritmo por dia
--
-- As duas parcelas ficam à vista com o nome delas, porque pedem ações diferentes: a primeira acaba e
-- alguém tem de **agendar**; a segunda acaba e alguém tem de **produzir**.

begin;

drop view if exists public.v_mkt_estoque_marca;
create view public.v_mkt_estoque_marca with (security_invoker = true) as
with fila as (
  select marca,
         count(*) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())::int as na_fila,
         count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int                     as publicadas_7d,
         max(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())    as ultima_marcada
    from public.v_lousa group by 1
), biblioteca as (
  select b.code as marca, count(*)::int as artes_prontas
    from mkt.assets a join mkt.brands b on b.id = a.brand_id
   where a.status = 'a_postar' group by 1
), marcas as (select marca from fila union select marca from biblioteca)
select
  m.marca,
  coalesce(b2.name, initcap(m.marca))                                   as marca_nome,
  b2.accent_hex,
  coalesce(f.na_fila, 0)                                                as na_fila,
  coalesce(bi.artes_prontas, 0)                                         as artes_prontas,
  coalesce(f.publicadas_7d, 0)                                          as publicadas_7d,
  round(coalesce(f.publicadas_7d, 0) / 7.0, 2)                          as ritmo_medido,
  f.ultima_marcada,
  case when coalesce(f.publicadas_7d, 0) > 0 then 'medido' else null end as ritmo_de,
  -- parcela 1: até quando já há data marcada
  greatest(0, ((f.ultima_marcada at time zone 'America/Sao_Paulo')::date
               - (now() at time zone 'America/Sao_Paulo')::date))::numeric as dias_marcados,
  -- parcela 2: quanto a biblioteca aguenta no ritmo medido
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(coalesce(bi.artes_prontas, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end                                                     as dias_biblioteca,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(greatest(0, ((f.ultima_marcada at time zone 'America/Sao_Paulo')::date
                               - (now() at time zone 'America/Sao_Paulo')::date))::numeric
                  + coalesce(bi.artes_prontas, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end                                                     as dias_de_estoque
from marcas m
left join fila f on f.marca = m.marca
left join biblioteca bi on bi.marca = m.marca
left join mkt.brands b2 on b2.code = m.marca
where coalesce(f.na_fila,0) + coalesce(bi.artes_prontas,0) + coalesce(f.publicadas_7d,0) > 0;

comment on view public.v_mkt_estoque_marca is
  'Folego por marca = dias ate a ultima saida marcada + biblioteca pronta / ritmo medido. As duas '
  'parcelas vem separadas porque pedem acoes diferentes: agendar e produzir. Fila curta NAO e alarme '
  'por si: a Lancaster e agendada 3,5h antes de sair, por desenho do motor.';

grant select on public.v_mkt_estoque_marca to authenticated;

do $$
declare v_lanc numeric; v_bast numeric; v_soma numeric;
begin
  -- 1. O falso alarme de uma hora atrás sumiu: a Lancaster tem biblioteca e fôlego real.
  select dias_de_estoque into v_lanc from public.v_mkt_estoque_marca where marca='lancaster';
  if v_lanc is null or v_lanc < 7 then
    raise exception 'PROVA 1 FALHOU: lancaster de volta a % dias, com 134 artes prontas', v_lanc;
  end if;

  -- 2. E o falso alarme da versão anterior continua morto: os Bastidores têm data marcada à frente.
  select dias_de_estoque into v_bast from public.v_mkt_estoque_marca where marca='bastidores';
  if coalesce(v_bast, 0) <= 0 then
    raise exception 'PROVA 2 FALHOU: bastidores sem fôlego, tendo fila até o fim do mês';
  end if;

  -- 3. A soma é mesmo a soma: nenhuma marca com total diferente das duas parcelas.
  select count(*) into v_soma from public.v_mkt_estoque_marca
   where dias_de_estoque is not null
     and abs(dias_de_estoque - (dias_marcados + coalesce(dias_biblioteca,0))) > 0.11;
  if v_soma > 0 then raise exception 'PROVA 3 FALHOU: % marca(s) com total que não bate com as parcelas', v_soma; end if;

  raise notice 'provas ok (lancaster % dias, bastidores %)', v_lanc, v_bast;
end $$;

commit;
