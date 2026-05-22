---
title: Funil OSI → Clearix — Mapa Mestre
last_updated: 2026-05-20
status: rascunho
topic_key: marketing.osi.funil_master
source_kind: consolidacao
supersedes: []
superseded_by: null
---

# Funil OSI → Clearix — Mapa Mestre

> **O que este doc é:** consolidação dos 8 docs canônicos existentes em UMA visão linear do funil, com lacunas marcadas como TODO. Não substitui os docs originais — aponta pra eles. Atualizar este doc quando os docs-fonte mudarem.

> **Status:** rascunho criado em 2026-05-20 a partir da reorientação estratégica "OSI = aquisição, Clearix = produto B2B real".

---

## 0. Sumário executivo

**Tese:** OSI (R$ 97) é isca paga vendida via marketplace Hotmart + Kiwify. **Marketing = espalhar o manual completo aberto** (leitor `oticasemimproviso.netlify.app`) pra viralizar — comprador compartilha com terceiros, gera SEO e autoridade. **Produto pago = camada Nexus de 90 dias** (Doug AI, workshops, gamificação) — só compradores entram, via token enviado pós-compra. É lá que o pitch Clearix B2B acontece de verdade. Meta: **3% dos alunos Academy viram clientes Clearix** (R$ 349–1.499/mês).

**Equação econômica alvo:**
- CAC Clearix via Academy: R$ 500–1.500
- LTV Clearix: ~R$ 15.000 (18 meses × R$ 899 gross margin)
- LTV/CAC alvo: >10x

**Regra cardinal:** Academy nunca compete com Clearix. Se uma decisão melhora Academy mas prejudica Clearix, Clearix vence.

---

## 1. As três camadas

```
┌──────────────────────────────────────────────────┐
│  CAMADA 3 — B2B Enterprise (Clearix Crescimento) │
│  Outbound, franquias, labs. CAC alto, LTV altíssimo│
└──────────────────────────────────────────────────┘
                    ↑ converte top funil
┌──────────────────────────────────────────────────┐
│  CAMADA 2 — B2B SMB (Clearix Essencial/Controle) │
│  Sell-motion direto + indicação. R$ 349–1.499/mês│
└──────────────────────────────────────────────────┘
                    ↑ converte leads qualificados
┌──────────────────────────────────────────────────┐
│  CAMADA 1 — Low-ticket Academy (OSI + 7 guias)   │
│  R$ 97–497. Tráfego pago + marketplace Hotmart/Kiwify│
└──────────────────────────────────────────────────┘
```

OSI é a **primeira porta da Camada 1** — 7 outros guias virão na esteira (ver [arquitetura-ecossistema-apps-oticas.md](../01-estrategia/arquitetura-ecossistema-apps-oticas.md)).

---

## 2. ICP — quem entra no funil

**Perfil primário:** dono(a) ou gestor(a) de ótica independente, 1–5 lojas, sente que operação está manual/improvisada e quer estruturar atendimento.

**Perfil secundário (entrada bottom-up):** vendedor(a) de ótica que faz o curso → aprende método → pede pro dono contratar Clearix (modelo HubSpot/Figma).

**Dores principais (10 tags do funil):**

| Tag | Dor | Produto que toca |
|---|---|---|
| `dor_atendimento_improviso` | Vende no improviso, sem método | OSI (manual) |
| `dor_whatsapp_orcamento` | Orçamento envia e cliente some | Bump Kit WhatsApp + Clearix Marketing |
| `dor_preco_desconto` | Corre pro desconto sem defender valor | OSI (upsell Treinamento) |
| `dor_lentes_argumentacao` | Cliente não entende lente, só compara preço | OSI + futuro guia "Lentes em Linguagem" |
| `dor_time_sem_padrao` | Cada vendedor explica de um jeito | OSI + Clearix Hub |
| `interesse_app_atendimento` | Quer ter o método na palma | Clearix Vendas |
| `interesse_app_whatsapp` | Quer automatizar retomada | Clearix Marketing+Cliente |
| `interesse_app_ia_objecoes` | Quer IA respondendo objeções | Clearix Vendas + AR Vision |
| `comprador_low_ticket` | Validou que paga R$ 97 por método | (alvo Camada 1 contínua) |
| `candidato_ecossistema_apps` | Sinalizou interesse em apps/automação | (alvo Camada 2 — demo Clearix) |

Fonte: [plano-configuracao-funil-osi.md §12](../04-operacao-e-venda/plano-configuracao-funil-osi.md).

**TODO — Lacuna #1:** segmentar ICP por persona (dono × gerente × vendedor), TAM por persona, willingness to pay por perfil.

