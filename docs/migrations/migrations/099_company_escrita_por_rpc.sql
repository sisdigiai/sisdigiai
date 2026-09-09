-- 099 — `company.identity` e `company.legal_status`: escrita passa a ser por RPC
--
-- ⚠ NÃO APLICADA. Aguarda o "pode" do dono. Portão 64, parte viva.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MEDI, E POR QUE ESCOLHI RPC E NÃO "GRANT DOCUMENTADO"
-- ═══════════════════════════════════════════════════════════════════════════
-- `src/lib/companyStore.ts` escreve por `v_company_identity` e
-- `v_company_legal_status`. As duas são `security_invoker`, e as tabelas-base dão
-- **UPDATE a `authenticated`** — então a escrita funciona hoje, e é dependência viva:
-- revogar sem mais nada derrubaria o Cadastro Empresa na próxima vez que alguém
-- salvasse, sem erro na migration.
--
-- Mas o buraco é MAIOR que a view: como a base concede UPDATE a `authenticated`,
-- qualquer logado altera a identidade e a situação jurídica da empresa DIRETO,
-- sem passar por view nenhuma. Documentar o grant no comment deixaria isso de pé
-- e apenas escreveria que está de pé.
--
-- E o módulo `cadastro-empresa` é RESTRITO no front (`permissions.ts`): admin+.
-- Front esconde, banco deixa — o desalinhamento que originou a auditoria.
-- Com o papel `vendas` criado hoje pela 093, isso deixa de ser teórico.
--
-- Padrão da casa, o mesmo da 092: escrita por RPC com trava no corpo, e a tabela
-- deixa de aceitar escrita direta. `is_admin()` porque é exatamente quem enxerga
-- Cadastro Empresa — trava mais apertada que a tela recria o defeito do outro lado.

begin;

create or replace function public.fn_company_identity_upsert(p_patch jsonb)
returns company.identity
language plpgsql
security definer
set search_path to 'company', 'public'
as $function$
declare r company.identity;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: alterar identidade da empresa exige papel admin ou superior'
      using errcode = '42501';
  end if;
  update company.identity set
    legal_name   = coalesce(p_patch->>'legal_name', legal_name),
    trade_name   = coalesce(p_patch->>'trade_name', trade_name),
    cnpj         = coalesce(p_patch->>'cnpj', cnpj),
    founded_on   = coalesce(nullif(p_patch->>'founded_on','')::date, founded_on),
    updated_at   = now()
  where id = (select id from company.identity order by created_at limit 1)
  returning * into r;
  return r;
end $function$;

comment on function public.fn_company_identity_upsert(jsonb) is
  'Escreve company.identity. A autorização mora AQUI (is_admin), não no grant: a tabela deixou de aceitar escrita direta de authenticated na 099. Mesma linha da 092.';

create or replace function public.fn_company_legal_status_upsert(p_patch jsonb)
returns company.legal_status
language plpgsql
security definer
set search_path to 'company', 'public'
as $function$
declare r company.legal_status;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: alterar situação jurídica exige papel admin ou superior'
      using errcode = '42501';
  end if;
  update company.legal_status set
    status      = coalesce(p_patch->>'status', status),
    notes       = coalesce(p_patch->>'notes', notes),
    updated_at  = now()
  where id = (select id from company.legal_status order by created_at limit 1)
  returning * into r;
  return r;
end $function$;

comment on function public.fn_company_legal_status_upsert(jsonb) is
  'Escreve company.legal_status. Autorização no corpo (is_admin), não no grant. Ver 099.';

grant execute on function public.fn_company_identity_upsert(jsonb) to authenticated;
grant execute on function public.fn_company_legal_status_upsert(jsonb) to authenticated;

-- A porta que ficava aberta: escrita direta na base e pela view.
revoke insert, update, delete on company.identity     from authenticated;
revoke insert, update, delete on company.legal_status from authenticated;
revoke insert, update, delete on public.v_company_identity     from authenticated, anon;
revoke insert, update, delete on public.v_company_legal_status from authenticated, anon;

comment on view public.v_company_identity is
  'Somente leitura. Escrita só por fn_company_identity_upsert (099). Não reconceder INSERT/UPDATE/DELETE: a tela Cadastro Empresa é admin+ e a autorização mora na RPC.';
comment on view public.v_company_legal_status is
  'Somente leitura. Escrita só por fn_company_legal_status_upsert (099). Não reconceder.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ ESTA MIGRATION EXIGE MUDANÇA DE FRONT NO MESMO PASSE
-- ═══════════════════════════════════════════════════════════════════════════
-- `src/lib/companyStore.ts` precisa trocar
--     supabase.from('v_company_identity').update(...)
-- por
--     supabase.rpc('fn_company_identity_upsert', { p_patch: ... })
-- e o mesmo para legal_status. **Aplicar só o SQL quebra o Cadastro Empresa** —
-- e quebra em silêncio na tela, porque o store loga e segue.
-- Por isso: front primeiro (ou no mesmo deploy), SQL depois.
--
-- ⚠ E CONFERIR AS COLUNAS ANTES DE APLICAR: escrevi o `update` com os campos que
-- o store manda hoje. Se `company.identity` tiver outros campos editáveis pela
-- tela, eles somem do caminho de escrita — um upsert que ignora campo é pior que
-- um erro, porque salva pela metade. **Não apliquei justamente por isso: falta
-- conferir o payload real da tela contra as colunas da tabela.**
--
-- PROVAS DEPOIS DE APLICAR:
--   a) sessão do dono: Cadastro Empresa salva identidade e situação jurídica;
--   b) sessão sem papel: 42501 com a mensagem;
--   c) UPDATE direto em company.identity como authenticated → permission denied;
--   d) UPDATE pela view como authenticated → permission denied.
