-- 232 — Dossiê e pitch por lead (ordem do dono em 14/11/2026, curadoria do Geral com três condições).
--
-- O QUE É: cada lead do CRM pode ganhar (1) um **dossiê** — o que se sabe do NEGÓCIO do prospect e como
-- abordá-lo — e (2) **pitches** gerados a partir dele, que são **rascunho para o dono mandar**. O app não
-- manda nada (R-011), e isso não é só promessa de comentário: não existe aqui nenhuma função que fale com
-- a rede, e a prova 4 recusa a migration se alguém acrescentar uma.
--
-- MODELO B, e por quê: a ordem dava a opção A, guardar o dossiê no `notes` do lead. Recusei. `notes` é
-- texto livre, e texto livre é exatamente o que esta casa passou a semana desentupindo — bloco de prosa
-- que a tela precisa ler com expressão regular, que ninguém consegue comparar entre dois leads e que não
-- tem onde marcar fonte. O dono está abrindo campanha dirigida (`utm_campaign = pitch_dirigido_2026_11`):
-- isto vai repetir, e o que repete merece forma.
--
-- A TRAVA DE LGPD É DO BANCO, NÃO DO COMENTÁRIO. A condição do Geral é que dado pessoal de indivíduo
-- nomeado fique fora. Então as chaves de primeiro nível do dossiê são uma LISTA FECHADA: quem quiser
-- guardar "religiao", "familia" ou "cpf" não consegue — o `insert` falha. Quem precisar de um campo novo
-- escreve uma migration e, ao escrevê-la, pensa.
--
-- O LIMITE HONESTO DESSA TRAVA, dito aqui para ninguém se enganar: o banco controla a FORMA, não a prosa.
-- Nada impede alguém de escrever algo pessoal dentro de `observacao`. A trava evita o acidente de criar um
-- campo para isso; ela não substitui a regra nem a revisão. Dizer o contrário seria conforto falso.
--
-- R-044: tabela no schema do domínio, `public` só com view e RPC. R-043: view nasce `security_invoker` e
-- a RPC tem portão explícito. R-013 não se aplica: não nasce tabela de pessoa — o dossiê é da EMPRESA.

create or replace function ops.fn_chaves_dentro_da_lista(p jsonb, p_permitidas text[])
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select case
    when p is null then true
    when jsonb_typeof(p) <> 'object' then false
    else coalesce((select bool_and(k = any (p_permitidas)) from jsonb_object_keys(p) k), true)
  end;
$function$;

comment on function ops.fn_chaves_dentro_da_lista(jsonb, text[]) is
  'Lista fechada de chaves para jsonb de dossiê. Serve à trava de LGPD: campo novo exige migration.';

create table if not exists ops.lead_dossie (
  lead_id        uuid primary key references ops.commercial_leads (id) on delete cascade,
  negocio        jsonb not null default '{}'::jsonb,
  abordagem      jsonb not null default '{}'::jsonb,
  fontes         jsonb not null default '[]'::jsonb,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  constraint dossie_negocio_so_de_negocio check (ops.fn_chaves_dentro_da_lista(negocio, array[
    'empresa', 'cnpj', 'setor', 'porte', 'grupo', 'lojas', 'canais', 'site', 'redes',
    'concorrentes', 'dor_provavel', 'sinais', 'observacao'])),
  constraint dossie_abordagem_so_de_abordagem check (ops.fn_chaves_dentro_da_lista(abordagem, array[
    'virada', 'gancho', 'primeiro_toque', 'roteiro_diagnostico', 'objecoes', 'proxima_acao', 'nao_usar'])),
  constraint dossie_fontes_e_lista check (jsonb_typeof(fontes) = 'array')
);

comment on table ops.lead_dossie is
  'Dossiê de NEGÓCIO do prospect e como abordá-lo. Dado pessoal de indivíduo nomeado não entra: as chaves '
  'são lista fechada (condição do Geral, 14/11/2026). A trava controla a forma, não a prosa de dentro.';
comment on column ops.lead_dossie.fontes is 'De onde veio cada afirmação. Dossiê sem fonte é boato com cara de pesquisa.';
comment on column ops.lead_dossie.abordagem is '"nao_usar" existe de propósito: o que foi descoberto e NÃO pode virar gancho de conversa.';

create table if not exists ops.lead_pitch (
  id            bigint generated always as identity primary key,
  lead_id       uuid not null references ops.commercial_leads (id) on delete cascade,
  canal         text not null check (canal in ('whatsapp', 'email')),
  corpo         text not null check (btrim(corpo) <> ''),
  roteiro       text,
  oferta_fonte  text not null check (btrim(oferta_fonte) <> ''),
  status        text not null default 'rascunho' check (status in ('rascunho', 'aprovado_pelo_dono', 'enviado_pelo_dono')),
  criado_em     timestamptz not null default now(),
  criado_por    uuid
);

