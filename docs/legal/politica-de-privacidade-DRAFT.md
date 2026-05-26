# Política de Privacidade — DIGIAI ÓTICA E TECNOLOGIA LTDA

> **DRAFT v0.1 · 2026-05-22**
> **Produzido por:** agente `advogado-lgpd` (Claude Opus)
> **Status:** análise interna · **NÃO substitui revisão por advogado humano antes de publicar**
> **Próximo passo:** revisar com counsel humano + nomear DPO formal + publicar em URL próprio

---

## Identificação

**Controlador:** DIGIAI ÓTICA E TECNOLOGIA LTDA
**CNPJ:** 12.549.582/0001-49
**Endereço:** Rua General Francisco Glicério, 940 - Térreo Sala 02, Jardim Guaio, Suzano - SP, CEP 08674-000
**Encarregado de Dados (DPO):** *a definir — sócio-administrador Gilberto interinamente, com suporte de agente AI especialista (Claude Opus) registrado em company.contacts*
**Canal do titular:** *a definir — recomendado email dedicado dpo@digiai.com.br quando domínio próprio for registrado*
**Data de vigência:** *a publicar*
**Versão:** v0.1 (não publicada)

---

## 1. Quem somos

A DIGIAI é uma empresa de tecnologia que desenvolve software customizável (CNAE 6202-3/00) e oferece soluções no ecossistema óptico (Clearix), educação técnica (Clearix Academy) e produtos auxiliares. Atuamos como **controlador** de dados pessoais nesta relação.

## 2. Quais dados coletamos

### 2.1 Dados que você nos fornece diretamente
- **Identificação:** nome completo, CPF, RG, data de nascimento (quando exigido por contrato comercial)
- **Contato:** email, telefone, WhatsApp, endereço
- **Comerciais:** razão social/CNPJ (B2B), cargo, dados de pagamento (cartão é processado pelo gateway, não armazenado por nós)

### 2.2 Dados de uso do produto (Clearix e demais)
- **Logs de acesso:** IP, data/hora, páginas visitadas, ações executadas
- **Identificadores:** cookies de sessão, ID do dispositivo
- **Dados de uso da plataforma:** consultas, relatórios gerados, configurações salvas

### 2.3 Dados sensíveis (apenas no Clearix, com cliente de ótica)
- **Prescrição visual / receita médica** *(quando o cliente da ótica usa o Clearix para registro de pedido)*
- Base legal: execução de contrato + consentimento específico
- Tratamento: **criptografia em repouso e em trânsito; acesso restrito por RLS**

## 3. Bases legais (art. 7 e 11 LGPD)

| Finalidade | Base legal | Artigo |
|------------|-----------|--------|
| Cadastro e autenticação | Execução de contrato | art. 7, V |
| Faturamento e emissão de NF | Cumprimento de obrigação legal | art. 7, II |
| Atendimento ao titular | Execução de contrato | art. 7, V |
| Melhoria do produto (analytics agregado) | Legítimo interesse | art. 7, IX |
| Marketing (envio de comunicações) | Consentimento revogável | art. 7, I |
| **Prescrição visual (Clearix)** | Execução de contrato + Consentimento | art. 7, V + art. 11, II, a |
| Atendimento à ANPD ou ordem judicial | Cumprimento de obrigação legal | art. 7, VI |

## 4. Com quem compartilhamos

### Operadores (subprocessadores)
- **Supabase Inc** (EUA) — hosting de banco e autenticação
- **Anthropic** (EUA) — APIs de IA (Claude)
- **OpenAI** (EUA) — APIs de IA (GPT)
- **Google Cloud Brasil** — infraestrutura e APIs
- **GitHub** (EUA) — versionamento de código (não trata PII de cliente final)
- **Pagar.me / EBANX** (Brasil) — processamento de pagamentos
- **Z-API** (Brasil) — comunicação WhatsApp Business
- **Konsep Contabilidade** (Brasil) — contábil/fiscal (acesso a dados de NF e folha)

### Transferência internacional (art. 33 LGPD)
Os subprocessadores americanos operam sob padrões contratuais que asseguram nível de proteção compatível com a LGPD. Lista atualizada disponível em **company.tools** e **company.contacts** do nosso painel interno; publicaremos versão sintética nesta política.

