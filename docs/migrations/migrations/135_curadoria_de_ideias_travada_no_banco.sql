-- 135 — curadoria de ideias de conteúdo travada no banco: o app cura, o dono aprova, o MKT lê
--
-- ✔ APLICADA em 16/09/2026 às 21:08:56 BRT, com a palavra do dono neste canal ("isso é importantíssimo"). Reensaiada antes.
--   Medido depois: pauta com 0 ideias; 71 com pilar, 28 sem (diálogos + método, para curadoria); 0 aprovadas;
--   v_mkt_pauta_curada invoker; fn_aprovar_ideias fechada a authenticated; gatilho da curadoria ativo.
--   Dono, na mesma resposta: a curadoria de ideias (o lote) é do Orquestrador Geral, não do app.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: palavra do dono de 16/09 (chegou pelo MKT): "para o agent do app trazer as ideias, para termos
--   travado no banco e nós criaremos tudo aqui". Desenho fechado pelo Orquestrador Geral no mesmo dia:
--   evoluir marketing.content_ideas (uma verdade só), view invoker só com aprovadas e válidas, o MKT copia para
--   mkt.ideias com origem 'curadoria_app', nunca o inverso. Aprovação = palavra do dono, por lote, neste canal.
--
-- O QUE MUDA:
--   • marketing.content_ideas ganha: marca (FK mkt.brands.code), titulo, movimento, dor_gatilho, etapa_funil,
--     fato_ids, prioridade, valida_ate, aprovada_por, aprovada_em.
--   • marketing.fn_ideia_problemas(id): a régua única. Lista o que impede a ideia de estar na pauta:
--       - marca ausente; valida_ate ausente ou vencida (dia de Brasília);
--       - movimento fora dos nomes de mkt.content_rules.universo.movimentos[].nome da marca;
--       - dor_gatilho fora de mkt.content_rules.gatilhos; etapa_funil fora de norte.funil.etapas;
--       - preço no texto (R$, "reais", 00,00) — trava do MKT;
--       - fato_id que não esteja ativo + público + fresco, ou que seja de outra marca.
--     As listas vêm do jsonb do MKT e podem mudar: por isso a régua roda na APROVAÇÃO e de novo na VIEW.
--     Se o MKT renomear um Movimento, a ideia que citava o nome velho sai da pauta sozinha.
--   • marketing.fn_aprovar_ideias(ids, aprovada_por, valida_ate) e fn_revogar_ideias(ids, motivo): só
--     service_role. Aprovar recusa o lote INTEIRO se uma ideia tiver problema, e diz qual e por quê.
--   • gatilho tg_content_ideas_curadoria: aprovada_em/aprovada_por/valida_ate só mudam por essas funções,
--     e ideia aprovada não tem o texto editado (revoga antes). Sem isso, a política marketing_ideas_staff_all
--     (ALL para qualquer staff) deixaria "aprovar" com um UPDATE — não seria trava.
--   • public.v_mkt_pauta_curada (security_invoker): o contrato do MKT.
--
-- PILAR (decisão do Geral, 16/09): vale mkt.content_rules.norte.pilares da marca — os 4 da OSI, que o gerador do MKT
--   já obedece. Os 7 pilares de marketing.content_pillars são taxonomia antiga do app: o nome antigo vai para
--   pilar_legado (histórico) e as 99 linhas recebem o pilar novo pelo mapa do Geral:
--     Dor real do balcão, O que muda na prática            → metodo de balcao na pratica
--     Bastidor e autoridade                                → bastidores do metodo (prova)
--     Oferta direta, Comunidade e continuidade             → convite direto pra turma
--     Diálogos e roleplays, O método (5 Movimentos)        → FICA NULO. O mapa manda decidir "conforme o texto"
--       entre metodo de balcao e erros que custam venda; isso é leitura de cada ideia, não regra de SQL, e toda
--       ideia antiga passa pela curadoria de qualquer jeito. Ideia sem pilar não se aprova (a régua recusa).
--   pilar_id não é tocado (a tela v_marketing_ideas continua mostrando o pilar antigo).
--
-- NÃO MUDA: v_marketing_ideas (a tela de ideias do app) e as 94 ideias vivas — ficam sem marca e sem aprovação,
--   fora da pauta, até passarem por curadoria (app) → revisão (Geral) → lote ao dono.
-- EFEITO NO FRONT: nenhum hoje. A pauta nasce vazia.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='marketing' and table_name='content_ideas'
                and column_name in ('marca','titulo','movimento','dor_gatilho','etapa_funil','fato_ids',
                                    'prioridade','valida_ate','aprovada_por','aprovada_em')) then
    raise exception 'content_ideas ja tem coluna da curadoria — a 135 ja foi aplicada?';
  end if;

  if md5(pg_get_viewdef('public.v_marketing_ideas'::regclass)) <> '072e1378eea1a402a263ef183411e214' then
    raise exception 'v_marketing_ideas mudou — conferir antes (esta migration promete nao mexer nela).';
  end if;

  if to_regclass('public.v_mkt_pauta_curada') is not null then
    raise exception 'v_mkt_pauta_curada ja existe.';
  end if;

  if (select udt_name from information_schema.columns
       where table_schema='mkt' and table_name='content_rules' and column_name='gatilhos') <> '_text' then
    raise exception 'mkt.content_rules.gatilhos deixou de ser text[] — a regua precisa ser reescrita.';
  end if;

  if (select count(*) from mkt.content_rules r join mkt.brands b on b.id = r.brand_id
       where b.code = 'osi'
         and jsonb_array_length(r.universo->'movimentos') = 5
         and jsonb_array_length(r.norte->'funil'->'etapas') = 5
         and cardinality(r.gatilhos) = 6
         and jsonb_array_length(r.norte->'pilares') = 4) <> 1 then
    raise exception 'as listas canonicas da OSI nao estao como medidas em 16/09 (5 movimentos, 5 etapas, 6 gatilhos, 4 pilares).';
  end if;
