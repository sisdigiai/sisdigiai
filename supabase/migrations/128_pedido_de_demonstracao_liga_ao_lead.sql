-- 128 — o pedido de demonstração do site do Clearix se liga ao lead da prospecção
--
-- ⚠ NÃO APLICADA. Pede a palavra do dono. Despacho de 15/09 §3.1 ("o pedido de demonstração
--    cria/atualiza o lead em ops.commercial_leads pelo mesmo lead_id quando vier do link"), com o
--    contrato combinado com o Agent da landing Clearix: campo `commercial_lead_id` no body do
--    lead-capture; resposta sempre com a chave (id que casou | null).
--
-- ORDEM: 128 antes do deploy da lead-capture do mesmo commit. Na ordem inversa a edge chama uma
--   função que não existe: o pedido continua gravado (a captura vem primeiro) e o vínculo volta
--   null — nada se perde, só não se liga.
--
-- O QUE FAZ, só com um id que JÁ EXISTE na base (endpoint público: nunca cria lead pela URL):
--   • landing_lead_id ← o pedido (se o lead ainda não tinha um);
--   • utm_source/medium/campaign ← os do link, só onde o lead estava nulo (primeiro toque fica);
--   • utm_content ← o próprio id, se nulo;
--   • stage: captado/contatado/conversa → 'demo'. Estágio à frente (demo, proposta, piloto,
--     cliente) não recua. 'perdido' não é reaberto aqui: liga o pedido e põe na fila;
--   • next_touch_at ← now(): quem pediu demonstração é o primeiro da fila de resposta.
--   Lead descartado (deleted_at) conta como inexistente → null.
--
-- Não mexe em fn_capture_landing_lead (a captura de hoje continua igual para OSI e Calc).

begin;

do $$
declare n int;
begin
  if to_regprocedure('public.fn_ligar_pedido_ao_lead(uuid, uuid, text, text, text)') is not null then
    raise exception 'fn_ligar_pedido_ao_lead já existe — a 128 já foi aplicada?';
  end if;
  select count(*) into n from information_schema.columns
   where table_schema = 'ops' and table_name = 'commercial_leads'
     and column_name in ('landing_lead_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'next_touch_at', 'stage', 'deleted_at');
  if n <> 8 then raise exception 'ops.commercial_leads sem as colunas medidas (achei % de 8).', n; end if;
end $$;

create function public.fn_ligar_pedido_ao_lead(
  p_commercial_lead_id uuid,
  p_landing_lead_id uuid,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, ops, marketing
as $fn$
declare v_id uuid;
begin
  if p_commercial_lead_id is null or p_landing_lead_id is null then return null; end if;
  if not exists (select 1 from marketing.landing_leads where id = p_landing_lead_id) then return null; end if;

  update ops.commercial_leads l set
    landing_lead_id = coalesce(l.landing_lead_id, p_landing_lead_id),
    utm_source   = coalesce(l.utm_source, nullif(left(p_utm_source, 120), '')),
    utm_medium   = coalesce(l.utm_medium, nullif(left(p_utm_medium, 120), '')),
    utm_campaign = coalesce(l.utm_campaign, nullif(left(p_utm_campaign, 120), '')),
    utm_content  = coalesce(l.utm_content, l.id::text),
    stage = case when l.stage in ('captado', 'contatado', 'conversa') then 'demo' else l.stage end,
    next_touch_at = now()
  where l.id = p_commercial_lead_id and l.deleted_at is null
  returning l.id into v_id;

  return v_id;
end
$fn$;

-- default privileges do schema public dão EXECUTE a anon/authenticated: só a edge (service_role)
revoke all on function public.fn_ligar_pedido_ao_lead(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_ligar_pedido_ao_lead(uuid, uuid, text, text, text) to service_role;

do $$
begin
  if has_function_privilege('anon', 'public.fn_ligar_pedido_ao_lead(uuid, uuid, text, text, text)', 'execute')
  or has_function_privilege('authenticated', 'public.fn_ligar_pedido_ao_lead(uuid, uuid, text, text, text)', 'execute') then
    raise exception 'anon ou authenticated consegue mover lead por fn_ligar_pedido_ao_lead.';
  end if;
  if not has_function_privilege('service_role', 'public.fn_ligar_pedido_ao_lead(uuid, uuid, text, text, text)', 'execute') then
    raise exception 'service_role não executa — a edge nunca ligaria.';
  end if;
end $$;

commit;

-- PROVAS
--   a) ensaio desfeito (scratchpad do app): lead em 'conversa' → 'demo', landing_lead_id e utm
--      preenchidos, next_touch_at agora; lead em 'proposta' não recua; lead 'perdido' não reabre;
--      lead descartado → null; id inexistente → null; utm já preenchido não é sobrescrito;
--   b) depois da 128 + deploy: POST no lead-capture com commercial_lead_id de um lead de teste →
--      { ok, lead_id, commercial_lead_id: <id> }; com uuid inexistente → commercial_lead_id null;
--      sem o campo → resposta de hoje, sem a chave.
