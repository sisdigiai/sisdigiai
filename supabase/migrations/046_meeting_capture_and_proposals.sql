-- Migration 046: ciclo de reunião completo — captura rica + propostas.
-- Estende ops.meeting_sessions (escolhas/citações/action items/meet) e cria ops.proposals.
-- Padrão da casa (031/045): ops.*, RLS is_staff, view pública, RPC SECURITY DEFINER.
-- Aplicada via Management API em 2026-06-18 (confirmada pelo dono).

-- ============ 1) Captura rica em ops.meeting_sessions ============
alter table ops.meeting_sessions
  add column if not exists interest_plan text,                         -- Essencial/Controle/Crescimento
  add column if not exists interest_apps text[] not null default '{}', -- apps que interessaram
  add column if not exists budget_signal text,                         -- sinal de orçamento ouvido
  add column if not exists quotes text[] not null default '{}',        -- falas marcantes ("o que foi dito")
  add column if not exists action_items jsonb not null default '[]',   -- [{text, resolved}] análises a resolver
  add column if not exists meet_url text;                              -- link da sala de reunião

create or replace view public.v_meeting_sessions as
  select m.id, m.lead_id, c.company as lead_company, m.playbook_id, p.name as playbook_name,
         m.title, m.started_at, m.ended_at, m.duration_min, m.pain_noted, m.objections_raised,
         m.outcome, m.stage_changed_to, m.next_action, m.follow_up_date, m.effectiveness, m.notes,
         m.created_at, m.updated_at,
         m.interest_plan, m.interest_apps, m.budget_signal, m.quotes, m.action_items, m.meet_url
  from ops.meeting_sessions m
  left join ops.commercial_leads c on c.id = m.lead_id
  left join ops.playbooks p on p.id = m.playbook_id
  where m.deleted_at is null
  order by m.started_at desc;
grant select on public.v_meeting_sessions to anon, authenticated;

-- fn_log_meeting v2 — inclui os campos de captura rica
create or replace function public.fn_log_meeting(p jsonb)
returns uuid language plpgsql security definer set search_path to 'public','ops'
as $function$
declare v_id uuid; v_lead uuid; v_stage text; v_next text;
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  v_id   := nullif(p->>'id','')::uuid;
  v_lead := nullif(p->>'lead_id','')::uuid;
  v_stage := nullif(p->>'stage_changed_to','');
  v_next  := nullif(p->>'next_action','');
  if v_id is null then
    insert into ops.meeting_sessions (lead_id,playbook_id,title,started_at,ended_at,duration_min,pain_noted,objections_raised,outcome,stage_changed_to,next_action,follow_up_date,effectiveness,notes,
      interest_plan,interest_apps,budget_signal,quotes,action_items,meet_url)
    values (v_lead, nullif(p->>'playbook_id','')::uuid, p->>'title',
            coalesce(nullif(p->>'started_at','')::timestamptz, now()), nullif(p->>'ended_at','')::timestamptz,
            nullif(p->>'duration_min','')::int, p->>'pain_noted',
            coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'objections_raised','[]'::jsonb))), '{}'),
            p->>'outcome', v_stage, v_next, nullif(p->>'follow_up_date','')::date,
            nullif(p->>'effectiveness','')::smallint, p->>'notes',
            p->>'interest_plan',
            coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'interest_apps','[]'::jsonb))), '{}'),
            p->>'budget_signal',
            coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'quotes','[]'::jsonb))), '{}'),
            coalesce(p->'action_items','[]'::jsonb),
            nullif(p->>'meet_url',''))
    returning id into v_id;
  else
    update ops.meeting_sessions set
      playbook_id=nullif(p->>'playbook_id','')::uuid, title=p->>'title',
      ended_at=nullif(p->>'ended_at','')::timestamptz, duration_min=nullif(p->>'duration_min','')::int,
      pain_noted=p->>'pain_noted',
      objections_raised=coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'objections_raised','[]'::jsonb))), objections_raised),
      outcome=p->>'outcome', stage_changed_to=v_stage, next_action=v_next,
      follow_up_date=nullif(p->>'follow_up_date','')::date, effectiveness=nullif(p->>'effectiveness','')::smallint,
      notes=p->>'notes',
      interest_plan=p->>'interest_plan',
      interest_apps=coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'interest_apps','[]'::jsonb))), interest_apps),
      budget_signal=p->>'budget_signal',
      quotes=coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'quotes','[]'::jsonb))), quotes),
      action_items=coalesce(p->'action_items', action_items),
      meet_url=nullif(p->>'meet_url','')
    where id=v_id;
  end if;
  if v_lead is not null then
    update ops.commercial_leads set
      stage = coalesce(v_stage, stage),
      next_step = coalesce(v_next, next_step)
    where id = v_lead;
  end if;
  return v_id;
