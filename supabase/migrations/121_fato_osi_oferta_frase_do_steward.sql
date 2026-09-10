-- 121 — a frase do fato osi_oferta passa a ser a do dono do texto (steward da OSI)
--
-- ✔ APLICADA em 10/09/2026 pelo Orquestrador Geral, sob o portão 97. Reconferido por
--   mim com a trava final deste arquivo: a frase do steward byte a byte, o preço escrito
--   na frase igual a valor_numerico, fresco e público, 0 fatos com preço velho.
--   "Só o texto mudou" conferido contra o estado que a 118 deixou (valor 49.00,
--   verificado_em 2026-09-10, fonte "Repete academy.products..."), e não pela tabela
--   temporária da trava: depois de aplicada, ela nasceria do estado novo e compararia
--   o fato consigo mesmo.
--
-- (Escrita como NÃO APLICADA.) Portão 97. Frase canônica do steward da OSI, dono do texto da
--    promessa, repassada pelo Orquestrador Geral em 10/09/2026. Aplica quem tem o
--    mandato do portão 97. (O pedido chamou-lhe "119"; a 119 e a 120 já estavam
--    tomadas — nota da Hotmart/funil e drop da agenda de follow-up.)
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MUDA: só `fato`
-- ═══════════════════════════════════════════════════════════════════════════
-- `valor_numerico`, `fonte` e `verificado_em` ficam como a 118 os deixou — e a trava
-- prova que ficaram, comparando com o estado de antes, não com constantes.
--
-- Antes (118):
--   "O Ótica Sem Improviso é o método em 5 movimentos da DIGIAI Academy: ebook + manual
--    digital por R$ 49, compra única, sem assinatura, disponível na Hotmart e na Kiwify."
-- Depois (textual, do steward):
--   "O Ótica Sem Improviso é o manual visual de atendimento e conversão para óticas da
--    DIGIAI Academy, com o método dos 5 Movimentos: manual em PDF para imprimir, App
--    leitor para estudar no celular e 90 dias de apoio complementar no Nexus, por R$ 49,
--    compra única, sem assinatura, com garantia de 7 dias, na Hotmart e na Kiwify."
--
-- Fecha o que a 118 deixou de fora de propósito: "ebook + manual digital" divergia da
-- promessa padrão, e a frase é copy — tem dono, e agora veio dele.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ UMA TRAVA QUE O PEDIDO NÃO TINHA
-- ═══════════════════════════════════════════════════════════════════════════
-- A frase carrega o preço ESCRITO ("R$ 49"); o número do fato é COPIADO de
-- academy.products. São duas cópias do mesmo número em dois sítios, e só uma se liga
-- à fonte. No dia em que o preço mudar e alguém atualizar só `valor_numerico`, o texto
-- passa a mentir sem nada reclamar — e é o TEXTO que os geradores citam ("a formulação
-- do campo fato é a fronteira", AGENTS.md do MKT).
-- A trava extrai o número da frase e exige que bata com `valor_numerico`. Não impede
-- o futuro; impede que esta migration nasça já com os dois a discordar, e deixa o teste
-- escrito para quem mudar o preço a seguir.

begin;

create temp table _antes_121 on commit drop as
  select valor_numerico, fonte, verificado_em from mkt.fatos where chave = 'osi_oferta' and ativo;

do $$
declare n int;
begin
  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta' and ativo and publico
     and fato = 'O Ótica Sem Improviso é o método em 5 movimentos da DIGIAI Academy: ebook + manual digital por R$ 49, compra única, sem assinatura, disponível na Hotmart e na Kiwify.'
     and valor_numerico = (select price_brl from academy.products where slug = 'otica-sem-improviso' and deleted_at is null);
  if n <> 1 then
    raise exception 'osi_oferta não está no estado que a 118 deixou (frase + número da fonte): encontrei % linha(s). Conferir antes de sobrescrever.', n;
  end if;
end $$;

update mkt.fatos set
  fato = 'O Ótica Sem Improviso é o manual visual de atendimento e conversão para óticas da DIGIAI Academy, com o método dos 5 Movimentos: manual em PDF para imprimir, App leitor para estudar no celular e 90 dias de apoio complementar no Nexus, por R$ 49, compra única, sem assinatura, com garantia de 7 dias, na Hotmart e na Kiwify.',
  updated_at = now()
where chave = 'osi_oferta' and ativo;

do $$
declare n int;
begin
  -- A frase do steward, byte a byte.
  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta' and ativo
     and fato = 'O Ótica Sem Improviso é o manual visual de atendimento e conversão para óticas da DIGIAI Academy, com o método dos 5 Movimentos: manual em PDF para imprimir, App leitor para estudar no celular e 90 dias de apoio complementar no Nexus, por R$ 49, compra única, sem assinatura, com garantia de 7 dias, na Hotmart e na Kiwify.';
  if n <> 1 then
    raise exception 'A frase nova não ficou gravada byte a byte.';
  end if;

  -- Só o texto mudou.
  select count(*) into n from mkt.fatos f, _antes_121 a
   where f.chave = 'osi_oferta' and f.ativo
     and f.valor_numerico is not distinct from a.valor_numerico
     and f.fonte is not distinct from a.fonte
     and f.verificado_em is not distinct from a.verificado_em;
  if n <> 1 then
    raise exception 'valor_numerico, fonte ou verificado_em mudaram — só o texto devia mudar.';
  end if;

  -- O número escrito na frase é o número do fato.
  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta' and ativo
     and substring(fato from 'R\$\s?(\d+(?:[,.]\d{1,2})?)') is not null
     and replace(substring(fato from 'R\$\s?(\d+(?:[,.]\d{1,2})?)'), ',', '.')::numeric = valor_numerico;
  if n <> 1 then
    raise exception 'O preço escrito na frase não bate com valor_numerico — o texto e o número do fato discordam.';
  end if;

  select count(*) into n from public.v_mkt_fatos
   where fato ~* '48[,.]50|R\$\s?97|estreia|turma inicial'
      or valor_numerico in (48.5, 47.9, 97);
  if n > 0 then
    raise exception '% fato(s) em v_mkt_fatos com preço velho.', n;
  end if;

  select count(*) into n from public.v_mkt_fatos
   where chave = 'osi_oferta' and fresco and publico;
  if n <> 1 then
    raise exception 'osi_oferta não está fresco e público em v_mkt_fatos — os geradores não o veriam.';
  end if;

  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta'
     and lower(fonte) ~ 'espelho_pulso|publications|mkt_espelho|tenant_vida|clearix';
  if n > 0 then
    raise exception 'fonte de osi_oferta contém palavra que desvia a classificação da edge verificar-fatos.';
  end if;

  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta' and fato like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception 'Acento corrompido na frase (U+FFFD).';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `v_mkt_fatos` osi_oferta: a frase do steward, valor 49, fresco;
--   b) valor_numerico, fonte e verificado_em iguais aos de antes (a trava compara);
--   c) o número escrito na frase = valor_numerico (a trava compara).