end $$;

-- ── colunas ───────────────────────────────────────────────────────────────────
alter table marketing.content_ideas
  add column marca        text references mkt.brands(code) on update cascade,
  add column titulo       text,
  add column pilar        text,
  add column pilar_legado text,
  add column movimento    text,
  add column dor_gatilho  text,
  add column etapa_funil  text,
  add column fato_ids     uuid[] not null default '{}',
  add column prioridade   smallint check (prioridade between 1 and 5),
  add column valida_ate   date,
  add column aprovada_por text,
  add column aprovada_em  timestamptz,
  add constraint content_ideas_aprovacao_coerente
    check ((aprovada_em is null) = (aprovada_por is null)
           and (aprovada_em is null or valida_ate is not null));

comment on column marketing.content_ideas.pilar        is 'Valor exato de mkt.content_rules.norte.pilares da marca. Migration 135.';
comment on column marketing.content_ideas.pilar_legado is 'Nome do pilar da taxonomia antiga do app (marketing.content_pillars), guardado para histórico. Migration 135.';
comment on column marketing.content_ideas.movimento   is 'Nome exato de mkt.content_rules.universo.movimentos[].nome da marca. Migration 135.';
comment on column marketing.content_ideas.dor_gatilho is 'Valor exato de mkt.content_rules.gatilhos da marca. Migration 135.';
comment on column marketing.content_ideas.etapa_funil is 'Valor exato de mkt.content_rules.norte.funil.etapas da marca. Migration 135.';
comment on column marketing.content_ideas.fato_ids    is 'mkt.fatos.id que sustentam os números; todos ativos, públicos e frescos para a ideia ficar na pauta. Migration 135.';
comment on column marketing.content_ideas.aprovada_por is 'Palavra do dono por lote, no canal do app. Só muda por marketing.fn_aprovar_ideias / fn_revogar_ideias. Migration 135.';

