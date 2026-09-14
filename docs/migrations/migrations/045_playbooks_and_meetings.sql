-- Migration 045: Playbook de Reunião Comercial + histórico de reuniões.
-- Conteúdo reutilizável (ops.playbooks) consumido pela Biblioteca; runner de reunião (ops.meeting_sessions)
-- ligado ao lead no Comercial. Padrão espelhado de 031 (commercial_leads): tabela em ops.*, RLS is_staff,
-- view pública para leitura, RPC SECURITY DEFINER para escrita.
-- Aplicada via Management API em 2026-06-18 (confirmada pelo dono). Afeta banco da gestão central (AGENTS §6 🟡).

-- ============ ops.playbooks (conteúdo reutilizável) ============
create table if not exists ops.playbooks (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  product text,                                    -- clearix/osi/academy/outro
  audience text,                                   -- dono/assessoria/ambos
  objective text,
  duration_min int,
  agenda jsonb not null default '[]'::jsonb,       -- [{from_min,to_min,bloco,foco,quem}]
  discovery jsonb not null default '{}'::jsonb,    -- {dono:[...], assessoria:[...]}
  objections jsonb not null default '[]'::jsonb,   -- [{objecao,resposta,para}]
  checklist jsonb not null default '[]'::jsonb,    -- ["item",...]
  access_info jsonb not null default '{}'::jsonb,  -- {url,senha_nota,sandboxes:[{tier,login}],perfis:[...]}
  followup jsonb not null default '{}'::jsonb,     -- {dono,assessoria}
  deck_url text,
  pdf_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table ops.playbooks enable row level security;
drop policy if exists playbooks_staff_all on ops.playbooks;
create policy playbooks_staff_all on ops.playbooks for all
  using (public.is_staff()) with check (public.is_staff());
drop trigger if exists set_updated_at on ops.playbooks;
create trigger set_updated_at before update on ops.playbooks
  for each row execute function public.tg_set_updated_at();

create or replace view public.v_playbooks as
  select id, slug, name, product, audience, objective, duration_min,
         agenda, discovery, objections, checklist, access_info, followup,
         deck_url, pdf_url, notes, active, created_at, updated_at
  from ops.playbooks
  where deleted_at is null
  order by created_at desc;
grant select on public.v_playbooks to anon, authenticated;

-- ============ ops.meeting_sessions (runner ligado ao lead) ============
create table if not exists ops.meeting_sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references ops.commercial_leads(id) on delete set null,
  playbook_id uuid references ops.playbooks(id) on delete set null,
  title text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_min int,
  pain_noted text,
  objections_raised text[] not null default '{}',
  outcome text,
  stage_changed_to text,
  next_action text,
  follow_up_date date,
  effectiveness smallint,                          -- 1-5
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_meeting_sessions_lead on ops.meeting_sessions(lead_id) where deleted_at is null;

alter table ops.meeting_sessions enable row level security;
drop policy if exists meetings_staff_all on ops.meeting_sessions;
create policy meetings_staff_all on ops.meeting_sessions for all
  using (public.is_staff()) with check (public.is_staff());
drop trigger if exists set_updated_at on ops.meeting_sessions;
create trigger set_updated_at before update on ops.meeting_sessions
  for each row execute function public.tg_set_updated_at();

create or replace view public.v_meeting_sessions as
  select m.id, m.lead_id, c.company as lead_company, m.playbook_id, p.name as playbook_name,
         m.title, m.started_at, m.ended_at, m.duration_min, m.pain_noted, m.objections_raised,
         m.outcome, m.stage_changed_to, m.next_action, m.follow_up_date, m.effectiveness, m.notes,
         m.created_at, m.updated_at
  from ops.meeting_sessions m
  left join ops.commercial_leads c on c.id = m.lead_id
  left join ops.playbooks p on p.id = m.playbook_id
  where m.deleted_at is null
  order by m.started_at desc;
grant select on public.v_meeting_sessions to anon, authenticated;

-- ============ RPCs (SECURITY DEFINER, is_staff) ============
create or replace function public.fn_upsert_playbook(p jsonb)
returns uuid language plpgsql security definer set search_path to 'public','ops'
as $function$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  v_id := nullif(p->>'id','')::uuid;
  if v_id is null then
    insert into ops.playbooks (slug,name,product,audience,objective,duration_min,agenda,discovery,objections,checklist,access_info,followup,deck_url,pdf_url,notes,active)
    values (nullif(p->>'slug',''), p->>'name', p->>'product', p->>'audience', p->>'objective',
            nullif(p->>'duration_min','')::int,
            coalesce(p->'agenda','[]'::jsonb), coalesce(p->'discovery','{}'::jsonb),
            coalesce(p->'objections','[]'::jsonb), coalesce(p->'checklist','[]'::jsonb),
            coalesce(p->'access_info','{}'::jsonb), coalesce(p->'followup','{}'::jsonb),
            p->>'deck_url', p->>'pdf_url', p->>'notes', coalesce((p->>'active')::boolean,true))
    returning id into v_id;
  else
    update ops.playbooks set
      slug=nullif(p->>'slug',''), name=p->>'name', product=p->>'product', audience=p->>'audience',
      objective=p->>'objective', duration_min=nullif(p->>'duration_min','')::int,
      agenda=coalesce(p->'agenda',agenda), discovery=coalesce(p->'discovery',discovery),
      objections=coalesce(p->'objections',objections), checklist=coalesce(p->'checklist',checklist),
      access_info=coalesce(p->'access_info',access_info), followup=coalesce(p->'followup',followup),
      deck_url=p->>'deck_url', pdf_url=p->>'pdf_url', notes=p->>'notes',
      active=coalesce((p->>'active')::boolean,active)
    where id=v_id;
  end if;
  return v_id;
end;
$function$;
grant execute on function public.fn_upsert_playbook(jsonb) to authenticated;

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
    insert into ops.meeting_sessions (lead_id,playbook_id,title,started_at,ended_at,duration_min,pain_noted,objections_raised,outcome,stage_changed_to,next_action,follow_up_date,effectiveness,notes)
    values (v_lead, nullif(p->>'playbook_id','')::uuid, p->>'title',
            coalesce(nullif(p->>'started_at','')::timestamptz, now()), nullif(p->>'ended_at','')::timestamptz,
            nullif(p->>'duration_min','')::int, p->>'pain_noted',
            coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'objections_raised','[]'::jsonb))), '{}'),
            p->>'outcome', v_stage, v_next, nullif(p->>'follow_up_date','')::date,
            nullif(p->>'effectiveness','')::smallint, p->>'notes')
    returning id into v_id;
  else
    update ops.meeting_sessions set
      playbook_id=nullif(p->>'playbook_id','')::uuid, title=p->>'title',
      ended_at=nullif(p->>'ended_at','')::timestamptz, duration_min=nullif(p->>'duration_min','')::int,
      pain_noted=p->>'pain_noted',
      objections_raised=coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'objections_raised','[]'::jsonb))), objections_raised),
      outcome=p->>'outcome', stage_changed_to=v_stage, next_action=v_next,
      follow_up_date=nullif(p->>'follow_up_date','')::date, effectiveness=nullif(p->>'effectiveness','')::smallint,
      notes=p->>'notes'
    where id=v_id;
  end if;
  -- Propaga para o lead na mesma transação: atualiza stage + próximo passo se informados
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

