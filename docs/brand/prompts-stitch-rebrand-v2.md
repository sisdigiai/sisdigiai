# Prompts sequenciais pro Stitch — Iteração v2 do Rebranding DIGIAI

> **Versão:** v2.0 · 2026-05-26
> **Estratégia:** Um pedido atômico por vez. Não cole vários prompts juntos.
> **Premissas:** Stitch já entregou v1 (`stitch_digiai_systemic_rebrand_strategy.zip`) com design system + 5 telas. Aceitamos a direção (Quiet Tech / Editorial / Source Serif + Inter + JetBrains Mono / Forest Green + Dark Navy / cantos 0px). Esta v2 corrige erros e completa o que faltou.

---

## Como usar este arquivo

1. **Cole UM prompt por vez** no Stitch. Aguarde o resultado.
2. **Valide** o output antes de avançar pro próximo.
3. Se o Stitch errar em algum detalhe, **responda no chat** com correção específica (ex.: *"refazer o card 3 com o texto correto: 'Clearix Academy', não 'Nexus Academy'"*), NÃO refaça o prompt inteiro.
4. **Não pule fases.** Fase 1 desbloqueia Fase 2, e assim por diante.
5. Cada prompt já contém **contexto mínimo necessário** + **anti-alucinação** (lista de coisas a NÃO fazer).

---

## 🔧 FASE 1 — Correções dos erros da v1

Stitch v1 alucinou em 2 pontos críticos. Estes 2 prompts corrigem.

### Prompt 1.1 — Refazer Dashboard com nomes REAIS dos produtos

```
Refaça a tela "dashboard_digiai_holding" da entrega anterior, mantendo
exatamente o mesmo layout, tipografia (Source Serif 4 + Inter + JetBrains
Mono), paleta (Dark Navy #0A0F1E base, Forest Green #2D4B3E accent,
Off-White #F8F9FA) e cantos 0px.

A ÚNICA mudança: substitua os 10 cards de produtos fictícios (Aura,
Vortex, Grid, Vault, Flux, Prism, Shell, Sentry, Core, Nexus) pelos
nomes REAIS dos produtos da DIGIAI:

1. Clearix — ECOSSISTEMA ÓPTICO
2. Clearix Academy — CONTEÚDO LOW-TICKET
3. Ótica Sem Improviso — ISCA PAGA
4. Nexus — UNIVERSIDADE / LMS
5. Lumina — DIGITAL SIGNAGE
6. Pulso — SO EDITORIAL DE VÍDEO
7. Polapetit — SAAS DE EVENTOS
8. Qual a Foto — APROVAÇÃO DE FOTOS
9. Nipo School — EDUCACIONAL MUSICAL
10. DIGIAI App — PAINEL INTERNO

Mantenha as texturas/imagens dark abstract dos cards, mas associe-as
intencionalmente: Clearix recebe a textura mais sofisticada (é o
produto-âncora); DIGIAI App e Clearix Academy podem ter texturas
diferenciadas; os demais ficam neutros.

NÃO INVENTE produtos novos. NÃO use os nomes fictícios da entrega
anterior.
```

### Prompt 1.2 — Refazer Landing Clearix com terminologia correta do nicho

```
Refaça a tela "clearix_landing_page" da entrega anterior, mantendo
layout, tipografia e paleta.

Correções OBRIGATÓRIAS:

1. A linha que diz "INTEGRADO COM AS MAIORES REDES DO BRASIL" está
   ERRADA. ZEISS, HOYA e ESSILOR não são "redes de óticas" — são
   FABRICANTES DE LENTES OFTÁLMICAS. Substitua por:
   "INTEGRADO COM OS MAIORES FABRICANTES DE LENTES"
   (mantenha os logos ZEISS, HOYA, ESSILOR)

2. Remova o badge "V.4.2 INTELLIGENCE" do topo. Não temos versionamento
   público de marca. Substitua por: "PRODUTO-ÂNCORA · DIGIAI"

3. Remova a tagline secundária "Precision Intelligence" no footer.
   Mantenha apenas: "DIGIAI Tech Holding · Brasil"

Demais elementos (headline serif "Clearix: Precisão geométrica na gestão
da sua ótica", subtexto, CTAs verde + outline, imagem da íris, badge
"IA ATIVA", métrica 99.8%) ficam IGUAIS.
```

