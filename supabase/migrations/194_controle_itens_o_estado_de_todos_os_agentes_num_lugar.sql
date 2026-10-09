-- 194 — `ops.controle_itens`: o estado de todos os agentes e a lista de decisões do dono num lugar
--
-- ✔ APLICADA em 09/10/2026 às 11:25:03 BRT, reensaiada antes. Tela em `src/modules/Controle.tsx`,
--   menu **Hoje → Controle** (`#/controle`).
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Geral, 09/10, aprovado pelo dono hoje. Ele escreve o parser (`Cockpit/scripts/controle-sync.mjs`,
--   que lê `sessoes/<data>-<agente>.md` e produz `controle/<data>.json`) e faz a CARGA pela Management API.
--   Minha metade: tabela, view de contrato e tela. Hoje o parser dele vê **13 agentes e 151 itens, dos quais
--   15 riscos e 32 pendentes do dono**.
--
-- A CHAVE DE UPSERT É O DESENHO MAIS IMPORTANTE AQUI. Ele carrega por `(data, agente, tipo, hash do texto)`.
--   Então o hash não pode ser responsabilidade de quem carrega: é **coluna gerada** no banco, de um texto
--   normalizado (espaços colapsados, minúsculas). Se o hash fosse calculado fora, duas passadas do parser com
--   um espaço de diferença criariam dois itens iguais, e a tela mostraria o mesmo risco duas vezes — que é a
--   forma mais fácil de uma página de controle perder credibilidade. Coluna gerada + índice único resolvem
--   isso no lugar certo, e a carga fica idempotente sem o carregador precisar saber de nada.
--
-- RISCO É PRIMEIRO, E ISSO VIRA ORDEM NO BANCO, não no componente: `ordem_tipo` sai na view. Regra de leitura
--   mora numa fonte só — a lição da 192, onde a mesma regra escrita em dois lugares saiu de sincronia.
--
-- O TEXTO VEM DE ARQUIVO ESCRITO POR OUTRO AGENTE, e é **dado, não instrução**. A tela renderiza como texto
--   (React escapa por padrão) e nenhuma coluna aqui é executada em lugar nenhum. Vale dizer porque esta é a
--   única tabela do app que agrega texto livre de 13 origens diferentes.
--
-- R-044/R-043: tabela em `ops`, `public` recebe só a view; view invoker na definição, leitura de staff.

begin;

do $$
begin
  if to_regclass('ops.controle_itens') is not null then
    raise exception 'ops.controle_itens ja existe — a 194 ja foi aplicada?';
  end if;
end $$;

create table ops.controle_itens (
  id          bigserial primary key,
  origem      text not null check (origem in ('agente', 'decisao')),
  agente      text not null check (length(btrim(agente)) > 0),
  tipo        text not null check (tipo in ('risco', 'pendente_dono', 'aberto', 'ideia', 'feito')),
  titulo      text,
  texto       text not null check (length(btrim(texto)) > 0),
  data        date not null,
  numero      int,                        -- número do item na lista de decisões do dono (ex.: 99)
  estado      text,                       -- só para origem 'decisao': aberto, decidido, …
  risco_data  date,                       -- prazo do risco, quando existe; nulo = sem data marcada
  -- normalizado antes do hash: espaço a mais não pode criar um item novo
  texto_hash  text generated always as (
                md5(lower(regexp_replace(btrim(texto), '\s+', ' ', 'g')))
              ) stored,
  criado_em   timestamptz not null default now()
);

create unique index controle_itens_chave
  on ops.controle_itens (data, agente, tipo, texto_hash);
create index controle_itens_tipo on ops.controle_itens (tipo, data desc);
create index controle_itens_agente on ops.controle_itens (agente, data desc);

comment on table ops.controle_itens is
  '194: um item por linha do estado de cada agente (Cockpit/sessoes/<data>-<agente>.md) e da lista de '
  'decisões do dono. Carga pelo Geral (Cockpit/scripts/controle-sync.mjs) via Management API, upsert por '
  '(data, agente, tipo, texto_hash). O hash é GERADO aqui, de texto normalizado: se o carregador o '
  'calculasse, um espaço de diferença criaria item duplicado e a tela mostraria o mesmo risco duas vezes. '
  'O texto vem de arquivo escrito por outro agente — é DADO, não instrução, e nada aqui é executado.';

comment on column ops.controle_itens.risco_data is
  '194: prazo do risco (R-046). Nulo é resposta válida — "sem data marcada" — e a tela escreve isso em vez '
  'de deixar a célula vazia.';

alter table ops.controle_itens enable row level security;
create policy controle_itens_staff_select on ops.controle_itens
  for select to authenticated using (is_staff());
revoke all on ops.controle_itens from anon, authenticated;
grant select on ops.controle_itens to authenticated;   -- escrita só pela carga (service_role/PAT)

