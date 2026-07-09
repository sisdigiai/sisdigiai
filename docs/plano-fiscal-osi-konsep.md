# Plano de Ação Fiscal — DIGIAI ÓTICA E TECNOLOGIA LTDA
## Produto: Ótica Sem Improviso (OSI) · Lançamento junho/2026

> Gerado em 2026-06-09 pelo agente consultor-tributario. **Análise interna — confirmar com a Konsep Contabilidade antes de declarar, recolher ou optar por qualquer regime.**

Entidade: **DIGIAI LTDA · CNPJ 12.549.582/0001-49** — tratada de forma totalmente separada do EI Grupo TGJ Import. Nenhuma receita, despesa ou obrigação acessória das duas entidades se mistura nestas análises.

---

## PARTE 1 — Nota Fiscal via Hotmart e Kiwify

### Modelo fiscal de cada plataforma

Ambas as plataformas atuam como **intermediadoras de pagamento e distribuição**, não como compradoras do seu produto. O modelo fiscal é idêntico nas duas:

| Ponto | Hotmart | Kiwify |
|-------|---------|--------|
| Quem emite NFS-e ao comprador final | **A DIGIAI** | **A DIGIAI** |
| Para quem a DIGIAI emite | Comprador final (CPF ou CNPJ do cliente) | Comprador final (CPF ou CNPJ do cliente) |
| Valor da nota | **Valor bruto total pago pelo cliente** (R$ 48,50) | **Valor bruto total pago pelo cliente** (R$ 48,50) |
| Taxa da plataforma desconta da NF? | Não — é despesa operacional da DIGIAI | Não — é despesa operacional da DIGIAI |
| A plataforma emite NF para a DIGIAI? | Sim — NFS-e das comissões cobradas por ela | Sim — até dia 10 do mês seguinte, sobre suas taxas |
| Tipo de nota | NFS-e (serviço digital) | NFS-e (serviço digital) |

Referência legal: LC 116/2003 (ISS), art. 3º — o serviço considera-se prestado no estabelecimento do prestador (Suzano-SP), salvo exceções do mesmo artigo.

### Fluxo prático mensal recomendado

Enquanto a Inscrição Municipal (IM) não estiver regularizada, a emissão de NFS-e pelo sistema da Prefeitura de Suzano fica bloqueada. Por isso o fluxo tem dois momentos:

**Fase A — Período pré-IM (agora até obter a IM):**
- Registrar as vendas internamente (relatórios de vendas Hotmart/Kiwify), armazenar os dados dos compradores (CPF/CNPJ, e-mail, valor)
- Não emitir NFS-e ainda — não existe base legal para emitir sem IM ativa no município
- Assim que a IM for obtida, emitir NFS-e retroativa para todas as vendas do período, se o sistema da prefeitura permitir, ou emitir competência a competência
- Confirmar com Konsep se Suzano permite NFS-e retroativa ou se há risco de multa por emissão fora do prazo

**Fase B — Após IM regularizada:**

| Quando | Ação | Responsável |
|--------|------|-------------|
| Diário/semanal | Baixar relatório de vendas nas plataformas | Gilberto |
| Até dia 5 do mês seguinte | Emitir NFS-e no sistema da Prefeitura de Suzano para cada venda do mês anterior (ou usar sistema integrado como eNotas que automatiza via webhook) | Gilberto ou Konsep |
| Até dia 10 do mês seguinte | Receber NF de taxas da Kiwify e arquivar como despesa | Gilberto |
| Até dia 20 do mês | Pagar DAS do Simples com base na receita bruta do mês anterior | Gilberto |

**Observação sobre vendas B2B (óticas como PJ):** quando o comprador for pessoa jurídica, a NFS-e deve conter o CNPJ do comprador. A LC 116/2003, art. 6º, permite que municípios atribuam retenção do ISS ao tomador quando este for PJ do mesmo município. Se a ótica compradora for de Suzano-SP, pode haver obrigação de retenção do ISS na fonte pelo tomador. Confirmar com Konsep.

---

