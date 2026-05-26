# DIGIAI · Sistema de Marca v2 — output curado do Stitch

> **Data:** 2026-05-26
> **Fonte:** `stitch_digiai_systemic_rebrand_strategy.zip` (155 arquivos brutos)
> **Curadoria:** 87 arquivos finais selecionados em 8 categorias
> **Status:** entrega aprovada conforme prompt v2 (`prompts-stitch-rebrand-v2.md`)
> **Próximo passo:** aplicar no app + redes (em sessão dedicada)

---

## 🎯 Conceito do logo — "Convergence Grid"

Símbolo construído em **grid 8×8**, com:
- **Quadrado de borda** → a "casa" DIGIAI
- **Hub central em cruz (+)** → infraestrutura compartilhada (agents AI, schema Supabase, design system)
- **4 nós periféricos** → produtos verticais (Clearix, Lumina, Pulso, etc.)

**O que comunica:**
1. **Convergência** — holding tech que orquestra múltiplos produtos sob a mesma engenharia
2. **Precisão óptica** — referência sutil a reticle/mira óptica (ancorada no DNA "ÓTICA E TECNOLOGIA")
3. **Quiet Tech** — grid matemático puro, sem ornamento, escalável de 16px a outdoor

Detalhes técnicos em [`01_design_system/logo_construction_guide.md`](01_design_system/logo_construction_guide.md).

---

## 📐 Tokens canônicos (do DESIGN.md)

### Paleta
| Token | HEX | Uso |
|-------|-----|-----|
| `surface` / `background` | `#0d131f` | Fundo principal (Dark Navy) |
| `surface-container` | `#1a202c` | Cards, containers |
| `surface-container-high` | `#242a36` | Hover, ênfase sutil |
| `primary` | `#c2c6db` | Cor primária (mantida — neutra) |
| `secondary` | `#adcebd` | **Forest Green** acento principal |
| `on-surface` | `#dde2f3` | Texto sobre fundo escuro |
| `outline` | `#909097` | Bordas, dividers |

### Tipografia
| Token | Fonte | Uso |
|-------|-------|-----|
| `display-lg` | **Source Serif 4** 64/72px | Headlines hero |
| `headline-lg` | **Source Serif 4** 48/56px | Headlines página |
| `body-lg` / `body-md` | **Inter** 18/16px | Corpo de texto |
| `label-md` / `label-sm` | **JetBrains Mono** 14/12px | Metadata, labels caps |

### Spacing
- Unidade base: **4px** (toda margem/padding em múltiplos)
- Container max: **1440px**
- Margem desktop: 64px · tablet: 32px · mobile: 16px

### Shapes
- **Cantos: 0px** (Geometric Precision)
- Bordas: 1px solid em `outline-variant` (`#46464c`)
- Sem shadows, sem blur, sem glassmorphism

---

## 🎨 Paleta secundária do ecossistema (acessibilidade AA sobre Dark Navy)

| Produto | Cor de acento | HEX |
|---------|---------------|-----|
| DIGIAI / Clearix | Verde esmeralda | `#10B981` |
| DIGIAI / Clearix Academy | Laranja | `#D97706` |
| DIGIAI / Ótica Sem Improviso | Salmão | `#CB5A43` |
| DIGIAI / Nexus | Slate | `#64748B` |
| DIGIAI / Lumina | Lavanda | `#818CF8` |
| DIGIAI / Pulso | Vermelho escuro | `#991B1B` |
| DIGIAI / Polapetit | Magenta | `#DB2777` |
| DIGIAI / Qual a Foto | Púrpura | `#7C3AED` |
| DIGIAI / Nipo School | Teal | `#0D9488` |
| DIGIAI / App | Slate claro | `#94A3B8` |

Cada produto recebe **UMA** cor de acento secundária — **não substitui** o `secondary` (Forest Green `#adcebd`) da marca-mãe.

---

## 📁 Estrutura de pastas

