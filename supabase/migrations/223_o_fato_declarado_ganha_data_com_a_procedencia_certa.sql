-- 223 — O fato declarado ganha data, e a procedência diz como ela chegou (11/11/2026).
--
-- O QUE MUDOU: ontem eu recusei carimbar `osi_taty_anos_balcao` porque é **declaração do dono** e não há
-- artefato para reler — movi só a janela (60 → 365 dias) e deixei a data em 16/09. Hoje o Geral trouxe a
-- frase do dono, no canal dele, em 11/11: "25 anos, pode usar nas peças".
--
-- POR QUE EU CARIMBO MESMO SEM TER OUVIDO EM PRIMEIRA MÃO: porque o que vai escrito na fonte é exatamente
-- o que aconteceu — **relato do Geral**, com data e canal — e não "o dono me disse". O valor deste fato é
-- a procedência; se eu escrever uma procedência melhor do que a que tenho, o registro passa a mentir no
-- único lugar em que ele não pode mentir. O número não muda (25, como já estava), a janela não muda, e a
-- frase diz de quem veio e por qual caminho.
--
-- A diferença entre isto e o que recusei ontem: ontem eu não tinha declaração nenhuma de hoje, e carimbar
-- seria inventar uma. Hoje existe uma declaração relatada — menos que ouvir do dono, mais que nada — e o
-- registro guarda essa distinção por escrito, para quem ler daqui a um ano saber o que tem na mão.

update mkt.fatos
   set verificado_em = '2026-11-11',
       fonte = 'Declaração do dono, 11/11/2026: "25 anos, pode usar nas peças" — RELATADA pelo Orquestrador '
            || 'Geral (canal dele), não ouvida em primeira mão pelo app digiai. Declarações anteriores do '
            || 'dono em 10/09 e 16/09/2026; mkt.content_rules da OSI corrigido de 20 para 25 em 16/09. '
            || 'Janela de 365 dias (app digiai, 11/11/2026): declaração não apodrece em 60 dias, apodrece '
            || 'quando ela fizer mais um ano de balcão. O texto da aula de 24/11 dizia 20 — Receita e MKT '
            || 'estão alinhando a peça escrita à mão, e a trava do motor não alcança texto escrito fora dele.',
       updated_at = now()
 where chave = 'osi_taty_anos_balcao';

-- PROVA 1 — o número não mudou. Carimbar data é uma coisa; mexer no que o fato afirma é outra, e esta
-- migration não faz a segunda.
do $$
declare v text;
begin
  select fato into v from mkt.fatos where chave = 'osi_taty_anos_balcao';
  if v not like '%25 anos de balcão%' then
    raise exception 'PROVA_223_FALHOU: o texto do fato mudou — esta migration só carimba data e procedência';
  end if;
end $$;

-- PROVA 2 — a procedência continua dizendo que o relato é de segunda mão. Esta prova existe porque a
-- tentação, daqui a um mês, é "limpar" essa frase e deixar só "declarado pelo dono" — que é mais curto,
-- soa melhor e **não é o que aconteceu**.
do $$
declare v text;
begin
  select fonte into v from mkt.fatos where chave = 'osi_taty_anos_balcao';
  if v not ilike '%RELATADA%' or v not ilike '%não ouvida em primeira mão%' then
    raise exception 'PROVA_223_FALHOU: a fonte deixou de dizer que a declaracao chegou por relato';
  end if;
end $$;

-- PROVA 3 — segue fresco, com a janela de 365 dias e a data de hoje.
do $$
declare r record;
begin
  select verificado_em, validade_dias, fresco, valido_ate into r
    from public.v_mkt_fatos where chave = 'osi_taty_anos_balcao';
  if r.verificado_em <> date '2026-11-11' or r.validade_dias <> 365 or not r.fresco then
    raise exception 'PROVA_223_FALHOU: verificado_em %, validade % , fresco % (esperado 11/11, 365, true)',
      r.verificado_em, r.validade_dias, r.fresco;
  end if;
end $$;
