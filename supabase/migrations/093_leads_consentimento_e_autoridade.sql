-- 093 — leads: consentimento (R-013), papel `vendas` sem escalada, e o toque no LEAD
--
-- ⚠ NÃO APLICADA. Escrita em produção — aguarda o "pode" do dono.
--    Pedida pelo Orquestrador Geral (09/09) para o módulo de vendas por WhatsApp do MKT.
--    Esta é a 2ª versão: a 1ª foi devolvida com 4 ressalvas, todas aceitas por ele.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §0 — UMA CORREÇÃO À DECISÃO, MEDIDA ANTES DE ESCREVER
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A decisão foi: "`vendas` vira papel em iam.users (nível staff para leads)" e
-- a policy espelha `is_staff()`. **Fazer isso literalmente seria escalada de
-- privilégio.** `is_staff()` NÃO é o portão dos leads — é o portão da empresa.
-- Medido:
--
--     is_staff() governa 66 policies em 8 schemas e 57 funções, incluindo
--       finance.*  (7)  expenses, revenue, subscriptions, vendors, founder_time…
--       company.*  (9)  contacts, financial_snapshots, legal_status, partners…
--       iam.*      (2)  users e audit_logs
--       storage.*  (3)  objects
--       academy.*, analytics.*, marketing.* (24), ops.* (13)
--
-- Ou seja: pôr `vendas` dentro de `is_staff()` daria a cada vendedor o
-- financeiro, o jurídico, a tabela de usuários e o storage da empresa — sem que
-- nada na migration parecesse falar sobre isso. É a mesma família do fail-open:
-- uma linha que abre muito mais do que o nome dela sugere.
--
-- O QUE FAÇO EM VEZ DISSO — mantém o objetivo (UMA autoridade: iam) e não alarga:
--   1. `vendas` entra no CHECK de `iam.users.role`  → autoridade única, cumprida.
--   2. `is_staff()` NÃO é tocada                    → nada de financeiro/jurídico.
--   3. nasce `public.pode_tocar_lead()` = is_staff() OR papel `vendas`, e é ELA
--      que trava as RPCs e as policies de lead.
-- `mkt.is_admin_ou_vendas()` não aparece: leads da empresa não consultam a
-- tabela de usuários do app de marketing. A doc pode dizer "uma autoridade"
-- porque passa a ser verdade.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — Consentimento e opt-out como atributo da pessoa (R-013 §5.1)
-- ═══════════════════════════════════════════════════════════════════════════
alter table ops.commercial_leads
  add column if not exists wa_opt_out_em              timestamptz,
  add column if not exists wa_consentimento_em        timestamptz,
  add column if not exists wa_consentimento_origem    text,
  add column if not exists wa_consentimento_categoria text,
  add column if not exists wa_consentimento_texto     text,
  add column if not exists wa_consentimento_ip        inet;

alter table ops.commercial_leads
  drop constraint if exists commercial_leads_wa_consentimento_categoria_check;
alter table ops.commercial_leads
  add constraint commercial_leads_wa_consentimento_categoria_check
  check (wa_consentimento_categoria is null
         or wa_consentimento_categoria in ('marketing','utility','authentication','service'));

alter table ops.commercial_leads
  drop constraint if exists commercial_leads_consentimento_coerente;
alter table ops.commercial_leads
  add constraint commercial_leads_consentimento_coerente
  check (wa_consentimento_em is null
         or (wa_consentimento_categoria is not null and wa_consentimento_texto is not null));

comment on column ops.commercial_leads.wa_opt_out_em is
  'Quando a pessoa pediu para não receber. Preenchido = NÃO ENVIAR, qualquer categoria. Vence consentimento anterior.';
comment on column ops.commercial_leads.wa_consentimento_em is
  'Quando consentiu. Sem isto, mensagem ativa é proibida por LGPD e pelo Meta (R-013 §5.1).';
comment on column ops.commercial_leads.wa_consentimento_origem is
  'Onde consentiu: landing, formulario, whatsapp_inbound, importacao. Contexto, não prova.';
