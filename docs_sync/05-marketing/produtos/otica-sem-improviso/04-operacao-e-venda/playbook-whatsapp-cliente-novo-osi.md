---
title: Playbook WhatsApp — Cliente Novo OSI (manual)
last_updated: 2026-06-17
status: ativo
topic_key: marketing.osi.playbook_whatsapp_cliente_novo
source_kind: operacao_e_venda
supersedes: []
superseded_by: null
---

# Playbook WhatsApp — Cliente Novo OSI

> **O que é:** o passo a passo de **como a gente conversa no WhatsApp com quem é novo** no OSI —
> tanto quem **acabou de comprar** (onboarding) quanto quem **deixou o contato** e ainda não comprou
> (nutrição). **Fase atual: 100% manual** (equipe dispara à mão). Automação vem depois, e quando vier
> mora no **DIGIAI App** (junto do `lead-capture`/`events`), **nunca** no `clearix_fone`/banco Clearix.

> **Por que manual primeiro:** validar a conversa que converte antes de gastar engenharia. O que
> funcionar à mão vira template de automação. (Decisão do dono em 2026-06-17.)

- **Calc (brinde):** https://clearixcalc.netlify.app/ → `[LINK_CALC]`
- **Landing OSI:** https://landingoticasemimproviso.netlify.app/ → `[LINK_OSI]`
- **Nexus / acesso ao método:** `[LINK_NEXUS]` (do e-mail de acesso pós-compra)
- **Suporte:** `wa.me/5511986027415` *(confirmar se é o número oficial — pendência do dono)*

---

## 0. De onde vêm os contatos (manual, hoje)

| Quem | Origem do número | Onde olhar |
|---|---|---|
| **Comprador novo** | checkout Hotmart/Kiwify | painel do marketplace (lista de vendas aprovadas) |
| **Lead novo (não comprou)** | form da landing / Central de afiliados | `marketing.landing_leads` no DIGIAI App (`product='osi'`) — número + consentimento já gravados |

**LGPD:** o lead deu consentimento no form ("receber conteúdos por e-mail e WhatsApp"); o comprador é
contato transacional. Sempre oferecer saída ("é só me avisar que paro de mandar").

---

## 1. Princípios das mensagens

1. **Entrega antes de pedir.** Abrir sempre com valor (o brinde, uma dica) — nunca com cobrança.
2. **Personalizar** o `[Nome]` e o contexto (comprou? só pegou o brinde?).
3. **Uma mensagem, um objetivo.** Não empilhar 3 pedidos numa só.
4. **Tom da marca:** direto, empático, mentora experiente. Sem hype, sem emoji excessivo, sem urgência falsa.
5. **Fio condutor:** a calc resolve o cálculo → o OSI resolve a conversa que vende → o Nexus mantém o método vivo.

---

## 2. Jornada A — Comprador novo (onboarding, ~7 dias)

> Roda **em paralelo** aos e-mails pós-compra (`copy_email_sequences.json` → `seq_pos_compra`). O WhatsApp
> é o canal de "não te deixo travar"; o e-mail carrega os links formais.

| Quando | Gatilho | Objetivo | Template |
|---|---|---|---|
| **T+0** (mesmo dia) | compra aprovada | confirmar + entregar brinde + reduzir ansiedade | `A0_boas_vindas` |
| **T+1 dia** | — | garantir que acessou o método | `A1_acessou` |
| **T+3 dias** | — | empurrar aplicação no balcão | `A3_aplicou` |
| **T+7 dias** | — | fechar a 1ª semana + apresentar Nexus/Doug | `A7_semana` |
| **gatilho** | não acessou o Nexus em 48h | resgatar quem travou no acesso | `A_resgate_acesso` |

### Templates — Jornada A

**`A0_boas_vindas`**
```
Oi, [Nome]! Aqui é da Ótica Sem Improviso 👓 Sua compra caiu certinho, seja bem-vindo(a)!

Em alguns minutos chega no seu e-mail o acesso (PDF + app + Nexus). Se não aparecer, me chama aqui que eu resolvo.

E já leva um brinde pra usar HOJE no balcão, de graça: a Clearix Calc — espessura por índice (com desenho da lente!), transposição, distância ao vértice, DNP. Sem cadastro, funciona offline: [LINK_CALC]
```

**`A1_acessou`**
```
Oi, [Nome]! Conseguiu acessar o método pelo e-mail? (PDF pra imprimir + app pra estudar)

Se ainda não, me avisa que te mando o passo a passo. Dica de hoje: comece pelos Movimentos 1 e 2 — são os que mais mudam o atendimento já na próxima venda.
```

