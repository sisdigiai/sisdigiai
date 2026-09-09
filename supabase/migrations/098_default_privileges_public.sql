-- 098 — fecha a TORNEIRA: default privileges de `public` param de conceder a anon
--
-- ⚠ NÃO APLICADA. Aguarda o "pode" do dono. Portão 66.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ISTO É A CAUSA E NÃO MAIS UM SINTOMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Medido em `pg_default_acl`, schema `public`, role `postgres` (o dono do que as
-- migrations criam):
--
--   relações  → anon=arwdDxtm  authenticated=arwdDxtm
--   sequências→ anon=rwU       authenticated=rwU
--   FUNÇÕES   → anon=X         authenticated=X
--
-- Ou seja, neste projeto:
--   * toda VIEW nova nasce com ESCRITA para anon e authenticated;
--   * toda FUNÇÃO nova nasce CHAMÁVEL POR ANON.
--
-- Isso explica, sem culpar ninguém, três achados desta semana que pareciam
-- descuidos separados:
--   - as 135 views com escrita para authenticated (portão 64);
--   - as 73 views definer legíveis por qualquer logado (portão 65);
--   - as funções SECURITY DEFINER com EXECUTE para anon.
-- Nada disso foi concedido uma a uma. **Foi gerado.** Enquanto o default estiver
-- assim, cada migration futura recria o problema — inclusive as minhas: a 095,
-- aplicada hoje, nasceu com escrita para anon e precisou da 097 para consertar.
-- Eu mesmo escrevi `revoke all ... from public` achando que cobria anon, e não cobria.
--
-- ⚠ ALCANCE, e é o limite honesto: `ALTER DEFAULT PRIVILEGES` vale POR ROLE
--    CRIADOR e SÓ PARA OBJETOS NOVOS. A entrada gêmea de `supabase_admin` alcança
--    o que ele cria (objetos de plataforma), não os nossos — medido: os 151
--    objetos de `public` têm `relowner = postgres`. E o estoque já existente
--    NÃO muda: continua nos portões 64 e 65.
--
-- O que NÃO revogo, e por quê:
--   * SELECT em relações para `authenticated` — o app lê por view; tirar aqui
--     obrigaria a conceder em toda migration só para a tela voltar a funcionar.
--   * EXECUTE em funções para `authenticated` — o app chama RPC como authenticated.
--     A autorização dessas RPCs mora no CORPO delas (092, 093), que é onde deve estar.

begin;

-- ─── PROVA, PARTE 1: como nasce um objeto HOJE ──────────────────────────────
create view public._prova_098_antes as select 1 as x;
create function public._prova_098_antes_fn() returns int language sql immutable as $$ select 1 $$;

-- ─── O CONSERTO ─────────────────────────────────────────────────────────────
-- ⚠ REVOKE ALL + GRANT do que fica, em vez de enumerar o que sai.
-- A 1ª tentativa fazia `revoke insert, update, delete` e sobrou `authenticated=rDxtm`
-- — o `D` é TRUNCATE, que é escrita, e ficou de pé (achado do orquestrador geral ao
-- ler o ACL do rollback). Enumerar o que se tira exige lembrar de TODOS os
-- privilégios, hoje e nas versões futuras do Postgres; declarar o que FICA é
-- fechado por construção: o que eu não conceder, não existe.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on tables from authenticated;
alter default privileges for role postgres in schema public
  grant select on tables to authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon;

-- ⚠ FUNÇÕES PRECISAM DE UMA ENTRADA GLOBAL, e isto custou duas tentativas.
-- O Postgres tem um built-in "EXECUTE a PUBLIC" para toda função nova. Ele é
-- MESCLADO quando não existe entrada GLOBAL (sem `in schema`) para o role — então
-- revogar só no schema deixa a função nascer com `=X/postgres` e `anon` HERDA de
-- PUBLIC. Medido pelo orquestrador geral em transações com rollback: depois do
-- revoke só-no-schema, `has_function_privilege('anon', …, 'EXECUTE')` continuava
-- TRUE, e a entrada do schema já não mostrava PUBLIC — o ACL da função mostrava.
--
-- É por isso que a trava desta migration testa PRIVILÉGIO e não a entrada de
-- `pg_default_acl`: a entrada dizia que estava fechado e a função nascia aberta.
-- Se a prova olhasse a configuração em vez do efeito, teria passado.
alter default privileges for role postgres
  revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, public;
alter default privileges for role postgres in schema public
  grant execute on functions to authenticated;

-- NÃO acrescento a linha global para TABELAS e SEQUÊNCIAS "por simetria".
-- Medido: o built-in delas não concede nada a PUBLIC, então a linha global seria
-- NO-OP — e criaria em `pg_default_acl` uma entrada que parece uma regra e não
-- faz nada. É a mesma armadilha das três variáveis mortas do `.env.example`:
-- documentar um controle que não existe é pior que não documentar, porque o
-- próximo a ler acredita nele. Uma linha que funciona vale mais que três em que
-- duas são decoração.

