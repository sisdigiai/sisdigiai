-- O portão que faltava na migration 236 (achado abrindo a tela: "permission denied for table
-- raiox_snapshot"). As views nascem `security_invoker`, então quem lê é o USUÁRIO — e ele não tinha
-- direito na tabela de baixo. Era a tela recusando certo, não um bug de permissão mal fechado.
--
-- O portão fica no BANCO, igual ao do Controle (R-037): RLS ligada + política `is_staff()` para
-- `authenticated`. `is_staff()` é STABLE SECURITY DEFINER e exige usuário ativo em `iam.users` com
-- papel super_admin, admin, founder ou staff. Sem isso, a view devolveria o retrato do eco inteiro a
-- qualquer portador da chave anon.
alter table ops.raiox_snapshot enable row level security;

drop policy if exists raiox_snapshot_staff_select on ops.raiox_snapshot;
create policy raiox_snapshot_staff_select on ops.raiox_snapshot
  for select to authenticated
  using (public.is_staff());

grant select on ops.raiox_snapshot to authenticated;

-- Confere lendo como quem vai ler: a view tem de responder ao papel `authenticated`.
-- (A prova real é a tela aberta no navegador — esta linha só garante que o grant existe.)
select has_table_privilege('authenticated', 'ops.raiox_snapshot', 'select') as authenticated_le_a_tabela,
       has_table_privilege('authenticated', 'public.v_raiox_estado', 'select') as authenticated_le_a_view;
