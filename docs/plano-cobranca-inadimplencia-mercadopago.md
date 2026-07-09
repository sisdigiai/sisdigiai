# Plano — Cobrança recorrente + trava por inadimplência (Mercado Pago)

> **Status: TRAVADO (requisito de negócio confirmado pelo dono).** Handoff para o agente do app DIGIAI (sisdigiai).
> Origem: decisão comercial 2026-07-01 (Gilberto/Junior), no contexto do Manual Clearix.
> Regra de ouro do workspace: **não inventar fatos**. O que estiver marcado *"confirmar no código"* deve ser validado no repo antes de implementar.

---

## 1. O modelo comercial (o que é a "trava")

O Clearix cobra as óticas (tenants) **mensalmente, via Mercado Pago**. O modelo é deliberadamente amigável:

- **SEM cartão preso / sem caução.** Ninguém precisa deixar cartão travado pra começar. Isso torna o *"sem cartão de crédito"* da oferta (landing + manual) **verdadeiro** — não é marketing.
- **A trava NÃO é no cartão — é na inadimplência.** Enquanto o cliente paga, roda liso. Se **atrasar**, o acesso do tenant é **pausado até regularizar** (nada se perde) e volta assim que o pagamento entra.
- Oferta vigente: **30 dias grátis · sem cartão · migração guiada · dados preservados · sem fidelidade** (mesma da `clearix.app.br`).
- Referência viva do comportamento desejado: foi **exatamente** o que o Netlify fez com o time SYS Vision (restringiu por fatura vencida, deu ~13 dias de carência, suspenderia se não pagasse). Queremos esse mesmo padrão, mas **nosso**, controlado pelo app DIGIAI.

## 2. O que JÁ existe no produto (base para reaproveitar — *confirmar no código*)

- **Tenant lifecycle governance** (banco Clearix `iam`): RPCs `create_with_package`, **`suspend`**, **`reactivate`**, `force_change` (SECURITY DEFINER). *Confirmar assinatura atual no código.*
- **Enforcement parcial já feito:** o **Hub** já respeita suspensão (middleware + no launch de SSO). **Os demais apps ainda NÃO** respeitam de forma uniforme → esta é uma pendência real a fechar.
- Correção de FK em `audit_logs` já aplicada (contexto do lifecycle).

## 3. O que construir (fases)

**F1 — Assinatura/cobrança recorrente Mercado Pago (por tenant)**
- Integração com Mercado Pago (assinatura recorrente mensal por tenant, no valor do plano — Essencial R$349 / Controle R$899 / Crescimento R$1.499 / Completo sob consulta).
- Sem exigir cartão no cadastro (trial 30 dias); cobrança começa após o trial.
- **Webhooks** de pagamento (aprovado / recusado / estornado / assinatura cancelada).

**F2 — Estado de inadimplência por tenant + carência**
- Campo/estado de cobrança no tenant (ex.: `em_dia | atrasado | suspenso`) + `overdue_since`, `grace_until`.
- **Carência configurável** (default sugerido: alinhar com a política comercial — ex.: X dias após o vencimento antes de suspender). Não hardcode — parametrizável.

**F3 — Enforcement automático (o coração da trava)**
- Ao **vencer a carência** com fatura em aberto → chamar `suspend(tenant)` → **pausa acesso** (Hub **e todos os apps**, não só o Hub).
- Ao **pagar** (webhook aprovado) → `reactivate(tenant)` → volta na hora.
- **Fechar o gap:** garantir que **todos os apps** (não só o Hub) respeitem o estado suspenso — hoje só o Hub respeita.

**F4 — Telas no app DIGIAI (painel da empresa)**
- Cobrança por tenant: status, próxima fatura, histórico de pagamentos Mercado Pago.
- Lista de **inadimplentes** (com dias de atraso / carência restante).
- Ações manuais (super_admin): suspender, reativar, estender carência, forçar plano.

**F5 — Comunicação ao cliente**
- Aviso de atraso (antes de suspender) e aviso de "acesso pausado até regularizar — **nada se perde**".
- Ao regularizar, confirmação de reativação.

## 4. Regras duras do workspace (NÃO violar)

- **Sem `service_role` no front.** Toda escrita via **RPC `SECURITY DEFINER`** com `is_super_admin()`/JWT do usuário. Ver [[feedback_hub_sem_service_role]] / [[feedback_pin_autorizacao_via_sso_sem_service_role]].
- **Schema `iam` não exposto via PostgREST** — usar views públicas (leitura) ou RPCs (escrita).
- **Backward-compat de RPC:** nunca `DROP+CREATE` de RPC com consumidores deployados; manter wrapper da assinatura antiga.
- **`tenant_id` sempre com FK.**
- **Ação destrutiva / cobrança real exige confirmação humana** (R-011 — agente não cobra pagamento nem altera entitlement de cliente real sem ordem).
- **Segredos do Mercado Pago** (access token, webhook secret) só no backend/edge/env — nunca no cliente.

## 5. Critérios de aceite

- [ ] Tenant novo entra em **trial 30 dias sem cartão**; cobrança recorrente inicia no fim do trial via Mercado Pago.
- [ ] Fatura vencida + carência estourada → tenant **suspenso automaticamente**; **Hub e apps** bloqueiam o acesso.
- [ ] Pagamento aprovado (webhook) → tenant **reativado** em minutos, sem perda de dado.
- [ ] Painel DIGIAI mostra status/inadimplentes e permite ações manuais (super_admin).
- [ ] Nada de `service_role` no front; escrita só por RPC; segredos fora do cliente.

## 6. Ligações

- Spec do app: [`Cockpit/Spec/digiai.md`](../../Cockpit/Spec/digiai.md)
- Harness/regras: `Cockpit/Harness/rules.md` (R-011 cotrabalho, R-013 identidade)
- Contexto do manual (onde a oferta "sem cartão" foi firmada): Manual Clearix — `clearix_docs/manual-biblia` / https://manual-clearix.netlify.app
- Governança de tenant já existente (suspend/reactivate) — confirmar no banco Clearix `iam`.
