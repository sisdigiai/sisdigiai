-- 164 — o grant que faltou: a 158 deu policy a ops.contas_servicos e esqueceu o GRANT, e a tela de pixels sumiu
--
-- ✔ APLICADA em 29/09/2026 às 15:39:50 BRT, reensaiada antes. PROVA NO NAVEGADOR, com o dono logado: o mesmo
--   endpoint que respondia 403 respondeu 200 no rastreio de rede, e o bloco "Medição dos sites" apareceu com
--   6 vitrines · 2 cegas · 27 apps com login.
--
-- (Escrita como NÃO APLICADA.)
--
-- O QUE ACONTECEU: na 158 eu liguei uma policy de staff em ops.contas_servicos para que a view de pixels
--   pudesse nascer `security_invoker` (R-043). Policy é quem PODE ver cada linha; GRANT é quem pode tocar a
--   tabela. Sem os dois, o banco nega — e nega antes de olhar a policy. Resultado medido em 29/09, com o dono
--   conferindo a tela: `GET /rest/v1/v_ops_pixels` devolvia **403**, o componente engolia o erro no catch e o
--   bloco "Medição dos sites" simplesmente não aparecia. A tela não mentiu número nenhum: ela sumiu inteira.
--
-- POR QUE PASSOU PELAS PROVAS DA 158: as provas de lá conferiram o contrário — que anon NÃO lê. Nenhuma
--   conferiu que `authenticated` LÊ. Prova de porta trancada não é prova de que a chave certa abre.
--   Esta migration termina lendo a view como authenticated, que é a conferência que faltou.
--
-- NÃO AFROUXA NADA: a tabela continua com RLS ligada e policy `is_staff()`. O grant só permite chegar à
--   policy; quem não é staff continua sem ver linha nenhuma. anon segue sem grant e sem policy.

begin;

do $$
begin
  if has_table_privilege('authenticated', 'ops.contas_servicos', 'select') then
    raise exception 'authenticated ja le ops.contas_servicos — a 164 ja foi aplicada?';
  end if;
end $$;

grant select on ops.contas_servicos to authenticated;

do $$
declare v_n int;
begin
  if not has_table_privilege('authenticated', 'ops.contas_servicos', 'select') then
    raise exception 'PROVA_164_FALHOU: o grant nao pegou';
  end if;
  if has_table_privilege('anon', 'ops.contas_servicos', 'select')
  or has_table_privilege('anon', 'public.v_ops_pixels', 'select') then
    raise exception 'PROVA_164_FALHOU: anon ganhou acesso de carona';
  end if;

  -- A conferência que faltou na 158, até onde este canal alcança: como `authenticated` a view tem de ABRIR
  -- sem "permission denied". Quantas linhas voltam, aqui, não diz nada — `set role` não carrega JWT, então
  -- is_staff() é falso e a RLS esconde tudo (aprendido em 09/09: RLS não se prova pela Management API).
  -- A prova das linhas é a chamada real com o token do dono, no navegador, registrada no cabeçalho.
  begin
    set local role authenticated;
    select count(*) into v_n from public.v_ops_pixels;
    reset role;
  exception when insufficient_privilege then
    reset role;
    raise exception 'PROVA_164_FALHOU: authenticated ainda apanha permission denied na view';
  end;
  raise notice 'v_ops_pixels abriu como authenticated (% linhas sem JWT, esperado 0)', v_n;
end $$;

commit;
