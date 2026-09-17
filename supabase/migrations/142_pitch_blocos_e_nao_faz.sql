-- 142 — pitch dinâmico: blocos "dúvida → solução" e lista "isso o Clearix não faz", travados como as ideias
--
-- ⛔ RASCUNHO PARA REVISÃO DO ORQUESTRADOR GERAL. NÃO APLICADA. Sem palavra do dono para DDL ainda.
--
-- DE ONDE VEM: pedido do dono (canal do eco, 17/09 00h55) e recomendação do Geral
--   (Cockpit/comercial/pitch-dinamico-recomendacao-2026-09-17.md): tela Comercial › Pitch no digiai, lendo uma tabela de
--   blocos alimentada pela consolidação do eco (_ANAMNESE_2026-09-16_DUVIDAS_E_SOLUCOES.md em cada sub-app do Clearix).
--
-- TRÊS DIFERENÇAS DO RECOMENDADO, MEDIDAS NO BANCO EM 17/09:
--   1. Não existe schema `comercial`. Tudo do Comercial mora em `ops` (commercial_leads, meeting_sessions, proposals,
--      playbooks), com RLS por is_staff(). As tabelas nascem em `ops` (pitch_blocos, pitch_nao_faz) e a view fica
--      public.v_comercial_pitch — sem schema novo, sem grant novo a expor.
--   2. `iam.clearix_packages` NÃO está neste banco (o rótulo do pacote mora no Clearix/landing). O digiai não lê o
--      crm_erp. Esta migration não resolve o rótulo: ver "rótulo" no desenho — decisão pendente.
--   3. O fechamento não precisa de tabela nova: ops.meeting_sessions já tem pain_noted, objections_raised, outcome,
--      next_action, follow_up_date, duration_min, interest_plan e interest_apps. A tela grava ali e em
--      ops.commercial_leads (next_step, next_touch_at) pelas RPCs que já existem.
--
-- A RÉGUA (mesma lógica das ideias, 135): bloco só aparece se
--   • aprovado (palavra do dono por lote, pela função, nunca por UPDATE);
--   • dentro de valido_ate (dia de Brasília);
--   • rota verificada no código do sub-app há no máximo 30 dias (rota_verificada_em) — a rota mora no código do Clearix,
--     que este banco não enxerga; quem prova é o agente que consolidou, com a data;
--   • fato_chave, se houver, ativo + público + fresco em v_mkt_fatos (marca digiai ou nula);
--   • sem preço no texto (preço só no rótulo);
--   • pergunta da anamnese entre 1 e 6.

begin;

do $$
begin
  if to_regclass('ops.pitch_blocos') is not null or to_regclass('ops.pitch_nao_faz') is not null then
    raise exception 'tabelas do pitch ja existem.';
  end if;
end $$;

create table ops.pitch_blocos (
  id                  uuid primary key default gen_random_uuid(),
  app_slug            text not null check (app_slug ~ '^clearix_[a-z]+$'),      -- sub-app do Clearix (pasta)
  duvida              text not null,                                              -- nas palavras do dono de ótica
  pergunta_numero     smallint not null check (pergunta_numero between 1 and 6),
  pergunta_texto      text not null,                                              -- a de acompanhamento que revela a dor
  solucao             text not null,
  rota                text not null check (rota ~ '^[A-Za-z0-9/_\[\]\-. ›·]+$'),
  registro_demo       text,                                                       -- registro seguro nomeado pelo agente
  ressalva            text not null,
  roteiro_60s         text not null,
  fato_chave          text,                                                       -- chave em mkt.fatos
  pacote_minimo       text check (pacote_minimo in ('essencial', 'controle', 'crescimento', 'completo')),
  fonte_arquivo       text not null check (fonte_arquivo ~ '^clearix_eco_full/clearix_[a-z]+/_ANAMNESE_[0-9-]+_DUVIDAS_E_SOLUCOES\.md$'),
  rota_verificada_em  date not null,
  valido_ate          date not null,
  aprovado_por        text,
  aprovado_em         timestamptz,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint pitch_blocos_aprovacao_coerente check ((aprovado_em is null) = (aprovado_por is null)),
  constraint pitch_blocos_uq unique (app_slug, duvida)
);

create table ops.pitch_nao_faz (
  id               uuid primary key default gen_random_uuid(),
  app_slug         text not null check (app_slug ~ '^clearix_[a-z]+$'),
  duvida           text not null,
  pergunta_texto   text,
  resposta         text not null,                                                 -- o que responder, sem inventar
  fonte_arquivo    text not null check (fonte_arquivo ~ '^clearix_eco_full/clearix_[a-z]+/_ANAMNESE_[0-9-]+_DUVIDAS_E_SOLUCOES\.md$'),
  valido_ate       date not null,
  aprovado_por     text,
  aprovado_em      timestamptz,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pitch_nao_faz_aprovacao_coerente check ((aprovado_em is null) = (aprovado_por is null)),
  constraint pitch_nao_faz_uq unique (app_slug, duvida)
);

