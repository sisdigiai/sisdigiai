# Desenho: registro de venda do Clearix ligado ao lead e ao A/B

> Pedido do Orquestrador Geral (14/09/2026), vindo da mudança de foco do dono no canal do MKT: prospecção por WhatsApp (Z-API), A/B OSI × Clearix, metas 1ª venda → 50 → 200.
> **Desenho, não migration.** Medido no banco em 14/09/2026. Decisões do dono no §6.

## 1. A premissa do pedido, corrigida pela medição

O pedido diz que "não existe tabela de VENDA do Clearix". **Existe, e está vazia:** `billing.subscribers` + `billing.payments`. É o registro da recorrência pelo Mercado Pago, e a casa já lê dele em vários lugares:

| já existe | o que faz hoje | linhas |
|---|---|--:|
| `billing.subscribers` | um assinante por contrato: `product` (default `'clearix'`), `plan_name`, `plan_amount_brl`, `status`, `started_on`, **`tenant_ref`** (texto), `mp_preapproval_id` | 0 |
| `billing.payments` | um pagamento por cobrança: `amount_brl`, `paid_at`, `period_start/end`; `mp_payment_id` **aceita nulo** (pagamento fora do MP cabe) | 0 |
| `public.v_vendas_eventos` (MKT) | vira "nova", "renovação" ou "cancelamento" a partir desses dois | — |
| `public.v_billing_mrr`, `v_telao_cobranca`, `v_vendas_canais` | MRR, telão, estado do canal | — |
| `public.billing_upsert_subscriber` | escrita, travada por `is_admin()` (08/09) | — |
| `public.fn_gate_evidencia` | conta `billing.subscribers` como evidência do gate da fase 2 | — |

**Criar uma tabela de venda nova duplicaria o registro que as telas de vendas, MRR e cobrança já leem.** A menor estrutura que resolve é ligar o que já existe ao lead e ao A/B.

## 2. O que falta ligar

| falta | onde fica hoje | proposta |
|---|---|---|
| Quem era o lead | nada: `subscribers` tem nome, e-mail e telefone soltos | `billing.subscribers.lead_id uuid references ops.commercial_leads(id)`. Nulo permitido (cliente que chegou sem passar pelo funil). |
| Qual tenant do crm_erp | `tenant_ref text`, sem regra | Mantém a coluna. Documentar que é o `iam.tenants.id` do crm_erp, **sem FK e sem leitura cruzada**: o digiai não acessa aquele banco. Quem registra a venda copia o id. |
| Braço do A/B | só por mensagem, em `mkt.mensagens`: `marca`, `versao` (a/b/c/d), `canal`, `lead_id` | `variante_ab text` na venda, como **fotografia** gravada no registro. A mensagem pode ser editada ou apagada depois; a atribuição da venda não pode mudar com ela. |
| Canal de origem | `commercial_leads.source` (ex.: `apify_guarulhos_abc`) e `mkt.mensagens.canal` | `canal_origem text` na venda, com vocabulário fechado (§6). |
| Mercado × parte relacionada | nada | `parte_relacionada boolean not null default false`, a mesma regra da 122. |

## 3. O que conta como "uma venda" (proposta)

**Venda = assinante com o primeiro pagamento pago.** É o que a `v_vendas_eventos` já chama de "nova". Contrato assinado sem pagamento é intenção, e o gate da fase 2 fala em "ótica **pagando**". O painel de metas conta:

- vendas de mercado: `product = 'clearix'`, `not parte_relacionada`, `deleted_at is null`, ≥ 1 pagamento com `paid_at`;
- por `variante_ab` e por `canal_origem`;
- conversão por braço: vendas ÷ leads que receberam mensagem daquele braço (denominador em `mkt.mensagens`, do MKT).

## 4. Integração com `stage = 'cliente'` e com o gate da fase 2

**Hoje:**
- `fn_gate_evidencia` conta clientes por `commercial_leads.stage = 'cliente'`, excluindo o grupo **pelo nome da empresa** (`company !~* 'mello|lancaster|digiai'`). O único `cliente` hoje é "Grupo Mello Óticas", excluído por essa regra.
- Ela conta assinantes como `count(*) from billing.subscribers`: **todos**, inclusive apagados, cancelados, de outro produto e de parte relacionada.

⚠ **Achado que muda a 122, ainda não aplicada:** a 122 separou a parte relacionada só na receita. Se a Lancaster for registrada como assinante em `billing.subscribers`, o `assinantes > 0` vira o gate do mesmo jeito que a receita viraria. **A 122 precisa, antes de ser aplicada, filtrar também os assinantes**: `deleted_at is null`, `status = 'active'`, `not parte_relacionada`, com pagamento pago. Isso exige a coluna da §2, então 122 e esta estrutura devem entrar juntas ou nessa ordem.

