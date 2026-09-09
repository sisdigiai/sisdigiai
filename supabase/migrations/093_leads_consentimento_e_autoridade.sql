-- 093 — consentimento/opt-out em ops.commercial_leads + dizer o que se quis na policy
--
-- ⚠ NÃO APLICADA. Escrita em produção — aguarda o "pode" do dono.
--    Pedida pelo Orquestrador Geral (09/09) para o módulo de vendas por WhatsApp do MKT.
--
-- ⚠⚠ ESTA MIGRATION SOZINHA NÃO FAZ O MÓDULO FUNCIONAR. Ver §0. Aplicá-la e dar
--     por feito entrega um módulo que não escreve. A parte que falta é decisão, não código.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §0 — O QUE MEDI ANTES DE ESCREVER, E POR QUE MUDA O PEDIDO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- (1) A POLICY NÃO É A FECHADURA — de novo, como em billing (092).
--     `ops.commercial_leads` dá a `authenticated` apenas `r` (SELECT). Nenhuma
--     escrita direta passa: nem por tabela, nem pela view. `v_commercial_leads`
--     é `security_invoker` e auto-atualizável, mas escrever por ela executa com
--     o direito de quem chama — e quem chama só tem SELECT. Fecha no grant.
--
--     O app escreve por RPC: `fn_upsert_commercial_lead` e
--     `fn_delete_commercial_lead` (`src/lib/commercialStore.ts`), ambas
--     SECURITY DEFINER, com `EXECUTE` para `authenticated`. Elas IGNORAM RLS.
--
--     > Conclusão: mexer só na policy é defesa em profundidade, não conserto.
--     > O portão vivo é o corpo da RPC, e hoje ele diz:
--     >     if not public.is_staff() then raise exception 'not_staff'; end if;
--
-- (2) POR ISSO O MÓDULO DE VENDAS NÃO VAI ESCREVER, mesmo com a policy nova.
--     Uma pessoa `vendas` que não seja staff em `iam.users` continua levando
--     `not_staff` da RPC. A policy nem chega a ser consultada.
--
-- (3) A EXPRESSÃO PEDIDA CONTRADIZ O PRÓPRIO OBJETIVO.
--     O pedido diz "UMA autoridade (iam) para leads" e propõe
--     `is_admin() OR mkt.is_admin_ou_vendas()`. São DUAS autoridades:
--       public.is_admin()          → lê iam.users
--       mkt.is_admin_ou_vendas()   → lê mkt.app_users
--     Hoje elas concordam (medido: 1 admin no mkt, 0 pessoas em mkt.app_users
--     sem linha ativa correspondente em iam.users). Mas a estrutura permite
--     divergir — e, divergindo, o app de marketing passa a conceder escrita
--     nos leads da empresa sem passar por `iam`. Isso é governança, não sintaxe.
--
--     Duas saídas, e a escolha é do dono:
--       (A) UMA autoridade de verdade: criar o papel `vendas` em `iam.users`
--           (o CHECK hoje aceita super_admin/admin/founder/staff/viewer) e
--           incluí-lo em `is_staff()`. O MKT lê a mesma fonte. Mais trabalho,
--           cumpre o que o pedido diz querer.
--       (B) Aceitar as duas fontes, com o OR — e então PARAR de chamar isso
--           de "uma autoridade" na documentação, para ninguém se enganar depois.
--
--     Não escolhi por conta própria: escolher aqui seria decidir quem manda
--     nos leads da empresa. §3 fica escrito e COMENTADO até a decisão.
--
-- (4) CONSENTIMENTO: 3 COLUNAS NÃO CUMPREM O R-013.
--     O padrão da casa (`Cockpit/Harness/padroes-identidade-cadastros.md` §5.1)
--     exige registrar, antes de qualquer mensagem ativa: pessoa, canal,
--     **tipo de comunicação consentido**, data/hora **+ IP/dispositivo**, e o
--     **texto exato apresentado**. As três colunas pedidas cobrem data e uma
--     origem genérica — não provam A QUÊ a pessoa consentiu.
--     Sob LGPD, quem tem de provar o consentimento é a empresa; "origem =
--     landing" não é prova. §1 acrescenta o que falta, ainda como atributo da
--     pessoa (sem tabela nova, como pedido).
--
--     ⚠ Limite honesto: coluna guarda ESTADO, não histórico. Consentir, revogar
--     e consentir de novo sobrescreve. Se a operação passar a exigir a trilha,
--     o lugar é um log de eventos — decisão para depois, registrada aqui.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — Consentimento e opt-out como atributo da pessoa (R-013 §5.1)
-- ═══════════════════════════════════════════════════════════════════════════
alter table ops.commercial_leads
  add column if not exists wa_opt_out_em              timestamptz,
  add column if not exists wa_consentimento_em        timestamptz,
  add column if not exists wa_consentimento_origem    text,
  add column if not exists wa_consentimento_categoria text,
  add column if not exists wa_consentimento_texto     text,
  add column if not exists wa_consentimento_ip        inet;

-- Categoria fechada: é o que o Meta cobra por template e o que a LGPD exige
-- que se saiba. Texto livre aqui vira "marketing" escrito de cinco jeitos.
alter table ops.commercial_leads
  drop constraint if exists commercial_leads_wa_consentimento_categoria_check;
