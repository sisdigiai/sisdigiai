-- ============================================================
-- 274 — as OS de 2026 passam à frase que é verdadeira nos dois casos (PREPARADA, NÃO APLICADA)
--
-- RISCO NA PRIMEIRA LINHA: **neste momento o banco tem 2.004 OS citável** — `fresco` e `publico`
-- nos dois fatos, portanto dentro do prompt do gerador do MKT e passível de sair numa peça. O 2.004
-- está errado **nas duas leituras possíveis** (2.001 ou 1.999) e contraria a folha única de hoje.
--
-- POR QUE ESTA MIGRATION EXISTE, e por que ela vem antes da 273: o número exato ainda não fechou.
-- O Vendas conferiu a consulta (2.001 e 1.992) mas com ressalva: **2 das 2.001 têm só
-- `status = 'cancelled'`**; se o dono disser que foram canceladas, o número vira 1.999. A pergunta
-- está com ele, no canal do Vendas. Enquanto isso, a folha única (commit `82a4ef72`) permite **uma**
-- frase pública: *"mais de 1.990 OS em 2026 (até 24/11/2026)"*, verdadeira nos dois casos — e diz
-- que o número exato e a frase do balcão só voltam quando a pergunta fechar.
--
-- Esperar a resposta com o 2.004 no ar seria deixar um número que a casa **sabe** errado dentro do
-- gerador. Esta migration não adivinha o número: ela tira o errado e põe no lugar o que é verdade
-- nas duas hipóteses. É menos preciso de propósito, e é o que a folha autoriza hoje.
--
-- `valor_numerico` vai a NULL, e isso é deliberado: não existe um número exato para esta linha
-- enquanto a pergunta estiver aberta, e gravar 1990 criaria um quarto número no mesmo dia. A coluna
-- aceita nulo (o `pulso_tela_1710_nao_e_dinheiro` já é assim desde a 266).
--
-- A FRASE DO BALCÃO SAI JUNTO. "1.995 nasceram no balcão" era de 2.004 e "1.992" é da leitura que
-- ainda pode mudar — a folha tirou as duas de circulação. O fato fica sem ela até o número fechar.
--
-- QUANDO A PERGUNTA FECHAR: aplica-se a **273** (2.001 e 1.992) ou a sua versão com 1.999, com o
-- "trava tirada" do Geral. Esta 274 é o estado honesto do intervalo, não o destino.
--
-- Volta: `Cockpit/controle/volta-fato-comissao-2026-11-25.sql` (segunda metade, estado 2.004 das
-- duas linhas, lido do banco antes de qualquer escrita). Nenhum delete.
-- ============================================================
begin;

do $$ declare n int; begin
  select count(*) into n from mkt.fatos
   where chave in ('clearix_os_2026','digiai_prova_operacao') and valor_numerico = 2004;
  if n <> 2 then raise exception 'esperava os dois fatos de OS em 2004, achei % — alguem ja reescreveu', n; end if;
end $$;

update mkt.fatos set
  fato = 'Em 2026, mais de 1.990 OS na loja viva da rede da casa (até 24/11/2026).',
  valor_numerico = null,
  fonte = 'folha única, 25/11/2026 18h45: o número exato está travado. A régua da casa, fixada pelo Vendas, é "venda cancelada = deleted_at IS NULL AND is_cancelled IS TRUE"; por ela são 2.001, mas 2 dessas OS têm só status cancelled e, se o dono disser que foram canceladas, viram 1.999. Até a resposta, a única frase pública é "mais de 1.990", verdadeira nos dois casos. O 2.004 de 24/11 contava 3 canceladas e saiu. A frase do balcão (1.995 ou 1.992) também está travada.',
  uso_restrito = null,
  updated_at = now()
where chave = 'clearix_os_2026';

update mkt.fatos set
  fato = 'A DIGIAI opera o próprio varejo óptico dentro do Clearix: uma rede da casa, com 1 loja vendendo todo dia e mais de 1.990 OS em 2026 (até 24/11/2026).',
  valor_numerico = null,
  fonte = 'folha única, 25/11/2026 18h45: número exato travado (2.001 ou 1.999, conforme a resposta do dono sobre 2 OS com só status cancelled). "Mais de 1.990" é verdadeiro nos dois casos.',
  updated_at = now()
where chave = 'digiai_prova_operacao';

-- ── a conferência ─────────────────────────────────────────────────────────────
do $$ begin
  -- nenhum dos números em disputa sobrevive em fato nenhum da tabela
  if exists (select 1 from mkt.fatos where fato ~ '2\.004|2\.001|1\.999|1\.995 nasceram|1\.992 nasceram'
              or valor_numerico in (2004, 2001, 1999)) then
    raise exception 'um numero em disputa ainda esta em algum fato'; end if;

  if (select count(*) from mkt.fatos
       where chave in ('clearix_os_2026','digiai_prova_operacao')
         and fato like '%mais de 1.990%' and valor_numerico is null and ativo and publico) <> 2 then
    raise exception 'os dois fatos de OS nao ficaram com a frase permitida pela folha'; end if;

  -- a frase do balcão sai de circulação enquanto o número não fecha
  if exists (select 1 from mkt.fatos where fato ilike '%nasceram no balc%') then
    raise exception 'a frase do balcao continua no ar, e a folha a travou'; end if;

  -- e continuam citáveis: a casa não perde o fato, perde a precisão que não tem
  if (select count(*) from public.v_mkt_fatos
       where fresco and publico and chave in ('clearix_os_2026','digiai_prova_operacao')) <> 2 then
    raise exception 'os dois fatos de OS deixaram de ser citaveis, e nao era para isso'; end if;

  if exists (select 1 from mkt.fatos where fato like '%' || chr(65533) || '%' or fonte like '%' || chr(65533) || '%') then
    raise exception 'acento corrompido (U+FFFD)'; end if;
end $$;

commit;

-- Sabotagens a conferir no ensaio:
--   a) gravar `valor_numerico = 1990` → a 1.ª conferência não pega, mas cria um quarto número no
--      dia; por isso a regra é NULL, e está escrita no cabeçalho. (Não há check de banco: é regra
--      de quem escreve.)
--   b) manter a frase do balcão → a 3.ª conferência acusa.
--   c) deixar 2.004 num dos dois → a 1.ª conferência acusa.
--
-- Reversão: `Cockpit/controle/volta-fato-comissao-2026-11-25.sql`.
