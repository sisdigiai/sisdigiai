-- 179 — as visitas de conferência do agente do Ecommerce saem da conta, mas não do log
--
-- ✔ APLICADA em 05/10/2026 às 16:19:25 BRT, reensaiada antes. As 3 saíram da conta humana; a visita de
--   16:02, não reivindicada, continua contando — conferido pelo controle positivo da própria migration.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: agente do Ecommerce, 05/10: "minhas visitas de conferência de agora (produto mo601688, ~16:1x)
--   podem ser apagadas".
--
-- NÃO APAGO, e o motivo é regra da casa: apagar é destrutivo sobre dado real de produção, e pedido de par é
--   coordenação, não autorização. Faço o que resolve o problema dele sem perder o registro: as 3 linhas da
--   sessão 641be710 recebem `metadata.teste`, e a coluna gerada da 178 as tira de `events_humanos` na hora.
--   O log cru continua contando a história de quem conferiu a loja hoje — que é informação, não sujeira.
--
-- FICA DE FORA a sessão daeb62d3 (16:02:25, só a home). Ninguém reivindicou: pode ser o dono abrindo a loja.
--   Marcar visita de gente como teste por palpite é o mesmo erro da 174 ao contrário — eu estaria escondendo
--   o primeiro visitante real da loja para arredondar o número.
--
-- A MARCA É DECLARADA, não deduzida: `teste_declarado_por` diz quem disse. Daqui em diante a loja marca sozinha
--   pelo servidor (lista COUPON_TEST_EMAILS, commit 03d2d4d do Ecommerce); esta migration é só a dívida de hoje.

begin;

do $$
begin
  if (select count(*) from analytics.events_log
       where session_id = '641be710-6e4e-44e8-ae16-7929832e5b10') <> 3 then
    raise exception 'esperava as 3 linhas da sessao de conferencia — conferir antes';
  end if;
  if exists (select 1 from analytics.events_log
              where session_id = '641be710-6e4e-44e8-ae16-7929832e5b10' and teste) then
    raise exception 'ja estao marcadas — a 179 ja foi aplicada?';
  end if;
end $$;

update analytics.events_log
   set metadata = metadata
       || jsonb_build_object('teste', true,
                             'teste_declarado_por', 'agente do Ecommerce, 05/10/2026, conferencia do produto mo601688')
 where session_id = '641be710-6e4e-44e8-ae16-7929832e5b10';

do $$
declare v_humano int;
begin
  if (select count(*) from analytics.events_log
       where session_id = '641be710-6e4e-44e8-ae16-7929832e5b10' and teste) <> 3 then
    raise exception 'PROVA_179_FALHOU: as 3 nao ficaram marcadas';
  end if;
  if exists (select 1 from analytics.events_humanos
              where session_id = '641be710-6e4e-44e8-ae16-7929832e5b10') then
    raise exception 'PROVA_179_FALHOU: continuam contando como gente';
  end if;

  -- controle positivo: a visita NÃO reivindicada continua visível. Prova que eu marquei o que disse que
  -- marquei, e só isso — sem este teste, "nada aparece" passaria por sucesso.
  select count(*) into v_humano from analytics.events_humanos
   where session_id = 'daeb62d3-fce8-4079-81d0-ce8ccee7463a';
  if v_humano <> 1 then
    raise exception 'PROVA_179_FALHOU: a visita de 16:02 devia continuar contando como gente (%)', v_humano;
  end if;

  -- o sku não foi perdido no caminho
  if not exists (select 1 from analytics.events_log
                  where session_id = '641be710-6e4e-44e8-ae16-7929832e5b10'
                    and event_code = 'loja_carrinho' and metadata->>'sku' = 'MO601688') then
    raise exception 'PROVA_179_FALHOU: o update comeu o resto do metadata';
  end if;
end $$;

commit;
