# docs/migrations — espelho documentado do banco (digiai)

> Backup **legível e versionado** do estado do banco. Padrão DIGIAI (CLAUDE.md §3, desde 2026-05-29).
> Banco isolado deste app — não confundir com o banco Clearix (compartilhado pelos sub-apps clearix_*).

## Conteúdo

| Arquivo | O que é | Fonte de verdade? |
|---|---|---|
| `migrations/` | Cópia fiel das 136 migrations canônicas (`supabase/migrations`) | ✅ **sim** — DDL exato, ordem real |
| `schema.sql` | **Só tabelas.** O espelho completo está em `Cockpit/security/espelhos/digiai/schema-completo.sql` (repo privado), porque este repositório é público | retrato legível |
| `seed-candidates.md` | Contagem por tabela — base para o `seed.sql` | — |

## Prova de contagem (catálogo × escrito)

| objeto | catálogo | escrito | omitido (segredo) | bate |
|---|--:|--:|--:|:--:|
| tabelas | 116 | 116 | 0 | ✅ |
| views | 157 | 157 | 0 | ✅ |
| materialized views | 0 | 0 | 0 | ✅ |
| funções | 156 | 155 | 1 | ✅ |
| triggers | 59 | 59 | 0 | ✅ |
| constraints | 367 | 367 | 0 | ✅ |
| índices | 349 | 349 | 0 | ✅ |
| policies | 203 | 203 | 0 | ✅ |
| cron.job | 11 | 11 | 0 | ✅ |

- Views por `security_invoker`: **true 124** · **OFF explícito 2** · **ausente 31** (soma 157).
- Fora do espelho por pertencerem a extensão: 0 view(s), 0 função(ões); agregadas/window (sem `pg_get_functiondef`): 0. `pg_class` bruto (relkind v): 157.

## Regenerar

```bash
node Cockpit/scripts/dump-db-mirror.mjs digiai
```

Lê token Supabase + URL do `digiai/.env` (nunca expõe). Read-only no banco.

## Ressalvas

- Retrato do banco, não script sequencial: views e funções que dependem umas das outras não estão ordenadas. DDL exato e ordem real: `migrations/`.
- Fora do espelho: tipos/enums, sequências (só o grant), domínios, default privileges, objetos de extensão (voltam com `CREATE EXTENSION`).
- Comandos de cron saem com credencial mascarada. Objeto com segredo cravado no corpo é omitido e listado, não mascarado.
- `seed.sql` **não é gerado automaticamente** — curadoria humana por LGPD (R-013).
