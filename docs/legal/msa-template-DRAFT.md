# Master Service Agreement (MSA) — Template DIGIAI ↔ Cliente B2B

> **DRAFT v0.1 · 2026-05-22**
> **Produzido por:** agente `advogado-tech` (Claude Opus)
> **Status:** análise interna · **NÃO ASSINAR sem revisão por advogado humano**
> **Uso:** template inicial para contratação de Clearix por óticas B2B

---

## Identificação das partes

**CONTRATADA:** DIGIAI ÓTICA E TECNOLOGIA LTDA
- CNPJ: 12.549.582/0001-49
- Sede: Rua General Francisco Glicério, 940 - Térreo Sala 02, Jardim Guaio, Suzano - SP, CEP 08674-000
- Representante legal: Gilberto de Camargo Silva Junior (sócio-administrador)

**CONTRATANTE (Cliente):** *[razão social] · [CNPJ] · [endereço] · [representante]*

---

## Cláusulas (numeradas)

### 1. Objeto

A CONTRATADA disponibiliza à CONTRATANTE o acesso ao sistema **Clearix** (Software as a Service · SaaS), nas condições deste Contrato e do **Pedido de Serviço (Order Form)** que constitui o Anexo I.

### 2. Vigência

2.1 Início: data da assinatura do Order Form.
2.2 Vigência: mensal com renovação automática, salvo aviso prévio de 30 dias.
2.3 Período de carência: 30 dias gratuitos a partir do início (se aplicável conforme Order Form).

### 3. Preço e condições de pagamento

3.1 Preço mensal: conforme Order Form.
3.2 Reajuste: anual pelo **IPCA** acumulado dos 12 meses anteriores, no aniversário do contrato.
3.3 Forma de pagamento: cartão recorrente (Pagar.me) ou boleto (vencimento dia 5 do mês subsequente).
3.4 Inadimplência: após 15 dias de atraso, suspensão do serviço; após 30 dias, cancelamento automático com retenção de dados por 60 dias para eventual reativação.

### 4. Nível de Serviço (SLA)

4.1 Disponibilidade-alvo: **99,5%/mês**, medida sobre janelas de 24×7 excetuando manutenção programada.
4.2 Janela de manutenção programada: aviso de 48h, preferencialmente fora do horário comercial de São Paulo.
4.3 Crédito de SLA: se a disponibilidade ficar abaixo do alvo, crédito proporcional na fatura subsequente, limitado ao valor da mensalidade.
4.4 SLA do **DIGIAI App interno** é mais rigoroso (ADR-0005), mas não é objeto deste contrato — Clearix segue o §4.1.

### 5. Propriedade Intelectual

5.1 **Software (Clearix):** propriedade exclusiva da CONTRATADA. O Contrato concede licença **não exclusiva, não transferível, revogável** para uso durante a vigência.
5.2 **Dados da CONTRATANTE:** permanecem de propriedade da CONTRATANTE. CONTRATADA é mera **operadora** desses dados (vide DPA — Anexo II).
5.3 **Customizações específicas** solicitadas pela CONTRATANTE: pertencem à CONTRATADA, com **licença perpétua** para a CONTRATANTE no escopo do uso original.
5.4 **Feedback e melhorias** sugeridos pela CONTRATANTE: livres para incorporação pela CONTRATADA, sem obrigação de royalty.

### 6. Confidencialidade

6.1 Ambas as partes manterão sigilo sobre informações comerciais, técnicas e operacionais da outra durante 5 anos pós-encerramento.
6.2 Exceções: informações publicamente disponíveis, conhecidas previamente, ou exigidas por ordem judicial.

### 7. Proteção de Dados Pessoais (LGPD)

7.1 Tratamento de dados pessoais regido pelo **DPA** (Data Processing Agreement) — Anexo II deste Contrato.
7.2 A CONTRATADA atua como **operadora**; a CONTRATANTE é a **controladora** dos dados de seus clientes finais.

### 8. Limitação de Responsabilidade

8.1 A responsabilidade total da CONTRATADA, por qualquer causa, limita-se à soma dos 12 últimos pagamentos efetivamente recebidos.
8.2 Excluem-se: lucros cessantes, danos indiretos, perda de oportunidade.
8.3 Não há limitação para: dolo, fraude, violação de propriedade intelectual de terceiros, descumprimento da LGPD com culpa.

### 9. Rescisão

9.1 Por conveniência de qualquer parte: aviso de 30 dias.
9.2 Por inadimplência: §3.4.
9.3 Por descumprimento grave: notificação com prazo de cura de 15 dias.
9.4 Pós-rescisão: exportação dos dados da CONTRATANTE em formato CSV/JSON em até 30 dias; após esse prazo, dados são eliminados conforme §5 da Política de Privacidade.

### 10. Uso de Inteligência Artificial

10.1 O serviço utiliza modelos de IA de terceiros (Anthropic, OpenAI, Google) para processar requisições da CONTRATANTE.
10.2 Os dados enviados a esses modelos são processados conforme termos dos respectivos provedores; CONTRATADA seleciona apenas provedores com cláusula de **não-treino com dados de cliente**.
10.3 Outputs gerados por IA são **sugestões**; decisão final é da CONTRATANTE. CONTRATADA não responde por uso indevido de output (ex.: prescrição médica gerada por IA — vide §11).

### 11. Restrições de uso

11.1 É vedado à CONTRATANTE:
- Sublicenciar, revender ou alugar o Clearix a terceiros
- Aplicar engenharia reversa, descompilar ou contornar mecanismos de segurança
- Usar para fins ilícitos ou violar direitos de terceiros
- **Usar outputs de IA como diagnóstico médico ou prescrição definitiva** — apenas como auxílio profissional habilitado

### 12. Foro

Foro da Comarca de **Suzano - SP**, com renúncia a qualquer outro.

### 13. Anexos

- **Anexo I — Order Form:** identificação do plano, preço, contato, data de início
- **Anexo II — DPA (LGPD):** termos específicos de proteção de dados
- **Anexo III — SLA detalhado** (opcional, para clientes enterprise)

---

## Cláusulas opcionais (para enterprise)

### A. Audit right

A CONTRATANTE pode auditar, com aviso de 30 dias e custos próprios, a infraestrutura da CONTRATADA no que se refere ao tratamento de seus dados — limitado a 1 auditoria por ano.

### B. Cláusula de não-aliciamento

Por 12 meses pós-encerramento, nenhuma parte aliciará empregados ou prestadores da outra que tenham atuado neste Contrato.

### C. Garantia de não-infração IP

A CONTRATADA garante que o Clearix não infringe direitos de propriedade intelectual de terceiros; indenizará a CONTRATANTE em caso de reivindicação.

---

## ⚠ Itens que faltam antes de usar este template

1. **Revisão por advogado humano especializado em SaaS B2B** (obrigatório)
2. **Order Form padrão** (Anexo I) com placeholders preenchíveis
3. **DPA detalhado** (Anexo II) — produzir em paralelo
4. **Validação com Konsep** sobre tributação dos pagamentos recorrentes (incidência ISS Suzano, NFS-e)
5. **Definir gateway oficial** (Pagar.me já cadastrado em company.tools)
6. **Política de descontos / pricing** estruturada antes do primeiro Order Form

---

*Este template é interno DIGIAI. Para assinar contrato real com cliente, exige revisão de advogado humano. A versão final deve passar pelos itens 1-6 acima.*