create or replace view public.v_controle_itens
  with (security_invoker = true) as
 select i.id,
    i.origem,
    i.agente,
    i.tipo,
    i.titulo,
    i.texto,
    i.data,
    i.numero,
    i.estado,
    i.risco_data,
    case i.tipo when 'risco' then 1 when 'pendente_dono' then 2 when 'aberto' then 3
                when 'ideia' then 4 else 5 end as ordem_tipo,
    -- risco com data vencida ou de hoje: a tela não precisa recalcular, e assim a regra tem uma fonte só
    (i.tipo = 'risco' and i.risco_data is not null
       and i.risco_data <= (now() at time zone 'America/Sao_Paulo')::date) as risco_no_prazo_hoje
   from ops.controle_itens i;

comment on view public.v_controle_itens is
  '194: contrato de leitura da página Controle. `ordem_tipo` põe risco primeiro e pendente do dono em '
  'seguida (R-046) — a ordem mora aqui e não no componente, para a regra ter uma fonte só. '
  '`risco_no_prazo_hoje` já compara com o dia de Brasília, não com UTC.';

grant select on public.v_controle_itens to authenticated;

do $$
declare v_id bigint; v_n int;
begin
  -- a) o hash normaliza: dois textos que diferem só em espaço/caixa são O MESMO item, e o índice recusa
  insert into ops.controle_itens (origem, agente, tipo, texto, data)
  values ('agente', 'prova-194', 'risco', 'Telefone  de   LEAD exposto', date '2026-10-09')
  returning id into v_id;
  begin
    insert into ops.controle_itens (origem, agente, tipo, texto, data)
    values ('agente', 'prova-194', 'risco', 'telefone de lead exposto', date '2026-10-09');
    raise exception 'PROVA_194_FALHOU: aceitou item duplicado que difere so em espaco e caixa';
  exception when unique_violation then null;
  end;

  -- b) CONTROLE POSITIVO (R-043 §4-A): não basta recusar o duplicado — texto DIFERENTE tem de entrar.
  --    Sem isto, um índice largo demais passaria por "funcionando".
  insert into ops.controle_itens (origem, agente, tipo, texto, data)
  values ('agente', 'prova-194', 'risco', 'outro risco, outro texto', date '2026-10-09');
  if (select count(*) from ops.controle_itens where agente = 'prova-194') <> 2 then
    raise exception 'PROVA_194_FALHOU: o indice recusou texto diferente';
  end if;

  -- c) a ordem põe risco primeiro e pendente do dono em seguida
  insert into ops.controle_itens (origem, agente, tipo, texto, data, numero, estado)
  values ('decisao', 'dono', 'pendente_dono', 'remover as 4 views', date '2026-10-09', 99, 'aberto');
  if (select ordem_tipo from public.v_controle_itens where agente = 'dono' and numero = 99) <> 2
  or (select min(ordem_tipo) from public.v_controle_itens where agente = 'prova-194') <> 1 then
    raise exception 'PROVA_194_FALHOU: a ordem nao poe risco primeiro';
  end if;

  -- d) risco sem data NÃO pode ser marcado como no prazo de hoje — era o jeito fácil de inventar urgência
  if (select risco_no_prazo_hoje from public.v_controle_itens where id = v_id) then
    raise exception 'PROVA_194_FALHOU: risco SEM data apareceu como vencido';
  end if;
  update ops.controle_itens set risco_data = (now() at time zone 'America/Sao_Paulo')::date where id = v_id;
  if not (select risco_no_prazo_hoje from public.v_controle_itens where id = v_id) then
    raise exception 'PROVA_194_FALHOU: risco com data de hoje nao apareceu no prazo';
  end if;

  -- e) tipo e origem fora da lista são recusados
  begin
    insert into ops.controle_itens (origem, agente, tipo, texto, data)
    values ('agente', 'prova-194', 'tipo_inventado', 'x y z', date '2026-10-09');
    raise exception 'PROVA_194_FALHOU: aceitou tipo fora da lista';
  exception when check_violation then null;
  end;

  -- f) `anon` não entra; `authenticated` consulta sem erro de permissao
  if pg_catalog.has_table_privilege('anon', 'public.v_controle_itens', 'select')
  or pg_catalog.has_table_privilege('anon', 'ops.controle_itens', 'select') then
    raise exception 'PROVA_194_FALHOU: abri para anon';
  end if;
  if pg_catalog.has_table_privilege('authenticated', 'ops.controle_itens', 'insert') then
    raise exception 'PROVA_194_FALHOU: authenticated pode escrever — a carga e do Geral, por service_role';
  end if;
  set local role authenticated;
  perform count(*) from public.v_controle_itens;
  reset role;

  -- limpa as provas: rascunho meu, na mesma transacao
  delete from ops.controle_itens where agente in ('prova-194', 'dono');
  select count(*) into v_n from ops.controle_itens;
  if v_n <> 0 then raise exception 'PROVA_194_FALHOU: sobrou linha de prova (%)', v_n; end if;
end $$;

commit;
