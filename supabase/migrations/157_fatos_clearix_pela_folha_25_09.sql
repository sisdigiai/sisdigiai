-- 157 — fatos publicáveis do Clearix alinhados à folha única (carnê atualizado + 2 números públicos novos)
--
-- ⛔ NÃO APLICADA. ESPERA A PALAVRA DO DONO no canal do app.
--
-- POR QUE ESPERA, mesmo com o Geral pedindo: `mkt.fatos` é curadoria do app — isso está escrito no AGENTS do
--   digiai_mkt ("a fonte única de números/claims publicáveis é public.v_mkt_fatos; curadoria é do digiai") e o
--   Geral confirmou. Mas fato publicável vira NÚMERO PÚBLICO na mão do MKT, e a autorização de 16/09 que o Geral
--   citou ("pode gravar e aprovar") eu NÃO achei no registro: o que existe de 16/09 é o dono dizendo que a
--   curadoria de ideias é do orquestrador e que o meu papel é o estado automático dos apps. Ordem de par não
--   autoriza publicação. Então: escrita, ensaiada e parada aqui até a linha do dono.
--
-- FONTE DE CADA NÚMERO — folha única `Cockpit/comercial/folha-de-mesa-clearix-2026-09-14.md`, texto conferido:
--   §1  linha 14: "1.528 · R$ 394.734 (21/09/2026 13:48 BRT; sales_finance.installments pagas, OS viva, pagas em
--       2026; era 1.477 em 14/09)" → o fato atual grava 1477, de 14/09: está ATRÁS da fonte.
--   linha 65: "926 clientes com a receita vencida no último ano; 912 deles sem nenhum contato da loja em 90 dias."
--       (Grupo Mello, 24/09/2026) — NO AR na home desde 24/09.
--   linha 66: "70 clientes vencem a receita nos próximos 30 dias; 66 ainda sem contato."
--
-- VALIDADE 60 DIAS (pedido do Geral): número de operação da loja viva muda devagar; 60 dias é o intervalo em que
--   ele ainda descreve a realidade. Vencido, o fato para de ser publicável sozinho — é assim que o MKT não
--   repete número velho.

begin;

do $$
begin
  if exists (select 1 from mkt.fatos where chave in ('clearix_receita_vencida_12m', 'clearix_receita_vence_30d')) then
    raise exception 'os fatos novos ja existem — a 157 ja foi aplicada?';
  end if;
  if (select valor_numerico from mkt.fatos where chave = 'clearix_carne_2026') <> 1477 then
    raise exception 'clearix_carne_2026 nao esta em 1477 — conferir a folha antes de sobrescrever.';
  end if;
end $$;

update mkt.fatos
   set fato = '1.528 parcelas de carnê recebidas em 2026, somando R$ 394.734 (medido em 21/09/2026).',
       valor_numerico = 1528,
       fonte = 'folha única §1 · sales_finance.installments pagas, OS viva, pagas em 2026',
       verificado_em = '2026-09-21',
       validade_dias = 60,
       updated_at = now()
 where chave = 'clearix_carne_2026';

insert into mkt.fatos (brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico, ativo)
values
 ('digiai', 'clearix_receita_vencida_12m',
  '926 clientes com a receita vencida no último ano; 912 deles sem nenhum contato da loja em 90 dias (Grupo Mello, medido em 24/09/2026).',
  926, 'folha única · número público no ar na home do Clearix desde 24/09/2026', '2026-09-24', 60, true, true),
 ('digiai', 'clearix_receita_vence_30d',
  '70 clientes vencem a receita nos próximos 30 dias; 66 ainda sem contato (Grupo Mello, medido em 24/09/2026).',
  70, 'folha única · segundo número, "quem chamar hoje"', '2026-09-24', 60, true, true);

do $$
declare v_carne numeric; v_n int;
begin
  select valor_numerico into v_carne from mkt.fatos where chave = 'clearix_carne_2026';
  if v_carne <> 1528 then raise exception 'PROVA_157_FALHOU: carnê nao ficou em 1528'; end if;
  select count(*) into v_n from public.v_mkt_fatos
   where chave in ('clearix_receita_vencida_12m', 'clearix_receita_vence_30d');
  if v_n <> 2 then raise exception 'PROVA_157_FALHOU: os 2 fatos novos nao chegaram na view publicavel (%)', v_n; end if;
  -- nenhum fato do Clearix pode ficar vencido logo ao nascer
  if exists (select 1 from mkt.fatos where chave like 'clearix_%' and ativo and publico
              and (current_date - verificado_em) > validade_dias) then
    raise exception 'PROVA_157_FALHOU: fato clearix vencido depois da leva';
  end if;
end $$;

commit;
