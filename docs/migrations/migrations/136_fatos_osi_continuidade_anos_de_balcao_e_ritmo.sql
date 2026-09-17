-- 136 — fatos da OSI: a oferta deixa de dizer "sem assinatura"; entram os anos de balcão e o ritmo do plano
--
-- ✔ APLICADA em 16/09/2026 às 21:08:35 BRT, com a palavra do dono neste canal ("padronizar em todos os lugares"), depois
--   de conferido o bundle da landing da OSI no ar (index-BvktgbWB.js: "30 dias" 20×, "90 dias" 0×). Reensaiada antes.
--   Medido depois: 3 fatos da OSI ativos, públicos e frescos; osi_oferta sem "sem assinatura", sem "90 dias", com 30.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE É URGENTE: desde 15/09 a OSI tem continuidade opcional por assinatura depois dos 90 dias no Nexus
--   (landing, termos e PDF já mudaram). O fato osi_oferta, que o gerador do MKT lê para citar a oferta, continua
--   dizendo "compra única, sem assinatura" — frase falsa servida como fato. Achado na revisão do lote 1 de ideias.
--
-- MEDIDO NO PRODUTO EM 16/09 (otica_sem_improviso/src):
--   LandingPage.tsx:254   "Depois dos 90 dias, o Nexus continua só por assinatura, se você quiser."
--   LandingPage.tsx:1185  "Os 90 dias de apoio no Nexus vêm incluídos; depois, a continuidade é opcional, por assinatura."
--   TermsPage.tsx:61      "…por assinatura contratada à parte pelo próprio comprador."
--   LandingPage.tsx:234   "Plano de ação de 72 horas"
--   LandingPage.tsx:253   "Não promete resultado em prazo: 3 dias é o ritmo do plano."
--   academy.products (otica-sem-improviso) price_brl = 49.00
--   Rótulo da landing no ar (bundle index-cWzqSTF3.js, medido 16/09 ~21h): "Depois dos 90 dias, o Nexus continua
--     por R$ 19,90/mês, só se você quiser." — e o plano do Mercado Pago é mensal (conferido pelo Geral em 15/09).
--     Logo "assinatura mensal" é sustentado. O PREÇO da continuidade (19,90) NÃO entra: é preço do Nexus, não da
--     compra do OSI; se o MKT precisar citá-lo, vira fato próprio (osi_continuidade) com palavra do dono.
--
-- ⚠ DECISÃO DO DONO DEPOIS DA MEDIÇÃO (16/09 ~21:30, canal do Orquestrador Geral, textual): "OSI no nexus 30 dias".
--   O apoio incluído passa de 90 para 30 dias. O fato já nasce com 30. A landing publicada AINDA diz 90 até a OSI
--   republicar — por isso esta migration só se aplica DEPOIS de conferido o bundle novo da landing dizendo 30:
--   fato que contradiz a página de venda no ar é tão falso quanto o "sem assinatura" que ela conserta.
--   E mkt.content_rules da OSI tem a etapa "entregar (90 dias de apoio)" — é do MKT atualizar.
--
-- O QUE MUDA:
--   • osi_oferta: texto reescrito; valor_numerico continua 49.00 e o preço continua NA FRASE. O hard_never da OSI
--     manda que preço só venha deste fato — tirar o preço daqui impediria o gerador de dizer preço em qualquer peça.
--     verificado_em → 16/09, fonte atualizada; validade 60 dias como antes.
--   • osi_taty_anos_balcao (25), declarado pelo dono em 10/09 e 16/09/2026.
--   • osi_aplicacao (3), o ritmo do plano — não promessa de resultado. Os "15 minutos" da página de obrigado
--     ficam fora: não são cânone do produto.
--   Textos redigidos pelo Orquestrador Geral em 16/09, com duas mudanças minhas medidas no produto: preço mantido
--   na frase (o Geral retirou a objeção) e "assinatura mensal" só depois de medido no rótulo publicado.
--
-- EFEITO NO FRONT: card "Fatos publicáveis" do Marketing: OSI passa de 1 para 3 fatos. Gerador do MKT: para de
--   poder citar "sem assinatura" e "90 dias"; ganha os 25 anos e o ritmo de 3 dias como números permitidos.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from mkt.fatos
                  where chave = 'osi_oferta' and ativo and publico and brand_slug = 'osi'
                    and valor_numerico = 49.00 and verificado_em = date '2026-09-10'
                    and md5(fato) = 'd1090ce4bc220ed7277d404127aac0b2') then
    raise exception 'osi_oferta nao esta como medido em 16/09 (texto da 121, 49.00, verificado 10/09) — conferir antes.';
  end if;

  if (select price_brl from academy.products where slug = 'otica-sem-improviso') <> 49.00 then
    raise exception 'academy.products mudou de preco — o fato tem de repetir o preco novo, nao 49.';
  end if;

  if exists (select 1 from mkt.fatos where chave in ('osi_taty_anos_balcao','osi_aplicacao')) then
    raise exception 'fato novo ja existe — a 136 ja foi aplicada?';
  end if;
