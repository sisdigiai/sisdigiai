# Piloto assistido Clearix — uma página

> **Rascunho, não contrato.** Documento para o dono revisar e decidir; não foi
> assinado, enviado nem mostrado a ninguém.
> Redigido em 09/09/2026 pelo orquestrador do app digiai.

---

## Procedência de cada termo — o que é fato e o que é decisão

Fonte conferida por mim em 09/09/2026: `Cockpit/forum/02-piloto-pago-clearix.md`
(decisão do fórum, Tema 02) e `Cockpit/forum/00-fatos-canonicos.md`.

| termo | procedência |
|---|---|
| **R$ 349** | **emenda 09/09** (plano de operação do fórum). Antes era R$ 899; os dois são preços reais da tabela pública (R$ 349 / 899 / 1.499 **por mês**) — mudou a faixa escolhida, não o preço |
| "antecipado" | **decisão do fórum**, 2 votos a 1 |
| teto de **2 h/semana** | **emenda 09/09** (antes 5 h). Custo declarado: horas do dono, R$ 0 de infra nova |
| entrada por faixa | **provisório até o tema 07** (custo de servir) — pode mudar |
| isolamento antes de dado | **decisão do fórum**, e é condição de parada — ver "Se falhar" |
| **fiscal fora** | **trava D4**, escrita em `o-que-pode-prometer-2026-09-02.md` |

⚠ **A AMBIGUIDADE CONTINUA, e a emenda não a resolveu — só trocou o número:**
R$ 349 é preço **mensal** na tabela pública. O documento diz "R$ 349 antecipado".
**Continua sem dizer se o piloto é um mês pago adiantado, um valor fechado pelo
piloto inteiro, ou o que acontece no mês 2.** Com o primeiro cliente, essa frase
é a que vira discussão — e a discussão vem depois de ele já ter pago. O dono
decide a redação; eu não escolho por ele.

⚠ E o próprio fórum deixou **uma pergunta em aberto ao dono**, que muda a forma de
cobrar: **quantos dias levou, na prática, a importação da Mello?** É o único dado
real da casa para precificar implantação — e se passar de 40 h, a decisão do fórum
diz que isto **deixa de ser piloto de valor único e vira setup + mensalidade**.

---

## O que é

Um piloto **pago e assistido**: implantamos junto, do lado do cliente, e **o que
ele usar define o que fica**. Não é teste grátis, não é implantação entregue e
abandonada, não é migração.

## O que entra

- **Venda com entrega travada quando o cliente ainda deve** — a trava mais forte
  da suíte, e a que resolve o problema que a ótica sente todo mês.
- **Carnê da própria loja**, com recibo e renegociação.
- **Venda que começa pela receita**, oferecendo só lente que serve ao grau.
- **Kanban da ordem de serviço**: atraso deixa de ser descoberto pelo telefone do
  cliente.
- **Prazo calculado em dias úteis**, não no chute.
- **Ficha do paciente com histórico de receitas** e receita ligada à venda.
- **Estoque e Clinics entram como RESPOSTA**, não como demonstração: "armação
  sumindo" → dois minutos de Estoque; "receita na gaveta" → dois minutos de Clinics.

## O que NÃO entra — e é dito na primeira conversa, não na última

- **Nada fiscal.** Nem nota, nem emissão, nem tela fiscal (D4). Leitura de XML de
  compra pode, e é entrada de mercadoria — não é fiscal.
- **Migração dos dados antigos não está incluída.** O importador atual grava
  colunas que não existem no banco e não tem trava contra duplicar. Se o cliente
  quiser, vira **serviço à parte, orçado, com escopo escrito**.
  > ⚠ **E agora há caso concreto, não só risco teórico:** a importação da própria
  > Mello para o Clearix **subiu dado com erro e valores errados** (dono, 09/09).
  > É a razão de a conferência **por contagem** estar entre as provas de 30 dias,
  > e de as travas de importação virarem item próprio. Não é cláusula defensiva:
  > é o que já aconteceu com a nossa própria loja.
- **Nada de "o sistema avisa o cliente sozinho no WhatsApp".** O que existe e se
  mostra é o botão com mensagem pronta.
- **Não se fala em "pacote de 7 aplicativos"** (D3). Fala-se em módulos: venda,
  laboratório, carnê, estoque, financeiro, painel.
- **Não se promete escolha automática da melhor lente.** O ranking usa preço e
  prazo; "qualidade" é rótulo interno, não histórico — a auditoria proibiu por escrito.
- **Não se oferece teste grátis.** Nenhuma função lê prazo de expiração; o
  mecanismo está em construção (D5).

## Ordem de implantação — isolamento antes de dado

O ambiente do cliente é **isolado e provado isolado antes de qualquer dado real
entrar**. Sem essa prova, não se importa nada. É a ordem que protege os dois
lados: o cliente, de ver dado de outra loja; e nós, de descobrir depois.

## Assistência

Até **2 horas por semana** de acompanhamento — na tela, junto com quem vai usar.
Fora disso, a rotina é do cliente; se ele precisar de mais, conversa-se.

⚠ **Emenda de 09/09: era 5 h, passou a 2 h.** Vale reparar no que isso significa
junto com a outra emenda: o preço caiu 61% (899 → 349) e a assistência caiu 60%
(5 h → 2 h). A relação preço/hora ficou quase igual — a mudança foi de PORTE do
compromisso, não de margem. É o argumento de defesa se um prospect perguntar
por que o acompanhamento encolheu.

## Investimento

**R$ 349, antecipado.** É a faixa de entrada da tabela pública, que é mensal.

⚠ **Antes de usar numa conversa, o dono precisa fechar a redação:** um mês
adiantado? valor fechado pelo piloto todo? o que acontece no mês 2? A tabela diz
"por mês"; o documento diz "antecipado"; entre as duas há uma pergunta que o
cliente vai fazer.

⚠ E a entrada por faixa é **provisória até o tema 07** decidir o custo de servir.
Medi o que dá para medir hoje e mandei os números — o resumo é que **um tenant
não pesa neste banco**: o Clearix vive noutro projeto, e aqui o que cresce é log
de máquina e material de marketing, não cliente.

## O que prova que deu certo — em 30 dias

Da decisão do fórum, e nesta ordem de peso:

1. contrato de uma página assinado;
2. **teste de isolamento registrado, sem vazamento nos dois sentidos**;
3. R$ 349 pagos;
4. importação delimitada, conferida **por contagem**;
5. e a prova que decide: **5 dias corridos de balcão operando sem voltar ao
   sistema antigo**.

> Fatura paga prova **disposição de pagar**. Só o não-retorno ao sistema velho
> prova que **o produto serve**. São marcos diferentes e os dois entram no registro.

## Se falhar — as condições de parada, escritas antes

- **O teste de isolamento falhar → PARA TUDO.** Deixa de ser assunto comercial e
  vira decisão de infraestrutura (banco separado, custo novo) — e a prova "roda em
  produção" se perde.
- **A implantação passar de 40 h** → o modelo muda: vira setup + mensalidade.
- **Dois prospects seguidos recusarem explicitamente pelo preço** → a ressalva
  registrada no fórum passa a valer (cobrar o preço cheio antes de existir caso de
  referência eleva a barreira justamente quando o caso é o ativo que falta).

O piloto acaba com decisão explícita dos dois lados: continua, ajusta ou para.
Nada renova sozinho.

---

## Nota de honestidade sobre o números

Quando se falar de volume, o número é **20.676 ordens de serviço** — o do tenant
real. O total de 48 mil inclui três ambientes de teste sintéticos, e não se usa.
Está registado assim porque **foi assim que quase saiu errado**.
