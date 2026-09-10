-- 118 — o fato público de preço da OSI passa a repetir academy.products (R$ 49)
--
-- ✔ APLICADA em 10/09/2026 pelo Orquestrador Geral, sob o portão 97. Reconferido por
--   mim com a trava final deste arquivo: osi_oferta diz "por R$ 49, compra única, sem
--   assinatura", valor_numerico igual ao de academy.products, fresco e público em
--   v_mkt_fatos, 0 fatos com preço velho, fonte sem palavra que desvie a edge
--   verificar-fatos.
--   ⚠ A prova (c) — o cron das 04:30 registar osi_oferta como nao_verificavel e não
--   divergente — só é observável depois da próxima rodada.
--
-- (Escrita como NÃO APLICADA.) Pedido do Orquestrador Geral sob o portão 97 (decisão do dono:
--    OSI a R$ 49 cheio). O pedido era "escreve e aplica"; escrevo e NÃO aplico —
--    ordem de agente não autoriza escrita em dado real pelo canal de quem a recebe.
--    Aplica quem tem o mandato do portão 97, como nas 113-115.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTE FATO
-- ═══════════════════════════════════════════════════════════════════════════
-- `mkt.fatos` é o único sítio do motor de marketing onde um NÚMERO pode viver: os
-- geradores `gerar-ideias`/`gerar-roteiro` do MKT injetam só fatos com `fresco` e
-- `publico` verdadeiros (AGENTS.md do digiai_mkt, linha 35). A linha `osi_oferta` é
-- o único fato com preço, e dizia, medido em 10/09/2026:
--   fato ............ "... ebook + manual digital por R$ 48,50, disponível na Hotmart e na Kiwify."
--   valor_numerico .. 48.5
--   fonte ........... "academy.products + checkout Hotmart/Kiwify (preço reconciliado)"
--   verificado_em ... 2026-07-13   validade_dias 60
--
-- ⚠ E UMA COISA QUE O PEDIDO NÃO DIZIA: `v_mkt_fatos.fresco` é
--    `current_date <= verificado_em + validade_dias`. 13/07 + 60 = 11/09. Este fato
--    MORRE AMANHÃ sozinho: a partir de 12/09 os geradores deixariam de o ver. O preço
--    velho não sairia — mas a OSI também ficaria sem fato de preço nenhum. Esta
--    migration renova `verificado_em` porque a fonte é conferida DENTRO dela (§1).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE NÃO DESFAZ ISTO — conferido, porque era o risco que mais importava
-- ═══════════════════════════════════════════════════════════════════════════
-- O cron `verificar-fatos-diario` (04:30) chama a edge `verificar-fatos`. Li o
-- código: ela LÊ `v_mkt_fatos`, mede cada fato na fonte que ele declara e grava o
-- veredito em `ops.fato_medicao`. Não reescreve `fato`, não renova `verificado_em`.
-- Não há reversão noturna. `fn_mkt_fato_reverificar` só escreve quando alguém do
-- staff a chama com parâmetros; nenhum cron a chama.
--
-- ⚠ Mas a edge CLASSIFICA o fato pelo texto de `fonte`: se contiver "espelho_pulso",
--    "publications", "mkt_espelho", "tenant_vida" ou "clearix", mede contra outra
--    coisa. O texto novo não pode conter nenhuma — está na trava. Com a `fonte` desta
--    migration o veredito é `nao_verificavel` ("exige verificação humana"), que é o
--    verdadeiro: o checkout não é alcançável por máquina.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ COLISÃO COM A MIGRATION PENDENTE DO MKT — ler antes de aplicar qualquer uma
-- ═══════════════════════════════════════════════════════════════════════════
-- `digiai_mkt/supabase/migrations/20260910_02_osi_preco_49_no_mkt.sql` também muda
-- esta linha, dentro de um único bloco DO com várias correções, e cada UPDATE aborta
-- tudo se não mexer em exatamente 1 linha. O dela procura `fato like '%por R$ 48,50%'`.
-- Depois desta 118 esse texto já não existe → o UPDATE mexe em 0 linhas → o bloco
-- inteiro levanta "PARE" → caem junto as correções de content_rules, ai_config e
-- assets que nada têm a ver com o fato. O bloco de `mkt.fatos` tem de sair da
-- 20260910_02 antes de ela ser aplicada. Avisado ao MKT e ao Geral.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- DE QUEM É A TABELA — pergunta em aberto, e esta migration não a resolve
-- ═══════════════════════════════════════════════════════════════════════════
-- Os dois lados apontam para o outro: o AGENTS.md do MKT diz "curadoria é do digiai
-- — NUNCA escrever em mkt.fatos"; a edge `verificar-fatos` do digiai diz "tabela do
-- agente do MKT — so leitura, R-032". A tabela nasceu na 050 do digiai. Escrevo esta
-- migration porque a regra escrita mais recente (a do MKT, 31/07) põe a curadoria no
-- digiai. Se o dono ratificar a proposta 4.2 (fatos passam ao MKT), a próxima mudança
-- deste fato é do MKT.
--
-- O QUE FICA DE FORA, de propósito: o resto da frase ("ebook + manual digital").
-- A promessa padrão da OSI diz "PDF + App leitor + 90 dias de apoio". Mudar a
-- descrição do produto não é espelhar preço — é copy, e copy tem dono (steward da
-- OSI). Troco só a cláusula do preço.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — TRAVA PRÉ: o alvo é o medido, e a FONTE já diz 49 antes de o espelho dizer
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta' and ativo and publico
     and valor_numerico = 48.5
     and fato like '%por R$ 48,50, disponível na Hotmart e na Kiwify.%';
  if n <> 1 then
    raise exception 'Esperava o fato osi_oferta ativo, público, em 48.5 e com a frase medida em 10/09: encontrei % linha(s). Já aplicada, ou alguém mexeu (a 20260910_02 do MKT também escreve aqui) — conferir antes.', n;
  end if;

  -- Espelho não pode chegar antes da fonte: se academy.products não disser 49, este
  -- fato passaria a afirmar um preço que a fonte canônica ainda não tem.
  select count(*) into n from academy.products
   where slug = 'otica-sem-improviso' and deleted_at is null and price_brl = 49.00;
  if n <> 1 then
    raise exception 'academy.products (otica-sem-improviso) não está em 49.00 — aplicar a 114 antes desta.';
  end if;