end $$;

-- ── a oferta, verdadeira de novo ──────────────────────────────────────────────
update mkt.fatos
   set fato = 'O Ótica Sem Improviso é o manual visual de atendimento e conversão para óticas, por R$ 49 em compra única na Hotmart (também na Kiwify): manual em PDF para imprimir, app leitor no celular, plano de ação de 72 horas e 30 dias de apoio no Nexus incluídos, com garantia de 7 dias. Depois dos 30 dias, a continuidade no Nexus é opcional, por assinatura mensal (medido em 16/09/2026).',
       fonte = 'Preço: academy.products (slug otica-sem-improviso), price_brl 49.00 conferido na 136. Pacote, 72 horas e continuidade por assinatura mensal: landing e termos da OSI publicados (LandingPage.tsx:234/254/1185, TermsPage.tsx:61; rótulo "R$ 19,90/mês" no bundle index-cWzqSTF3.js), medidos em 16/09/2026. 30 dias de apoio incluídos: decisão do dono em 16/09/2026 ("OSI no nexus 30 dias"), aplicada depois de a landing republicar com 30. Mudou o preço ou o pacote lá, muda aqui.',
       verificado_em = date '2026-09-16',
       validade_dias = 60,
       updated_at = now()
 where chave = 'osi_oferta';

insert into mkt.fatos (brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico, ativo)
values
  ('osi', 'osi_taty_anos_balcao',
   'Tatiana Camargo, autora do Ótica Sem Improviso, tem 25 anos de balcão em ótica (declarado pelo dono em 10/09 e 16/09/2026).',
   25, 'Declaração do dono em 10/09 e 16/09/2026; mkt.content_rules da OSI corrigido de 20 para 25 em 16/09 (20260916_05 do MKT).',
   date '2026-09-16', 60, true, true),
  ('osi', 'osi_aplicacao',
   'O plano do Ótica Sem Improviso é feito para aplicar em 3 dias, no ritmo de quem está no balcão — é o ritmo do plano, não promessa de resultado.',
   3, 'Landing da OSI publicada: "Não promete resultado em prazo: 3 dias é o ritmo do plano" (LandingPage.tsx:253), medido em 16/09/2026.',
   date '2026-09-16', 60, true, true);

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
declare
  v_preco numeric := (select price_brl from academy.products where slug = 'otica-sem-improviso');
begin
  if exists (select 1 from mkt.fatos where ativo and fato ~* 'sem assinatura') then
    raise exception 'ainda ha fato ativo dizendo "sem assinatura".';
  end if;

  -- decisão do dono de 16/09: 30 dias de apoio, não 90
  if not exists (select 1 from mkt.fatos where chave = 'osi_oferta' and fato like '%30 dias de apoio no Nexus%')
  or exists (select 1 from mkt.fatos where chave = 'osi_oferta' and fato ~ '90 dias') then
    raise exception 'osi_oferta nao esta com os 30 dias decididos pelo dono em 16/09 (ou ainda cita 90).';
  end if;

  -- o preço da continuidade é do Nexus, não da compra: não entra no fato da oferta
  if exists (select 1 from mkt.fatos where chave = 'osi_oferta' and fato ~ '19,90') then
    raise exception 'osi_oferta cita o preco da continuidade (19,90) — isso e fato proprio, com palavra do dono.';
  end if;

  if not exists (select 1 from mkt.fatos
                  where chave = 'osi_oferta' and valor_numerico = v_preco
                    and fato like '%R$ ' || trim(to_char(v_preco, 'FM999990')) || ' %') then
    raise exception 'osi_oferta perdeu o preco na frase ou diverge de academy.products.';
  end if;

  if (select count(*) from mkt.fatos
       where brand_slug = 'osi' and ativo and publico
         and (now() at time zone 'America/Sao_Paulo')::date <= verificado_em + validade_dias) <> 3 then
    raise exception 'esperava 3 fatos da OSI ativos, publicos e frescos.';
  end if;

  if exists (select 1 from mkt.fatos where chave in ('osi_taty_anos_balcao','osi_aplicacao') and fato ~* '(r\$|\mreais\M|15 ?min)') then
    raise exception 'fato novo com preco ou com os 15 minutos.';
  end if;

  if exists (select 1 from mkt.fatos where ativo and (fato like '%' || chr(65533) || '%' or fonte like '%' || chr(65533) || '%'))
  or not exists (select 1 from mkt.fatos where chave = 'osi_oferta' and fato like '%Ótica Sem Improviso%' and fato like '%conversão para óticas%')
  or not exists (select 1 from mkt.fatos where chave = 'osi_taty_anos_balcao' and fato like '%anos de balcão%') then
    raise exception 'acentuacao quebrada no texto do fato.';
  end if;
end $$;

commit;