-- ── pilar antigo vira histórico; pilar novo pelo mapa do Geral ─────────────────
update marketing.content_ideas i
   set pilar_legado = p.name,
       pilar = case p.code
                 when 'dor'        then 'metodo de balcao na pratica'
                 when 'valor'      then 'metodo de balcao na pratica'
                 when 'autoridade' then 'bastidores do metodo (prova)'
                 when 'oferta'     then 'convite direto pra turma'
                 when 'comunidade' then 'convite direto pra turma'
                 else null  -- conversa, metodo: decide a curadoria, lendo o texto
               end
  from marketing.content_pillars p
 where p.id = i.pillar_id;

-- ── a régua ───────────────────────────────────────────────────────────────────
create or replace function marketing.fn_ideia_problemas(p_id uuid)
returns text[]
language plpgsql
stable
set search_path to 'marketing', 'mkt', 'public'
as $function$
declare
  i marketing.content_ideas;
  r mkt.content_rules;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v text[] := '{}';
begin
  select * into i from marketing.content_ideas where id = p_id;
  if not found then
    return array['ideia nao existe'];
  end if;

  if i.marca is null then
    v := array_append(v, 'sem marca'::text);
  else
    select cr.* into r from mkt.content_rules cr join mkt.brands b on b.id = cr.brand_id where b.code = i.marca;
    if not found then
      v := array_append(v, format('marca %s sem content_rules', i.marca));
    end if;
  end if;

  if i.valida_ate is null then
    v := array_append(v, 'sem valida_ate'::text);
  elsif i.valida_ate < v_hoje then
    v := array_append(v, format('vencida em %s', i.valida_ate));
  end if;

  if i.movimento is not null and (r.brand_id is null or not exists (
       select 1 from jsonb_array_elements(coalesce(r.universo->'movimentos', '[]'::jsonb)) m
        where m->>'nome' = i.movimento)) then
    v := array_append(v, format('movimento fora da lista: %s', i.movimento));
  end if;

  if i.pilar is null then
    v := array_append(v, 'sem pilar'::text);
  elsif r.brand_id is null or not exists (
       select 1 from jsonb_array_elements_text(coalesce(r.norte->'pilares', '[]'::jsonb)) pl
        where pl = i.pilar) then
    v := array_append(v, format('pilar fora da lista: %s', i.pilar));
  end if;

  if i.dor_gatilho is not null and (r.brand_id is null or not (i.dor_gatilho = any (coalesce(r.gatilhos, '{}')))) then
    v := array_append(v, format('dor_gatilho fora da lista: %s', i.dor_gatilho));
  end if;

  if i.etapa_funil is not null and (r.brand_id is null or not exists (
       select 1 from jsonb_array_elements_text(coalesce(r.norte->'funil'->'etapas', '[]'::jsonb)) e
        where e = i.etapa_funil)) then
    v := array_append(v, format('etapa_funil fora da lista: %s', i.etapa_funil));
  end if;

  if concat_ws(' ', i.titulo, i.hook, i.narrative, i.cta_suggestion) ~* '(r\$|\mreais\M|[0-9]+,[0-9]{2}\M)' then
    v := array_append(v, 'preco no texto'::text);
  end if;

  if exists (
    select 1 from unnest(i.fato_ids) as f(id)
     where not exists (
       select 1 from mkt.fatos x
        where x.id = f.id and x.ativo and x.publico
          and v_hoje <= x.verificado_em + x.validade_dias
          and (x.brand_slug is null or x.brand_slug = i.marca))
  ) then
    v := array_append(v, 'fato citado vencido, interno, inativo ou de outra marca'::text);
  end if;

  return v;
end;
$function$;

-- ── a trava ───────────────────────────────────────────────────────────────────
create or replace function marketing.tg_content_ideas_curadoria()
returns trigger
language plpgsql
as $function$
declare
  v_modo text := coalesce(current_setting('marketing.curadoria', true), '');