---

## 3. Fluxo completo end-to-end

```
[TRÁFEGO PAGO Meta Ads]   [ORGÂNICO YouTube/SEO]   [MARKETPLACE Hotmart/Kiwify]
        │                         │                          │
        └─────────────┬───────────┴──────────────────────────┘
                      ↓
            [LANDING OSI + Lead Magnet]
                      ↓
        [NURTURING pré-compra: email + WhatsApp 5–7 dias]
                      ↓
        [CHECKOUT Hotmart OU Kiwify — R$ 97 + bumps + upsell]
                      ↓
              [WEBHOOK gateway → backend]
                      ↓
        [rpc_create_access_token → magic link email]
                      ↓
        [REDEEM → conta Nexus tier "Academy" 90 dias]
                      ↓
        [CONSUMO: manual + app + easter eggs Clearix]
                      ↓
        [SEGMENTAÇÃO automática por tag de dor]
                      ↓
        [QUALIFICAÇÃO: gatilho de trilha certificada concluída
         OU clique em CTA "ver Clearix"]
                      ↓
        [CONVITE AUTOMÁTICO demo Clearix 15 min]
                      ↓
        [DEMO: tenant fictício populado + foco nos módulos do curso
         + oferta "aluno Academy": 30% off 3 primeiros meses]
                      ↓
        [PROPOSTA] → [FECHAMENTO] → [IMPLANTAÇÃO 90d] → [EXPANSÃO]
```

### 3.1 Entrada
- **Tráfego pago seed:** R$ 500/mês Meta Ads, R$ 12,50/dia/conjunto, ABO 2 dias. CPV máximo R$ 1,39, ROAS alvo 2,5, CTR >1,5%. Fonte: [plano-configuracao-funil-osi.md §5](../04-operacao-e-venda/plano-configuracao-funil-osi.md).
- **5 ângulos criativos:** improviso no balcão, objeção de preço, WhatsApp parado, explicação de lente, time sem padrão.
- **Marketplace:** Hotmart (canal primário) + Kiwify (paralelo). Ver §6.

### 3.2 Captura
- Landing OSI: `oticasemimproviso.netlify.app` (provisório, sem domínio próprio ainda)
- Lead magnets ativos: a definir — plano diz 5 lead magnets até dia 60 ([08_academy_low_ticket.md §Plano editorial](../../clearix_eco_full/clearix_docs/clearix_pitch/08_academy_low_ticket.md)).

### 3.3 Nurturing pré-compra
- Email + WhatsApp 5–7 dias. Doc: [regua-recuperacao-carrinho-osi.md](../04-operacao-e-venda/regua-recuperacao-carrinho-osi.md) — recuperação de carrinho T+15min, T+1h, T+6h, T+24h, T+48h, T+72h em 3 segmentos (visitou checkout / iniciou / clicou).

### 3.4 Checkout
- **Hotmart**: `https://go.hotmart.com/B105515825L?dp=1` (produto OSI cadastrado).
- **Kiwify**: a configurar (em paralelo).
- **Estrutura da oferta:**
  - Principal: Manual OSI + App R$ 97
  - Bump 1: Kit Respostas WhatsApp R$ 27 (take rate alvo 25–40%)
  - Bump 2: Checklist 30 segundos R$ 19 (take rate alvo 20–35%)
  - Upsell 1-click: Treinamento OSI na Prática R$ 197 (conv. alvo 8–15%)
- **Ticket médio esperado:** R$ 123 (conservador) — R$ 148 (agressivo).

### 3.5 Onboarding pós-compra (técnico — **load-bearing**)

A arquitetura de 3 camadas (leitor aberto + Nexus gateado) torna o stack token **obrigatório**, não opcional. Email nativo dos gateways NÃO carrega token — só email custom resolve.

- Webhook gateway → `rpc_create_access_token` no Supabase Nexus
- Email transacional via **Resend** com magic link único (Fase 1 ✅ implementada 2026-05-20)
- Magic link → `access-redeem` Edge Function → conta Nexus tier "Academy" 90d
- **Estado atual técnico (2026-05-20):**
  - ✅ Fluxo Kiwify Express local funcionando (`server/email.ts`, `server/webhooks.ts`)
  - ✅ Edge Functions Hotmart/Kiwify/redeem escritas em `supabase/functions/`
  - ⏸ Supabase secrets **não setados**
  - ⏸ Edge Functions **não deployadas**
  - ⏸ Webhook URLs nos painéis Hotmart/Kiwify **não configuradas**
  - ⏸ Nexus frontend **não deployado** publicamente
  - ⏸ Domínio próprio Resend **não comprado**