comment on table ops.lead_pitch is
  'Pitch gerado: RASCUNHO para o dono mandar. O app não envia (R-011); "enviado_pelo_dono" é registro do '
  'que ele fez, nunca do que a máquina fez.';
comment on column ops.lead_pitch.oferta_fonte is
  'Qual oferta sustentou este texto, com data da folha única. Pitch sem isso não dá para auditar depois.';

create index if not exists lead_pitch_por_lead_idx on ops.lead_pitch (lead_id, criado_em desc);

alter table ops.lead_dossie enable row level security;
alter table ops.lead_pitch  enable row level security;

drop policy if exists le_staff on ops.lead_dossie;
drop policy if exists le_staff on ops.lead_pitch;
create policy le_staff on ops.lead_dossie for select to authenticated using (public.is_staff());
create policy le_staff on ops.lead_pitch  for select to authenticated using (public.is_staff());

grant select on ops.lead_dossie, ops.lead_pitch to authenticated;

create or replace view public.v_lead_dossie
with (security_invoker = true) as
select d.lead_id, l.company, l.stage, d.negocio, d.abordagem, d.fontes, d.atualizado_em,
       jsonb_array_length(d.fontes) as qtd_fontes,
       -- Dossiê sem fonte não é pesquisa, é lembrança — a tela mostra isso em vez de escondê-lo.
       (jsonb_array_length(d.fontes) = 0) as sem_fonte
  from ops.lead_dossie d
  join ops.commercial_leads l on l.id = d.lead_id
 where l.deleted_at is null and l.lgpd_request_at is null;

create or replace view public.v_lead_pitch
with (security_invoker = true) as
select p.id, p.lead_id, l.company, p.canal, p.corpo, p.roteiro, p.oferta_fonte, p.status, p.criado_em,
       ((now() at time zone 'America/Sao_Paulo')::date - p.criado_em::date) as dias_desde
  from ops.lead_pitch p
  join ops.commercial_leads l on l.id = p.lead_id
 where l.deleted_at is null and l.lgpd_request_at is null;

grant select on public.v_lead_dossie, public.v_lead_pitch to authenticated;

