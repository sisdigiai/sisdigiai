-- 159 — separar vitrine de app logado, senão o alarme de pixel toca em 31 telas e ninguém olha
--
-- ✔ APLICADA em 28/09/2026 entre 15:49 e 15:51 BRT (relógio exato não anotado no minuto), reensaiada antes. Medido depois: 6 vitrines, 2 medindo (OSI e Polá Petit)
--   e 4 cegas (clearix.app.br, digiai.app.br, e-commerce Mello, Nipo School); nenhum app de login virou alarme.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE: a 158 pôs a medição no lugar e o primeiro retrato saiu inútil de tão barulhento — 31 sites "sem
--   medição nenhuma", sendo que a maioria é sub-app do Clearix atrás de login, onde pixel não tem o que medir.
--   Aviso que toca sempre ensina a ignorar aviso; foi o mesmo motivo que tirou parado e aposentado do bloco
--   comercial do Portfólio. Aqui a coluna diz quem é vitrine e o alarme fica só onde entra visitante.
--
-- QUEM MARQUEI COMO VITRINE (6) e por quê: clearix.app.br e digiai.app.br (institucionais, porta de entrada),
--   landing da OSI e landing do Polá Petit (captação), e-commerce Mello e Nipo School (vendem/captam para fora).
--   Fora: sub-apps do Clearix, Hub, painéis internos, Atlas, Pulso, o app operacional do Polá — todos exigem
--   login. Fora também Lumina, Easy Aula+ e Qual a Foto: a ficha declara 'em uso interno' ou 'parado', e pôr
--   pixel em produto parado é medir plateia de sala fechada.
--
-- ESTA ESCOLHA É MINHA, não do dono — é reversível com um update na coluna, e a lista está aqui em cima para
--   ele discordar linha a linha. O que a marcação NÃO faz: instalar pixel em lugar nenhum.
--
-- O RETRATO QUE SOBRA (medido em 28/09/2026): das 6 vitrines, 2 medem (OSI e Polá Petit) e 4 estão cegas —
--   inclusive clearix.app.br, a landing do produto-âncora.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='company' and table_name='digital_assets' and column_name='mede_visitante') then
    raise exception 'a coluna mede_visitante ja existe — a 159 ja foi aplicada?';
  end if;
end $$;

alter table company.digital_assets add column mede_visitante boolean not null default false;
comment on column company.digital_assets.mede_visitante is
  '159: true = vitrine pública, onde faltar pixel é problema. false = app com login ou produto parado, onde medir visitante não faz sentido.';

update company.digital_assets set mede_visitante = true
 where deleted_at is null and categoria = 'site' and valor in (
   'https://clearix.app.br',
   'https://digiai.app.br',
   'https://landingoticasemimproviso.netlify.app',
   'https://polapetit.netlify.app',
   'https://mellooticas.netlify.app',
   'https://niposchool.vercel.app');

drop view public.v_ops_pixels;

create view public.v_ops_pixels
with (security_invoker = true) as
with sites as (
  select rotulo, valor as url, owner_product, provider, mede_visitante
    from company.digital_assets
   where deleted_at is null and categoria = 'site' and status = 'ativo'
), ultima as (
  select distinct on (url) url, medido_em, http_code, meta_pixel_id, tiktok, ga_gtm, clarity
    from ops.pixel_medicao order by url, medido_em desc
), declarado as (
  select unnest(produtos) as produto, servico, identificador
    from ops.contas_servicos
   where ativo and servico in ('meta_pixel', 'tiktok_pixel')
)
select s.rotulo as site, s.url, s.owner_product as produto, s.provider, s.mede_visitante,
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
         when u.meta_pixel_id is not null and not exists (
                select 1 from declarado d where d.produto = s.owner_product
                 and d.servico = 'meta_pixel' and d.identificador = u.meta_pixel_id)
                                                      then 'pixel no ar que o inventário não conhece'
         when u.meta_pixel_id is null and not u.tiktok and u.ga_gtm is null and not u.clarity
           then case when s.mede_visitante then 'vitrine cega — entra visitante e ninguém conta'
                     else 'app com login · não mede visitante' end
         else 'medindo'
       end as veredito
  from sites s
  left join ultima u on u.url = s.url;

revoke all on public.v_ops_pixels from public, anon;
grant select on public.v_ops_pixels to authenticated, service_role;
comment on view public.v_ops_pixels is
  '158/159: por site — pixel declarado no inventário × encontrado no ar. Só vitrine (mede_visitante) vira alarme.';

do $$
declare v_vitrine int; v_cega int; v_medindo int;
begin
  select count(*) into v_vitrine from public.v_ops_pixels where mede_visitante;
  if v_vitrine <> 6 then raise exception 'PROVA_159_FALHOU: % vitrines, esperava 6', v_vitrine; end if;

  select count(*) into v_medindo from public.v_ops_pixels where veredito = 'medindo';
  select count(*) into v_cega from public.v_ops_pixels where veredito like 'vitrine cega%';
  if v_medindo <> 2 or v_cega <> 4 then
    raise exception 'PROVA_159_FALHOU: medindo=% cegas=%, esperava 2 e 4 pelo medido de 28/09', v_medindo, v_cega;
  end if;

  -- nenhum app de login pode virar alarme
  if exists (select 1 from public.v_ops_pixels where not mede_visitante and veredito like 'vitrine cega%') then
    raise exception 'PROVA_159_FALHOU: app com login virou alarme';
  end if;
end $$;

commit;
