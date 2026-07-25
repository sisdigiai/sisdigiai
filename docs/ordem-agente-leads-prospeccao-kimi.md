# 📥 ORDEM — incluir os 5 leads de prospecção (Kimi) no digiai + no mkt

> **Status: ORDEM (pedido do dono, 2026-07).** Handoff para o agente do app DIGIAI.
> Objetivo: os 5 leads qualificados (prospecção IA, SP/Grande SP) entram no **CRM comercial** e na **esteira de outreach do digiai_mkt**, prontos pra abordagem.
> Regra: dados comerciais seguem [`00-DADOS-COMERCIAIS-CANONICOS.md`] (R-036). Não prometer nada fora da oferta.

## 1. Inserir no CRM (digiai) — ✅ FEITO (2026-07)
- Seed **`supabase/seeds/prospeccao_kimi_sp_2026-07.sql`** já **executado via Management API** (PAT do `.env`) — os 5 leads estão em `ops.commercial_leads` (stage=`lead`, product=`clearix`, owner=Gilberto, source "Prospecção IA (Kimi)…"), com **dor + plano-alvo + mensagem de WhatsApp** no `notes`. Acentos verificados OK no banco.
- O seed é **idempotente** (só insere se a `company` não existir) → seguro re-rodar.
- Conferir: `select company, stage, value_brl, next_step from public.v_commercial_leads where source ilike 'Prospecção IA%';`

**Os 5 leads:**
| Ótica | Lojas | Fit | Plano-alvo | Contato |
|---|---|---|---|---|
| Mil Ótica | 9 | 5/5 | Controle R$899 | (11) 4433-7313 |
| Rubi Ótica | 12 | 5/5 | Crescimento R$1.499 | (11) 4433-7301 / WA 96491-4852 |
| Óticas Mileto | 4 | 4/5 | Controle R$899 | a confirmar |
| Visbel Óticas | 4 | 4/5 | Crescimento R$1.499 | (11) 4056-5110 |
| Óticas Redvision | 2 | 3/5 | Essencial R$349 | a confirmar |

## 2. Ligar no mkt (digiai_mkt — esteira de outreach)
- O CRM lê a esteira por `public.v_marketing_outreach` (→ `marketing.outreach_schedule`). Criar, pra cada lead, uma **cadência de abordagem** (1º toque WhatsApp com a mensagem do `notes`, follow-up D+2 se sem resposta).
- **Confirmar contato de Mileto e Redvision** (estão "a confirmar") antes de agendar o 1º toque — usar **Google Maps + Apify (IG)** (o furo que a IA teve: Instagram bloqueia bot; o Apify do digiai_mkt resolve).
- Respeitar cadência e travas de outreach já existentes no mkt (não disparar em massa; venda consultiva 1:1).

## 3. Enriquecimento pendente (opcional, melhora o lead)
- **@Instagram** dos 5 (a IA não pegou — IG bloqueia): puxar via Apify.
- **Telefone** de Mileto/Redvision: Google Maps/Places.
- Marcar `next_step` e `stage` conforme avança (lead → contatado → conversa → demo).

## 4. Guard-rails (não violar)
- **Grupo Mello = número de prova**, nunca navegar o tenant real ao vivo; demo só no **sandbox**.
- Oferta = a canônica (pública 30 dias grátis/sem cartão; assistida 90 dias + 30% na call).
- Escrita no CRM via RPC `fn_upsert_commercial_lead` (is_staff) no app; o seed usa INSERT direto (rodar como serviço/MCP). Sem service_role no front.

## 5. Contexto (de onde veio)
Prospecção testada ao vivo no Kimi K3 (agêntico, web) com prompt de ICP travado: avaliou 15+ óticas, descartou 9 (anti-fit/loja única), entregou 6 (5 fortes + 1 fraca já cortada). Zero dado inventado. Próximo lote: repetir por praça/segmento (nível Brasil) e via **CNAE 4774-1/00** (todas as óticas do país). Ver [[reference_dados_comerciais_canonicos]] e o funil OSI→Nexus→Clearix.
