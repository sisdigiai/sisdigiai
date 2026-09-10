-- 100 — `fn_upsert_commercial_lead`: patch parcial para de apagar o resto
--
-- ✔ APLICADA em 09/09/2026. Portões 68 e 69.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §A — O BUG, E ELE PASSOU PELAS MINHAS MÃOS
-- ═══════════════════════════════════════════════════════════════════════════
-- Achado pelo agente do MKT lendo a definição (não executando — a trava do §B
-- barrou a execução, e ele não a contornou para provar; registro isso porque é
-- o comportamento certo).
--
-- O ramo de UPDATE grava TODOS os campos direto do jsonb, sem guarda:
--     name = p_lead->>'name', company = p_lead->>'company', …
-- `->>` devolve NULL quando a chave não existe. Então chamar com
--     {"id": "...", "stage": "contatado"}
-- APAGA name, company, product, source, contact, value_brl, owner, next_step e
-- notes — e ainda põe `stage = 'lead'` pelo coalesce do default, que **nem existe
-- no vocabulário** (`commercial_leads_stage_vocabulario` aceita captado/contatado/
-- conversa/demo/proposta/piloto/cliente/perdido). Ou seja: o patch parcial destrói
-- o lead e o deixa num estágio inválido.
--
-- ⚠ ISTO NÃO É DEFEITO NOVO — vinha da versão anterior. Mas passou pelas minhas
--    mãos na 093: eu tinha o corpo inteiro à frente, acrescentei `next_touch_at` e
--    `last_touch_at` COM `coalesce`, e deixei os outros nove como estavam.
--    Pior: isso criou uma armadilha que antes não existia — dois campos seguros
--    para patch parcial e nove que apagam. Quem lesse a minha função concluiria,
--    com razão, que patch parcial é seguro. **Consertei o que entendi e não olhei
--    o resto**, que é a forma mais discreta de introduzir um defeito.
--
-- Mesma família do `sync-metricas` de 05/09 (campo ausente vira apagamento),
-- mecanismo diferente: lá era o objeto montado sem o campo; aqui é o `->>`.
--
-- POR QUE `p_lead ? 'campo'` E NÃO `coalesce`:
-- `coalesce(p_lead->>'notes', notes)` conserta o apagamento acidental, mas torna
-- IMPOSSÍVEL limpar um campo de propósito — mandar `notes: null` passaria a não
-- fazer nada. `notes` e `next_step` são exatamente campos que se limpam. Com
-- `p_lead ? 'campo'` a regra é a que o chamador espera: **campo ausente não muda,
-- campo presente manda — inclusive quando manda null.**

begin;

