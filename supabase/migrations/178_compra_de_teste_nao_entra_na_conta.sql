-- 178 — a compra de teste do dono não pode nascer como a primeira venda da loja
--
-- ✔ APLICADA em 05/10/2026 às 16:18:15 BRT, reensaiada antes. Medido depois: 5 eventos marcados como teste,
--   e `clearix_demo_solicitada` caiu de 3 para **1** na conta humana — dois eram teste de 15/09.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE AGORA: o dono vai fazer a compra-teste na loja Mello. Sem trava, ela geraria `loja_compra` com
--   valor no `events_log` e seria a PRIMEIRA venda registrada — a loja nasceria com uma venda que não é venda.
--   Foi exatamente o caso da Hotmart em setembro, e lá só não virou número errado porque o ingest desviou a
--   compra de teste para uma tabela separada.
--
-- COMO FICOU (combinado com o agente do Ecommerce em 05/10, opção "a", publicada em 03d2d4d): o SERVIDOR da
--   loja decide pela lista `COUPON_TEST_EMAILS` e marca `metadata.teste = true` em `loja_checkout` e
--   `loja_compra`. Nenhum e-mail no código do site, e ausência da chave significa compra real. A decisão é de
--   lá; a minha metade é esta: **marca que ninguém filtra é enfeite**.
--
-- O QUE MUDA DE SENTIDO, e aviso ao MKT: `analytics.events_humanos` passa a excluir DUAS coisas — robô
--   (`automatico`) e teste declarado (`teste`). O nome continua "humanos" porque a pergunta que ela responde é
--   "quanta gente fazendo coisa de verdade" — e a compra-teste é feita por gente, mas não é coisa de verdade.
--   Quem precisar do log cru continua tendo `events_log`.
--
-- COLUNA GERADA, de novo, pelo mesmo motivo da 175: não depende de ninguém lembrar de filtrar na escrita, e
--   vale para o que já está gravado. Se amanhã a loja mandar `teste` em outro evento, ele já entra marcado.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='analytics' and table_name='events_log' and column_name='teste') then
    raise exception 'a coluna teste ja existe — a 178 ja foi aplicada?';
  end if;
end $$;

alter table analytics.events_log
  add column teste boolean
  generated always as (coalesce((metadata->>'teste')::boolean, false)) stored;

comment on column analytics.events_log.teste is
  '178: verdadeiro quando a própria origem declarou que o evento é teste (metadata.teste). Na loja Mello quem '
  'decide é o servidor, pela lista de e-mails de teste — o site não sabe quem é teste.';

create or replace view analytics.events_humanos as
  select * from analytics.events_log
   where automatico is not true and teste is not true;

comment on view analytics.events_humanos is
  '175/178: events_log sem robô (automatico) e sem teste declarado (teste). Responde "quanta gente fazendo '
  'coisa de verdade" — a compra de teste é feita por gente, mas não é coisa de verdade. Log cru: events_log.';

do $$
declare v_teste int; v_id uuid; v_demo int;
begin
  -- A trava nasce antes da compra-teste. Mas a prova achou que o problema já existia em OUTRO lugar:
  -- 5 eventos da landing do Clearix, de 15/09, com `teste:"1"` — sessões `teste-site-clearix-*`. Entre eles
  -- **2 `clearix_demo_solicitada`**, que é pedido de demonstração: o funil do Clearix mostrava 2 pedidos que
  -- eram teste, há três semanas. A coluna os pega junto, e eles saem da conta a partir daqui.
  select count(*) into v_teste from analytics.events_log where teste;
  if v_teste <> 5 then
    raise exception 'PROVA_178_FALHOU: esperava os 5 testes conhecidos (clearix-site, 15/09) e achei %', v_teste;
  end if;
  select count(*) into v_demo from analytics.events_log where teste and event_code = 'clearix_demo_solicitada';
  if v_demo <> 2 then raise exception 'PROVA_178_FALHOU: esperava 2 demos de teste e achei %', v_demo; end if;

  -- prova com evento de mentira: entra marcado e NÃO aparece na view humana
  insert into analytics.events_log (event_code, product, session_id, url, metadata, occurred_at)
  values ('loja_compra', 'mello-loja', 'prova-178', 'https://mellooticas.com.br/checkout',
          '{"teste": true, "valor_centavos": 19900, "moeda": "BRL"}'::jsonb, now())
  returning id into v_id;

  if not (select teste from analytics.events_log where id = v_id) then
    raise exception 'PROVA_178_FALHOU: a coluna nao marcou o evento de teste';
  end if;
  if exists (select 1 from analytics.events_humanos where id = v_id) then
    raise exception 'PROVA_178_FALHOU: a compra de teste apareceu como gente';
  end if;

  -- e uma compra SEM a chave continua contando, senao eu teria escondido venda real
  insert into analytics.events_log (event_code, product, session_id, url, metadata, occurred_at)
  values ('loja_compra', 'mello-loja', 'prova-178-real', 'https://mellooticas.com.br/checkout',
          '{"valor_centavos": 19900, "moeda": "BRL"}'::jsonb, now())
  returning id into v_id;
  if not exists (select 1 from analytics.events_humanos where id = v_id) then
    raise exception 'PROVA_178_FALHOU: escondi uma compra que nao era teste';
  end if;

  delete from analytics.events_log where session_id in ('prova-178', 'prova-178-real');

  -- e os 5 antigos têm de ter saído da conta humana
  if exists (select 1 from analytics.events_humanos where teste) then
    raise exception 'PROVA_178_FALHOU: sobrou evento de teste na view humana';
  end if;
end $$;

commit;
