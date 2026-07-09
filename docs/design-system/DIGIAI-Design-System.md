# DIGIAI Design System — Governança (v1.0)

> **Fonte da verdade visual da DIGIAI.** Linguagem "Geometric Precision / Quiet Tech".
> Aposenta o antigo `clearix_design` / "Clearix Lens" azul e o `Cockpit/design_system`.
> Autoridade: a **DIGIAI** (marca-mãe). A fundação governa; a marca veste.

## 1. Onde vive (estado atual — jul/2026)

| Superfície | Local | Status |
|---|---|---|
| Tokens (@theme dark+light) | `digiai` app · `src/index.css` | ✅ aplicado |
| Motor visual (malha + reveal/count-up) | `digiai` app · `src/lib/dhMesh.ts` | ✅ aplicado |
| Toggle de tema | `digiai` app · `src/hooks/useTheme.ts` + header | ✅ aplicado |
| Página `/brand` (o sistema) | `digiai` app · `src/components/BrandGuidelines.tsx` | ✅ no sistema (2 abas desde 2026-07-09) |
| Aba MKT do `/brand` (tema do produto digiai_mkt) | `digiai` app · `src/components/BrandMktAtelie.tsx` + `src/lib/atelieCeu.ts` | ✅ registrado ("Ateliê de Convergência" — evolução da Órbita Cyber-Glass; aplicação no mkt em 4 fases) |
| Página `/como-usar` (aplicação) | `digiai` app · `src/modules/ComoUsarDigiaiHouse.tsx` | ⬅ este pacote |
| `/referencias-design` (benchmark) | `digiai` app | corrigido (card canônico → DIGIAI House) |
| Landing pública | `digiai-site` (Astro) · `digiai.app.br` | ✅ publicado (v5) |

## 2. Camadas

```
1. TOKENS        cor · tipo · espaço · forma · elevação · motion  (@theme / --color-*)
2. EXPRESSÃO     malha de convergência · cromo HUD · grade · motion (reveal/scrub/count/draw)
3. COMPONENTES   botões · campos · seleção · badges/status · cards · tabela · overlays · nav
```
Dark-first (modo nativo) **+ light editorial**. Troca por `data-theme` no `<html>`.

## 3. Princípios (imutáveis — mudança exige ADR)

1. **Quiet Tech** — autoridade calma; sem clichês neon de "IA".
2. **Precisão geométrica** — grade rígida, cantos retos (0px), 90°.
3. **Profundidade por outline** — 1px, sem sombra/blur/vidro.
4. **Forest = ação** — verde âncora só em ação/status; nunca decoração/gradiente.
5. **Token sempre, hardcoded nunca** (na UI; hex como conteúdo/produto é ok).

## 4. Marca

- **Cores:** Base Navy `#0A0F1E` · Âncora Forest `#2D4B3E` · Clarity `#F8F9FA`.
- **Fontes:** Source Serif 4 (títulos) · Inter (corpo) · JetBrains Mono (rótulos/dados).
- **Logo:** Convergence Grid. Cantos retos; clear space 2X; mínimo 24px / 16px (ícone).
- **Voz:** poder silencioso · precisão · inteligência escalável.

## 5. Acessibilidade (regra de ouro)

- Texto ≥ WCAG AA 4.5:1.
- **`action` no dark = tom claro do hue** (`forest-300`), não o `500`.
- Foco visível 2px, offset 2px — nunca remover.
- Todo movimento respeita `prefers-reduced-motion`.

## 6. Ecossistema — co-branding

Assinatura `DIGIAI / Produto`. Uma cor por produto, só como assinatura/acento — nunca UI funcional.

| Produto | Hex | Produto | Hex |
|---|---|---|---|
| Clearix | `#10B981` | Polapetit | `#DB2777` |
| Ótica Sem Improviso | `#CB5A43` | Qual a Foto | `#7C3AED` |
| Nexus | `#64748B` | Nipo School | `#0D9488` |
| Lumina | `#818CF8` | Clearix Academy | `#D97706` |
| Pulso | `#991B1B` | App | `#94A3B8` |

Cyan (`#06B6D4`) é permitido **só escopado ao Clearix** (ADR-0026) — na landing e na OSI/landing pública.

## 7. Governança

- **Mudança de token/princípio:** exige ADR em `digiai-docs`.
- **Marca nova no ecossistema:** adiciona `--color-eco-<produto>` + linha na tabela §6; não forka a fundação.
- **Versionamento:** SemVer. Breaking em token = major.
- **Fonte canônica renderizada:** rotas `#/brand` e `#/como-usar` do app + `digiai.app.br`.

## 8. Histórico

- **v1.0 (2026-07):** adoção do DIGIAI House. Aposenta "Clearix Lens" azul (`clearix_design`) e `Cockpit/design_system`. Landing publicada; app com fundação + /brand no sistema.

---
*DIGIAI Design System v1.0 · Suzano-SP · Made with calm, by DIGIAI.*
