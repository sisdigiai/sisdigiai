-- 131 — a venda da Hotmart volta a entrar: data em milissegundos, origem do link e compra-teste à parte
--
-- ✔ APLICADA em 15/09/2026 às 14:28:59 BRT (17:28:59 UTC), por mim, com a palavra do dono neste canal
--   ("fazer todos"). Travas e reprocesso passaram. Reconferido:
--   hotmart_sales_teste com HP0118808393, 15:52:01 UTC, whatsapp/prospeccao, teste.compra_teste.v1,
--   utm_content 722057eb…, 4900 centavos, approved, produto 7611033; hotmart_sales 0; revenue osi 0;
--   gate falso; 0 purchase_approved; linha crua processada sem erro; hotmart_sales_teste sem SELECT
--   para anon/authenticated.
--
-- (Escrita como NÃO APLICADA.) Pede a palavra do dono. Achado da compra-teste da OSI (dono, 15/09/2026 12:52 BRT,
--    transação HP0118808393), relatado pelo Orquestrador Geral e medido por mim no banco.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE A COMPRA-TESTE PROVOU (payload real, marketing.hotmart_events_raw b5d7475d…)
-- ═══════════════════════════════════════════════════════════════════════════
--   1. DATAS: purchase.approved_date = 1789487521000 e order_date = 1789487519000 são epoch em
--      MILISSEGUNDOS. `('1789487521000')::timestamptz` estoura → o EXCEPTION marca a linha crua
--      processed=true com o erro, e hotmart_sales fica 0. Toda venda real pela Hotmart teria morrido
--      aqui, em silêncio para quem só olha hotmart_sales. (A Kiwify manda ISO: não é afetada.)
--   2. ORIGEM DO LINK: vem em purchase.origin = {src, sck}; purchase.tracking veio NULL. src = lead_id
--      (722057eb…), sck = variante do A/B (teste.compra_teste.v1). A função lia só tracking.*.
--   3. AFILIADOS: a chave do payload é `affiliates` (com affiliate_code/name); a função lia
--      `affiliations` → affiliate_code sempre nulo, e o total por afiliado nunca contaria.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- E O RISCO QUE O REPROCESSO CRIARIA SEM ESTA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
-- Reprocessar a compra-teste para marketing.hotmart_sales dispararia trg_revenue_rollup →
-- fn_revenue_rebuild → finance.revenue 'osi' R$ 49 → fn_gate_evidencia.receita > 0 → "Gate da Fase 2:
-- sustentado pelo dado" na ordem do dia; e 7 views leem a tabela direto (v_vendas_canais "ativo",
-- v_marketing_hotmart_stats, v_ops_scorecard_auto, cadeia, community, post_sales, validation_ranking),
-- mais o evento purchase_approved no funil. Uma compra do dono a si mesmo viraria a 1ª venda.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MUDA
-- ═══════════════════════════════════════════════════════════════════════════
--   • marketing.fn_hotmart_momento(text): epoch ms (≥12 dígitos) | epoch s (9–11) | ISO | vazio→nulo.
--   • marketing.hotmart_sales_teste: mesma forma de hotmart_sales, sem nenhum leitor. Compra-teste
--     vai para lá — prova o encanamento inteiro sem entrar em receita, gate, views ou funil.
--     Regra de teste = sck/utm_campaign começando com 'teste.' (a convenção que a landing e o MKT já
--     usam: teste.site.v0, teste.compra_teste.v1).
--   • tg_block_test_sales: a regra acima desvia a linha para hotmart_sales_teste (a de hoje, por
--     e-mail/transação de teste, continua a só ignorar).
--   • marketing_ingest_hotmart_event:
--       purchase_date = momento(approved_date) ?? momento(order_date) ?? received_at;
--       utm_content  = origin.src ?? origin.xcod ?? tracking.content;
--       utm_campaign = origin.sck ?? tracking.campaign;
--       utm_source/medium = 'whatsapp'/'prospeccao' quando origin.src existe, senão tracking.*;
--       affiliates ?? affiliations; metadata.origin cru e metadata.teste;
--       purchase_approved no funil só para venda que não é teste.
--   • No fim, REPROCESSA a linha crua da compra-teste (b5d7475d…): hotmart_sales_teste 0 → 1,
--     hotmart_sales continua 0, revenue e gate sem mudança.
-- EFEITO NO FRONT: nenhum número muda (Marketplace "Compras OSI (reais)" continua 0 — é o certo).

begin;

