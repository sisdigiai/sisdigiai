-- 183 — lote 2b: 7 views viram invoker, e 7 mudam de coluna porque invoker desfaria a R-044
--
-- ✔ APLICADA em 05/10/2026 às 16:46:53 BRT, reensaiada antes (e a 1.ª versão foi RECUSADA pelo ensaio, que
--   foi quem achou o 403 do grant). Depois: 33 → **26** donas. A coluna (A) fechou: as 10 que podiam virar
--   invoker viraram. **Falta a conferência na tela do dono** (R-005) — Inventário, Placar e Marketing.
--
-- (Escrita como NÃO APLICADA.)
--
-- O LOTE 2 ERA 17, VIROU 10. A correção veio do ensaio, não de mim: a primeira versão desta migration
--   incluía v_mkt_espelho, e o ensaio devolveu "permission denied for table ai_usage". Não é RLS: é GRANT.
--   `authenticated` não tem select em mkt.ai_usage — e isso é desenho, não falha (R-044: tabela nasce no
--   schema do domínio, `public` só recebe view). Invoker ali não devolveria vazio: devolveria 403.
--
-- OU SEJA: para 7 das 17, virar invoker exigiria dar a `authenticated` acesso direto à tabela de domínio —
--   trocar leitura ampla por um furo na R-044. Essas 7 mudam para a coluna (B): ficam donas de propósito, e
--   o que as protege é filtro explícito escrito nelas. A tabela do Cockpit vai corrigida.
--
--   sem grant em mkt.ai_usage            -> v_mkt_ai_custo, v_mkt_espelho
--   sem grant em ops.playbooks           -> v_playbooks, v_meeting_sessions
--   sem grant em ops.meeting_sessions    -> v_meeting_sessions
--   sem grant + RLS 0 policies em ops.scorecard_entries/_metrics -> v_ops_scorecard, v_ops_frescor
--   RLS 0 policies em ops.bairro_coordenada (grant existe)       -> v_ops_cobertura_aproximada
--
-- AS 7 QUE PASSAM: a base tem grant para `authenticated` E policy por papel. Com invoker, quem não tem o
--   papel para de ler, e quem tem continua.
--
-- O QUE EU PROVO E O QUE NÃO PROVO:
--   PROVO: que a RLS passou a valer — sessão `authenticated` sem JWT lê zero de v_ops_contas_servicos, que
--     antes lia tudo. E que nenhuma das 7 dá erro de permissão. Medição, não construção.
--   NÃO PROVO: que a sessão do dono continua lendo. `set role` não carrega JWT, então is_staff() responde
--     false para qualquer papel que eu finja. Verifiquei por CONSTRUÇÃO, lendo as funções e a linha dele:
--     is_staff() e pode_tocar_lead() leem iam.users por auth.uid(), e ele é super_admin ativo com auth_id
--     casando com 1 linha de auth.users. Construção forte, mas construção — a conferência na tela é do dono
--     (R-005), e está pedida.
--
--   DESFAZER, uma linha por view:  alter view public.<nome> set (security_invoker = false);

begin;

do $$
declare v_n int;
begin
  select count(*) into v_n from ops.v_views_sem_invoker
   where view in ('v_marketing_hotmart_sales','v_marketing_outreach','v_marketplace_webhook_status',
                  'v_ops_contas_servicos','v_ops_contas_custo','v_ops_scorecard_auto','v_ops_reconfirmar');
  if v_n <> 7 then raise exception 'esperava as 7 donas e achei % — a 183 ja foi aplicada?', v_n; end if;

  -- premissa 1: o dono passa nas funções de papel
  if not exists (select 1 from iam.users where email='junior@oticastatymello.com.br'
                   and role='super_admin' and status='active' and deleted_at is null and auth_id is not null) then
    raise exception 'a linha do dono no iam.users nao esta como eu medi — parar antes de filtrar as telas dele';
  end if;

  -- premissa 2: TODA base destas 7 tem grant para authenticated. Sem isto, invoker da 403 e nao vazio — foi
  -- o ensaio que me ensinou a checar antes, e a trava fica escrita para a proxima vez.
  if not (pg_catalog.has_table_privilege('authenticated','marketing.hotmart_sales','select')
      and pg_catalog.has_table_privilege('authenticated','marketing.outreach_schedule','select')
      and pg_catalog.has_table_privilege('authenticated','marketing.landing_leads','select')
      and pg_catalog.has_table_privilege('authenticated','marketing.hotmart_events_raw','select')
      and pg_catalog.has_table_privilege('authenticated','marketing.kiwify_events_raw','select')
      and pg_catalog.has_table_privilege('authenticated','billing.mp_events_raw','select')
      and pg_catalog.has_table_privilege('authenticated','ops.commercial_leads','select')
      and pg_catalog.has_table_privilege('authenticated','ops.contas_servicos','select')
      and pg_catalog.has_table_privilege('authenticated','ops.toque_venda','select')
      and pg_catalog.has_table_privilege('authenticated','ops.apps','select')
      and pg_catalog.has_table_privilege('authenticated','ops.decisions','select')
      and pg_catalog.has_table_privilege('authenticated','ops.estado_passada','select')
      and pg_catalog.has_table_privilege('authenticated','ops.pendencias_humanas','select')
      and pg_catalog.has_table_privilege('authenticated','finance.infra_costs','select')
      and pg_catalog.has_table_privilege('authenticated','mkt.publications','select')
      and pg_catalog.has_table_privilege('authenticated','mkt.osi_disparos','select')
      and pg_catalog.has_table_privilege('authenticated','public.v_ops_frescor','select')) then
    raise exception 'falta grant em alguma base das 7 — invoker daria 403, nao vazio';
  end if;
