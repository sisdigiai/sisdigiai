-- 196 — "resolvido" na Controle: clicar e sumir, sem apagar nada
--
-- ✔ APLICADA em 09/10/2026 às 15:11:38 BRT, reensaiada antes. Tela: botão **resolvido** em cada item e chip
--   **mostrar resolvidos**, em `src/modules/Controle.tsx`.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: dono em 09/10, via Geral: na Controle, *"opção de resolvido: clicar e sumir"*.
--
-- POR QUE NÃO SE APAGA A LINHA: a carga espelha os arquivos de estado e roda sozinha às 9h e 18h. Apagar o
--   item faria a passada seguinte reinseri-lo — o dono clicaria em "resolvido" e o item voltaria no dia
--   seguinte, que é a forma mais rápida de um botão perder a confiança de quem clica. Então a resolução mora
--   em tabela própria, por **chave estável do item (agente, tipo, texto_hash)**, e a view esconde. O item
--   continua no banco; o que muda é a leitura.
--
-- O HASH PODE MUDAR, E ISSO JÁ ACONTECEU HOJE: nesta manhã 88 linhas duplicaram porque o parser passou a
--   limpar markdown e o texto mudou — logo hash novo. O mesmo mecanismo faz um item resolvido **ressuscitar**
--   se o texto dele mudar. Não dá para evitar sem casar item por aproximação, o que esconderia item novo de
--   verdade — pior. Então: guardo o **texto** junto da chave, para que, quando um resolvido voltar, dê para
--   ver que já tinha sido resolvido antes e com que redação. É diagnóstico, não disfarce.
--
-- DESFAZER EXISTE, e não é luxo: "clicar e sumir" sem volta transforma um clique errado em item perdido, e
--   numa tela de controle o item perdido pode ser o risco. `rpc_controle_reabrir` tira a chave. Duas RPCs
--   separadas em vez de um botão que alterna: alternar some com o item no primeiro clique e o traz de volta
--   no segundo, e um duplo-clique desfaria sem ninguém perceber.
--
-- RESOLVER NÃO É FECHAR, e o Geral já desenhou a outra ponta: a passada das 18h gera
--   `controle/resolvidos-<data>.md` e ele avisa cada agente para tirar o item do estado dele. O dono resolver
--   ≠ o agente ter fechado. `v_controle_resolvidos_dia` é o que ele lê.
--
-- R-043/R-044: tabela em `ops`, `public` só recebe RPC e view; RPC `security definer` com `is_staff()`
--   explícito; views invoker na definição.

begin;

do $$
begin
  if to_regclass('ops.controle_resolvidos') is not null then
    raise exception 'ops.controle_resolvidos ja existe — a 196 ja foi aplicada?';
  end if;
  if to_regclass('ops.controle_itens') is null then
    raise exception 'ops.controle_itens nao existe — a 194 nao foi aplicada';
  end if;
end $$;

create table ops.controle_resolvidos (
  id            bigserial primary key,
  agente        text not null,
  tipo          text not null,
  texto_hash    text not null,
  texto_quando  text not null,          -- redação no momento em que foi resolvido; serve de diagnóstico
  resolvido_em  timestamptz not null default now(),
  resolvido_por uuid default auth.uid(),
  nota          text
);

create unique index controle_resolvidos_chave
  on ops.controle_resolvidos (agente, tipo, texto_hash);

comment on table ops.controle_resolvidos is
  '196: itens que o dono marcou como resolvidos na página Controle. A chave é (agente, tipo, texto_hash) e '
  'NÃO o id, porque a carga espelha os arquivos e recria as linhas às 9h e 18h — apagar faria o item voltar '
  'no dia seguinte. `texto_quando` guarda a redação do momento: se o parser mudar a limpeza do texto o hash '
  'muda e o item ressuscita, e aí dá para ver que já tinha sido resolvido e com que palavras.';

alter table ops.controle_resolvidos enable row level security;
create policy controle_resolvidos_staff_select on ops.controle_resolvidos
  for select to authenticated using (is_staff());
revoke all on ops.controle_resolvidos from anon, authenticated;
grant select on ops.controle_resolvidos to authenticated;   -- escrita só pelas RPCs

