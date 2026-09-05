# O QUE O AGENTE COMERCIAL PODE PROMETER — Clearix, piloto pago e assistido

> Levantado no código em 02/09/2026 pelo subagente VENDEDOR do orquestrador
> (55 leituras de código + queries agregadas no banco de produção, sem PII),
> conferido e gravado pelo orquestrador geral. **Regra deste anexo: só entra
> capacidade com tela/rota/função encontrada no código.** As travas do dono
> (D3/D4/D5, `Cockpit/estrutura-da-empresa-2026-08-31.md`) e a auditoria de
> 30/08 valem por cima de tudo: nada de emissão fiscal, nada de "pacote de 7
> apps", nada de migração automática, nada de demo self-service com prazo.
> Este é o par do despacho `_DESPACHO_DO_DIGIAI_2026-08-31_funcao_comercial.md`
> — lá estão as proibições; aqui está o que PODE.

## Números que a operação real sustenta (podem virar frase de venda)

Medidos em 02/09 no banco, só no tenant real (Grupo Mello):

| O que | Número |
|---|---|
| Pacientes cadastrados | **15.845** |
| Vendas registradas | **20.312** |
| Ordens de serviço acompanhadas (produção) | **20.676** |
| Receitas arquivadas e pesquisáveis | **5.862** |
| Parcelas de carnê administradas | **56.369** |
| Vendas nos últimos 30 dias | **209 vendas · R$ 94.445** |
| OS em andamento agora / prontas para retirada | **122 / 48** |
| Montagens registradas com montador e custo | **936** |
| Linhas de extrato bancário processadas na conciliação | **36.080** |
| Etiquetas de produto impressas | **2.174** |
| Catálogo de lentes: lentes reais / laboratórios ativos | **20.904 / 83** |

Frase honesta que esses números autorizam: *"O sistema roda todo dia numa rede
real de óticas há anos — hoje ele carrega quase 16 mil pacientes, mais de 20
mil vendas e mais de 20 mil ordens de serviço, e no último mês processou 209
vendas."* Nunca dizer "vários clientes": **é um grupo, e é a nossa casa.**

---

## VENDAS (clearix_vendas)

### 1. Entrega travada quando o cliente ainda deve — a mais forte da suíte
- **Dor:** o vendedor entrega o óculos, o cliente some, e o dono descobre no
  fim do mês que saiu mercadoria com saldo aberto.
- **Capacidade:** a tela de entregas **bloqueia a entrega quando há saldo
  restante sem carnê**, mostra o valor devido na cara do operador, e a entrega
  só sai com **assinatura do cliente na tela** + recibo de entrega em PDF/A4.
- **Prova:** `clearix_vendas/src/app/vendas/entregas/page.tsx` (linha 342:
  `bloqueadoPorPagamento = hasRemainingBalance && !hasCarne`; assinatura via
  `react-signature-canvas`; recibo em `src/lib/pdf-recibo-entrega`).
- **Demo em 2 min:** apontar uma OS com "Saldo restante R$ X" e mostrar que o
  botão não deixa passar; entregar uma quitada colhendo assinatura na tela.

### 2. Carnê próprio da loja (crediário) com recibo e renegociação
- **Dor:** ótica de bairro vive de carnê, e o carnê vive num caderno.
- **Capacidade:** carnês por venda, baixa de pagamento com **recibo térmico na
  hora**, renegociação formal, contrato do carnê com **verificação pública por
  código**, promissórias/documentos do carnê.
- **Prova:** `clearix_vendas/src/app/carnes/page.tsx` (recibo térmico,
  `ModalRenegociarCarne`, `DocumentosCarneActions`);
  `src/app/contratos/verify/[hash]/page.tsx`; banco: 56.369 parcelas.
- **Demo em 2 min:** dar baixa numa parcela e imprimir o recibo — o efeito
  visual mais imediato para dono de loja pequena.
- **Cuidado:** renegociação tem **zero uso real** — demonstrar sim; citar como
  "usada todo dia", não.

### 3. Venda que começa pela receita e só oferece lente que serve
- **Dor:** vendedor novo oferece lente que não existe para o grau; laboratório
  devolve, cliente espera duas vezes.
- **Capacidade:** busca de produto **a partir do grau da receita** (índice
  mínimo por esférico/cilíndrico) + matriz de compatibilidade que barra
  combinações impossíveis de tratamento antes de fechar a venda.
- **Prova:** `clearix_vendas/src/app/vendas/busca-receita/page.tsx`
  (`calcularIndiceMinimo`); `src/lib/validations/lensCompatibility.ts`.
- **Demo em 2 min:** digitar receita de grau alto e ver o filtro sozinho.

Também reais e citáveis: orçamento impresso/PDF (`src/app/orcamentos/`),
garantia como fluxo próprio (71 registradas), segundo par na venda (168 no
histórico).

---

## DCL — laboratório e montagem (clearix_dcl)

### 1. Kanban da OS: ninguém mais descobre atraso pelo telefone do cliente
- **Capacidade:** quadro de toda OS por etapa (registrado → pago → produção →
  pronto → montagem → chegou → entregue), linha do tempo por pedido, alertas
  de pedidos críticos e página só de alertas.