end $$;

alter view public.v_marketing_hotmart_sales    set (security_invoker = true);
alter view public.v_marketing_outreach         set (security_invoker = true);
alter view public.v_marketplace_webhook_status set (security_invoker = true);
alter view public.v_ops_contas_servicos        set (security_invoker = true);
alter view public.v_ops_contas_custo           set (security_invoker = true);
alter view public.v_ops_scorecard_auto         set (security_invoker = true);
alter view public.v_ops_reconfirmar            set (security_invoker = true);

-- as 7 que mudaram de coluna dizem por que ficam donas, para ninguém "consertar" o desenho depois
comment on view public.v_mkt_ai_custo is
  '183: fica DEFINER de propósito. Invoker aqui daria 403, não vazio: authenticated não tem grant em '
  'mkt.ai_usage, e isso é desenho (R-044 — tabela no schema do domínio, public só recebe view). O que '
  'protege esta view é filtro explícito escrito nela, não invoker.';
comment on view public.v_mkt_espelho is
  '183: fica DEFINER de propósito — mesmo motivo de v_mkt_ai_custo (sem grant em mkt.ai_usage, por R-044).';
comment on view public.v_playbooks is
  '183: fica DEFINER de propósito — authenticated não tem grant em ops.playbooks (R-044). Invoker daria 403.';
comment on view public.v_meeting_sessions is
  '183: fica DEFINER de propósito — sem grant em ops.playbooks nem ops.meeting_sessions (R-044).';
comment on view public.v_ops_scorecard is
  '183: fica DEFINER. ops.scorecard_entries e _metrics têm RLS ligada, ZERO policies e nenhum grant para '
  'authenticated: invoker esvaziaria o placar para todo mundo, inclusive o dono.';
comment on view public.v_ops_frescor is
  '183: fica DEFINER. Lê ops.scorecard_entries, que tem RLS sem policy e sem grant — invoker tiraria a linha '
  'do placar do frescor sem dar erro.';
comment on view public.v_ops_cobertura_aproximada is
  '183: fica DEFINER. ops.bairro_coordenada tem grant mas RLS ligada com ZERO policies — invoker devolveria '
  'zero ponto aproximado no mapa, calado. Se for para virar invoker, a policy vem primeiro.';

do $$
declare v_antes int; v_sem_jwt int; v_n int; v_nome text;
begin
  -- a) as 7 saíram da lista
  if exists (select 1 from ops.v_views_sem_invoker
              where view in ('v_marketing_hotmart_sales','v_marketing_outreach','v_marketplace_webhook_status',
                             'v_ops_contas_servicos','v_ops_contas_custo','v_ops_scorecard_auto',
                             'v_ops_reconfirmar')) then
    raise exception 'PROVA_183_FALHOU: alguma das 7 continua dona';
  end if;

  -- b) a RLS passou a valer, medido: dona lê tudo, sessão sem papel lê zero
  select count(*) into v_antes from public.v_ops_contas_servicos;
  if v_antes = 0 then raise exception 'PROVA_183_FALHOU: a view ja estava vazia, nao da para medir efeito'; end if;
  set local role authenticated;
  select count(*) into v_sem_jwt from public.v_ops_contas_servicos;
  reset role;
  if v_sem_jwt <> 0 then
    raise exception 'PROVA_183_FALHOU: sessao sem papel ainda le % de % linhas', v_sem_jwt, v_antes;
  end if;

  -- c) e NENHUMA das 7 da erro de permissao para authenticated — que e o modo de falha que o ensaio achou.
  --    Erro aqui sobe e derruba a migration, que e exatamente o que se quer.
  set local role authenticated;
  perform count(*) from public.v_marketing_hotmart_sales;
  perform count(*) from public.v_marketing_outreach;
  perform count(*) from public.v_marketplace_webhook_status;
  perform count(*) from public.v_ops_contas_custo;
  perform count(*) from public.v_ops_scorecard_auto;
  perform count(*) from public.v_ops_reconfirmar;
  reset role;

  -- d) as 7 que mudaram de coluna continuam donas E comentadas
  for v_nome in select unnest(array['v_mkt_ai_custo','v_mkt_espelho','v_playbooks','v_meeting_sessions',
                                    'v_ops_scorecard','v_ops_frescor','v_ops_cobertura_aproximada'])
  loop
    if not exists (select 1 from ops.v_views_sem_invoker where view = v_nome) then
      raise exception 'PROVA_183_FALHOU: % virou invoker e daria 403 ou vazio', v_nome;
    end if;
    if (select obj_description(('public.'||v_nome)::regclass,'pg_class')) not ilike '%DEFINER%' then
      raise exception 'PROVA_183_FALHOU: % ficou dona sem dizer por que', v_nome;
    end if;
  end loop;

  select count(*) into v_n from ops.v_views_sem_invoker;
  if v_n <> 26 then raise exception 'PROVA_183_FALHOU: esperava 26 donas restantes e achei %', v_n; end if;
end $$;

commit;
