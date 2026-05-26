# `docs/brand/` — Sistema de marca DIGIAI

> Esta pasta contém **apenas o material da DIGIAI mãe (holding institucional)** e prompts/outputs Stitch usados pra gerar esse material. Não contém marca dos sub-produtos.
>
> **Princípio canônico** ([ADR-0025](../../../Cockpit/ADR/ADR-0025-distribuicao-3-esteticas-por-app.md)):
> O ecossistema DIGIAI não é uma "marca única" — é uma **família de marcas**. Cada produto tem identidade visual própria. A relação mãe-filho é narrativa ("by DIGIAI" no rodapé), não visual.

---

## Estrutura

```
docs/brand/
├── README.md                                   ← você está aqui
├── rebranding-prompt-stitch.md                 ← prompt v1 (massivo, gerou Stitch v1)
├── prompts-stitch-rebrand-v2.md                ← 16 prompts atômicos (gerou Stitch v2)
├── stitch_digiai_systemic_rebrand_strategy.zip ← 4MB output bruto v2 (155 arquivos)
└── stitch_final/                               ← curadoria v2 (87 arquivos em 8 categorias)
    ├── 01_design_system/      tokens + voice + logo construction
    ├── 02_logo/               9 variações
    ├── 03_lockups_ecossistema/  DIGIAI / [Produto] sistema
    ├── 04_telas_app/          4 UI mockups
    ├── 05_redes_sociais/      10 templates
    ├── 06_papelaria/          6 templates
    ├── 07_pitch_deck/         5 slides
    └── 08_sub_produtos/       7 capas Open Graph
```

---

## Onde mora a marca de cada coisa

| Entidade | Marca canônica vive em | Notas |
|----------|------------------------|-------|
| **DIGIAI** (holding institucional) | `docs/brand/stitch_final/` (esta pasta, Stitch v2) | Editorial Corporate · Forest Green `#adcebd` · Source Serif 4 + Inter + JetBrains Mono · Convergence Grid logo |
| **DIGIAI App** (painel interno) | `src/components/BrandGuidelines.tsx` (a refazer com stitch_final) | Herda 100% da DIGIAI mãe |
| **Clearix** (ecossistema) | `Cockpit/clearix_design/` (Lens v1.0) + `clearix_eco_full/clearix_docs/plataforma/design_system_completo.md` | Azul SaaS-tech · `#2563EB` + cyan + zinc warm · 14 apps com sotaques por `APP_ACCENTS` ([ADR-0026](../../../Cockpit/ADR/ADR-0026-cor-canonica-por-app-fonte-hub-launcher.md)) |
| **Cor de cada sub-app Clearix** | `clearix_hub/src/app/(dashboard)/dashboard/app-launcher.tsx` (`APP_ACCENTS`) | 18 cores cross-app — fonte de verdade definitiva por [ADR-0026](../../../Cockpit/ADR/ADR-0026-cor-canonica-por-app-fonte-hub-launcher.md) |
| **Clearix Vendas** | Stone-Lens (em `clearix_import` lab) → produção via PR | Decidido em [ADR-0025](../../../Cockpit/ADR/ADR-0025-distribuicao-3-esteticas-por-app.md) |
| **Polapetit** | `diferentes/polapetit/DESIGN.md` (Persol heritage gold) | Identidade própria — independente |
| **Pulso Control** | `pulso_control/` (Mykita Berlin engineering) | Identidade própria — independente |
| **Nipo School** | `Cockpit/nipo_school_design/` (Nipo Wa vermelho `#dc2626` + padrões japoneses) | Identidade própria — institucional |
| **Lumina, Qual a Foto, Nexus, demais** | A definir quando forem ao mercado | Sem identidade formalizada ainda |

---

## Princípios de uso

### 1. NÃO harmonize visualmente entre escopos

DIGIAI mãe (Editorial Forest Green) e Clearix (SaaS-tech azul) **não devem** ter visual unificado. São marcas distintas pra públicos distintos. A unidade é narrativa.

Paralelos válidos: Alphabet/Google · Berkshire/Geico/DairyQueen · P&G/Tide/Pampers.

### 2. ANTES de propor qualquer briefing/prompt/ADR novo sobre marca, LEIA

- [`ADR-0025`](../../../Cockpit/ADR/ADR-0025-distribuicao-3-esteticas-por-app.md), [`ADR-0026`](../../../Cockpit/ADR/ADR-0026-cor-canonica-por-app-fonte-hub-launcher.md), [`ADR-0027`](../../../Cockpit/ADR/ADR-0027-stone-lens-promovido-producao-import.md)
- `clearix_eco_full/clearix_docs/plataforma/design_brand/briefing_logo_*_nano_banana.md`
- `Cockpit/clearix_design/README.md`
- `Cockpit/nipo_school_design/README.md`

Muito provável que sua dúvida já tem resposta canônica.

### 3. Experimentos visuais novos no ecossistema Clearix

Vão SEMPRE pro `clearix_eco_full/clearix_import/` primeiro (laboratório), nunca direto em sub-app de produção. Regra **R-018** do Harness.

### 4. Aplicação progressiva da DIGIAI mãe (Stitch v2)

A nova identidade DIGIAI ainda não foi aplicada em código — só está em `stitch_final/`. A migração será gradual:

1. Migrar tokens pra `Cockpit/clearix_design/assets/tokens/` (ou criar `Cockpit/digiai_design/`)
2. Reescrever `src/components/BrandGuidelines.tsx`
3. Re-skin do DIGIAI App (módulo a módulo)
4. Substituir avatares + capas nos 22 `company.digital_assets` cadastrados
5. Imprimir cartão de visita + papel timbrado quando CNPJ novo sair da transição RFB

Cada um desses passos = uma sessão dedicada.
