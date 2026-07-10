# Portfólio DIGIAI — Estado Real dos Apps

> Levantamento mecânico das pastas em `D:\projetos` (git + deploy config + README/AGENTS).
> Data: 2026-07-10. Fonte para os cards do módulo Portfólio (`#/portfolio`).
> Legenda de estado: **NO AR** (deploy ativo confirmado) · **FUNCIONA** (infra pronta, deploy provável/não 100% confirmado) · **TRAVADO** (bloqueio real) · **PROTÓTIPO** (sem deploy).

## Resumo executivo

| # | App | Tier | Estado | Deploy | Bloqueio |
|---|-----|------|--------|--------|----------|
| 1 | Clearix (ecossistema, 17 sub-apps) | Âncora | NO AR | Netlify (por app) | Jurídico: DPA/gap ADR-0020 trava 1ª venda |
| 2 | Ótica Sem Improviso (app leitor) | Alavanca | NO AR | Netlify | — |
| 3 | OSI landing | Alavanca | NO AR | Netlify | mudanças de lead/tracking a commitar |
| 4 | DIGIAI App (este) | Infra | NO AR | Netlify | CNPJ em transição RFB |
| 5 | DIGIAI Site | Institucional | NO AR | Cloudflare | — |
| 6 | Clearix Site | Âncora (site) | NO AR | Cloudflare | — |
| 7 | Lumina Box | Suporte | NO AR (interno) | Netlify | URL pública a confirmar; falta monetização |
| 8 | Pulso Control | Autônomo | NO AR | Vercel | manter fila de vídeos |
| 9 | Pulso Hub (site) | Autônomo | PROTÓTIPO | Netlify (config) | URL/domínio ainda placeholder |
| 10 | Polapetit (app) | Incubação | NO AR | Netlify | — |
| 11 | Polapetit Landing | Incubação | NO AR | Netlify | — |
| 12 | Nexus | Suporte | NO AR (parcial) | Netlify | dev ativo, adoção zero |
| 13 | Nipo School | Institucional | TRAVADO | Vercel (config) | bug tabela `profiles` + checklist piloto |
| 14 | Mello Eyewear | Autônomo | FUNCIONA | Netlify | DNS/domínio a confirmar |
| 15 | Qual a Foto | Incubação | FUNCIONA LOCAL | Netlify (config) | worker IA é local; deploy não confirmado |
| 16 | Easy Idiomas | Incubação | TRAVADO | **nenhum** | sem plataforma de deploy definida |
| 17 | DIGIAI MKT | Infra | TRAVADO | não definido | fases centrais (publicação/coleta/painel) não implementadas |

## ⚠ Erros de rota (sidebar aponta pra URL errada/morta)

O `Sidebar.tsx` usa fallbacks de URL que divergem do deploy real:

| Marca | App aponta pra | Real | Ação |
|---|---|---|---|
| Easy Idiomas | `easyidioma.netlify.app` | **não existe** (sem deploy) | remover link ou marcar "em construção" |
| Polapetit | `polapetit.netlify.app` | `polapettiapp.netlify.app` (app) · `polapetit.com.br` (landing) | corrigir URL |
| Pulso | `pulsoprojects.vercel.app` | Vercel (URL a confirmar) + `pulso_hub` Netlify | confirmar e corrigir |
| Qual a Foto | `qualfoto.netlify.app` | deploy não confirmado | confirmar |
| Lumina | `luminabox.netlify.app` | Netlify siteId ok, URL a confirmar | confirmar |

> Fonte canônica das URLs deveria ser `company.digital_assets` (via `useEcosystemUrls`, ADR-0029). Os fallbacks no código estão desatualizados.

---

## Fichas detalhadas

