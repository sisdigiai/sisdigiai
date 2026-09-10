-- 108 — `authenticated` passa a ler ops.motivos_perda, que é o que faz as
--       colunas da 106/107 funcionarem para gente de verdade
--
-- ✔ APLICADA pelo Orquestrador Geral em 09/09/2026 23h (São Paulo) — que é
--   10/09 em UTC. As duas datas aparecem nos registos deste conserto e são a
--   mesma; o comment que ficou no objeto diz 09/09. Esta migration existe para o
--   repo bater com o banco, não para mudar mais nada.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O DEFEITO ERA MEU, E A MINHA TRAVA PASSOU POR CIMA DELE
-- ═══════════════════════════════════════════════════════════════════════════
-- Achado pelo agente do MKT com **sessão real do dono** — que é precisamente a
-- prova que eu não tinha.
--
-- `public.v_commercial_leads` é INVOKER (e tem de ser: carrega dado de pessoa e
-- quem manda é a RLS de ops.commercial_leads). As colunas que acrescentei na 106
-- e na 107 — `motivo_tipo` e `motivo_rotulo` — leem `ops.motivos_perda`. Pela 098,
-- objeto nenhum nasce concedido, e `authenticated` **não tinha SELECT** nessa
-- tabela. Numa view invoker, quem precisa do direito é o CHAMADOR.
--
-- Resultado: qualquer consulta que peça essas colunas morria com **42501**.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE A 106 E A 107 "PASSARAM" — medido, não suposto
-- ═══════════════════════════════════════════════════════════════════════════
-- Porque o Postgres **poda subquery escalar cuja coluna ninguém pede**. Conferido
-- por EXPLAIN neste banco:
--
--   explain select id, company from v_commercial_leads
--     → Seq Scan on commercial_leads. `motivos_perda` NÃO APARECE.
--
--   explain select * from v_commercial_leads
--     → SubPlan 1 e SubPlan 2, Index Scan using motivos_perda_pkey.
--
-- Sem a coluna no plano não há relação para verificar privilégio. A trava da 107
-- contou colunas em `information_schema` e conferiu rótulos com `select ... where
-- motivo_rotulo is null` — e essa segunda consulta PEDE a coluna, então o join
-- entrou mesmo. Só que eu corria como **postgres**, e postgres lê tudo.
--
-- ⚠ É a mesma família do erro que passei o dia a apontar nos outros: `set role`
--    não prova RLS, contagem não prova soma, e **trava que corre como superuser
--    não prova permissão**. A minha trava era boa a provar que a coluna existe e
--    resolve; nada nela olhava para quem ia chamar. A prova que faltava era uma
--    chamada com o papel real — que é a mesma prova que ficou por fazer nas cinco
--    telas à espera de sessão do dono.
--
-- ⚠ E o meu store faz `select *` — pede tudo, o join volta, a query inteira morre.
--    Pior: `commercialStore.list()` apanha o erro e cai no localStorage. A tela não
--    mostrava erro nenhum; mostrava dado velho, ou nada. Exatamente o defeito que
--    eu tinha acabado de consertar nessa tela, do outro lado da mesma chamada.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE GRANT, E NÃO A SAÍDA "ESPERTA"
-- ═══════════════════════════════════════════════════════════════════════════
-- Tentação: em vez de conceder, ler o tipo e o rótulo de `public.v_vendas_motivos`,
-- que é DEFINER e já serve a authenticated sem grant nenhum. Funcionaria hoje e
-- **falharia em silêncio depois**: aquela view filtra `where ativo`. No dia em que
-- um motivo fosse aposentado, todo lead marcado com ele passaria a devolver rótulo
-- NULO — e a invariante da 107 ("nenhum lead com motivo fica sem rótulo") deixaria
-- de valer sem ninguém tocar em nada. Aposentar um motivo é coisa que a 096 prevê
-- e a 101 trata: não é hipótese remota, é o desenho.
--
-- O grant é seguro e não é concessão preguiçosa: `ops.motivos_perda` são 7 linhas
-- de vocabulário, sem dado de pessoa, RLS desligada e sem policies — não há nada
-- ali que a RLS devesse filtrar. `anon` continua de fora, e continua sem USAGE no
-- schema `ops`.

