-- Scorecard semanal com metas (módulo Semana) — padrão EOS/Traction adaptado.
-- Métricas com meta+dono+direção; entradas por semana (week_start = segunda-feira).
-- Leitura via view pública; escrita via RPC SECURITY DEFINER + is_staff (padrão da casa).

create table if not exists ops.scorecard_metrics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  owner text not null default 'Gilberto',
  target numeric not null,
  direction text not null default '>=' check (direction in ('>=', '<=')),
  unit text,
  hint text,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ops.scorecard_entries (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references ops.scorecard_metrics(id) on delete cascade,
  week_start date not null,
  value numeric not null,
  note text,
  updated_at timestamptz not null default now(),
  unique (metric_id, week_start)
);

alter table ops.scorecard_metrics enable row level security;
alter table ops.scorecard_entries enable row level security;

-- Métricas iniciais — fase VENDER (editáveis via SQL; o app só preenche valores)
insert into ops.scorecard_metrics (slug, label, owner, target, direction, unit, hint, sort_order) values
  ('contatos_prospeccao',  'Contatos de prospecção (óticas)',      'Gilberto', 10,  '>=', 'un', 'WhatsApp/ligação pra ótica nova — OSI e Clearix', 10),
  ('demos_agendadas',      'Demos Clearix agendadas',              'Gilberto', 2,   '>=', 'un', 'Demonstração marcada com dono de ótica',          20),
  ('leads_respondidos_24h','Leads respondidos em <24h',            'Gilberto', 100, '>=', '%',  'Leads do site Clearix + OSI (promessa do form)',  30),
  ('followups_feitos',     'Follow-ups feitos',                    'Gilberto', 5,   '>=', 'un', 'Retorno em lead parado / proposta aberta',        40),
  ('vendas_osi',           'Vendas OSI na semana',                 'Gilberto', 1,   '>=', 'un', 'Compra aprovada Hotmart/Kiwify',                  50),
  ('posts_no_ar',          'Publicações no ar (todas as marcas)',  'MKT',      5,   '>=', 'un', 'Espelho MKT · últimos 7d',                        60)
on conflict (slug) do nothing;

-- Leitura: métricas ativas + entradas
create or replace view public.v_ops_scorecard as
select
  m.id as metric_id, m.slug, m.label, m.owner, m.target, m.direction, m.unit, m.hint, m.sort_order,
  e.week_start, e.value, e.note, e.updated_at
from ops.scorecard_metrics m
left join ops.scorecard_entries e on e.metric_id = m.id
where m.active
order by m.sort_order, e.week_start;

grant select on public.v_ops_scorecard to authenticated;

-- Escrita: upsert do valor da semana
create or replace function public.fn_scorecard_set(
  p_slug text,
  p_week_start date,
  p_value numeric,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public, ops
as $$
declare
  v_metric uuid;
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  select id into v_metric from ops.scorecard_metrics where slug = p_slug and active;
  if v_metric is null then raise exception 'metric_desconhecida: %', p_slug; end if;
  insert into ops.scorecard_entries (metric_id, week_start, value, note)
  values (v_metric, p_week_start, p_value, p_note)
  on conflict (metric_id, week_start)
  do update set value = excluded.value, note = coalesce(excluded.note, ops.scorecard_entries.note), updated_at = now();
end;
$$;

revoke all on function public.fn_scorecard_set(text, date, numeric, text) from public, anon;
grant execute on function public.fn_scorecard_set(text, date, numeric, text) to authenticated;
