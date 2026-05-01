# Supabase do DIGIAI App

## Projeto
- **Ref:** `hswyopqvnolqpmprqvzh`
- **URL:** https://hswyopqvnolqpmprqvzh.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/hswyopqvnolqpmprqvzh
- **Regiao:** sa-east-1

## Estrutura de schemas

| Schema | Proposito |
|--------|-----------|
| `iam` | Usuarios internos + auditoria universal |
| `ops` | Backlog, decisoes, milestones |
| `metrics` | Cache de metricas dos produtos |
| `finance` | Custos de infra + receita por produto/mes |
| `commercial` | Pipeline de vendas |
| `company` | Cadastro unico da empresa |
| `academy` | Produtos digitais do Academy: oferta, assets, criacao e operacao |
| `public` | Apenas views `v_*` e RPCs expostos via PostgREST |

## Helper functions (public)

- `public.is_staff()` - retorna true se usuario autenticado esta em `iam.users` ativo
- `public.is_founder()` - retorna true se usuario e founder
- `public.current_user_id()` - retorna `iam.users.id` do usuario autenticado
- `public.require_auth()` - levanta excecao se nao autenticado
- `public.tg_set_updated_at()` - trigger generico para `updated_at`

## Migrations

Ordem atual em `migrations/`:

1. `001_create_schemas.sql` - cria os schemas privados iniciais
2. `002_helper_functions.sql` - helper functions em `public`
3. `003_iam_users_and_audit.sql` - usuarios internos + audit logs
4. `004_company_identity.sql` - identidade legal + socios
5. `005_company_contacts.sql` - contatos profissionais
6. `006_company_digital.sql` - dominios, emails, redes e sites
7. `007_company_tools.sql` - ferramentas pagas
8. `008_finance_tables.sql` - snapshots mensais + custos + receita
9. `009_company_legal_status.sql` - LGPD + contratos + ToS
10. `010_ops_tables.sql` - backlog + decisoes + milestones
11. `011_views_grants.sql` - views `v_*` + grants/revokes
12. `012_seed_initial.sql` - founder + registros singleton vazios
13. `013_roles_hierarchy.sql` - hierarquia de roles + helpers adicionais
14. `014_roadmap_tables.sql` - roadmap, tarefas e progresso
15. `015_academy_digital_products.sql` - produtos digitais, assets, criacao e operacao do Academy

## Como aplicar as migrations

### Opcao A - via MCP
Se o MCP do Supabase estiver configurado no projeto, aplique a migration pelo conector.

### Opcao B - via SQL Editor no Dashboard
1. Abrir https://supabase.com/dashboard/project/hswyopqvnolqpmprqvzh/sql
2. Para cada arquivo de `migrations/`:
   - abrir no editor
   - colar o conteudo
   - executar

### Opcao C - via supabase CLI
```bash
npx supabase db push
```

## Seguranca

- RLS ativado em todas as tabelas privadas
- `anon` nao acessa os schemas privados
- `authenticated` acessa dados operacionais apenas com `public.is_staff()`
- auditoria automatica nas tabelas sensiveis
- soft delete com `deleted_at` nas tabelas operacionais

## Principios nao negociaveis

1. Nunca expor schemas privados via PostgREST diretamente
2. Sempre habilitar RLS no momento da criacao da tabela
3. Nunca usar `service_role` no frontend
4. Sempre usar `public.is_staff()` nas policies
5. Nunca commitar `.env` ou `.mcp.json`