do $$
declare n int;
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.marketing_ingest_hotmart_event(uuid)'::regprocedure) <> '6aae30fa1d782728cdc401b229a080f4'
  or (select md5(prosrc) from pg_proc where oid = 'marketing.tg_block_test_sales'::regproc) <> '00b3f182f985efad56552ac7fbefea63' then
    raise exception 'marketing_ingest_hotmart_event ou tg_block_test_sales mudou desde 15/09 — conferir antes.';
  end if;
  if to_regclass('marketing.hotmart_sales_teste') is not null then
    raise exception 'marketing.hotmart_sales_teste já existe — a 131 já foi aplicada?';
  end if;
  select count(*) into n from marketing.hotmart_sales;
  if n <> 0 then raise exception 'marketing.hotmart_sales tem % linha(s); medida vazia.', n; end if;
  select count(*) into n from marketing.hotmart_events_raw
   where id = 'b5d7475d-e5c2-4028-81a8-1a1c2d7a6052' and process_error like 'date/time field value out of range%';
  if n <> 1 then raise exception 'A linha crua da compra-teste não está no estado medido (erro de data).'; end if;
end $$;

create function marketing.fn_hotmart_momento(p text)
returns timestamptz
language sql
stable
as $$
  select case
    when p is null or btrim(p) = '' then null
    when btrim(p) ~ '^\d{12,}$' then to_timestamp(btrim(p)::bigint / 1000.0)
    when btrim(p) ~ '^\d{9,11}$' then to_timestamp(btrim(p)::bigint)
    else btrim(p)::timestamptz
  end
$$;
comment on function marketing.fn_hotmart_momento(text) is 'Data da Hotmart: epoch em ms (payload real de 15/09/2026), epoch em s ou ISO. Migration 131.';

create table marketing.hotmart_sales_teste (like marketing.hotmart_sales including defaults);
alter table marketing.hotmart_sales_teste add primary key (id);
alter table marketing.hotmart_sales_teste add constraint hotmart_sales_teste_transaction_key unique (hotmart_transaction);
alter table marketing.hotmart_sales_teste enable row level security;
revoke all on marketing.hotmart_sales_teste from public, anon, authenticated;
comment on table marketing.hotmart_sales_teste is
  'Compras-teste (sck/utm_campaign "teste.*"): mesma forma de hotmart_sales, SEM leitor — não entram em receita, gate, views nem funil. Migration 131.';