begin
  if tg_op = 'INSERT' then
    if (new.aprovada_em is not null or new.aprovada_por is not null) and v_modo <> 'aprovar' then
      raise exception 'ideia nasce sem aprovacao — aprovar e so por marketing.fn_aprovar_ideias';
    end if;
    return new;
  end if;

  if (new.aprovada_em, new.aprovada_por, new.valida_ate) is distinct from (old.aprovada_em, old.aprovada_por, old.valida_ate)
     and v_modo not in ('aprovar', 'revogar') then
    raise exception 'aprovacao so muda por marketing.fn_aprovar_ideias / fn_revogar_ideias';
  end if;

  if old.aprovada_em is not null and new.aprovada_em is not null
     and (new.marca, new.pilar, new.titulo, new.hook, new.narrative, new.movimento, new.dor_gatilho, new.etapa_funil,
          new.fato_ids, new.suggested_format, new.cta_suggestion, new.prioridade)
         is distinct from
         (old.marca, old.pilar, old.titulo, old.hook, old.narrative, old.movimento, old.dor_gatilho, old.etapa_funil,
          old.fato_ids, old.suggested_format, old.cta_suggestion, old.prioridade) then
    raise exception 'ideia aprovada nao se edita — revogue (fn_revogar_ideias), edite e leve de novo ao dono';
  end if;

  return new;
end;
$function$;

create trigger tg_content_ideas_curadoria
  before insert or update on marketing.content_ideas
  for each row execute function marketing.tg_content_ideas_curadoria();

-- ── aprovar e revogar ─────────────────────────────────────────────────────────
create or replace function marketing.fn_aprovar_ideias(p_ids uuid[], p_aprovada_por text, p_valida_ate date)
returns integer
language plpgsql
security definer
set search_path to 'marketing', 'mkt', 'public'
as $function$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_falhas text;
  v_n integer;
begin
  if coalesce(cardinality(p_ids), 0) = 0 then
    raise exception 'lote vazio';
  end if;
  if coalesce(trim(p_aprovada_por), '') = '' then
    raise exception 'aprovada_por e obrigatorio (quem deu a palavra, onde e quando)';
  end if;
  if p_valida_ate is null or p_valida_ate < v_hoje or p_valida_ate > v_hoje + 90 then
    raise exception 'valida_ate precisa estar entre hoje (%) e 90 dias', v_hoje;
  end if;
  if exists (select 1 from unnest(p_ids) x(id) where not exists (
               select 1 from marketing.content_ideas c where c.id = x.id and c.deleted_at is null)) then
    raise exception 'lote cita ideia inexistente ou apagada';
  end if;

  perform set_config('marketing.curadoria', 'aprovar', true);
  -- a régua roda com a validade do lote já posta: a ideia é julgada como ficará
  update marketing.content_ideas set valida_ate = p_valida_ate where id = any (p_ids) and aprovada_em is null;

  select string_agg(format('%s: %s', c.id, array_to_string(marketing.fn_ideia_problemas(c.id), '; ')), E'\n')
    into v_falhas
    from marketing.content_ideas c
   where c.id = any (p_ids) and cardinality(marketing.fn_ideia_problemas(c.id)) > 0;

  if v_falhas is not null then
    raise exception E'lote recusado inteiro:\n%', v_falhas;
  end if;

  update marketing.content_ideas
     set aprovada_em = now(), aprovada_por = p_aprovada_por, updated_at = now()
   where id = any (p_ids) and aprovada_em is null;
  get diagnostics v_n = row_count;

  perform set_config('marketing.curadoria', '', true);
  return v_n;
end;
$function$;