## 5. Por quanto tempo guardamos

| Categoria | Retenção |
|-----------|----------|
| Dados de cadastro ativos | Durante a relação + 5 anos pós-encerramento (prescrição civil) |
| Notas fiscais e financeiro | 5 anos (obrigação fiscal) |
| Logs de acesso | 6 meses |
| Prescrição visual | Conforme acordo com cliente (ótica) — mínimo 5 anos |
| Marketing | Até revogação do consentimento |

Após o prazo, dados são **anonimizados ou eliminados**.

## 6. Seus direitos (art. 18 LGPD)

Você tem direito a, a qualquer momento:
- **Confirmação** da existência de tratamento
- **Acesso** aos dados
- **Correção** de dados incompletos, inexatos ou desatualizados
- **Anonimização, bloqueio ou eliminação** de dados desnecessários
- **Portabilidade** a outro fornecedor
- **Eliminação** de dados tratados com base em consentimento
- **Informação** sobre compartilhamento
- **Revogação do consentimento**

**Como exercer:** envie email ao canal do titular (a publicar). Respondemos em até **15 dias úteis** (art. 19 LGPD).

## 7. Cookies e tecnologias similares

Usamos:
- **Cookies essenciais** (sessão, autenticação) — sem necessidade de consentimento
- **Cookies de preferência** (idioma, tema) — sem necessidade de consentimento
- **Cookies analíticos** (sem identificação pessoal) — base: legítimo interesse
- **Cookies de marketing** — **somente com consentimento explícito** via banner

Banner de cookies em conformidade com Resolução CD/ANPD nº 4/2024 *a implementar*.

## 8. Segurança

Adotamos medidas técnicas e administrativas:
- ✅ Criptografia em trânsito (HTTPS / TLS 1.2+)
- ⚠ Criptografia em repouso (Supabase nativa — confirmar configuração)
- ⚠ Controle de acesso por RLS (Row Level Security) — auditoria pendente
- ⚠ Política de backup com retenção — definir
- ⚠ Plano de resposta a incidentes 72h — em elaboração (ver `docs/legal/plano-incidentes-lgpd.md`)
- ⚠ Treinamento LGPD da equipe — pendente

## 9. Incidentes

Em caso de **incidente de segurança que possa acarretar risco ou dano relevante** aos titulares, comunicaremos a ANPD em prazo razoável (**lido como 72h pela ANPD**) e os titulares afetados conforme art. 48 LGPD.

## 10. Crianças e adolescentes

Não direcionamos nossos serviços a menores de 18 anos. Caso identifiquemos dados de menor sem consentimento de responsável (art. 14 LGPD), excluiremos prontamente.

## 11. Alterações desta Política

Esta Política pode ser atualizada. **A versão vigente é a desta página**; histórico em `docs/legal/`. Mudanças materiais serão comunicadas com 30 dias de antecedência.

## 12. Contato

- **DPO (Encarregado):** *a definir*
- **Canal do titular:** *a definir* (recomendado `dpo@digiai.com.br` quando domínio próprio for emitido)
- **Endereço postal:** Rua General Francisco Glicério, 940 - Térreo Sala 02, Jardim Guaio, Suzano - SP, CEP 08674-000

---

## ⚠ Itens que faltam antes de publicar

1. **Nomear DPO formalmente** (registro em `company.legal_status.dpo_nomeado`, ata de assembleia ou ato societário)
2. **Definir email do canal do titular** (idealmente `dpo@digiai.com.br` em domínio próprio)
3. **Registrar domínio próprio** (`digiai.com.br` ou alternativa)
4. **Configurar Google Workspace** (gap do roadmap Fase 0)
5. **Validar criptografia em repouso no Supabase** (técnico)
6. **Implementar banner de cookies** (Resolução ANPD 4/2024)
7. **Revisão por advogado humano** antes de publicar
8. **Definir URL final** (ex.: `digiai.com.br/privacidade`)

---

*Este draft é interno LGPD. Para publicar como política oficial, exige revisão de advogado humano e/ou DPO formal. A versão publicada deve passar pelos itens 1-8 acima.*
