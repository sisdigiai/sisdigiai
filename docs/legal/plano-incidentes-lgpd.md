# Plano de Resposta a Incidentes de Segurança — LGPD

> **DRAFT v0.1 · 2026-05-22**
> **Produzido por:** agente `advogado-lgpd` (Claude Opus)
> **Base legal:** art. 48 LGPD · Lei 13.709/2018
> **Prazo ANPD:** 72 horas (em prática)

---

## Objetivo

Garantir que, em caso de **incidente de segurança que possa acarretar risco ou dano relevante** aos titulares, a DIGIAI ÓTICA E TECNOLOGIA LTDA reaja de forma estruturada, comunique ANPD e titulares afetados em prazo conforme art. 48 LGPD, e documente o evento para fins regulatórios e melhoria contínua.

## Definição de incidente

**Incidente de segurança** = qualquer evento que afete:
- Confidencialidade (acesso não autorizado)
- Integridade (alteração/destruição não autorizada)
- Disponibilidade (indisponibilidade prolongada)

de dados pessoais sob nossa responsabilidade.

**Incidente comunicável** (gatilho para ANPD) = quando o incidente possa acarretar **risco ou dano relevante** ao titular. Critérios para "risco relevante":
- Dados sensíveis envolvidos (prescrição visual, dados financeiros, autenticação)
- Volume significativo de titulares
- Possibilidade de fraude, discriminação ou prejuízo material
- Compartilhamento com terceiro não autorizado

## Equipe de resposta (CSIRT interno)

| Papel | Responsável | Contato |
|-------|-------------|---------|
| **Coordenador do Incidente** | Gilberto (sócio-administrador) | oticastatymello@gmail.com |
| **DPO** | *a definir* | *a publicar canal* |
| **Consultor técnico** | Agente AI `consultor-tecnico` (Claude Opus) | via Agent tool |
| **Consultor jurídico** | Agente AI `advogado-lgpd` (Claude Opus) + counsel humano (a contratar) | via Agent tool |
| **Contabilista (se houver implicação fiscal)** | Konsep Contabilidade | comercial@konsepcontabilidade.com.br |

---

## Linha do tempo de resposta

### **Hora 0** — Detecção/notificação

- [ ] Quem detectou registra: data/hora, descrição factual, sistema afetado, dados afetados (categoria + volume estimado), evidência (logs/screenshots/email)
- [ ] **Acionar Coordenador** imediatamente (WhatsApp/telefone)
- [ ] **Não pisar em evidência:** isolar logs, preservar estado do sistema afetado

### **Hora 0 → 1** — Triagem

- [ ] Coordenador convoca CSIRT (mesmo virtualmente)
- [ ] Classificação preliminar: **incidente comunicável?** (sim/não/em análise)
- [ ] Decisão sobre **contenção imediata** (revogar credenciais, bloquear IP, isolar serviço)
- [ ] **Iniciar registro formal** em `docs/legal/incidentes/AAAA-MM-DD-titulo-curto.md`

### **Hora 1 → 24** — Contenção + análise

- [ ] **Contenção:** parar a sangria. Trocar secrets, revogar tokens, aplicar patch, remover acesso indevido
- [ ] **Análise forense leve:**
  - Logs do Supabase (auth + DB queries)
  - Logs do Netlify/Vercel se aplicável
  - GitHub audit log se envolveu credenciais de código
  - Quem teve acesso? Quanto tempo? Que dados?
- [ ] Estimar **volume de titulares afetados** e **categoria de dados**
- [ ] Consultar agente `advogado-lgpd` para classificar gravidade

### **Hora 24 → 48** — Decisão sobre comunicação

- [ ] Decisão CSIRT: **comunica ANPD?** Critérios:
  - Dados sensíveis? → sim
  - >100 titulares? → sim
  - Risco de fraude/discriminação? → sim
  - Apenas teste interno sem PII real? → não, mas registrar internamente
