# Acessos de demonstração — 3 lojas-modelo × 3 perfis

> **Entregável para o prospect ao fim da reunião.** Verificado em 2026-06-17: os 9 logins existem, com papéis corretos, senha válida e e-mail confirmado.
> **Entrada:** acesse **https://clearix.app.br** → botão **Entrar** (login único / SSO; os apps abrem por ele).
> **Senha de todos:** `ClearixDemo2026!`  ·  *(ambiente 100% demo; domínio `.clearix.dev` é fictício)*

---

## 🟢 Loja-modelo ESSENCIAL — Ótica Olhar Certo (Sorocaba/SP · 1 loja)
Tenant `2c72ff48-4d35-449d-b00a-459aebb52306`

| Perfil | Login | O que ele enxerga |
|---|---|---|
| **Dono** | `admin@sandbox-essencial.clearix.dev` | Tudo + visão do negócio |
| **Gerente** | `gerente@sandbox-essencial.clearix.dev` | Operação da loja |
| **Vendedor** | `vendedor@sandbox-essencial.clearix.dev` | Balcão / PDV |

## 🔵 Loja-modelo CONTROLE — Óticas Bem Ver (2 lojas)
Tenant `2af25b80-a83c-4233-8a27-e0b0a824649b`

| Perfil | Login | O que ele enxerga |
|---|---|---|
| **Dono** | `admin@sandbox-controle.clearix.dev` | Rede multi-loja + financeiro |
| **Gerente** | `gerente@sandbox-controle.clearix.dev` | Operação + laboratório |
| **Vendedor** | `vendedor@sandbox-controle.clearix.dev` | Balcão / PDV |

## 🟣 Loja-modelo CRESCIMENTO — Rede Mais Olhar (SP Capital · 2 lojas)
Tenant `21e939b7-0536-473c-903b-7f2793ece204`

| Perfil | Login | O que ele enxerga |
|---|---|---|
| **Dono** | `admin@sandbox-crescimento.clearix.dev` | Rede + BI + IA |
| **Gerente** | `gerente@sandbox-crescimento.clearix.dev` | Operação regional |
| **Vendedor** | `vendedor@sandbox-crescimento.clearix.dev` | Balcão / PDV |

> Perfis extras disponíveis (Controle e Crescimento): `clinico@…` (optometrista) e `dcl@…` (comprador do laboratório). `marketing@…` no Crescimento.

---

## Caminho guiado por perfil (2–3 min cada)

- **Dono** → Hub → **BI** (Command Center, saúde da rede, "Perguntar à IA") → **Finance** (alertas, a receber). *Frase: "A visão de dono, num painel só."*
- **Gerente** → Hub → **DCL** (kanban do laboratório, prazos) → **Estoque** (margem/mix por marca). *Frase: "A operação sob controle, sem caderno."*
- **Vendedor** → Hub → **Vendas** (nova venda + carnê) → **CRM/WhatsApp** (histórico do cliente na tela) → **Paciente** (portal sem senha). *Frase: "O balcão em minutos."*

---

## ⚠️ Não clicar ao vivo (incompletos hoje — Onda 0/1)

- **Loyalty** — painel de Membros zerado (view quebrada)
- **Marketing → Publicar / tráfego pago** — sem integração conectada
- **AR → Prova virtual 3D** — não renderiza a armação
- **Finance → Emitir NF-e** — não habilitado
- **Clínico → aba Pacientes** — vem vazia
- **Lens → "Comparar Labs" / "Tabela de Preços"** — dão 404
- **Express → busca por campanha** — vem vazia
- **Estoque → Transferência entre lojas / Diagnóstico** — quebrada

---

## Segurança / operação (interno, não vai para o prospect)

- **Senha-padrão tem ~8 semanas** (recomendação de rotação: 30 dias). Antes da reunião, considerar **rotacionar para uma senha específica deste prospect** (revogável depois) — procedimento documentado em `clearix_pitch/_scripts_povoamento/CREDENCIAIS_SANDBOX.md`.
- **Reseed noturno dos sandboxes** ainda a agendar — para que o prospect não deixe dados bagunçados para o próximo.
- **Onda 0 de segurança** (segredos no repo + edge functions `tmp-sql-exec`) antes de qualquer ótica REAL entrar em produção.