### 1. Clearix — ecossistema (produto-âncora)
- **Arquitetura:** Hub central (SSO gateway + admin) lança ~17 sub-apps via ticket SSO. Contêiner `clearix_eco_full/` com 22 pastas; **polyrepo** (cada sub-app tem seu `.git`, o contêiner não). Backend Supabase comum.
- **Estado:** Produção ativa, evolução contínua (commits jun–jul/2026 em quase todos). `clearix_atlas` no ar em `digiaiatlas.netlify.app`. Foco recente: segurança (remoção service_role, RLS, headers).
- **Sub-apps principais:**
  - `clearix_hub` (Next 16) — gateway SSO + admin central
  - `clearix_vendas` (Next 15) — PDV/núcleo: pedidos, caixa, carnês, entregas (mais movimentado, commit 08/jul)
  - `clearix_client` (Vite) — portal B2B do tenant + atendimento WhatsApp
  - `clearix_paciente` (Next 16) — portal B2C autoatendimento (sem login, por token)
  - `clearix_finance` (Next 15) — DRE, fluxo, NF-e, leitura fiscal por IA
  - `clearix_bi` (Next 15) — BI cross-app
  - `clearix_estoque` (SvelteKit) — inventário, barcode, etiquetas QR
  - `clearix_calc` (Next 16) — calculadora de grau (PWA grátis, lead-magnet)
  - `clearix_atlas` (Vite/React Flow) — admin visual da suíte (NO AR)
  - `clearix_lens` (SvelteKit) — catálogo de lentes + pricing engine
  - outros: ar_vision, clinics, dcl, express, fone, import, loyalty, marketing, rh, docs
- **Bloqueio:** jurídico — minuta DPA / gap ADR-0020 trava a 1ª venda externa.

### 2. Ótica Sem Improviso — app leitor (alavanca crítica)
- **Propósito:** app leitor do manual OSI (28 páginas, 5 módulos) acessado pós-compra.
- **Stack:** React 19 · Vite 6 · Tailwind 4 · @google/genai · sem banco (localStorage).
- **Deploy:** Netlify — `oticasemimproviso.netlify.app`. Git: `6f5840a` 2026-06-09.
- **Estado:** NO AR. Bloqueio: —

### 3. OSI landing (alavanca crítica)
- **Propósito:** landing comercial pública + área interna placeholder; aquisição via Hotmart/Kiwify.
- **Stack:** React 19 · Vite 6 · Tailwind 4 · pixels Meta/TikTok · sem banco.
- **Deploy:** Netlify (`landingoticasemimproviso.netlify.app`). Git: `2d12fbc` 2026-06-09 · ~10 pendências.
- **Estado:** NO AR. Bloqueio: form de leads + fix de tracking pendentes de commit/deploy.

### 4. DIGIAI App (infraestrutura — este painel)
- **Propósito:** painel de comando interno da holding.
- **Stack:** React 19 · Vite · TS · Tailwind 4 · Supabase · Chart.js.
- **Deploy:** Netlify — `sisdigiai.netlify.app`.
- **Estado:** NO AR. Bloqueio: CNPJ em transição na RFB.

### 5. DIGIAI Site (institucional)
- **Propósito:** landing institucional 1 página da holding (`digiai.app.br`), identidade Stitch v2.
- **Stack:** Astro 5 (SSG) · Tailwind 3 · assets em bucket Supabase.
- **Deploy:** Cloudflare Pages, auto-deploy no push `main`. Git: `6bc1a53` 2026-07-09.
- **Estado:** NO AR. Bloqueio: —

### 6. Clearix Site (site do âncora)
- **Propósito:** landing pública do ecossistema Clearix (`clearix.app.br`).
- **Stack:** Astro 5 · Tailwind 3 · sem banco.
- **Deploy:** Cloudflare Pages. Git: `88fd99f` 2026-06-08.
- **Estado:** NO AR. Bloqueio: jurídico (DPA, ligado ao Clearix).

### 7. Lumina Box (suporte)
- **Propósito:** digital signage SaaS (gestão de mídia + player web pra TV) com PIN.
- **Stack:** React 19 · Vite · TS · Tailwind · Supabase.
- **Deploy:** Netlify (siteId ok, URL pública a confirmar). Git: `90586c2` 2026-06-17.
- **Estado:** NO AR (produção interna Lancaster Suzano ~50 dias). Bloqueio: externalização/monetização.

### 8. Pulso Control (autônomo)
- **Propósito:** centro de comando de vídeos curtos faceless (pipeline editorial → publicação assistida).
- **Stack:** Next 16 · React 19 · Supabase · crons Vercel.
- **Deploy:** Vercel (URL a confirmar). Git: `5fac8e3` 2026-07-07.
- **Estado:** NO AR/FUNCIONA. Bloqueio: manter fila de vídeos prontos.

