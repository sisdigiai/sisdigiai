-- 120 — `marketing.v_whatsapp_followups_hoje` sai: view sem leitor encontrado
--
-- ⚠ NÃO APLICADA, e NÃO APLICAR sem a palavra do dono dita no canal do orquestrador do
--    app digiai. É DROP. E há uma razão além de ser drop para ser o dono: ver §2.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — QUEM A FEZ E QUEM A LÊ, medido em 10/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- A definição atual é do MKT: `20260909_01` fez DROP + CREATE, `20260909_14` fez
-- REPLACE. A criação ORIGINAL não está em migration de nenhum dos dois repositórios —
-- a 093 do digiai já a lia antes (18 linhas). Está no schema `marketing`, do digiai.
--
-- Leitores procurados:
--   views dependentes (pg_depend/pg_rewrite) ........................ 0
--   funções que a citam (pg_proc.prosrc) ............................ 0
--   jobs do cron ..................................................... 0
--   código: digiai, digiai_mkt, digiai_telao, gj, pulso_control
--           (repositório inteiro, não só src) ....................... 0
--           — só aparece em migrations, docs e no AGENTS.md do MKT, e aí
--             como exemplo do erro 42P16, não como consumidor
--   scripts do Cockpit ............................................... 0
--
-- A regra de "quem precisa de follow-up hoje" que ela implementava passou para
-- `public.v_vendas_hoje` (MKT, ramo `sla_vencido`), que a /vendas lê. O comment da
-- `_14` diz das duas: "as duas divergiam e nenhuma estava certa". Hoje uma é lida e a
-- outra não.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — O QUE A MEDIÇÃO NÃO CONSEGUE PROVAR, e por que isto é do dono
-- ═══════════════════════════════════════════════════════════════════════════
-- `docs_sync/05-marketing/produtos/otica-sem-improviso/01-estrategia/cadencia-publicacao-e-prospeccao-osi.md`,
-- linha 39, diz:
--   "a view marketing.v_whatsapp_followups_hoje lista quem está em contatado há 48–72h
--    sem ter avançado — é a fila de follow-up do dia, surgindo no briefing diário."
--
-- Procurei o briefing diário: nenhum cron, nenhuma função, nenhum script do Cockpit,
-- nenhuma edge function o gera a partir desta view (a única função de "brief" é a
-- `gerar-brief-producao` do MKT, que não a lê). O documento descreve um processo cuja
-- implementação não encontrei.
--
-- O que não se prova por código é se ALGUÉM a consulta à mão, no editor SQL, como fila
-- do dia. Quem saberia é quem faz o follow-up. Por isso a palavra é do dono, e não só
-- por ser drop.
--
-- ⚠ NO MESMO PASSE do drop, a linha 39 desse documento tem de passar a apontar para a
--    /vendas (`public.v_vendas_hoje`). Senão o documento manda procurar uma view que já
--    não existe — o mesmo defeito de doc que mente que se corrigiu o dia inteiro.
--
-- ⚠ E o MKT confirma do lado dele antes de aplicar: a definição é dele.

begin;

do $$
declare n int;
begin
  if to_regclass('marketing.v_whatsapp_followups_hoje') is null then
    raise exception 'marketing.v_whatsapp_followups_hoje já não existe — conferir se a 120 já foi aplicada.';
  end if;

  select count(*) into n
    from pg_depend d join pg_rewrite r on r.oid = d.objid
   where d.refobjid = 'marketing.v_whatsapp_followups_hoje'::regclass
     and r.ev_class <> 'marketing.v_whatsapp_followups_hoje'::regclass;
  if n > 0 then
    raise exception '% view(s) dependem de v_whatsapp_followups_hoje — o drop sem CASCADE recusaria; ver quem.', n;
  end if;

  -- plpgsql e SQL dinâmico não entram em pg_depend: procurar pelo nome no corpo.
  select count(*) into n from pg_proc where prosrc ~* 'v_whatsapp_followups_hoje';
  if n > 0 then
    raise exception '% função(ões) citam v_whatsapp_followups_hoje no corpo — partiriam em silêncio.', n;
  end if;

  select count(*) into n from cron.job where command ~* 'v_whatsapp_followups_hoje';
  if n > 0 then
    raise exception '% job(s) do cron citam v_whatsapp_followups_hoje.', n;
  end if;

  -- A substituta tem de existir: sem ela, apagar esta deixava a fila sem sítio nenhum.
  if to_regclass('public.v_vendas_hoje') is null then
    raise exception 'public.v_vendas_hoje não existe — a fila de follow-up ficaria sem view nenhuma.';
  end if;
end $$;

-- Sem CASCADE: se algo depender dela, recusa em vez de levar junto.
drop view marketing.v_whatsapp_followups_hoje;

do $$
begin
  if to_regclass('marketing.v_whatsapp_followups_hoje') is not null then
    raise exception 'v_whatsapp_followups_hoje continua a existir depois do drop.';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `to_regclass('marketing.v_whatsapp_followups_hoje')` → nulo;
--   b) a /vendas do MKT continua a mostrar o bloco de follow-up (lê v_vendas_hoje);
--   c) a linha 39 do documento de cadência já aponta para a /vendas.