### 3.6 Ativação (consumo)
- Conteúdo: manual PDF + app (Nexus) + IA Doug (simula cenários)
- 6 módulos, 31 items, 23 lições + 8 workshops (banco Nexus já populado)
- Trilha de aplicação 72h
- **Easter eggs Clearix** (12 pontos de contato — ver [plano-configuracao-funil-osi.md §11](../04-operacao-e-venda/plano-configuracao-funil-osi.md)):
  - "No manual você aprende a responder. No app completo, você treina e consulta em tempo real."
  - "Se hoje você faz essa retomada manualmente, imagine ter uma rotina que lembra, organiza e sugere a melhor mensagem."
  - "O OSI resolve a fala. O ecossistema resolve a rotina."

**TODO — Lacuna #2:** métricas de consumo OSI — % alunos que consomem >50% do conteúdo, dropout por módulo, engagement por tag de dor.

### 3.7 Segmentação
Tags aplicadas automaticamente conforme consumo + perguntas nas réguas de nurturing. Ver §2 (10 tags). Tag `candidato_ecossistema_apps` é o gatilho de qualificação.

### 3.8 Qualificação (MQL)
Trigger: aluno **conclui trilha certificada** OU clica num CTA "ver Clearix" 2+ vezes OU completa 70% do conteúdo.

### 3.9 Demo Clearix
- 15 minutos
- Tenant fictício pré-populado correspondente aos módulos OSI que o aluno consumiu
- Oferta: 30% off nos 3 primeiros meses ("aluno Academy")
- Meta: **20% dos formandos aceitam demo, 15% dos que fazem demo viram cliente em 90d → 3% conversão Academy→cliente Clearix** ([08_academy_low_ticket.md §Gatilho](../../clearix_eco_full/clearix_docs/clearix_pitch/08_academy_low_ticket.md))

**TODO — Lacuna #3:** SOP da proposta — template, ciclo de vendas (dias), objeções comerciais B2B (preço, implementação, integração com sistemas legados).

### 3.10 Fechamento → onboarding cliente Clearix
**TODO — Lacuna #4:** SOP onboarding cliente Clearix — primeiros 30 dias, health check, escalação para Customer Success.

---

## 4. Métricas-alvo por etapa

### Funil OSI (seed)
| Etapa | Taxa alvo | KPI fonte |
|---|---:|---|
| Visitante → lead | 5% | landing |
| Lead → comprador low-ticket | 3–7% | Kiwify/Hotmart |
| Take rate Bump 1 (WhatsApp) | 25–40% | checkout |
| Take rate Bump 2 (Checklist) | 20–35% | checkout |
| Upsell 1-click | 8–15% | checkout |
| Ticket médio | R$ 123–148 | mix bumps+upsell |
| CPV (custo por visita) | ≤ R$ 1,39 | Meta Ads |
| CPA Academy (custo por aluno) | R$ 50–100 seed / R$ 30–60 escala | Meta + orgânico |
| ROAS | ≥ 2,5 | Meta Ads |
| CTR link | > 1,5% | Meta Ads |

### Funil Clearix (saída do OSI)
| Etapa | Taxa alvo | Volume seed |
|---|---:|---:|
| Visitantes landing/mês | — | 1.000 |
| Visitante → lead capturado | 5% | 50 |
| Lead → MQL (demo agendada) | 20% | 10 |
| MQL → demo realizada | 50% | 5 |
| Demo → proposta | 40% | 2 |
| Proposta → fechamento | 50% | 1 |
| CAC Clearix via Academy | R$ 500–1.500 | |
| CAC Clearix direto | R$ 1.500–2.500 | |
| LTV Clearix | ~R$ 15.000 | |
| LTV/CAC alvo | > 10x | |

Fonte: [07_gtm_estrategia.md §Funil de métricas](../../clearix_eco_full/clearix_docs/clearix_pitch/07_gtm_estrategia.md).

**TODO — Lacuna #5:** instrumentar tracking real (não temos os números acima medidos hoje — são alvos). Definir onde cada métrica é coletada (Meta Pixel, Supabase, CRM, planilha?).

---

## 5. Cadência por fase — calendário 12 meses