---

## 🎨 FASE 2 — Logo principal + sistema de identidade derivada

A entrega v1 mostrou apenas um símbolo "+" pequeno. Precisamos do sistema completo.

### Prompt 2.1 — Logo principal DIGIAI

```
Crie o sistema de logo da marca DIGIAI seguindo o design system
"Geometric Precision" já definido (Quiet Tech, Swiss Design, Source
Serif 4 + JetBrains Mono, Dark Navy + Forest Green + Off-White, cantos
0px, zero gradientes, zero glassmorphism).

Entregáveis:

1. Logo principal (horizontal): símbolo + wordmark "DIGIAI"
2. Logo stacked: símbolo acima, wordmark embaixo
3. Logo apenas wordmark (sem símbolo): "DIGIAI" em tipografia
4. Logo apenas símbolo (icon-only)
5. Monogram para favicon: 1 letra ou símbolo em quadrado 64×64px

O símbolo deve evocar:
- Geometria precisa (linha reta, ângulos retos)
- Sensação de "infraestrutura" e "convergência" (uma holding que opera
  múltiplos produtos)
- Referência sutil a óptica/visão (sem ser literal — sem desenho de
  óculos ou íris)

Mostre cada variação em fundo Dark Navy (#0A0F1E) e em fundo Off-White
(#F8F9FA).

Entregue construção do símbolo: clear space (área de proteção), sizing
mínimo (24px de altura), grid construtivo.

NÃO use:
- Símbolos de IA clichês (cérebro, circuito, robô)
- Gradiente
- Mais de 1 cor no símbolo
- Sans-serif futurista (Eurostile, Orbitron) no wordmark
```

### Prompt 2.2 — Sistema de naming visual para os 10 produtos

```
Crie o sistema de lockup visual para os sub-produtos da DIGIAI, usando
o logo principal aprovado.

Formato: "DIGIAI / [Nome do Produto]"
- "DIGIAI" em wordmark padrão
- Separador "/" em Off-White com opacidade 40%
- Nome do produto em Source Serif 4 ou Inter Medium (escolher e ser
  consistente)

Mostre o lockup aplicado nos 10 produtos:

1. DIGIAI / Clearix
2. DIGIAI / Clearix Academy
3. DIGIAI / Ótica Sem Improviso
4. DIGIAI / Nexus
5. DIGIAI / Lumina
6. DIGIAI / Pulso
7. DIGIAI / Polapetit
8. DIGIAI / Qual a Foto
9. DIGIAI / Nipo School
10. DIGIAI / App

Cada produto recebe UMA cor de acento secundária (que NÃO substitui o
Forest Green do principal), pra diferenciar visualmente. Sugira essa
paleta secundária de 10 cores (preferência: tons sóbrios, não vibrantes,
todos com contraste AA sobre Dark Navy). Mostre paleta lado a lado.

NÃO crie logo separado pra cada produto. NÃO use ilustração específica
de cada vertical. Mantenha unidade visual sob a marca-mãe DIGIAI.
```

---

## 📱 FASE 3 — Redes sociais (1 prompt = 1 deliverable)

### Prompt 3.1 — Header LinkedIn DIGIAI (1584×396)

```
Crie o cover/header LinkedIn da página corporativa DIGIAI no formato
1584×396 px.

Conteúdo:
- Lado esquerdo: wordmark "DIGIAI" em Source Serif 4 grande
- Centro-direita: tagline "Infraestrutura tech operada por IA"
- Canto inferior direito: 3 metadata em JetBrains Mono caps:
  "SUZANO · BRASIL · FUNDADA 2026"

Fundo: Dark Navy #0A0F1E com textura geométrica sutil (linhas finas
ortogonais em Off-White com opacidade 5%) — referência ao "grid
construtivo" do design system.

NÃO use:
- Foto de equipe ou pessoas
- Stock de "AI" (cérebro, ondas, partículas)
- Mais de 2 cores no design

Output esperado: PNG 1584×396 + alternative em variação mono-light
(mesmo design em fundo Off-White).
```

