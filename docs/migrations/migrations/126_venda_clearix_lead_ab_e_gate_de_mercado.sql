-- 126 — venda do Clearix ligada ao lead e ao A/B; o gate da fase 2 conta só venda de mercado
--
-- ⚠ NÃO APLICADA. Pede a palavra do dono no canal do orquestrador do app digiai.
--    SUBSTITUI a 122 (que fica "não aplicar"): traz tudo o que ela trazia (receita de parte
--    relacionada separada) e fecha o buraco que ela deixava (assinantes).
--    Despacho: Cockpit/comercial/_DESPACHO_2026-09-15_RECEBER_INTERESSADOS.md §3.4.
--    Desenho: docs/desenho-venda-clearix-2026-09-14.md.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- DECISÕES QUE ESTA MIGRATION ASSUME (propostas do desenho §6 — o dono pode trocar antes)
-- ═══════════════════════════════════════════════════════════════════════════
--   1. venda = primeiro pagamento PAGO (billing.payments com paid_at, status 'approved');
--   2. atribuição do A/B = primeira SAÍDA com oferta para o NÚMERO do lead (ou o lead_id),
--      status enviada/entregue/lida, enviado_em ANTES do pagamento (contrato do MKT 20260914_03);
--   3. canal_origem: whatsapp | landing | indicacao | organico | outro (o despacho usa 'whatsapp';
--      não separo Z-API de manual — o canal da mensagem já guarda isso em mkt.mensagens.canal);
--   4. pagamento fora do Mercado Pago conta (mp_payment_id nulo, comprovante em raw);
--   5. parte relacionada (Lancaster) entra como assinante marcado, e nunca sustenta o gate.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- MEDIDO EM 15/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
--   billing.subscribers 0 · billing.payments 1 (evento de TESTE do MP de 12/07: live_mode false,
--   sem assinante, sem paid_at — não conta como venda por nenhuma regra abaixo)
--   finance.revenue 0 · mkt.mensagens já tem oferta/variante (gerada)/origem · fn_wa_variantes_fone
--   existe (dono postgres) · fn_gate_evidencia hoje: clientes por REGEX de nome de empresa,
--   receita = revenue inteira, assinantes = count(*) de billing.subscribers (inclui apagado,
--   cancelado, outro produto, parte relacionada).
--   ⚠ billing.* tem policy "leitura_logado" SELECT true: qualquer usuário logado lê assinante,
--   inclusive doc (CPF/CNPJ). Não mexo aqui (outro portão); a view nova não expõe doc/e-mail/fone.
--
-- EFEITO NO FRONT HOJE: nenhum número muda (0 venda, 0 receita). Placar e ordem do dia continuam
-- "Gate NAO sustentado". A tela Comercial ganha "Registrar venda" (commit do mesmo pacote).

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PRÉ
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.fn_revenue_rebuild(date)'::regprocedure) <> '88dd19e747e10bc117300f39005beb06'
  or (select md5(prosrc) from pg_proc where oid = 'public.fn_gate_evidencia(integer)'::regprocedure) <> 'a6e8a53212d7a609bd145255fb3586b0'
  or md5(pg_get_viewdef('public.v_ops_placar_hoje'::regclass)) <> 'cd71eedd5c24ff51a855096ebc53e76c'
  or md5(pg_get_viewdef('public.v_finance_revenue'::regclass)) <> '7fbe59504325569bd5d0aefe441dbd66' then
    raise exception 'fn_revenue_rebuild, fn_gate_evidencia, v_ops_placar_hoje ou v_finance_revenue mudou desde 14/09 — esta migration substituiria a versão nova pela cópia da velha.';
  end if;

  select count(*) into n from information_schema.columns
   where table_schema = 'finance' and table_name = 'revenue' and column_name = 'parte_relacionada';
  if n > 0 then raise exception 'finance.revenue.parte_relacionada já existe — a 122 foi aplicada? Esta migration a substitui; conferir antes.'; end if;

  select count(*) into n from finance.revenue;
  if n <> 0 then raise exception 'finance.revenue tem % linha(s); medida vazia.', n; end if;

  select count(*) into n from billing.subscribers;
  if n <> 0 then raise exception 'billing.subscribers tem % linha(s); medida vazia — rever a trava de duplicidade antes.', n; end if;

  select count(*) into n from billing.payments where paid_at is not null;
  if n <> 0 then raise exception 'billing.payments tem % pagamento(s) pago(s); medido 0.', n; end if;

  select count(*) into n from information_schema.columns
   where table_schema = 'mkt' and table_name = 'mensagens' and column_name in ('oferta', 'variante', 'origem', 'fone', 'direcao', 'status', 'enviado_em', 'lead_id');
  if n <> 8 then raise exception 'mkt.mensagens sem as colunas do contrato 20260914_03 (achei % de 8).', n; end if;

  if to_regprocedure('mkt.fn_wa_variantes_fone(text)') is null then
    raise exception 'mkt.fn_wa_variantes_fone(text) não existe.';
  end if;

  select count(*) into n from pg_constraint
   where conrelid = 'finance.aportes'::regclass and conname = 'aportes_natureza_check'
     and pg_get_constraintdef(oid) = 'CHECK ((natureza = ANY (ARRAY[''investimento''::text, ''emprestimo''::text, ''devolucao''::text])))';
  if n <> 1 then raise exception 'aportes_natureza_check não é o medido.'; end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · RECEITA DE PARTE RELACIONADA (o que a 122 trazia)