**Proposta:**
1. **Uma função de escrita** `fn_registrar_venda_clearix(lead_id, tenant_ref, plano, valor, variante_ab, canal_origem, parte_relacionada)`, só admin, na mesma trava da `billing_upsert_subscriber`. Numa transação ela cria o assinante e move o lead para `stage = 'cliente'`. Não mexe em `updated_at` de outros leads e não usa gatilho. A venda e o estágio mudam juntos ou não mudam.
2. **O gate passa a contar venda, não nome de empresa**: clientes de mercado = assinantes Clearix de mercado com pagamento pago. A regex por nome fica só como rede para leads antigos sem venda registrada.
3. **Uma view de incoerência para a sentinela**: lead `cliente` sem venda registrada; venda com `lead_id` cujo lead não é `cliente`; venda de mercado sem pagamento há mais de N dias. É o mesmo padrão "a falha não fala" que a casa já vigia.

## 5. O que não entra

- Nenhuma leitura do crm_erp. `tenant_ref` é cópia manual.
- Nenhuma mudança em `mkt.mensagens` (é do MKT). A fotografia do braço fica na venda.
- OSI avulso continua em `marketing.hotmart_sales`. Isto é só a recorrência do Clearix (e dos outros produtos do MP, que ganham as mesmas colunas sem custo).
- Cobrança, dunning e o webhook do MP ficam como estão.

## 6. Decisões do dono antes de virar migration

| # | decisão | proposta |
|---|---|---|
| 1 | Venda = primeiro pagamento pago, ou contrato assinado? | primeiro pagamento pago |
| 2 | Atribuição do A/B quando o lead recebeu os dois braços | **primeiro toque**: o braço da primeira mensagem de saída ao lead antes da venda |
| 3 | Como o braço aparece em `mkt.mensagens` | **Respondido pelo MKT em 14/09** (migration `20260914_03`, commit `c8ec018` do digiai_mkt, escrita e não aplicada). `oferta` ('osi' \| 'clearix') é o **braço**. `marca` é a voz de quem envia. `variante` = `<oferta>.<template_id>.<versao>`, coluna gerada. As 43 mensagens antigas ficam sem oferta, fora do experimento. **Aceito**, com a atribuição abaixo. |
| 4 | Vocabulário de `canal_origem` | `whatsapp_zapi`, `whatsapp_manual`, `landing`, `indicacao`, `organico`, `outro` |
| 5 | Pagamento fora do Mercado Pago (Pix direto, boleto) conta? | sim, com `mp_payment_id` nulo e comprovante no `notes`. Senão a 1ª venda pode não contar. |
| 6 | Lancaster (123) entra também como assinante? | sim, com `parte_relacionada = true`, depois da 122 ajustada |

### Atribuição do A/B (acordada com o MKT em 14/09)

Na venda ficam **três fotografias**, tiradas por `fn_registrar_venda_clearix` no momento do registro:

- `braco_ab`: a `oferta` ('osi' | 'clearix'). É o que as metas comparam.
- `variante_ab`: a `variante` completa (`oferta.template.versao`). Serve à análise de copy dentro do braço.
- `atribuicao_mensagem_id`: a mensagem que decidiu. Sem ela, a fotografia não se audita.

A regra é a do MKT: a **primeira** saída com `oferta` não nula **para o número do lead**, e não só para o `lead_id`. Uma rede usa o mesmo WhatsApp em várias lojas: a venda pela loja B herda a célula da abordagem à loja A. Contam `status` em ('enviada', 'entregue', 'lida'), com `enviado_em` **antes** da venda. As variações com e sem nono dígito vêm de `mkt.fn_wa_variantes_fone`. A função de venda é `security definer`, então não precisa de grant novo.

Sobre os dados, segundo o MKT em 14/09:

- `enviado_em` é sempre UTC. Nas saídas pela API é a hora do servidor do MKT. Nas digitadas no aparelho (canal `zapi_aparelho`) é o `momment` da Z-API. A comparação com a data da venda deve ser feita em UTC.
- A mesma migration traz `mkt.mensagens.origem` ('site' | 'site-contato' | nulo). É o código que a landing do Clearix põe no fim da mensagem, e ele vem nas mensagens **recebidas**, não nas enviadas. Proposta: preencher `canal_origem` a partir da **primeira mensagem recebida** do número. `site` e `site-contato` viram `landing`; o resto fica com quem registra a venda. É também uma fotografia. É decisão do dono, junto com o item 4.

Venda sem nenhuma saída com oferta: as três ficam nulas. A venda conta para as metas (1ª → 50 → 200) e fica **fora** do A/B. Não se força um braço.

Pré-requisito que não é do app: não há texto de oferta aprovado. Os 2 templates Clearix estão inativos. O primeiro envio do experimento depende de o dono aprovar um texto de cada braço.

## 7. Sequência

1. Dono decide o §6. MKT confirma o item 3.
2. App escreve **uma** migration: colunas em `billing.subscribers` + `fn_registrar_venda_clearix` + view de incoerência + ajuste do gate. A 122 é reescrita junto (receita **e** assinantes).
3. App mostra na tela Comercial o botão "Registrar venda" no lead. Sem tela, a venda vira SQL e a meta de 50 fica sem registro.
4. MKT lê a view de placar por braço para o A/B.
