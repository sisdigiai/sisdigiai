-- 130 — compra-teste do Clearix não conta como venda
--
-- ⚠ NÃO APLICADA. Pede a palavra do dono. Pedido do Orquestrador Geral (15/09/2026): o dono quer
--    fazer uma compra-teste do Clearix, e pela 126 uma venda registrada no botão é venda de MERCADO:
--    viraria o gate da fase 2 para "sustentado" e contaria como a 1ª venda das metas e do A/B.
--
-- POR QUE flag própria e não parte_relacionada=true: parte relacionada sai do gate mas CONTINUA em
-- v_vendas_clearix (placar de metas 1ª→50→200 e base do A/B do MKT) — e compra-teste não é empresa
-- do dono. Teste é outra coisa, e merece coluna própria.
--
-- O QUE MUDA:
--   • billing.subscribers.teste boolean not null default false;
--   • fn_registrar_venda_clearix ganha p_teste (último, default false — a chamada de hoje continua
--     valendo); a nota do assinante e o raw do pagamento dizem COMPRA-TESTE;
--   • fn_gate_evidencia: clientes e assinantes ignoram teste;
--   • v_vendas_clearix: não mostra teste (logo o placar, que lê dela, também não).
--   A compra-teste continua gravada (assinante, pagamento, lead em cliente) — só não conta.
-- EFEITO NO FRONT HOJE: nenhum (0 vendas). O modal ganha a caixa "Compra-teste" (mesmo commit).
-- ⚠ ATÉ ESTA ESTAR NO AR: não registrar a compra-teste pelo botão.

begin;

do $$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.fn_gate_evidencia(integer)'::regprocedure) <> 'ee9dff015190caf20d1d34d73c5aa4cb'
  or md5(pg_get_viewdef('public.v_vendas_clearix'::regclass)) <> 'df590435a2f8beeeca58623407e3de89'
  or (select md5(prosrc) from pg_proc where oid = 'public.fn_registrar_venda_clearix(uuid,text,numeric,timestamptz,text,text,boolean,text,text)'::regprocedure) <> '41e4b6fa0c8f1c995d81f2c76bf37844' then
    raise exception 'fn_gate_evidencia, v_vendas_clearix ou fn_registrar_venda_clearix mudou desde a 126 — conferir antes.';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'billing' and table_name = 'subscribers' and column_name = 'teste') then
    raise exception 'billing.subscribers.teste já existe — a 130 já foi aplicada?';
  end if;
end $$;

alter table billing.subscribers add column teste boolean not null default false;
comment on column billing.subscribers.teste is 'Compra-teste: gravada, mas NÃO conta como venda (gate, placar, v_vendas_clearix). Migration 130.';

-- a assinatura muda (novo parâmetro): sai a antiga para não ficarem duas sobrecargas
drop function public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text);

create or replace function public.fn_registrar_venda_clearix(
  p_lead_id uuid,
  p_plano text,
  p_valor_brl numeric,
  p_pago_em timestamptz,
  p_canal_origem text default null,
  p_tenant_ref text default null,
  p_parte_relacionada boolean default false,
  p_comprovante text default null,
  p_mp_payment_id text default null,
  p_teste boolean default false
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
     lead_id, canal_origem, braco_ab, variante_ab, atribuicao_mensagem_id, parte_relacionada, teste)
  values
    ('clearix', coalesce(nullif(btrim(v_lead.company), ''), v_lead.name), v_lead.email, v_lead.phone_e164,
     btrim(p_plano), p_valor_brl, nullif(btrim(p_tenant_ref), ''), 'active', 'em_dia',
     v_dia, v_dia, (v_dia + interval '1 month')::date,
     case when coalesce(p_teste, false) then 'COMPRA-TESTE — não é venda. Registrada pela tela Comercial (migration 130).'
          else 'Registrada pela tela Comercial (fn_registrar_venda_clearix, migration 126).' end,
     p_lead_id, v_canal, v_msg.oferta, v_msg.variante, v_msg.id, coalesce(p_parte_relacionada, false), coalesce(p_teste, false))
  returning id into v_sub;

  insert into billing.payments (subscriber_id, mp_payment_id, amount_brl, status, paid_at, period_start, period_end, raw)
  values (v_sub, nullif(btrim(p_mp_payment_id), ''), p_valor_brl, 'approved', p_pago_em, v_dia, ((v_dia + interval '1 month')::date - 1),
          jsonb_build_object('origem', 'fn_registrar_venda_clearix', 'comprovante', nullif(btrim(p_comprovante), ''),
                             'registrado_por_auth', auth.uid(), 'registrado_em', now(), 'teste', coalesce(p_teste, false)))
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
    'parte_relacionada', coalesce(p_parte_relacionada, false), 'teste', coalesce(p_teste, false));
end
$fn$;

revoke all on function public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text, boolean) from public, anon;
grant execute on function public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text, boolean) to authenticated, service_role;

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
      -- cliente pagante de mercado = VENDA registrada (126), nao compra-teste (130), nao nome de empresa: assinante
      -- Clearix, fora de parte relacionada, com pagamento pago. Validacao de cliente-zero
      -- nao e validacao de mercado.
      (SELECT count(*)::int FROM billing.subscribers s
        WHERE s.product = 'clearix' AND s.deleted_at IS NULL AND NOT s.parte_relacionada AND NOT s.teste
          AND EXISTS (SELECT 1 FROM billing.payments p
                       WHERE p.subscriber_id = s.id AND p.paid_at IS NOT NULL AND p.status = 'approved')) AS clientes,
      (SELECT COALESCE(sum(mrr_brl + one_time_brl), 0) FROM finance.revenue
        WHERE deleted_at IS NULL AND NOT parte_relacionada)            AS receita,
      (SELECT count(*)::int FROM billing.subscribers s
        WHERE s.deleted_at IS NULL AND s.status = 'active' AND NOT s.parte_relacionada AND NOT s.teste) AS assin
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

create or replace view public.v_vendas_clearix with (security_invoker = true) as
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
 where s.product = 'clearix' and not s.teste and s.deleted_at is null and p.primeiro_pago_em is not null;

do $$
declare n int;
begin
  select count(*) into n from pg_proc where proname = 'fn_registrar_venda_clearix';
  if n <> 1 then raise exception 'Ficaram % sobrecargas de fn_registrar_venda_clearix.', n; end if;
  if has_function_privilege('anon', 'public.fn_registrar_venda_clearix(uuid, text, numeric, timestamptz, text, text, boolean, text, text, boolean)', 'execute') then
    raise exception 'anon executa fn_registrar_venda_clearix.';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.v_vendas_clearix'::regclass and reloptions @> array['security_invoker=true']) then
    raise exception 'v_vendas_clearix perdeu invoker.';
  end if;
  if (select gate_cumprido from public.fn_gate_evidencia()) then raise exception 'Gate virou sem venda.'; end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- PROVAS
--   a) ensaio desfeito (scratchpad do app): venda com p_teste=true grava assinante/pagamento/lead
--      cliente, e gate continua falso, v_vendas_clearix 0, placar pagantes 0; a mesma venda sem teste
--      vira o gate — prova que o filtro é o que separa.
