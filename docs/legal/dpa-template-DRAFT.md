# Data Processing Agreement (DPA) — Anexo II ao MSA DIGIAI ↔ Cliente

> **DRAFT v0.1 · 2026-05-22**
> **Produzido por:** agente `advogado-lgpd` (Claude Opus)
> **Base legal:** LGPD art. 39
> **Status:** análise interna · **NÃO ASSINAR sem revisão por advogado humano e DPO formal**

---

## Identificação

**CONTROLADORA:** *[CONTRATANTE do MSA — razão social, CNPJ]*
**OPERADORA:** DIGIAI ÓTICA E TECNOLOGIA LTDA — CNPJ 12.549.582/0001-49

Este DPA é parte integrante e indissociável do MSA assinado entre as Partes, regulando o tratamento de dados pessoais sob LGPD.

---

## 1. Definições (art. 5 LGPD)

- **Dado Pessoal:** informação relacionada a pessoa natural identificada ou identificável
- **Dado Pessoal Sensível:** dado sobre origem racial, convicção religiosa, opinião política, saúde **(inclui prescrição visual)**, vida sexual, biométrico, genético
- **Tratamento:** toda operação realizada com dados pessoais (coleta, uso, armazenamento, transferência, eliminação, etc.)
- **Titular:** pessoa natural a quem se referem os dados
- **Operadora:** quem realiza tratamento em nome da Controladora (papel da DIGIAI neste DPA)
- **Subprocessadora:** terceiro contratado pela Operadora para tratar dados em seu nome (Supabase, Anthropic, etc.)

## 2. Escopo e finalidade

| Item | Descrição |
|------|-----------|
| **Finalidade** | Execução do MSA — operação do Clearix SaaS contratado pela Controladora |
| **Duração** | Pela vigência do MSA + período de retenção pós-encerramento (§7) |
| **Natureza do tratamento** | Coleta, armazenamento, organização, recuperação, divulgação (somente ao Titular), eliminação |
| **Categorias de Titulares** | Clientes finais da Controladora (Pessoa Natural — pacientes/clientes de ótica) |
| **Categorias de dados** | Identificação, contato, dados de uso, **dados sensíveis: prescrição visual** |

## 3. Obrigações da Operadora (DIGIAI)

A DIGIAI compromete-se a:

3.1 **Tratar dados estritamente conforme as instruções documentadas da Controladora**. Qualquer tratamento fora deste escopo exige autorização escrita.

3.2 **Garantir confidencialidade** — pessoas autorizadas a tratar dados assinam termo de confidencialidade. Atualmente: sócio-administrador Gilberto + agentes AI registrados em `company.contacts` (escopo restrito ao serviço prestado).

3.3 **Aplicar medidas técnicas e organizacionais** adequadas:
- Criptografia em trânsito (HTTPS / TLS 1.2+) — ✅ implementado
- Criptografia em repouso (Supabase nativa) — ⚠ a confirmar
- Controle de acesso por RLS (Row Level Security)
- Logs de acesso e modificação
- Política de senhas / autenticação forte
- Backup com retenção definida

3.4 **Assistir a Controladora** no atendimento aos titulares (direitos do art. 18 LGPD), incluindo:
- Confirmação de existência de tratamento
- Acesso, correção, anonimização, portabilidade, eliminação
- Resposta em até **5 dias úteis** à solicitação da Controladora para que ela possa cumprir o prazo de 15 dias com o titular

3.5 **Notificar a Controladora** em caso de incidente de segurança envolvendo dados da Controladora **em até 48 horas** após detecção, contendo:
- Descrição factual
- Categoria e volume aproximado de dados afetados
- Medidas adotadas e em andamento
- Contato do DPO da Operadora

(O prazo ANPD é 72h para a Controladora notificar — por isso a Operadora notifica em 48h para deixar margem.)