comment on column ops.commercial_leads.wa_consentimento_categoria is
  'A QUE consentiu — marketing | utility | authentication | service. Consentir para "service" não autoriza marketing.';
comment on column ops.commercial_leads.wa_consentimento_texto is
  'Texto EXATO mostrado no opt-in. É a prova, e é a razão de a coluna existir (R-013 §5.1). Estado, não histórico.';
comment on column ops.commercial_leads.wa_consentimento_ip is
  'IP de onde veio o consentimento.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — O "próximo toque" mora no LEAD (correção do agendador)
-- ═══════════════════════════════════════════════════════════════════════════
-- Havia TRÊS fontes concorrentes, medidas em 09/09:
--     marketing.outreach_schedule ......... 128 linhas
--     v_whatsapp_followups_hoje (derivada)   18 linhas
--     ops.commercial_leads.next_step ...... 258 linhas
-- E a agenda da tela NÃO lia o `outreach_schedule`: derivava de `updated_at`
-- mais `notes NOT ILIKE '%follow-up%'` — decidia se alguém já fora tocado
-- procurando texto livre no campo de observações.
alter table ops.commercial_leads
  add column if not exists next_touch_at timestamptz,
  add column if not exists last_touch_at timestamptz;

comment on column ops.commercial_leads.next_touch_at is
  'QUANDO tocar de novo. Fonte única da agenda desde 09/09/2026 — substitui a heurística de procurar "follow-up" em notes.';
comment on column ops.commercial_leads.last_touch_at is
  'Quando foi tocado de verdade. Diferente de updated_at, que muda por qualquer edição.';
comment on column ops.commercial_leads.next_step is
  'DESCRIÇÃO do próximo passo, em texto. O QUANDO é next_touch_at — não derivar agenda daqui.';

create index if not exists commercial_leads_agenda_idx
  on ops.commercial_leads (next_touch_at)
  where deleted_at is null and wa_opt_out_em is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — Autoridade única (iam), sem alargar is_staff()
-- ═══════════════════════════════════════════════════════════════════════════
alter table iam.users drop constraint if exists users_role_check;
alter table iam.users add constraint users_role_check
  check (role in ('super_admin','admin','founder','staff','vendas','viewer'));

-- Portão DE LEAD. Existe separado de is_staff() de propósito: is_staff() abre
-- finance, company, iam e storage (66 policies), e vendedor não precisa disso.
create or replace function public.pode_tocar_lead()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public','iam'
as $function$
begin
  if auth.uid() is null then return false; end if;
  return exists (
    select 1 from iam.users
    where auth_id = auth.uid()
      and role in ('super_admin','admin','founder','staff','vendas')
      and status = 'active'
      and deleted_at is null
  );
end;
$function$;

comment on function public.pode_tocar_lead() is
  'Quem pode ler e escrever lead comercial: staff da casa + papel vendas. Fonte única = iam.users. NÃO usa mkt.app_users — leads são ativo da empresa. Existe separada de is_staff() porque aquela abre finance/company/iam/storage.';

grant execute on function public.pode_tocar_lead() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- §4 — Policies espelham a MESMA função que trava a RPC
-- ═══════════════════════════════════════════════════════════════════════════
-- Defesa em profundidade: authenticated só tem SELECT nesta tabela, então a
-- escrita direta já parava no grant. Isto é para o dia em que alguém conceder.
drop policy if exists commercial_staff_all on ops.commercial_leads;

create policy commercial_leitura_lead on ops.commercial_leads
  for select using (public.pode_tocar_lead());

create policy commercial_escrita_lead on ops.commercial_leads
  for all using (public.pode_tocar_lead()) with check (public.pode_tocar_lead());