### Prompt 3.2 — Avatar perfil DIGIAI (400×400)

```
Crie o avatar de perfil para LinkedIn/Twitter/GitHub da DIGIAI no
formato 400×400 px quadrado.

Use o monogram criado na Fase 2.1 (favicon), centralizado em fundo
Dark Navy #0A0F1E.

Padding: clear space generoso (símbolo ocupa máximo 60% da área).

Forneça 3 versões:
1. Símbolo Off-White em fundo Dark Navy
2. Símbolo Forest Green em fundo Dark Navy
3. Símbolo Dark Navy em fundo Off-White (versão clara pra contextos
   onde fundo escuro não funciona)

Output: 3 PNGs 400×400.
```

### Prompt 3.3 — Post Instagram quadrado — template "Anúncio de Feature"

```
Crie um template de post Instagram quadrado (1080×1080) tipo "anúncio
de feature/lançamento".

Estrutura:
- Top (200px): tag em JetBrains Mono caps "LANÇAMENTO · NOVO RECURSO"
  em Off-White com opacidade 60%
- Centro (700px): headline em Source Serif 4 grande, 2-3 linhas máximo.
  Exemplo de copy preenchido: "Calculadora de lentes Clearix. Precisão
  geométrica em 3 cliques."
- Inferior (180px): wordmark DIGIAI à esquerda + CTA outlined "Saiba
  mais" à direita

Fundo: Dark Navy #0A0F1E. Acento Forest Green #2D4B3E apenas no CTA
(borda 1px) e em um detalhe geométrico fino (linha horizontal de 1px
abaixo da tag).

NÃO use:
- Foto de produto ou screenshot
- Ilustração
- Mais de 1 cor de acento
- Emoji

Output: PNG 1080×1080 + arquivo editável (Figma frame ou SVG).
```

### Prompt 3.4 — Post Instagram quadrado — template "Citação/Quote"

```
Crie um template de post Instagram quadrado (1080×1080) tipo "citação"
para repostar frases-manifesto da DIGIAI.

Estrutura:
- Aspas " grandes no canto superior esquerdo em Source Serif (opacidade 20%)
- Citação em Source Serif 4 grande, centralizada, máximo 4 linhas
- Atribuição em JetBrains Mono caps abaixo: "— GILBERTO C. SILVA JR ·
  FUNDADOR DIGIAI"
- Wordmark "DIGIAI" pequeno no canto inferior

Exemplo de copy preenchido para o template:
"Não escalamos pessoas. Escalamos sistemas operados por IA."

Fundo: Dark Navy #0A0F1E.
Cor única do texto: Off-White #F8F9FA.

NÃO use citações motivacionais genéricas tipo Steve Jobs. A citação é
PLACEHOLDER — o usuário trocará.

Output: PNG 1080×1080 + arquivo editável.
```

### Prompt 3.5 — Post Instagram quadrado — template "Métrica/KPI"

```
Crie um template de post Instagram quadrado (1080×1080) tipo
"métrica/KPI" pra destacar números da operação.

Estrutura:
- Top: tag JetBrains Mono caps "MÉTRICA INTERNA · MAI/2026"
- Centro: número GIGANTE em Source Serif 4 (200px+), ex: "94.8%"
- Subtítulo abaixo do número em Inter Medium: "Taxa de conversão de
  demonstração para piloto pago"
- Footer: wordmark DIGIAI + label "Atualizado mensalmente"

Fundo: Dark Navy.
Número em Off-White. Detalhe geométrico (linha de 1px Forest Green
abaixo do número, ocupando 30% da largura).

NÃO use:
- Gráficos elaborados (ainda)
- Ícones decorativos
- Emoji

Output: PNG 1080×1080 + arquivo editável.
```

### Prompt 3.6 — Story Instagram 1080×1920 — template "Anúncio"

