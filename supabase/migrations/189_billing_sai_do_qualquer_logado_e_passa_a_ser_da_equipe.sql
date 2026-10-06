-- 189 — a leitura do billing sai de "qualquer logado" e passa a ser da equipe
--
-- ✔ APLICADA em 06/10/2026 às 01:03:31 BRT, reensaiada antes (e o ensaio recusou a 1.ª versão: eu exigia
--   `subscribers` não-vazia e ela tem 0 linhas). Medido depois: as 3 policies em `is_staff()`, **0 ainda
--   abertas**; `billing.payments` lê 1 como dona e **0** como `authenticated` sem papel.
--
-- (Escrita como NÃO APLICADA.)
--
-- PALAVRA DO DONO, no canal deste agente, 05/10/2026: "pode fechar o billing para a equipe".
--   O Geral já tinha ratificado com ele e me avisado; eu esperei a frase aqui, porque policy de leitura de
--   dado financeiro é portão (R-037) e repasse de par não autoriza. A frase chegou.
--
-- O QUE ESTAVA ABERTO: três tabelas de `billing` com `billing_leitura_logado SELECT authenticated USING
--   (true)` — ou seja, **qualquer pessoa logada lia**:
--     · `billing.subscribers`   — assinantes e base do MRR
--     · `billing.mp_events_raw` — eventos crus do Mercado Pago
--     · `billing.payments`      — **pagamentos**
--
--   Eram DUAS na primeira vez que contei, e eu disse isso ao Geral. Eram três. Perdi a `payments` porque
--   cheguei às outras duas seguindo as views definer, e nenhuma das 17 que examinei lê a `payments` — ela
--   nunca apareceu no caminho que eu estava percorrendo. Censo por caminho acha o que está no caminho.
--
-- POR QUE `is_staff()` E NÃO `pode_tocar_lead()`: `is_staff()` aceita super_admin, admin, founder e staff —
--   e **não** aceita `vendas`. É o que "equipe" quer dizer aqui, e é exatamente o que o portão 65 (09/09)
--   pedia: o papel `vendas` foi criado não-privilegiado de propósito, para não ver Financeiro nem Cobrança no
--   front, e lia tudo pelo banco. A partir daqui o front e o banco dizem a mesma coisa.
--
-- AS 3 VIEWS DE BILLING JÁ ERAM INVOKER (182), e é isso que faz este aperto valer: elas obedecem à policy da
--   base. Se ainda fossem donas, fechar a base não mudaria nada — foi o motivo de eu virá-las primeiro.
--
-- MEDIDO ANTES, e muda o que esta migration É: as três tabelas estão **quase vazias** —
--   `subscribers` **0** linhas, `payments` **1**, `mp_events_raw` **2**. Ou seja: **nada estava exposto**,
--   porque quase não há o que expor (a casa ainda não tem cliente pagante no Clearix). Isto é aperto
--   **preventivo**: quando a primeira cobrança real entrar, a porta já está fechada. Não vou chamar de
--   "vazamento tapado" o que era uma porta aberta num quarto vazio.
--
--   Foi a própria prova que me contou isso: eu exigia `subscribers` não-vazia para medir efeito, e ela falhou.
--   Trocada para `payments`, que tem 1 linha — pouco, mas é medição de verdade: como dona lê 1, como
--   `authenticated` sem papel lê 0.
--
-- `service_role` NÃO É TOCADO: o webhook do Mercado Pago grava por ele, e policy de `authenticated` não o
--   alcança. A prova confere que ele continua escrevendo.
--
-- DESFAZER: `alter policy billing_leitura_logado on billing.<tabela> using (true);` nas três.

begin;