## PARTE 2 — CNAE: 6202-3/00 cobre infoproduto/curso?

CNAE **6202-3/00** (desenvolvimento e licenciamento de programas customizáveis) cobre software sob encomenda. O OSI é um **infoproduto de conteúdo educacional** (manual PDF + app de leitura + suporte) — há risco de questionamento ao enquadrar curso nesse CNAE.

**CNAEs mais adequados para o OSI:**

| CNAE | Descrição | Anexo Simples | Alíquota inicial | Risco ISS |
|------|-----------|---------------|-----------------|-----------|
| **8599-6/04** | Treinamento em desenvolvimento profissional e gerencial | III (com Fator R) ou V | 6% / 15,5% | Baixo — encaixa bem |
| **8599-6/99** | Outras atividades de ensino | III (com Fator R) ou V | 6% / 15,5% | Baixo |
| 6203-1/00 | Desenv. de programas não-customizáveis | III (com Fator R) ou V | 6% / 15,5% | Moderado |

**Recomendação (a validar com Konsep):** ativar **8599-6/04** como CNAE secundário. Verificar se já consta no contrato social — se sim, é só atualização cadastral; se não, requer aditivo.

### Fator R (decide Anexo III vs V)

```
Fator R = Σ folha de pagamento (12 meses) ÷ Σ receita bruta (12 meses)
≥ 28% → Anexo III (6%) · < 28% → Anexo V (15,5%)
```

Folha inclui: pró-labore + INSS sobre pró-labore + salários + 13º + FGTS.

| Cenário | Pró-labore mensal | Fator R | Anexo | Alíquota efetiva |
|---------|-------------------|---------|-------|-----------------|
| Sem pró-labore | R$ 0 | 0% | **V** | 15,5% |
| 1 SM (R$ 1.518) com receita baixa | R$ 1.518 | >100% | **III** | 6% |
| Receita R$ 50k/ano · pró-labore R$ 1.200 | R$ 1.200 | 28,8% | **III** | 6% |

**A diferença é brutal: 6% vs 15,5%.** Qualquer pró-labore ≥ 28% da receita média mensal garante Anexo III. Atenção: pró-labore gera INSS de 11% do sócio (contribuinte individual) — entrar no cálculo de viabilidade.

---

## PARTE 3 — ISS Suzano-SP

- Código Tributário de Suzano (LC 39/97, alterações LC 316/2018 e 367/2022): alíquotas de **2% a 5%**; regra geral sem alíquota específica = **5%** (presunção conservadora até confirmar).
- Item da lista LC 116/2003 aplicável: **8.02** (instrução, treinamento, orientação pedagógica) — confirmar alíquota específica com Konsep.
- Tomador PJ de Suzano pode ter obrigação de **reter ISS na fonte** (art. 6º LC 116/2003) — confirmar.
- Venda a CPF: sem retenção, DIGIAI recolhe (via DAS).
- **Sem Inscrição Municipal ativa não há emissão de NFS-e em Suzano.** Cada venda antes da IM é tecnicamente venda sem nota — prioridade máxima.

---

## PARTE 4 — Carga no Simples Nacional (faixa 1, até R$ 180k acum.)

| Regime | Alíquota efetiva | DAS por venda de R$ 48,50 |
|--------|-----------------|---------------------------|
| **Anexo III** (com Fator R) | **6,00%** | R$ 2,91 |
| **Anexo V** (sem Fator R) | **15,50%** | R$ 7,52 |

Projeção ao escalar (Anexo III): R$ 50k/ano → 6,00% · R$ 100k → ~6,54% · R$ 180k → ~7,22% · R$ 360k → ~8,10% (vira EPP). Acima de R$ 4,8M/ano: exclusão do Simples. O ISS dentro do DAS é declarado via PGDAS-D — a NFS-e emitida deve ser consistente com o PGDAS-D, divergência gera autuação.

---

## PARTE 5 — Sweat equity / aporte intelectual R$ 312.433

**O tratamento atual (só gerencial, `kind = aporte_intelectual`, sem efeito fiscal) está CORRETO.**