**`A3_aplicou`**
```
[Nome], chegou no Movimento 3 (Indicar com Segurança)?

Testa hoje uma coisa: abre a Clearix Calc na frente do cliente e mostra o desenho da lente no índice alto vs. o 1.50. O cliente VÊ por que vale a pena — e aí você sustenta o valor sem correr pro desconto. [LINK_CALC]

Me conta como foi.
```

**`A7_semana`**
```
Oi, [Nome]! Fechando sua 1ª semana com o método — como tá sendo no balcão?

Quando quiser ir além do manual, lá no Nexus tem o curso assistido (o Doug tira dúvida sua sobre atendimento na hora) e o apoio dos 90 dias: [LINK_NEXUS]

Qualquer travada, é só chamar.
```

**`A_resgate_acesso`** (não acessou em 48h)
```
[Nome], vi que você ainda não entrou no material. Deu algum problema com o e-mail ou o acesso?

Me fala que eu destravo agora — não quero que você fique sem o que comprou. Enquanto isso, a calculadora você já pode usar: [LINK_CALC]
```

---

## 3. Jornada B — Lead novo (deixou contato, não comprou)

> Reusa as mensagens do banco `copy_whatsapp_bio.json` (`msg_brinde_calc_abertura` / `msg_brinde_calc_followup`).
> Roda em paralelo à `seq_captacao` dos e-mails.

| Quando | Objetivo | Template |
|---|---|---|
| **T+0** (deixou contato) | entregar o brinde, criar reciprocidade | `B0_brinde` (= `msg_brinde_calc_abertura`) |
| **T+2 dias** | ponte do brinde pro método | `B2_ponte` (= `msg_brinde_calc_followup`) |
| **T+5 dias** | oferta, sem pressão | `B5_oferta` |

### Template novo — `B5_oferta`
```
Oi, [Nome]! Última vez que falo do método por aqui (prometo 🙂).

Se fez sentido pra você ter um jeito de atender que funciona em 72h — sem improviso e sem desconto cedo demais — o Ótica Sem Improviso tá R$ 48,50 na oferta de lançamento: [LINK_OSI]

A calculadora continua sua de graça de qualquer jeito. Se não for a hora, sem problema — é só avisar que eu paro de mandar.
```

---

## 4. Operação manual — como tocar isso hoje

1. **Lista única:** manter uma planilha simples (Sheets) com colunas: `nome · whatsapp · origem (comprador/lead) · data_entrada · último_passo_enviado · status (enviado/respondeu/converteu/saiu)`.
2. **Rotina diária (~15 min):** olhar quem entrou ontem (vendas + `landing_leads`) e disparar o passo T+0; depois rodar os T+1/T+3/T+5/T+7 de quem está na fila.
3. **Marcar o status** na planilha a cada envio/resposta — é a métrica manual até a automação existir.
4. **Resposta humana sempre que o cliente responde** — o playbook é trilho, não robô.

> **Métrica que importa nesta fase:** % de compradores que acessam o Nexus na 1ª semana e % de leads
> que viram compra. A planilha já dá isso à mão.

---

## 5. Limites (não esquecer)

- **Manual até validar.** Não automatizar antes de saber qual sequência converte.
- **Brinde é incondicional** — nunca "só te mando a calc se você comprar".
- **LGPD:** sempre dar saída fácil; respeitar o opt-out na hora.
- **Automação futura:** WhatsApp Cloud API hospedada no **DIGIAI App**, reusando `lead-capture`/`events`.
  Nunca acoplar ao `clearix_fone`/banco Clearix (regra de ouro do funil).
- **Pergunta de Ouro:** cada conversa fortalece DIGIAI + Clearix + OSI? Se virou só cobrança, voltou pro improviso.

---

## Referências

- Roteiro comercial (prospecção/abertura): [`roteiro-comercial-brinde-clearix-calc.md`](roteiro-comercial-brinde-clearix-calc.md)
- Narrativa (fio condutor): [`../01-estrategia/narrativa-brinde-calc-osi.md`](../01-estrategia/narrativa-brinde-calc-osi.md)
- Banco de mensagens: [`../05-copys-e-prompts/copy_whatsapp_bio.json`](../05-copys-e-prompts/copy_whatsapp_bio.json)
- Sequências de e-mail (rodam em paralelo): [`../05-copys-e-prompts/copy_email_sequences.json`](../05-copys-e-prompts/copy_email_sequences.json)
- Régua de recuperação de carrinho: [`regua-recuperacao-carrinho-osi.md`](regua-recuperacao-carrinho-osi.md)