do $$
declare v_abertas int;
begin
  select count(*) into v_abertas from pg_policies
   where schemaname='billing' and policyname='billing_leitura_logado' and cmd='SELECT' and qual='true'
     and tablename in ('subscribers','mp_events_raw','payments');
  if v_abertas = 0 then raise exception 'nenhuma policy aberta — a 189 ja foi aplicada?'; end if;
  if v_abertas <> 3 then
    raise exception 'esperava as 3 policies abertas e achei % — conferir antes de apertar', v_abertas;
  end if;

  -- o dono tem de passar em is_staff(), senao eu fecho o billing para ele tambem
  if not exists (select 1 from iam.users where email='junior@oticastatymello.com.br'
                   and role in ('super_admin','admin','founder','staff')
                   and status='active' and deleted_at is null and auth_id is not null) then
    raise exception 'o dono nao passa em is_staff() — parar antes de fechar o billing na cara dele';
  end if;

  -- e as 3 views de billing tem de estar invoker, senao o aperto na base nao chega a elas
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public'
                and c.relname in ('v_billing_mrr','v_billing_subscriptions','v_billing_overdue')
                and (c.reloptions is null or not (c.reloptions::text ilike '%security_invoker%'))) then
    raise exception 'alguma view de billing ainda roda como dona — apertar a base nao a afetaria';
  end if;
end $$;

alter policy billing_leitura_logado on billing.subscribers   using (is_staff());
alter policy billing_leitura_logado on billing.mp_events_raw using (is_staff());
alter policy billing_leitura_logado on billing.payments      using (is_staff());

do $$
declare v_n int; v_sem int; v_sr boolean;
begin
  -- a) nenhuma das 3 continua aberta
  if exists (select 1 from pg_policies
              where schemaname='billing' and policyname='billing_leitura_logado' and qual='true') then
    raise exception 'PROVA_189_FALHOU: sobrou policy de billing com using (true)';
  end if;
  select count(*) into v_n from pg_policies
   where schemaname='billing' and policyname='billing_leitura_logado' and qual ilike '%is_staff%';
  if v_n <> 3 then raise exception 'PROVA_189_FALHOU: esperava 3 policies com is_staff e achei %', v_n; end if;

  -- b) NAO conto linha antes e depois, de proposito. `alter policy` sobre SELECT nao pode apagar nem
  --    inserir nada — um retrato antes/depois aqui seria cerimonia, e eu o escrevi por habito das migrations
  --    de dado antes de perceber. O que esta mudanca pode estragar e QUEM LE, e e isso que as provas (c) a
  --    (f) medem. Prova que nao pode falhar nao e prova.
  --
  --    O que importa do lado de quem deve continuar lendo: como dona, a base responde. Uso `payments`, nao
  --    `subscribers` — esta tem 0 linhas, e prova sobre tabela vazia nao distingue "fechou" de "nao tem nada".
  select count(*) into v_n from billing.payments;
  if v_n = 0 then
    raise exception 'PROVA_189_FALHOU: billing.payments vazia — sem linha nenhuma o aperto nao e mensuravel';
  end if;

  -- c) O APERTO PEGOU, medido: sessao `authenticated` sem JWT tem is_staff() = false e le ZERO nas tres.
  --    Antes lia tudo. Isto e medicao, nao construcao.
  set local role authenticated;
  select count(*) into v_sem from billing.payments;
  reset role;
  if v_sem <> 0 then
    raise exception 'PROVA_189_FALHOU: sessao sem papel ainda le % pagamentos (eram % como dona)', v_sem, v_n;
  end if;
  set local role authenticated;
  select count(*) into v_sem from billing.mp_events_raw;
  reset role;
  if v_sem <> 0 then
    raise exception 'PROVA_189_FALHOU: sessao sem papel ainda le % eventos crus do Mercado Pago', v_sem;
  end if;

  -- d) e as views que leem billing NAO dao erro de permissao (zero linha e aceitavel, 403 nao). Se levantar,
  --    derruba a migration — foi assim que a 183 me ensinou a diferenca entre vazio e erro.
  set local role authenticated;
  perform count(*) from public.v_billing_mrr;
  perform count(*) from public.v_billing_subscriptions;
  perform count(*) from public.v_billing_overdue;
  perform count(*) from public.v_telao_cobranca;
  reset role;

  -- e) `service_role` intacto: o webhook do Mercado Pago grava por ele
  select pg_catalog.has_table_privilege('service_role','billing.mp_events_raw','insert') into v_sr;
  if not v_sr then
    raise exception 'PROVA_189_FALHOU: mexi no service_role — o webhook do Mercado Pago para de gravar';
  end if;

  -- f) e `anon` nao entrou em nada disso de carona
  if pg_catalog.has_table_privilege('anon','billing.subscribers','select')
  or pg_catalog.has_table_privilege('anon','billing.payments','select') then
    raise exception 'PROVA_189_FALHOU: anon le billing';
  end if;
end $$;

commit;
