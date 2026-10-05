-- 187 — lote 3: a view de lead do MKT passa a respeitar a RLS
--
-- ✔ APLICADA em 05/10/2026 às 18:08:19 BRT, reensaiada antes. 23 → **22** donas. Sessão sem papel lê **0**
--   leads; como dona continua lendo todos. O MKT confere `/oticas` no navegador.
--
-- (Escrita como NÃO APLICADA.)
--
-- O QUE ERA: `public.v_mkt_vendas_leads` rodava como dona e devolvia `phone_e164`, `name` e `contact` de
--   todo lead, **sem filtro de papel nenhum**. Qualquer `authenticated` lia a base inteira. Era a view com
--   dado de pessoa mais aberta que sobrou da varredura de 05/10.
--
-- PEDI ANTES DE MEXER, porque a view é consumida por outro app (regra R-045 / §2-A do AGENTS): o agente do
--   MKT lê esta view no `Oticas.tsx` e no `LeadPagina.tsx`. Resposta dele, 05/10: **pode virar invoker** — e
--   com um argumento melhor que o meu: a regra de vendas do MKT **já depende de `iam.users`**, porque
--   `mkt.is_admin_ou_vendas()` é `contexto_privilegiado() OR public.pode_tocar_lead()`. Quem não passa em
--   `pode_tocar_lead()` já não vê lead em `/conversas` nem em `/vendas`. A view passa a seguir a mesma regra,
--   sem divergência nova. Ele confere `/oticas` no navegador depois.
--
-- POR QUE INVOKER E NÃO FILTRO ESCRITO: a base `ops.commercial_leads` tem grant para `authenticated` E policy
--   `pode_tocar_lead()`. Quando a base já sabe se proteger, invoker é a resposta — escrever o filtro de novo
--   dentro da view seria manter a mesma regra em dois lugares, e um dia os dois divergem.
--
-- INVOKER NA DEFINIÇÃO, não em `alter view` depois: R-043 §4-B, ratificada pelo dono em 05/10. A regra nasceu
--   do meu erro de hoje — `create or replace view` apagou em silêncio o invoker que um `alter view` tinha
--   posto uma hora antes.
--
-- ⚠ ISTO SÓ FECHA METADE, E A OUTRA METADE DEPENDE DA 185: `public.v_vendas_leads` tem definição **byte a
--   byte idêntica** a esta e continua dona. Enquanto ela existir, quem quisesse o telefone dos leads entra
--   pela outra porta. A prova desta migration mede e registra isso em vez de fingir que o problema foi
--   resolvido. A 185 (remoção das 4 sem consumidor) espera a palavra do dono.

begin;

do $$
declare v_n int;
begin
  if not exists (select 1 from ops.v_views_sem_invoker where view = 'v_mkt_vendas_leads') then
    raise exception 'v_mkt_vendas_leads ja e invoker — a 187 ja foi aplicada?';
  end if;

  -- a base tem de saber se proteger, senão invoker aqui só esvazia a tela do MKT
  if not pg_catalog.has_table_privilege('authenticated','ops.commercial_leads','select') then
    raise exception 'authenticated nao tem grant em ops.commercial_leads — invoker daria 403';
  end if;
  if not exists (select 1 from pg_policies where schemaname='ops' and tablename='commercial_leads'
                   and cmd in ('SELECT','ALL') and qual ilike '%pode_tocar_lead%') then
    raise exception 'a policy de leitura de commercial_leads nao e por papel — invoker nao filtraria nada';
  end if;

  -- e o dono tem de passar em pode_tocar_lead(), senão eu apago a lista dele
  if not exists (select 1 from iam.users where email='junior@oticastatymello.com.br'
                   and role in ('super_admin','admin','founder','staff','vendas')
                   and status='active' and deleted_at is null and auth_id is not null) then
    raise exception 'o dono nao passa em pode_tocar_lead() — parar antes de esvaziar a lista dele';
  end if;

  select count(*) into v_n from public.v_mkt_vendas_leads;
  if v_n = 0 then raise exception 'a view ja esta vazia — nao da para medir efeito'; end if;
end $$;

create or replace view public.v_mkt_vendas_leads
  with (security_invoker = true) as
 select id,
    company,
    stage,
    contact,
    owner,
    next_touch_at,
    last_touch_at,
    wa_opt_out_em,
    motivo_perda is not null as tem_motivo_perda,
    wa_status,
    name,
    phone_e164
   from ops.commercial_leads l
  where deleted_at is null and lgpd_request_at is null;

comment on view public.v_mkt_vendas_leads is
  '187: security_invoker NA DEFINIÇÃO (R-043 §4-B). Leva phone_e164, name e contact de lead, e por isso '
  'segue a RLS de ops.commercial_leads — policy pode_tocar_lead(), que lê iam.users e aceita super_admin, '
  'admin, founder, staff e vendas. O MKT já dependia da mesma função em mkt.is_admin_ou_vendas(), então não '
  'há regra nova: usuário de vendas do MKT precisa nascer também em iam.users. Consumidores: digiai_mkt '
  '(Oticas.tsx, LeadPagina.tsx).';

do $$
declare v_dona int; v_sem int; v_compat int; v_opts text;
begin
  -- a) o invoker ficou gravado NA definição (e não como `false`, que já me enganou antes)
  select array_to_string(reloptions, ',') into v_opts
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='v_mkt_vendas_leads';
  if v_opts is null or v_opts not ilike '%security_invoker%'
     or v_opts ilike '%security_invoker=false%' or v_opts ilike '%security_invoker=off%' then
    raise exception 'PROVA_187_FALHOU: invoker nao gravado (%)', coalesce(v_opts,'null');
  end if;

  -- b) a RLS passou a valer: como dona lê tudo, como authenticated sem JWT lê zero
  select count(*) into v_dona from public.v_mkt_vendas_leads;
  if v_dona = 0 then raise exception 'PROVA_187_FALHOU: a recriacao perdeu as linhas'; end if;
  set local role authenticated;
  select count(*) into v_sem from public.v_mkt_vendas_leads;
  reset role;
  if v_sem <> 0 then
    raise exception 'PROVA_187_FALHOU: sessao sem papel ainda le % de % leads', v_sem, v_dona;
  end if;

  -- c) a definição não mudou de conteúdo — só de quem a executa. Se eu tiver mexido numa coluna sem querer,
  --    a 185 (que compara as duas definições) passaria a falhar, e o MKT perderia campo na tela.
  if (select pg_get_viewdef('public.v_mkt_vendas_leads'::regclass, true))
  <> (select pg_get_viewdef('public.v_vendas_leads'::regclass, true)) then
    raise exception 'PROVA_187_FALHOU: mudei a definicao e ela divergiu da compat — rever antes';
  end if;

  -- d) A PORTA DOS FUNDOS CONTINUA ABERTA, e eu registro em vez de esconder: `v_vendas_leads` é idêntica e
  --    ainda roda como dona. Esta prova NÃO falha por isso — falhar aqui travaria uma melhoria real por
  --    causa de outra pendente. Mas o número fica dito, e a 185 é o que o fecha.
  set local role authenticated;
  select count(*) into v_compat from public.v_vendas_leads;
  reset role;
  if v_compat > 0 then
    raise notice '187: ATENCAO — v_vendas_leads (compat, dona) ainda devolve % leads com telefone para '
                 'qualquer authenticated. Fechar depende da 185, que espera a palavra do dono.', v_compat;
  end if;
end $$;

commit;