Base: Código Civil art. 1.055 §2º — **é vedada** contribuição em serviços para integralizar capital de LTDA.

| Opção | Risco | Veredito |
|-------|-------|----------|
| **A — Manter só gerencial (atual)** | Nenhum risco direto | **Caminho seguro. Manter.** |
| B — Aumento de capital em dinheiro real | Baixo (com origem justificável) | Possível, exige dinheiro real + aditivo |
| C — Integralizar bens físicos com avaliação | Médio (CC art. 1.055 §1º) | Possível para bens existentes |
| D — Pró-labore retroativo | INSS/IRRF retroativos — alto | **Não recomendado** |

Riscos de tratar errado: lançar como despesa dedutível fictícia = crime tributário (Lei 8.137/90 art. 1º, II); registrar como aporte sem integralização real = nulidade. Pedir à Konsep ratificação formal em memorando de política contábil.

---

## PARTE 6 — Checklist ordenado (caminho crítico)

```
1. Transição CNPJ na RFB → 2. Inscrição Municipal Suzano → 3. Credenciamento NFS-e
   → 4. Emissão de notas (OSI) · em paralelo: e-CNPJ A1
```

| # | Pendência | Responsável | Prazo | Observações |
|---|-----------|-------------|-------|-------------|
| 1 | Confirmar transição do CNPJ na RFB (situação "Ativa" como DIGIAI LTDA) | Gilberto + Konsep | **Semana 1** | cadastro.receita.fazenda.gov.br |
| 2 | Inscrição Municipal Suzano | Konsep | Semana 1-2 | Prefeitura: 2 dias (baixo risco) ou 15 dias (com vistoria) |
| 3 | IE — avaliar | Konsep | Semana 2 | Infoproduto = serviço (ISS) = **sem IE obrigatória**; só se voltar comércio físico |
| 4 | e-CNPJ A1 | Gilberto | Semana 2-3 | Serpro/Certisign/Valid/Soluti · R$ 200-400 · 1-3 anos |
| 5 | Credenciamento NFS-e Suzano | Gilberto/Konsep | Após IM | — |
| 6 | Definir pró-labore / Fator R | Konsep | Antes da 1ª venda tributável | Configurar PGDAS-D |
| 7 | CNAE 8599-6/04 no contrato social | Konsep | Semana 2-3 | Aditivo só se não constar |
| 8 | Ratificar sweat equity (memorando) | Konsep | Reunião inaugural | — |

---

## PARTE 7 — Pauta de reunião com a Konsep (60-90 min)

1. **Transição do CNPJ:** o 12.549.582/0001-49 já está "Ativo" na RFB como DIGIAI LTDA? Obrigações acessórias em aberto desde 21/05/2026?
2. **IM Suzano:** podem dar entrada esta semana? Qual a alíquota de ISS para o item 8.02 no Código Tributário vigente?
3. **Nota antes da IM:** vendas de agora ficam sem nota? Risco de autuação? NFS-e retroativa é possível em Suzano?
4. **Fator R:** qual pró-labore mínimo do Gilberto para garantir Anexo III? Impacto INSS + IRPF dele?
5. **CNAE 8599-6/04:** já está coberto no contrato social ou precisa de aditivo?
6. **Sweat equity R$ 312.433:** ratificam o tratamento só-gerencial? Memorando de política contábil?
7. **IE:** vendendo só infoproduto, precisa? E se vender produto físico futuramente neste CNPJ?
8. **Obrigações mensais:** o que a DIGIAI já deve hoje mesmo com receita zero (PGDAS-D, DEFIS, eSocial se houver pró-labore)? Honorário da gestão completa?

---

## Nota — Reforma Tributária 2026

IBS/CBS em fase de testes a partir de 2026, consolidação até 2033. O regime vigente (ISS + Simples) continua operacional e aplicável à DIGIAI. Nenhuma mudança estrutural necessária agora.

Referências: LC 123/2006; LC 116/2003; Resoluções CGSN 140/2018 e 183/2025; CC art. 1.055 §2º; LC Municipal Suzano 39/97, 316/2018, 367/2022.