alter table ops.commercial_leads
  add constraint commercial_leads_wa_consentimento_categoria_check
  check (wa_consentimento_categoria is null
         or wa_consentimento_categoria in ('marketing','utility','authentication','service'));

-- Consentimento sem data não é consentimento; e o texto apresentado é a prova.
alter table ops.commercial_leads
  drop constraint if exists commercial_leads_consentimento_coerente;
alter table ops.commercial_leads
  add constraint commercial_leads_consentimento_coerente
  check (wa_consentimento_em is null
         or (wa_consentimento_categoria is not null and wa_consentimento_texto is not null));

comment on column ops.commercial_leads.wa_opt_out_em is
  'Quando a pessoa pediu para não receber. Preenchido = NÃO ENVIAR, qualquer categoria. Opt-out vence consentimento anterior.';
comment on column ops.commercial_leads.wa_consentimento_em is
  'Quando consentiu. Sem isto, mensagem ativa é proibida por LGPD e pelo Meta (R-013 §5.1).';
comment on column ops.commercial_leads.wa_consentimento_origem is
  'Onde consentiu: landing, formulario, whatsapp_inbound, importacao. Contexto, não prova.';
comment on column ops.commercial_leads.wa_consentimento_categoria is
  'A QUE consentiu — marketing | utility | authentication | service. Consentir para "service" não autoriza marketing.';
comment on column ops.commercial_leads.wa_consentimento_texto is
  'Texto EXATO mostrado no momento do opt-in. É a prova, e é a razão de a coluna existir (R-013 §5.1).';
comment on column ops.commercial_leads.wa_consentimento_ip is
  'IP de onde veio o consentimento. Guarda ESTADO, não histórico — ver §0(4).';

-- Quem a agenda do dia precisa varrer: quem não pediu para sair.
create index if not exists commercial_leads_wa_contatavel_idx
  on ops.commercial_leads (wa_status)
  where wa_opt_out_em is null and deleted_at is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — Dizer o que se quis na policy (defesa em profundidade, NÃO a fechadura)
-- ═══════════════════════════════════════════════════════════════════════════
-- Mantém `to public` (o escopo de hoje) de propósito: trocar para
-- `to authenticated` mudaria quem a policy alcança, e isso não foi pedido.
drop policy if exists commercial_staff_all on ops.commercial_leads;

create policy commercial_leitura_staff on ops.commercial_leads
  for select using (public.is_staff());

create policy commercial_escrita_admin on ops.commercial_leads
  for all using (public.is_admin()) with check (public.is_admin());

comment on table ops.commercial_leads is
  'Leads comerciais. ESCRITA REAL ACONTECE NAS RPCs fn_upsert_commercial_lead / fn_delete_commercial_lead (SECURITY DEFINER, ignoram RLS) — a autorização mora no corpo delas. authenticated tem apenas SELECT nesta tabela; as policies abaixo são defesa em profundidade para o dia em que alguém conceder escrita direta. Não conceder sem rever as RPCs.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — BLOQUEADO: quem pode escrever lead. NÃO APLICAR SEM DECISÃO DO DONO.
-- ═══════════════════════════════════════════════════════════════════════════
-- Sem este bloco, o módulo de vendas do MKT NÃO ESCREVE: a RPC exige is_staff()
-- e uma pessoa `vendas` não é staff em iam.users. Com ele, a escolha entre (A)
-- e (B) do §0(3) fica feita — e é decisão de governança, não de código.
--
-- OPÇÃO A — uma autoridade de verdade (iam manda; recomendada):
--   alter table iam.users drop constraint users_role_check;
--   alter table iam.users add constraint users_role_check
--     check (role in ('super_admin','admin','founder','staff','vendas','viewer'));
--   create or replace function public.is_staff() ... role in (...,'vendas') ...
--   -- e o MKT passa a ler is_staff()/is_admin(), abandonando mkt.app_users para leads.
--
-- OPÇÃO B — duas fontes, assumidas como duas:
--   create or replace function public.fn_upsert_commercial_lead(...) ...
--     if not (public.is_staff() or mkt.is_admin_ou_vendas()) then
--       raise exception 'Acesso negado: escrever lead exige staff (iam) ou vendas (mkt)'
--         using errcode = '42501';
--     end if;
--   -- idem em fn_delete_commercial_lead. E a doc PARA de dizer "uma autoridade".
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS EXIGIDAS DEPOIS DE APLICAR (catálogo não serve; `set role` não carrega
-- JWT e is_staff()/is_admin() mentem sob a Management API):
--   a) sessão staff  → LÊ leads na tela Comercial (positivo);
--   b) sessão staff  → escreve lead pela tela (a RPC é o caminho) e funciona;
--   c) sessão sem papel → 42501 na RPC (controle negativo);
--   d) depois do §3: sessão `vendas` → escreve; sessão `viewer` → 42501;
--   e) lead com wa_opt_out_em preenchido NÃO aparece na agenda do dia
--      (`marketing.v_whatsapp_followups_hoje`) — senão o opt-out é decorativo.
-- A (e) é a que importa para a LGPD: coluna de opt-out que a agenda ignora é
-- pior que não ter coluna, porque parece que alguém cuidou.
