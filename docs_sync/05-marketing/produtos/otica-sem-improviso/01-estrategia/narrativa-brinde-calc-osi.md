---
title: Narrativa — Clearix Calc como isca do funil OSI → Clearix
last_updated: 2026-06-17
status: ativo
topic_key: marketing.osi.narrativa_brinde_calc
source_kind: estrategia
supersedes: []
superseded_by: null
---

# Narrativa — Clearix Calc: a porta de entrada

> **O que este doc é:** o fio condutor único que conecta o brinde grátis (Clearix Calc) à venda do
> OSI e à ascensão pro Clearix. É a fonte de verdade da *história* — todas as peças (landing, e-mail,
> WhatsApp, onboarding, roteiro comercial) contam **a mesma história**, em tamanhos diferentes.

---

## 1. A frase-mãe

> **A calculadora resolve o cálculo. O Ótica Sem Improviso resolve a conversa que vende. O Clearix
> resolve a rotina inteira da ótica.**

Três camadas de valor, fricção crescente, preço crescente — e cada uma entrega de verdade antes de
pedir a próxima. A calc é grátis e imediata; o OSI é low-ticket e aplica em 72h; o Clearix é o
ecossistema B2B. **Distribuição > produto:** a calc espalha a marca pelo uso diário; o desejo nasce
do uso, não do anúncio.

## 2. O arco (a jornada do dono/vendedor de ótica)

```
USO GRÁTIS              →   DESEJO                →   VENDA OSI            →   ASCENSÃO CLEARIX
Clearix Calc no balcão      "isso aqui é bom.          Os 5 Movimentos          "se a ferramenta
todo dia (offline, sem      será que o resto é         (R$ 48,50): a conversa   simples já é assim,
login). Sente a             tão bom assim?"            que faz vender.          imagina a rotina toda."
qualidade Clearix sem
ainda ter Clearix.
```

A calc não é um folheto — é uma ferramenta de trabalho. Quem a usa **experimenta a qualidade do
Clearix antes de pagar nada**. Isso transforma a venda do OSI de "abordagem fria" em "próximo passo
de quem já confia".

## 3. O fio condutor por bloco da calc

Cada uma das 12 calculadoras toca uma dor real do balcão — e cada dor tem um endereço no OSI (resolve
hoje, low-ticket) e no Clearix (resolve a rotina, B2B). Esta é a tradução técnica → comercial:

| Bloco da calc | Dor do balcão (tag do funil) | OSI resolve | Clearix resolve |
|---|---|---|---|
| **Espessura por índice — com desenho da lente em corte** | `dor_lentes_argumentacao` — cliente só compara preço, não entende lente | Movimento 3 (Indicar com Segurança) + Movimento 4 (Sustentar Valor): o desenho vira argumento de venda de índice alto | Clearix Vendas / AR Vision: o argumento visual dentro do atendimento, em escala |
| **Validador de receita + transposição + eixos oblíquos** | erro de OS, retrabalho | tira o improviso técnico — menos refação | Clearix Hub: padroniza a OS de todo o time |
| **Distância ao vértice (LC esf/tórico) + equivalência entre marcas** | insegurança ao indicar lente de contato | indicação com critério, não no chute | Clearix Vendas: histórico + recomendação assistida |
| **DNP/DP + altura de montagem** | montagem errada → lente refeita | precisão de primeira | Clearix Hub: medidas no cadastro do cliente |
| **Prentice/prisma, equivalente esférico, grau de perto** | travar na explicação técnica | fluência técnica que vira confiança na conversa | base técnica viva pro time inteiro |
| **Botão "Enviar no WhatsApp" em cada cálculo** | `dor_whatsapp_orcamento` — orçamento morre no WhatsApp | Movimento 5 (WhatsApp que Converte): retoma com contexto, não cobrança | Clearix Marketing/Cliente: retomada automática + régua |

> O destaque é sempre a **espessura por índice com desenho** — é o cálculo mais "vendedor" (argumento
> visual) e a ponte mais limpa pra dor central do OSI. Toda peça lidera com ele.

## 4. Como cada peça conta a história (consistência de canal)

Mesma história, doses diferentes. Ninguém pode contradizer a frase-mãe (§1):

- **Landing OSI** (`src/pages/LandingPage.tsx`, seção `#calc`): brinde grátis, 6 blocos com a ponte
  pra cada dor, CTA pra calc + link recíproco. Posiciona como "experimente a qualidade antes de ter".
- **E-mails** (`copy_email_sequences.json`): gancho de assunto na captação + bloco de oferta + a calc
  como brinde liberado na hora no pós-compra. "Ganhe a calculadora que sua ótica usa todo dia."
- **Onboarding / página de obrigado** (`ObrigadoPage.tsx` + `copy_pagina_obrigado.json`): a calc é o
  **valor entregue na hora**, enquanto o e-mail de acesso não chega — primeira dose de gratificação.
- **WhatsApp / roteiro comercial** (`roteiro-comercial-brinde-clearix-calc.md` + `copy_whatsapp_bio.json`):
  a calc é a **abertura de conversa** de fricção zero. Entregar → usar junto → conectar à dor → convidar.

## 5. Links recíprocos (a base da medição)

A história só vira funil mensurável se os dois lados se apontam:

- **OSI → Calc:** todos os CTAs do brinde usam `?utm_source=osi&utm_medium=<peça>&utm_campaign=clearix_calc_brinde`
  (`landing`, `obrigado`, etc.). Permite atribuir o tráfego OSI → calc quando o rastreamento entrar.
- **Calc → OSI:** o botão "Ótica sem Improviso" dentro da calc aponta pra landing; "Conhecer o Clearix"
  aponta pro clearix.app.br.

> O rastreamento de conversão em si é tratado em separado (não nesta entrega). Aqui a regra é só
> **garantir que os links recíprocos existam e carreguem UTM** — a medição se liga depois sem retrabalho.

## 6. Limites inegociáveis

- A calc permanece **grátis, sem login, autônoma** — não vira sub-app do OSI nem do Clearix, e o
  acesso a ela **nunca** é condicionado a compra.
- A calc é **amostra da qualidade**, não "o Clearix" — não prometer função de ecossistema que ela não tem.
- **Pergunta de Ouro:** cada peça precisa fortalecer DIGIAI + Clearix + OSI ao mesmo tempo. A calc serve
  ao funil; nunca compete com o Clearix (regra cardinal do [funil-master](funil-osi-clearix-master.md)).

## Referências

- Mapa-mestre do funil: [`funil-osi-clearix-master.md`](funil-osi-clearix-master.md)
- Roteiro comercial: [`../04-operacao-e-venda/roteiro-comercial-brinde-clearix-calc.md`](../04-operacao-e-venda/roteiro-comercial-brinde-clearix-calc.md)
- Arquitetura do ecossistema: [`arquitetura-ecossistema-apps-oticas.md`](arquitetura-ecossistema-apps-oticas.md)
