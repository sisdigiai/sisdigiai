# Portão 65 — views DEFINER lidas por `authenticated`

> Medição do orquestrador do app digiai · 2026-09-09 · **nada aplicado**
> Critério, e o método que a lição do MKT pede: primeiro o universo (todas as views
> de **todos** os schemas expostos), depois o filtro.

## 1. O número, e por que 109 e 71 divergiam

| passo | público | marketing | mkt | total |
|---|---|---|---|---|
| views nos schemas expostos | 150 | 3 | 1 | 154 |
| … **definer** (sem `security_invoker=true`) | 71 | 3 | 1 | **75** |
| … **e** `authenticated` tem SELECT | 71 | 3 | 1 | **75** |
| … **e** alguma tabela-base tem RLS ligada | 69 | 3 | 1 | **73** |

**73** é o número do portão. O teu 71 era o recorte certo aplicado só a `public`;
os 109 do MKT devem incluir views *invoker* (que não ignoram RLS) ou views sobre
tabelas sem RLS. As **2** views definer de `public` que sobram não tocam tabela
com RLS — definer nelas não muda nada.

## 2. O corte que separa risco real de risco nominal

Definer só é problema se a RLS da base **restringe alguém**. Classifiquei pelas
policies das tabelas-base:

| | |
|---|---|
| RLS da base é **por papel** (`is_admin`, `is_staff`, `is_super_admin`, `auth.uid`) | **63** ← risco real |
| RLS da base é permissiva / sem papel | 10 ← nominal |

Nas 63, um logado qualquer lê o que a policy reservava a staff/admin.

## 3. ⚠ O risco mudou HOJE, e a mudança foi minha

Até hoje `authenticated` era só o dono (`super_admin`), então as 63 não expunham
nada a ninguém. **A migration 093 criou o papel `vendas`** — não-privilegiado de
propósito, que não enxerga Financeiro nem Cobrança **no front**.

Mas `vendas` é `authenticated`. Pelas views definer ele lê, entre outras:

- `v_billing_subscriptions`, `v_billing_mrr` — assinantes e MRR
- `v_telao_financeiro` — despesas e receita, de `finance.*`
- `v_marketing_hotmart_sales` — vendas, de `billing.*` e `finance.products`
- `v_proposals`, `v_meeting_sessions` — propostas e reuniões

> **É o desalinhamento front × banco que originou a auditoria, e eu acabei de
> criar o papel que o torna observável.** Não é buraco novo: é o buraco de sempre,
> que só não tinha quem o atravessasse. Agora tem — no dia em que a primeira conta
> `vendas` existir.

**Consequência para o portão 47** (conta de teste `vendas`): ela deixa de ser só a
prova de que não houve escalada na escrita. Passa a ser **a prova de que há
escalada na leitura** — e o resultado esperado do teste **inverte**: hoje, essa
conta LERIA o financeiro pelas views. Se ler, o portão 65 tem de vir antes de
qualquer `vendas` real ser criada.

## 4. As minhas, classificadas por consumidor medido

Consumidores medidos por varredura de código, **excluindo `database.types.ts`** —
arquivo gerado que lista todas as views do banco e faz qualquer view parecer usada.
A primeira varredura, sem essa exclusão, deu `digiai_mkt` como consumidor de
**todas**, inclusive de uma view criada há uma hora.

| view | consumidor real | caixa | o que fazer |
|---|---|---|---|
| `v_billing_mrr` | digiai | **(b)** | invoker ON — usuários do app são staff+; testar com dono **e** com `vendas` |
| `v_billing_subscriptions` | digiai | **(b)** | idem |
| `v_marketing_hotmart_sales` | digiai | **(b)** | idem |
| `v_marketing_outreach` | digiai | **(b)** | idem |
| `v_marketplace_webhook_status` | digiai | **(b)** | idem |
| `v_meeting_sessions` | digiai | **(b)** | idem |
| `v_ops_scorecard_auto` | digiai | **(b)** | idem |
| `v_playbooks` | digiai | **(b)** | idem |
| `v_marketing_cadeia` | digiai, **digiai_telao** | **(b/c)** | invoker quebra o Telão se ele ler sem sessão de staff — testar antes |
| `v_telao_cobranca` | digiai_telao | **(c)** | definer deliberado: a TV mostra dado da casa; **`comment` dizendo por quê** |
| `v_telao_financeiro` | digiai_telao | **(c)** | idem |
| `v_telao_pendencias` | digiai_telao | **(c)** | idem |
| `v_telao_pipeline` | digiai_telao | **(c)** | idem |
| `v_telao_roadmap` | digiai_telao | **(c)** | idem |
| `v_telao_sai_hoje` | digiai_telao | **(c)** | idem |
| `v_proposals` | digiai, **polapetit** | **(a/c)** | consumidor em OUTRO projeto: invoker ON quebra — a sessão do Polá não existe no nosso `iam` |
| `v_espelho_content_rules` | **limelight_studio** | **(a)** | espelho entre projetos; candidata a `service_role` só |
| `v_vendas_hoje` | **digiai_mkt** | **(a/c)** | idem |
| `v_vendas_leads` | **digiai_mkt** | **(a/c)** | idem |
| `v_espelho_brands` | **nenhum** | — | **sem consumidor em repo nenhum** — candidata a remoção, como `v_ops_cofre` |
| `v_telao_afericao` | **nenhum ainda** | **(c)** | criada hoje; o Telão ainda não adotou. Esperado, não órfã |

## 5. O que NÃO recomendo

**Ligar `invoker` em bloco.** As da caixa (a)/(c) quebram: o consumidor é outro
projeto, cuja sessão não existe no nosso `iam.users`, ou é uma TV que mostra o
agregado da casa. E o modo de falha é o pior — **a view não dá erro, devolve
vazio**: tela viva, número zero. Foi o que a 092 quase fez com o Vendas.

Ordem que proponho: **(c) primeiro** — só `comment`, risco zero, e documenta a
intenção antes que alguém "conserte". Depois **(b)** view a view com sessão real.
**(a)** por último, junto com a decisão de trocar para `service_role`.

E `v_espelho_brands` merece a pergunta antes do conserto: **para que existe?**
