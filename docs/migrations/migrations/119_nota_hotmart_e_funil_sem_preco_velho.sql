-- 119 — a nota do checkout Hotmart e o funil guardado deixam de dizer 48,50 / 97
--
-- ⚠ NÃO APLICADA. Portão 97 (OSI a R$ 49 cheio). Tabelas minhas (company.*, ops.*).
--
-- ⚠ ORDEM: aplicar só DEPOIS de o front do mesmo commit estar no ar. Duas razões, e
--    a segunda é a que desfaz esta migration se for ignorada:
--    1. A tela Marketplace lê o preço do checkout DE DENTRO desta nota. O front antigo
--       procura "R$ X lançamento"; a nota nova diz "Checkout R$ 49,00". Com a nota nova
--       e o front velho, a tela perde o número e acusa divergência para sempre.
--    2. O funil é gravado a partir do navegador: cada edição mandava o workspace
--       INTEIRO do cache local para o banco. Com o front antigo, qualquer navegador que
--       tivesse o funil guardado da semana passada (mainPrice 97, "estreia R$47,90")
--       reescreveria o banco na primeira edição. O front novo só grava depois de ler o
--       banco na sessão.
--    Conferir o `<meta name="build">` de app.digiai.app.br antes de aplicar.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- MEDIDO EM 10/09/2026 — dois lugares com o preço velho que o mapa do Geral não tinha
-- ═══════════════════════════════════════════════════════════════════════════
-- company.digital_assets ee5d96fc ("Hotmart — checkout OSI"), observacoes:
--   "Produto B105515825. R$ 97 tabela, R$ 48,50 lançamento. Webhook ativo."
--   É daí que a tela Marketplace tira o "preço Hotmart" para conferir com a fonte.
--
-- ops.funnel_workspace (key osi), JSON do workspace — todos os caminhos com preço:
--   assumptions.mainPrice ...... 97        ← premissa de ticket do modelo de receita
--   assumptions.upsellPrice .... 197       ┐
--   assumptions.bumpWhatsappPrice 27       ├ outros produtos (bump, upsell): FICAM
--   assumptions.bumpChecklistPrice 19      ┘
--   tasks.0.nextStep ........... "Criar checkout na Hotmart: OSI estreia R$47,90 (cheio R$97), bumps R$27/R$19 e upsell R$197."
--   tasks.0.checklist.0 ........ "Criar produto principal Manual OSI + App: estreia R$47,90 (turma inicial) e cheio R$97."
--   (O banco tem 47,90 — preço de antes do 48,50. O código tinha 48,50. Nenhum dos dois
--    era o preço de hoje, e só a leitura do JSON inteiro o mostrou.)
--
-- ═══════════════════════════════════════════════════════════════════════════
-- DUAS DECISÕES DE DESENHO
-- ═══════════════════════════════════════════════════════════════════════════
-- • A nota do checkout LEVA número, e é escrito à mão (49,00), não copiado de
--   academy.products. Não é fonte do preço: é o registo do que se OBSERVOU o
--   marketplace a cobrar, e só serve para ser comparado com a fonte. Copiá-lo da fonte
--   faria a conferência comparar a fonte consigo mesma e acertar sempre.
-- • mainPrice é copiado de academy.products no UPDATE (espelho por construção). A
--   premissa continua editável na tela para simular cenários, e a tela passa a avisar
--   quando ela diverge da fonte.

begin;

do $$
declare n int;
begin
  select count(*) into n from academy.products
   where slug = 'otica-sem-improviso' and deleted_at is null and price_brl = 49.00;
  if n <> 1 then
    raise exception 'academy.products (otica-sem-improviso) não está em 49.00 — a 114 tem de estar aplicada antes.';
  end if;

  select count(*) into n from company.digital_assets
   where id = 'ee5d96fc-8f19-4bbe-995f-233d28fa6477' and deleted_at is null
     and observacoes = 'Produto B105515825. R$ 97 tabela, R$ 48,50 lançamento. Webhook ativo.';
  if n <> 1 then
    raise exception 'A nota do ativo Hotmart não é a medida em 10/09 — alguém já mexeu; conferir antes.';
  end if;

  -- O índice 0 só é o checkout se o id da tarefa o confirmar: reordenar as tarefas
  -- mudaria o que "tasks.0" aponta, e o update corrigiria a tarefa errada em silêncio.
  select count(*) into n from ops.funnel_workspace
   where key = 'osi'
     and workspace #>> '{assumptions,mainPrice}' = '97'
     and workspace #>> '{tasks,0,id}' = 'checkout-kiwify'
     and workspace #>> '{tasks,0,nextStep}' = 'Criar checkout na Hotmart: OSI estreia R$47,90 (cheio R$97), bumps R$27/R$19 e upsell R$197.'
     and workspace #>> '{tasks,0,checklist,0}' = 'Criar produto principal Manual OSI + App: estreia R$47,90 (turma inicial) e cheio R$97.';
  if n <> 1 then
    raise exception 'O funil osi não está no estado medido em 10/09 (mainPrice 97, tarefa checkout-kiwify com os dois textos) — conferir antes de sobrescrever.';
  end if;
