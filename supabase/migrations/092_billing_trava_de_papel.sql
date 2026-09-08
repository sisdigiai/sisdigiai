-- 092 — trava de papel em billing (pacote 16, itens 1-3) — 2026-09-08
--
-- ⚠ NÃO APLICADA. Aguarda autorização de escrita do dono, no canal dele.
--   Preparada para que a execução seja um passo só quando a autorização vier.
--
-- ORDEM DELIBERADA (a porta que abre primeiro, não a mais fácil de fechar):
--
-- 1. `billing_upsert_subscriber` é SECURITY DEFINER, tem `EXECUTE` para
--    `authenticated` e o corpo NÃO TEM TRAVA NENHUMA. Qualquer conta logada
--    altera qualquer assinante — nome, e-mail, `doc` (CPF/CNPJ), telefone,
--    valor do plano, status, vencimento. É a única porta viva HOJE, porque
--    o schema `billing` não é exposto no PostgREST (`Accept-Profile: billing`
--    devolve 406 PGRST106) — e é a porta que o app usa (`billingStore.upsert`),
--    então NÃO se resolve revogando: precisa de trava dentro.
--
-- 2. `public.v_billing_subscriptions` é view DEFINER e ATUALIZÁVEL com `arwd`
--    para `authenticated` — escreve como o dono, e a RLS da tabela abaixo nem
--    é consultada. A policy `using(true)` podia ser `false` que a escrita
--    passaria igual: é a view que abre, não a policy. Revogar a escrita é
--    seguro — `src/lib/billingStore.ts` lê por ela e escreve só pela RPC.
--
-- 3. As policies `ALL using(true)` só entram DEPOIS, porque com view definer
--    elas são defesa em profundidade, não a fechadura.
--
-- POR QUE `is_admin()` E NÃO `is_super_admin()`: `is_admin()` cobre
-- super_admin/admin/founder — exatamente `PRIVILEGED_ROLES` de
-- `src/lib/permissions.ts`, que é quem enxerga o módulo Cobrança. O defeito
-- que a auditoria apontou era front e banco desalinhados; trava mais apertada
-- que a tela recria o mesmo defeito do outro lado.
--
-- POR QUE A POLICY DE LEITURA CONTINUA ABERTA A `authenticated`:
-- `v_vendas_eventos` e `v_vendas_canais` são `security_invoker` e leem
-- `billing.*`. A tela Vendas NÃO está em `RESTRICTED_MODULES` — qualquer
-- logado a abre. Trocar `using(true)` por `is_admin()` numa policy `ALL`
-- ESVAZIARIA a tela Vendas para quem não é admin, sem erro nenhum: tela viva,
-- número zero. Por isso a policy é dividida — SELECT continua para logado,
-- escrita passa a exigir papel.

begin;

-- 1 ─────────────────────────────────────────────────────────────────────────
create or replace function public.billing_upsert_subscriber(p_patch jsonb)
returns billing.subscribers
language plpgsql
security definer
set search_path to 'billing', 'public'
as $function$
declare r billing.subscribers;
begin
  -- Trava adicionada em 08/09. Sem ela qualquer `authenticated` escrevia
  -- assinante, incluindo CPF/CNPJ. Papel vem do banco, nunca de constante (R-037).
  if not public.is_admin() then
    raise exception 'Acesso negado: alterar assinante exige papel admin ou superior'
      using errcode = '42501';
  end if;

  if p_patch ? 'id' then
    update billing.subscribers set
      name = coalesce(p_patch->>'name', name),
      email = coalesce(p_patch->>'email', email),
      doc = coalesce(p_patch->>'doc', doc),
      phone = coalesce(p_patch->>'phone', phone),
      plan_name = coalesce(p_patch->>'plan_name', plan_name),
      plan_amount_brl = coalesce(nullif(p_patch->>'plan_amount_brl','')::numeric, plan_amount_brl),
      mp_preapproval_id = coalesce(p_patch->>'mp_preapproval_id', mp_preapproval_id),
      tenant_ref = coalesce(p_patch->>'tenant_ref', tenant_ref),
      status = coalesce(p_patch->>'status', status),
      next_due_on = coalesce(nullif(p_patch->>'next_due_on','')::date, next_due_on),
      notes = coalesce(p_patch->>'notes', notes),
      updated_at = now()
    where id = (p_patch->>'id')::uuid returning * into r;
  else
    insert into billing.subscribers(name,email,doc,phone,plan_name,plan_amount_brl,mp_preapproval_id,tenant_ref,status,started_on,next_due_on,notes)
    values (p_patch->>'name', p_patch->>'email', p_patch->>'doc', p_patch->>'phone', p_patch->>'plan_name',
            nullif(p_patch->>'plan_amount_brl','')::numeric, p_patch->>'mp_preapproval_id', p_patch->>'tenant_ref',
            coalesce(p_patch->>'status','active'), current_date, nullif(p_patch->>'next_due_on','')::date, p_patch->>'notes')
    returning * into r;
  end if;
  return r;
end $function$;

comment on function public.billing_upsert_subscriber(jsonb) is
  'Escreve billing.subscribers. Definer com trava is_admin() no corpo (08/09/2026): a função é executável por authenticated porque o app a chama, então a autorização mora aqui dentro, não no grant.';

-- 2 ─────────────────────────────────────────────────────────────────────────
revoke insert, update, delete on public.v_billing_subscriptions from authenticated;

comment on view public.v_billing_subscriptions is
  'Somente leitura para authenticated. É view definer e auto-atualizável: o grant de escrita permitia gravar em billing.subscribers ignorando a RLS. Escrita é só por billing_upsert_subscriber. Não reconceder INSERT/UPDATE/DELETE.';

-- 3 ─────────────────────────────────────────────────────────────────────────
-- Leitura segue para logado (a tela Vendas depende dela por view invoker);
-- escrita passa a exigir papel.
drop policy if exists billing_auth_all   on billing.subscribers;
drop policy if exists billing_auth_all_p on billing.payments;
drop policy if exists billing_auth_all_e on billing.mp_events_raw;

create policy billing_leitura_logado on billing.subscribers
  for select to authenticated using (true);
create policy billing_escrita_admin on billing.subscribers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy billing_leitura_logado on billing.payments
  for select to authenticated using (true);
create policy billing_escrita_admin on billing.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy billing_leitura_logado on billing.mp_events_raw
  for select to authenticated using (true);
create policy billing_escrita_admin on billing.mp_events_raw
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- PROVA EXIGIDA ANTES DE DAR POR FEITO (não serve catálogo, nem `set role`:
-- `set role` não carrega claim de JWT e `is_admin()` mente sob a Management API):
--   a) sessão do dono (super_admin) → Cobrança salva assinante normal;
--   b) sessão sem papel → RPC devolve 42501 "Acesso negado" (controle negativo);
--   c) sessão sem papel → tela Vendas continua com número, não zerada;
--   d) INSERT direto em public.v_billing_subscriptions por authenticated → 42501.
