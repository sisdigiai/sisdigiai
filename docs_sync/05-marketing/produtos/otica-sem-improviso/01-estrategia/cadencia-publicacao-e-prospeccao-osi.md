# Cadência OSI — Regra Travada de Publicação e Prospecção

> **Status:** regra dura (travada 2026-06-17 com o Gilberto). Mudança = nova decisão registrada.
> **Por quê existe:** parar de improvisar ritmo a cada sessão. Esta é a fonte única de verdade da cadência; o `content_calendar` é a agenda que a executa, e a tabela `marketing.cadence_rules` é a versão que o app/agentes leem.

---

## 1. Conteúdo orgânico (Instagram + Facebook, via Meta Business Suite)

| Parâmetro | Regra |
|---|---|
| **Frequência** | **1 publicação por dia útil** (Seg–Sex). Sem domingo. |
| **Horários** | Alternar **almoço (12:00–12:30)** e **fim de tarde (18:30–19:30)**. Ambas as janelas são válidas. |
| **Mix editorial** | Proporção **4:1** — a cada ~4 peças de ensino/valor, 1 de oferta direta. |
| **Identidade** | Toda peça com a **Taty** (Soul ID `2144ffd7-…`). Nunca rosto aleatório. |
| **Canal** | Publicação cruzada FB+IG no mesmo disparo (Business Suite). |
| **Repescagem de conteúdo** | Top performer da semana → repostar como **Story 48h depois**; carrossel que performou bem → regravar como **Reel**. |

**Agenda:** `marketing.content_calendar` (status `ready` → `published`). Hoje há ~45 peças já agendadas (pista até ~17/ago) + acervo de reserva. Quando o acervo encurtar, gerar mais seguindo o mix 4:1.

## 2. Prospecção fria (WhatsApp Business)

| Parâmetro | Regra |
|---|---|
| **Rampa de volume** | D1 = 5 · D2 = 10 · D3 = 15 · **D4+ = 20/dia (teto)** |
| **Teto diário** | **20 mensagens frias/dia.** Não ultrapassar — número novo, risco de ban é o maior risco operacional. |
| **Dias** | Seg–Sex. |
| **Janelas** | **9h–11h** e **14h–17h**. Evitar 12h–13h (almoço) e depois das 19h. |
| **Espaçamento** | 1 mensagem a cada **1–2 min** (nunca em rajada). |
| **Variação** | Alternar as 3 variações de mensagem (evita padrão de spam). |
| **Geografia (escada)** | Suzano → Alto Tietê (Mogi, Itaquá, Poá, Ferraz) → Capital SP → (só então, e via **Ads**, não WhatsApp frio) Brasil. A isca "somos da região" é o que converte; perdê-la = virar spam. |
| **REPESCAGEM** | **1 único follow-up, 48–72h após o 1º contato**, SE a ótica visualizou e não respondeu. Depois disso: silêncio. Quem aceitou "dicas grátis" → mover para `nutricao`, não repescar como venda. |

**Texto da repescagem (follow-up único):**
> Oi! Só pra não te deixar com a mensagem pendente 🙂 O Ótica Sem Improviso tem garantia de 7 dias, então dá pra conhecer sem risco. Se não fizer sentido agora, tudo bem — só me fala que não te incomodo mais 👍

**Pipeline (CRM `ops.commercial_leads`):** `lead → contatado → conversa → negociacao → cliente`. Saídas: `perdido` · `optout` (pediu remoção → tirar do Google Contacts no mesmo dia) · `nutricao`.

**Repescagem operacional:** a fila de follow-up do dia está na **/vendas** do digiai_mkt (`public.v_vendas_hoje`, ramo `sla_vencido`): lead em estágio aberto com toque vencido. A antiga `marketing.v_whatsapp_followups_hoje` foi apagada em 10/09/2026 (migration 120 do digiai): nenhuma tela, rotina ou pessoa a consultava desde pelo menos 31/07/2026 (pg_stat_statements), e o "briefing diário" que este documento citava não existia em nenhuma rotina.

## 3. Travas inegociáveis

- Claude **não envia** mensagem, **não publica**, **não agenda disparo** sozinho (R-011). Prepara tudo; o Gilberto clica.
- Teto de 20/dia no WhatsApp é teto de **mensagens frias** — respostas e conversas em andamento não contam.
- Pediu remoção → `optout` + retirar do disparo no mesmo dia (LGPD/respeito).

## 4. Changelog
- 2026-06-17 — Regra criada e travada (Gilberto). Conteúdo: 1/dia útil, 12h/18:30, 4:1. WhatsApp: rampa até teto 20/dia, Seg–Sex, follow-up único 48–72h. Geografia em escada a partir de Suzano.
- 2026-09-10 — Texto da repescagem alinhado à [promessa padrão](D:/projetos/otica_sem_improviso/docs/divulgacao/promessa-padrao-osi.md): saiu "turma de estreia a R$ 48,50 / vai pra R$ 97" (preço e urgência falsa); entrou a garantia de 7 dias.