-- ═══════════════════════════════════════════════════════════════════════════
alter table finance.revenue add column parte_relacionada boolean not null default false;
comment on column finance.revenue.parte_relacionada is
  'Receita de empresa do mesmo dono (cliente-zero). Conta como receita; NAO sustenta gate de mercado. Migration 126.';
alter table finance.revenue drop constraint revenue_product_id_month_key;
alter table finance.revenue add constraint revenue_product_month_parte_key unique (product_id, month, parte_relacionada);

CREATE OR REPLACE FUNCTION public.fn_revenue_rebuild(p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'marketing', 'finance'
AS $function$
DECLARE
  v_upserted int := 0;
  v_unmapped text[];
BEGIN
  -- produtos de plataforma sem mapeamento (pra não sumir receita em silêncio)
  SELECT array_agg(DISTINCT s.product_id) INTO v_unmapped
  FROM marketing.hotmart_sales s
  LEFT JOIN marketing.product_finance_map m ON m.platform_product_id = s.product_id
  WHERE m.platform_product_id IS NULL
    AND s.product_name NOT ILIKE '%improviso%'
    AND s.hotmart_transaction NOT LIKE 'HP-FAKE%';

  -- zera linhas automáticas no escopo (mês que ficou sem venda volta a 0)
  -- venda de marketplace é sempre de mercado: a linha de parte relacionada não é dela
  UPDATE finance.revenue r SET
    one_time_brl = 0, sales_count = 0, refund_count = 0, updated_at = now()
  WHERE r.notes = 'auto: fn_revenue_rebuild'
    AND NOT r.parte_relacionada
    AND (p_month IS NULL OR r.month = p_month);

  WITH sales AS (
    SELECT
      COALESCE(m.finance_product_id,
               CASE WHEN s.product_name ILIKE '%improviso%' THEN 'osi' END) AS product_id,
      date_trunc('month', s.purchase_date)::date AS month,
      s.status,
      s.price_value_cents
    FROM marketing.hotmart_sales s
    LEFT JOIN marketing.product_finance_map m ON m.platform_product_id = s.product_id
    WHERE s.hotmart_transaction NOT LIKE 'HP-FAKE%'
      AND (p_month IS NULL OR date_trunc('month', s.purchase_date)::date = p_month)
  ),
  agg AS (
    SELECT product_id, month,
      COALESCE(sum(price_value_cents) FILTER (WHERE status IN ('approved','complete')), 0) / 100.0 AS one_time_brl,
      count(*) FILTER (WHERE status IN ('approved','complete'))   AS sales_count,
      count(*) FILTER (WHERE status IN ('refunded','chargeback')) AS refund_count
    FROM sales
    WHERE product_id IS NOT NULL
    GROUP BY product_id, month
  ),
  up AS (
    INSERT INTO finance.revenue (product_id, month, one_time_brl, sales_count, refund_count, notes, parte_relacionada)
    SELECT product_id, month, one_time_brl, sales_count, refund_count, 'auto: fn_revenue_rebuild', false
    FROM agg
    ON CONFLICT (product_id, month, parte_relacionada) DO UPDATE SET
      one_time_brl = EXCLUDED.one_time_brl,
      sales_count  = EXCLUDED.sales_count,
      refund_count = EXCLUDED.refund_count,
      updated_at   = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_upserted FROM up;

  RETURN jsonb_build_object(
    'months_upserted', v_upserted,
    'unmapped_platform_products', COALESCE(v_unmapped, '{}')
  );
END;
$function$;

alter table finance.aportes drop constraint aportes_natureza_check;
alter table finance.aportes add constraint aportes_natureza_check
  check (natureza = any (array['investimento', 'emprestimo', 'devolucao', 'encontro_de_contas']));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · A VENDA LIGADA AO LEAD E AO A/B
-- ═══════════════════════════════════════════════════════════════════════════
alter table billing.subscribers
  add column lead_id uuid references ops.commercial_leads(id),
  add column canal_origem text,
  add column braco_ab text,
  add column variante_ab text,
  add column atribuicao_mensagem_id uuid,
  add column parte_relacionada boolean not null default false,
  add constraint subscribers_canal_origem_vocabulario
    check (canal_origem is null or canal_origem = any (array['whatsapp', 'landing', 'indicacao', 'organico', 'outro'])),
  add constraint subscribers_braco_ab_vocabulario
    check (braco_ab is null or braco_ab = any (array['osi', 'clearix'])),
  add constraint subscribers_variante_tem_braco
    check ((variante_ab is null) = (braco_ab is null));

comment on column billing.subscribers.lead_id is 'ops.commercial_leads.id — o mesmo id do MKT e dos eventos. Nulo = cliente que não passou pelo funil. Migration 126.';
comment on column billing.subscribers.tenant_ref is 'iam.tenants.id do crm_erp (Clearix), copiado por quem registra. Sem FK nem leitura cruzada: o digiai não acessa aquele banco.';
comment on column billing.subscribers.variante_ab is 'FOTOGRAFIA da mkt.mensagens.variante (<oferta>.<template_id>.<versao>) que atribuiu a venda, tirada no registro. Não muda se a mensagem mudar.';
comment on column billing.subscribers.atribuicao_mensagem_id is 'mkt.mensagens.id que decidiu a atribuição. Sem FK de propósito: a tabela é do MKT e a fotografia sobrevive a ela.';
comment on column billing.subscribers.parte_relacionada is 'Empresa do mesmo dono (cliente-zero). Conta como assinante; NAO sustenta gate de mercado.';

create index subscribers_lead_id_idx on billing.subscribers (lead_id) where lead_id is not null;
-- um lead não compra o mesmo produto duas vezes em aberto (clique duplo, dois admins ao mesmo tempo)
create unique index subscribers_lead_produto_vivo_uq on billing.subscribers (lead_id, product)
  where lead_id is not null and deleted_at is null;

create or replace function public.fn_registrar_venda_clearix(
  p_lead_id uuid,
  p_plano text,
  p_valor_brl numeric,
  p_pago_em timestamptz,
  p_canal_origem text default null,
  p_tenant_ref text default null,
  p_parte_relacionada boolean default false,
  p_comprovante text default null,
  p_mp_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, billing, ops, mkt
as $fn$
declare
  v_lead ops.commercial_leads;
  v_fones text[];
  v_msg record;
  v_canal text := p_canal_origem;
  v_sub uuid;
  v_pay uuid;
  v_dia date;
begin
  -- mesma trava da billing_upsert_subscriber (08/09): papel vem do banco (R-037)
  if not public.is_admin() then
    raise exception 'Acesso negado: registrar venda exige papel admin ou superior' using errcode = '42501';
  end if;

  if p_lead_id is null then raise exception 'lead_obrigatorio' using errcode = '22023'; end if;
  if coalesce(btrim(p_plano), '') = '' then raise exception 'plano_obrigatorio' using errcode = '22023'; end if;
  if p_valor_brl is null or p_valor_brl <= 0 then raise exception 'valor_invalido' using errcode = '22023'; end if;
  -- venda = pagamento pago: sem data de pagamento não é venda, é intenção
  if p_pago_em is null then raise exception 'pagamento_obrigatorio: venda só se registra com o pagamento feito' using errcode = '22023'; end if;
  if p_pago_em > now() + interval '1 day' then raise exception 'pago_em_no_futuro' using errcode = '22023'; end if;
  if v_canal is not null and v_canal <> all (array['whatsapp', 'landing', 'indicacao', 'organico', 'outro']) then
    raise exception 'canal_origem_invalido: %', v_canal using errcode = '22023';
  end if;

  select * into v_lead from ops.commercial_leads where id = p_lead_id for update;
  if not found or v_lead.deleted_at is not null then
    raise exception 'lead_inexistente_ou_fora_da_base' using errcode = '22023';
  end if;
  if exists (select 1 from billing.subscribers where lead_id = p_lead_id and product = 'clearix' and deleted_at is null) then
    raise exception 'venda_ja_registrada_para_este_lead' using errcode = '23505';
  end if;

  -- Atribuição (contrato do MKT 20260914_03): primeira SAÍDA com oferta para o NÚMERO do lead
  -- ou para o lead_id, antes do pagamento. Rede usa o mesmo WhatsApp em várias lojas: a venda
  -- da loja B herda a célula da abordagem à loja A.
  v_fones := case when v_lead.phone_e164 is null then '{}'::text[] else mkt.fn_wa_variantes_fone(v_lead.phone_e164) end;
  select m.id, m.oferta, m.variante into v_msg
    from mkt.mensagens m
   where m.direcao = 'out'
     and m.oferta is not null and m.variante is not null
     and m.status = any (array['enviada', 'entregue', 'lida'])
     and m.enviado_em < p_pago_em
     and (m.lead_id = p_lead_id or regexp_replace(coalesce(m.fone, ''), '\D', '', 'g') = any (v_fones))
   order by m.enviado_em, m.created_at
   limit 1;

  -- canal: se quem registra não disse, deduz. Primeira mensagem RECEBIDA com código do site
  -- → landing; se houve conversa de saída → whatsapp; senão exige que diga.
  if v_canal is null then
    if exists (select 1 from mkt.mensagens m
                where m.direcao = 'in' and m.origem in ('site', 'site-contato')
                  and (m.lead_id = p_lead_id or regexp_replace(coalesce(m.fone, ''), '\D', '', 'g') = any (v_fones))) then
      v_canal := 'landing';
    elsif exists (select 1 from mkt.mensagens m
                   where m.direcao = 'out'
                     and (m.lead_id = p_lead_id or regexp_replace(coalesce(m.fone, ''), '\D', '', 'g') = any (v_fones))) then
      v_canal := 'whatsapp';
    else
      raise exception 'canal_origem_obrigatorio: não há mensagem deste lead para deduzir o canal' using errcode = '22023';
    end if;
  end if;

  v_dia := (p_pago_em at time zone 'America/Sao_Paulo')::date;

  insert into billing.subscribers
    (product, name, email, phone, plan_name, plan_amount_brl, tenant_ref, status, dunning_stage,
     started_on, last_paid_on, next_due_on, notes,
     lead_id, canal_origem, braco_ab, variante_ab, atribuicao_mensagem_id, parte_relacionada)
  values
    ('clearix', coalesce(nullif(btrim(v_lead.company), ''), v_lead.name), v_lead.email, v_lead.phone_e164,
     btrim(p_plano), p_valor_brl, nullif(btrim(p_tenant_ref), ''), 'active', 'em_dia',
     v_dia, v_dia, (v_dia + interval '1 month')::date,
     'Registrada pela tela Comercial (fn_registrar_venda_clearix, migration 126).',
     p_lead_id, v_canal, v_msg.oferta, v_msg.variante, v_msg.id, coalesce(p_parte_relacionada, false))
  returning id into v_sub;

  insert into billing.payments (subscriber_id, mp_payment_id, amount_brl, status, paid_at, period_start, period_end, raw)
  values (v_sub, nullif(btrim(p_mp_payment_id), ''), p_valor_brl, 'approved', p_pago_em, v_dia, ((v_dia + interval '1 month')::date - 1),
          jsonb_build_object('origem', 'fn_registrar_venda_clearix', 'comprovante', nullif(btrim(p_comprovante), ''),
                             'registrado_por_auth', auth.uid(), 'registrado_em', now()))
  returning id into v_pay;

  update ops.commercial_leads set
    stage = 'cliente',
    product = coalesce(product, 'clearix'),
    value_brl = coalesce(value_brl, p_valor_brl),
    last_touch_at = now()
  where id = p_lead_id;

  return jsonb_build_object(
    'subscriber_id', v_sub, 'payment_id', v_pay, 'canal_origem', v_canal,
    'braco_ab', v_msg.oferta, 'variante_ab', v_msg.variante, 'atribuicao_mensagem_id', v_msg.id,
    'parte_relacionada', coalesce(p_parte_relacionada, false));
end
$fn$;

revoke all on function public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text) from public, anon;
grant execute on function public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text) to authenticated, service_role;

-- Uma linha por venda do Clearix, sem PII (sem doc, e-mail, telefone, nome). É o que o MKT
-- cruza com o funil por braço, e o que o placar de metas conta.
create view public.v_vendas_clearix with (security_invoker = true) as
select s.id as subscriber_id,
       s.lead_id,
       s.plan_name as plano,
       s.plan_amount_brl as valor_mensal_brl,
       s.status,
       s.canal_origem,
       s.braco_ab,
       s.variante_ab,
       s.atribuicao_mensagem_id,
       s.parte_relacionada,
       s.tenant_ref,
       p.primeiro_pago_em,
       p.pagamentos_pagos
  from billing.subscribers s
  join lateral (
    select min(paid_at) as primeiro_pago_em, count(*) as pagamentos_pagos
      from billing.payments
     where subscriber_id = s.id and paid_at is not null and status = 'approved'
  ) p on true
 where s.product = 'clearix' and s.deleted_at is null and p.primeiro_pago_em is not null;

grant select on public.v_vendas_clearix to authenticated, service_role;

-- A falha que não fala: estágio e venda que discordam.
create view public.v_vendas_incoerencias with (security_invoker = true) as
select 'lead_cliente_sem_venda'::text as tipo, l.id as lead_id, null::uuid as subscriber_id,
       'Lead em "cliente" sem venda registrada: registrar a venda ou voltar o estágio.'::text as o_que_fazer
  from ops.commercial_leads l
 where l.stage = 'cliente' and l.deleted_at is null
   and not exists (select 1 from billing.subscribers s where s.lead_id = l.id and s.deleted_at is null)
union all
select 'venda_com_lead_nao_cliente', s.lead_id, s.id,
       'Venda registrada para lead que não está em "cliente".'
  from billing.subscribers s join ops.commercial_leads l on l.id = s.lead_id
 where s.deleted_at is null and l.stage <> 'cliente'
union all
select 'venda_sem_pagamento_pago', s.lead_id, s.id,
       'Assinante Clearix sem nenhum pagamento pago: não é venda pela regra (decisão 1).'
  from billing.subscribers s
 where s.product = 'clearix' and s.deleted_at is null
   and not exists (select 1 from billing.payments p where p.subscriber_id = s.id and p.paid_at is not null and p.status = 'approved');

grant select on public.v_vendas_incoerencias to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · O GATE DA FASE 2 CONTA VENDA DE MERCADO
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_gate_evidencia(p_fase integer DEFAULT NULL::integer)
 RETURNS TABLE(fase integer, metrica text, clientes_pagantes integer, receita_brl numeric, assinantes integer, gate_cumprido boolean, veredito text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'ops', 'finance', 'billing'
AS $function$
  WITH alvo AS (
    SELECT phase_number, metrica_unica
      FROM ops.roadmap_phases
     WHERE phase_number = COALESCE(p_fase, (
             SELECT min(phase_number) FROM ops.roadmap_phases
              WHERE started_at IS NOT NULL AND completed_at IS NULL))
  ), medido AS (
    SELECT
      -- cliente pagante de mercado = VENDA registrada (126), nao nome de empresa: assinante
      -- Clearix, fora de parte relacionada, com pagamento pago. Validacao de cliente-zero
      -- nao e validacao de mercado.
      (SELECT count(*)::int FROM billing.subscribers s
        WHERE s.product = 'clearix' AND s.deleted_at IS NULL AND NOT s.parte_relacionada
          AND EXISTS (SELECT 1 FROM billing.payments p
                       WHERE p.subscriber_id = s.id AND p.paid_at IS NOT NULL AND p.status = 'approved')) AS clientes,
      (SELECT COALESCE(sum(mrr_brl + one_time_brl), 0) FROM finance.revenue
        WHERE deleted_at IS NULL AND NOT parte_relacionada)            AS receita,
      (SELECT count(*)::int FROM billing.subscribers s
        WHERE s.deleted_at IS NULL AND s.status = 'active' AND NOT s.parte_relacionada) AS assin
  )
  SELECT a.phase_number, a.metrica_unica, m.clientes, m.receita, m.assin,
         (m.clientes > 0 OR m.receita > 0 OR m.assin > 0),
         CASE
           WHEN m.clientes > 0 OR m.receita > 0 OR m.assin > 0
             THEN 'Gate sustentado pelo dado: ' || m.clientes || ' venda(s) Clearix de mercado, R$ '
                  || translate(to_char(m.receita, 'FM999G999D00'), ',.', '.,') || ' de receita de mercado, '
                  || m.assin || ' assinante(s) de mercado.'
           ELSE 'Gate NAO sustentado: zero venda de mercado, zero receita de mercado, zero assinante de mercado. '
                || 'A metrica da fase e "' || a.metrica_unica || '".'
         END
    FROM alvo a, medido m;
$function$;

create or replace view public.v_ops_placar_hoje with (security_invoker = true) as
 WITH fase AS (
         SELECT roadmap_phases.phase_number,
            roadmap_phases.nome,
            roadmap_phases.metrica_unica
           FROM ops.roadmap_phases
          WHERE roadmap_phases.started_at IS NOT NULL AND roadmap_phases.completed_at IS NULL
          ORDER BY roadmap_phases.phase_number
         LIMIT 1
        ), elo AS (
         SELECT t.title,
            t.target_date,
            ( SELECT count(*) AS count
                   FROM ops.roadmap_tasks x
                  WHERE x.phase_number = t.phase_number AND x.deleted_at IS NULL) AS total,
            (( SELECT count(*) AS count
                   FROM ops.roadmap_tasks y
                  WHERE y.phase_number = t.phase_number AND y.deleted_at IS NULL AND y.completed_at IS NOT NULL)) + 1 AS numero
           FROM ops.roadmap_tasks t,
            fase f_1
          WHERE t.phase_number = f_1.phase_number AND t.deleted_at IS NULL AND t.completed_at IS NULL
          ORDER BY t.target_date, t.display_order
         LIMIT 1
        ), dinheiro AS (
         SELECT ( SELECT COALESCE(sum(revenue.mrr_brl + revenue.one_time_brl), 0::numeric) AS "coalesce"
                   FROM finance.revenue
                  WHERE revenue.deleted_at IS NULL AND NOT revenue.parte_relacionada) AS caixa,
            ( SELECT COALESCE(avg(x.t), 0::numeric) AS "coalesce"
                   FROM ( SELECT sum(infra_costs.cost_brl) AS t
                           FROM finance.infra_costs
                          WHERE NOT infra_costs.parcial
                          GROUP BY infra_costs.month
                          ORDER BY infra_costs.month DESC
                         LIMIT 3) x) AS custo_mes,
            ( SELECT count(*)::integer AS count
                   FROM public.v_vendas_clearix v
                  WHERE NOT v.parte_relacionada) AS pagantes
        )
 SELECT f.phase_number AS fase,
    f.nome AS fase_nome,
    f.metrica_unica AS metrica,
    e.title AS elo_titulo,
    e.numero AS elo_numero,
    e.total AS elo_total,
    e.target_date AS elo_prazo,
    e.target_date - CURRENT_DATE AS elo_dias,
    d.caixa,
    d.custo_mes,
    d.pagantes,
    ( SELECT fn_gate_evidencia.gate_cumprido
           FROM fn_gate_evidencia() fn_gate_evidencia(fase, metrica, clientes_pagantes, receita_brl, assinantes, gate_cumprido, veredito)) AS gate_ok,
    ( SELECT fn_gate_evidencia.veredito
           FROM fn_gate_evidencia() fn_gate_evidencia(fase, metrica, clientes_pagantes, receita_brl, assinantes, gate_cumprido, veredito)) AS gate_veredito,
    ( SELECT COALESCE(json_agg(json_build_object('mes', to_char(s.month::timestamp with time zone, 'MM/YY'::text), 'mrr', s.mrr_total_brl) ORDER BY s.month), '[]'::json) AS "coalesce"
           FROM ( SELECT financial_snapshots.month,
                    financial_snapshots.mrr_total_brl
                   FROM company.financial_snapshots
                  ORDER BY financial_snapshots.month DESC
                 LIMIT 12) s) AS mrr_serie
   FROM fase f
     LEFT JOIN elo e ON true
     CROSS JOIN dinheiro d;

create or replace view public.v_finance_revenue with (security_invoker = true) as
 SELECT r.id,
    r.month,
    r.product_id,
    p.name AS product_name,
    r.mrr_brl,
    r.one_time_brl,
    r.active_subscriptions,
    r.new_subscriptions,
    r.churn_count,
    r.sales_count,
    r.refund_count,
    r.notes,
    r.parte_relacionada
   FROM finance.revenue r
     LEFT JOIN finance.products p ON p.id = r.product_id
  WHERE r.deleted_at IS NULL
  ORDER BY r.month DESC, r.product_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PÓS (catálogo e acesso; o comportamento se prova no ensaio desfeito — ver PROVAS)
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int; v_gate boolean;
begin
  select gate_cumprido into v_gate from public.fn_gate_evidencia();
  if v_gate then raise exception 'O gate virou com a tabela vazia.'; end if;

  select count(*) into n from public.v_ops_placar_hoje where caixa <> 0 or pagantes <> 0;
  if n > 0 then raise exception 'O placar mostra caixa ou pagantes sem venda nenhuma.'; end if;

  -- sem sessão (a migration roda sem auth.uid()) a função tem de recusar
  begin
    perform public.fn_registrar_venda_clearix(gen_random_uuid(), 'x', 1, now());
    raise exception 'fn_registrar_venda_clearix aceitou chamada sem sessão de admin.';
  exception when insufficient_privilege then null;
  end;

  if has_function_privilege('anon', 'public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text)', 'execute') then
    raise exception 'anon consegue executar fn_registrar_venda_clearix.';
  end if;

  select count(*) into n from pg_class
   where oid in ('public.v_ops_placar_hoje'::regclass, 'public.v_finance_revenue'::regclass,
                 'public.v_vendas_clearix'::regclass, 'public.v_vendas_incoerencias'::regclass)
     and reloptions @> array['security_invoker=true'];
  if n <> 4 then raise exception 'Uma das views ficou sem security_invoker.'; end if;

  execute 'set local role authenticated';
  perform caixa, pagantes, gate_ok, gate_veredito from public.v_ops_placar_hoje;
  perform parte_relacionada, mrr_brl from public.v_finance_revenue;
  perform subscriber_id, lead_id, braco_ab, variante_ab, canal_origem, primeiro_pago_em from public.v_vendas_clearix;
  perform tipo, lead_id, subscriber_id from public.v_vendas_incoerencias;
  execute 'reset role';

  -- a v_vendas_clearix não expõe PII
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'v_vendas_clearix' and column_name in ('doc', 'email', 'phone', 'name');
  if n > 0 then raise exception 'v_vendas_clearix expõe coluna de dado pessoal.'; end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) ensaio desfeito (scratchpad do app, ver o commit): lead de teste + mensagem de oferta
--      de teste, chamada com sessão de admin simulada → assinante + pagamento + lead em cliente,
--      braço/variante/mensagem certos, gate de mercado vira; parte relacionada não vira; mensagem
--      DEPOIS do pagamento não atribui; número com/sem nono dígito atribui; segundo registro recusa;
--   b) depois de aplicar: placar e ordem do dia "Gate NAO sustentado"; v_vendas_incoerencias
--      mostra o lead "Grupo Mello Óticas" (stage cliente sem venda) — verdadeiro até a 123;
--   c) tela Comercial: "Registrar venda" só para admin; erro do banco aparece na tela.
