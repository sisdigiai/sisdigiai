# Simulação Tributária — DIGIAI ÓTICA E TECNOLOGIA LTDA

> **Produzido por:** agente `consultor-tributario` (Claude Sonnet)
> **Data:** 2026-05-22
> **Status:** análise interna · **NÃO substitui o contador** (Konsep)
> **Para validação:** Natanael/Rosilene · comercial@konsepcontabilidade.com.br

---

## Contexto

- **Razão social:** DIGIAI ÓTICA E TECNOLOGIA LTDA
- **CNPJ:** 12.549.582/0001-49 (em transição RFB — ainda figura como antigo EI)
- **Natureza:** Sociedade Limitada · **Microempresa** (LC 123/2006)
- **Regime escolhido:** **Simples Nacional** (cláusula 10ª do contrato social)
- **CNAE principal:** 6202-3/00 · Desenvolvimento e licenciamento de programas customizáveis
- **CNAEs secundários:** 4752-1/00, 4774-1/00, 5811-5/00, 6203-1/00, 8599-6/04
- **Receita atual DIGIAI LTDA:** R$ 0 (Fase 0 — sem clientes)
- **Folha de pessoal:** R$ 0 (sem funcionários; sócio único Gilberto sem pro-labore ainda)

---

## Pergunta-chave: Anexo III vs Anexo V?

O CNAE 6202-3/00 (software customizável) é classificado por padrão no **Anexo V** do Simples (alíquota inicial 15,5%, máxima 30,5%). **MAS** pode migrar para o **Anexo III** (alíquota inicial 6%, máxima 33%) se atender ao **Fator R**:

> **Fator R ≥ 28%** → folha de pessoal (12 meses) ÷ receita bruta (12 meses) ≥ 28%

Pro-labore conta como folha para fins de Fator R. Distribuição de lucros NÃO conta.

---

## Cenários de receita × pro-labore necessário

Receita anual projetada × Fator R 28% → folha mínima → pro-labore mensal mínimo:

| Receita anual | Folha min (28%) | Pro-labore mensal mín | Anexo III viável? |
|--------------:|-----------------:|---------------------:|:-----------------:|
| R$ 50.000     | R$ 14.000        | R$ 1.167             | ✅ |
| R$ 100.000    | R$ 28.000        | R$ 2.333             | ✅ |
| R$ 200.000    | R$ 56.000        | R$ 4.667             | ✅ |
| R$ 360.000 (cap ME) | R$ 100.800 | R$ 8.400          | ✅ |
| R$ 500.000    | R$ 140.000       | R$ 11.667            | ✅ (vira EPP) |

> **Atenção:** considera apenas o pro-labore principal. Encargos (INSS empresa 20% sobre pro-labore + 11% do sócio = 31% no total) e 13º não contam pro Fator R em si, mas impactam o caixa real.

---

## Comparação de alíquota efetiva (faixa inicial até R$ 180k/ano)

| Anexo | Alíquota nominal | Dedução | Alíquota efetiva em R$ 180k |
|-------|-----------------:|--------:|---------------------------:|
| **III** (com Fator R) | 6,00% | R$ 0      | **6,00%** |
| **V**  (sem Fator R)  | 15,50% | R$ 0     | **15,50%** |

**Diferença:** ~9,5 pontos percentuais de alíquota → economia de até R$ 17.100 ao ano em R$ 180k de receita.

Em R$ 360k/ano:
- Anexo III: alíquota nominal 11,2% / dedução R$ 9.360 → efetiva ~8,6% → **R$ 30.960**
- Anexo V: alíquota nominal 18,0% / dedução R$ 4.500 → efetiva ~16,75% → **R$ 60.300**
- **Diferença: ~R$ 29.340/ano** de tributos a menos no Anexo III.

---

## Recomendação

1. **Mirar Anexo III** desde a primeira receita do Clearix. Configurar pro-labore mínimo do Gilberto para garantir Fator R ≥ 28% antes do término do 13º mês de operação.
2. **Reserva técnica:** projetar pro-labore + encargos no fluxo de caixa antes de declarar a receita do mês.
3. **Anexo III aplicável apenas à receita de software**. Receita de varejo (4752-1/00, 4774-1/00) cai em **Anexo I** (alíquota inicial 4%). Educação (8599-6/04) cai em **Anexo III** (alíquota 6%). Como a DIGIAI LTDA tem portfólio misto, a Konsep precisará configurar **nota fiscal segregada por CNAE** desde o início.
4. **Início efetivo das atividades:** 21/05/2026 (cláusula 4ª do contrato). DAS começa a partir do primeiro mês de receita.
5. **Cap ME (R$ 360k/ano):** se ultrapassar, transição automática para EPP até R$ 4,8M.
6. **EI antigo (Grupo TGJ Import) ainda existe** com mesmo CNPJ na RFB. Receita do varejo da loja física ainda transita pelo EI até a migração completar — **não misturar** com simulação da LTDA nova.

---

## Retenções relevantes em pagamentos a SaaS internacional

Pagamento a vendor estrangeiro (Anthropic, OpenAI, Supabase, GitHub, Netlify, Vercel, Higgsfield, Fabbler) **pode ter retenções**:

| Tributo | Base | Alíquota | Quando aplica |
|---------|------|---------:|---------------|
| **IRRF** | Valor remetido | **15%** (ou 25% paraíso fiscal) | Pagamento a pessoa jurídica no exterior por serviço técnico/royalty |
| **CIDE** | Valor remetido | **10%** | Royalty/licença de software (depende do contrato) |
| **PIS/COFINS-Importação** | Valor + IOF + IRRF | **9,25%** | Importação de serviço |

> Hoje, a DIGIAI paga esses SaaS via **EBANX/cartão** que recolhe automaticamente IOF. As retenções acima são **da PJ pagadora ao Fisco** quando há remessa direta. Como vai via cartão, o intermediário (banco/processador) faz a contabilização. **Validar com Konsep** se a contabilização atual está correta — risco de auto-arbitramento se inspeção.

---

## Próximos passos com a Konsep

1. Comunicar a opção pelo **Anexo III** desde a primeira NF emitida.
2. Definir o **pro-labore mínimo** do Gilberto considerando a projeção de receita do Clearix dos próximos 3 meses.
3. Solicitar à Konsep:
   - Confirmação do Anexo III para software customizável (CNAE 6202-3/00)
   - Como segregar NF por CNAE (Anexo I varejo · Anexo III software/educação)
   - Tratamento contábil das retenções em pagamentos a SaaS internacional
   - Cronograma de Inscrição Estadual (SEFAZ) e Municipal (Suzano) — precisa para emitir NF
   - Certificado digital A1 (PJ) — fundamental para NFS-e Suzano

---

*Esta análise é interna e não constitui aconselhamento contábil-fiscal formal. Confirmar com Konsep Contabilidade & Consultoria antes de declarar/recolher/optar.*