```
Crie um template de Story Instagram (1080×1920, vertical) tipo
"anúncio rápido".

Estrutura (de cima pra baixo):
- 200px no topo: barra horizontal Forest Green de 4px
- Tag JetBrains Mono: "NOVIDADE DIGIAI"
- Headline Source Serif 4 grande, máximo 3 linhas
- Espaço respiratório (300px+)
- CTA caixa retangular Forest Green com texto "→ DESLIZAR PARA SABER"
- Footer com wordmark DIGIAI + tagline curta

Fundo: Dark Navy com textura geométrica sutil (linhas finas verticais
em Off-White opacidade 4%).

Use safe area do Instagram (margens superiores e inferiores de
~220px para não cortar com UI do app).

NÃO use:
- Foto
- Botão "stickers" do Instagram embutido (o app já tem)
- Mais de 1 cor de acento

Output: PNG 1080×1920 + arquivo editável.
```

### Prompt 3.7 — Capa YouTube DIGIAI (2560×1440)

```
Crie a capa do canal YouTube DIGIAI no formato 2560×1440 px.

Estrutura:
- Centro: wordmark "DIGIAI" em Source Serif 4 GIGANTE (ocupando ~50%
  da largura)
- Abaixo: tagline em Inter Medium "Infraestrutura tech operada por IA"
- Linha sutil Forest Green de 1px abaixo da tagline
- Canto inferior direito: 3 ícones de redes sociais em monoline
  Off-White (Instagram, LinkedIn, TikTok) + handle "@sisdigiai"

Fundo: Dark Navy com gradiente VERY sutil para Surface #1A202C apenas
do topo pro centro (alteração 5% no brilho — não chamativo).

Considere a área visível em todos os devices (mobile vê o centro,
desktop vê tudo). Mantenha conteúdo principal no centro com safe
margins.

NÃO use:
- Foto/avatar
- "Subscribe" textual gigante (YouTube já tem botão)
- Frames de vídeo

Output: PNG 2560×1440 + arquivo editável.
```

---

## 📄 FASE 4 — Papelaria e comunicação

### Prompt 4.1 — Assinatura de email HTML

```
Crie uma assinatura de email HTML compatível com Gmail e Outlook, com
no máximo 600px de largura, no estilo do design system Geometric
Precision DIGIAI.

Estrutura (HTML inline-CSS, sem imagens externas exceto opcional logo):

[Logo DIGIAI 60×60px à esquerda] [Bloco de texto à direita]

Bloco de texto:
- Nome: "Gilberto de Camargo Silva Junior" (Source Serif 4 ou fallback
  Georgia, 16px, bold, #F8F9FA em fundo escuro OU #0A0F1E em fundo
  claro)
- Cargo: "Sócio-administrador · DIGIAI ÓTICA E TECNOLOGIA LTDA"
  (Inter ou fallback Arial, 13px, regular)
- Linha divisória 1px (#2D4B3E ou opacidade 20% do texto)
- Linha de contato: "junior@digiai.com.br · (11) ____-____"
- Linha de site: "digiai.com.br" (com link)

NÃO use:
- Imagens grandes
- Frases motivacionais
- Slogan
- Ícones de rede social coloridos
- Background colorido (apenas mono dark ou mono light)

Entregue 2 versões: dark mode (fundo escuro, texto claro) e light mode
(fundo branco, texto escuro). O código HTML deve ser PURO inline-CSS
(sem <link rel="stylesheet">).
```

### Prompt 4.2 — Cartão de visita 90×50mm

```
Crie um cartão de visita físico em formato 90×50mm (formato brasileiro
padrão), com 2 lados (frente e verso), no design system Geometric
Precision DIGIAI.

FRENTE:
- Lado esquerdo (40%): wordmark "DIGIAI" em Source Serif 4 grande
  (vertical ou horizontal, escolher)
- Linha divisória vertical 1px em Forest Green
- Lado direito (60%):
  - Nome: "Gilberto de Camargo Silva Junior"
  - Cargo: "Sócio-administrador"
  - Empresa: "DIGIAI ÓTICA E TECNOLOGIA LTDA"
  - Telefone: "(11) ____-____" (placeholder)
  - Email: "junior@digiai.com.br" (placeholder)
  - Site: "digiai.com.br" (placeholder)

VERSO:
- Centralizado: o monogram (favicon) em escala grande, cor Off-White
  sobre Dark Navy
- Footer pequeno: "Infraestrutura tech operada por IA · Suzano · Brasil"

Considere bleed de 3mm para impressão (área total 96×56mm com bleed).

NÃO use:
- Foto
- QR code (incluir só se houver site real publicado)
- Gradiente
- Mais de 2 cores

Output: PDF print-ready (CMYK) frente + verso + arquivo editável.
```