begin;

grant select on ops.motivos_perda to authenticated;

comment on table ops.motivos_perda is
  'Vocabulário de saída de lead (perda = a ótica disse não; descarte = o cadastro não presta). Lista de domínio sem dado de pessoa; RLS off, sem policies. GRANT SELECT a authenticated (108): `public.v_commercial_leads` é INVOKER e as colunas motivo_tipo/motivo_rotulo leem esta tabela — numa view invoker o direito tem de estar no CHAMADOR, e sem ele qualquer consulta que peça essas colunas morre com 42501 (achado do MKT com sessão real; as travas da 106/107 não apanharam porque corriam como postgres e porque o Postgres poda a subquery quando ninguém pede a coluna). anon NÃO lê, e nem tem USAGE em ops.';

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA — e desta vez pelo papel que vai chamar, não pelo papel que aplica
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n_tipo int;
begin
  if not has_table_privilege('authenticated','ops.motivos_perda','select') then
    raise exception 'authenticated continua sem SELECT em ops.motivos_perda — as colunas da 106/107 morrem com 42501 para quem usa o app.';
  end if;
  if has_table_privilege('anon','ops.motivos_perda','select') then
    raise exception 'anon ganhou SELECT em ops.motivos_perda — não era isso que se pediu.';
  end if;

  -- A verificação que a 107 devia ter tido: correr COMO authenticated e PEDIR as
  -- colunas. Sem pedir, o plano poda a subquery e o teste passa por não testar —
  -- foi assim que isto escapou. `count(*)` aqui não serviria pela mesma razão.
  set local role authenticated;
  select count(motivo_tipo) into n_tipo
    from (select motivo_tipo, motivo_rotulo from public.v_commercial_leads) q;
  reset role;
  -- n_tipo pode ser 0: sem JWT a RLS de commercial_leads não devolve linha. O que
  -- se está a provar aqui é que NÃO REBENTA com 42501 — o número não é o ponto.
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS — e a que conta não se faz por aqui
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `set local role authenticated` + `select motivo_tipo, motivo_rotulo from
--      v_commercial_leads` → executa (0 linhas por RLS, e 0 está certo);
--   b) `set local role anon` + `select from ops.motivos_perda` → 42501,
--      "permission denied for schema ops" (o controlo, e é do lado do schema);
--   c) EXPLAIN das duas formas, para ver a poda com os próprios olhos.
--
-- ⚠ (a) e (b) provam GRANT, que é o que aqui está em causa — mas continuam a NÃO
--    provar RLS, e não é isso que esta migration mexe. **A prova que fecha é a do
--    MKT: a tela com sessão real do dono voltar a mostrar os 260 leads.** É a
--    mesma prova que falta às telas do digiai, e este incidente é o argumento de
--    que ela não é formalidade.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE UMA TELA DO MKT CAIU E A OUTRA NÃO — conferido nos ficheiros deles
-- ═══════════════════════════════════════════════════════════════════════════
-- Ia registar isto como pergunta em aberto: foi-me dito que a `Posto.tsx` foi de
-- 260 para 0, e a poda explicada acima diz que uma consulta que nomeia colunas
-- devia sobreviver. Fui ler os dois ficheiros antes de o escrever, e fecha:
--
--   Posto.tsx  → select('id, company, stage, source, contact, **motivo_tipo**')
--   Oticas.tsx → select('id, name, company, product, stage, source, contact,
--                        value_brl, owner, next_step, notes')   ← sem motivo_*
--
-- A `Posto.tsx` **já tinha sido mudada** para usar `motivo_tipo` (era o conserto
-- do funil que contava por estágio puro, que o MKT achou a partir dos 97,7%).
-- Ou seja: pedir a coluna nova foi o que a pôs no caminho do 42501, e a
-- `Oticas.tsx`, que não a pede, continuou a funcionar sem sinal de nada.
--
-- E isso é a parte desagradável do defeito: enquanto **ninguém usava** as colunas
-- que eu acrescentei, tudo parecia bem. A avaria aparece exatamente quando alguém
-- começa a usar o que foi entregue — dias depois, noutro app, e com a aparência de
-- ter sido a mudança DELE que partiu.
