-- Migration 029: Centro de controle SEO multi-domínio (Marketing & SEO)
-- Aplicada no banco via Management API/MCP em 2026-06-02. Este arquivo é o registro versionado.
-- Torna o módulo Marketing & SEO multi-site: registro de sites + dimensão `site` nas métricas.

-- 1) Registro data-driven de sites (o que o painel mostra e o que as edge functions sincronizam)
create table if not exists company.seo_sites (
  site text primary key,
  label text not null,
  color text,
  gsc_property text not null,
  bing_site_url text not null,
  cloudflare_zone_id text,
  indexnow_key text,
  github_repo text,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table company.seo_sites enable row level security;
drop policy if exists seo_sites_staff_all on company.seo_sites;
create policy seo_sites_staff_all on company.seo_sites for all
  using (public.is_staff()) with check (public.is_staff());
drop trigger if exists set_updated_at on company.seo_sites;
create trigger set_updated_at before update on company.seo_sites
  for each row execute function public.tg_set_updated_at();

insert into company.seo_sites
  (site, label, color, gsc_property, bing_site_url, cloudflare_zone_id, indexnow_key, github_repo, sort_order)
values
  ('digiai.app.br','DIGIAI','#2D4B3E','sc-domain:digiai.app.br','https://digiai.app.br',
   'b449527cc352374d312fe8ebd2937060','6aa032cad330bfd49b32be85843c253c','sisdigiai/digiai-site',1),
  ('clearix.app.br','Clearix','#06B6D4','sc-domain:clearix.app.br','https://clearix.app.br',
   null,'8f4004a3daa3425862f94b3f02d59868','sisdigiai/clearix-site',2)
on conflict (site) do nothing;

-- 2) Dimensão de domínio nas métricas (backfilla as linhas atuais como digiai.app.br)
alter table company.metrics add column if not exists site text not null default 'digiai.app.br';
create index if not exists idx_metrics_site_lookup
  on company.metrics (site, source, metric_type, period, collected_at desc);

-- 3) fn_replace_metrics: overload por site (3 args). Mantém a versão 2-arg para compat.
create or replace function public.fn_replace_metrics(p_source text, p_site text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public','company'
as $function$
declare v_count integer;
begin
  delete from company.metrics where source = p_source and site = p_site;
  insert into company.metrics
    (source, site, metric_type, metric_key, value_numeric, value_text, metadata, period, period_start, period_end, collected_at)
  select
    p_source, p_site,
    r->>'metric_type', r->>'metric_key',
    nullif(r->>'value_numeric','')::numeric, r->>'value_text',
    coalesce(r->'metadata','{}'::jsonb), r->>'period',
    nullif(r->>'period_start','')::date, nullif(r->>'period_end','')::date, now()
  from jsonb_array_elements(p_rows) as r;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- 4) View exposta ao app inclui o site (append no fim p/ preservar grants do create-or-replace)
create or replace view public.v_company_metrics as
  select id, source, metric_type, metric_key, value_numeric, value_text,
         metadata, period, period_start, period_end, collected_at, created_at, site
  from company.metrics;

-- 5) View pública para leitura do registro de sites (padrão dos demais v_company_*)
create or replace view public.v_seo_sites as
  select site, label, color, gsc_property, bing_site_url, cloudflare_zone_id,
         indexnow_key, github_repo, active, sort_order
  from company.seo_sites
  where active = true
  order by sort_order;

grant select on public.v_seo_sites to anon, authenticated;
