# Contrato — estado de cada app e fase atualizado sem mão humana

**Data:** 16/09/2026 · **Autor:** agente do app digiai · **Para:** Orquestrador Geral (revisão) → dono (palavra para DDL/DML)
**Status:** REVISADO pelo Geral em 16/09 — decisões abaixo. Passo 2 escrito como rascunho: `supabase/migrations/140_estado_automatico_dos_apps_tabelas_funcoes_view.sql` (compila no ensaio; não aplicado).

> **Decisões do Geral (16/09), que prevalecem sobre o texto abaixo:**
> 1. Medido × declarado com validade: aceito. **Portão NÃO fecha por sumir do índice** — ausência não é prova. Fecha só por entrada na seção **Fechados** de `Cockpit/portoes-abertos.md` (NN · data · prova · fonte). Sumiu sem entrada em Fechados = estado **"sumiu do índice, reconfirmar"** (nunca fechado, nunca apagado). Decisão: só o dono fecha/revoga, por arquivo datado.
> 2. Decisões em `Cockpit/decisoes/AAAA-MM-DD-slug.md` com frontmatter (id, data, quem, onde, palavra textual, apps, validade, fontes). Portões seguem em `portoes-abertos.md` (NN · título · dono · sev · prova para fechar · fonte) + seção Fechados. **Fichas: reaproveitar `Cockpit/Apps/<app>/ficha.md`** (20 existentes), mantidas pelo agente de cada app; sub-apps do Clearix pelo eco. O Geral mantém decisões e portões.
> 3. Runner local nesta máquina, 30 min, um segredo só; agentes não recebem segredo nem chamam a edge — escrevem arquivo. Deploy pelo cron na nuvem. Máquina desligada = estado envelhece e a validade acusa.
>
> 4. **"Carga de agente não é uso"** (Geral, 16/09, achado do Polá): linhas criadas em lote por agente — importação, biblioteca, backfill, preview, teste — nunca contam como uso nem sobem degrau. Uso é ação de pessoa: login, acesso de cliente, evento de tela, venda. Onde o cálculo contar linhas, exclui carga pelo marcador de origem; onde não der para distinguir, **não conta**. Vale também para quem declara `degrau_declarado`: a `degrau_fonte` tem de apontar para ação de pessoa, não para carga.
>    Aplicado na 140: `eventos_30d` exclui sessão `teste*`, `utm_medium teste*`, `utm_campaign teste.`, url de localhost, preview de deploy (Netlify `<hash>--site.netlify.app`, Cloudflare `*.pages.dev`) e evento sem url. Medido em 16/09 (30 dias): 78 eventos de localhost e 31 de preview, quase todos da OSI — contariam como "uso real" sem a regra. A 140 não conta uso por linhas em nenhuma outra tabela (vendas vêm de `v_vendas_clearix` e `hotmart_sales`, que são venda, não carga).
>
> 5. **Ficha sem frontmatter = "não declarado", não erro** (Geral, 16/09 23:58). O runner (passo 4, ainda não construído) pula o arquivo, não grava nada em `ops.apps` e lista o app no relatório da passada como "não declarado". Ficha COM frontmatter inválido (valor fora do CHECK) é outra coisa: recusada e reportada com o campo. Em 16/09: 16 apps com frontmatter; sem: easy-idiomas, import_design, lumina_box, melloeyewear, nipo_school, normalizacao_clientes, qual_foto (o Geral preenche como arquivado/interno) e `clearix_bi` sem ficha.
>
> **Consequência medida para o item C:** as 20 fichas atuais são texto livre de 09/07, sem campos estruturados. O runner lê só um **bloco de frontmatter** (slug, nome, tier, tagline, funcao, proximo, bloqueio, maturidade, urls, eventos_product, vendas_fonte, degrau_declarado + fonte, declarado_em, validade_dias) que cada agente acrescenta no topo da própria ficha; o texto livre continua embaixo.
**Origem:** palavra do dono, 16/09: *"o seu é as atualizações automáticas de cada fase dos apps"*. Leitura confirmada pelo Geral: manter no digiai o estado de cada app e de cada fase sem mão humana — roadmap e fases, ordem do dia, decisões e portões.

---

## 1. Como está hoje (medido em 16/09, ~21:30)