- **Prova:** `clearix_dcl/src/app/kanban/page.tsx`, `src/app/alertas/page.tsx`,
  `src/app/api/alertas/criticos/route.ts`,
  `src/components/timeline/PedidoTimeline.tsx`. Banco: 122 em andamento agora,
  48 prontas para retirada.

### 2. Promessa de prazo calculada em dias úteis, não no chute
- **Prova:** `clearix_dcl/src/lib/utils/sla-calculator.ts` (`addBusinessDays`).
- **Demo:** criar/editar pedido e ver a data prometida aparecer sozinha.

### 3. Comparação de preço e prazo entre laboratórios antes de comprar a lente
- **Capacidade:** para a lente vendida, lista as alternativas equivalentes com
  custo efetivo (acordo negociado) e prazo, ranqueadas — **a escolha final é
  sempre da pessoa**. Sustenta: 20.904 lentes, 83 laboratórios.
- **Prova:** `clearix_dcl/src/lib/data/lentes-repository.ts:394`
  (`rpc_canonical_best_purchase`);
  `src/components/forms/wizard-steps/components/SeletorMelhoresOpcoesCompra.tsx`.
- **LIMITE OBRIGATÓRIO (auditoria):** dizer "compara **preço e prazo**". NUNCA
  qualidade, histórico de atraso, garantia ou refação — não entram no cálculo.
- É o momento "uau" da demo.

