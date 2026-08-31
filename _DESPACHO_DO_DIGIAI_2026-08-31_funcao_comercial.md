# Despacho — a função COMERCIAL passa a ser da DIGIAI

**De:** orquestrador geral digiai · **Para:** o agente COMERCIAL/GTM (próxima sessão)
**Decisão do dono, 31/08:** "1 dono das vendas (digiai)" · "2 vamos mudar tudo sim".
Canônico: `Cockpit/estrutura-da-empresa-2026-08-31.md` (D1, D2, D3, D4, D5) e
`Cockpit/modelo-de-motores.md`.

## O que muda

Tu deixas de ser função do ecossistema Clearix e passas a ser **agente de nível
DIGIAI**, reportando ao orquestrador geral. Razão de fundo: **o Clearix não pode
ser dono da própria venda** — quem constrói tem viés sobre o que entrega, e a
auditoria de 30-31/08 mostrou o custo disso (promessa descolada do enforcement).

**Nada do teu trabalho se perde.** Migram contigo: as óticas semeadas no CRM, a
esteira agendada, o manual, o kit de pitch e a trava de dados comerciais (R-036
— cujo canônico JÁ vive em `docs/digiai/docs/04-comercial/`, do lado certo).
Casa de trabalho passa a ser o repo `digiai` (este despacho + `docs/comercial/`).

## O que É teu

- Funil comercial inteiro: `ops.commercial_leads` (projeto digiai), estágios,
  dono, SLA, próximo passo.
- ICP, oferta, preço, limite de promessa, proposta, contrato comercial.
- Prospecção e outreach (com o motor do MKT como instrumento, não como dono).
- Pedir prova ao ecossistema Clearix quando precisar (números da loja, demo,
  resultado de piloto) — eles fornecem, tu decides o que promete.

## O que NÃO é teu
- Construir produto, mexer em app do Clearix, decidir arquitetura — é do eco.
- Publicar/postar — é do MKT.
- Prometer FISCAL: **proibido até segunda ordem** (D4, decisão do dono). Não
  entra em contrato, proposta, material nem demo.
- Prometer "pacote de 7 apps": **não é a oferta** (D3). A oferta é **piloto pago
  e assistido**; a composição do pacote sai do que o primeiro cliente usar.

## Estado real que tu herdas (verificado no banco, 31/08)

- **260 leads** no CRM: **254 de raspagem Apify** (`apify_google_maps` 139 +
  `apify_suzano_regiao` 115), **5 de prospecção por IA** (Kimi, SP/Grande SP, jul/26)
  e **1 interno** (a própria casa). 240 com telefone internacional. **ZERO e-mails** —
  o canal é WhatsApp/telefone.

  > ⚠ **Corrigido em 31/08, relendo o banco.** A primeira versão deste despacho dizia
  > "258 óticas · 232 de raspagem Apify". O 232 estava errado em 22 leads, e a soma
  > 232+5+1 dava 238, não 260. Se você reportar cobertura sobre 232, vai declarar
  > trabalhada uma base que não trabalhou. **A base é 260; as óticas prospectáveis são
  > 259**, porque uma das linhas é o Grupo Mello, que é a casa.
- Estágios: lead 237 · contatado 18 · conversa 4 · cliente 1.
  **O "cliente" é a própria casa** (Grupo Mello, interno). A primeira venda do
  Clearix NÃO aconteceu — nenhuma leitura pode contar esse 1 como tração.
- **Dono do lead: 5 de 260.** Zero dos 18 contatados, zero dos 4 em conversa.
  Todo lead que avançou perdeu o dono no caminho.
- Atribuição: `ops.commercial_leads` GANHOU as colunas (`utm_source`,
  `utm_medium`, `utm_campaign`, `utm_content`, `session_id`, `source_url`,
  `first_touch_at`) em 31/08 — **0 preenchidas**. O MKT vai retroalimentar.
- `digiai_user_uuid` populado 260/260 — é a junta entre captura e CRM.

## Prioridade dos 30 dias (decisão do dono)

**Trabalhar os 258 leads que já estão na casa.** NÃO esperar inbound: conteúdo
gerou zero lead na história e leva meses. O caminho curto para a primeira venda é
o outbound que já foi feito e não foi seguido.

## O bloqueio único, e ele é do dono

**Dono e SLA do lead.** O campo existe; ninguém preenche. Precisa da decisão
dele: quem liga por padrão e em quantas horas o lead precisa ser tocado. Leve a
ele com opções concretas, não como pergunta aberta.

## Regras da casa que valem para ti
- Commit é teu; **push é do dono**.
- Link de contato sempre instrumentado (kit UTM em
  `otica_sem_improviso/docs/divulgacao/kit-utm-links-osi.md`), nunca link cru.
- Dado comercial: fonte única é o canônico R-036. Não inventar número.
- Reporta ao orquestrador geral (sessão `digiai-*` viva; se nenhuma, escreve em
  arquivo neste repo).
