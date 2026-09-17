-- 138 — "90 dias" do Nexus da OSI vira 30 em todo o banco do app (padronização pedida pelo dono)
--
-- ✔ APLICADA em 16/09/2026 às 21:13:04 BRT, com a palavra do dono neste canal ("padronizar em todos os lugares").
--   Ensaio e 2 mutações antes. Revarredura depois: sobra "90 dias"/"sem assinatura" só nos itens deixados de fora
--   de propósito (afiliados → OSI, ganchos antigos → curadoria do Geral, logs, backlog do piloto Clearix).
--
--
-- DE ONDE VEM: decisão do dono de 16/09 ("OSI no nexus 30 dias"), landing e leitor da OSI já publicados com 30
--   (bundle index-BvktgbWB.js conferido: 30 dias 20×, 90 dias 0×), fato osi_oferta com 30 desde a 136.
--   Varredura de todas as colunas de texto dos schemas public/ops/marketing/academy/content/mkt/company/billing/
--   finance/iam/analytics em 16/09 ~21:10, procurando "90 dias" perto de "Nexus" e "sem assinatura".
--
-- O QUE ESTA MIGRATION TROCA (8 linhas, por id):
--   marketing.ai_prompt_templates — prompts que ensinam a IA a escrever a oferta:
--     f78bf708 Landing OSI (canônico) · 1e3113bc Cavalo de Troia (reel) · d5eec42f Landing Academy low-ticket
--   marketing.content_pillars fa908d5a "Comunidade e continuidade" (descrição)
--   academy.product_checklist_items b957f1d6 "Definir regra de acesso no Nexus por 90 dias"
--   ops.backlog_items 0767e6f0 (webhook do Nexus) e f22ad476 (enforcement de acesso) — pendentes, são especificação
--     do que falta construir, então seguem a regra nova.
--
-- O QUE FICA DE FORA, DE PROPÓSITO:
--   • marketing.affiliate_materials (5): o dono mandou a OSI resolver, via Orquestrador Geral (a 137 fica como
--     proposta pronta para eles).
--   • marketing.content_ideas (3 ganchos antigos): estão na curadoria de ideias, que o dono passou ao Geral.
--   • iam.audit_logs e marketing.hotmart_events_raw: registro do que aconteceu — não se reescreve log.
--   • ops.backlog_items 9bcbebcc: "piloto 90 dias" é do Clearix, não do Nexus da OSI.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from (values
      ('f78bf708-e16c-473e-9a6d-2785f9790239'::uuid, '8a32b9a15311ce44c69fbdadde4217f3'),
      ('1e3113bc-8e97-423e-b486-7cb10e4df6f1'::uuid, '3b146371db6e1735efada6cd76baed9e'),
      ('d5eec42f-6348-4f28-ae2a-a913793bf7a5'::uuid, '7a6cd02e7d55d1dd076ffecebf505ef8')
    ) e(id, md5)
    where not exists (select 1 from marketing.ai_prompt_templates t where t.id = e.id and md5(t.prompt_template) = e.md5)
  ) then
    raise exception 'algum prompt mudou desde a varredura de 16/09 — conferir antes.';
  end if;

  if not exists (select 1 from marketing.content_pillars where id = 'fa908d5a-86d7-4879-b11d-16f80c1a03a1'
                   and md5(description) = '30a879c945530c10b3508d36cd169113')
  or not exists (select 1 from academy.product_checklist_items where id = 'b957f1d6-14af-4cc7-9d71-a7ac68743b6c'
                   and md5(title) = '53631c4f84a9d49da98ce328c75aad07')
  or (select count(*) from ops.backlog_items
       where id in ('0767e6f0-6b24-445d-939c-f87f3c6b0daf','f22ad476-5043-4a7e-9d6d-e2891a2abed1')
         and status = 'pending' and blocker ~ '90 dias') <> 2 then
    raise exception 'pilar, checklist ou backlog nao estao como medidos em 16/09.';
  end if;
end $$;

-- ── prompts da IA ─────────────────────────────────────────────────────────────
update marketing.ai_prompt_templates
   set prompt_template = replace(replace(replace(prompt_template,
         'Complemento: 90 dias de acesso na Nexus', 'Complemento: 30 dias de apoio no Nexus incluídos; depois, continuidade opcional por assinatura'),
         'acesso 90 dias na Nexus', '30 dias de apoio no Nexus'),
         'Trate a Nexus como apoio complementar por 90 dias.', 'Trate o Nexus como apoio complementar incluído por 30 dias; depois, a continuidade é opcional, por assinatura.'),
       updated_at = now()
 where id in ('f78bf708-e16c-473e-9a6d-2785f9790239', '1e3113bc-8e97-423e-b486-7cb10e4df6f1', 'd5eec42f-6348-4f28-ae2a-a913793bf7a5');

-- ── pilar, checklist e backlog ────────────────────────────────────────────────
update marketing.content_pillars
   set description = replace(description, 'Nexus 90 dias', 'Nexus (30 dias de apoio incluídos)'), updated_at = now()
 where id = 'fa908d5a-86d7-4879-b11d-16f80c1a03a1';

update academy.product_checklist_items
   set title = 'Definir regra de acesso no Nexus por 30 dias'
 where id = 'b957f1d6-14af-4cc7-9d71-a7ac68743b6c';

update ops.backlog_items
   set title = replace(title, 'OSI 90d', 'OSI 30d'),
       blocker = replace(replace(blocker, 'liberação automática dos 90 dias de acesso', 'liberação automática dos 30 dias de apoio'),
                         '(a) 90 dias expirados', '(a) 30 dias expirados'),
       updated_at = now()
 where id in ('0767e6f0-6b24-445d-939c-f87f3c6b0daf', 'f22ad476-5043-4a7e-9d6d-e2891a2abed1');

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from marketing.ai_prompt_templates
              where id in ('f78bf708-e16c-473e-9a6d-2785f9790239', '1e3113bc-8e97-423e-b486-7cb10e4df6f1', 'd5eec42f-6348-4f28-ae2a-a913793bf7a5')
                and prompt_template ~ '90 dias')
  or (select count(*) from marketing.ai_prompt_templates
       where id in ('f78bf708-e16c-473e-9a6d-2785f9790239', '1e3113bc-8e97-423e-b486-7cb10e4df6f1', 'd5eec42f-6348-4f28-ae2a-a913793bf7a5')
         and prompt_template ~ '30 dias de apoio no Nexus') <> 3 then
    raise exception 'prompt ainda com 90 dias, ou sem os 30 dias.';
  end if;

  if exists (select 1 from marketing.content_pillars where id = 'fa908d5a-86d7-4879-b11d-16f80c1a03a1' and description ~ '90 dias')
  or exists (select 1 from academy.product_checklist_items where id = 'b957f1d6-14af-4cc7-9d71-a7ac68743b6c' and title ~ '90 dias')
  or exists (select 1 from ops.backlog_items
              where id in ('0767e6f0-6b24-445d-939c-f87f3c6b0daf', 'f22ad476-5043-4a7e-9d6d-e2891a2abed1')
                and (title ~ '90d' or blocker ~ '90 dias')) then
    raise exception 'pilar, checklist ou backlog ainda com 90.';
  end if;

  if exists (select 1 from marketing.ai_prompt_templates where prompt_template like '%' || chr(65533) || '%')
  or not exists (select 1 from marketing.content_pillars where id = 'fa908d5a-86d7-4879-b11d-16f80c1a03a1' and description like '%apoio incluídos%') then
    raise exception 'acentuacao quebrada.';
  end if;
end $$;

commit;