CREATE OR REPLACE FUNCTION marketing.tg_block_test_sales()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (coalesce(new.hotmart_transaction, '') ~* '^(HP-FAKE|TEST-|FAKE-)')
     or (coalesce(lower(new.buyer_email), '') ~ '(@exemplo\.|@example\.|@invalid|@test\.|^teste@|^test@)')
  then
    raise notice '[guard] venda de teste ignorada: tx=% email=%',
      new.hotmart_transaction, new.buyer_email;
    return null;  -- não grava
  end if;

  -- Compra-teste de verdade (paga, pelo link marcado "teste."): grava à parte, para provar o
  -- encanamento sem virar receita, gate nem venda em view nenhuma (131).
  -- ⚠ "teste" é PALAVRA RESERVADA no início do sck/utm_campaign. Hoje não colide: a variante do MKT é
  -- '<oferta>.<template>.<versao>' e mkt.mensagens.oferta só aceita osi|clearix (CHECK). Oferta ou
  -- campanha nova nunca pode começar por "teste." — seria desviada e nunca contaria como venda.
  -- Portas: utm_campaign ~* '^teste\.' OU metadata.teste = true (que o ingest deriva da mesma regra).
  if coalesce(new.utm_campaign, '') ~* '^teste\.' or coalesce(new.metadata->>'teste', '') = 'true' then
    insert into marketing.hotmart_sales_teste select new.*
    on conflict (hotmart_transaction) do update set
      status = excluded.status, updated_at = now(), metadata = excluded.metadata;
    return null;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.marketing_ingest_hotmart_event(p_raw_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'marketing'
AS $function$
DECLARE
  v_raw           record;
  v_payload       jsonb;
  v_data          jsonb;
  v_buyer         jsonb;
  v_product       jsonb;
  v_purchase      jsonb;
  v_affiliations  jsonb;
  v_commissions   jsonb;
  v_tracking      jsonb;
  v_origin        jsonb;
  v_sale_id       uuid;
  v_transaction   text;
  v_status        text;
  v_value_cents   int;
  v_utm_source    text;
  v_utm_medium    text;
  v_utm_campaign  text;
  v_utm_content   text;
  v_teste         boolean;
BEGIN
  SELECT * INTO v_raw FROM marketing.hotmart_events_raw WHERE id = p_raw_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'raw_not_found');
  END IF;

  v_payload := v_raw.payload;
  v_data    := COALESCE(v_payload->'data', v_payload);
  v_buyer       := v_data->'buyer';
  v_product     := v_data->'product';
  v_purchase    := v_data->'purchase';
  -- o payload real (15/09/2026) chama `affiliates`; `affiliations` fica por compatibilidade
  v_affiliations := COALESCE(v_data->'affiliates', v_data->'affiliations');
  v_commissions := v_data->'commissions';
  v_tracking    := v_purchase->'tracking';
  -- origem do link (src = lead_id, sck = variante): é aqui que a Hotmart devolve o que a landing propagou
  v_origin      := v_purchase->'origin';

  v_utm_content  := COALESCE(v_origin->>'src', v_origin->>'xcod', v_tracking->>'content');
  v_utm_campaign := COALESCE(v_origin->>'sck', v_tracking->>'campaign');
  v_utm_source   := CASE WHEN v_origin->>'src' IS NOT NULL THEN 'whatsapp' ELSE v_tracking->>'source' END;
  v_utm_medium   := CASE WHEN v_origin->>'src' IS NOT NULL THEN 'prospeccao' ELSE v_tracking->>'medium' END;
  v_teste        := COALESCE(v_utm_campaign, '') ~* '^teste\.';

  v_transaction := COALESCE(v_purchase->>'transaction', v_data->>'transaction');
  IF v_transaction IS NULL THEN
    UPDATE marketing.hotmart_events_raw SET
      processed = true, process_error = 'no_transaction_id', processed_at = now()
    WHERE id = p_raw_id;
    RETURN jsonb_build_object('error', 'no_transaction_id');
  END IF;

  v_status := lower(COALESCE(v_purchase->>'status', v_raw.event_type, 'unknown'));
  v_status := CASE
    WHEN v_status IN ('approved', 'purchase_approved') THEN 'approved'
    WHEN v_status IN ('complete', 'completed', 'purchase_complete') THEN 'complete'
    WHEN v_status IN ('canceled', 'cancelled', 'purchase_canceled') THEN 'cancelled'
    WHEN v_status IN ('refunded', 'purchase_refunded') THEN 'refunded'
    WHEN v_status IN ('chargeback', 'purchase_chargeback') THEN 'chargeback'
    WHEN v_status IN ('billet_printed') THEN 'pending'
    ELSE v_status
  END;

  v_value_cents := COALESCE(
    ((v_purchase->'price'->>'value')::numeric * 100)::int,
    ((v_data->'price'->>'value')::numeric * 100)::int,
    NULL
  );

  INSERT INTO marketing.hotmart_sales (
    platform, hotmart_transaction, product_id, product_name, status,
    buyer_name, buyer_email, buyer_phone, buyer_doc,
    price_value_cents, price_currency,
    commission_cents, affiliate_code, affiliate_name,
    payment_type, installments, purchase_date,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    raw_event_id, metadata
  ) VALUES (
    'hotmart',
    v_transaction,
    COALESCE(v_product->>'id', v_raw.product_id, 'unknown'),
    v_product->>'name',
    v_status,
    v_buyer->>'name',
    lower(v_buyer->>'email'),
    v_buyer->>'phone',
    v_buyer->>'document',
    v_value_cents,
    COALESCE(v_purchase->'price'->>'currency_value', v_data->'price'->>'currency_value', 'BRL'),
    COALESCE(((v_commissions->0->>'value')::numeric * 100)::int, NULL),
    COALESCE(v_affiliations->0->>'affiliate_code', v_affiliations->0->>'code'),
    v_affiliations->0->>'name',
    v_purchase->'payment'->>'type',
    (v_purchase->'payment'->>'installments_number')::int,
    COALESCE(
      marketing.fn_hotmart_momento(v_purchase->>'approved_date'),
      marketing.fn_hotmart_momento(v_purchase->>'order_date'),
      v_raw.received_at
    ),
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_utm_content,
    v_tracking->>'term',
    p_raw_id,
    jsonb_build_object('parsed_at', now(), 'origin', v_origin, 'teste', v_teste)
  )
  ON CONFLICT (hotmart_transaction) DO UPDATE SET
    status            = EXCLUDED.status,
    commission_cents  = COALESCE(EXCLUDED.commission_cents, marketing.hotmart_sales.commission_cents),
    updated_at        = now()
  RETURNING id INTO v_sale_id;

  -- compra-teste é desviada pelo gatilho para hotmart_sales_teste: aqui não há venda a atribuir
  IF v_sale_id IS NOT NULL THEN
    PERFORM public.marketing_attribute_hotmart_sale(v_sale_id);
  END IF;

  IF v_status IN ('approved', 'complete') AND NOT v_teste THEN
    PERFORM public.marketing_log_purchase_event(
      v_transaction, 'hotmart', v_value_cents,
      v_utm_source, v_utm_medium,
      v_utm_campaign, v_utm_content, v_tracking->>'term'
    );
  END IF;

  UPDATE marketing.hotmart_events_raw SET
    processed = true, processed_at = now(), process_error = NULL
  WHERE id = p_raw_id;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'transaction', v_transaction, 'status', v_status, 'teste', v_teste);

