-- 229 — A aula ganha os passos até o dia, para a aba Aula virar quadro em vez de texto (12/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/pagina-visual`), por pedido do dono no canal
-- dele em 12/11/2026 ("vamos focar na aula, o que falta?" e "ficou feio o que estamos fazendo, muita coisa
-- escrita, é complicado para entender").
-- APLICADA em 12/11/2026 pelo próprio Receita, depois de ensaio com rollback em que as duas provas passaram.
--
-- O PROBLEMA: "o que falta para a aula" estava espalhado em três tabelas de um arquivo do Cockpit e em
-- parágrafos da tela. O dono precisa ver de relance o que é dele, o que é dos outros e o que está pronto.
--
-- O DESENHO: uma coluna `passos` (jsonb) na edição da aula, carregada da tabela "Passos até a aula" do
-- pacote. Cada passo tem quem faz, até quando e um de três estados. A tela agrupa em quadro. Porta própria
-- (`rpc_receita_gravar_aula_passos`) para não mudar a assinatura da função da 228.

alter table receita.aula
  add column if not exists passos jsonb not null default '[]'::jsonb check (jsonb_typeof(passos) = 'array');

comment on column receita.aula.passos is 'Passos até a aula, na ordem: [{"ordem": int, "passo": text, "quem": text, "ate": "AAAA-MM-DD" ou null, "estado": "feito" | "falta" | "travado", "nota": text ou null}]. "travado" = depende de outro passo que ainda falta. Vem da carga.';

-- Coluna nova no FIM: `create or replace view` não deixa mudar a ordem das que já existem.
create or replace view public.v_receita_aula
with (security_invoker = true) as
select a.slug, a.titulo, a.quando, a.preco_brl, a.minimo_ao_vivo, a.prazo_vendas, a.prazo_produto,
       a.produto_filtro, a.produto_criado, a.link_inscricao, a.pode_do_dono, a.atualizado_em,
       coalesce(v.vendas, 0)::integer as vendas,
       coalesce(v.vendas_brl, 0)::numeric(12, 2) as vendas_brl,
       v.ultima_venda,
       coalesce(l.na_lista, 0)::integer as ligacoes_na_lista,
       coalesce(l.faladas, 0)::integer as ligacoes_faladas,
       coalesce(l.nao_atenderam, 0)::integer as ligacoes_nao_atenderam,
       coalesce(l.nao_ligar, 0)::integer as ligacoes_nao_ligar,
       a.passos
  from receita.aula a
  left join lateral (
    select count(*) as vendas, sum(ev.valor) as vendas_brl, max(ev.dia) as ultima_venda
      from public.v_vendas_eventos ev
     where ev.canal = 'hotmart'
       and ev.produto_nome_origem ilike '%' || a.produto_filtro || '%'
       and lower(coalesce(ev.status_origem, '')) in ('approved', 'complete', 'completed')) v on true
  left join lateral (
    select count(*) as na_lista,
           count(*) filter (where d.resultado = 'falou') as faladas,
           count(*) filter (where d.resultado = 'nao_atendeu') as nao_atenderam,
           count(*) filter (where d.resultado = 'nao_ligar') as nao_ligar
      from receita.lista_dia d
     where d.dia <= (a.quando at time zone 'America/Sao_Paulo')::date) l on true;

create or replace function public.rpc_receita_gravar_aula_passos(p_slug text, p_passos jsonb)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare v_ruim text; v_n integer;
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava os passos da aula' using errcode = 'insufficient_privilege';
  end if;
  if p_passos is null or jsonb_typeof(p_passos) <> 'array' then
    raise exception 'os passos tem de ser uma lista';
  end if;
  -- Passo sem texto, sem dono ou com estado fora dos três não entra: a tela agrupa por estado.
  select string_agg(coalesce(e ->> 'passo', '(sem texto)'), '; ') into v_ruim
    from jsonb_array_elements(p_passos) e
   where coalesce(btrim(e ->> 'passo'), '') = ''
      or coalesce(btrim(e ->> 'quem'), '') = ''
      or coalesce(e ->> 'estado', '') not in ('feito', 'falta', 'travado')
      or (e ->> 'ate' is not null and (e ->> 'ate') !~ '^\d{4}-\d{2}-\d{2}$');
  if v_ruim is not null then
    raise exception 'passo(s) fora do formato (texto, quem, estado feito/falta/travado, data AAAA-MM-DD): %', v_ruim;
  end if;
  update receita.aula set passos = p_passos, atualizado_em = now() where slug = p_slug;
  if not found then
    raise exception 'aula % nao existe', p_slug;
  end if;
  select jsonb_array_length(p_passos) into v_n;
  return v_n;
end;
$function$;

revoke all on function public.rpc_receita_gravar_aula_passos(text, jsonb) from public, anon;
grant execute on function public.rpc_receita_gravar_aula_passos(text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — a view continua invoker e entrega `passos` a quem consulta (prova GRANT).
do $$
declare v integer;
begin
  if not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                  where s.nspname = 'public' and c.relname = 'v_receita_aula' and c.reloptions @> array['security_invoker=true']) then
    raise exception 'PROVA_229_FALHOU: v_receita_aula perdeu o security_invoker';
  end if;
  set local role authenticated;
  select count(slug || passos::text || vendas::text) into v from public.v_receita_aula;
  reset role;
exception when others then
  reset role;
  raise exception 'PROVA_229_FALHOU: authenticated nao le passos na view: %', sqlerrm;
end $$;

-- PROVA 2 — anon não executa; passo com estado inventado é recusado; passo certo entra e volta pela view.
do $$
declare recusou boolean := false; v record;
begin
  if has_function_privilege('anon', 'public.rpc_receita_gravar_aula_passos(text, jsonb)', 'execute') then
    raise exception 'PROVA_229_FALHOU: anon executa a gravacao dos passos';
  end if;
  perform public.rpc_receita_gravar_aula('prova-229', 'Aula de prova', now() + interval '10 days', 97, 3,
    current_date + 8, current_date + 1, 'produto que nao existe 229', false, null, false);
  begin
    perform public.rpc_receita_gravar_aula_passos('prova-229', '[{"ordem":1,"passo":"x","quem":"dono","estado":"quase"}]'::jsonb);
  exception when others then recusou := true;
  end;
  perform public.rpc_receita_gravar_aula_passos('prova-229',
    '[{"ordem":1,"passo":"criar o produto","quem":"dono","ate":"2026-11-13","estado":"falta","nota":null},
      {"ordem":2,"passo":"agendar os posts","quem":"MKT","ate":null,"estado":"travado","nota":"espera o link"}]'::jsonb);
  select jsonb_array_length(passos) as n, passos #>> '{1,estado}' as segundo into v from public.v_receita_aula where slug = 'prova-229';
  delete from receita.aula where slug = 'prova-229';
  if not recusou then
    raise exception 'PROVA_229_FALHOU: passo com estado inventado foi aceito';
  end if;
  if v.n <> 2 or v.segundo <> 'travado' then
    raise exception 'PROVA_229_FALHOU: os passos nao voltaram pela view (%, %)', v.n, v.segundo;
  end if;
  if exists (select 1 from receita.aula where slug like 'prova-229%') then
    raise exception 'PROVA_229_FALHOU: sobrou linha de prova';
  end if;
end $$;

comment on view public.v_receita_aula is 'Consumidor: página Receita do app digiai, aba Aula. Grant: select a authenticated; invoker: a RLS de receita.aula limita a staff, e as vendas vêm de v_vendas_eventos com as políticas dela. `passos` é o quadro do que falta até o dia.';
comment on function public.rpc_receita_gravar_aula_passos(text, jsonb) is 'Consumidor: a carga Cockpit/scripts/receita-controle-sync.mjs e staff. Grant: execute a authenticated, com o portão dentro (is_staff ou a identidade da carga). Regrava a lista inteira de passos da edição.';