alter table ops.pitch_blocos enable row level security;
alter table ops.pitch_nao_faz enable row level security;
create policy pitch_blocos_staff_select on ops.pitch_blocos for select using (is_staff());
create policy pitch_nao_faz_staff_select on ops.pitch_nao_faz for select using (is_staff());
revoke all on ops.pitch_blocos, ops.pitch_nao_faz from anon;
grant select on ops.pitch_blocos, ops.pitch_nao_faz to authenticated;
-- sem política de escrita para authenticated: quem grava é a carga (service_role) e a aprovação (função)

-- ── a régua ───────────────────────────────────────────────────────────────────
create or replace function ops.fn_pitch_bloco_problemas(p_id uuid)
returns text[]
language plpgsql stable
set search_path to 'ops', 'mkt', 'public'
as $function$
declare
  b ops.pitch_blocos;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v text[] := '{}';
begin
  select * into b from ops.pitch_blocos where id = p_id;
  if not found then return array['bloco nao existe'::text]; end if;
  if b.valido_ate < v_hoje then v := array_append(v, format('vencido em %s', b.valido_ate)); end if;
  if b.rota_verificada_em + 30 < v_hoje then v := array_append(v, format('rota verificada em %s, ha mais de 30 dias', b.rota_verificada_em)); end if;
  if b.fato_chave is not null and not exists (
       select 1 from mkt.fatos f
        where f.chave = b.fato_chave and f.ativo and f.publico
          and v_hoje <= f.verificado_em + f.validade_dias
          and (f.brand_slug is null or f.brand_slug = 'digiai')) then
    v := array_append(v, format('fato %s vencido, interno, inativo ou de outra marca', b.fato_chave));
  end if;
  if concat_ws(' ', b.duvida, b.solucao, b.ressalva, b.roteiro_60s) ~* '(r\$|[0-9]\s*reais\M|[0-9]+,[0-9]{2}\M)' then
    v := array_append(v, 'preco no texto (preco so no rotulo)'::text);
  end if;
  return v;
end;
$function$;

-- ── aprovação: só pela função, por lote ───────────────────────────────────────
create or replace function ops.tg_pitch_aprovacao()
returns trigger language plpgsql as $function$
begin
  if (tg_op = 'INSERT' and new.aprovado_em is not null)
  or (tg_op = 'UPDATE' and (new.aprovado_em, new.aprovado_por) is distinct from (old.aprovado_em, old.aprovado_por)) then
    if coalesce(current_setting('ops.pitch_aprovando', true), '') <> 'sim' then
      raise exception 'aprovacao do pitch so por ops.fn_aprovar_pitch';
    end if;
  end if;
  return new;
end;
$function$;
create trigger tg_pitch_blocos_aprovacao before insert or update on ops.pitch_blocos
  for each row execute function ops.tg_pitch_aprovacao();
create trigger tg_pitch_nao_faz_aprovacao before insert or update on ops.pitch_nao_faz
  for each row execute function ops.tg_pitch_aprovacao();

create or replace function ops.fn_aprovar_pitch(p_blocos uuid[], p_nao_faz uuid[], p_aprovado_por text)
returns jsonb
language plpgsql security definer
set search_path to 'ops', 'mkt', 'public'
as $function$
declare v_falhas text; v_b int; v_n int;
begin
  if coalesce(trim(p_aprovado_por), '') = '' then raise exception 'aprovado_por obrigatorio (quem, onde, quando)'; end if;
  select string_agg(format('%s: %s', id, array_to_string(ops.fn_pitch_bloco_problemas(id), '; ')), E'\n') into v_falhas
    from ops.pitch_blocos where id = any (coalesce(p_blocos, '{}')) and cardinality(ops.fn_pitch_bloco_problemas(id)) > 0;
  if v_falhas is not null then raise exception E'lote do pitch recusado inteiro:\n%', v_falhas; end if;
  perform set_config('ops.pitch_aprovando', 'sim', true);
  update ops.pitch_blocos set aprovado_em = now(), aprovado_por = p_aprovado_por, updated_at = now()
   where id = any (coalesce(p_blocos, '{}')) and aprovado_em is null;
  get diagnostics v_b = row_count;
  update ops.pitch_nao_faz set aprovado_em = now(), aprovado_por = p_aprovado_por, updated_at = now()
   where id = any (coalesce(p_nao_faz, '{}')) and aprovado_em is null;
  get diagnostics v_n = row_count;
  perform set_config('ops.pitch_aprovando', '', true);
  return jsonb_build_object('blocos', v_b, 'nao_faz', v_n);