EXCEPTION WHEN OTHERS THEN
  UPDATE marketing.hotmart_events_raw SET
    processed = true, process_error = SQLERRM, processed_at = now()
  WHERE id = p_raw_id;
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PÓS + REPROCESSO DA COMPRA-TESTE
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare r jsonb; n int; rec record; v_rev_antes int; v_gate boolean;
begin
  if marketing.fn_hotmart_momento('1789487521000') <> timestamptz '2026-09-15 15:52:01+00'
  or marketing.fn_hotmart_momento('1789487521') <> timestamptz '2026-09-15 15:52:01+00'
  or marketing.fn_hotmart_momento('2026-09-15T12:52:01-03:00') <> timestamptz '2026-09-15 15:52:01+00'
  or marketing.fn_hotmart_momento('') is not null or marketing.fn_hotmart_momento(null) is not null then
    raise exception 'fn_hotmart_momento não converte os três formatos.';
  end if;

  if has_table_privilege('anon', 'marketing.hotmart_sales_teste', 'select')
  or has_table_privilege('authenticated', 'marketing.hotmart_sales_teste', 'select') then
    raise exception 'hotmart_sales_teste legível por anon/authenticated.';
  end if;

  select count(*) into v_rev_antes from finance.revenue;

  r := public.marketing_ingest_hotmart_event('b5d7475d-e5c2-4028-81a8-1a1c2d7a6052');
  if r ? 'error' then raise exception 'Reprocesso falhou: %', r->>'error'; end if;

  select * into rec from marketing.hotmart_sales_teste where hotmart_transaction = 'HP0118808393';
  if not found then raise exception 'A compra-teste não chegou a hotmart_sales_teste: %', r; end if;
  if rec.purchase_date <> timestamptz '2026-09-15 15:52:01+00'
  or rec.utm_content is distinct from '722057eb-eb48-4b58-8711-13e11ff17c90'
  or rec.utm_campaign is distinct from 'teste.compra_teste.v1'
  or rec.utm_source is distinct from 'whatsapp' or rec.utm_medium is distinct from 'prospeccao'
  or rec.status <> 'approved' or rec.price_value_cents <> 4900 or rec.product_id <> '7611033' then
    raise exception 'Compra-teste gravada com campos errados: data=% content=% campaign=% status=% cents=%',
      rec.purchase_date, rec.utm_content, rec.utm_campaign, rec.status, rec.price_value_cents;
  end if;

  select count(*) into n from marketing.hotmart_sales;
  if n <> 0 then raise exception 'A compra-teste entrou em hotmart_sales (% linha).', n; end if;
  select count(*) into n from finance.revenue;
  if n <> v_rev_antes then raise exception 'finance.revenue mudou com a compra-teste.'; end if;
  select gate_cumprido into v_gate from public.fn_gate_evidencia();
  if v_gate then raise exception 'O gate virou com a compra-teste.'; end if;
  select count(*) into n from analytics.events_log where event_code = 'purchase_approved' and metadata->>'transaction' = 'HP0118808393';
  if n <> 0 then raise exception 'A compra-teste foi logada como purchase_approved no funil.'; end if;
  select count(*) into n from marketing.hotmart_events_raw where id = 'b5d7475d-e5c2-4028-81a8-1a1c2d7a6052' and processed and process_error is null;
  if n <> 1 then raise exception 'A linha crua não ficou processada sem erro.'; end if;
end $$;

commit;

-- PROVAS (depois de aplicar)
--   a) hotmart_sales_teste: 1 linha HP0118808393, 15:52:01 UTC, whatsapp/prospeccao, utm_content
--      722057eb…, utm_campaign teste.compra_teste.v1, R$ 49,00, approved;
--   b) hotmart_sales 0; finance.revenue sem linha osi; gate "NAO sustentado"; 0 purchase_approved;
--   c) próxima venda REAL (sck sem "teste.") entra em hotmart_sales com data certa e origem do link.
--   ⚠ Kiwify: datas ISO (não afetada); origem do link na Kiwify fica para o payload real dela.
