# Briefing — Receber os leads do clearix-site (intenções de demonstração)

> **De:** sessão clearix-site (2026-07-13) · **Para:** agente do app digiai
> **Estado:** captura JÁ ESTÁ NO AR em produção. Este briefing é sobre o que falta
> DO LADO DO APP para esses leads serem vistos e trabalhados.

## O que já existe (não refazer, não mexer)

O formulário de demonstração do **clearix.app.br/contato** grava lead real no banco digiai:

```
form → edge fn lead-capture (keyless, honeypot 'website')
     → public.fn_capture_landing_lead (14 args, migration 047)
     → marketing.landing_leads com product = 'clearix'
```

- **Campos**: `name`, `phone_e164` (normalizado +55…), `email`, **`notes`** no formato
  `"Lojas: <1|2-4|5-15|16+> | <mensagem livre>"`, `utm_*`, `source_url`, `consent_text`
  (LGPD), `user_agent`. Status inicial: `novo`.
- **Testado de ponta a ponta** em 2026-07-13 (registros de teste criados e removidos).
- ⚠ **Contrato estável**: a edge fn `lead-capture` e a assinatura da RPC são consumidas
  pelo site em produção. Mudança de assinatura = quebrar o form ao vivo. Coordenar antes.

## O problema

`FluxoOSI.tsx` lê `v_marketing_landing_leads` com `.eq('product', 'osi')` —
**lead Clearix entra no banco e não aparece em nenhum módulo**. Hoje é lead invisível.

## O que o agente do digiai precisa fazer

1. **Exibir os leads Clearix** — seção "Demonstrações Clearix" (sugestão: módulo
   **Comercial**, já que demonstração do produto-âncora é pipeline comercial; Marketing
   também serve se o dono preferir). Ler `v_marketing_landing_leads` com
   `product = 'clearix'`: nome, WhatsApp (E.164 → link `wa.me`), email, `notes`
   (lojas + mensagem), UTM, `created_at`, `status`.

2. **Workflow de status** — `novo → contactado → comprou | descartado` (valores já
   definidos na tabela). Atenção: a view tem só `GRANT SELECT`; para o staff atualizar
   status do app, provavelmente falta uma RPC (`fn_update_landing_lead_status`, padrão
   da casa — SECURITY DEFINER + is_staff) ou expor UPDATE pela view. Verificar e criar
   migration se preciso.

3. **Alerta de lead novo** — o form promete *"a gente te chama no WhatsApp em horário
   comercial"*. Incluir os leads `clearix` com `status='novo'` na rotina diária
   (padrão `osi-operacao-diaria-10h`) ou criar verificação própria: lead de demo
   sem resposta em 24h é lead morto.

4. **Primeiro toque pronto** — para cada lead novo, montar o link `wa.me/<phone_e164>`
   com script curto de agendamento de demo (aproveitar `notes` — nº de lojas muda o
   discurso). Envio segue manual (R-011).

5. **LGPD** — respeitar `lgpd_request_at` / `anonymized_at` (a view já filtra
   anonimizados). Consentimento está registrado na captura; nada a coletar de novo.

6. **Docs no mesmo turno** — atualizar `Cockpit/Spec/digiai.md` (módulo que ganhar a
   seção) + `docs/changelog.md` do app.

## Referências

- Migration da captura: `supabase/migrations/040_landing_leads_capture.sql`
- Migration do notes: `supabase/migrations/047_landing_lead_notes.sql`
- Edge fn: `supabase/functions/lead-capture/index.ts`
- Exemplo de consumo existente: `src/modules/FluxoOSI.tsx` (seção landing leads, product='osi')
- Lado do site: `clearix-site/src/pages/contato.astro` + `Cockpit/Spec/clearix-site.md` §6