| Período | Foco | Meta de fechamento | Canal principal |
|---|---|---|---|
| **Mai–Jun 2026** | Academy flooding | 3 low-tickets publicados, 5 lead magnets, **20 alunos, R$ 2k MRR Academy** | A (Academy) |
| **Jul–Ago 2026** | Primeiros pilotos Clearix | **10 clientes full-price, R$ 7k MRR Clearix** | B (direto) |
| **Set–Out 2026** | Crescimento orgânico | 30 clientes, R$ 19k MRR, 1 trilha certificada lançada | A+B |
| **Nov–Dez 2026** | Parceria canal | 1 lab parceiro ativo, 1 franqueadora em negociação | C (parcerias) |
| **Jan–Mar 2027** | PMF | 50 clientes, NPS 50+, churn <3%/mês, NRR 120%+ | A+B+C |
| **Abr 2027** | Escala | 80+ clientes, R$ 50k MRR, equipe 3 (closer+CS+dev) | Todos |

Fonte: [07_gtm_estrategia.md §Calendário](../../clearix_eco_full/clearix_docs/clearix_pitch/07_gtm_estrategia.md).

**Hoje (2026-05-20):** estamos em Mai–Jun — janela de Academy flooding. Foco principal: pôr OSI vendendo, primeira marca de 20 alunos.

---

## 6. Stack — quem faz o quê

| Camada | Ferramenta | Estado |
|---|---|---|
| **Checkout** | Hotmart + Kiwify (paralelo) | Produto OSI configurado em Hotmart; Kiwify TBD |
| **Conteúdo + portal** | Nexus (Vite + Express + Supabase) | Conteúdo pronto, banco populado, frontend deployado em Netlify |
| **Banco** | Supabase `tkbhhbzhlqsgcwljeesg` | 263 tabelas, OSI seed completo |
| **Email transacional** | Resend (free tier) | ✅ Funcionando local — domínio próprio pendente |
| **Email marketing/nurturing** | Indefinido (ActiveCampaign × Mailchimp × RD) | **TODO — Lacuna #6: decidir** |
| **CRM leads** | `growth_omni.leads` (dogfooding Clearix) | Existe — usar |
| **Tráfego pago** | Meta Ads (seed R$500/mês) | Não ativo ainda |
| **Analytics** | GA4 + Meta Pixel + Hotjar | TBD |
| **Agendamento demo** | Cal.com (free) | TBD |

---

## 7. Estado atual vs alvo (checklist crítico)

**Verde = pronto. Amarelo = parcial. Vermelho = bloqueador.**

### Camada 1 — OSI Academy
- 🟢 Produto OSI cadastrado em `content.products` (R$ 97, purchasable, checkout_url Hotmart)
- 🟢 Conteúdo OSI completo (6 módulos, 31 items, 23 lições, 8 workshops, Doug persona)
- 🟢 Hub `/osi` + Paywall `/osi/continuar` no Nexus
- 🟢 RPCs progresso/XP/moedas funcionais
- 🟢 Email transacional Resend (Fase 1)
- 🟡 Order bumps (R$ 27 + R$ 19) — definidos no plano, **não criados no Hotmart/Kiwify ainda**
- 🟡 Upsell R$ 197 Treinamento Taty — definido, **não criado ainda**
- 🔴 Backend Express **não deployado** (Edge Functions escritas, deploy pendente)
- 🔴 Webhook Hotmart **não configurado no painel** (espera deploy)
- 🔴 Webhook Kiwify **não configurado no painel** (espera deploy)
- 🔴 Tráfego pago Meta Ads **não ativo**
- 🔴 Landing OSI sem **domínio próprio** (subdomínio Netlify)
- 🔴 Lead magnets **não publicados** (plano diz 5 até dia 60)
- 🔴 Régua de nurturing **não automatizada** (doc existe, automação não)

### Bridge OSI → Clearix
- 🟢 12 easter eggs definidos (texto pronto)
- 🟡 Easter eggs **inseridos no conteúdo OSI**? Verificar manualmente
- 🔴 Tagging automático por dor — **não implementado**
- 🔴 Gatilho "trilha certificada concluída → convite demo" — **não implementado**
- 🔴 CTA "ver Clearix" rastreável dentro do /osi — **não implementado**