create or replace function public.fn_delete_playbook(p_id uuid)
returns void language plpgsql security definer set search_path to 'public','ops'
as $function$
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  update ops.playbooks set deleted_at=now() where id=p_id;
end; $function$;
grant execute on function public.fn_delete_playbook(uuid) to authenticated;

create or replace function public.fn_delete_meeting(p_id uuid)
returns void language plpgsql security definer set search_path to 'public','ops'
as $function$
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  update ops.meeting_sessions set deleted_at=now() where id=p_id;
end; $function$;
grant execute on function public.fn_delete_meeting(uuid) to authenticated;

-- ============ Seed: o playbook real do pitch Clearix (portado do kit) ============
insert into ops.playbooks (slug,name,product,audience,objective,duration_min,agenda,discovery,objections,checklist,access_info,followup,deck_url,notes)
select
  'pitch-clearix-primeira-reuniao',
  'Pitch Clearix — Primeira Reunião',
  'clearix','ambos',
  'Mostrar o Clearix funcionando e sair com 1 próximo passo: teste do dono + parceria da assessoria.',
  38,
  '[
    {"from_min":0,"to_min":3,"bloco":"Abertura + rapport","foco":"Agradecer, confirmar o tempo, objetivo em 1 frase","quem":"ambos"},
    {"from_min":3,"to_min":9,"bloco":"Descoberta","foco":"Ouvir e anotar a dor antes de apresentar","quem":"dono"},
    {"from_min":9,"to_min":12,"bloco":"Problema + categoria","foco":"Espelhar as 3 dores; Clearix nao e mais um PDV","quem":"ambos"},
    {"from_min":12,"to_min":14,"bloco":"A prova","foco":"Nao e maquete: R$12,2M, 20k vendas, 50k OS, 6 anos","quem":"ambos"},
    {"from_min":14,"to_min":25,"bloco":"Demo ao vivo","foco":"Ciclo vender -> lab -> cobrar -> avisar -> BI","quem":"dono"},
    {"from_min":25,"to_min":29,"bloco":"Preco + oferta","foco":"Tiers, 90 dias, 30% off, setup isento no teste","quem":"dono"},
    {"from_min":29,"to_min":33,"bloco":"A parceria","foco":"O que a assessoria ganha: comissao recorrente","quem":"assessoria"},
    {"from_min":33,"to_min":38,"bloco":"Fechamento duplo","foco":"Dono: liberar teste. Assessoria: marcar parceria + 2-3 oticas","quem":"ambos"}
  ]'::jsonb,
  '{
    "dono":[
      "Me conta como e uma venda hoje, do balcao ate o cliente retirar o oculos.",
      "Quantas lojas voce tem? Pretende abrir mais?",
      "O que mais te tira o sono: perder cliente, lente atrasada no lab, o caixa, ou a equipe?",
      "Que sistema voce usa hoje? O que mais te irrita nele?",
      "Quando um cliente compra e some, voce tem como traze-lo de volta?"
    ],
    "assessoria":[
      "Quantas oticas voce atende hoje?",
      "Qual a reclamacao numero 1 que elas trazem pra voce?",
      "Voce ja indica algum sistema pra elas? Como funciona essa indicacao?"
    ]
  }'::jsonb,
  '[
    {"objecao":"Ja tenho um sistema.","resposta":"Nao precisa trocar amanha. Pega o teste de 90 dias rodando em paralelo e compara. A migracao a gente faz.","para":"dono"},
    {"objecao":"Esta caro.","resposta":"Recriar isso custaria mais de R$7,7 milhoes. Comeca em R$349, sem fidelidade. O WhatsApp automatico tira quase uma pessoa do atendimento.","para":"dono"},
    {"objecao":"Migrar meus dados da trabalho.","resposta":"A migracao e nossa, orcada por volume. Voce nao perde historico.","para":"dono"},
    {"objecao":"Isso ta pronto mesmo?","resposta":"O nucleo (vender, lab, cobrar, avisar) roda numa rede real ha anos. Marketing/fidelidade/3D entram nas proximas ondas. Prefiro verdade a prometer demais.","para":"dono"},
    {"objecao":"Como eu ganho com isso?","resposta":"Comissao recorrente por cada otica ativa que voce trouxer, todo mes enquanto for cliente.","para":"assessoria"},
    {"objecao":"E se a otica reclamar comigo?","resposta":"Voce nao fica sozinha. Implantacao e suporte sao nossos. Voce ganha o credito, sem o abacaxi.","para":"assessoria"}
  ]'::jsonb,
  '[
    "Conferir o tenant: topo-direito = Sandbox Crescimento (nunca Grupo Mello)",
    "Pre-abrir abas: Hub, Vendas, Lab, Finance, BI (logadas no sandbox)",
    "Testar compartilhar uma ABA do Chrome no Meet",
    "Silenciar notificacoes (WhatsApp/Slack/email)",
    "Video/prints de backup a mao",
    "Deck/PDF aberto pra enviar no fim"
  ]'::jsonb,
  '{
    "url":"https://clearix.app.br",
    "entrada":"Acesse clearix.app.br -> botao Entrar",
    "senha_nota":"Senha compartilhada de demo enviada por mensagem (nao no PDF).",
    "sandboxes":[
      {"tier":"Essencial","login":"admin@sandbox-essencial.clearix.dev"},
      {"tier":"Controle","login":"admin@sandbox-controle.clearix.dev"},
      {"tier":"Crescimento","login":"admin@sandbox-crescimento.clearix.dev"}
    ],
    "perfis":["Dono (admin@) ve tudo + BI","Gerente (gerente@) operacao","Vendedor (vendedor@) balcao"],
    "regra":"Troque so o prefixo do email (admin/gerente/vendedor). Cada perfil enxerga so o que pode."
  }'::jsonb,
  '{
    "dono":"Oi [nome], obrigado pelo tempo hoje! Seguem a apresentacao e seus acessos de teste do Clearix. Voce comentou que [dor] era o maior incomodo - e o que o teste de 90 dias resolve sem trocar de sistema agora. Me diz um horario pra liberar seu cadastro real. Abraco!",
    "assessoria":"Oi [nome], valeu por trazer o(a) [dono]. Seguem a apresentacao e os acessos de demonstracao pra mostrar pra outras oticas. Fica de pe nossa conversa de [dia/hora] pra estruturar a parceria (comissao recorrente) e voce ja pensar em 2-3 oticas. Ate [dia]!"
  }'::jsonb,
  'https://clearix.app.br',
  'Conteudo portado do kit em digiai/docs/divulgacao/pitch-clearix-assessoria/. Pricing vigente: Essencial R$349 / Controle R$899 / Crescimento R$1499; teste 90 dias; 30% off 3 meses; setup isento no teste; migracao orcada. Nunca demonstrar no Grupo Mello (LGPD).'
where not exists (select 1 from ops.playbooks where slug='pitch-clearix-primeira-reuniao');
