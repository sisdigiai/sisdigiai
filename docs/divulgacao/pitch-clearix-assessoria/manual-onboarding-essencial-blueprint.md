# Manual de Início Rápido — Clearix (plano Essencial)

> **Blueprint do manual** (vira slides → PDF). Baseado nas **dúvidas reais** de uma cliente Essencial.
> Cada slide: **Problema (a dúvida)** → **Solução (passos)** → **Tela real** (a capturar no Sandbox Essencial).
> Fatos verificados no banco 2026-06-18 (composição dos planos). Marca Clearix. Selo "ambiente de demonstração".

---

## Capa
**Clearix — Comece em 15 minutos.** Seu primeiro acesso, sua primeira venda, e o que seu plano faz.

## Sumário
1. Acesso & primeiros passos
2. O que o seu plano (Essencial) inclui
3. Sua primeira venda (PDV)
4. Estoque, Nota Fiscal e CMV — a verdade
5. Próximos passos (antecipando dúvidas)

---

# Seção 1 — Acesso & primeiros passos

## Slide 1.1 — "Preciso criar um usuário pra começar?"
**Solução:**
1. O **primeiro acesso é o do dono/admin** (já criado na contratação) — você não precisa criar nada pra entrar.
2. Você entra em **clearix.app.br → Entrar** com seu e-mail e senha.
3. Usuários **adicionais** (sua equipe) você cria depois, em **Hub → Usuários**.
**Tela:** Hub → Dashboard (primeiro login). · **App:** Hub

## Slide 1.2 — "Cadastrei um admin e o e-mail de convite não chegou"
**Solução (caminho que funciona hoje):**
1. Em **Hub → Usuários**, ao criar o usuário, o convite é enviado por e-mail para ele criar a senha.
2. **Se o e-mail não chegar:** confira spam/lixeira; reenvie o convite; ou use o **"Esqueci minha senha"** na tela de login para o novo usuário definir a senha.
> ⚠️ **Nota interna (não vai pro cliente):** investigar o fluxo de convite — provável SMTP do Supabase Auth não configurado (entrega não confiável). Correção real = SMTP próprio (ex.: Resend) **ou** caminho alternativo de definição de senha no app. **A confirmar no código do Hub.**
**Tela:** Hub → Usuários → criar/convidar. · **App:** Hub

## Slide 1.3 — "A tela parece travada, não tenho comandos pra ir a lugar nenhum"
**Solução:**
1. A navegação fica na **barra lateral esquerda** e nos **tiles "Seus Aplicativos"** no Dashboard (role a página).
2. Cada **tile** abre um app (Vendas, Finance, Paciente, Lens…) — clique nele.
3. Se os tiles não aparecerem no primeiro acesso, **recarregue a página** (F5).
> ⚠️ **Nota interna:** reproduzir no Sandbox Essencial — se o admin novo cai num Hub sem os tiles dos apps do plano, é **bug de UX/onboarding** a corrigir (atinge todo cliente novo).
**Tela:** Hub → Dashboard → seção "Seus Aplicativos". · **App:** Hub

## Slide 1.4 — "Não vejo Hub, Vendas, Paciente, Clínico, Lens — não fazem parte do meu plano?"
**Solução (a verdade do plano):**
- **Estão no seu Essencial:** Hub, **Vendas**, **Paciente**, **Lens** (+ Client, Finance, Docs). Se não apareceram, é o item 1.3 (recarregar / suporte).
- **NÃO está no Essencial:** **Clínico** (entra no plano **Controle**).
**Tela:** Hub → "Seus Aplicativos" (mostrando os 7 apps do Essencial). · **App:** Hub

---

# Seção 2 — O que o seu plano (Essencial) inclui

## Slide 2.1 — "O Essencial tem PDV, Financeiro e Portal do Cliente?"
**Solução — SIM, os três:**
- **PDV (Vendas):** pedidos, **caixa**, **carnês**, **entregas**.
- **Financeiro (Finance):** DRE, fluxo de caixa, contas a pagar/receber.
- **Portal do Cliente:** **Paciente** (token, sem senha) + **Client** (B2B).
**Tela:** os 3 tiles no Hub (Vendas, Finance, Paciente). · **App:** Hub

## Slide 2.2 — Mapa do plano (o que tem e o que entra no upgrade)
| Recurso | Essencial | Controle | Crescimento |
|---|:---:|:---:|:---:|
| Hub · Vendas (PDV) · Paciente · Client · Finance · Lens | ✅ | ✅ | ✅ |
| Estoque · Clínico · DCL (lab) · RH | ❌ | ✅ | ✅ |
| Importar NF de compra · CMV | ❌ | ✅ | ✅ |
| BI · Marketing · Loyalty · AR · Express · Fone | ❌ | ❌ | ✅ |
**Tela:** (slide só tabela, sem print). · **Uso comercial:** mostra o caminho de upgrade com clareza.

---

# Seção 3 — Sua primeira venda (PDV)

## Slide 3.1 — "Onde ficam os comandos de venda?"
**Solução:**
1. Abra o app **Vendas** (tile no Hub ou barra lateral).
2. No topo, botão **"Nova venda"** → abre o **wizard de 7 etapas** (cliente → receita → produtos → lentes → desconto → pagamento → confirmação).
3. A lista de vendas, busca e os KPIs (faturamento, ticket) ficam na tela inicial do Vendas.
**Tela:** Vendas → lista + botão "Nova venda". · **App:** Vendas

