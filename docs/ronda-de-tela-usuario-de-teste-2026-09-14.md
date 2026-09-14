# Ronda de tela com usuário de teste: o que falta para ela acontecer

> Pedido da ordem de trabalho do Geral (14/09/2026, item 4): ronda de tela com um usuário de teste, que não seja o dono, cobrindo **Comercial** (descartar e marcar como perdido) e **Funil** (editar premissa e reset).
> Medido no banco em 14/09/2026. Nada foi criado nem gravado.

## 1. O que existe hoje

| Fato | Medida |
|---|---|
| Usuários em `iam.users` | **1**: o dono, `super_admin`, ativo. Não existe usuário de teste. |
| O que abre Comercial e Funil no front | Qualquer papel (`permissions.ts`: só Financeiro, Cadastro Empresa, Clearix e Cobrança são restritos). |
| O que grava lead | `pode_tocar_lead()`: `super_admin`, `admin`, `founder`, `staff` e `vendas`. |
| O que grava o Funil | `fn_save_funnel_workspace` → `is_staff()`: `super_admin`, `admin`, `founder` e `staff`. **`vendas` não grava.** |
| Vínculo do login | O gatilho `link_auth_to_iam` liga `auth.users` a `iam.users` pelo e-mail, quando a linha de `iam.users` já existe. |

## 2. Por que não criei o usuário

- **Criar conta e entrar com senha não é coisa que o agente faça.** Quem cria a conta no Supabase Auth e faz o primeiro login é o dono.
- **O banco é o de produção.** Com qualquer usuário, descartar, marcar como perdido, editar premissa e dar reset gravam em `ops.commercial_leads` e `ops.funnel_workspace` de verdade. A ronda precisa de dado próprio para testar e de uma cópia do funil antes do reset (§4).

## 3. Qual papel, e o que isso testa

| Opção | Comercial | Funil | Custo |
|---|---|---|---|
| **A. `vendas` (recomendada)** | Grava: prova descartar e marcar como perdido com o papel de menor privilégio que pode fazer isso. | **Não grava.** Serve de prova negativa (ver achado abaixo). | Nenhum acesso a finance, company ou iam. |
| B. `staff` | Grava. | Grava: prova editar e reset. | `is_staff()` abre finance, company, iam e storage pela API a quem tiver essa senha. |

**Achado ao ler o código, a confirmar na ronda:** no Funil, quando o banco recusa a gravação (`not_staff`), o `funnelStore.pushRemote` só registra no console. A tela mostra a premissa editada como se tivesse gravado, o que fica só no cache do navegador. Um usuário `vendas` que edite o Funil vê o valor "salvo" e o banco não muda. É o mesmo tipo de silêncio que o Comercial já corrigiu (`list()` com `erro`). A ronda com `vendas` mede isso. Se confirmar, o conserto é do app e é pequeno: devolver o erro do push e mostrá-lo.

**Proposta:** A para a ronda inteira. O "editar e reset" que grava de fato fica com o dono (`super_admin`), numa passada curta com a cópia da §4. Criar um `staff` só para isso dá mais acesso do que a ronda justifica.

## 4. Passo a passo

**Dono (credencial e conta são dele):**
1. Supabase → projeto `hswyopqvnolqpmprqvzh` → Authentication → Add user. Usar um e-mail de teste que seja dele (ex.: `ronda+teste@…`) e senha própria.
2. Dizer, no canal do orquestrador do app digiai: "pode criar a linha do usuário de teste com o e-mail X, papel vendas".

**App (com essa palavra):**

3. Criar a linha em `iam.users`, ligada pelo e-mail:
   ```sql
   insert into iam.users (email, full_name, role, status)
   values ('<e-mail do passo 1>', 'Ronda de teste (não é pessoa)', 'vendas', 'active');
   -- o gatilho não roda de novo para um auth.users que já existe; ligar à mão:
   update iam.users u set auth_id = a.id from auth.users a
    where a.email = u.email and u.email = '<e-mail do passo 1>' and u.auth_id is null;
   ```
4. Criar **2 leads de teste**, com empresa `RONDA TESTE — apagar` e sem telefone real, para serem descartado e perdido. Nenhum lead real é tocado.
5. Tirar uma cópia do funil antes de qualquer edição: `select workspace from ops.funnel_workspace where key='osi'`, guardada num arquivo local do app, com o md5.

**Dono:** entrar uma vez no painel do navegador do app (Browser pane) com o usuário de teste. Daí em diante o agente navega com essa sessão.

**App, a ronda:**

6. Comercial: descartar o lead de teste 1 com motivo → some da lista, aparece na aba Descartados com o motivo. Marcar o lead de teste 2 como perdido → aparece como perdido e `perdido_em` preenchido. Conferir no banco. Conferir que "parado há N dias" dos leads reais não mudou.
7. Funil, com `vendas`: editar uma premissa → registrar o que a tela mostra e o que o banco tem (esperado: banco igual à cópia do passo 5).
8. Funil, com o dono, se ele quiser: editar uma premissa e voltar ao valor; dar reset e **restaurar a cópia do passo 5** pelo banco. O reset grava os padrões do código por cima do funil real: tarefas, `actuals` e premissas voltam ao padrão.

**Limpeza (com a palavra do dono):** apagar os 2 leads de teste (soft delete), suspender o usuário de teste (`status = 'suspended'`) e conferir que o funil está igual à cópia (md5).

## 5. O que a ronda não prova

- RLS por papel só se prova por chamada real com o JWT do papel. A ronda faz isso para `vendas` e não substitui um teste para `staff`.
- O "editar e reset" do Funil com `staff` fica sem prova se a opção A for a escolhida.
