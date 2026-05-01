# Arquitetura de Venda e Entrega de Ótica Sem Achismo

## Classificação documental
- tipo: arquitetura comercial e operacional de produto digital
- status: canônico inicial
- última revisão: 2026-04-22
- responsável formal: Precisa de validação manual
- documento-mãe relacionado: `otica-sem-achismo.md`

## Objetivo do documento
Definir a arquitetura oficial de venda, checkout, entrega, acesso, suporte, analytics e contingência do produto Ótica Sem Achismo.

Este documento existe para impedir que a operação do lançamento seja montada no improviso.

## Regra central
Separar claramente:
- camada de venda
- camada de transação
- camada de entrega

No estágio atual, a DIGIAI não deve tentar fazer tudo dentro de uma estrutura própria.

## Arquitetura oficial recomendada

### Camada 1 — Venda
Landing pública própria da oferta.

Função:
- educar
- gerar desejo
- aumentar conversão
- preparar a compra

Regra:
a landing ajuda a plataforma vender, mas não precisa concentrar a transação.

### Camada 2 — Transação
Checkout dentro de plataforma pronta.

Função:
- cobrar
- aprovar pagamento
- tratar recusas
- registrar compra
- operar reembolso e cancelamento

### Camada 3 — Entrega
Experiência e consumo dentro da Nexus.

Função:
- dar acesso
- organizar consumo
- liberar manual e ferramentas
- suportar a jornada de 3 dias

## Stack recomendada para lançamento rápido

### Recomendação principal
- landing: Framer
- checkout: Hotmart
- entrega: Nexus

### Alternativas viáveis
- landing: Framer
- checkout: HeroSpark
- entrega: Nexus

- landing: Framer
- checkout: Kiwify
- entrega: Nexus

## Racional da recomendação principal

### Framer
Forte para:
- landing rápida
- visual premium
- CMS
- formulários
- boa base de performance e SEO

### Hotmart
Forte para:
- checkout consolidado
- estrutura de produto digital
- taxa por transação em vez de mensalidade fixa
- área de membros própria, se necessário como contingência

### HeroSpark
Forte para:
- checkout
- área de membros
- recuperação de vendas
- certificados

### Kiwify
Forte para:
- rapidez de operação
- checkout builder
- área de membros
- liberação imediata por e-mail e dashboard

## Decisão operacional atual
Para este produto, a plataforma de venda não é o ambiente principal de consumo.

A lógica oficial é:
- venda na plataforma
- acesso liberado na Nexus
- consumo do produto dentro da Nexus

## Modelo de páginas

### 1. Página de venda principal

#### URL sugerida
- `/otica-sem-achismo`

#### Objetivo
Converter o colaborador.

#### Estrutura
- hero
- dor real
- transformação
- o que é
- o que vem dentro
- Douglas e Taty
- módulos
- para quem é / não é
- oferta
- FAQ
- CTA final

### 2. Página de checkout

#### Objetivo
Fechar a compra sem distração.

#### Regra
O checkout deve ficar dentro da plataforma escolhida.

#### Estrutura mínima
- nome do produto
- resumo da oferta
- valor
- bônus
- garantia
- acesso imediato
- prova de segurança
- botão de pagamento

### 3. Página de obrigado / confirmação

#### URL sugerida
- `/bem-vindo`
- `/obrigado`

#### Objetivo
Confirmar a compra e apontar o próximo passo sem atrito.

#### Estrutura mínima
- confirmação da compra
- próximos passos
- botão Acessar Nexus
- vídeo curto de onboarding
- aviso de e-mail enviado
- suporte

### 4. Página de onboarding

#### URL sugerida
- `/primeiros-passos`

#### Objetivo
Explicar rapidamente como consumir o produto.

#### Estrutura mínima
- como usar o PDF
- como consumir em 3 dias
- como usar Douglas e Taty
- como acessar quiz
- como usar o simulador
- como aplicar no balcão

