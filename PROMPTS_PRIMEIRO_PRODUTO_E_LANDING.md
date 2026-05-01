# Prompts - primeiro produto e landing

## Leitura rapida do app

- O app atual e um painel operacional interno da DIGIAI, nao uma vitrine publica.
- O produto-ancora do ecossistema hoje e o `Clearix`, posicionado como SaaS vertical para varejo optico.
- O app mostra que o `Clearix Academy` e a frente de entrada para gerar caixa, autoridade e leads.
- O roadmap deixa explicito que o primeiro produto digital deve nascer no track do Academy antes da aceleracao comercial do Clearix.
- A stack atual para uma landing dentro deste repo e `React 19 + Vite + Tailwind 4 + Motion`.
- Nao existe estrutura de rotas publicas no app hoje. Landing page exigira uma nova camada de navegacao ou uma entrada publica separada.

## Recomendacao principal

Se formos seguir o que o proprio app indica, o primeiro produto digital mais coerente nao e o SaaS completo do Clearix, e sim um low-ticket do `Clearix Academy` para donos e gestores de oticas.

Tese sugerida:

- publico: donos de otica, gestores comerciais e equipes de vendas do varejo optico
- problema: baixa conversao, dependencia de desconto, pouca previsibilidade comercial, atendimento sem processo
- formato: curso rapido, playbook pratico, oficina gravada, mentoria enxuta ou kit de implementacao
- faixa de preco inicial: `R$ 97 a R$ 197`
- papel estrategico: gerar caixa, audiencia, prova de demanda e leads qualificados para o Clearix

Nome inicial sugerido:

- `Como vender mais na sua otica sem apelar para descontos`

## Prompt 1 - Criacao do produto digital

```text
Voce e um estrategista de produtos digitais, marketing e validacao de oferta.

Quero que voce desenhe o primeiro produto digital da DIGIAI com base no seguinte contexto:

- A DIGIAI e uma holding tech orientada por IA.
- O produto-ancora do ecossistema e o Clearix, um SaaS vertical para varejo optico.
- Antes de escalar a venda do Clearix, queremos lancar um low-ticket via Clearix Academy.
- Esse produto deve gerar caixa, autoridade e leads qualificados para o Clearix.
- O publico principal sao donos de oticas, gestores e equipes comerciais do varejo optico.
- O produto precisa resolver uma dor imediata, pratica e facil de comunicar.
- A oferta deve ser simples de produzir e vender rapidamente.
- Faixa de preco desejada: entre R$ 97 e R$ 197.
- A marca deve soar premium, inteligente, aplicada ao negocio real e sem promessas exageradas.

Quero que voce entregue:

1. 3 propostas de produto digital com nome, promessa principal e mecanismo unico.
2. Para cada proposta, detalhe:
   - publico ideal
   - dor central
   - transformacao prometida
   - formato ideal
   - preco sugerido
   - tempo estimado de producao
   - nivel de alinhamento com o funil do Clearix
3. Escolha a melhor opcao e explique por que ela deve ser o primeiro lancamento.
4. Estruture a oferta completa da opcao escolhida:
   - nome final
   - subtitulo
   - promessa
   - para quem e
   - para quem nao e
   - modulos ou etapas
   - bonus
   - garantia
   - objecoes previsiveis
   - CTA principal
5. Crie um MVP de conteudo para entregar em ate 7 dias.
6. Liste quais assets precisamos produzir primeiro:
   - video
   - PDF
   - aulas
   - depoimentos
   - criativos
   - FAQ
7. Feche com uma versao "pronta para vender nesta semana".

Use linguagem clara, comercial e orientada a execucao. Nao faca respostas genericas. Pense no contexto de varejo optico brasileiro.
```

## Prompt 2 - Copy da landing page

