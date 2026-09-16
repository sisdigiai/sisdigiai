-- 133 — fato tem dono: leitura travada por marca, medição amarrada ao fato, brand_slug amarrado à marca
--
-- ✔ APLICADA em 16/09/2026 às 15:11:38 BRT (18:11 UTC), logo depois da 132, com a mesma palavra do dono.
--   Travas passaram. Medido depois: 340 de 340 medições com fato_id; 1 política em mkt.fatos; v_mkt_fatos
--   security_invoker, 16 linhas, 13 frescas. Provas por chamada real: anon na PostgREST → 401; verificar-fatos
--   chamada como o cron chama (15:12:13) → HTTP 200, 14 medidos, 14 linhas novas com fato_id — ou seja, o
--   caminho service_role do MKT continua lendo a view invoker. Falta só: o dono logado ver 16 no card.
--   Nota: antes de aplicar, o entry check exigia exatamente 330 sem fato_id e o cron de 04:30 já tinha somado 10
--   (340) — a trava bateu no ensaio e foi trocada por "nenhuma amarrada ainda".
--
-- (Escrita como NÃO APLICADA.) RODA DEPOIS DA 132 (trava de entrada garante).
--
-- DE ONDE VEM: os três defeitos que a medição de 16/09 achou em mkt.fatos / ops.fato_medicao,
--   virados em ordem pelo Orquestrador Geral na mesma leva dos fatos da folha única.
--
-- (1) LEITURA — mkt.fatos tem RLS ligada e ZERO políticas, e nenhum grant fora de postgres.
--     Quem lê hoje é a view public.v_mkt_fatos, que é SECURITY DEFINER (roda como dona, postgres):
--     ou seja, QUALQUER usuário logado do projeto lê TODOS os fatos de TODAS as marcas, e a trava
--     por marca (mkt.pode_ver_brand) não vale nada nesse caminho. Isso conserta:
--       • grant select em mkt.fatos para authenticated e service_role (anon continua sem nada);
--       • política fatos_sel: admin do MKT OU vínculo de marca, resolvendo brand_slug em mkt.brands.code;
--       • v_mkt_fatos passa a security_invoker — a partir daí a trava vale também pela view.
--     EFEITO NO FRONT: o card "Fatos publicáveis" do Marketing (MarketingEspelho.tsx) passa a obedecer
--     à marca. O dono é admin no MKT: continua vendo os 16. Quem não é admin e não tem vínculo em
--     mkt.user_brands passa a ver ZERO — hoje isso é todo mundo menos o dono. É fail-closed de propósito.
--     O gerador do MKT lê por service_role, que tem BYPASSRLS: não muda nada para ele.
--
-- (2) MEDIÇÃO — ops.fato_medicao tem 330 linhas em 33 dias seguidos e 330 com fato_id NULO.
--     A causa não é a edge: fn_registrar_medicao_fato espera `fato_id` no payload, e a edge manda só
--     `chave` — ela lê v_mkt_fatos, que nem expõe o id. Conserto no lugar certo: a RPC resolve a chave.
--     Backfill das 330 linhas antigas (as 10 chaves medidas existem todas em mkt.fatos).
--
-- (3) BRAND_SLUG — é texto solto, sem FK. Foi assim que nasceu 'clearix', marca que não existe.
--     Depois da 132 as duas linhas 'clearix' estão desativadas; aqui elas passam para 'digiai'
--     (decisão do Geral de 16/09: quem fala do Clearix é a marca DIGIAI) e o texto vira FK de verdade.
--     A FK é por mkt.brands.code (a coluna chama `code`, não `slug`) e NÃO exige NOT NULL de propósito:
--     pelo contrato do MKT (confirmado no código dele, 16/09), brand_slug NULO = fato de TODAS as marcas.
--     Escolhi FK e não CHECK porque CHECK não pode olhar outra tabela — o que a leva pedia ("CHECK contra
--     mkt.brands") só existiria como trigger, mais frouxo e mais fácil de furar que a FK.
--
-- (4) FRESCO EM HORÁRIO DE BRASÍLIA — v_mkt_fatos decide `fresco` com CURRENT_DATE, que no servidor é UTC:
--     das 21h à meia-noite BRT o fato é medido pelo dia seguinte. A view é recriada com CREATE OR REPLACE
--     (que o Postgres só aceita se nome, tipo e ordem das colunas ficarem idênticos — é a trava do contrato
--     do MKT de graça), trocando só a régua da data. Colunas e booleanos `fresco`/`publico` intactos.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from mkt.fatos where chave = 'clearix_os_2026') then
    raise exception 'a 132 (fatos da folha unica) ainda nao foi aplicada — esta migration roda depois dela.';
  end if;

  if exists (select 1 from mkt.fatos where ativo and brand_slug = 'clearix') then
    raise exception 'ainda ha fato ATIVO em brand_slug clearix — a 132 deveria te-los desativado.';
  end if;

  if exists (select 1 from pg_policies where schemaname = 'mkt' and tablename = 'fatos') then
    raise exception 'mkt.fatos ja tem politica — conferir antes de criar outra.';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
     where table_schema = 'mkt' and table_name = 'fatos' and grantee in ('anon','authenticated','service_role')
  ) then
    raise exception 'mkt.fatos ja tem grant fora de postgres — conferir antes.';
  end if;

  -- 330 quando a leva foi escrita; o verificador roda todo dia às 04:30 UTC e soma 10 por dia.
  -- A trava não é o número: é existir alguma com fato_id nulo e nenhuma estar amarrada ainda.
  if not exists (select 1 from ops.fato_medicao where fato_id is null)
  or exists (select 1 from ops.fato_medicao where fato_id is not null) then
    raise exception 'ops.fato_medicao ja tem fato_id preenchido — o backfill ja rodou?';
  end if;

  if exists (select 1 from ops.fato_medicao m where not exists (select 1 from mkt.fatos f where f.chave = m.chave)) then
    raise exception 'ha medicao com chave que nao existe mais em mkt.fatos — o backfill deixaria buraco.';
  end if;

  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'mkt' and t.relname = 'brands' and c.conname = 'brands_code_key'
  ) then
    raise exception 'mkt.brands nao tem UNIQUE (code) — a FK de brand_slug nao pode ser criada.';
  end if;