create or replace function public.fn_upsert_commercial_lead(p_lead jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare v_id uuid;
begin
  -- §B: contexto de máquina. Ver justificativa no rodapé.
  if not (public.pode_tocar_lead() or public.contexto_de_maquina()) then
    raise exception 'Acesso negado: escrever lead exige papel staff ou vendas'
      using errcode = '42501';
  end if;

  v_id := nullif(p_lead->>'id','')::uuid;

  if v_id is null then
    insert into ops.commercial_leads (name, company, product, stage, source, contact, value_brl, owner, next_step, notes, next_touch_at, last_touch_at)
    values (p_lead->>'name', p_lead->>'company', p_lead->>'product',
            coalesce(nullif(p_lead->>'stage',''),'captado'), p_lead->>'source', p_lead->>'contact',
            nullif(p_lead->>'value_brl','')::numeric, p_lead->>'owner', p_lead->>'next_step', p_lead->>'notes',
            nullif(p_lead->>'next_touch_at','')::timestamptz, nullif(p_lead->>'last_touch_at','')::timestamptz)
    returning id into v_id;
  else
    -- Campo AUSENTE não muda; campo PRESENTE manda, inclusive null.
    update ops.commercial_leads set
      name          = case when p_lead ? 'name'          then p_lead->>'name'                          else name end,
      company       = case when p_lead ? 'company'       then p_lead->>'company'                       else company end,
      product       = case when p_lead ? 'product'       then p_lead->>'product'                       else product end,
      stage         = case when p_lead ? 'stage'         then coalesce(nullif(p_lead->>'stage',''), stage) else stage end,
      source        = case when p_lead ? 'source'        then p_lead->>'source'                        else source end,
      contact       = case when p_lead ? 'contact'       then p_lead->>'contact'                       else contact end,
      value_brl     = case when p_lead ? 'value_brl'     then nullif(p_lead->>'value_brl','')::numeric else value_brl end,
      owner         = case when p_lead ? 'owner'         then p_lead->>'owner'                         else owner end,
      next_step     = case when p_lead ? 'next_step'     then p_lead->>'next_step'                     else next_step end,
      notes         = case when p_lead ? 'notes'         then p_lead->>'notes'                         else notes end,
      next_touch_at = case when p_lead ? 'next_touch_at' then nullif(p_lead->>'next_touch_at','')::timestamptz else next_touch_at end,
      last_touch_at = case when p_lead ? 'last_touch_at' then nullif(p_lead->>'last_touch_at','')::timestamptz else last_touch_at end
    where id = v_id;
  end if;
  return v_id;
end $function$;

comment on function public.fn_upsert_commercial_lead(jsonb) is
  'Upsert de lead. PATCH PARCIAL: campo ausente do jsonb NÃO muda; campo presente manda, inclusive null (por isso `p_lead ? campo` e não coalesce — notes e next_step precisam poder ser limpos). Autorização: pode_tocar_lead() para humano, contexto_de_maquina() para service_role. Corrigido na 100 — antes, {id, stage} apagava os outros nove campos.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §B — contexto de máquina: sim, e SÓ service_role
-- ═══════════════════════════════════════════════════════════════════════════
-- `pode_tocar_lead()` começa com `if auth.uid() is null then return false`. Sob
-- edge function com service_role, cron ou Management API não há `auth.uid()`:
-- ninguém escreve lead por RPC. Hoje não dói; a F1 do módulo do MKT vai gravar
-- `next_touch_at` de dentro de edge function e bate aí.
--
-- DECISÃO: aceito o contexto de máquina, como o resto da casa — e SÓ service_role.
-- Escrevo função própria em vez de reusar `mkt.is_admin_ou_vendas()`: leads são
-- ativo da empresa e não consultam a tabela de usuários do app de marketing (093).
--
-- ⚠ E UMA COERÊNCIA QUE PRECISO EXPLICAR, porque parece contradição com o que
--    defendi hoje na `espelho-pulso`: lá eu disse que ler o claim `role` do JWT
--    localmente NÃO serve, e aqui leio o claim. A diferença é quem verificou a
--    assinatura. Na edge function, o decode era feito pelo próprio código, e a
--    verificação dependia de um flag fora do repositório. Aqui, quem preenche
--    `request.jwt.claims` é o PostgREST, DEPOIS de validar a assinatura — o claim
--    chega já verificado. Mesmo dado, cadeia de confiança diferente.
create or replace function public.contexto_de_maquina()
returns boolean
language sql
stable
as $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$function$;

comment on function public.contexto_de_maquina() is
  'True só para service_role (claim já VERIFICADO pelo PostgREST) ou conexão direta de postgres/supabase_admin. NUNCA para anon: anon tem claim role=anon e cai fora. Existe para edge function e cron poderem escrever por RPC — ver 100 §B.';

revoke all on function public.contexto_de_maquina() from public, anon;
grant execute on function public.contexto_de_maquina() to authenticated, service_role;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA POR EXECUÇÃO — exigida, e não serve catálogo
-- ═══════════════════════════════════════════════════════════════════════════
-- Com sessão de papel (o dono serve), num lead descartável:
--   1. criar lead completo (name, company, contact, notes);
--   2. chamar com {id, stage:'contatado'} APENAS;
--   3. reler: name, company, contact e notes têm de estar INTACTOS e
--      stage = 'contatado'. Antes da 100, estariam todos NULL e stage='lead';
--   4. chamar com {id, notes:null} → notes vira NULL (limpar de propósito funciona);
--   5. apagar o lead descartável.
-- Controle negativo: sessão sem papel → 42501; anon → 42501 (contexto_de_maquina
-- devolve false para claim role=anon).