-- ─── PROVA, PARTE 2: como nasce um objeto DEPOIS ────────────────────────────
create view public._prova_098_depois as select 1 as x;
create function public._prova_098_depois_fn() returns int language sql immutable as $$ select 1 $$;

-- ─── A TRAVA: se o conserto não mudou nada, a migration NÃO passa ───────────
-- Comparar o ACL do antes com o do depois é a única prova de que o ALTER pegou:
-- ele não dá erro quando não surte efeito (papel errado, schema errado), então
-- "rodou sem erro" não é prova de nada.
-- ⚠ A prova PERGUNTA AO SISTEMA, não casa string de ACL. A primeira versão desta
-- migration comparava com `like '%authenticated=%w%'` — e isso dava FALSO POSITIVO,
-- porque o `w` de `service_role=arwdDxtm` aparece depois de `authenticated=r` na
-- mesma linha. A migration teria falhado dizendo que não pegou, justamente quando
-- pegou. Texto de ACL é para ler, não para decidir: `has_table_privilege` responde
-- a pergunta certa.
do $$
declare
  v_antes  text := coalesce((select array_to_string(relacl,' | ') from pg_class where oid='public._prova_098_antes'::regclass), '');
  v_depois text := coalesce((select array_to_string(relacl,' | ') from pg_class where oid='public._prova_098_depois'::regclass), '');
begin
  raise notice 'view ANTES : %', v_antes;
  raise notice 'view DEPOIS: %', v_depois;

  if has_table_privilege('anon','public._prova_098_depois','SELECT') then
    raise exception '098 não pegou: view nova ainda é legível por anon (%)', v_depois;
  end if;
  -- TRUNCATE incluído: foi o que sobrou na 1ª tentativa e a trava antiga não veria.
  if has_table_privilege('authenticated','public._prova_098_depois','INSERT')
     or has_table_privilege('authenticated','public._prova_098_depois','UPDATE')
     or has_table_privilege('authenticated','public._prova_098_depois','DELETE')
     or has_table_privilege('authenticated','public._prova_098_depois','TRUNCATE') then
    raise exception '098 não pegou: view nova ainda dá escrita a authenticated (%)', v_depois;
  end if;
  if has_function_privilege('anon','public._prova_098_depois_fn()','EXECUTE') then
    raise exception '098 não pegou: função nova ainda é executável por anon';
  end if;

  -- Controle POSITIVO: o que devia continuar, continuou.
  if not has_table_privilege('authenticated','public._prova_098_depois','SELECT') then
    raise exception '098 foi longe demais: authenticated perdeu SELECT em view nova (%)', v_depois;
  end if;
  if not has_function_privilege('authenticated','public._prova_098_depois_fn()','EXECUTE') then
    raise exception '098 foi longe demais: authenticated perdeu EXECUTE em função nova';
  end if;

  -- E o contraste: se antes e depois nascem iguais, o ALTER não surtiu efeito.
  if has_table_privilege('anon','public._prova_098_antes','SELECT')
     = has_table_privilege('anon','public._prova_098_depois','SELECT') then
    raise exception '098 sem efeito: objeto novo nasce igual ao de antes. Papel ou schema errado.';
  end if;
end $$;

drop view public._prova_098_antes;
drop view public._prova_098_depois;
drop function public._prova_098_antes_fn();
drop function public._prova_098_depois_fn();

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MUDA PARA QUEM ESCREVER MIGRATION DEPOIS DISTO
-- ═══════════════════════════════════════════════════════════════════════════
-- Objeto novo não nasce mais acessível: **conceder explicitamente**, e dizer a
-- quem serve. Exemplo do padrão que passa a valer:
--
--   grant select on public.v_nova to authenticated;   -- lida pela tela X
--   grant select on public.v_nova to anon;            -- SÓ se for exceção documentada
--   grant execute on function public.fn_nova() to authenticated;
--   comment on view public.v_nova is 'Consumidor: … . Grant: … porque …';
--
-- Isso é mais trabalho por migration, e é o ponto: hoje o silêncio concede tudo,
-- e ninguém repara. Depois disto, o silêncio não concede nada — e o que for
-- concedido, alguém escreveu de propósito e assinou no comment.
--
-- PROVA EXTERNA DEPOIS DE APLICAR (a migration prova por dentro; isto prova por fora):
--   a) criar uma view descartável, chamá-la com a chave anon crua → 401/42501;
--   b) conceder SELECT a anon nela, chamar de novo → 200;
--   c) apagar a view descartável.
