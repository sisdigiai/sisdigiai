# docs/migrations — espelho documentado do banco (digiai)

> Backup **legível e versionado** do estado do banco. Padrão DIGIAI (CLAUDE.md §3, desde 2026-05-29).
> Banco isolado deste app — não confundir com o banco Clearix (compartilhado pelos sub-apps clearix_*).

## Conteúdo

| Arquivo | O que é | Fonte de verdade? |
|---|---|---|
| `migrations/` | Cópia fiel das 25 migrations canônicas (`supabase/migrations`) | ✅ **sim** — DDL exato, ordem real |
| `schema.sql` | Snapshot estrutural atual (CREATE TABLE + RLS + policies) via Management API | retrato legível (para DDL exato, ver `migrations/`) |
| `seed-candidates.md` | Contagem por tabela — base para decidir o `seed.sql` | — |
| `seed.sql` | Dados de referência/lookup (curado por humano, **sem PII** — LGPD) | a curar |

## Regenerar

```bash
node Cockpit/scripts/dump-db-mirror.mjs digiai
```

Lê `SUPABASE_TOKEN` + `VITE_SUPABASE_URL` do `digiai/.env` (nunca expõe). Read-only no banco.

## Ressalvas

- `schema.sql` é estrutural (colunas/tipos/RLS/policies). Constraints, índices e triggers exatos: ver `migrations/`.
- `seed.sql` **não é gerado automaticamente** — exige curadoria humana por causa da LGPD (R-013).