### Prompt 4.3 — Papel timbrado A4 (proposta comercial)

```
Crie um template de papel timbrado A4 (210×297mm) para propostas
comerciais e contratos da DIGIAI, no design system Geometric Precision.

Estrutura:

HEADER (60mm do topo):
- Wordmark DIGIAI em Source Serif 4 (não gigante, ~24pt)
- Linha horizontal 1px Forest Green abaixo
- Endereço, CNPJ, contato em JetBrains Mono pequeno (8pt) à direita:
  "DIGIAI ÓTICA E TECNOLOGIA LTDA · CNPJ 12.549.582/0001-49"
  "Rua General Francisco Glicério, 940 · Jardim Guaio · Suzano-SP"
  "junior@digiai.com.br · (11) ____-____"

CORPO (área editável de 150mm):
- Texto exemplo Lorem Ipsum em Inter 11pt, espaço entrelinha 1.5
- Margem esquerda 25mm, direita 20mm

FOOTER (30mm da base):
- Linha horizontal 1px Forest Green
- "Página 1 de 1" centralizado em JetBrains Mono 8pt
- Wordmark DIGIAI pequeno no canto inferior direito

Versão padrão é light mode (fundo branco, texto Dark Navy). Crie
também uma versão dark mode (uso digital, não impressão).

NÃO use:
- Marca d'água gigante atrás do texto
- Ornamentos decorativos
- Cor de fundo no corpo

Output: PDF A4 frente + arquivo editável (Word/Pages compatível ou
Figma).
```

### Prompt 4.4 — Apresentação institucional (slide template)

```
Crie um template de apresentação institucional em formato 16:9
(1920×1080) para o pitch da DIGIAI, com 5 slides exemplo no design
system Geometric Precision.

SLIDE 1 — Capa:
- Wordmark DIGIAI gigante centralizado
- Tagline "Infraestrutura tech operada por IA"
- Footer: data + autor placeholder

SLIDE 2 — Problema:
- Headline serif: "O varejo óptico brasileiro decide com palpites."
- Bullet list com 3 pontos em Inter
- Métrica grande à direita: "62% das óticas independentes operam sem
  análise de dados"

SLIDE 3 — Solução:
- Headline: "Clearix. O ecossistema operado por IA."
- 3 colunas com features do produto (texto + ícone monoline)

SLIDE 4 — Time/Empresa:
- Headline: "Operação enxuta por design."
- Card único centralizado: foto-placeholder + nome "Gilberto C. Silva
  Jr." + cargo "Fundador & Sócio-administrador"
- Métricas pequenas: "100% das quotas · 2026"

SLIDE 5 — Contato:
- Wordmark DIGIAI
- Email + site + WhatsApp grandes
- QR code placeholder

Mantenha consistência: Source Serif 4 headlines, Inter body, JetBrains
Mono metadata, Dark Navy + Forest Green + Off-White, cantos 0px.

NÃO use:
- Animações
- Fotos de stock corporativas
- Gradientes
- Mais de 5 cores no deck

Output: PDF + arquivo editável (Keynote/PowerPoint compatível ou Figma).
```

---

## 🎨 FASE 5 — Identidade derivada dos 7 sub-produtos

(Lumina, Pulso, Polapetit, Qual a Foto, Nipo School, Nexus, OSI — Clearix já tem.)

### Prompt 5.1 — Capa visual de cada sub-produto

