-- 104 — a auditoria passa a gravar DE ONDE veio a ação
--
-- ⚠ NÃO APLICADA. Aguarda o "pode" do dono. Portão 91.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O ESTADO, MEDIDO EM 09/09
-- ═══════════════════════════════════════════════════════════════════════════
--   auth.audit_log_entries ... 0 linhas   (vazia; o GoTrue hospedado não popula)
--   iam.audit_logs ........... 766 linhas, 17/04 → 09/09, viva
--        com ip_address ...... 0           ← em cinco meses, nenhuma
--        ações ............... UPDATE 523 · INSERT 240 · DELETE 3 — nenhum LOGIN
--
-- Ou seja: a coluna `ip_address` foi desenhada, existe há cinco meses e **nunca
-- recebeu um valor**. Parece que alguém cuidou. É a mesma família do `secret_ref`
-- vazio e do opt-out que a agenda ignorava.
--
-- ⚠ CORREÇÃO AO PEDIDO: não existe "a RPC que escreve em iam.audit_logs".
-- Quem escreve é um TRIGGER — `iam.tg_audit_log`, ligado a **16 tabelas**
-- (company, academy, iam, marketing…). Isso é melhor do que se supunha: consertar
-- a função conserta as 16 de uma vez. Mas tem uma consequência que o plano não
-- previa: **trigger não captura login.** Login não altera linha nenhuma. Por isso
-- o §2 acrescenta uma RPC própria — sem ela, `action='LOGIN'` não teria por onde
-- entrar, e a auditoria continuaria sem a única ação que interessa a um incidente.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — o trigger que já existe passa a registrar origem
-- ═══════════════════════════════════════════════════════════════════════════
alter table iam.audit_logs add column if not exists user_agent text;
comment on column iam.audit_logs.ip_address is
  'De onde veio a ação. Preenchido a partir de `request.headers` (cf-connecting-ip, senão o 1º de x-forwarded-for) desde a 104. Nulo em chamada que não passa pelo PostgREST — Management API, cron e psql não têm headers, e nulo ali é honesto, não falha.';
comment on column iam.audit_logs.user_agent is
  'User-agent de quem fez a ação, quando a chamada passa pelo PostgREST. Serve para distinguir navegador de script no mesmo IP.';

create or replace function iam.tg_audit_log()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'iam'
as $function$
declare
  v_user_id uuid;
  v_email text;
  v_resource_id uuid;
  v_ip text;
  v_ua text;
  v_headers jsonb;
begin
  select u.id, u.email into v_user_id, v_email
  from iam.users u where u.auth_id = auth.uid() limit 1;

  if tg_op = 'DELETE' then v_resource_id := old.id; else v_resource_id := new.id; end if;

  -- ⚠ BLOCO PROTEGIDO, e é a decisão mais importante desta migration.
  -- Este trigger roda DENTRO da escrita de negócio: se ele levantar exceção, a
  -- gravação do usuário falha. Uma melhoria de auditoria não pode derrubar o
  -- que ela audita. `request.headers` pode não existir (Management API, cron,
  -- psql), vir malformado, ou mudar de forma numa versão futura do PostgREST —
  -- e nenhum desses casos justifica perder a linha de negócio.
  -- Sem IP a auditoria fica pior; com exceção aqui, o app para.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    v_ip := coalesce(
      v_headers ->> 'cf-connecting-ip',
      -- x-forwarded-for pode vir "cliente, proxy1, proxy2": o primeiro é o cliente.
      nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for',''), ',', 1), ''),
      v_headers ->> 'x-real-ip'
    );
    v_ua := left(coalesce(v_headers ->> 'user-agent', ''), 400);
  exception when others then
    v_ip := null; v_ua := null;
  end;

  insert into iam.audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent)
  values (
    v_user_id, v_email, tg_op,
    tg_table_schema || '.' || tg_table_name,
    v_resource_id,
    jsonb_build_object(
      'old', case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
      'new', case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) else null end
    ),
    v_ip, nullif(v_ua,'')
  );
  return coalesce(new, old);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — LOGIN, que trigger nenhum captura
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.fn_audit_login()
returns void
language plpgsql
security definer
set search_path to 'public', 'iam'
as $function$
declare v_user_id uuid; v_email text; v_ip text; v_ua text; v_headers jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão' using errcode = '42501';
  end if;
  select u.id, u.email into v_user_id, v_email
  from iam.users u where u.auth_id = auth.uid() limit 1;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    v_ip := coalesce(v_headers ->> 'cf-connecting-ip',
                     nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for',''), ',', 1), ''),
                     v_headers ->> 'x-real-ip');
    v_ua := left(coalesce(v_headers ->> 'user-agent',''), 400);
  exception when others then v_ip := null; v_ua := null;
  end;

  insert into iam.audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent)
  values (v_user_id, coalesce(v_email, auth.jwt() ->> 'email'), 'LOGIN', 'auth', null,
          jsonb_build_object('app','digiai'), v_ip, nullif(v_ua,''));
end $function$;

comment on function public.fn_audit_login() is
  'Registra LOGIN em iam.audit_logs com IP e user-agent. Existe porque TRIGGER NÃO CAPTURA LOGIN — login não altera linha nenhuma. CONSUMIDOR: o front do digiai, logo após o signIn. ⚠ ALCANCE: registra quem entra PELO APP. NÃO registra uso da chave anon direto na API nem token roubado usado fora do app — que é justamente o cenário de credencial vazada. É auditoria de uso do APP, não de acesso ao BANCO.';

revoke all on function public.fn_audit_login() from public, anon;
grant execute on function public.fn_audit_login() to authenticated;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS — e uma NÃO serve pela Management API
-- ═══════════════════════════════════════════════════════════════════════════
--   a) chamada REAL pelo PostgREST com sessão → linha com `ip_address` preenchido.
--      ⚠ Pela Management API isto dá NULO e está CERTO: não há `request.headers`.
--      Provar por aqui e ver nulo levaria à conclusão errada de que não funcionou —
--      é o mesmo formato do `set role` que não prova RLS.
--   b) `select fn_audit_login()` com sessão → linha `action='LOGIN'` com IP;
--   c) sem sessão → 42501;
--   d) UPDATE numa das 16 tabelas, com sessão → a linha de auditoria traz IP;
--   e) **controle de não-regressão**: UPDATE pela Management API (sem headers)
--      continua GRAVANDO a linha de negócio e a de auditoria, com IP nulo.
--      É a prova de que o bloco protegido faz o que promete.
--
-- ⚠ FALTA UM PASSO DE FRONT: o app precisa chamar `fn_audit_login()` depois do
--    signIn. Sem isso, o §2 fica inerte — mais uma coluna desenhada e vazia, que
--    é exatamente o que esta migration existe para acabar.
