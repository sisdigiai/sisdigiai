# Guia rápido — aplicar Stitch v2 nas redes sociais DIGIAI

> **Tempo total:** 30-45 minutos
> **Escopo:** apenas redes da DIGIAI institucional (não as dos sub-produtos)
> **Princípio:** identidade Editorial Forest Green / Convergence Grid — só DIGIAI mãe, não Clearix

---

## 📂 De onde tirar cada arquivo

Todos os PNGs estão em:
```
D:/projetos/digiai/docs/brand/stitch_final/
```

Subpastas relevantes:
- `02_logo/favicon/screen.png` — monogram quadrado
- `05_redes_sociais/avatar_off_white_em_navy/screen.png` — avatar principal
- `05_redes_sociais/avatar_forest_green_em_navy/screen.png` — avatar alternativo
- `05_redes_sociais/avatar_dark_em_off_white/screen.png` — avatar versão clara
- `05_redes_sociais/linkedin_header_dark/screen.png`
- `05_redes_sociais/youtube_channel_art/screen.png`

---

## ✅ Checklist por rede

### 1. Instagram `@_digiai` (https://instagram.com/_digiai)

- [ ] **Avatar** (perfil)
  - Arquivo: `05_redes_sociais/avatar_off_white_em_navy/screen.png` (400×400)
  - Como: Instagram app/web → Perfil → Editar perfil → Mudar foto do perfil → upload PNG
  - **Recomendado:** versão `off_white_em_navy` (mais legível em feed/grid de Instagram)

- [ ] **Bio** (texto curto)
  - Sugerido: "Infraestrutura tech operada por IA · Suzano-SP · Família de produtos sob a marca DIGIAI"
  - Link: `digiaiatlas.netlify.app` (Atlas) ou domínio próprio quando registrar

### 2. Facebook DIGIAI (https://facebook.com/61586695274933)

- [ ] **Foto de perfil** (160×160 mostrada, mas upload 400×400)
  - Arquivo: `05_redes_sociais/avatar_off_white_em_navy/screen.png`

- [ ] **Foto de capa** (820×312, mostrada em desktop)
  - **Arquivo a usar:** `05_redes_sociais/linkedin_header_dark/screen.png` (1584×396 — não é exato 820×312, mas Facebook auto-crop funciona bem com proporção horizontal)
  - **Atenção:** Facebook pode cortar lados — manter conteúdo principal centralizado

- [ ] **Descrição (Sobre)**
  - Razão social: DIGIAI ÓTICA E TECNOLOGIA LTDA
  - CNPJ: 12.549.582/0001-49 (em transição RFB)
  - Site: a definir
  - Endereço: Rua General Francisco Glicério, 940 - Suzano-SP

### 3. TikTok `@sisdigiai` (https://tiktok.com/@sisdigiai)

- [ ] **Foto de perfil**
  - Arquivo: `05_redes_sociais/avatar_off_white_em_navy/screen.png`
  - TikTok mostra circular, então conteúdo principal precisa estar centralizado (o monogram em quadrado central já está)

- [ ] **Bio** (80 caracteres)
  - Sugerido: "Holding tech operada por IA · família de SaaS verticais BR 🇧🇷"
  - (Emoji bandeira é OK em TikTok pelo público mais informal)

- [ ] **Link**: definir destino (digiaiatlas.netlify.app por enquanto)

### 4. YouTube `@SisDigiai` (https://youtube.com/@SisDigiai)

- [ ] **Foto do canal** (800×800 mostrado em 98×98)
  - Arquivo: `05_redes_sociais/avatar_off_white_em_navy/screen.png` (400×400 — YouTube vai redimensionar)

- [ ] **Imagem de cabeçalho** (2560×1440)
  - Arquivo: `05_redes_sociais/youtube_channel_art/screen.png`
  - YouTube mostra **diferente em mobile vs desktop vs TV** — o template do Stitch já considera safe areas

- [ ] **Sobre** (descrição do canal)
  - Sugerido: "DIGIAI — Infraestrutura tech operada por IA. Família de produtos verticais (Clearix, Lumina, Pulso, Polapetit, Nipo School). Suzano-SP."

### 5. LinkedIn DIGIAI (a confirmar se já tem página da empresa)

> **Se ainda não criou a página da DIGIAI no LinkedIn**, criar primeiro em https://linkedin.com/company/setup/new/

- [ ] **Logo** (300×300 mínimo, recomendado 400×400)
  - Arquivo: `05_redes_sociais/avatar_off_white_em_navy/screen.png`

- [ ] **Capa** (1584×396)
  - Arquivo: `05_redes_sociais/linkedin_header_dark/screen.png`

- [ ] **Descrição da empresa**
  - Razão social, CNPJ, setor "Software Development" + "Information Technology & Services"
  - Tagline: "Infraestrutura tech operada por IA"
  - Site, endereço, tamanho ("1 funcionário" por enquanto)

---

## 📋 Quando terminar

Me avisa quais redes você atualizou. Vou:

1. Atualizar `company.digital_assets` no Supabase mudando o status dos handles de "ativo" pra "ativo com nova identidade Stitch v2"
2. Marcar tarefa do roadmap como feita (se existir)
3. Adicionar timestamp em `docs/brand/stitch_final/README.md` registrando aplicação

---

## ⚠ Dicas práticas

1. **Instagram**: faça upload no app mobile (não no web) — o app mobile tem ferramenta de crop melhor
2. **YouTube**: depois de subir, **valide em 3 dispositivos**: PC desktop, mobile, smart TV (a área visível muda muito)
3. **LinkedIn**: capa em PC desktop é visível inteira; em mobile mostra parte central — manter conteúdo principal no centro
4. **TikTok**: avatar perde qualidade ao redimensionar pra circular pequeno — usar PNG maior se possível
5. **Facebook**: foto de capa muda comportamento por device — testar antes de finalizar

---

## 🚫 NÃO atualize (ainda)

- **OSI** (Ótica Sem Improviso) — IG/Facebook/TikTok/YouTube/Threads/Pinterest/Kwai do OSI estão como "a registrar" em `company.digital_assets`. **Não criar agora** — OSI tem identidade visual própria (decisão futura) e ainda não está em mercado.

- **WhatsApp Business OSI** + **Telegram canal OSI** — idem, fora de escopo desta rodada.

- **LinkedIn pessoal da Taty** — identidade pessoal, não da empresa.