## Estrutura interna da entrega na Nexus

### Home do produto
- banner do produto
- progresso
- botão para abrir PDF
- atalhos rápidos
- módulos
- ferramentas
- avisos de atualização

### Página do manual
- visualização do PDF
- botão de download
- índice navegável
- notas importantes
- CTA secundário para quiz
- CTA secundário para Douglas/Taty

### Módulos
- Atendimento fora do automático
- Leitura do cliente e anamnese
- Indicação com mais segurança
- Argumentação sem desconto
- WhatsApp para recuperar, reagendar e contornar objeções

### Ferramentas
- Pergunte ao Douglas
- Pergunte à Taty
- Simulador de objeções
- Quiz de perfil do cliente
- Biblioteca de respostas rápidas
- FAQ do aluno

## Estrutura editorial do PDF principal

### Faixa recomendada
- 20 a 30 páginas

### Organização recomendada
- capa
- manifesto
- uso em 3 dias
- erros do balcão
- leitura do cliente
- perguntas que abrem venda
- condução de conversa
- Douglas
- Taty
- indicação sem empurrar
- rosto x armação
- objeções
- desconto cedo demais
- WhatsApp
- mini casos
- checklists
- plano de aplicação em 3 dias
- próximos passos na Nexus

## Política de venda e acesso

### Compra
A compra acontece na plataforma de checkout escolhida.

### Cadastro do cliente
O cadastro final do cliente na experiência DIGIAI/Nexus acontece após confirmação do pagamento na plataforma.

### Acesso na Nexus
O comprador recebe acesso ao ambiente Nexus após confirmação da compra.

### Duração de acesso recomendada
- 90 dias de acesso

## Justificativa para 90 dias
Faz sentido porque:
- o consumo principal é curto
- o comprador pode revisar o material
- há tempo suficiente para aplicar no balcão
- reduz passivo de acesso eterno em um produto com camada de IA

## Regra para a IA da Nexus
A IA própria da Nexus deve responder apenas sobre:
- o conteúdo do ebook
- os materiais autorizados
- as ferramentas complementares liberadas

Ela não deve:
- inventar conteúdo fora do escopo
- virar promessa maior que o produto
- responder como especialista fora da base autorizada

## Reembolso e cancelamento

### Regra recomendada
- compra reembolsada = acesso bloqueado
- compra cancelada = acesso bloqueado
- acesso promocional encerrado = acesso removido conforme política do produto

### Motivo
Como a entrega envolve:
- conteúdo digital
- área restrita
- recursos proprietários
- IA com custo de uso

o bloqueio pós-reembolso ou cancelamento deve ser padrão.

## E-mail transacional

### Estado atual
Decisão em aberto.

### Recomendação
Operar em duas camadas:
- e-mail padrão da plataforma de checkout
- e-mail complementar da DIGIAI/Nexus para acesso e onboarding

### Se falhar
Se a automação principal falhar, disparar e-mail automático de contingência com:
- confirmação
- link de acesso
- instruções de login
- contato de suporte

## Suporte

### Canal oficial atual
- WhatsApp da DIGIAI

### Papel do suporte
- acesso
- login
- compra não reconhecida
- dúvida operacional
- apoio básico no pós-compra

### Regra
Todo material precisa apontar para o WhatsApp de suporte.

## Domínios e publicação

### Estado atual
- domínios já existentes
- publicação atual já pode usar a estrutura disponível
- transição de domínio correto pode ser feita depois
- stack atual em Netlify já está disponível para apoiar a mudança

### Regra documental
Enquanto o domínio final não for decidido, tratar a URL final como decisão operacional em aberto.

## Analytics e conversão

### Obrigatório no MVP
- tracking da visita da landing
- clique no CTA principal
- clique no CTA secundário
- clique de saída para checkout
- início de checkout
- compra aprovada
- compra recusada
- acesso liberado
- primeiro login na Nexus
- abertura do manual

