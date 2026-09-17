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
-- REVISÃO DO GERAL (17/09): aceitas as diferenças acima, com duas decisões:
--   • rótulo do pacote = fatos em mkt.fatos (clearix_pacote_essencial/controle/crescimento/completo), leva de fatos
--     separada — esta migration não depende dela;
--   • demonstração no TENANT REAL (Grupo Mello), logado como o dono (ordem do dono de 17/09 00h50, repassada). Por isso
--     cada bloco traz registro_seguro + url_demo + nao_clicar; sem registro seguro nomeado, o link fica desligado na tela.
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
  if to_regtype('ops.pitch_link_motivo') is not null then
    raise exception 'tipo ops.pitch_link_motivo ja existe.';
  end if;
  if to_regclass('ops.pitch_blocos') is not null or to_regclass('ops.pitch_nao_faz') is not null then
    raise exception 'tabelas do pitch ja existem.';
  end if;
end $$;

-- por que o link para a tela do Clearix está desligado (revisão do Geral com o eco/Lens, 17/09)
create type ops.pitch_link_motivo as enum ('sem_registro_seguro', 'lgpd', 'sigilo_comercial');

create table ops.pitch_blocos (
  id                  uuid primary key default gen_random_uuid(),
  app_slug            text not null check (app_slug ~ '^clearix_[a-z]+$'),      -- sub-app do Clearix (pasta)
  duvida              text not null,                                              -- nas palavras do dono de ótica
  pergunta_numero     smallint not null check (pergunta_numero between 1 and 6),
  pergunta_texto      text not null,                                              -- a de acompanhamento que revela a dor
  solucao             text not null,
  rota                text not null check (rota ~ '^[A-Za-z0-9/_\[\]\-. ›·]+$'),
  registro_seguro     text,                                                       -- registro do tenant real que pode ser mostrado, nomeado pelo agente
  url_demo            text check (url_demo is null or url_demo ~ '^https://'),    -- tela exata no tenant real
  nao_clicar          text,                                                       -- o que grava em produção e não se clica na demo
  -- LGPD: mostrar a tela do tenant real a um terceiro expõe dado de cliente ou funcionário real. Fail-closed: presume que a
  -- tela mostra dado pessoal até o agente que consolidou afirmar que não. Nome/papel do usuário logado na moldura NÃO conta
  -- (é o dono apresentando) — condição fixa de todo bloco: demo logada como o dono; não clicar no menu do usuário.
  dado_pessoal_na_tela    boolean not null default true,
  vista_sem_dado          text,                      -- como mostrar sem o dado (filtro, aba, recorte), se existir
  -- "sem dado pessoal" só vale com CONTROLE POSITIVO (método do eco, aceito pelo Geral em 17/09): a mesma tela/consulta num
  -- registro que TEM dado foi conferida e devolveu dado — senão o "não" pode ser só uma recusa da simulação. Texto curto:
  -- qual registro com dado foi conferido e o que apareceu. Afirmação só pelo código, sem abrir logado, não é controle.
  controle_positivo       text,
  -- Sigilo comercial: markup, custo, acordo com laboratório real, extrato/saldo bancário. Decisão do dono item a item;
  -- default desligado — só libera com sigilo_liberado_por (quem, onde, quando).
  sigilo_comercial        boolean not null default true,
  sigilo_liberado_por     text,
  ressalva            text not null,
  roteiro_60s         text not null,
  fato_chave          text,                                                       -- chave em mkt.fatos
  pacote_minimo       text check (pacote_minimo in ('essencial', 'controle', 'crescimento', 'completo')),
  fonte_arquivo       text not null check (fonte_arquivo ~ '^(clearix_eco_full|Cockpit/comercial)/[^ ]+\.md$'),
  rota_verificada_em  date not null,
  valido_ate          date not null,
  aprovado_por        text,
  aprovado_em         timestamptz,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint pitch_blocos_aprovacao_coerente check ((aprovado_em is null) = (aprovado_por is null)),
  constraint pitch_blocos_link_com_registro check (url_demo is null or registro_seguro is not null),
  constraint pitch_blocos_sem_dado_exige_controle check (dado_pessoal_na_tela or coalesce(btrim(controle_positivo), '') <> ''),
  constraint pitch_blocos_uq unique (app_slug, duvida)
);