3.6 **Auxiliar a Controladora** em DPIA (Relatório de Impacto), auditorias e atendimento à ANPD.

3.7 **Devolver ou eliminar** dados ao término do MSA, conforme escolha da Controladora, em até 30 dias.

## 4. Subprocessadores autorizados

A Controladora autoriza, pela assinatura deste DPA, o uso dos seguintes subprocessadores:

| Subprocessador | Função | País | Garantia LGPD |
|----------------|--------|------|---------------|
| Supabase Inc | Hosting BD + auth | EUA | Cláusulas contratuais padrão (DPA Supabase) |
| Anthropic | API de IA | EUA | DPA Anthropic + cláusula de não-treino |
| OpenAI | API de IA | EUA | DPA OpenAI + cláusula de não-treino |
| Google Cloud Brasil | Infraestrutura | Brasil | Sujeito direto à LGPD |
| Netlify | Hosting frontend | EUA | DPA Netlify |
| Vercel | Hosting frontend | EUA | DPA Vercel |
| GitHub | Versionamento (sem PII de titular) | EUA | DPA GitHub |
| Pagar.me | Gateway pagamento | Brasil | Sujeito direto à LGPD |
| Z-API | Comunicação WhatsApp | Brasil | DPA Z-API |
| Konsep Contabilidade | Contábil/fiscal | Brasil | Confidencialidade contratual |

Lista atualizada em `company.tools`. Inclusão de novo subprocessador exige aviso prévio de **15 dias** à Controladora, que pode objetar com justificativa.

## 5. Transferência internacional (art. 33 LGPD)

Quando há transferência a subprocessador no exterior (EUA/UE), a Operadora garante que:
- Existem cláusulas contratuais padrão ou padrões equivalentes
- O subprocessador é comprovadamente sujeito a regime de proteção compatível
- O Titular foi informado na Política de Privacidade

## 6. Direitos do Titular

A Operadora encaminhará à Controladora, em até 48 horas, qualquer solicitação direta de Titular relacionada a:
- Acesso, correção, anonimização, eliminação, portabilidade
- Revogação de consentimento
- Reclamação ou denúncia

A Controladora responde diretamente ao Titular; a Operadora apenas presta suporte técnico.

## 7. Retenção e eliminação

| Cenário | Retenção pós-encerramento |
|---------|--------------------------|
| Encerramento normal do MSA | 30 dias para exportação + 60 dias de backup → eliminação |
| Inadimplência (suspensão) | 60 dias mantidos para eventual reativação |
| Ordem judicial / obrigação fiscal | Até cumprimento da obrigação, depois eliminação |

## 8. Auditoria

A Controladora pode solicitar, com aviso de 30 dias e custos próprios:
- Cópia de relatório de compliance LGPD (autoavaliação anual)
- Auditoria in loco — limitada a 1 por ano, escopo definido previamente

## 9. Responsabilidade

9.1 Cada parte responde por suas próprias obrigações sob LGPD.
9.2 Operadora responde solidariamente apenas quando descumprir as obrigações deste DPA ou as instruções documentadas da Controladora (art. 42 §1 II LGPD).

## 10. Vigência e modificação

10.1 Este DPA vigora pela vigência do MSA.
10.2 Mudanças na LGPD ou em regulamentos ANPD que tornem este DPA defasado: revisão obrigatória em até 90 dias.

---

## ⚠ Itens que faltam antes de usar este template

1. **Revisão por advogado humano LGPD** (obrigatório)
2. **Revisão por DPO formal** (não temos ainda)
3. **Lista de subprocessadores** com versões finais dos DPAs de cada um anexada
4. **Confirmar criptografia em repouso** no Supabase (técnico)
5. **Implementar canal do titular** funcional antes da primeira assinatura
6. **DPIA preliminar** para o processamento de prescrição visual (dado sensível)

---

*Este template é interno LGPD. Para assinar com cliente real, exige revisão de advogado humano e DPO formal.*
