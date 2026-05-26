# Checklist: Criar 14 contas pra DIGIAI + OSI

Anti-bot bloqueia automação na criação. **Você faz manual**, eu cadastro depois.

---

## 📧 Padrões a usar

| Campo | Valor |
|---|---|
| **Email DIGIAI** | `sisdigiai@gmail.com` (já existe, usar pras 2 contas DIGIAI) |
| **Email OSI** | `oticasemimproviso@gmail.com` (criar 1°, depois usar pras 12 OSI) |
| **Handle padrão OSI** | `oticasemimproviso` (se ocupado: `oticaSemImproviso`, `osi_metodo`, `metodo_osi`) |
| **Handle padrão DIGIAI** | `digiai` (se ocupado: `sisdigiai`, `digiai.oficial`) |
| **Nome exibição** | `Ótica Sem Improviso` ou `DIGIAI` |
| **Telefone OTP** | Seu celular Taty |

---

## 🟦 BLOCO 1 — Gmail OSI (pré-requisito de tudo)

**Cria primeiro, todas as outras dependem disso.**

- [ ] Abrir https://accounts.google.com/signup
- [ ] Nome: `Ótica` · Sobrenome: `Sem Improviso`
- [ ] Username: `oticasemimproviso` (se ocupado: variação)
- [ ] Senha: definir uma **forte e única**, anotar no gerenciador
- [ ] Telefone OTP: seu celular
- [ ] Email de recuperação: `sisdigiai@gmail.com`
- [ ] Aceitar termos
- ✅ Salvar credenciais no Chrome (1Password/Bitwarden se usar)

**Quando criado, me avisa:** "Gmail OSI pronto, handle confirmado: oticasemimproviso@gmail.com"

---

## 🟦 BLOCO 2 — DIGIAI institucional (2 contas, ~20 min)

### LinkedIn Page DIGIAI
- [ ] **Antes:** adicionar 5-10 conexões pessoais no LinkedIn Taty (linkedin.com/in/oticastatymello/)
- [ ] Aguardar 24h até LinkedIn liberar
- [ ] Acessar https://www.linkedin.com/company/setup/new/
- [ ] Tipo: **Empresa**
- [ ] Nome: `DIGIAI`
- [ ] URL LinkedIn: `digiai` (se ocupado: `digiai-oficial`)
- [ ] Site: `https://sisdigiai.netlify.app`
- [ ] Setor: `Desenvolvimento de Software` (ou `Tecnologia da Informação e Serviços`)
- [ ] Tamanho: `1-10`
- [ ] Tipo: `Empresa privada`
- [ ] Logo: pular (subir depois)
- [ ] Sobre: 
  > DIGIAI ÓTICA E TECNOLOGIA LTDA. Infraestrutura interna que orquestra o ecossistema: Ótica Sem Improviso (método de venda pra vendedor de ótica), Clearix (SaaS pra dono de ótica) e mais.

### X (Twitter) DIGIAI
- [ ] Acessar https://x.com/i/flow/signup
- [ ] Nome: `DIGIAI`
- [ ] Email: `sisdigiai@gmail.com`
- [ ] Aniversário: data fundação da empresa
- [ ] OTP por SMS
- [ ] Handle: `digiai` (se ocupado: `sisdigiai`, `digiai_br`)
- [ ] Pular sugestões de seguir / interesses
- [ ] Bio (200 chars):
  > Empresa de tecnologia + óticas. Construindo: Ótica Sem Improviso (método de venda), Clearix (SaaS B2B), e mais.

---

## 🟩 BLOCO 3 — OSI no novo Gmail (12 contas, ~60 min)

**Pré-requisito:** Gmail OSI criado (Bloco 1). 

**Opcional mas recomendado:** criar novo **perfil Chrome** chamado `OSI`:
- Chrome → canto superior direito → perfil → "Adicionar"
- Nome: `OSI`
- Logar no Gmail: `oticasemimproviso@gmail.com`
- Daí as próximas contas todas ficam **logadas automaticamente nesse perfil**

### Bio padrão OSI (usar igual nas 12)
```
🥽 Método de venda pra vendedor de ótica
👩‍💼 Por @taty_mello — 40 anos no balcão
📕 Manual: link na bio
#OticaSemImproviso
```

### Link na bio (URL Hotmart com UTM por canal)
Cada rede tem URL diferente — copie do PostDrawer no app DIGIAI (campo "Link de venda Hotmart").

### Contas a criar (handle `oticasemimproviso` em todas)

- [ ] **Instagram** → https://www.instagram.com/accounts/emailsignup/ — usar email OSI
- [ ] **Threads** → vincula automático ao Instagram acima
- [ ] **TikTok** → https://www.tiktok.com/signup/phone-or-email/email
- [ ] **YouTube** → já tem canal automático no Gmail; só personalizar em https://studio.youtube.com → handle `@oticasemimproviso`
- [ ] **Facebook Page** → criar perfil pessoal Taty (já tem) → criar página `Ótica Sem Improviso` em https://www.facebook.com/pages/create
- [ ] **LinkedIn Taty** já existe (linkedin.com/in/oticastatymello/) — só ajustar bio pra mencionar OSI
- [ ] **Pinterest Business** → https://www.pinterest.com/business/create/
- [ ] **Kwai** → baixar app no celular (web não tem signup), criar com email OSI
- [ ] **WhatsApp Business** → baixar app no celular, número da Taty/da ótica, configurar perfil de business
- [ ] **WhatsApp Broadcast** = lista dentro do WhatsApp Business (criar após o app)
- [ ] **Telegram canal** → app Telegram → menu → Nova mensagem → Novo canal → `Ótica Sem Improviso` → `@oticasemimproviso`

---

## 🟨 BLOCO 4 — Suporte / Infra (3 itens, ~30 min)

### Resend (email marketing OSI)
- [ ] https://resend.com/signup com email OSI
- [ ] Verificar domínio (precisa do bloco abaixo primeiro)

### Domínio próprio OSI
- [ ] https://registro.br → pesquisar `oticasemimproviso.com.br`
- [ ] Comprar (~R$ 40/ano)
- [ ] Apontar pro Netlify ou registrar no Resend pra email

### Hotmart HOTTOK
- [ ] Logar no Hotmart, produto B105515825 → Configurações → Postback
- [ ] Copiar HOTTOK do painel
- [ ] Colar em: Supabase Dashboard → Project Settings → Edge Functions → Secrets → `HOTMART_HOTTOK`
- [ ] Colar URL do webhook no Hotmart: `https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/hotmart-webhook`

---

## 📊 Como me passar os handles depois

Pra cada conta criada, me manda assim:
```
Conta: Instagram OSI
Handle: @oticasemimproviso (confirmado)
Link público: https://instagram.com/oticasemimproviso/
```

Eu atualizo no `digital_assets` na hora.

---

## ⏱ Tempo estimado realista

| Bloco | Tempo |
|---|---|
| Bloco 1 (Gmail OSI) | 10 min |
| Bloco 2 (LinkedIn + X DIGIAI) | 30 min + 24h de espera LinkedIn |
| Bloco 3 (12 contas OSI) | 60-90 min |
| Bloco 4 (Resend + domínio + HOTTOK) | 30 min |
| **Total** | **~3h de trabalho focado** |

Você pode partir em 5-6 sessões de 30 min ao longo da semana.