end $$;

-- ── (1) leitura de fato passa pela marca ──────────────────────────────────────
grant select on mkt.fatos to authenticated, service_role;
revoke all on mkt.fatos from anon;

create policy fatos_sel on mkt.fatos
  for select
  using (
    mkt.is_admin()
    or exists (
      select 1 from mkt.brands b
       where b.code = mkt.fatos.brand_slug
         and mkt.pode_ver_brand(b.id)
    )
    -- brand_slug nulo = fato de todas as marcas (contrato do MKT): quem tem QUALQUER vínculo lê
    or (
      mkt.fatos.brand_slug is null
      and exists (
        select 1 from mkt.user_brands ub
          join mkt.app_users u on u.id = ub.user_id
         where u.auth_user_id = auth.uid() and u.deleted_at is null
      )
    )
  );

-- ── (4) fresco pela data de Brasília, mesmas colunas ──────────────────────────
-- CREATE OR REPLACE: o Postgres recusa se nome, tipo ou ordem de coluna mudar.
create or replace view public.v_mkt_fatos
with (security_invoker = on) as
  select brand_slug,
         chave,
         fato,
         valor_numerico,
         fonte,
         verificado_em,
         validade_dias,
         publico,
         verificado_em + validade_dias as valido_ate,
         (now() at time zone 'America/Sao_Paulo')::date <= (verificado_em + validade_dias) as fresco
    from mkt.fatos
   where ativo
   order by brand_slug, chave;

