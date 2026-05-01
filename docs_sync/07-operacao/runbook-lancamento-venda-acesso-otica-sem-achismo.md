# Runbook de Lançamento, Venda e Acesso de Ótica Sem Achismo

## Classificação documental
- tipo: runbook operacional
- status: canônico inicial
- última revisão: 2026-04-23
- responsável formal: Precisa de validação manual
- documento-mãe relacionado: `../05-marketing/arquitetura-de-venda-e-entrega-otica-sem-achismo.md`

## Objetivo do documento
Definir como operar o lançamento de Ótica Sem Achismo da venda ao acesso, incluindo plataforma de checkout, liberação na Nexus, suporte, contingência, analytics e tratamento de falhas.

## Princípio operacional
Não misturar estratégia boa com operação confusa.

A tese geral pode usar:
- Hotmart para tração e legitimidade
- Kiwify para testes e eficiência
- Nexus para entrega e retenção

Mas o lançamento não deve começar com duas operações caóticas em paralelo.

## Regra oficial de rollout

### Fase 1 — Lançamento controlado
- checkout principal: Hotmart
- entrega: Nexus
- suporte: WhatsApp DIGIAI
- landing: própria

### Fase 2 — Teste paralelo controlado
- checkout principal continua na Hotmart
- Kiwify entra apenas como trilho de teste
- só usar Kiwify em campanhas marcadas e separadas

### Fase 3 — Operação dual consciente
Só abrir Hotmart + Kiwify como dois canais ativos quando houver:
- preço unificado
- oferta unificada
- tracking por origem
- páginas de obrigado padronizadas
- automação estável de acesso
- política de suporte e reembolso sem conflito

## Leitura estratégica da estrutura

### Hotmart
Melhor papel:
- principal trilho inicial
- confiança de mercado
- afiliados
- checkout conhecido
- legitimidade percebida

### Kiwify
Melhor papel:
- laboratório comercial
- testes de campanha
- testes de copy
- testes de preço e conversão

### Nexus
Melhor papel:
- onboarding premium
- retenção
- entrega do PDF
- uso da IA restrita
- expansão da linha futura

## O que a tese acerta
- não depender só da landing para vender
- usar plataformas com confiança de mercado
- separar venda de entrega
- manter a Nexus como ativo próprio

## O que precisa de disciplina
- não mandar tráfego aleatoriamente para duas plataformas
- não criar duas ofertas diferentes
- não operar dois preços sem regra
- não duplicar suporte sem origem rastreável
- não deixar o cliente confuso sobre onde comprou

## Seller of record

### Regra prática
Cada compra precisa ter uma plataforma claramente responsável.

### No MVP
- seller of record primário: Hotmart
- seller of record secundário: Kiwify apenas em campanhas de teste, quando ativada

## Mapa do fluxo oficial

### Fluxo principal
tráfego -> landing -> checkout da plataforma -> compra aprovada -> página de obrigado -> acesso Nexus -> onboarding -> consumo

### Fluxo alternativo de teste
tráfego marcado -> landing ou variação -> checkout Kiwify -> compra aprovada -> página de obrigado padrão -> acesso Nexus -> onboarding -> consumo

## Regras por origem

### Afiliados e ecossistema externo
- priorizar Hotmart

### Campanhas de teste direto
- Kiwify pode ser usada
- desde que a campanha esteja identificada

### Marca própria, Instagram, WhatsApp e landing
- pode testar ambos
- mas sempre com divisão clara por URL, UTM e campanha

## Oferta e preço

### Regra
- uma única oferta
- uma única promessa
- um único posicionamento
- uma única estrutura de entrega

### Preço
- manter paridade de preço entre plataformas enquanto o teste não exigir hipótese diferente

### Se houver teste de preço
- documentar hipótese
- limitar período
- limitar origem do tráfego
- medir impacto com clareza

## Acesso na Nexus

### Duração recomendada
- 90 dias de acesso

### Justificativa
- o produto é rápido de consumir
- o comprador precisa de tempo para revisar
- reduz custo e passivo de acesso eterno
- protege a operação da IA própria

## Regras da IA da Nexus
- responder apenas sobre o conteúdo autorizado
- não extrapolar para aconselhamento fora da base
- não prometer precisão técnica fora do material
- registrar claramente escopo e limites

## Cadastro do cliente

### Regra operacional
O cadastro final na Nexus acontece somente após confirmação do pagamento na plataforma.