### Eventos recomendados
- `view_landing_otica_sem_achismo`
- `click_cta_primary_otica_sem_achismo`
- `click_cta_secondary_otica_sem_achismo`
- `click_checkout_otica_sem_achismo`
- `checkout_started_otica_sem_achismo`
- `purchase_approved_otica_sem_achismo`
- `purchase_refused_otica_sem_achismo`
- `access_granted_nexus_otica_sem_achismo`
- `first_login_nexus_otica_sem_achismo`
- `open_manual_otica_sem_achismo`

### Contexto comercial
O hype da feira óptica ainda pulsa.

Então a medição precisa capturar:
- origem do tráfego
- criativos com melhor resposta
- campanhas associadas à feira
- comportamento nas primeiras semanas

## Recuperação de falhas

### Cenários que precisam ser cobertos
- pagamento aprovado sem liberação na Nexus
- e-mail digitado errado
- cliente não encontra acesso
- cliente paga e acha que não recebeu
- pagamento recusado
- falha de webhook
- duplicidade de compra
- reembolso solicitado

### Resposta operacional recomendada
- e-mail automático de contingência
- botão ou link claro para suporte
- checklist interno para liberação manual
- registro do incidente

## Testes obrigatórios antes do lançamento

### Fluxo de compra
- compra aprovada
- compra recusada
- compra com boleto/pix/cartão, conforme a plataforma
- reembolso
- cancelamento

### Fluxo de acesso
- primeiro acesso
- redefinição de senha
- acesso fora do prazo
- bloqueio pós-reembolso

### Fluxo de comunicação
- recebimento do e-mail da plataforma
- recebimento do e-mail complementar
- clique no link de acesso
- contato com suporte

## Política de plataformas

### O checkout fica dentro da plataforma?
Sim.

Essa é exatamente uma das vantagens do modelo:
- a landing vende
- a plataforma fecha a compra
- a Nexus entrega

## Plataformas sugeridas para o plano atual

### Prioridade de avaliação
1. Hotmart
2. HeroSpark
3. Kiwify

### Lógica da prioridade

#### Hotmart
Melhor para:
- lançamento rápido
- operação conhecida
- checkout consolidado
- menor fricção de entrada

#### HeroSpark
Melhor para:
- operação mais integrada de checkout + membros
- eventual uso de contingência
- recuperação de vendas

#### Kiwify
Melhor para:
- velocidade
- simplicidade
- checkout enxuto

## Recomendação prática atual
Se a prioridade for colocar no ar rápido:
- Framer para a landing
- Hotmart para o checkout
- Nexus para a entrega

Se a prioridade passar a ser operar mais integração dentro da plataforma:
- Framer para a landing
- HeroSpark como alternativa forte
- Nexus como ambiente final

## Governança documental futura

### Estrutura atual
Faz sentido manter este material em `05-marketing`, porque ele ainda está muito ligado ao lançamento do primeiro produto.

### Estrutura futura recomendada
Quando houver mais de um produto ativo, criar uma pasta própria de produtos.

Sugestão:
- `docs/05-marketing/produtos/`
- `docs/05-marketing/produtos/otica-sem-achismo/`
- `docs/05-marketing/produtos/[produto-futuro]/`

### Regra
Não vale reorganizar toda a árvore agora se isso atrapalhar velocidade.

## Dependências documentais
- `otica-sem-achismo.md`
- `landing-otica-sem-achismo.md`
- `prompt-landing-otica-sem-achismo.md`
- `presenca-digital-e-sites.md`

## Lacunas abertas
- plataforma final escolhida entre Hotmart, HeroSpark e Kiwify
- domínio final oficial da landing
- ferramenta final de e-mail complementar
- regra exata de garantia e prazo de reembolso
- mecanismo técnico de bloqueio automático na Nexus