## Slide 3.2 — Fazendo a venda do início ao fim
**Solução (as 7 etapas):** cliente → receita → produto/armação → lente → desconto → **pagamento (à vista ou carnê)** → confirmação/impressão.
**Tela:** Vendas → wizard (1-2 etapas de exemplo). · **App:** Vendas

---

# Seção 4 — Estoque, Nota Fiscal e CMV — a verdade

## Slide 4.1 — "O Essencial controla estoque/inventário?"
**Solução (honesta):**
- O **controle de estoque/inventário** é o app **Clearix Estoque** — **não incluso no Essencial**; entra no plano **Controle**.
- No Essencial você **vende** (Vendas/PDV) e **gerencia o financeiro** (Finance), mas **não há gestão de inventário**.
**Uso comercial:** se a gestão de estoque é essencial pra ela, o plano é o **Controle**.

## Slide 4.2 — "Dá pra importar NF de compra pra alimentar o estoque?"
**Solução:** a **importação de NF de compra → estoque** depende do app **Estoque** → disponível a partir do **Controle**. No Essencial não há essa entrada.

## Slide 4.3 — "O Essencial calcula CMV (Custo de Mercadoria Vendida)?"
**Solução:** o **CMV** depende de **custo de produto + estoque/compras**, que vivem no app **Estoque** → portanto **Controle**. *(A tela exata do CMV eu confirmo no app.)*
**Uso comercial / decisão:** **estoque + CMV = plano Controle.** Essa é a confirmação que ela e a equipe precisavam pra decidir.

---

# Seção 5 — Próximos passos (antecipando dúvidas)

- **Como cadastro minha loja e meus dados?** → Hub → Lojas / Configurações.
- **Como cadastro produto/armação pra vender (sem o app Estoque)?** → *a confirmar no Vendas → Produtos (catálogo de venda existe; o que falta no Essencial é a gestão de inventário).* ⚠️ verificar no sandbox.
- **Primeiro caixa e fechamento?** → Vendas → Caixa (abertura/fechamento).
- **Como o cliente acessa o portal?** → link no WhatsApp (Paciente, sem senha).
- **Migração dos meus dados antigos?** → add-on de migração (orçado por volume).
- **Quando subir pro Controle?** → quando precisar de **estoque, CMV, clínico ou laboratório (DCL)**.

---

## Telas a capturar (Sandbox Essencial — admin@sandbox-essencial)
1. Hub → Dashboard (primeiro login)
2. Hub → "Seus Aplicativos" (os 7 tiles do Essencial)
3. Hub → Usuários (criar/convidar)
4. Vendas → lista + botão Nova venda
5. Vendas → wizard (1-2 etapas)
6. Vendas → Caixa
7. Finance → painel
8. (se existir) Vendas → Produtos (catálogo)

## Pendências internas (não vão pro cliente) — VERIFICADO 2026-06-24

### 🔴 Bug 1 — convite por e-mail não chega  (CAUSA CONFIRMADA NO CÓDIGO)
- Fluxo: `clearix_hub/src/app/(dashboard)/users/actions.ts:417` chama `admin.auth.admin.inviteUserByEmail()`. **Não há provedor de e-mail próprio** (Resend/SES) no código → entrega depende 100% do **SMTP do Supabase Auth** (config de dashboard, fora do repo) e do `redirectTo` (linha 415) que usa `NEXT_PUBLIC_SITE_URL` — **não definido no .env** → cai pra localhost/Vercel, podendo não bater com os redirect URLs permitidos.
- **Correções:** (a) [dono] configurar SMTP próprio no Supabase Auth; (b) [código] definir `NEXT_PUBLIC_SITE_URL=https://clearixhub.netlify.app`; (c) logar o `authError` do invite. **Workaround que JÁ funciona** (vai pro manual): "Esqueci minha senha" na tela de login (`resetPasswordForEmail`).

### 🔴 Bug 2 — "hub vazio / sem apps no 1º acesso"  (NÃO é bug universal)
- **Banco confirma:** o sandbox Essencial (2c72ff48) tem **1 linha `admin` ativa + pacote atribuído** → um admin desse tenant **deveria ver os tiles**. Sem duplicatas de `(tenant_id, role_code)` em todo o banco.
- Logo, o "hub vazio" da cliente foi **provisionamento do tenant novo dela** (roles_permissions / pacote / vínculo do admin não semeados na criação do tenant), **não** falha de código geral.
- **Fragilidade real a corrigir** (`clearix_hub/src/lib/sso/access.ts:89` + `.../dashboard/page.tsx:65`): se as permissões do papel vierem vazias/erro, retorna `[]` → hub vazio com mensagem genérica, **sem fallback pro pacote**. **Correção recomendada:** cair pros apps do pacote quando o papel vier vazio + provisionamento garantir roles+pacote+vínculo na criação do tenant (RPC `create_with_package`).
- ⚠️ `clearix_hub` é **produção** → não editar sem ordem explícita do dono (R: "Import como único lab").

### Confirmar no sandbox (com login)
- Tela exata do **CMV** (qual app/relatório) e se há **cadastro de produto** no Essencial (catálogo de venda) sem o app Estoque.
