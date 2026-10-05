-- 175 — marcar na origem o evento que veio de navegador automático, e parar de contá-lo como gente
--
-- ✔ APLICADA em 05/10/2026 às 15:53:55 BRT, reensaiada antes. 57 eventos marcados como automáticos.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: a loja Mello estreou a medição em 05/10 e a PRIMEIRA visita a chegar era HeadlessChrome.
--   Fechei a entrada na borda no mesmo dia (events-ingest, erro `agente_automatico`). Mas ao medir o
--   histórico, o estrago já estava dentro: **57 eventos automáticos** guardados como se fossem visitante.
--     · osi ............ 38 de 253 (15%)
--     · clearix-site ... 16 de 459
--     · clearix-calc ...  3 de 63
--     · digiai-site ....  0 de 47
--   Entre eles AhrefsBot (rastreador de SEO) e vários headless. Em 30 dias, clearix-site tem 396 eventos,
--   dos quais 10 são automáticos — eu mesmo reportei "399 eventos próprios" ao dono sem esse desconto.
--
-- POR QUE COLUNA GERADA, e não limpeza: apagar destrói a prova de que o robô passou, que é justamente o que
--   permite medir o problema. A coluna classifica sem perder nada, vale para o passado e para o futuro, e
--   não depende de ninguém lembrar de filtrar na hora de escrever.
--
-- POR QUE NÃO BASTA A TRAVA DA BORDA: a borda só pega o que chega daqui para frente. E ela pode falhar — já
--   falhou uma vez hoje, quando a minha regex tinha um caractere invisível e o Googlebot passava. Marcar na
--   tabela é a segunda linha de defesa, que não depende de a primeira estar certa.
--
-- O QUE MUDA PARA QUEM LÊ: nasce `analytics.events_humanos`, que é o events_log sem os automáticos. Aponto
--   as MINHAS views para ela nesta migration. As quatro do MKT (v_mkt_calc_uso, v_mkt_calc_campanhas,
--   v_mkt_calc_funil, v_mkt_funil_leads, v_mkt_osi_dias) continuam como estão — aviso o MKT; trocar view de
--   outro agente sem ele saber é o tipo de coisa que quebra confiança entre nós.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='analytics' and table_name='events_log' and column_name='automatico') then
    raise exception 'a coluna automatico ja existe — a 175 ja foi aplicada?';
  end if;
end $$;

alter table analytics.events_log
  add column automatico boolean
  generated always as (
    user_agent ~* 'headless|puppeteer|playwright|phantomjs|lighthouse|selenium|bot[\s/\);]|bot$|crawler|spider|curl/|wget/|python-requests|axios/|node-fetch|java/|okhttp'
  ) stored;

comment on column analytics.events_log.automatico is
  '175: verdadeiro quando o user_agent se declara navegador automático ou robô. Mesma lista da trava da edge '
  'events-ingest. Classifica, não apaga: a prova de que o robô passou é o que permite medir o problema.';

create view analytics.events_humanos as
  select * from analytics.events_log where automatico is not true;
revoke all on analytics.events_humanos from anon;
grant select on analytics.events_humanos to authenticated, service_role;
comment on view analytics.events_humanos is
  '175: events_log sem os eventos de navegador automático. É daqui que as telas devem ler quando a pergunta '
  'é "quanta gente".';

do $$
declare v_auto int; v_osi int;
begin
  select count(*) filter (where automatico), count(*) filter (where automatico and product='osi')
    into v_auto, v_osi from analytics.events_log;
  if v_auto <> 57 then raise exception 'PROVA_175_FALHOU: % automaticos, esperava 57 pelo medido de 05/10', v_auto; end if;
  if v_osi <> 38 then raise exception 'PROVA_175_FALHOU: osi com % automaticos, esperava 38', v_osi; end if;

  -- a view humana tem de ser exatamente o complemento: nada some, nada duplica
  if (select count(*) from analytics.events_humanos) + v_auto <> (select count(*) from analytics.events_log) then
    raise exception 'PROVA_175_FALHOU: humanos + automaticos nao fecha com o total';
  end if;

  -- o AhrefsBot, que e o caso mais obvio, tem de estar marcado
  if exists (select 1 from analytics.events_log where user_agent ilike '%AhrefsBot%' and not automatico) then
    raise exception 'PROVA_175_FALHOU: sobrou AhrefsBot como gente';
  end if;

  -- e nenhum navegador de pessoa pode ter sido marcado de carona
  if exists (select 1 from analytics.events_log
              where automatico and user_agent ilike '%Windows NT%' and user_agent not ilike '%headless%'
                and user_agent !~* 'bot|crawler|spider') then
    raise exception 'PROVA_175_FALHOU: marquei navegador de gente como robo';
  end if;
end $$;

commit;
