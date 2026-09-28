-- 158 — pixel e medição de cada site: uma fonte só (inventário) e a prova do que está no ar
--
-- ✔ APLICADA em 28/09/2026 às 15:48:36 BRT, reensaiada antes. Medido depois: script medir-pixel rodou nos 33 sites
--   ativos e gravou 33 medições; a view listou os 33 sem perder nenhum.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE: o dono perguntou onde ficam salvos os acessos de pixel de cada site e landing. Ficam em DOIS lugares
--   que discordam entre si — ops.contas_servicos (com dono, navegador, painel e data de verificação) e
--   company.digital_assets (com domínio, site e também pixel). Dois donos do mesmo fato é como o carnê ficou com
--   dois números. Aqui o inventário passa a ser a fonte do ACESSO e o digital_assets fica com o ATIVO público;
--   quem cruza os dois é uma view, não uma pessoa lembrando.
--
-- O QUE FALTAVA DE VERDADE: ninguém sabia se o pixel declarado está disparando. Medido em 28/09/2026 nos 12
--   endereços públicos (HTML + bundle publicado): só DUAS propriedades têm medição — landing da OSI (Meta
--   1010582578011237 + TikTok) e landing do Polá Petit (Meta 1792075898806171, atrás do consentimento LGPD).
--   digiai.app.br, clearix.app.br, mellooticas, nexus, nipo, qualfoto, lumina, calc e o app leitor da OSI não
--   têm pixel nem analytics nenhum; pulso-hub.netlify.app responde 404 e continua declarado ativo.
--   O caso do Clearix é o que dói: é a landing do produto-âncora e não mede visitante nenhum.
--
-- DUAS CORREÇÕES DE FATO, com prova:
--   1. o pixel do Polá Petit está marcado 'pausado' no inventário e ESTÁ no bundle publicado (medido hoje).
--      Pausada está a conta de anúncios (275190395019982), não a instalação. O registro passa a dizer isso.
--   2. company.digital_assets diz que app.digiai.app.br é Netlify; é Cloudflare Pages desde a migração.
--
-- O QUE NÃO FAÇO AQUI, de propósito: não apago nem mexo nos 4 registros de meta_pixel que têm nome e não têm ID
--   ('pixel_landing_page', 'landing_page', 'Pixel de OTM_TOTAL', 'pixel_lancaster'). Sem ID não dá para medir e
--   inventar ID é pior que buraco; quem lê no painel da Meta é o dono. A view os mostra como 'sem identificador'.
--   Também não mexo no status do pulso-hub: a medição diz 404 e a view mostra; sobrescrever a declaração do dono
--   por conta própria é o erro que esta casa evita.

begin;

do $$
begin
  if to_regclass('ops.pixel_medicao') is not null then
    raise exception 'ops.pixel_medicao ja existe — a 158 ja foi aplicada?';
  end if;
end $$;

create table ops.pixel_medicao (
  id             bigserial primary key,
  url            text not null,
  medido_em      timestamptz not null default now(),
  http_code      int,
  meta_pixel_id  text,
  tiktok         boolean not null default false,
  ga_gtm         text,
  clarity        boolean not null default false,
  fonte          text not null default 'scripts/medir-pixel.mjs',
  obs            text
);
create index pixel_medicao_url_idx on ops.pixel_medicao (url, medido_em desc);
comment on table ops.pixel_medicao is
  '158: o que foi encontrado no HTML e no bundle publicado de cada site. Medição, não declaração — guarda histórico.';

alter table ops.pixel_medicao enable row level security;
create policy pixel_medicao_staff_select on ops.pixel_medicao for select using (is_staff());
revoke all on ops.pixel_medicao from anon;
grant select on ops.pixel_medicao to authenticated;

-- dívida da 153 paga de passagem: contas_servicos tinha RLS ligada e nenhuma policy, o que obrigava view de dono.
-- Com a policy de staff, view de contrato pode nascer security_invoker como manda a R-043.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='ops' and tablename='contas_servicos') then
    create policy contas_servicos_staff_select on ops.contas_servicos for select using (is_staff());
  end if;
end $$;

create function ops.fn_registrar_pixel_medicao(p jsonb)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into ops.pixel_medicao (url, http_code, meta_pixel_id, tiktok, ga_gtm, clarity, fonte, obs)
  select x->>'url', (x->>'http_code')::int, nullif(x->>'meta_pixel_id',''),
         coalesce((x->>'tiktok')::boolean, false), nullif(x->>'ga_gtm',''),
         coalesce((x->>'clarity')::boolean, false),
         coalesce(x->>'fonte', 'scripts/medir-pixel.mjs'), nullif(x->>'obs','')
    from jsonb_array_elements(p) x
  returning 1;
$$;
revoke all on function ops.fn_registrar_pixel_medicao(jsonb) from public, anon, authenticated;
grant execute on function ops.fn_registrar_pixel_medicao(jsonb) to service_role;