- [ ] Se sim, **iniciar redação do comunicado ANPD** (ver template em §Templates)
- [ ] Identificar **titulares afetados** (lista nominal ou critério de busca)

### **Hora 48 → 72** — Comunicação

- [ ] **Comunicar ANPD** via canal oficial (https://www.gov.br/anpd) com:
  - Descrição do incidente
  - Volume e categoria de dados
  - Risco identificado
  - Medidas adotadas
  - Medidas a serem adotadas
- [ ] **Comunicar titulares afetados** (email, WhatsApp ou outro canal de contato cadastrado):
  - Linguagem clara, sem juridiquês
  - Explicar o que aconteceu, que dados foram afetados, o que estamos fazendo, o que o titular pode fazer
- [ ] Counsel humano valida ambas as comunicações

### **Pós-72h** — Remediação e aprendizado

- [ ] **RCA (Root Cause Analysis):** documentar causa-raiz, decisões, gaps explorados
- [ ] **Plano de remediação:** medidas técnicas, processuais e treinamento
- [ ] **Atualização da Política de Privacidade** se aplicável (§8 segurança)
- [ ] **Lessons learned** registrado em `docs/legal/incidentes/post-mortem.md`
- [ ] **Re-treinamento da equipe** se humano envolvido
- [ ] **Migration de segurança** se vulnerabilidade técnica identificada

---

## Templates

### Comunicado ANPD (esqueleto)

```
Para: Autoridade Nacional de Proteção de Dados (ANPD)
Assunto: Comunicação de Incidente de Segurança — art. 48 LGPD
Controlador: DIGIAI ÓTICA E TECNOLOGIA LTDA — CNPJ 12.549.582/0001-49
DPO: [nome] — [contato]
Data do incidente: AAAA-MM-DD HH:MM (BRT)
Data da detecção: AAAA-MM-DD HH:MM (BRT)
Data desta comunicação: AAAA-MM-DD

1. Descrição factual: [...]
2. Categoria de dados envolvidos: [...]
3. Volume de titulares: [estimado/confirmado]
4. Riscos identificados: [...]
5. Medidas adotadas até esta comunicação: [...]
6. Medidas em andamento ou planejadas: [...]
7. Anexos: [logs, prints, RCA preliminar]
```

### Comunicado ao titular (esqueleto pt-BR claro)

```
Olá [Nome],

Estamos te escrevendo para informar sobre um incidente de segurança envolvendo
seus dados na DIGIAI.

O que aconteceu:
[Descrição simples — o que foi afetado, quando, por quanto tempo.]

Quais dados foram afetados:
[Lista clara — ex: "seu nome, email e telefone. Não foram afetados:
prescrição visual, dados de pagamento."]

O que estamos fazendo:
[Medidas adotadas — ex: "trocamos as credenciais de acesso, revogamos a sessão
suspeita, comunicamos a ANPD."]

O que você pode fazer:
[Recomendações práticas — trocar senha, ativar 2FA, ficar atento a phishing.]

Como falar conosco:
[Email DPO + telefone]

Atenciosamente,
DIGIAI ÓTICA E TECNOLOGIA LTDA
```

---

## ⚠ Itens pendentes antes deste plano estar "pronto"

1. **Nomear DPO formalmente** com email publicado
2. **Definir canal de comunicação do titular** (email dedicado)
3. **Contratar counsel humano** para validar comunicações em casos reais
4. **Configurar alertas técnicos** (Supabase, GitHub, etc.) que apontem incidentes em potencial
5. **Treinar a equipe** (atualmente só o Gilberto + IA) no playbook acima
6. **Tabela de classificação de severidade** (alta/média/baixa) com critérios numéricos
7. **Testar uma vez** com cenário fictício antes do primeiro incidente real

---

*Este plano é interno LGPD. Para acionar em incidente real, revisar com advogado humano em paralelo à execução. Toda decisão de comunicação ANPD/titular envolve counsel — o playbook orienta, não decide.*