create function public.rpc_controle_resolver(p_id bigint, p_nota text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_it record; v_id bigint;
begin
  -- Portão explícito: definer não herda RLS, então quem pode resolver se decide aqui e em lugar nenhum mais.
  if not public.is_staff() then
    raise exception 'apenas staff resolve item de controle' using errcode = 'insufficient_privilege';
  end if;

  select agente, tipo, texto_hash, texto into v_it from ops.controle_itens where id = p_id;
  if v_it is null then
    raise exception 'item % nao existe', p_id;
  end if;

  insert into ops.controle_resolvidos (agente, tipo, texto_hash, texto_quando, nota, resolvido_por)
  values (v_it.agente, v_it.tipo, v_it.texto_hash, v_it.texto,
          nullif(btrim(coalesce(p_nota, '')), ''), auth.uid())
  on conflict (agente, tipo, texto_hash)
    do update set resolvido_em = now(), resolvido_por = auth.uid(),
                  nota = coalesce(excluded.nota, ops.controle_resolvidos.nota)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.rpc_controle_reabrir(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_it record; v_n int;
begin
  if not public.is_staff() then
    raise exception 'apenas staff reabre item de controle' using errcode = 'insufficient_privilege';
  end if;

  select agente, tipo, texto_hash into v_it from ops.controle_itens where id = p_id;
  if v_it is null then raise exception 'item % nao existe', p_id; end if;

  delete from ops.controle_resolvidos
   where agente = v_it.agente and tipo = v_it.tipo and texto_hash = v_it.texto_hash;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.rpc_controle_resolver(bigint, text) from public, anon;
revoke all on function public.rpc_controle_reabrir(bigint) from public, anon;
grant execute on function public.rpc_controle_resolver(bigint, text) to authenticated, service_role;
grant execute on function public.rpc_controle_reabrir(bigint) to authenticated, service_role;

-- a view passa a esconder o resolvido, e a dizer que ele existe
create or replace view public.v_controle_itens
  with (security_invoker = true) as
 select i.id, i.origem, i.agente, i.tipo, i.titulo, i.texto, i.data,
    i.numero, i.estado, i.risco_data,
    case i.tipo when 'risco' then 1 when 'pendente_dono' then 2 when 'aberto' then 3
                when 'ideia' then 4 else 5 end as ordem_tipo,
    (i.tipo = 'risco' and i.risco_data is not null
       and i.risco_data <= (now() at time zone 'America/Sao_Paulo')::date) as risco_no_prazo_hoje,
    i.nivel,
    -- `resolvido` sai como COLUNA em vez de a view filtrar: a tela esconde por padrão e oferece "mostrar
    -- resolvidos", e assim um clique errado é visível e reversível em vez de virar item perdido.
    (r.id is not null) as resolvido,
    r.resolvido_em,
    r.nota as nota_resolucao
   from ops.controle_itens i
   left join ops.controle_resolvidos r
     on r.agente = i.agente and r.tipo = i.tipo and r.texto_hash = i.texto_hash;

comment on view public.v_controle_itens is
  '194/195/196: contrato da página Controle. `nivel` e `ordem_tipo` (risco primeiro) moram aqui, não no '
  'componente. `resolvido` é coluna, não filtro: a tela esconde por padrão e oferece "mostrar resolvidos", '
  'para clique errado ser visível e reversível. Resolver ≠ o agente ter fechado — a passada das 18h gera '
  'controle/resolvidos-<data>.md e o Geral avisa cada agente.';

grant select on public.v_controle_itens to authenticated;

create or replace view public.v_controle_resolvidos_dia
  with (security_invoker = true) as
 select (r.resolvido_em at time zone 'America/Sao_Paulo')::date as dia,
    r.agente, r.tipo, r.texto_quando, r.nota, r.resolvido_em,
    -- o agente ainda escreve esse item no estado dele? se sim, o Geral precisa avisá-lo
    exists (select 1 from ops.controle_itens i
             where i.agente = r.agente and i.tipo = r.tipo and i.texto_hash = r.texto_hash) as ainda_no_estado
   from ops.controle_resolvidos r;

comment on view public.v_controle_resolvidos_dia is
  '196: o que o dono resolveu, por dia de Brasília, para o Geral gerar controle/resolvidos-<data>.md. '
  '`ainda_no_estado` diz se o agente continua escrevendo o item — é o que separa "o dono resolveu" de "o '
  'agente fechou", e é a lista de quem precisa ser avisado.';

grant select on public.v_controle_resolvidos_dia to authenticated;

-- o contrato do Telão passa a contar só o que NÃO foi resolvido: senão o número do telão e o da tela divergem
create or replace view public.v_telao_controle
  with (security_invoker = true) as
 select i.nivel,
    count(*) filter (where i.tipo = 'risco')::int                                   as qtd_riscos,
    count(*) filter (where i.tipo = 'pendente_dono')::int                           as qtd_pendentes_dono,
    count(*) filter (where i.tipo = 'aberto')::int                                  as qtd_abertos,
    min(i.risco_data) filter (where i.tipo = 'risco'
          and i.risco_data >= (now() at time zone 'America/Sao_Paulo')::date)        as proximo_prazo,
    count(distinct i.agente)::int                                                   as agentes_com_estado,
    (select string_agg(distinct a.agente, ', ' order by a.agente)
       from public.v_controle_itens a
      where a.nivel = i.nivel and a.tipo = 'risco' and not a.resolvido
        and a.data = max(i.data))                                                   as agentes_com_risco,
    max(i.data)                                                                     as atualizado_em
   from public.v_controle_itens i
  where not i.resolvido
  group by i.nivel;

comment on view public.v_telao_controle is
  '195/196: contrato do Telão. SÓ número, prazo e nome de agente — nenhum texto de risco, nenhuma PII (o '
  'pedido original trazia 60 caracteres do texto; medido, esses 60 caracteres nomeavam arquivo com segredo, '
  'valor de fatura e o furo de telefone de lead). Desde a 196 conta só o NÃO resolvido, senão o número do '
  'telão divergiria do da tela. Legível por authenticated, nunca por anon.';

grant select on public.v_telao_controle to authenticated;

do $$
declare v_id bigint; v_alvo bigint; v_antes int; v_depois int; v_txt text;
begin
  -- item de prova, com a mesma forma de um real
  insert into ops.controle_itens (origem, agente, tipo, texto, data, nivel)
  values ('agente', 'prova-196', 'risco', 'risco de prova para resolver', date '2026-10-09', 1)
  returning id into v_alvo;

  -- a) o PORTÃO: esta sessao nao tem JWT, logo is_staff() e false e a RPC tem de recusar.
  --    (Foi assim que a prova da 191 me ensinou: o portao barrar e teste, nao obstaculo.)
  begin
    perform public.rpc_controle_resolver(v_alvo);
    raise exception 'PROVA_196_FALHOU: a RPC aceitou chamada sem papel de staff';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from ops.controle_resolvidos where agente = 'prova-196') then
    raise exception 'PROVA_196_FALHOU: recusou e gravou de qualquer forma';
  end if;

  -- b) o efeito, pela tabela (a RPC exige JWT, que esta sessao nao tem): resolvido some da view
  select count(*) into v_antes from public.v_controle_itens where agente = 'prova-196' and not resolvido;
  insert into ops.controle_resolvidos (agente, tipo, texto_hash, texto_quando)
  select agente, tipo, texto_hash, texto from ops.controle_itens where id = v_alvo;
  select count(*) into v_depois from public.v_controle_itens where agente = 'prova-196' and not resolvido;
  if v_antes <> 1 or v_depois <> 0 then
    raise exception 'PROVA_196_FALHOU: antes % depois % — resolver nao escondeu', v_antes, v_depois;
  end if;

  -- c) CONTROLE POSITIVO (R-043 §4-A): nao basta sumir — a LINHA tem de continuar no banco, senao a proxima
  --    passada da carga a recria e o botao perde a confianca de quem clicou.
  if not exists (select 1 from ops.controle_itens where id = v_alvo) then
    raise exception 'PROVA_196_FALHOU: resolver apagou a linha';
  end if;
  if not exists (select 1 from public.v_controle_itens where id = v_alvo and resolvido) then
    raise exception 'PROVA_196_FALHOU: o item resolvido desapareceu ate de "mostrar resolvidos"';
  end if;

  -- d) o Telao para de contar o resolvido, senao divergiria da tela
  if exists (select 1 from public.v_telao_controle t
              where t.nivel = 1 and t.agentes_com_risco ilike '%prova-196%') then
    raise exception 'PROVA_196_FALHOU: o Telao ainda conta o item resolvido';
  end if;

  -- e) a view do Geral diz que o agente AINDA escreve o item — e o que separa "resolvido" de "fechado"
  if not (select ainda_no_estado from public.v_controle_resolvidos_dia where agente = 'prova-196') then
    raise exception 'PROVA_196_FALHOU: ainda_no_estado deu falso com o item ainda na tabela';
  end if;

  -- f) a redacao ficou guardada: e o que permite reconhecer um resolvido que ressuscitou com texto novo
  select texto_quando into v_txt from ops.controle_resolvidos where agente = 'prova-196';
  if v_txt is null or v_txt <> 'risco de prova para resolver' then
    raise exception 'PROVA_196_FALHOU: nao guardou a redacao do momento';
  end if;

  -- g) reabrir devolve o item
  delete from ops.controle_resolvidos where agente = 'prova-196';
  if (select count(*) from public.v_controle_itens where agente = 'prova-196' and not resolvido) <> 1 then
    raise exception 'PROVA_196_FALHOU: reabrir nao devolveu o item';
  end if;

  -- h) anon nao entra, e authenticated nao escreve direto
  if pg_catalog.has_table_privilege('anon', 'public.v_controle_resolvidos_dia', 'select')
  or pg_catalog.has_table_privilege('anon', 'ops.controle_resolvidos', 'select') then
    raise exception 'PROVA_196_FALHOU: abri para anon';
  end if;
  if pg_catalog.has_table_privilege('authenticated', 'ops.controle_resolvidos', 'insert') then
    raise exception 'PROVA_196_FALHOU: authenticated escreve direto — tem de ser so pela RPC';
  end if;
  set local role authenticated;
  perform count(*) from public.v_controle_itens;
  perform count(*) from public.v_controle_resolvidos_dia;
  perform count(*) from public.v_telao_controle;
  reset role;

  delete from ops.controle_itens where agente = 'prova-196';
end $$;

commit;