create or replace function public.rpc_lead_dossie_gravar(
  p_lead_id uuid, p_negocio jsonb, p_abordagem jsonb, p_fontes jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_staff() then
    raise exception 'apenas staff grava dossie de lead' using errcode = 'insufficient_privilege';
  end if;
  insert into ops.lead_dossie (lead_id, negocio, abordagem, fontes, atualizado_por)
  values (p_lead_id, coalesce(p_negocio, '{}'::jsonb), coalesce(p_abordagem, '{}'::jsonb),
          coalesce(p_fontes, '[]'::jsonb), auth.uid())
  on conflict (lead_id) do update
     set negocio = excluded.negocio, abordagem = excluded.abordagem, fontes = excluded.fontes,
         atualizado_em = now(), atualizado_por = auth.uid();
  return p_lead_id;
end;
$function$;

create or replace function public.rpc_lead_pitch_gravar(
  p_lead_id uuid, p_canal text, p_corpo text, p_oferta_fonte text, p_roteiro text default null)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id bigint;
begin
  if not public.is_staff() then
    raise exception 'apenas staff grava pitch' using errcode = 'insufficient_privilege';
  end if;
  insert into ops.lead_pitch (lead_id, canal, corpo, oferta_fonte, roteiro, criado_por)
  values (p_lead_id, p_canal, p_corpo, p_oferta_fonte, p_roteiro, auth.uid())
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.rpc_lead_pitch_status(p_id bigint, p_status text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_staff() then
    raise exception 'apenas staff muda status de pitch' using errcode = 'insufficient_privilege';
  end if;
  -- "enviado_pelo_dono" é o dono dizendo que mandou. A máquina não tem como saber isso sozinha, e fingir
  -- que sabe seria inventar envio.
  update ops.lead_pitch set status = p_status where id = p_id;
  if not found then raise exception 'pitch % nao existe', p_id; end if;
  return p_id;
end;
$function$;

grant execute on function public.rpc_lead_dossie_gravar(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.rpc_lead_pitch_gravar(uuid, text, text, text, text) to authenticated;
grant execute on function public.rpc_lead_pitch_status(bigint, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — a trava de LGPD recusa de verdade. Sem isto, a condição do Geral seria uma frase no comentário.
do $$
declare v_recusou boolean := false; v_lead uuid;
begin
  select id into v_lead from ops.commercial_leads where deleted_at is null limit 1;
  begin
    insert into ops.lead_dossie (lead_id, negocio)
    values (v_lead, '{"empresa":"prova","religiao":"qualquer"}'::jsonb);
  exception when check_violation then v_recusou := true;
  end;
  if not v_recusou then
    delete from ops.lead_dossie where lead_id = v_lead;
    raise exception 'PROVA_232_FALHOU: o dossie aceitou uma chave de dado pessoal';
  end if;
end $$;

-- PROVA 2 — o portão recusa quem não é da equipe, e a recusa é o comportamento certo.
-- Esta prova nasceu de um tropeço meu: eu havia escrito a 2 chamando a RPC para testar ida e volta, e a
-- migration recusou — ela roda como `postgres`, onde `is_staff()` é falso. A tentação era alargar o portão
-- para o teste passar. **Não alarguei**: portão que cede para caber num teste deixa de ser portão. Quem
-- grava dossiê é gente da equipe na tela; a carga de arquivo não tem nada que ver com isto.
do $$
declare v_recusou boolean := false; v_lead uuid;
begin
  select id into v_lead from ops.commercial_leads where deleted_at is null limit 1;
  begin
    perform public.rpc_lead_dossie_gravar(v_lead, '{"empresa":"prova"}'::jsonb, '{}'::jsonb);
  exception when insufficient_privilege then v_recusou := true;
  end;
  if not v_recusou then
    delete from ops.lead_dossie where lead_id = v_lead;
    raise exception 'PROVA_232_FALHOU: a RPC de dossie aceitou quem nao e staff';
  end if;
end $$;

-- PROVA 2-b — e o que é de negócio entra, com fonte, e a view devolve. Rascunho meu, apagado na mesma
-- transação (R-004).
do $$
declare v_lead uuid; r record;
begin
  select id into v_lead from ops.commercial_leads where deleted_at is null limit 1;
  insert into ops.lead_dossie (lead_id, negocio, abordagem, fontes)
  values (v_lead,
    '{"empresa":"prova da 232","setor":"otica","dor_provavel":"carne vencido"}'::jsonb,
    '{"virada":"numeros antes de sistema","nao_usar":"nada pessoal"}'::jsonb,
    '["prova da 232"]'::jsonb);
  select qtd_fontes, sem_fonte into r from public.v_lead_dossie where lead_id = v_lead;
  if r.qtd_fontes <> 1 or r.sem_fonte then
    raise exception 'PROVA_232_FALHOU: a view nao leu as fontes do dossie';
  end if;
  delete from ops.lead_dossie where lead_id = v_lead;
end $$;

-- PROVA 3 — escrita fechada: `authenticated` não escreve direto em nenhuma das duas tabelas. A porta é a
-- RPC com portão; uma segunda porta é a que ninguém lembra de trancar.
do $$
declare v text;
begin
  select string_agg(table_name || ':' || privilege_type, ', ') into v
    from information_schema.role_table_grants
   where grantee = 'authenticated' and table_schema = 'ops'
     and table_name in ('lead_dossie', 'lead_pitch')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if v is not null then
    raise exception 'PROVA_232_FALHOU: authenticated escreve direto: %', v;
  end if;
end $$;

-- PROVA 4 — o app NÃO ENVIA. Nenhuma das funções criadas aqui fala com a rede. Se alguém acrescentar um
-- `net.http_post` a elas amanhã, a próxima execução desta migration recusa — e a regra deixa de depender
-- de alguém lembrar do R-011.
do $$
declare v text;
begin
  select string_agg(p.proname, ', ') into v
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.proname in ('rpc_lead_dossie_gravar', 'rpc_lead_pitch_gravar', 'rpc_lead_pitch_status')
     and (pg_get_functiondef(p.oid) ilike '%net.http%' or pg_get_functiondef(p.oid) ilike '%pg_net%');
  if v is not null then
    raise exception 'PROVA_232_FALHOU: funcao de pitch falando com a rede: % — o app nao envia (R-011)', v;
  end if;
end $$;

-- PROVA 5 — as duas views de contrato rodam como quem consulta, senão a RLS recém-criada seria enfeite.
do $$
declare v text;
begin
  select string_agg(c.relname, ', ') into v
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('v_lead_dossie', 'v_lead_pitch')
     and not (c.reloptions @> array['security_invoker=true']);
  if v is not null then
    raise exception 'PROVA_232_FALHOU: view sem security_invoker: %', v;
  end if;
end $$;