### Dados mínimos esperados
- nome
- e-mail de compra
- plataforma de origem
- id da compra
- produto
- status do pagamento
- data de expiração do acesso

## Reembolso e cancelamento

### Regra obrigatória
- reembolso aprovado = bloquear acesso
- cancelamento confirmado = bloquear acesso
- chargeback = bloquear acesso e revisar o caso

### Regra de comunicação
O bloqueio precisa ser acompanhado de comunicação clara ao cliente.

## E-mail transacional

### Estado atual
Ferramenta final ainda em aberto.

### Política operacional
Usar duas camadas:
- e-mail da própria plataforma de checkout
- e-mail complementar DIGIAI/Nexus

### Se tudo funcionar
Enviar:
- confirmação
- acesso
- próximos passos
- suporte

### Se a automação falhar
Enviar automaticamente um e-mail de contingência com:
- confirmação de compra
- instruções de acesso
- link da Nexus
- canal de WhatsApp

## Suporte

### Canal oficial
- WhatsApp da DIGIAI

### Casos de suporte previstos
- pagamento aprovado e acesso ausente
- e-mail incorreto
- cliente não encontra login
- cliente não recebeu instrução
- dúvida sobre prazo de acesso
- bloqueio por reembolso/cancelamento

### Regra
Toda página de obrigado, onboarding e e-mail deve apontar o canal de suporte.

## Página de obrigado

### Regra
Precisa ser padronizada independentemente da plataforma de compra.

### Conteúdo obrigatório
- compra confirmada
- próximo passo claro
- botão para acessar Nexus
- vídeo curto ou instrução rápida
- WhatsApp de suporte

## Analytics e eventos

### Eventos mínimos
- visita na landing
- clique para checkout
- início de checkout
- compra aprovada
- compra recusada
- reembolso
- acesso concedido
- primeiro login na Nexus
- abertura do manual

### Eventos por plataforma
Registrar:
- plataforma de origem
- campanha
- criativo
- afiliado, se houver
- UTM

## Testes obrigatórios antes do lançamento

### Compra
- cartão aprovado
- cartão recusado
- pix aprovado
- boleto, se habilitado

### Acesso
- liberação correta na Nexus
- expiração em 90 dias
- bloqueio após reembolso
- bloqueio após cancelamento

### Comunicação
- e-mail da plataforma
- e-mail complementar
- WhatsApp de suporte
- página de obrigado

### Falhas
- webhook não chegou
- compra duplicada
- cliente sem acesso
- e-mail errado
- compra feita na plataforma A com tentativa de suporte pela plataforma B

## Fallback manual

### Quando usar
- falha de integração
- falha de e-mail
- falha de webhook
- urgência no atendimento

### Procedimento mínimo
1. confirmar pagamento na plataforma
2. conferir e-mail do comprador
3. criar ou corrigir acesso na Nexus
4. enviar instruções por e-mail
5. enviar confirmação por WhatsApp, se necessário
6. registrar o incidente

## Política de plataformas

### Hotmart
Usar como principal quando o foco for:
- afiliação
- confiança da marca
- lançamento principal

### Kiwify
Usar como canal B quando o foco for:
- teste de conversão
- campanhas de laboratório
- checkout alternativo

### Nexus
Sempre manter como:
- ambiente final
- experiência proprietária
- base de retenção

## O que não fazer
- lançar com Hotmart e Kiwify igualmente prioritárias no dia 1
- operar sem tracking de origem
- ter duas páginas de obrigado diferentes sem padrão
- esquecer bloqueio pós-reembolso
- depender de intervenção manual em todos os acessos
- prometer suporte sem processo definido

## Checklist executivo de lançamento
- landing publicada
- checkout principal definido
- produto cadastrado na plataforma
- página de obrigado pronta
- onboarding pronto
- acesso Nexus testado
- e-mail testado
- WhatsApp de suporte pronto
- eventos de conversão mapeados
- fluxo de reembolso documentado
- fallback manual pronto

## Dependências documentais
- `../05-marketing/otica-sem-achismo.md`
- `../05-marketing/landing-otica-sem-achismo.md`
- `../05-marketing/arquitetura-de-venda-e-entrega-otica-sem-achismo.md`

## Lacunas abertas
- ferramenta final de e-mail complementar
- automação exata entre plataforma e Nexus
- definição final de Hotmart-only no lançamento ou Hotmart + Kiwify já no primeiro ciclo
- política exata de garantia e prazo de reembolso
