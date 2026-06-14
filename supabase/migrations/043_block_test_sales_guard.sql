-- === 043 — Guard: bloquear vendas de TESTE em marketing.hotmart_sales ===
-- Aplicada em produção via Management API em 2026-06-14.
--
-- Contexto: a auditoria 2026-06-14 achou 1 venda-fantasma (HP-FAKE-..., buyer
-- "Joao Vendedor Teste / joao.teste@exemplo.com") que mantinha os KPIs financeiros
-- divergentes. A leva de testes deveria ter sido limpa, mas sobrou. Este guard
-- impede que dado de teste volte a entrar — tanto Hotmart quanto Kiwify gravam em
-- marketing.hotmart_sales (coluna platform), então 1 trigger cobre os dois.
--
-- Comportamento: BEFORE INSERT/UPDATE; se a transação/e-mail tem cara de teste,
-- a linha é descartada (RETURN NULL) e os triggers AFTER (revenue rollup, afiliado)
-- nem disparam. Padrões conservadores (prefixo HP-FAKE/TEST/FAKE; domínios de teste)
-- pra minimizar falso-positivo em venda real (IDs numéricos, e-mails reais).

create or replace function marketing.tg_block_test_sales()
returns trigger
language plpgsql
as $$
begin
  if (coalesce(new.hotmart_transaction, '') ~* '^(HP-FAKE|TEST-|FAKE-)')
     or (coalesce(lower(new.buyer_email), '') ~ '(@exemplo\.|@example\.|@invalid|@test\.|^teste@|^test@)')
  then
    raise notice '[guard] venda de teste ignorada: tx=% email=%',
      new.hotmart_transaction, new.buyer_email;
    return null;  -- não grava
  end if;
  return new;
end
$$;

drop trigger if exists trg_block_test_sales on marketing.hotmart_sales;
create trigger trg_block_test_sales
  before insert or update on marketing.hotmart_sales
  for each row execute function marketing.tg_block_test_sales();
