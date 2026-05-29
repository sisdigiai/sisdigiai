# Arquitetura de Venda e Entrega de Ótica Sem Improviso

## Classificação documental
- tipo: arquitetura comercial e operacional
- status: canônico atual
- última revisão: 2026-04-23
- responsável formal: Precisa de validação manual

## Objetivo do documento
Definir a arquitetura oficial de venda, compra, entrega e continuidade do produto Ótica Sem Improviso com lógica marketplace-first.

## Regra central
Separar com clareza:
- aquisição
- transação
- entrega
- continuidade

## Arquitetura oficial desta fase

### Camada 1 — Aquisição
Prioridade atual:
- tráfego interno de Hotmart
- tráfego interno de Kiwify

Camadas secundárias:
- landing externa
- WhatsApp
- distribuição orgânica futura

### Camada 2 — Transação
A compra acontece dentro do marketplace usado na campanha.

Plataformas válidas nesta fase:
- Hotmart
- Kiwify

### Camada 3 — Entrega
A entrega principal é:
- ebook / manual visual em PDF

### Camada 4 — Continuidade
A continuidade acontece na Nexus com:
- 90 dias de acesso
- apoio complementar
- recursos restritos ao produto

## Fluxo oficial
```text
Marketplace ou página externa
-> checkout Hotmart/Kiwify
-> compra aprovada
-> entrega do ebook
-> liberação da Nexus por 90 dias
-> consumo e aplicação
-> relacionamento futuro
```

## O que está sendo vendido
O produto comercial é:
- ebook prático
- com complemento de 90 dias na Nexus

Regra:
- a Nexus não substitui o ebook
- a Nexus complementa o ebook

## Papel da landing
A landing é opcional.

Se existir:
- encaminha para o checkout do marketplace
- reforça a mesma promessa do marketplace
- não cria uma operação paralela

Se não existir:
- a operação continua válida apenas com a página do marketplace

## Regra de plataformas
Hotmart e Kiwify podem coexistir, mas precisam obedecer à mesma verdade comercial.

Se ambas estiverem ativas:
- mesma promessa
- mesma explicação de entrega
- mesma regra de 90 dias
- mesma hierarquia ebook primeiro, Nexus depois

## Produto entregue na Nexus
Na Nexus, o comprador pode acessar:
- conteúdo complementar do produto
- consulta e revisão
- recursos simples ligados ao ebook
- continuidade de aplicação

Ele não deve esperar:
- plataforma educacional ampla
- comunidade paralela
- conteúdo fora do escopo do produto comprado

## Duração de acesso
- 90 dias de acesso à Nexus

## Justificativa dos 90 dias
- o consumo principal do ebook é rápido
- o comprador precisa de uma janela para revisar e aplicar
- evita acesso eterno a uma camada complementar de custo e manutenção

## Regra para a IA da Nexus
A IA, quando existir, deve responder apenas com base em:
- conteúdo do ebook
- materiais autorizados
- ferramentas complementares liberadas

Ela não deve:
- inventar repertório fora do escopo
- parecer especialista ilimitada
- virar promessa maior que o produto

## Suporte

### Canal oficial atual
- WhatsApp da DIGIAI

### Papel do suporte
- acesso
- login
- compra não reconhecida
- apoio operacional de pós-compra

## Páginas operacionais recomendadas

### Página do marketplace
- resumo da oferta
- preço
- o que vem dentro
- explicação do ebook
- explicação da Nexus como complemento

### Página de obrigado
- confirmação da compra
- próximos passos
- acesso ao ebook
- aviso sobre Nexus
- contato de suporte

### Página de onboarding
- como usar o ebook
- como consumir em 3 dias
- como ativar e usar a Nexus
- como buscar suporte

## Métricas mínimas
- visita na página do marketplace
- clique no botão de compra
- compra aprovada
- compra recusada
- liberação da Nexus
- primeiro login na Nexus
- abertura do ebook

## Cenários que precisam ser cobertos
- compra aprovada sem acesso na Nexus
- cliente não encontra o ebook
- cliente não entende o que recebeu
- e-mail digitado errado
- falha de integração
- pedido de reembolso

## Anti-padrões
- desenhar a operação como se dependesse de landing própria
- vender a Nexus como se fosse o produto central
- manter múltiplas verdades entre Hotmart, Kiwify e landing
- prometer curso grande quando a oferta é ebook com complemento

## Dependências documentais
- `modelo-comercial-marketplace-first-clearix-academy.md`
- `otica-sem-improviso.md`
- `landing-otica-sem-improviso.md`