revoke all on public.v_mkt_fatos from anon;

-- ── (2) a medição volta a apontar para o fato ─────────────────────────────────
create or replace function public.fn_registrar_medicao_fato(p_linhas jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public', 'ops', 'mkt'
as $function$
declare v_n integer;
begin
  if p_linhas is null or jsonb_typeof(p_linhas) <> 'array' then
    raise exception 'p_linhas precisa ser um array jsonb';
  end if;

  -- a edge manda `chave` (le v_mkt_fatos, que nao expoe id); o id se resolve aqui.
  insert into ops.fato_medicao (fato_id, chave, fonte, valor_texto, valor_medido, veredito, detalhe)
  select coalesce(
           nullif(l->>'fato_id','')::uuid,
           (select f.id from mkt.fatos f where f.chave = l->>'chave')
         ),
         l->>'chave', l->>'fonte',
         nullif(l->>'valor_texto','')::numeric,
         nullif(l->>'valor_medido','')::numeric,
         l->>'veredito', l->>'detalhe'
    from jsonb_array_elements(p_linhas) as l;

  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

update ops.fato_medicao m
   set fato_id = f.id
  from mkt.fatos f
 where f.chave = m.chave
   and m.fato_id is null;

-- ── (3) brand_slug amarrado a uma marca que existe ────────────────────────────
update mkt.fatos
   set brand_slug = 'digiai', updated_at = now()
 where brand_slug = 'clearix';

alter table mkt.fatos
  add constraint fatos_brand_slug_fkey
    foreign key (brand_slug) references mkt.brands(code) on update cascade;

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
declare
  v_anon int;
  v_sem_id int;
  v_como_authenticated int;
  v_como_service int;
  v_ativos int;
begin
  -- (1) anon não ganhou nada, nem na tabela nem na view
  select count(*) into v_anon from information_schema.role_table_grants
   where grantee = 'anon' and ((table_schema='mkt' and table_name='fatos')
                            or (table_schema='public' and table_name='v_mkt_fatos'));
  if v_anon <> 0 then
    raise exception 'anon ficou com grant em fato.';
  end if;

  if not exists (select 1 from pg_policies where schemaname='mkt' and tablename='fatos' and policyname='fatos_sel' and cmd='SELECT') then
    raise exception 'politica fatos_sel nao existe.';
  end if;

  if coalesce((select array_to_string(reloptions, ',') from pg_class where oid='public.v_mkt_fatos'::regclass), '')
     not like '%security_invoker=on%' then
    raise exception 'v_mkt_fatos continua rodando como dona — a trava por marca nao valeria pela view.';
  end if;

  -- (4) contrato do MKT: nomes, tipos e ordem das colunas exatamente como ele lê
  if (select string_agg(column_name||':'||data_type, ',' order by ordinal_position)
        from information_schema.columns
       where table_schema='public' and table_name='v_mkt_fatos')
     <> 'brand_slug:text,chave:text,fato:text,valor_numerico:numeric,fonte:text,verificado_em:date,'
        || 'validade_dias:integer,publico:boolean,valido_ate:date,fresco:boolean' then
    raise exception 'v_mkt_fatos mudou de colunas — o gerador do MKT le por nome e tipo.';
  end if;

  if pg_get_viewdef('public.v_mkt_fatos'::regclass, true) not like '%America/Sao_Paulo%'
  or pg_get_viewdef('public.v_mkt_fatos'::regclass, true) ilike '%CURRENT_DATE%' then
    raise exception 'v_mkt_fatos continua decidindo fresco pelo dia UTC.';
  end if;

  -- (2) nenhuma medição órfã, nem velha nem nova
  select count(*) into v_sem_id from ops.fato_medicao where fato_id is null;
  if v_sem_id <> 0 then
    raise exception '% medicoes continuam sem fato_id.', v_sem_id;
  end if;

  -- (3) todo fato aponta para marca que existe
  if exists (select 1 from mkt.fatos f where not exists (select 1 from mkt.brands b where b.code = f.brand_slug)) then
    raise exception 'ha fato com brand_slug fora de mkt.brands.';
  end if;
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
     where n.nspname='mkt' and t.relname='fatos' and c.conname='fatos_brand_slug_fkey'
  ) then
    raise exception 'FK de brand_slug nao existe.';
  end if;

  select count(*) into v_ativos from mkt.fatos where ativo;

  -- O QUE NÃO DÁ PARA PROVAR AQUI: o efeito da RLS. `set role authenticated` não serve —
  -- mkt.contexto_privilegiado() olha SESSION_USER, que continua postgres, então is_admin()
  -- devolveria true e a política aprovaria tudo. Provar exige chamada real com JWT.
  -- O que dá para medir é o RAMO DO VÍNCULO da política, sozinho, sem o ramo do admin:
  select count(*) into v_como_authenticated
    from mkt.fatos f
   where exists (
     select 1 from mkt.brands b
      join mkt.user_brands ub on ub.brand_id = b.id
     where b.code = f.brand_slug
   );
  if v_como_authenticated <> 0 then
    raise exception 'esperava 0 fatos alcancaveis por vinculo de marca (mkt.user_brands esta vazia), achei %.',
      v_como_authenticated;
  end if;

  -- e o gerador do MKT (service_role) tem BYPASSRLS: a política não o alcança
  select count(*) into v_como_service from pg_roles where rolname = 'service_role' and rolbypassrls;
  if v_como_service <> 1 then
    raise exception 'service_role perdeu BYPASSRLS — a edge do MKT quebraria com a view invoker.';
  end if;
  if not exists (
    select 1 from information_schema.role_table_grants
     where table_schema='mkt' and table_name='fatos' and grantee='service_role' and privilege_type='SELECT'
  ) then
    raise exception 'service_role sem SELECT em mkt.fatos — a view invoker quebraria para a edge.';
  end if;
  if v_ativos < 1 then
    raise exception 'nenhum fato ativo apos a leva.';
  end if;