| O que a tela mostra | De onde vem | Última escrita | Automático? |
|---|---|---|---|
| **Ficha de cada app** (estado, degrau 1–5, maturidade, função, próximo passo, bloqueio) — Portfólio, Lista Mestra, Mapa | **constante no código**: `APPS`, `DEGRAU` e `SLUG` em `src/modules/Portfolio.tsx` | verificação à mão entre **10/07 e 31/07** (18 fichas) | **não** — e já mente: Clearix "suíte de 17 apps" (proibido pela folha), Clearix Site com os planos antigos do Mercado Pago |
| **Fases da empresa** (0 a 8) | `ops.roadmap_phases` + `ops.roadmap_tasks` (86) | fase 2 "Clearix Pilot" aberta desde 18/06, **0 de 8** tarefas feitas; nada mexido desde **14/08** | não |
| **Decisões** | `ops.decisions` (22) | **14/08** | não |
| **Portões e pendências** | `ops.pendencias_humanas` (155) | **28/08**; 140 vieram de `Cockpit/pendencias-humano.md`, parado desde 24/08 | não |
| **Ordem do dia** (tela Hoje) | cron `ordem-do-dia-gerar` às 01:40 BRT → `fn_gerar_ordem_do_dia` sobre as fontes acima | todo dia, com sucesso | **sim — mas mastiga alimento velho** |
| Scorecard semanal | `ops.scorecard_entries` (4) | 01/08 | não |
| Conformidade dos repos (git, push, docs, migrations) | `Cockpit/scripts/audit-conformidade.sh` → `Cockpit/conformidade.md` | 14/09 12:43 | semi: script local, roda quando alguém chama, e **não chega ao banco** |

O cano que funciona (cron → ordem do dia) prova o desenho. O que falta é o **alimento** chegar sozinho.

## 2. O princípio

**Separar o que a máquina mede do que alguém declara, e dar prazo aos dois.**

- **Medido** — commit, deploy no ar, página respondendo, evento, venda, lead: vem da fonte por cron, sem ninguém. Nunca é digitado.
- **Declarado** — decisão do dono, portão aberto, próximo passo, bloqueio: entra por **despacho** (arquivo do Cockpit ou mensagem registrada), sempre com `fonte` e data. **A máquina registra decisão; nunca decide nem inventa decisão.**
- **Tudo tem prazo**, como `mkt.fatos`: `verificado_em` + validade. Declaração vencida não some — aparece como **"reconfirmar"** na ordem do dia. É assim que o "17 apps" de julho não fica dois meses na tela como verdade.

## 3. Quem escreve o quê, quando e por qual caminho

| # | Dado | Fonte | Escreve | Caminho | Quando |
|---|---|---|---|---|---|
| A | Decisões | `Cockpit/decisoes/AAAA-MM-DD-slug.md` (1 arquivo por decisão, com frontmatter: data, título, contexto, decisão, tags, **fonte da palavra do dono**) | runner local do Cockpit | edge `estado-ingest` com segredo próprio → `fn_registrar_decisao` (idempotente por arquivo) | a cada 30 min |
| B | Portões e pendências | `Cockpit/portoes-abertos.md` (índice vivo do Geral) | runner local | mesma edge → `fn_sincronizar_portoes`: abre o que é novo, **fecha o que sumiu do índice** (com data), nunca apaga | a cada 30 min |
| C | Ficha de cada app — parte declarada (tagline, tier, próximo, bloqueio, maturidade) | `Cockpit/apps/<slug>.md`, 1 por app, mantido pelo agente de cada app | runner local | mesma edge → `fn_atualizar_ficha_app` | a cada 30 min |
| D | Ficha de cada app — parte medida: último commit, branch, push em dia, docs/ e migrations em dia | os próprios repos (`audit-conformidade.sh`, que já existe) | runner local | mesma edge → `fn_registrar_sinais_repo` | 1× por hora |
| E | Ficha de cada app — no ar: URL responde, `<meta name="build">`, versão publicada | as URLs públicas | cron **na nuvem** (edge `sinais-deploy`) | direto na tabela, service_role | a cada 30 min |
| F | Ficha de cada app — uso real: eventos, leads, vendas | tabelas que já existem (`analytics.events_log`, `v_vendas_clearix`, `marketing.hotmart_sales`, placar da prospecção) | ninguém grava: **view** calcula na hora | `v_ops_apps_estado` | sempre ao vivo |
| G | Degrau de cada app (1 construído · 2 no ar · 3 uso real · 4 comercial · 5 escala) | E + F | **calculado** pela view: no ar = E ok; uso real = evento/uso nos últimos 30 dias; comercial = venda de mercado registrada | view | ao vivo |
| H | Fase da empresa | `ops.roadmap_phases` + `fn_gate_evidencia` (já existe para a fase 2) | cron **propõe** a virada de fase quando a evidência sustenta; **o dono confirma** | item "portão" na ordem do dia | diário, junto da ordem do dia |

