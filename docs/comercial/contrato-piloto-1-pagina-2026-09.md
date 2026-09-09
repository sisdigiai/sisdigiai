# Piloto assistido Clearix — uma página

> **Rascunho, não contrato.** Documento para o dono revisar e decidir; não foi
> assinado, enviado nem mostrado a ninguém.
> Redigido em 09/09/2026 pelo orquestrador do app digiai.

---

## ⚠ ANTES DE LER O RESTO: quatro termos que eu NÃO consegui conferir

Estes vieram da **decisão 60 do fórum**, relatada pelo Orquestrador Geral. **Não
existem em nenhum documento deste repositório** — procurei em `docs/comercial/`,
no changelog e na Spec:

| termo | estado |
|---|---|
| **R$ 899 antecipado** | ⚠ não conferido — não achei a origem |
| **teto de 5 h/semana** de assistência | ⚠ não conferido |
| **isolamento antes de dado** | ⚠ não conferido |
| **fiscal fora do escopo** | ✅ **este eu confirmo** — é a trava D4, escrita em `o-que-pode-prometer-2026-09-02.md` |

**Preço errado num contrato é pior que contrato nenhum**, e valor eu não invento.
O dono confirma os três primeiros antes de isto sair daqui.

O resto do documento — o que entra, o que não entra e o que não se promete — está
ancorado em `docs/comercial/o-que-pode-prometer-2026-09-02.md`, que foi levantado
lendo o código, não a Spec.

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

⚠ *Termo relatado, não conferido — ver o quadro do topo.*

## Assistência

Até **5 horas por semana** de acompanhamento — na tela, junto com quem vai usar.
Fora disso, a rotina é do cliente; se ele precisar de mais, conversa-se.

⚠ *Teto relatado, não conferido — ver o quadro do topo.*

## Investimento

**R$ 899, antecipado.**

⚠ *Valor relatado, não conferido — ver o quadro do topo.* **Confirmar antes de
usar em qualquer conversa.**

## Como termina

O piloto acaba com uma decisão explícita dos dois lados: continua, ajusta ou para.
Nada renova sozinho.

---

## Nota de honestidade sobre o números

Quando se falar de volume, o número é **20.676 ordens de serviço** — o do tenant
real. O total de 48 mil inclui três ambientes de teste sintéticos, e não se usa.
Está registado assim porque **foi assim que quase saiu errado**.
