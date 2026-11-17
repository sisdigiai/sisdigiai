# Ordem — Feature "Dossiê + Pitch por lead" (módulo Comercial)

> Origem: dono (Gilberto), 2026-11-14, via agente do Clearix. Caminho R-045: feature do **app digiai** → build do **agente do app**, **curadoria/coordenação do Orquestrador Geral**. O Clearix entrega método + oferta canônica + 1º caso pronto; não mexe no banco/app do digiai além do lead já inserido.
> Oferta canônica = `docs/digiai/docs/04-comercial/00-DADOS-COMERCIAIS-CANONICOS.md` (R-036).

## O que é
Cada lead do CRM ganha **dois artefatos**:
1. **Dossiê (pesquisa reutilizável)** — camada **factual de negócio** do prospect + **estratégia de abordagem** (consultiva). Reaproveitável para qualquer lead.
2. **Pitch gerado** — primeiro toque (WhatsApp/e-mail) + roteiro de diagnóstico, montado a partir do **dossiê + oferta canônica**. Evolui o `proposalGen.ts` de "proposta" para "pitch de abordagem".

## Trava de privacidade (LGPD — obrigatória)
- O dossiê guarda **só negócio e abordagem profissional**: empresas/CNPJ, setor, porte, grupo societário, canais, dor provável, estratégia de conversa.
- **NÃO** armazenar perfil pessoal de indivíduo nomeado (religião, família, hábitos, vida particular tirados de rede social). Religião/crença é **dado sensível** (LGPD art. 5). Isso fica como nota efêmera do vendedor, **fora do banco**.
- Campo de consentimento/origem de contato já existe na tabela (`wa_consentimento_*`, `lgpd_request_at`) — respeitar no fluxo de abordagem.

## Modelo de dados (sugestão — DDL é do app, R-012)
Duas opções, decisão do agente do app:
- **A (mínima):** usar `ops.commercial_leads.notes` para o dossiê (já é onde o 1º caso está). Simples, sem migration.
- **B (estruturada, recomendada se virar rotina):** `ops.lead_dossie` (lead_id, negocio_jsonb, abordagem_jsonb, fontes, atualizado_em) + `ops.lead_pitch` (lead_id, canal, corpo, roteiro, gerado_de_oferta_versao, status). View de leitura em `public` (R-044: tabela no schema de domínio, `public` só view/RPC; view nova `security_invoker` — R-043).
- Identidade: `digiai_user_uuid` já na tabela (R-013) — ok.

## PRÉ-REQUISITO 2 — o playbook genérico está velho (mesmo problema do proposalGen)
O playbook `pitch-clearix-primeira-reuniao` (`ops.playbooks`) ainda tem a **oferta velha** (agenda bloco 25-29 "90 dias, 30% off, setup isento"; objeções e notes idem) e a **prova contaminada** ("50k OS" = total com sintético; real Mello ~21k). **Atualizar para a oferta canônica (piloto pago, sem grátis/sem %off) e os números reais de código.** Já existe um playbook novo, honesto e canônico, de referência: `pitch-clearix-junior-capobianco` (criado 14/11 pelo agente Clearix) — usar de modelo.

## PRÉ-REQUISITO 1 (bloqueia o pitch gerado)
`digiai/src/modules/comercial/proposalGen.ts` ainda gera na **oferta velha** (linhas 5, 20‑22, 42‑44: `trial_days 90`, `discount_pct 30`, "Teste de X dias", "30% OFF"). Isso **contradiz a oferta canônica** (piloto pago e assistido, **sem grátis, sem % off**). A folha canônica já lista esse arquivo como consumidor a atualizar (§6, linha 54).
**Corrigir o proposalGen para a oferta canônica ANTES de ligar o pitch gerado** — senão todo pitch sai errado.

## 1º caso pronto (usar de modelo)
- Lead **já inserido** no CRM: `ops.commercial_leads` id `08412033-07dc-4b35-9e5d-1af88aa58808` — Santo Capobianco Junior / Grupo Capobianco · stage `captado` · utm_campaign `pitch_dirigido_2026_11`. O `notes` traz o dossiê de negócio resumido (sem dado pessoal).
- Dossiê completo (o template a replicar): `clearix_eco_full/clearix_docs/clearix_pitch/pitch-junior-capobianco.md` — estrutura: virada da pesquisa → factual → abordagem consultiva (com a trava "não usar dado pessoal como gatilho") → primeiro toque → roteiro de diagnóstico → oferta canônica → mercado com fonte.

## Ordem de execução sugerida
1. Corrigir `proposalGen.ts` para a oferta canônica (pré-requisito).
2. Decidir modelo A ou B.
3. UI no módulo Comercial: aba "Dossiê" + botão "Gerar pitch" por lead.
4. Portar o caso Junior como seed/exemplo.