create or replace function marketing.fn_revogar_ideias(p_ids uuid[], p_motivo text)
returns integer
language plpgsql
security definer
set search_path to 'marketing', 'public'
as $function$
declare v_n integer;
begin
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'motivo e obrigatorio';
  end if;
  perform set_config('marketing.curadoria', 'revogar', true);
  update marketing.content_ideas
     set aprovada_em = null, aprovada_por = null,
         notes = concat_ws(E'\n', notes, format('revogada em %s: %s', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'), p_motivo)),
         updated_at = now()
   where id = any (p_ids) and aprovada_em is not null;
  get diagnostics v_n = row_count;
  perform set_config('marketing.curadoria', '', true);
  return v_n;
end;
$function$;

revoke all on function marketing.fn_aprovar_ideias(uuid[], text, date) from public, anon, authenticated;
revoke all on function marketing.fn_revogar_ideias(uuid[], text)       from public, anon, authenticated;
revoke all on function marketing.fn_ideia_problemas(uuid)              from public, anon;
grant execute on function marketing.fn_aprovar_ideias(uuid[], text, date) to service_role;
grant execute on function marketing.fn_revogar_ideias(uuid[], text)       to service_role;
grant execute on function marketing.fn_ideia_problemas(uuid)              to authenticated, service_role;

-- ── o contrato do MKT ─────────────────────────────────────────────────────────
create view public.v_mkt_pauta_curada
with (security_invoker = on) as
  select i.id              as ideia_id,
         i.marca,
         i.movimento,
         (select (m->>'n')::int
            from mkt.content_rules r
            join mkt.brands b on b.id = r.brand_id,
                 jsonb_array_elements(coalesce(r.universo->'movimentos', '[]'::jsonb)) m
           where b.code = i.marca and m->>'nome' = i.movimento) as movimento_n,
         i.pilar,
         i.titulo,
         i.hook             as gancho,
         i.narrative        as ideia,
         i.dor_gatilho,
         i.etapa_funil,
         i.fato_ids,
         i.suggested_format as formato,
         i.cta_suggestion   as cta,
         i.prioridade,
         i.valida_ate,
         i.aprovada_por,
         i.aprovada_em
    from marketing.content_ideas i
   where i.deleted_at is null
     and i.aprovada_em is not null
     and cardinality(marketing.fn_ideia_problemas(i.id)) = 0;

revoke all on public.v_mkt_pauta_curada from public, anon;
grant select on public.v_mkt_pauta_curada to authenticated, service_role;

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
begin
  -- a tela de ideias do app lê v_marketing_ideas com colunas nomeadas; a view não pode ter mudado
  if md5(pg_get_viewdef('public.v_marketing_ideas'::regclass)) <> '072e1378eea1a402a263ef183411e214' then
    raise exception 'v_marketing_ideas mudou de definicao — a 135 prometeu nao mexer na tela.';
  end if;

  if (select count(*) from public.v_mkt_pauta_curada) <> 0 then
    raise exception 'a pauta deveria nascer vazia.';
  end if;

  if exists (select 1 from information_schema.role_table_grants
              where table_schema='public' and table_name='v_mkt_pauta_curada' and grantee='anon') then
    raise exception 'anon com grant na pauta.';
  end if;

  if coalesce((select array_to_string(reloptions, ',') from pg_class where oid='public.v_mkt_pauta_curada'::regclass), '')
     not like '%security_invoker=on%' then
    raise exception 'v_mkt_pauta_curada nao e invoker.';
  end if;

  if has_function_privilege('authenticated', 'marketing.fn_aprovar_ideias(uuid[], text, date)', 'EXECUTE')
  or has_function_privilege('anon', 'marketing.fn_aprovar_ideias(uuid[], text, date)', 'EXECUTE') then
    raise exception 'aprovar esta aberto a authenticated/anon.';
  end if;

  if (select count(*) from marketing.content_ideas where pilar_legado is null) <> 0
  or (select count(*) from marketing.content_ideas i join marketing.content_pillars p on p.id = i.pillar_id
       where p.code in ('conversa','metodo') and i.pilar is null) <> 28
  or (select count(*) from marketing.content_ideas where pilar is not null) <> 71
  or exists (select 1 from marketing.content_ideas i
              where i.pilar is not null
                and i.pilar not in ('metodo de balcao na pratica','bastidores do metodo (prova)','convite direto pra turma')) then
    raise exception 'mapa de pilares nao ficou como o desenho: 99 com legado, 71 mapeadas, 28 (dialogos + metodo) sem pilar.';
  end if;

  if (select count(*) from marketing.content_ideas where deleted_at is null) <> 94
  or exists (select 1 from marketing.content_ideas where aprovada_em is not null) then
    raise exception 'as ideias existentes mudaram de numero ou nasceram aprovadas.';
  end if;
end $$;

-- ── provas de comportamento, desfeitas na hora ────────────────────────────────
do $$
declare
  v_fato uuid := (select id from mkt.fatos where chave = 'osi_oferta');
  v_boa uuid;
  v_ruim uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ok boolean;
begin
  begin
    insert into marketing.content_ideas (hook, narrative, status, marca, pilar, titulo, movimento, dor_gatilho, etapa_funil, fato_ids, prioridade)
    values ('PROVA_135 gancho', 'Ideia de ensaio: ler o cliente antes de oferecer.', 'available', 'osi', 'metodo de balcao na pratica', 'Prova 135',
            'Ler o Cliente', 'atendimento no improviso', 'atrair (autoridade social)', array[v_fato], 2)
    returning id into v_boa;

    -- (1) aprovação boa entra na pauta
    perform marketing.fn_aprovar_ideias(array[v_boa], 'PROVA_135', v_hoje + 30);
    if not exists (select 1 from public.v_mkt_pauta_curada where ideia_id = v_boa and movimento_n = 2) then
      raise exception 'PROVA_135_FALHOU: ideia aprovada nao apareceu na pauta com movimento_n 2';
    end if;

    -- (2) UPDATE direto não aprova nem edita ideia aprovada
    v_ok := false;
    begin
      update marketing.content_ideas set hook = 'mudado depois' where id = v_boa;
    exception when others then v_ok := sqlerrm like 'ideia aprovada nao se edita%';
    end;
    if not v_ok then raise exception 'PROVA_135_FALHOU: editou ideia aprovada'; end if;

    insert into marketing.content_ideas (hook, narrative, status, marca, pilar, movimento, dor_gatilho, etapa_funil)
    values ('PROVA_135 ruim', 'Leve por R$ 49,00 hoje.', 'available', 'osi', 'Dor real do balcão', 'Movimento Inventado', 'dor solta', 'etapa solta')
    returning id into v_ruim;

    v_ok := false;
    begin
      update marketing.content_ideas set aprovada_em = now(), aprovada_por = 'atalho', valida_ate = v_hoje + 5 where id = v_ruim;
    exception when others then v_ok := sqlerrm like 'aprovacao so muda%';
    end;
    if not v_ok then raise exception 'PROVA_135_FALHOU: aprovou por UPDATE direto'; end if;

    -- (3) a régua recusa o lote inteiro e diz por quê
    v_ok := false;
    begin
      perform marketing.fn_aprovar_ideias(array[v_ruim], 'PROVA_135', v_hoje + 30);
    exception when others then
      v_ok := sqlerrm like '%movimento fora da lista%' and sqlerrm like '%dor_gatilho fora da lista%'
          and sqlerrm like '%etapa_funil fora da lista%' and sqlerrm like '%preco no texto%'
          and sqlerrm like '%pilar fora da lista%';
    end;
    if not v_ok then raise exception 'PROVA_135_FALHOU: a regua nao recusou a ideia ruim com os 4 motivos'; end if;

    -- (4) fato que vence tira a ideia da pauta sozinha
    update mkt.fatos set verificado_em = v_hoje - 400 where id = v_fato;
    if exists (select 1 from public.v_mkt_pauta_curada where ideia_id = v_boa) then
      raise exception 'PROVA_135_FALHOU: fato vencido nao tirou a ideia da pauta';
    end if;

    raise exception 'PROVA_135_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_135_OK' then raise; end if;
  end;
end $$;

commit;
