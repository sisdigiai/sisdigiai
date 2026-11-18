-- 256 · A última saída conta também o que a Meta publica do agendador
--
-- O ALARME FALSO QUE ISTO MATA: a tela marcava a Ótica Sem Improviso como **crítica, "facebook parado
-- há 6 dias"**, e a conta tinha publicado naquele mesmo dia às 16h05. O MKT conferiu no ar e confirmou.
--
-- A CAUSA, e é de leitura minha: eu lia a última saída só da Lousa, que mostra o que a **fábrica**
-- solta. O que o dono agenda no **Planner da Meta** sai pela Meta, sem passar pelo motor — e aparece
-- em `mkt.publications`. Lendo só uma das duas, **qualquer conta com agendamento no Planner aparece
-- parada para sempre**, e o alarme de rede parada perde o sentido.
--
-- As duas fontes estão certas cada uma no seu pedaço; errado era eu tomar uma pela casa inteira.

begin;

drop view if exists public.v_mkt_controle_marca_rede;

create view public.v_mkt_controle_marca_rede with (security_invoker = true) as
with lousa as (
  select
    marca, rede,
    count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int as publicadas_7d,
    count(*) filter (where estado = 'publicado'
                       and (quando at time zone 'America/Sao_Paulo')::date
                           = (now() at time zone 'America/Sao_Paulo')::date)::int            as publicadas_hoje,
    max(coalesce(saiu_em, quando)) filter (where estado = 'publicado'
                                             and coalesce(saiu_em, quando) <= now())         as saida_fabrica,
    count(*) filter (where estado in ('agendado','planejado','no_planner','rascunho')
                       and quando >= now())::int                                             as na_fila,
    min(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho')
                       and quando >= now())                                                  as proxima_saida,
    max(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho')
                       and quando >= now())                                                  as ultima_marcada,
    count(*) filter (where estado = 'falhou'
                       and (quando at time zone 'America/Sao_Paulo')::date
                           = (now() at time zone 'America/Sao_Paulo')::date)::int            as falhou_hoje
  from public.v_lousa
  where marca is not null and rede is not null
  group by 1, 2
), meta as (
  -- O que a Meta já soltou do agendador. `published_at` no futuro é agendamento, não publicação:
  -- fica de fora até a hora chegar (são 58 linhas assim hoje, e o MKT separa isso no dado até 20/11).
  select lower(b.code) as marca, lower(p.platform) as rede,
         max(p.published_at) as saida_meta,
         count(*) filter (where p.published_at > now() - interval '7 days')::int as pub_7d_meta
    from mkt.publications p
    join mkt.brands b on b.id = p.brand_id
   where p.published_at is not null and p.published_at <= now() and p.platform is not null
   group by 1, 2
), juntas as (
  select coalesce(l.marca, m.marca) as marca, coalesce(l.rede, m.rede) as rede,
         greatest(coalesce(l.publicadas_7d, 0), coalesce(m.pub_7d_meta, 0))   as publicadas_7d,
         coalesce(l.publicadas_hoje, 0)                                       as publicadas_hoje,
         greatest(l.saida_fabrica, m.saida_meta)                              as ultima_saida,
         coalesce(l.na_fila, 0)                                               as na_fila,
         l.proxima_saida, l.ultima_marcada,
         coalesce(l.falhou_hoje, 0)                                           as falhou_hoje
    from lousa l
    full join meta m on m.marca = l.marca and m.rede = l.rede
)
select j.*,
       case when j.ultima_saida is null then null
            else floor(extract(epoch from (now() - j.ultima_saida)) / 86400)::int end as dias_sem_sair
from juntas j
where j.ultima_saida is not null or j.na_fila > 0;

comment on view public.v_mkt_controle_marca_rede is
  'Uma linha por marca e rede. A ultima saida considera as DUAS fontes: o que a fabrica solta (Lousa) '
  'e o que a Meta publica do agendador (mkt.publications). Ler so uma faz conta com Planner aparecer '
  'parada para sempre -- foi o alarme falso da OSI em 18/11.';

grant select on public.v_mkt_controle_marca_rede to authenticated;

do $$
declare v_dias int; v_n int;
begin
  -- 1. O caso que motivou: a OSI no facebook publicou hoje, logo não está parada.
  select dias_sem_sair into v_dias from public.v_mkt_controle_marca_rede
   where marca = 'osi' and rede = 'facebook';
  if coalesce(v_dias, 99) > 1 then
    raise exception 'PROVA 1 FALHOU: osi/facebook ainda aparece parada há % dias', v_dias;
  end if;

  -- 2. Nenhuma saída no futuro: agendamento da Meta não conta como publicação.
  select count(*) into v_n from public.v_mkt_controle_marca_rede where ultima_saida > now();
  if v_n > 0 then raise exception 'PROVA 2 FALHOU: % linha(s) com saída no futuro', v_n; end if;

  -- 3. Nenhuma linha vazia e nenhuma idade impossível.
  select count(*) into v_n from public.v_mkt_controle_marca_rede
   where (ultima_saida is null and na_fila = 0) or dias_sem_sair < 0;
  if v_n > 0 then raise exception 'PROVA 3 FALHOU: % linha(s) impossíveis', v_n; end if;

  raise notice 'provas ok (osi/facebook há % dia(s))', v_dias;
end $$;

commit;
