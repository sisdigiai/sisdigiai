-- 068 — os tres agentes da frota entram na cadeia noturna
-- 04:20 aporte · 04:30 fatos · 04:40 ordem + os 3 agentes · 04:50 push pro GJ.
-- Ordem importa: os agentes medem ANTES da ordem nascer, para o dono ver o
-- resultado da vigilancia junto do que tem que fazer, nao em outra tela.

select cron.unschedule('ordem-do-dia-gerar');
select cron.schedule('ordem-do-dia-gerar','40 4 * * *',
  $$ select public.fn_gerar_ordem_do_dia();
     select public.fn_ordem_maquina_mkt(current_date);
     select public.fn_ordem_maquina_fatos(current_date);
     select public.fn_ordem_maquina_gate(current_date);
     select public.fn_ordem_sentinela(current_date); $$);