### 9. Pulso Hub (site público do Pulso)
- **Propósito:** site SEO/GEO público do Pulso (home + página por vídeo, Supabase read-only).
- **Stack:** Next 16 · Tailwind 4 · Supabase (anon).
- **Deploy:** Netlify (config pronta, URL ainda placeholder). Git: `7d3e072` 2026-06-29.
- **Estado:** PROTÓTIPO. Bloqueio: publicar site + definir domínio.

### 10. Polapetit — app (incubação)
- **Propósito:** app/simulador da marca Polá Petit (mood board IA + memória pós-festa).
- **Stack:** Vite · React 19 (Three.js/R3F, GSAP) · Supabase · Firebase · @google/genai.
- **Deploy:** Netlify — `polapettiapp.netlify.app`. Git: `766ac5d` 2026-05-25.
- **Estado:** NO AR. Bloqueio: —

### 11. Polapetit Landing (incubação)
- **Propósito:** landing + backend da marca (v2 refatorada).
- **Stack:** Vite/React (client) · Express-like (server) · Drizzle · Supabase · AWS S3.
- **Deploy:** Netlify — `polapetit.com.br`. Git: `8a7f07d` 2026-05-29.
- **Estado:** NO AR. Bloqueio: —

### 12. Nexus (suporte)
- **Propósito:** plataforma multi-produto de aprendizado (OSI/Manual + Clearix University) com IA.
- **Stack:** React 19 · Vite · Express · Supabase · Firebase · Gemini.
- **Deploy:** Netlify — `sisnexus.netlify.app` (landing + `/clearix`). Git: `3224d3f` 2026-07-01.
- **Estado:** NO AR (parcial) — landing pública; MVP em dev ativo (126 tabelas). Verticais idiomas/concursos deprecadas. Bloqueio: adoção zero.

### 13. Nipo School (institucional)
- **Propósito:** ensino musical (pedagogia japonesa) multi-tenant com IA.
- **Stack:** Next 16 · React 19 · TS · Tailwind · Supabase · OpenAI.
- **Deploy:** Vercel (config). Git: `3e4afe4` 2026-05-31.
- **Estado:** TRAVADO — checklist de piloto todo desmarcado + bug ativo na tabela `profiles`. Bloqueio: profiles + go/no-go incompleto.

### 14. Mello Eyewear (autônomo)
- **Propósito:** e-commerce Mello (catálogo via Clearix, checkout Mercado Pago, newsletter).
- **Stack:** React 19 · Vite · Express · Supabase · Mercado Pago · Netlify Functions.
- **Deploy:** Netlify — `mellooticas.com.br` (5 functions). Git: `9c90a08` 2026-07-09.
- **Estado:** FUNCIONA (commit recente ajustando domínio canônico). Bloqueio: DNS/publicação a confirmar.

### 15. Qual a Foto (incubação)
- **Propósito:** avaliação/seleção de fotos — app online + worker local (RawTherapee).
- **Stack:** SvelteKit (web) · Worker Python local · Supabase.
- **Deploy:** Netlify (config, base `apps/web`). Git: `2d4d389` 2026-05-29.
- **Estado:** FUNCIONA LOCAL. Bloqueio: worker é local; deploy do web não confirmado.

### 16. Easy Idiomas (incubação)
- **Propósito:** SaaS para escolas de idiomas (aluno/professor/dashboard).
- **Stack:** React 19 · Vite · TS · Tailwind · Supabase · Gemini.
- **Deploy:** **nenhum** ("a definir"). Git: `e0538bf` 2026-05-29 · 11 pendências.
- **Estado:** TRAVADO. Bloqueio: sem plataforma de deploy + validação manual pendente.

### 17. DIGIAI MKT (infraestrutura de marketing)
- **Propósito:** motor de marketing (prepara publicações multi-marca com gate humano + coleta métricas) que alimenta o hub digiai.
- **Stack:** React 19 · Vite 6 · Tailwind 4 · Supabase (schema `mkt`).
- **Deploy:** não definido (roda local :3001). Git: `0a0437a` 2026-07-09.
- **Estado:** TRAVADO/PROTÓTIPO — só F0 (fundação) concluída; F1–F5 (coleta/publicação/reconciliação/multi-plataforma/painel) pendentes.
</content>