create view public.v_ops_pixels
with (security_invoker = true) as
with sites as (
  select rotulo, valor as url, owner_product, provider
    from company.digital_assets
   where deleted_at is null and categoria = 'site' and status = 'ativo'
), ultima as (
  select distinct on (url) url, medido_em, http_code, meta_pixel_id, tiktok, ga_gtm, clarity
    from ops.pixel_medicao order by url, medido_em desc
), declarado as (
  select unnest(produtos) as produto, servico, identificador, conta_dona, url_painel, status
    from ops.contas_servicos
   where ativo and servico in ('meta_pixel', 'tiktok_pixel')
)
select s.rotulo as site, s.url, s.owner_product as produto, s.provider,
       u.medido_em, u.http_code,
       u.meta_pixel_id as meta_no_ar, u.tiktok as tiktok_no_ar, u.ga_gtm, u.clarity,
       (select string_agg(d.identificador, ', ' order by d.identificador) from declarado d
         where d.produto = s.owner_product and d.servico = 'meta_pixel'
           and d.identificador ~ '^[0-9]{14,16}$')                          as meta_declarado,
       (select string_agg(d.identificador, ', ' order by d.identificador) from declarado d
         where d.produto = s.owner_product and d.servico = 'tiktok_pixel')  as tiktok_declarado,
       case
         when u.medido_em is null                     then 'nunca medido'
         when coalesce(u.http_code, 0) >= 400         then 'site fora do ar (' || u.http_code || ')'
         when u.meta_pixel_id is null and not u.tiktok and u.ga_gtm is null and not u.clarity
                                                      then 'sem medição nenhuma'
         when u.meta_pixel_id is not null and not exists (
                select 1 from declarado d where d.produto = s.owner_product
                 and d.servico = 'meta_pixel' and d.identificador = u.meta_pixel_id)
                                                      then 'pixel no ar que o inventário não conhece'
         else 'medindo'
       end as veredito
  from sites s
  left join ultima u on u.url = s.url;

revoke all on public.v_ops_pixels from public, anon;
grant select on public.v_ops_pixels to authenticated, service_role;
comment on view public.v_ops_pixels is
  '158: por site público — pixel declarado no inventário × pixel encontrado no ar. Fonte do acesso é ops.contas_servicos; company.digital_assets fica com o ativo público.';

-- correção 1: o pixel do Polá Petit está instalado e medido; pausada é a conta de anúncios
update ops.contas_servicos
   set status = 'ok',
       produtos = array['polapetit'],
       url_painel = 'https://business.facebook.com/events_manager2',
       ultima_verificacao = now(),
       ultimo_detalhe = 'ID encontrado no bundle publicado de polapetit.netlify.app em 28/09/2026',
       obs = coalesce(obs || ' · ', '') ||
             '158: estava "pausado"; o pixel dispara na landing atrás do consentimento LGPD (pp_consent_v1). '
             'Pausada é a conta de anúncios 275190395019982, não a instalação.'
 where servico = 'meta_pixel' and identificador = '1792075898806171';

-- correção 2: o painel interno mudou de casa e o registro ficou para trás
update company.digital_assets
   set provider = 'Cloudflare Pages',
       observacoes = coalesce(observacoes || ' · ', '') || '158: registro dizia Netlify; migrou para Cloudflare Pages.',
       updated_at = now()
 where categoria = 'site' and valor = 'https://app.digiai.app.br' and provider = 'Netlify';

do $$
declare v int;
begin
  if has_table_privilege('anon', 'ops.pixel_medicao', 'select')
  or has_table_privilege('anon', 'public.v_ops_pixels', 'select')
  or has_function_privilege('authenticated', 'ops.fn_registrar_pixel_medicao(jsonb)', 'execute') then
    raise exception 'PROVA_158_FALHOU: anon/authenticated com acesso indevido.';
  end if;

  if (select count(*) from ops.contas_servicos
       where servico='meta_pixel' and identificador='1792075898806171' and status='ok') <> 1 then
    raise exception 'PROVA_158_FALHOU: o pixel do Polá Petit nao ficou corrigido';
  end if;

  -- a view tem de listar TODOS os sites ativos, inclusive os que nunca foram medidos
  select count(*) into v from public.v_ops_pixels;
  if v <> (select count(*) from company.digital_assets
            where deleted_at is null and categoria='site' and status='ativo') then
    raise exception 'PROVA_158_FALHOU: a view perdeu site pelo caminho (% de %)', v,
      (select count(*) from company.digital_assets where deleted_at is null and categoria='site' and status='ativo');
  end if;
  if (select count(*) from public.v_ops_pixels where veredito <> 'nunca medido') <> 0 then
    raise exception 'PROVA_158_FALHOU: apareceu medicao antes do script rodar';
  end if;

  begin
    perform ops.fn_registrar_pixel_medicao(
      '[{"url":"https://prova-158.invalido","http_code":200,"meta_pixel_id":"999999999999999","fonte":"prova"}]'::jsonb);
    if (select count(*) from ops.pixel_medicao where fonte='prova') <> 1 then
      raise exception 'PROVA_158_FALHOU: nao gravou a medicao';
    end if;
    raise exception 'PROVA_158_OK';
  exception when others then
    if sqlerrm <> 'PROVA_158_OK' then raise; end if;
  end;
end $$;

commit;