end;
$function$;
revoke all on function ops.fn_aprovar_pitch(uuid[], uuid[], text) from public, anon, authenticated;
grant execute on function ops.fn_aprovar_pitch(uuid[], uuid[], text) to service_role;
revoke all on function ops.fn_pitch_bloco_problemas(uuid) from public, anon;
grant execute on function ops.fn_pitch_bloco_problemas(uuid) to authenticated, service_role;

-- ── o que a tela lê ───────────────────────────────────────────────────────────
create view public.v_comercial_pitch
with (security_invoker = on) as
  select b.id, b.app_slug, b.duvida, b.pergunta_numero, b.pergunta_texto, b.solucao, b.rota, b.registro_demo,
         b.ressalva, b.roteiro_60s, b.pacote_minimo, b.valido_ate, b.rota_verificada_em,
         b.fato_chave, f.fato as fato_texto, f.verificado_em as fato_verificado_em
    from ops.pitch_blocos b
    left join public.v_mkt_fatos f on f.chave = b.fato_chave
   where b.ativo and b.aprovado_em is not null
     and cardinality(ops.fn_pitch_bloco_problemas(b.id)) = 0;

create view public.v_comercial_pitch_nao_faz
with (security_invoker = on) as
  select n.id, n.app_slug, n.duvida, n.pergunta_texto, n.resposta, n.valido_ate
    from ops.pitch_nao_faz n
   where n.ativo and n.aprovado_em is not null
     and n.valido_ate >= (now() at time zone 'America/Sao_Paulo')::date;

revoke all on public.v_comercial_pitch, public.v_comercial_pitch_nao_faz from public, anon;
grant select on public.v_comercial_pitch, public.v_comercial_pitch_nao_faz to authenticated, service_role;

-- ── prova de comportamento, desfeita na hora ──────────────────────────────────
do $$
declare v_ok uuid; v_ruim uuid; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date; v_msg text;
begin
  begin
    insert into ops.pitch_blocos (app_slug, duvida, pergunta_numero, pergunta_texto, solucao, rota, ressalva, roteiro_60s,
                                  fato_chave, fonte_arquivo, rota_verificada_em, valido_ate)
    values ('clearix_vendas', 'PROVA_142 entreguei e o cliente sumiu devendo', 3, 'Ja entregaram com saldo aberto?',
            'Entrega trava sozinha com saldo sem carne.', 'vendas/entregas', 'A trava vale para saldo sem carne.',
            'Abrir a OS, mostrar o bloqueio.', 'clearix_entregas_2026',
            'clearix_eco_full/clearix_vendas/_ANAMNESE_2026-09-16_DUVIDAS_E_SOLUCOES.md', v_hoje - 1, v_hoje + 30)
    returning id into v_ok;
    insert into ops.pitch_blocos (app_slug, duvida, pergunta_numero, pergunta_texto, solucao, rota, ressalva, roteiro_60s,
                                  fato_chave, fonte_arquivo, rota_verificada_em, valido_ate)
    values ('clearix_vendas', 'PROVA_142 ruim', 1, 'x', 'Custa R$ 349 por mes.', 'vendas/pdv', 'x', 'x', 'clearix_rede',
            'clearix_eco_full/clearix_vendas/_ANAMNESE_2026-09-16_DUVIDAS_E_SOLUCOES.md', v_hoje - 60, v_hoje - 1)
    returning id into v_ruim;

    begin
      update ops.pitch_blocos set aprovado_em = now(), aprovado_por = 'atalho' where id = v_ok;
      raise exception 'PROVA_142_FALHOU: aprovou por UPDATE direto';
    exception when others then
      if sqlerrm not like 'aprovacao do pitch so por%' then raise; end if;
    end;

    begin
      perform ops.fn_aprovar_pitch(array[v_ok, v_ruim], null, 'PROVA_142');
      raise exception 'PROVA_142_FALHOU: lote com bloco ruim foi aprovado';
    exception when others then
      v_msg := sqlerrm;
      if v_msg not like '%vencido em%' or v_msg not like '%rota verificada em%' or v_msg not like '%fato clearix_rede%'
      or v_msg not like '%preco no texto%' then raise; end if;
    end;

    perform ops.fn_aprovar_pitch(array[v_ok], null, 'PROVA_142');
    if not exists (select 1 from public.v_comercial_pitch where id = v_ok and fato_texto is not null) then
      raise exception 'PROVA_142_FALHOU: bloco bom aprovado nao aparece na tela com o numero da folha';
    end if;
    raise exception 'PROVA_142_OK';
  exception when others then
    if sqlerrm <> 'PROVA_142_OK' then raise; end if;
  end;
end $$;

commit;