end $$;

update company.digital_assets set
  observacoes = 'Produto B105515825. Checkout R$ 49,00, compra única — observado pelo steward da OSI no checkout público em 10/09/2026. Não é fonte do preço (a fonte é academy.products); serve para conferir o marketplace contra ela. Webhook ativo.'
where id = 'ee5d96fc-8f19-4bbe-995f-233d28fa6477';

update ops.funnel_workspace set
  workspace = jsonb_set(jsonb_set(jsonb_set(workspace,
    '{assumptions,mainPrice}',
    to_jsonb((select price_brl from academy.products where slug = 'otica-sem-improviso' and deleted_at is null))),
    '{tasks,0,nextStep}',
    to_jsonb('Criar checkout na Hotmart: OSI pelo preço de academy.products, bumps R$27/R$19 e upsell R$197.'::text)),
    '{tasks,0,checklist,0}',
    to_jsonb('Criar produto principal Manual OSI + App pelo preço de academy.products (compra única).'::text))
where key = 'osi';

do $$
declare n int;
begin
  select count(*) into n from ops.funnel_workspace
   where key = 'osi' and workspace::text ~* '48[,.]50|47[,.]90|R\$\s?97|estreia|turma inicial';
  if n > 0 then
    raise exception 'O funil osi ainda tem preço velho ou estreia no JSON.';
  end if;

  select count(*) into n from ops.funnel_workspace
   where key = 'osi'
     and (workspace #>> '{assumptions,mainPrice}')::numeric = (select price_brl from academy.products where slug = 'otica-sem-improviso' and deleted_at is null);
  if n <> 1 then
    raise exception 'mainPrice do funil não ficou igual ao preço de academy.products.';
  end if;

  -- O que NÃO se queria mudar: preços de bump e upsell são de outros produtos.
  select count(*) into n from ops.funnel_workspace
   where key = 'osi'
     and workspace #>> '{assumptions,upsellPrice}' = '197'
     and workspace #>> '{assumptions,bumpWhatsappPrice}' = '27'
     and workspace #>> '{assumptions,bumpChecklistPrice}' = '19';
  if n <> 1 then
    raise exception 'Os preços de bump/upsell mudaram — não era para tocar neles.';
  end if;

  -- A nota tem de continuar LEGÍVEL para a tela: o mesmo padrão que o Marketplace usa.
  select count(*) into n from company.digital_assets
   where id = 'ee5d96fc-8f19-4bbe-995f-233d28fa6477'
     and observacoes ~* 'checkout\s*R\$\s?49([,.]00)?\M'
     and observacoes !~* '48[,.]50|R\$\s?97|lan.amento|estreia';
  if n <> 1 then
    raise exception 'A nota nova do ativo Hotmart não casa com o padrão que a tela lê, ou ainda cita o preço velho.';
  end if;

  select count(*) into n from company.digital_assets
   where id = 'ee5d96fc-8f19-4bbe-995f-233d28fa6477' and observacoes like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception 'Acento corrompido na nota do ativo Hotmart (U+FFFD).';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) Marketplace (com o front novo no ar): "Preço canônico R$ 49,00" e "Hotmart
--      (checkout observado) R$ 49,00", os dois em verde, "✓ tudo bate";
--   b) Funil: sem a faixa de divergência de preço; aba Produto mostra R$ 49,00;
--   c) CONTROLO do conserto do front: abrir o Funil e editar uma premissa QUALQUER
--      depois de a página carregar — o banco continua com mainPrice 49 e os textos
--      novos. É a prova de que o cache velho já não passa por cima;
--   d) `audit_digital` registou a mudança da nota.
