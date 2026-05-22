# Docs — digiai

Centro de documentação interna do app **digiai** (app principal da empresa). Orientado a **equipe, treinamento e divulgação** — não para desenvolvedor (esse usa o `README.md` da raiz do app).

> **Nota importante:** existe também `digiai/docs_sync/` na raiz do app. Apesar do nome, **`docs_sync/` NÃO é documentação de equipe** — é fonte de dados que o app consome em runtime (referenciada por `src/lib/copySeedData.ts`, `src/lib/academyStore.ts`, `src/modules/Biblioteca.tsx` e migration `015_academy_digital_products.sql`). **Não mover, não renomear.**

## O que vai em cada subpasta

| Pasta             | Conteúdo                                                          |
|-------------------|-------------------------------------------------------------------|
| `treinamentos/`   | Roteiros de onboarding, materiais de capacitação interna          |
| `aulas/`          | Apostilas, gravações, slides, exercícios de aula                  |
| `divulgacao/`     | Posts, criativos, copy aprovado, peças de lançamento              |

## Manutenção

- Atualizar `changelog.md` toda vez que o app ganha ou perde feature relevante
- Trocar versões de prints sempre que UI mudar
- Conteúdo definitivo de marca usa peças de `D:\projetos\Marca\`
