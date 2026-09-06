-- 091 — ops.*: dizer o que se quis (2026-09-06, portão 28 da ordem do dia)
-- Achado do orquestrador do app digiai: 4 tabelas de ops com RLS ligada e ZERO policies
-- (contas_servicos, empresas, scorecard_entries, scorecard_metrics) e 2 com RLS DESLIGADA
-- (plataformas, servicos) — todas sem grant a anon/authenticated/PUBLIC, lidas só por views
-- SECURITY DEFINER de public (owner postgres) e por service_role. Fechadas por acidente:
-- o próximo "GRANT ALL ON ALL TABLES" (o mesmo que produziu as 145 views) abriria as 4 e as 2.
-- Conserto = declarar a intenção onde o próximo agente vai ler (catálogo), sem mudar
-- comportamento: RLS ligada nas 2 que não tinham (owner/definer bypassa; ninguém mais tem
-- grant) + comment on table nas 6. Zero policy É a política: acesso direto negado a todo papel.
-- Idempotente. Escopo: só ops.* (escrita de ops é do orquestrador geral — handoff 02/09).
do $$
declare t text;
begin
  foreach t in array array['contas_servicos','empresas','scorecard_entries','scorecard_metrics','plataformas','servicos'] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ops' and c.relname=t and c.relkind='r') then
      execute format('alter table ops.%I enable row level security', t);
    end if;
  end loop;
end $$;

comment on table ops.contas_servicos is 'Inventário de contas/serviços: onde está, quem é o dono, quando vence, em qual navegador abrir. NUNCA guarda segredo — só secret_ref (nome no Vault). CHECK contas_servicos_sem_segredo recusa valores com cara de credencial. ACESSO: RLS ligada SEM policy de propósito (2026-09-06, portão 28) — nenhum papel lê/escreve direto; leitura só por view SECURITY DEFINER em public (v_ops_contas_servicos) e escrita só por service_role/orquestrador. Não conceder GRANT direto: o RLS sem policy nega tudo e é assim que deve ficar.';
comment on table ops.empresas is 'FONTE UNICA dos CNPJs do grupo (decisao do dono, 05/09/2026). Documento nao e fonte: Cockpit/EMPRESA.md, inventario.md e os portfolios da Meta ESPELHAM esta tabela. Quando divergirem, esta tabela vence. Historico das 7 PJs anteriores (uma por loja) preservado em ADR-0044. ACESSO: RLS ligada SEM policy de propósito (2026-09-06, portão 28) — leitura só por view definer em public; escrita só por service_role/orquestrador. Não conceder GRANT direto.';
comment on table ops.scorecard_entries is 'Lançamentos do scorecard semanal. ACESSO: RLS ligada SEM policy de propósito (2026-09-06, portão 28) — leitura só por v_ops_scorecard (definer); escrita só por service_role/cron. Não conceder GRANT direto.';
comment on table ops.scorecard_metrics is 'Métricas do scorecard semanal. ACESSO: RLS ligada SEM policy de propósito (2026-09-06, portão 28) — leitura só por v_ops_scorecard (definer); escrita só por service_role. Não conceder GRANT direto.';
comment on table ops.plataformas is 'Lista canônica de plataformas de publicação, conciliada entre digiai e digiai_mkt em 2026-08-28. Escrita pelo digiai, lida pelo MKT por view. ACESSO: RLS ligada SEM policy de propósito (2026-09-06, portão 28) — leitura só por v_ops_plataformas (definer); escrita só por service_role/orquestrador. Não conceder GRANT direto.';
comment on table ops.servicos is 'Vocabulário fechado de ops.contas_servicos.servico. Crescer é INSERT, não migration de schema. ACESSO: RLS ligada SEM policy de propósito (2026-09-06, portão 28) — leitura só por v_ops_servicos (definer); escrita só por service_role/orquestrador. Não conceder GRANT direto.';
