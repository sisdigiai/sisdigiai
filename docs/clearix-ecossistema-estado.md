# Clearix — Estado Real do Ecossistema (19 sub-apps)

> Levantamento código + navegação online (Chrome logado, tenant Grupo Mello Óticas).
> Data: 2026-07-11. Polyrepo em `D:\projetos\clearix_eco_full` (cada sub-app = repo próprio, Netlify/Vercel).
> Verdade da suíte vem dos `AGENTS.md` de cada app; URLs seguem `clearix<app>.netlify.app`.

## Verificação online (Chrome Junior, logado)

- **Hub** (`clearixhub.netlify.app`) ✅ — control plane multi-tenant vivo: **4 tenants** (Mello real + 3 sandboxes), **93 usuários** (26 ativos), **11 papéis** (RBAC), **34 entregas** rastreadas (25 atrasadas). Lançador SSO pra 16 apps + Universidade.
- **BI** (`clearixbi.netlify.app`) ✅ — Command Center executivo com dados reais: financeiro (262 lançamentos, R$28,6k receber / R$67,4k pagar, 100 parcelas vencidas, saldo −R$38,8k), Saúde do Ecossistema (Vendas 62 pedidos, Pacientes 10k, Estoque 1.866 SKUs, Growth, Loyalty), reconciliação Vendas↔DRE, DRE completo.

**Conclusão:** o Clearix é uma **suíte SaaS multi-tenant de varejo óptico em produção real** (dados vivos do Mello atravessando vendas, finance, estoque, RH, BI). O que trava não é a tecnologia — é comercial/jurídico (DPA / gap ADR-0020 pra 1ª venda externa).

## Núcleo operacional (produção, dados reais Mello)

| Sub-app | URL | Stack | O que faz | Evidência real |
|---|---|---|---|---|
| **Hub** | clearixhub.netlify.app | Next 16 | Gateway SSO (ticket AES-256, 60s) + admin: tenants, usuários, lojas, papéis, compliance, marcas, custos IA, agentes IA, GEO | 4 tenants · 93 users · 11 papéis |
| **Vendas** | clearixvendas.netlify.app | Next 15 | PDV: caixa, carnês, clientes, orçamentos, contratos, produtos, lentes, anamnese, autorização | códigos reais `042-2026-XXXXX` |
| **Estoque** | clearixestoque.netlify.app | SvelteKit 2 | Inventário: entrada/saída/ajuste/transferência, barcode, etiquetas QR, fotos catálogo (remoção fundo IA), notas-entrada | 1.716 produtos Mello |
| **Lens** | clearixlens.netlify.app | SvelteKit 2 | Catálogo de lentes + pricing engine (SKU, tabela por tenant), simulador de receita, ranking; alimenta Vendas e DCL | — |
| **Finance** | clearixfinance.netlify.app | Next 15 | DRE, fluxo de caixa, contas pagar/receber, conciliação, extratos, NF-e, plano de contas, aportes, pró-labore, leitura fiscal por IA (OpenAI) | 262 lançamentos no BI |
| **DCL / Lab** | clearixdcl.netlify.app | Next 15 | Laboratório: kanban de produção de lentes (receita→montagem→entrega), pedidos, laboratórios, montagens, alertas | commit 02/jul (custo de acordo de lab) |
| **Clínicos** | clearixclinics.netlify.app | Next 15 | Consultório: agenda, anamnese, pacientes, prescrições, profissionais, relatórios, retinografia | — |
| **Paciente** | clearixpaciente.netlify.app | Next 16 | Portal B2C autoatendimento (sem login, via `patient_access_tokens`): receitas, agenda, histórico, carteira, fidelidade, financeiro, contratos | 10k pacientes no BI |
| **BI** | clearixbi.netlify.app | Next 15 | Command center executivo cross-app: ~20 painéis (vendas, DRE, fluxo, estoque, metas, growth, loyalty, projeções, simulador, "perguntar" IA) | financeiro real ao vivo |
| **Client / CRM** | clearixclient.netlify.app | Vite/React | Atendimento WhatsApp multicanal + chatbot builder (flow), templates, autoresponder, analytics; executor da fila de dispatch | onda3 MVPs (02/jul) |
| **Fone** | clearixfone.netlify.app | Vite/React | Ligações: chamadas, campanhas telefônicas, roteiros, follow-ups, cadência RFM, Client 360 | — |
| **RH** | clearixrh.netlify.app | Vite/React | Ponto, escalas, férias, ausências, comissões, folha, PDFs trabalhistas (offline/PWA) | 30.773 linhas de comissão |

## Crescimento / diferencial

| Sub-app | URL | Stack | O que faz | Estado |
|---|---|---|---|---|
| **Marketing** | clearixmarketing.netlify.app | Next 15 (React 18) | Growth: campanhas, leads, segmentação, estúdio criativo IA (GPT + DALL-E), automações, WhatsApp Z-API/Meta, analytics | NO AR (maduro) |
| **Express** | clearixexpress.netlify.app | Next 15 | PDV express — converte lead de campanha em venda (paciente+carrinho+receita+pagamento) com atribuição | NO AR (dashboard enxuto, início) |
| **Loyalty** | clearixloyalty.netlify.app | Next 15 | Fidelidade: pontos, cashback, cupons, níveis, família, regras, campanhas | NO AR (pendências) |
| **AR Vision** | clearixarvision.netlify.app | Next 15 | Prova virtual de armações (AR, MediaPipe + Three.js) + pupilometria por câmera, face-shape, espessura | NO AR (pre-1.0) |

## Infra / interno

| Sub-app | URL | Stack | O que faz | Estado |
|---|---|---|---|---|
| **Atlas** | digiaiatlas.netlify.app | Vite/React Flow | Organograma visual da suíte (20+ apps, schemas, deps, matriz de migração, catálogo RPC, health) — uso interno | NO AR |
| **Import** | interno (on-demand) | Next 15 | "Canivete suíço" de migração de legados (WhatsApp, pacientes, vendas) — onboarding de tenant novo, depois desligado | DEV / interno |
| **Calc** | clearixcalc.netlify.app | Next 16 | Calculadora de grau (PWA grátis, sem login) — isca; 13 calculadoras (espessura, vértice, prentice, DNP…) | NO AR (card próprio) |

## Notas

- **Universidade Clearix** aparece no lançador do Hub = **Clearix Academy**, que vive no **Nexus** (`sisnexus.netlify.app`) — não é sub-app do `clearix_eco_full`.
- Segurança recente em toda a suíte: remoção de `service_role`/fallbacks que furavam RLS, headers HTTP (HSTS/X-Frame), placeholders de SSO.
- URLs marcadas "a confirmar" nos AGENTS seguem o padrão `clearix<app>.netlify.app`; Hub e BI confirmados ao vivo. `clearix_marketing` foge do padrão (React 18 / Tailwind 3 / repo `mellooticas/sis_marketing`).
</content>