```
stitch_final/
├── README.md  (este arquivo)
├── 01_design_system/        # 3 docs MD (tokens, voice, logo construction)
├── 02_logo/                  # 9 variações (main, horizontal, stacked, icon, wordmark, favicon)
├── 03_lockups_ecossistema/   # Sistema DIGIAI / [Produto] com 10 cores
├── 04_telas_app/             # 4 mockups (login, dashboard, ativos, clearix landing)
├── 05_redes_sociais/         # 10 templates (avatar×3, LinkedIn×2, IG×4, YouTube×1)
├── 06_papelaria/             # 6 templates (email×2, cartão×2, papel timbrado×2)
├── 07_pitch_deck/            # 5 slides (capa, problema, solução, time, contato)
└── 08_sub_produtos/          # 7 capas Open Graph (1200×630) dos sub-produtos
```

Cada subpasta de visual tem `code.html` (implementação React/Tailwind) + `screen.png` (preview).

---

## 🔄 Diferenças do brand anterior (`src/components/BrandGuidelines.tsx`)

| Item | Antes | Agora |
|------|-------|-------|
| Primary | `#2563EB` Professional Blue | **`#adcebd` Forest Green** (acento) |
| Secondary | `#06B6D4` Sober Cyan | **Removido** |
| Surface | (Tailwind padrão) | `#1a202c` |
| Headlines | Inter Bold | **Source Serif 4** |
| Mono | (não havia) | **JetBrains Mono** |
| Cantos | `rounded-2xl` (~16px) | **0px (sharp)** |
| Shadows | sutis | Removidos |
| Símbolo | (variações antigas) | **Convergence Grid 8×8** |

⚠ **Re-skin do app digiai exige sessão dedicada** — não aplicar tudo de uma vez. Sugestão de ordem: Login → Sidebar → Visao → Portfolio → resto. Sempre validar em browser antes de avançar.

---

## ✅ Validação do output

| Fase do prompt v2 | Status |
|-------------------|--------|
| 1.1 Dashboard com produtos REAIS | ✅ — 10 produtos certos |
| 1.2 Landing "Fabricantes de Lentes" | ✅ — sem badge v4.2 |
| 2.1 Logo principal (5+ variações) | ✅ — 9 variações entregues |
| 2.2 Sistema de lockups + paleta 10 cores | ✅ |
| 3.1 LinkedIn header 1584×396 | ✅ — dark + light |
| 3.2 Avatar 400×400 (3 versões) | ✅ |
| 3.3 IG Feature launch | ✅ |
| 3.4 IG Citação | ✅ |
| 3.5 IG Métrica KPI | ✅ |
| 3.6 IG Story 1080×1920 | ✅ |
| 3.7 YouTube 2560×1440 | ✅ |
| 4.1 Assinatura email HTML (dark+light) | ✅ |
| 4.2 Cartão de visita (frente+verso) | ✅ |
| 4.3 Papel timbrado A4 | ✅ — dark + light |
| 4.4 Pitch deck 5 slides | ✅ — capa, problema, solução, time, contato |
| 5.1 Capas dos 7 sub-produtos | ✅ |

**Cobertura: 100% do prompt v2.**

---

## 📋 O que ficou fora (intencional)

- **Arquivos SVG editáveis**: Stitch entregou em HTML/CSS. Se quiser SVGs nativos pra Figma/Adobe Illustrator, gerar a partir dos `code.html`.
- **Variações da landing Clearix em outras seções** (sobre, preços, contato): só a hero veio. Pode ser pedido em iteração futura.
- **Vídeos / animações**: Stitch não gera vídeo. Se quiser intros/outros animados, usar outro tool (Lottie, After Effects).
- **Print-ready CMYK** dos materiais físicos: as PNG são RGB. Para impressão profissional do cartão, converter pra CMYK + adicionar bleed de 3mm.

---

## 🚀 Próximos passos (sessão dedicada)

1. **Aplicar tokens** em `Cockpit/clearix_design/assets/tokens/` (atualizar `tokens.json`, `tailwind.config.js`, `tokens.css`)
2. **Reescrever** `src/components/BrandGuidelines.tsx` com novo sistema
3. **Migrar gradualmente** os 14 módulos do app (começar pelo Login)
4. **Substituir os 22 ativos digitais** publicados nas redes (avatars, capas)
5. **Imprimir cartões + papel timbrado** quando CNPJ novo sair da transição RFB
6. **Iterar com Stitch** os faltantes (variações da landing, animações)

---

*Última atualização: 2026-05-26*
*Arquivo zip original preservado: `../stitch_digiai_systemic_rebrand_strategy.zip` (4MB, 155 arquivos brutos)*
