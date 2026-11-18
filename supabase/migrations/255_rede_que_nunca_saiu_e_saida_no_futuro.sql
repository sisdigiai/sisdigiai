-- 255 · A rede que nunca saiu não vira linha, e a última saída não pode estar no futuro
--
-- DOIS ACHADOS DO ORQUESTRADOR na tela das 16h19:
--
--  1. **"Mello, última saída 18/11 19:00" às 16h19.** A coluna usava a hora marcada quando não há hora
--     real, e há uma peça do MKT publicada ANTES do slot: ela já saiu, mas a única hora que eu conheço
--     dela está no futuro. Anunciar isso como "última saída" é afirmar o que eu não sei. Agora só
--     entram peças cuja hora conhecida já passou — a peça adiantada volta a contar quando a hora dela
--     chegar, e até lá não define a última saída de ninguém.
--
--  2. **Rede que nunca publicou virava linha "— — 0 0"**, ocupando espaço no cartão e sugerindo que
--     havia algo a conferir. Rede sem saída nenhuma e sem fila não é informação: é ruído.
--
-- E uma coluna nova, para o critério de alarme sair do "sem próxima marcada" (que alarmava a Lancaster
-- com 30 dias de fôlego, porque ela é agendada no próprio dia): **há quantos dias essa rede não sai**.

begin;

drop view if exists public.v_mkt_controle_marca_rede;

create view public.v_mkt_controle_marca_rede with (security_invoker = true) as
with base as (
  select
    marca, rede,
    count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int as publicadas_7d,
    count(*) filter (where estado = 'publicado'
                       and (quando at time zone 'America/Sao_Paulo')::date
                           = (now() at time zone 'America/Sao_Paulo')::date)::int            as publicadas_hoje,
    -- Só o que já aconteceu: hora real quando existe, marcada quando não, e nunca o futuro.
    max(coalesce(saiu_em, quando)) filter (where estado = 'publicado'
                                             and coalesce(saiu_em, quando) <= now())         as ultima_saida,
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
)
select
  b.*,
  case when b.ultima_saida is null then null
       else floor(extract(epoch from (now() - b.ultima_saida)) / 86400)::int end as dias_sem_sair
from base b
-- Rede que nunca saiu e não tem nada marcado não é linha: é ruído no cartão.
where b.ultima_saida is not null or b.na_fila > 0;

comment on view public.v_mkt_controle_marca_rede is
  'Uma linha por marca e rede, com o que ja saiu, o que esta marcado e ha quantos dias a rede nao sai. '
  'A ultima saida nunca esta no futuro: peca publicada antes do slot nao define saida de ninguem ate '
  'a hora dela chegar. Rede que nunca saiu e nao tem fila nao aparece.';

grant select on public.v_mkt_controle_marca_rede to authenticated;

do $$
declare v_n int;
begin
  -- 1. Nenhuma saída no futuro — era o que o dono veria como "última saída 19:00" às 16h19.
  select count(*) into v_n from public.v_mkt_controle_marca_rede where ultima_saida > now();
  if v_n > 0 then raise exception 'PROVA 1 FALHOU: % rede(s) com última saída no futuro', v_n; end if;

  -- 2. Nenhuma linha vazia.
  select count(*) into v_n from public.v_mkt_controle_marca_rede
   where ultima_saida is null and na_fila = 0;
  if v_n > 0 then raise exception 'PROVA 2 FALHOU: % linha(s) sem saída e sem fila', v_n; end if;

  -- 3. A idade da última saída existe sempre que há saída, e nunca é negativa.
  select count(*) into v_n from public.v_mkt_controle_marca_rede
   where (ultima_saida is not null and dias_sem_sair is null) or dias_sem_sair < 0;
  if v_n > 0 then raise exception 'PROVA 3 FALHOU: % linha(s) com idade impossível', v_n; end if;

  raise notice 'provas ok';
end $$;

commit;