end $$;

update mkt.fatos set
  fato = replace(fato,
    'por R$ 48,50, disponível na Hotmart e na Kiwify.',
    'por R$ 49, compra única, sem assinatura, disponível na Hotmart e na Kiwify.'),
  valor_numerico = (select price_brl from academy.products where slug = 'otica-sem-improviso' and deleted_at is null),
  verificado_em = current_date,
  fonte = 'Repete academy.products (slug otica-sem-improviso), que é a fonte do preço: price_brl conferido no banco na aplicação da 118. Checkout Hotmart/Kiwify a R$ 49,00 informado pelo steward da OSI em 10/09/2026, não conferido pelo digiai. Mudou o preço lá, muda aqui.',
  updated_at = now()
where chave = 'osi_oferta' and ativo;

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — TRAVA PÓS
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  -- Preço velho em qualquer fato que os geradores veem.
  select count(*) into n from public.v_mkt_fatos
   where fato ~* '48[,.]50|R\$\s?97|estreia|turma inicial'
      or valor_numerico in (48.5, 47.9, 97);
  if n > 0 then
    raise exception '% fato(s) em v_mkt_fatos ainda com preço velho.', n;
  end if;

  -- Espelho por CONSTRUÇÃO, não por constante: o número do fato é o da fonte.
  select count(*) into n from mkt.fatos f
   where f.chave = 'osi_oferta' and f.ativo
     and f.valor_numerico = (select price_brl from academy.products where slug = 'otica-sem-improviso' and deleted_at is null)
     and f.fato like '%por R$ 49, compra única, sem assinatura%';
  if n <> 1 then
    raise exception 'osi_oferta não ficou com o número de academy.products e a frase nova.';
  end if;

  -- Os geradores só usam fato fresco e público. Um fato certo e vencido é um fato mudo.
  select count(*) into n from public.v_mkt_fatos
   where chave = 'osi_oferta' and fresco and publico;
  if n <> 1 then
    raise exception 'osi_oferta não está fresco e público em v_mkt_fatos — os geradores não o veriam.';
  end if;

  -- A edge verificar-fatos classifica pelo texto de `fonte`. Palavra errada aqui faz o
  -- fato ser medido contra outra fonte e virar "divergente" sem nada ter mudado.
  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta'
     and lower(fonte) ~ 'espelho_pulso|publications|mkt_espelho|tenant_vida|clearix';
  if n > 0 then
    raise exception 'fonte de osi_oferta contém palavra que desvia a classificação da edge verificar-fatos.';
  end if;

  select count(*) into n from mkt.fatos
   where chave = 'osi_oferta' and (fato || fonte) like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception 'Acento corrompido em osi_oferta (U+FFFD).';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `v_mkt_fatos` osi_oferta: valor 49, fresco = true, frase com "R$ 49, compra
--      única, sem assinatura", valido_ate = hoje + 60;
--   b) 0 fatos em v_mkt_fatos com 48,50 / R$ 97 / estreia;
--   c) na rodada seguinte do cron (04:30), `ops.fato_medicao` regista osi_oferta
--      como `nao_verificavel` — NÃO `divergente`. Se vier divergente, a `fonte` desviou
--      a classificação e é para olhar;
--   d) a 20260910_02 do MKT, SEM o bloco de mkt.fatos, aplica sem "PARE".
