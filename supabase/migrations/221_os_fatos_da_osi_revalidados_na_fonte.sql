-- 221 — Os fatos da OSI revalidados NA FONTE, e um fato declarado deixa de vencer como medição (11/11/2026).
--
-- POR QUE AGORA: `osi_oferta`, `osi_aplicacao` e `osi_taty_anos_balcao` vencem em **15/11**, e a regra da
-- OSI em `mkt.content_rules` diz, com todas as letras, que preço, pacote e garantia vêm **só** do fato
-- `osi_oferta`. Com ele vencido e a trava fail-closed, as peças da aula de 24/11 e a grade da OSI saem
-- sem poder citar o preço do produto. Não é hipótese: é o que a regra manda acontecer.
--
-- COMO REVALIDEI: contra o artefato publicado, não contra a minha memória.
--   · `academy.products` (slug `otica-sem-improviso`): **price_brl = 49.00**, lido hoje.
--   · Landing no ar (`osi.digiai.app.br`, html + bundle, 11/11/2026): **"R$ 49, pagamento único. Garantia
--     de 7 dias. Depois dos 30 dias, o Nexus continua por R$ 19,90/mês"** — a frase do fato, inteira.
--     Também presentes: "3 dias", "ritmo do plano", "Hotmart", "Kiwify".
--   Ou seja: os dois fatos de produto continuam verdadeiros, palavra por palavra. Só a data muda.
--
-- O QUE EU **NÃO** FIZ, e é o ponto desta migration: **não carimbei o fato declarado.**
-- `osi_taty_anos_balcao` ("25 anos de balcão") é **declaração do dono**, não medição — não existe artefato
-- para reler. Mover o `verificado_em` dele hoje seria eu dizer "verifiquei" sobre algo que não verifiquei,
-- que é exatamente o vício que a tabela de fatos existe para impedir. O que muda é a **janela**: um fato
-- declarado não apodrece em 60 dias, apodrece quando a pessoa faz mais um ano de balcão. Validade vai a
-- 365 dias, a data de verificação **fica onde está** (16/09), e o texto continua dizendo quem declarou e
-- quando. Se o dono quiser outra janela, é uma frase dele.

update mkt.fatos
   set verificado_em = '2026-11-11',
       fonte = 'Preço: academy.products (slug otica-sem-improviso), price_brl 49.00 — relido em 11/11/2026. '
            || 'Pacote, garantia e continuidade: landing no ar em osi.digiai.app.br, lida em 11/11/2026 '
            || '("R$ 49, pagamento único. Garantia de 7 dias. Depois dos 30 dias, o Nexus continua por R$ 19,90/mês"). '
            || 'Hotmart e Kiwify continuam citadas na página. Mudou o preço ou o pacote lá, muda aqui.',
       updated_at = now()
 where chave = 'osi_oferta';

update mkt.fatos
   set verificado_em = '2026-11-11',
       fonte = 'Landing no ar em osi.digiai.app.br, lida em 11/11/2026: "3 dias" e "ritmo do plano" '
            || 'continuam publicados, com a mesma ressalva de que não é promessa de resultado.',
       updated_at = now()
 where chave = 'osi_aplicacao';

update mkt.fatos
   set validade_dias = 365,
       fonte = fonte || ' · 11/11/2026 (app digiai, curador): janela de 60 para 365 dias. Isto é DECLARAÇÃO '
            || 'do dono, não medição — não há artefato para reler, e por isso a data de verificação NÃO foi '
            || 'movida. Declaração não apodrece em 60 dias; apodrece quando ela fizer mais um ano de balcão.',
       updated_at = now()
 where chave = 'osi_taty_anos_balcao';

-- PROVA 1 — os três estão frescos e passam de 15/11, que era o buraco. Sem isto, a grade da OSI e as peças
-- da aula de 24/11 ficariam sem poder citar o preço do produto.
do $$
declare r record;
begin
  for r in select chave, fresco, valido_ate from public.v_mkt_fatos where chave like 'osi\_%' loop
    if not r.fresco then
      raise exception 'PROVA_221_FALHOU: % continua vencido', r.chave;
    end if;
    if r.valido_ate <= date '2026-11-24' then
      raise exception 'PROVA_221_FALHOU: % vale só até %, antes da aula de 24/11', r.chave, r.valido_ate;
    end if;
  end loop;
end $$;

-- PROVA 2 — o fato DECLARADO não foi carimbado como verificado hoje. Esta prova existe para me impedir de,
-- num dia apressado, revalidar em lote o que não tem como ser relido.
do $$
declare v date;
begin
  select verificado_em into v from mkt.fatos where chave = 'osi_taty_anos_balcao';
  if v <> date '2026-09-16' then
    raise exception 'PROVA_221_FALHOU: a data de verificacao do fato declarado foi movida para % — ela tem de ficar em 16/09', v;
  end if;
end $$;

-- PROVA 3 — o texto dos fatos de produto não mudou. Revalidar é reler a fonte e mover a data; se o texto
-- mudasse aqui, isto deixaria de ser revalidação e viraria fato novo, que é outra conversa e outra decisão.
do $$
declare v text;
begin
  select fato into v from mkt.fatos where chave = 'osi_oferta';
  if v not like '%R$ 49 em compra única na Hotmart%' or v not like '%garantia de 7 dias%' then
    raise exception 'PROVA_221_FALHOU: o texto de osi_oferta mudou nesta migration — revalidacao nao reescreve fato';
  end if;
end $$;