Bônus: painel de montagens com produtividade e custo por montador (936
registradas) e botão de WhatsApp com mensagem pronta (`src/lib/utils/whatsapp.ts`
— abre wa.me, **não é disparo automático**; vender como "mensagem pronta em um
clique", nunca "avisa sozinho").

---

## CLINICS — pacientes e receitas (clearix_clinics)

### 1. Ficha do paciente com histórico de receitas que não se perde
- **Prova:** `clearix_clinics/src/app/dashboard/pacientes/[id]/page.tsx`,
  `prescricoes/[id]/imprimir/page.tsx`, CEP automático (`src/app/api/cep/`),
  CPF validado (`src/lib/cpf.ts`). Banco: 15.845 pacientes, 5.862 receitas.

### 2. Receita ligada direto na venda
- **Prova:** `attach-prescription-to-order-modal.tsx` + busca por receita no
  Vendas. Melhor demonstrada dentro do fluxo de venda.

### 3. Agenda de atendimentos
- **Prova:** `src/app/dashboard/agenda/page.tsx`, `use-appointments.ts`.
- **Cuidado:** para ótica sem optometrista, "se você atende, tem onde marcar"
  — não é o centro do produto. Anamnese digital existe mas tem **8 usos
  reais** — aparece sob pergunta, não vira número nem rotina prometida.

---

## ESTOQUE (clearix_estoque)

### 1. Entrada de mercadoria lendo a nota do fornecedor (XML)
- **Prova:** `clearix_estoque/src/lib/services/fiscal.service.ts:193-205`
  (`importarXml`), telas em `src/routes/(app)/notas-entrada/`.
- É *leitura* de nota de compra — não confundir nem deixar confundir com
  *emissão* (proibida, D4).

### 2. Etiqueta com código de barras impressa da própria tela
- **Prova:** `src/routes/(app)/impressao/`, `EtiquetaBOPP.svelte`,
  `PrintPreview.svelte`. Banco: 2.174 etiquetas impressas.

### 3. Saldo por loja, transferência e movimentação rastreada
- **Prova:** `transferencia/`, `movimentacoes/`, `ajuste/`, ficha com fotos.
  Banco: 2.196 produtos, 3.105 movimentações.
- **Cuidado:** tela de inventário existe, **zero inventários feitos** no tenant
  real — mostrar só se perguntarem.

---

## FINANCE (clearix_finance)

### 1. Contas a pagar/receber com alertas
- **Prova:** `contas-pagar/`, `contas-receber/`, `lancamentos/`,
  `alertas/page.tsx`, `alertas-financeiros.tsx`.

### 2. Conferência do extrato do banco contra o que a loja registrou
- **Prova:** `conciliacao/` (fila, batch, cartões), leitores OFX de Itaú/BB/
  Nubank (`clearix_bi/src/lib/reconciliation/parsers/`), testes do parser.
  Banco: **36.080 linhas de extrato processadas**.

### 3. Plano de contas e centro de custo prontos para ótica
- **Prova:** `plano-contas/`, `centros-custo/`, `agenda-contabil/page.tsx`.
- **TRAVA DURA:** as pastas `notas-fiscais/` existem no código e **estão
  proibidas em qualquer conversa** (D4). Não abrir essas telas na demo.

---

## BI (clearix_bi)

### 1. A loja inteira num painel — 50+ painéis prontos
- **Prova:** `clearix_bi/src/app/dashboard/` (vendas/vendedores, fluxo-caixa,
  metas/vendedores, comparador, saude, lojas/[id]…). Ranking de vendedor é o
  que dono de loja pequena mais reage.

### 2. Visão 360 do paciente: quem comprou, quem sumiu, receita vencendo
- **Prova:** `pacientes/360/`, `segmentacao/`, `engajamento/`, `geo/`,
  `receitas/`. "Sua recompra mora aqui."

### 3. Ficha da OS com custo de lente e laboratório
- **Prova:** `operacoes/producao/page.tsx`, `use-production.ts`.
- **Limite:** o BI mostra o resultado da OS; não prometer que "reconstrói por
  que a lente foi escolhida".

---

## HUB (clearix_hub)

### 1. Uma senha só, e cada funcionário vê só o que deve
- **Prova:** `src/lib/sso/launch.ts`/`tickets.ts`; `users/` (convite por
  e-mail, escopo por loja), `roles/`, PIN de autorização (`my-pin-form.tsx`).
- **Demo:** logar uma vez e abrir Vendas, Estoque e BI sem redigitar senha.

### 2. O sino de entregas atrasadas em cima de tudo
- **Prova:** `delivery-alerts-context.tsx` (severidade por cor, dias
  restantes, telefone do cliente à mão). A primeira coisa que o dono veria
  toda manhã.

---

## ROTEIRO DE DEMO — 20 minutos: "do balcão até a entrega sem improviso"

Ambiente: demo controlada/ASSISTIDA — nunca "teste sozinho por X dias" (D5).

1. **(0–2) A dor.** Hub logado: sino de entregas com atrasos por cor. "Hoje o
   atraso te acha pelo telefone do cliente. Aqui ele te acha antes." Um login,
   todos os módulos.
2. **(2–6) A venda que não erra.** Busca por receita: grau alto → o sistema
   filtra o que existe e barra combinação impossível. Orçamento impresso.
3. **(6–10) O momento uau.** DCL: comparação entre laboratórios — preço com
   acordo e prazo lado a lado, e VOCÊ decide. Data prometida em dias úteis.
   (Só preço e prazo; nada de "qualidade automática".)
4. **(10–13) O óculos nunca some.** Kanban da OS + linha do tempo + alertas.
   "É isso que a equipe olha de manhã em vez de ligar pro laboratório."
5. **(13–16) A entrega que protege o caixa.** OS devedora BLOQUEADA; quitada
   entregue com assinatura + recibo. Emendar carnê: baixa com recibo térmico.
6. **(16–19) O dono vê tudo.** BI: mês, ranking de vendedores, fluxo de caixa;
   se sobrar fôlego, 360 do paciente com receitas vencendo.
7. **(19–20) Fechamento honesto.** "Roda todos os dias numa rede real — 209
   vendas e R$ 94 mil só no último mês. A oferta é um piloto pago e assistido:
   implantamos junto, do seu lado, e o que você usar define o que fica."

Estoque e Clinics entram como RESPOSTA, não como ato: armação sumindo → 2 min
de Estoque; receita na gaveta → 2 min de Clinics.

---

## NÃO MOSTRAR AINDA (protege a venda)

- **Qualquer tela fiscal** (D4). A leitura de XML de compra no Estoque pode,
  explicando que é entrada de mercadoria.
- **Importadores de dados** — o de vendas grava colunas que não existem no
  banco; nenhum tem trava de duplicação. Migração = serviço assistido nosso.
- **Anamnese como rotina** (8 usos reais) · **Inventário** (zero feitos) ·
  **Renegociação como caso vivo** (zero registradas).
- **"Avisa o cliente sozinho no WhatsApp"** — o demonstrável é o botão com
  mensagem pronta; os envios automáticos existem no motor SEM chave segura de
  desligamento em demo (7 gatilhos, 1 chave). Não ligar, não prometer.
- **Painel "Perguntar" (IA) do BI** — só com ensaio prévio; falha ao vivo
  derruba o resto.

## O que quase entrou e ficou de fora, e por quê

| Quase-argumento | Por que ficou fora |
|---|---|
| "Escolhemos a melhor lente automaticamente" | O ranking usa preço e prazo; "qualidade" é rótulo interno, não histórico. É a promessa que a auditoria proibiu por escrito. |
| "Teste grátis de 7 dias" | Nenhuma função lê prazo de expiração; mecanismo (D5) em construção. Oferta é demo assistida, conosco na tela. |
| "Importamos seus últimos 2 meses" | Importador incompatível com o banco vivo; sem proteção contra duplicar. Vira serviço manual orçado, com escopo nomeado. |
| "48 mil ordens de serviço" | O total inclui 3 ambientes de teste sintéticos. O número honesto do tenant real é **20.676** — e é esse que se fala. |
| "Emita sua nota pelo sistema" | D4. Fora de contrato, proposta, demo e conversa. |
| "Pacote com 7 aplicativos" | D3. Falar em módulos ("venda, laboratório, carnê, estoque, financeiro, painel") sem contar aplicativo. |
| "Gestão clínica completa" | Ficha, receita e agenda são reais; anamnese quase sem uso e o público pode nem ter optometrista. Vender como "receitas que não se perdem". |