### Camada 2 — Clearix B2B
- 🟢 Posicionamento e pitch definidos
- 🟡 Tenant fictício pré-populado pra demo — existe? **TODO verificar**
- 🔴 SOP da proposta (Lacuna #3) — **não documentado**
- 🔴 SOP onboarding cliente (Lacuna #4) — **não documentado**
- 🔴 Cal.com de demo — **não configurado**
- 🔴 Tracking de funil pipeline (Lacuna #5) — **não instrumentado**

---

## 8. Lacunas — 7 buracos do funil que bloqueiam o pipeline

| # | Lacuna | Onde resolveria | Urgência |
|---|---|---|---|
| 1 | ICP detalhado por persona (dono × gerente × vendedor) | Doc novo em `01-estrategia/icp-personas.md` | Média |
| 2 | Métricas de consumo OSI (% conclusão, dropout, engagement por dor) | Instrumentar Nexus, dashboard | Alta — sem isso não dá pra disparar gatilho de MQL |
| 3 | SOP proposta Clearix (template, ciclo, objeções B2B) | Doc novo `04-operacao-e-venda/sop-proposta-clearix.md` | Alta — necessário antes de Jul–Ago (10 pilotos) |
| 4 | SOP onboarding cliente Clearix (30 dias, health check) | Doc novo `04-operacao-e-venda/sop-onboarding-cliente.md` | Média — só vira urgente quando 1º cliente fechar |
| 5 | Tracking real do funil (Meta Pixel + Supabase + CRM) | Setup ferramentas + dashboard único | Alta — sem isso voamos cego |
| 6 | Stack de email marketing/nurturing (AC × Mailchimp × RD) | Decisão pendente desde 02/05 | Alta — sem isso, sem nurturing automatizado |
| 7 | Pricing/packaging Clearix detalhado (upgrade, bundles, ROI) | Doc novo `clearix_pitch/09_pricing_detalhado.md` | Média |

---

## 9. Próximas decisões em ordem

1. **Resolver bloqueador técnico**: deploy Edge Functions + configurar webhooks Hotmart/Kiwify → OSI passa a vender de verdade.
2. **Instrumentar Lacuna #5 (tracking)** antes de ligar tráfego pago, senão investimento Meta vai sem feedback.
3. **Decidir Lacuna #6 (stack email)** antes de começar a vender — sem nurturing, compradores entram e se perdem.
4. **Documentar Lacuna #3 (SOP proposta)** antes de Jul–Ago (10 pilotos Clearix).
5. **Implementar gatilho MQL** (Lacuna #2 + bridge): tagging automático + trilha certificada → convite demo.
6. **Comprar domínio próprio** `oticasemimproviso.com.br` e verificar no Resend para enviar pra clientes reais (sem isso, só consegue testar com a conta dona).

---

## 10. Referências (docs canônicos)

- [plano-configuracao-funil-osi.md](../04-operacao-e-venda/plano-configuracao-funil-osi.md) — funil OSI canônico (308 linhas)
- [regua-recuperacao-carrinho-osi.md](../04-operacao-e-venda/regua-recuperacao-carrinho-osi.md) — recuperação + tags qualificação (265 linhas)
- [arquitetura-ecossistema-apps-oticas.md](./arquitetura-ecossistema-apps-oticas.md) — 8 guias low-ticket como esteira (240 linhas)
- [08_academy_low_ticket.md](../../../../../clearix_eco_full/clearix_docs/clearix_pitch/08_academy_low_ticket.md) — Academy bridge Clearix (310 linhas)
- [07_gtm_estrategia.md](../../../../../clearix_eco_full/clearix_docs/clearix_pitch/07_gtm_estrategia.md) — GTM master (222 linhas)
- [02_posicionamento.md](../../../../../clearix_eco_full/clearix_docs/clearix_pitch/02_posicionamento.md) — posicionamento Clearix
- [01_plano_mestre.md](../../../../../clearix_eco_full/clearix_docs/clearix_pitch/01_plano_mestre.md) — tese vendedor → dono
- [BRIEFING_NEXUS_AGENT.md](../../../../../diferentes/nexus/docs/academy/produtos/otica-sem-improviso/BRIEFING_NEXUS_AGENT.md) — Nexus técnico

---

## 11. Notas de divergência (atualizações vs docs originais)

- **Plataforma checkout:** doc `08_academy_low_ticket.md` (22/04/2026) decidiu **Kiwify-only**. Decisão atual (20/05/2026): **Hotmart + Kiwify em paralelo** — Hotmart como marketplace primário (já com produto cadastrado, renomeado de "Achismo" → "Improviso"), Kiwify em paralelo para checkout otimizado.
- **Stack email/CRM:** prazo de decisão era 02/05 — ainda pendente (Lacuna #6).
- **Domínio Academy:** doc fala `academy.clearix.com.br`. Hoje provisório em `landingoticasemimproviso.netlify.app` (landing 1, venda) / `oticasemimproviso.netlify.app` (landing 2, manual visual aberto). Domínio próprio `oticasemimproviso.com.br` ainda não comprado.
- **Arquitetura 3 camadas (refinamento 2026-05-20):** confirmado que o **leitor é viral, o Nexus é o pago**. Manual visual completo fica aberto no leitor pra distribuição/SEO/boca-a-boca; o que difere comprador de visitante é o token que dá 90 dias no Nexus premium (Doug AI, workshops, gamificação). Stack token → email custom → redeem volta a ser obrigatório.
