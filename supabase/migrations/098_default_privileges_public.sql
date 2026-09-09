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
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke insert, update, delete on tables from authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, public;

-- ─── PROVA, PARTE 2: como nasce um objeto DEPOIS ────────────────────────────
create view public._prova_098_depois as select 1 as x;
create function public._prova_098_depois_fn() returns int language sql immutable as $$ select 1 $$;

-- ─── A TRAVA: se o conserto não mudou nada, a migration NÃO passa ───────────
-- Comparar o ACL do antes com o do depois é a única prova de que o ALTER pegou:
-- ele não dá erro quando não surte efeito (papel errado, schema errado), então
-- "rodou sem erro" não é prova de nada.
do $$
declare
  v_antes  text := coalesce((select array_to_string(relacl,' | ') from pg_class where oid='public._prova_098_antes'::regclass), '');
  v_depois text := coalesce((select array_to_string(relacl,' | ') from pg_class where oid='public._prova_098_depois'::regclass), '');
  f_antes  text := coalesce((select array_to_string(proacl,' | ') from pg_proc where oid='public._prova_098_antes_fn()'::regprocedure), '');
  f_depois text := coalesce((select array_to_string(proacl,' | ') from pg_proc where oid='public._prova_098_depois_fn()'::regprocedure), '');
begin
  raise notice 'view  ANTES : %', v_antes;
  raise notice 'view  DEPOIS: %', v_depois;
  raise notice 'func  ANTES : %', f_antes;
  raise notice 'func  DEPOIS: %', f_depois;

  if v_depois like '%anon=%' then
    raise exception '098 não pegou: view nova ainda concede a anon (%)', v_depois;
  end if;
  if v_depois like '%authenticated=a%' or v_depois like '%authenticated=%w%' then
    raise exception '098 não pegou: view nova ainda dá escrita a authenticated (%)', v_depois;
  end if;
  if f_depois like '%anon=%' then
    raise exception '098 não pegou: função nova ainda é executável por anon (%)', f_depois;
  end if;
  if v_antes = v_depois then
    raise exception '098 sem efeito: ACL igual antes e depois (%). Papel ou schema errado.', v_antes;
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
