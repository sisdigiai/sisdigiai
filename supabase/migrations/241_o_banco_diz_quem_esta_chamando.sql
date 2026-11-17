-- 241 · O banco diz quem está chamando, para a borda não ter de comparar chave
--
-- POR QUE: a renovação diária chama a `cortes-gravar` com a chave de serviço lida do Vault, e a função
-- precisava saber se quem chama é a casa. A primeira versão COMPARAVA a chave recebida com a da env —
-- e levou 401 na prova: a env tem o formato novo (`sb_secret_…`) e o Vault tem a legada. As duas são
-- válidas. Pior: comparação de chave **quebraria calada a cada rotação** (R-021 manda rotacionar a
-- cada 90 dias), e quebraria num caminho que ninguém olha, uma vez por dia, até alguém reparar que o
-- vídeo não abre.
--
-- ENTÃO A BORDA PERGUNTA AO BANCO. Quem valida a chave é quem a emitiu. Esta função devolve ao chamador
-- **só o papel dele próprio** — nenhum dado, nenhuma lista, nada de outro. Quem chama já sabe quem é;
-- o que muda é a borda poder confirmar sem guardar cópia de chave nenhuma.
create or replace function public.cortes_quem_sou()
returns text
language sql
stable
as $$ select coalesce(auth.role(), '') $$;

grant execute on function public.cortes_quem_sou() to anon, authenticated, service_role;

do $$
begin
  -- 1. Não devolve nada além do papel: a função tem um `select` só e nenhuma tabela.
  if (select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='cortes_quem_sou') !~ '^\s*select coalesce\(auth\.role\(\), ''''\)\s*$' then
    raise exception 'PROVA 1 FALHOU: a função deixou de ser só o papel do chamador';
  end if;
  -- 2. Chamada como postgres, sem papel de requisição, devolve vazio — e vazio não é 'service_role'.
  if public.cortes_quem_sou() = 'service_role' then
    raise exception 'PROVA 2 FALHOU: sem JWT de requisição a função diz service_role';
  end if;
  raise notice 'as 2 provas passaram';
end $$;