create table ops.pitch_nao_faz (
  id               uuid primary key default gen_random_uuid(),
  app_slug         text not null check (app_slug ~ '^clearix_[a-z]+$'),
  duvida           text not null,
  pergunta_texto   text,
  resposta         text not null,                                                 -- o que responder, sem inventar
  fonte_arquivo    text not null check (fonte_arquivo ~ '^(clearix_eco_full|Cockpit/comercial)/[^ ]+\.md$'),
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
  select b.id, b.app_slug, b.duvida, b.pergunta_numero, b.pergunta_texto, b.solucao, b.rota,
         b.registro_seguro, b.url_demo, b.nao_clicar, (b.url_demo is not null and b.registro_seguro is not null and not b.dado_pessoal_na_tela
          and (not b.sigilo_comercial or b.sigilo_liberado_por is not null)) as link_liberado,
         (case when b.url_demo is null or b.registro_seguro is null then 'sem_registro_seguro'
               when b.dado_pessoal_na_tela then 'lgpd'
               when b.sigilo_comercial and b.sigilo_liberado_por is null then 'sigilo_comercial'
          end)::ops.pitch_link_motivo as link_motivo_desligado,
         b.vista_sem_dado,
         'demo logada como o dono; não clicar no menu do usuário'::text as condicao_fixa,
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
    -- LGPD: com url e registro, o link continua desligado enquanto ninguém afirmar que a tela não mostra dado pessoal
    update ops.pitch_blocos set url_demo = 'https://clearixhub.netlify.app/vendas/entregas', registro_seguro = 'OC-000015' where id = v_ok;
    if (select link_liberado from public.v_comercial_pitch where id = v_ok)
    or (select link_motivo_desligado from public.v_comercial_pitch where id = v_ok) <> 'lgpd' then
      raise exception 'PROVA_142_FALHOU: link liberado sem declarar a tela livre de dado pessoal';
    end if;
    -- "sem dado pessoal" sem controle positivo é recusado pelo banco
    begin
      update ops.pitch_blocos set dado_pessoal_na_tela = false where id = v_ok;
      raise exception 'PROVA_142_FALHOU: aceitou sem dado pessoal sem controle positivo';
    exception when check_violation then null;
    end;
    update ops.pitch_blocos set dado_pessoal_na_tela = false,
           controle_positivo = 'OC-000092 (tem cliente): a mesma rota mostrou nome e telefone; OC-000015 nao mostrou' where id = v_ok;
    if (select link_liberado from public.v_comercial_pitch where id = v_ok)
    or (select link_motivo_desligado from public.v_comercial_pitch where id = v_ok) <> 'sigilo_comercial' then
      raise exception 'PROVA_142_FALHOU: sigilo comercial liberado sem decisao do dono';
    end if;
    update ops.pitch_blocos set sigilo_comercial = false where id = v_ok;
    if not (select link_liberado from public.v_comercial_pitch where id = v_ok)
    or (select link_motivo_desligado from public.v_comercial_pitch where id = v_ok) is not null then
      raise exception 'PROVA_142_FALHOU: tela sem dado pessoal e sem sigilo nao liberou o link';
    end if;
    update ops.pitch_blocos set url_demo = null, registro_seguro = null where id = v_ok;
    if (select link_motivo_desligado from public.v_comercial_pitch where id = v_ok) <> 'sem_registro_seguro' then
      raise exception 'PROVA_142_FALHOU: sem registro seguro nao desligou o link';
    end if;
    raise exception 'PROVA_142_OK';
  exception when others then
    if sqlerrm <> 'PROVA_142_OK' then raise; end if;
  end;
end $$;

commit;