```text
Voce e um copywriter de conversao especializado em landing pages para produtos digitais e ofertas low-ticket.

Crie a copy completa de uma landing page para o primeiro produto digital da DIGIAI / Clearix Academy.

Contexto da oferta:

- Marca-mae: DIGIAI
- Linha de entrada: Clearix Academy
- Nicho: varejo optico brasileiro
- Publico: donos de otica, gestores comerciais e vendedores
- Objetivo da landing: vender um low-ticket e captar leads qualificados para o ecossistema Clearix
- Posicionamento: pratico, inteligente, profissional, sem hype e sem promessas milagrosas
- Faixa de preco: R$ 97 a R$ 197
- Estetica da marca: dark navy, azul profissional, ciano sobrio, visual premium e tecnologico

Monte a landing page completa nas secoes abaixo:

1. Hero
   - headline
   - subheadline
   - CTA principal
   - CTA secundario
   - prova ou credibilidade
2. Bloco de problema
3. Bloco de agitao da dor
4. Bloco de solucao
5. Bloco "o que voce vai receber"
6. Bloco de modulos ou aulas
7. Bloco de bonus
8. Bloco de para quem e / nao e
9. Bloco de objecoes e FAQ
10. Bloco de oferta e garantia
11. Bloco final de CTA

Tambem entregue:

- 5 opcoes de headline
- 3 opcoes de CTA
- 10 bullets de beneficios
- 6 perguntas frequentes com respostas
- 3 ideias de prova social inicial, mesmo sem muitos clientes

Regras:

- Nao usar linguagem coach, milagrosa ou agressiva demais.
- Nao soar como curso generico de marketing.
- O texto deve parecer especifico para oticas.
- Sempre reforcar ganho pratico, aplicacao imediata e clareza comercial.
- Escrever em portugues do Brasil.
```

## Prompt 3 - Implementacao da landing dentro deste repo

```text
Voce e um senior frontend engineer e product designer.

Implemente uma landing page de alta conversao dentro de um projeto existente com estas caracteristicas:

- Stack: React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion
- O projeto atual ja possui identidade visual da DIGIAI
- Cores principais: #0A0F1E, #2563EB, #06B6D4
- Tipografia atual: Inter
- O app atual e um painel interno, sem estrutura publica de landing pronta
- O design precisa respeitar a linguagem existente da marca, sem parecer template genrico

Crie uma landing page para o primeiro produto digital do Clearix Academy com foco em conversao.

Quero:

- hero forte com CTA principal
- secoes de problema, solucao, beneficios, modulos, bonus, FAQ e oferta
- layout premium, tecnologico e confiavel
- responsividade real para mobile e desktop
- microanimacoes pontuais usando Motion
- componentes organizados e legiveis
- texto inicial plausivel, sem lorem ipsum
- preparo para integrar formulario ou checkout depois

Restricoes tecnicas:

- manter o padrao visual do projeto
- usar Tailwind utility-first
- evitar dependencias novas se nao forem necessarias
- se precisar introduzir navegacao publica, fazer a menor mudanca estrutural possivel
- nao quebrar o painel interno existente

Entregue:

1. a estrutura de arquivos a criar ou alterar
2. o codigo completo dos componentes
3. qualquer ajuste necessario em App.tsx para expor a landing sem afetar o fluxo atual
4. notas curtas sobre como conectar CTA com checkout ou formulario depois
```

## Prompt 4 - Se quiser ir direto para uma versao mais B2B

```text
Quero uma alternativa ao low-ticket.

Em vez de vender primeiro um produto educacional, quero validar uma landing de captacao para o Clearix, nosso SaaS vertical para varejo optico.

Crie:

1. proposta de valor do Clearix em linguagem clara para dono de otica
2. ICP principal e ICP secundario
3. principais dores que o Clearix resolve
4. estrutura de landing page para agendamento de demo
5. secao de planos usando esta ancora:
   - Starter: R$ 397
   - Growth: R$ 797
   - Ecossistema: R$ 1.497
6. CTA principal para piloto ou demo
7. FAQ comercial com objecoes de preco, implantacao, migracao e suporte

Tom:

- consultivo
- profissional
- direto
- especifico para varejo optico
```

## Recomendacao pratica de execucao

Ordem sugerida:

1. rodar o Prompt 1 e escolher a oferta
2. rodar o Prompt 2 para fechar a copy
3. rodar o Prompt 3 para transformar a copy em landing dentro deste repo
4. so depois decidir se a landing entra no proprio app ou em um microsite separado