end $$;

-- prova de comportamento da RPC, desfeita na hora: medição nova nasce com fato_id
do $$
begin
  begin
    perform public.fn_registrar_medicao_fato(jsonb_build_array(jsonb_build_object(
      'chave', 'osi_oferta', 'fonte', 'prova da 133', 'veredito', 'nao_verificavel',
      'detalhe', 'PROVA_133 — linha de ensaio, desfeita no mesmo bloco'
    )));
    if not exists (
      select 1 from ops.fato_medicao
       where detalhe like 'PROVA_133%' and fato_id = (select id from mkt.fatos where chave = 'osi_oferta')
    ) then
      raise exception 'PROVA_133_FALHOU: medicao nova continuou sem fato_id';
    end if;
    raise exception 'PROVA_133_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_133_OK' then raise; end if;
  end;
end $$;

-- prova da régua da data, desfeita na hora: a fronteira do fresco é o dia de Brasília
do $$
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  begin
    insert into mkt.fatos (brand_slug, chave, fato, fonte, verificado_em, validade_dias, publico, ativo)
    values ('digiai', 'prova_133_vence_hoje',   'linha de ensaio', 'prova', v_hoje - 30, 30, true, true),
           ('digiai', 'prova_133_venceu_ontem', 'linha de ensaio', 'prova', v_hoje - 31, 30, true, true);

    if not exists (select 1 from public.v_mkt_fatos where chave='prova_133_vence_hoje' and fresco)
    or exists     (select 1 from public.v_mkt_fatos where chave='prova_133_venceu_ontem' and fresco) then
      raise exception 'PROVA_133_FRESCO_FALHOU: a fronteira do fresco nao caiu no dia de Brasilia';
    end if;
    raise exception 'PROVA_133_FRESCO_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_133_FRESCO_OK' then raise; end if;
  end;
end $$;

commit;