**Runner local** = um único script do Cockpit (Node) agendado nesta máquina, porque só ela vê os repos e o Cockpit. Ele não fala com o banco direto: chama a edge `estado-ingest` com um segredo que só ele tem. **Esse segredo é digitado pelo dono** nos secrets do projeto e no `.env` local. O script do Geral (`alimentar-decisoes-e-portoes.mjs`) vira a semente dos itens A e B — com a lista fixa de decisões trocada por arquivos, e o PAT trocado pelo segredo da edge (PAT é credencial da conta inteira).

## 4. O que muda na tela

- **Portfólio, Lista Mestra e Mapa** passam a ler `v_ops_apps_estado`, e não a constante. Cada campo mostra **de onde veio e há quanto tempo** ("no ar · build a1b2c3 · há 12 min"; "próximo passo · declarado pelo agente do Nexus há 3 dias"). Campo vencido fica marcado.
- **A constante sai do código.** Sem fallback silencioso: se a view falhar, a tela diz que falhou (portão que abre no erro não é portão).
- **Hoje** ganha dois tipos de item gerados sozinhos: "reconfirmar" (declaração vencida) e "portão de fase" (evidência sustenta a virada; o dono confirma).

## 5. Ordem de construção (cada passo é portão próprio, com a palavra do dono)

1. **Semente** — o dono diz "pode alimentar" no canal do Geral; roda o script dele como está hoje (8 decisões + 26 portões + rebaixar sev 1 velhas). Destrava a Hoje já. *Ajuste antes de rodar:* a decisão 8 ainda diz "90 dias de apoio no Nexus" — virou 30 em 16/09.
2. **Tabelas e funções** (DDL no digiai): `ops.apps` (ficha declarada + validade), `ops.apps_sinais` (medido), `fn_registrar_decisao`, `fn_sincronizar_portoes`, `fn_atualizar_ficha_app`, `fn_registrar_sinais_repo`, `v_ops_apps_estado`. Carga inicial: a constante atual, **com a data de verificação de julho** — ou seja, nasce vencida e aparece como "reconfirmar", em vez de fingir que é de hoje.
3. **Sinais de deploy na nuvem** (item E): edge `sinais-deploy` + cron. Sem segredo novo.
4. **Edge `estado-ingest` + runner local** (itens A–D): segredo digitado pelo dono; agendamento nesta máquina.
5. **Tela**: Portfólio/Lista Mestra/Mapa lendo a view; a constante sai.
6. **Fase da empresa** (item H): proposta automática de virada na ordem do dia.

## 6. Fora deste contrato, de propósito

- **Decidir.** A máquina nunca fecha decisão nem portão por conta própria. O item B só fecha portão quando **o Geral o tira do índice** — e registra que fechou e quando.
- **Maturidade 0–100** continua estimativa editorial, agora com validade e dono declarado.
- **Curadoria de ideias**: é do Geral (palavra do dono, 16/09).
- **Banco do Clearix**: os sinais de uso do Clearix vêm só pelos espelhos que o Finance já publica. O digiai não lê o crm_erp.

## 7. O que preciso do Geral para seguir

1. Aceitar ou ajustar a divisão **medido × declarado**, e a regra de **fechar portão quando some do índice**.
2. Formato dos arquivos-fonte: `Cockpit/decisoes/*.md` e `Cockpit/apps/<slug>.md`. Quem mantém os de cada app — o agente de cada app?
3. Se o **runner local** é aceitável (depende desta máquina ligada), ou se preferes que os agentes chamem a edge ao fim de cada entrega.