comment on table ops.commercial_leads is
  'Leads comerciais (ativo da empresa). A ESCRITA REAL passa por fn_upsert_commercial_lead / fn_delete_commercial_lead (SECURITY DEFINER, ignoram RLS): a autorização mora no corpo delas, e é a mesma pode_tocar_lead() das policies abaixo. authenticated tem apenas SELECT aqui.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §5 — As RPCs: trava nova + gravam o toque
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.fn_upsert_commercial_lead(p_lead jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare v_id uuid;
begin
  -- Era `is_staff()`, que não deixava vendas escrever. Agora pode_tocar_lead(),
  -- e com mensagem legível: 'not_staff' não dizia nada a quem lia na tela.
  if not public.pode_tocar_lead() then
    raise exception 'Acesso negado: escrever lead exige papel staff ou vendas'
      using errcode = '42501';
  end if;
  v_id := nullif(p_lead->>'id','')::uuid;
  if v_id is null then
    insert into ops.commercial_leads (name, company, product, stage, source, contact, value_brl, owner, next_step, notes, next_touch_at, last_touch_at)
    values (p_lead->>'name', p_lead->>'company', p_lead->>'product',
            coalesce(nullif(p_lead->>'stage',''),'lead'), p_lead->>'source', p_lead->>'contact',
            nullif(p_lead->>'value_brl','')::numeric, p_lead->>'owner', p_lead->>'next_step', p_lead->>'notes',
            nullif(p_lead->>'next_touch_at','')::timestamptz, nullif(p_lead->>'last_touch_at','')::timestamptz)
    returning id into v_id;
  else
    update ops.commercial_leads set
      name = p_lead->>'name', company = p_lead->>'company', product = p_lead->>'product',
      stage = coalesce(nullif(p_lead->>'stage',''),'lead'), source = p_lead->>'source',
      contact = p_lead->>'contact', value_brl = nullif(p_lead->>'value_brl','')::numeric,
      owner = p_lead->>'owner', next_step = p_lead->>'next_step', notes = p_lead->>'notes',
      -- coalesce: quem não manda o campo não apaga o que já estava agendado.
      next_touch_at = coalesce(nullif(p_lead->>'next_touch_at','')::timestamptz, next_touch_at),
      last_touch_at = coalesce(nullif(p_lead->>'last_touch_at','')::timestamptz, last_touch_at)
    where id = v_id;
  end if;
  return v_id;
end;
$function$;

create or replace function public.fn_delete_commercial_lead(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
begin
  if not public.pode_tocar_lead() then
    raise exception 'Acesso negado: remover lead exige papel staff ou vendas'
      using errcode = '42501';
  end if;
  update ops.commercial_leads set deleted_at = now() where id = p_id;
end;
$function$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- FICA PARA A 094 (schema `marketing`, e não é meu — R-032)
-- ═══════════════════════════════════════════════════════════════════════════
-- `marketing.v_whatsapp_followups_hoje` precisa ser reescrita para derivar de
-- `next_touch_at` + stage + `wa_opt_out_em is null`, e `marketing.outreach_schedule`
-- precisa do comentário de legado. As duas vivem no schema do MKT: passam pelo
-- agente dele, não por mim. Sem essa parte, o §1 e o §2 daqui ficam corretos e
-- INERTES — a agenda continua na heurística de `notes` e o opt-out não filtra nada.
--
-- ⚠ Opt-out que a agenda ignora é PIOR que não ter opt-out: parece que alguém cuidou.
--   Se a 094 não vier junto, dizer isso ao dono em vez de dar o pacote por fechado.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS EXIGIDAS DEPOIS DE APLICAR (catálogo não serve; `set role` não carrega
-- JWT, e pode_tocar_lead()/is_staff() mentem sob a Management API):
--   a) sessão staff  → lê e escreve lead pela tela Comercial (positivo);
--   b) sessão `vendas` → escreve lead (o objetivo do módulo) e NÃO enxerga
--      Financeiro nem Cadastro Empresa — prova de que não houve escalada;
--   c) sessão `viewer` → 42501 'Acesso negado' na RPC (controle negativo);
--   d) depois da 094: lead com `wa_opt_out_em` preenchido NÃO aparece na agenda;
--   e) lead com `next_touch_at` no passado APARECE na agenda, e um com `notes`
--      contendo "follow-up" também — provando que a heurística velha morreu.
-- A (b) é a que eu mais quero ver: é onde a escalada apareceria se eu tivesse
-- seguido a decisão ao pé da letra.