```
Para cada um dos 7 sub-produtos da DIGIAI, crie uma "capa de produto"
no formato 1200×630 px (Open Graph / preview de link), usando o lockup
"DIGIAI / [Produto]" definido na Fase 2.2 e a cor de acento secundária
atribuída a cada um.

Produtos a entregar (NÃO TROCAR NOMES, NÃO INVENTAR):

1. DIGIAI / Lumina
   Subtítulo: "Digital signage para lojas físicas"
   Imagem-conceito: textura geométrica abstrata sugerindo luz / tela

2. DIGIAI / Pulso
   Subtítulo: "Sistema operacional editorial para vídeo"
   Imagem-conceito: linhas verticais em ritmo (onda sonora abstrata)

3. DIGIAI / Polapetit
   Subtítulo: "SaaS para eventos e festas infantis"
   Imagem-conceito: formas geométricas levemente lúdicas (mas sem ser
   infantilizado — manter sobriedade DIGIAI)

4. DIGIAI / Qual a Foto
   Subtítulo: "Aprovação de fotos para fotógrafos"
   Imagem-conceito: grid de quadrados (referência a contact sheet)

5. DIGIAI / Nipo School
   Subtítulo: "Educacional musical · ADNIPO Suzano"
   Imagem-conceito: pauta musical abstrata em linhas finas

6. DIGIAI / Nexus
   Subtítulo: "Universidade / LMS AI-first"
   Imagem-conceito: rede de pontos conectados (referência a knowledge
   graph)

7. DIGIAI / Ótica Sem Improviso
   Subtítulo: "Primeira isca paga do ecossistema Clearix"
   Imagem-conceito: estrutura tipográfica editorial (referência a guia
   PDF profissional)

Cada capa deve:
- Ter o lockup "DIGIAI / [Produto]" no topo esquerdo
- Subtítulo em Inter Medium no centro-superior
- Imagem-conceito ocupando 60% da área
- Cor de acento do produto aplicada em UM detalhe pequeno (não no
  fundo inteiro)
- Fundo Dark Navy

NÃO use:
- Logo separado para cada produto
- Foto de pessoas
- Ilustração de mascote
- Cores vibrantes / saturadas

Output: 7 PNGs 1200×630 + arquivos editáveis.
```

---

## 🚀 Pós-Stitch: aplicação

Depois das 5 fases acima entregues e aprovadas, abrir um chat novo com agente Claude pedindo:

1. **Migrar tokens** do output Stitch (DESIGN.md) pra `Cockpit/clearix_design/assets/tokens/` e `tailwind.config.js`
2. **Reescrever** `src/components/BrandGuidelines.tsx` com novo sistema
3. **Aplicar incrementalmente** nos 14 módulos do app (começar por Login → Dashboard → Visão → resto)
4. **Atualizar** todos os 22 `company.digital_assets` com novos visuais (handles + capas)
5. **Versionar** os arquivos finais em `docs/brand/final/` (commit + push)

---

## 📋 Checklist de validação por fase

Use este checklist depois de cada fase entregue:

### Fase 1
- [ ] Dashboard mostra Clearix, Lumina, Pulso, Polapetit, Qual a Foto, Nipo, Nexus, OSI, Clearix Academy, DIGIAI App (nenhum inventado)
- [ ] Landing Clearix diz "Fabricantes de Lentes" não "Redes"
- [ ] Não tem badge "v.4.2 Intelligence"

### Fase 2
- [ ] Logo em 5 variações entregue
- [ ] Sistema "DIGIAI / [Produto]" funciona pros 10
- [ ] Paleta secundária de 10 cores sóbrias entregue

### Fase 3
- [ ] 7 peças de rede social entregues nos formatos corretos
- [ ] Texto editável (não chapado em raster)
- [ ] Safe areas respeitadas

### Fase 4
- [ ] 4 peças de papelaria entregues
- [ ] Assinatura HTML funciona em Gmail e Outlook (testar)
- [ ] Cartão tem bleed pra impressão
- [ ] Papel timbrado em PDF print-ready

### Fase 5
- [ ] 7 capas de produto entregues (nomes reais)
- [ ] Acento secundário aplicado coerentemente em cada um
- [ ] Unidade visual com a marca-mãe DIGIAI preservada

---

**Versão deste arquivo:** v2.0 · pode evoluir conforme outputs vão chegando.