end;
$function$;
grant execute on function public.fn_log_meeting(jsonb) to authenticated;

-- ============ 2) ops.proposals (proposta gerada da reunião) ============
create table if not exists ops.proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references ops.commercial_leads(id) on delete set null,
  meeting_id uuid references ops.meeting_sessions(id) on delete set null,
  title text,
  plan text,                          -- Essencial/Controle/Crescimento
  monthly_price numeric(12,2),
  discount_pct numeric,               -- ex.: 30
  trial_days int,                     -- ex.: 90
  setup_note text,
  items jsonb not null default '[]',  -- linhas extras [{label,value}]
  body text,                          -- corpo gerado (editável)
  status text not null default 'rascunho',  -- rascunho/enviada/aceita/recusada
  sent_at timestamptz,
  sent_via text,                      -- whatsapp/email
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_proposals_lead on ops.proposals(lead_id) where deleted_at is null;

alter table ops.proposals enable row level security;
drop policy if exists proposals_staff_all on ops.proposals;
create policy proposals_staff_all on ops.proposals for all
  using (public.is_staff()) with check (public.is_staff());
drop trigger if exists set_updated_at on ops.proposals;
create trigger set_updated_at before update on ops.proposals
  for each row execute function public.tg_set_updated_at();

create or replace view public.v_proposals as
  select pr.id, pr.lead_id, c.company as lead_company, pr.meeting_id, pr.title, pr.plan,
         pr.monthly_price, pr.discount_pct, pr.trial_days, pr.setup_note, pr.items, pr.body,
         pr.status, pr.sent_at, pr.sent_via, pr.created_at, pr.updated_at
  from ops.proposals pr
  left join ops.commercial_leads c on c.id = pr.lead_id
  where pr.deleted_at is null
  order by pr.created_at desc;
grant select on public.v_proposals to anon, authenticated;

create or replace function public.fn_upsert_proposal(p jsonb)
returns uuid language plpgsql security definer set search_path to 'public','ops'
as $function$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  v_id := nullif(p->>'id','')::uuid;
  if v_id is null then
    insert into ops.proposals (lead_id,meeting_id,title,plan,monthly_price,discount_pct,trial_days,setup_note,items,body,status)
    values (nullif(p->>'lead_id','')::uuid, nullif(p->>'meeting_id','')::uuid, p->>'title', p->>'plan',
            nullif(p->>'monthly_price','')::numeric, nullif(p->>'discount_pct','')::numeric, nullif(p->>'trial_days','')::int,
            p->>'setup_note', coalesce(p->'items','[]'::jsonb), p->>'body', coalesce(nullif(p->>'status',''),'rascunho'))
    returning id into v_id;
  else
    update ops.proposals set
      lead_id=nullif(p->>'lead_id','')::uuid, meeting_id=nullif(p->>'meeting_id','')::uuid, title=p->>'title', plan=p->>'plan',
      monthly_price=nullif(p->>'monthly_price','')::numeric, discount_pct=nullif(p->>'discount_pct','')::numeric,
      trial_days=nullif(p->>'trial_days','')::int, setup_note=p->>'setup_note',
      items=coalesce(p->'items',items), body=p->>'body', status=coalesce(nullif(p->>'status',''),status)
    where id=v_id;
  end if;
  return v_id;
end; $function$;
grant execute on function public.fn_upsert_proposal(jsonb) to authenticated;

create or replace function public.fn_mark_proposal_sent(p_id uuid, p_via text)
returns void language plpgsql security definer set search_path to 'public','ops'
as $function$
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  update ops.proposals set status='enviada', sent_at=now(), sent_via=p_via where id=p_id;
end; $function$;
grant execute on function public.fn_mark_proposal_sent(uuid,text) to authenticated;

create or replace function public.fn_delete_proposal(p_id uuid)
returns void language plpgsql security definer set search_path to 'public','ops'
as $function$
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  update ops.proposals set deleted_at=now() where id=p_id;
end; $function$;
grant execute on function public.fn_delete_proposal(uuid) to authenticated;
