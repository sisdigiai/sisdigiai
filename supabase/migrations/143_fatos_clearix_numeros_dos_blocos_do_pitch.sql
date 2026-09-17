-- 143 — fatos do Clearix para os números que os blocos do pitch citam
--
-- ⛔ NÃO APLICADA. Curadoria do app → revisão do Orquestrador Geral (aprovada como escrita, 16/09) → palavra do dono neste canal.
--
-- DE ONDE VEM: consolidado da anamnese no palco real (Cockpit/comercial/consolidado-anamnese-palco-real-2026-09-17.md, v1.2)
--   cita números que não existiam em mkt.fatos; pela régua da 142, bloco só cita número de fato vivo. Pedido do Geral, 17/09:
--   "o que não tiver linha na folha/INV com data não entra".
--
-- CONFERIDO LINHA A LINHA EM 17/09 (folha = Cockpit/comercial/verdade-landing-vs-app-2026-09-14.md; INV =
--   Cockpit/comercial/inventario-clearix-em-uso-na-mello-2026-09-14.md; folha de mesa = folha-de-mesa-clearix-2026-09-14.md):
--   5.569 lentes + 274 de contato ... folha §1 (l.26) · INV l.31 e §10d (l.287), com a query · 14/09
--   319 acordos de laboratório ...... folha §1 (l.26) · INV §10d (l.287) · 14/09
--   2.243 produtos · 3.212 movim. ... folha l.61 (INV §9) · INV l.32 e §9d (l.272) · 14/09
--   2.227 etiquetas ................. folha l.30 e l.61 · INV §9d (l.272: jul 1.897 · ago 233 · set 97) · 14/09
--   1.206 linhas de comissão ........ folha §1 (l.26) e l.47 · folha de mesa l.18 · a folha diz "17/09", mas é carimbo UTC de
--                                      16/09 à noite (relógio conferido em 16/09 22:16 BRT); o fato usa 16/09 — data futura
--                                      em verificado_em seria "fresco" por um dia a mais e mentiria a data
--   1.562 links do portal ........... folha l.30 e l.51 · INV l.193 (abr→set por mês) · 14/09
--   FORA: "4.564 conversas" — não aparece na folha nem no INV.
--
-- "CARGA DE AGENTE NÃO É USO" (regra de 16/09): o texto de cada fato diz o que o número É, sem vender como uso o que é
--   cadastro. Lentes, acordos e produtos são CATÁLOGO/CADASTRO (podem ter entrado por importação) — o texto diz "no catálogo"
--   e "cadastrados", não "vendidos" nem "em uso". Etiquetas: 1.897 das 2.227 são de julho; o texto traz a quebra por mês para
--   não esconder o pico. Movimentações: o INV dá 250–345/mês desde abril e o total de fevereiro a setembro; o texto diz o
--   período. Se o Geral julgar que julho/fevereiro–março são carga, o fato cai para o número de uso na revisão.
--
-- TODOS: marca digiai (quem fala do Clearix é a DIGIAI), público, validade 30 dias, data da medição no texto, sem preço.

begin;

do $$
begin
  if exists (select 1 from mkt.fatos where chave in (
       'clearix_catalogo_lentes','clearix_catalogo_lentes_contato','clearix_acordos_laboratorio','clearix_estoque_produtos',
       'clearix_estoque_movimentacoes','clearix_etiquetas_2026','clearix_comissao_2026','clearix_portal_links')) then
    raise exception 'fato novo ja existe — a 143 ja foi aplicada?';
  end if;
end $$;

insert into mkt.fatos (brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico, ativo)
values
  ('digiai', 'clearix_catalogo_lentes',
   'No catálogo da rede da casa, 5.569 lentes oftálmicas ativas, de 10 fornecedores e 15 marcas (medido em 14/09/2026).',
   5569, 'folha única §1 · INV §10d (catalog_lenses.lenses ativas do tenant)', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_catalogo_lentes_contato',
   'No catálogo da rede da casa, 274 lentes de contato ativas (medido em 14/09/2026).',
   274, 'folha única §1 · INV §10d', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_acordos_laboratorio',
   '319 acordos de laboratório cadastrados no catálogo de lentes da rede da casa (medido em 14/09/2026).',
   319, 'folha única §1 · INV §10d', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_estoque_produtos',
   '2.243 armações e acessórios cadastrados no estoque da rede da casa (medido em 14/09/2026).',
   2243, 'folha única (Estoque) · INV §9 (inventory.products_v3 do tenant)', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_estoque_movimentacoes',
   '3.212 movimentações de estoque de fevereiro a setembro de 2026, entre 250 e 345 por mês desde abril (medido em 14/09/2026).',
   3212, 'folha única (Estoque) · INV §9d', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_etiquetas_2026',
   '2.227 etiquetas com código de barras impressas em 2026: 1.897 em julho, 233 em agosto e 97 em setembro (medido em 14/09/2026).',
   2227, 'folha única · INV §9d', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_comissao_2026',
   '1.206 linhas de comissão calculadas sobre OS entregues em 2026, para 9 vendedores (medido em 16/09/2026).',
   1206, 'folha única §1 (errata de 16/09 à noite, carimbada "17/09" em UTC: sem a carga retroativa de abril) · folha de mesa', date '2026-09-16', 30, true, true),

  ('digiai', 'clearix_portal_links',
   '1.562 links do portal do paciente emitidos de abril a setembro de 2026 (medido em 14/09/2026).',
   1562, 'folha única · INV §5d (iam.patient_access_tokens do tenant)', date '2026-09-14', 30, true, true);

do $$
begin
  if (select count(*) from public.v_mkt_fatos
       where chave in ('clearix_catalogo_lentes','clearix_catalogo_lentes_contato','clearix_acordos_laboratorio','clearix_estoque_produtos',
                       'clearix_estoque_movimentacoes','clearix_etiquetas_2026','clearix_comissao_2026','clearix_portal_links')
         and fresco and publico and brand_slug = 'digiai') <> 8 then
    raise exception 'os 8 fatos novos nao estao todos frescos, publicos e na marca digiai.';
  end if;
  if exists (select 1 from mkt.fatos where ativo and chave in ('clearix_catalogo_lentes','clearix_catalogo_lentes_contato','clearix_acordos_laboratorio','clearix_estoque_produtos',
                                                           'clearix_estoque_movimentacoes','clearix_etiquetas_2026','clearix_comissao_2026','clearix_portal_links')
               and (fato ~* '(r\$|[0-9]\s*reais\M|[0-9]+,[0-9]{2}\M)' or fato ~* '\m(1[67]|20) (aplicativos|apps)\M' or fato ~* '4\.564')) then
    raise exception 'fato do Clearix com preco, contagem de apps ou numero sem fonte.';
  end if;
  if exists (select 1 from mkt.fatos where ativo and fato like '%' || chr(65533) || '%')
  or not exists (select 1 from mkt.fatos where chave = 'clearix_catalogo_lentes' and fato like '%catálogo%oftálmicas%') then
    raise exception 'acentuacao quebrada.';
  end if;
end $$;

commit;
