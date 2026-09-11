-- 120 — `marketing.v_whatsapp_followups_hoje` sai: view sem leitor encontrado
--
-- ✔ APLICADA em 10/09/2026 às 22:20 (Brasília) = 11/09 01:20 UTC, por mim (orquestrador
--   do app digiai), com a palavra do dono dita neste canal ("pode fazer as 3"). Terceira
--   das três, depois da 116. Reconferido: a view não existe; public.v_vendas_hoje existe
--   e lê (17 linhas); 0 funções e 0 jobs do cron citam a apagada. No mesmo passe, a
--   linha 39 do documento de cadência passou a apontar para a /vendas (prova c).
--   A prova (b) — a /vendas do MKT a mostrar o bloco de follow-up — não a vi na tela: a
--   tela é do MKT. Pelo banco, a view que ela lê está de pé, e nada dependia da apagada
--   (o drop é sem CASCADE e teria recusado).
--
-- (Escrita como NÃO APLICADA, à espera da palavra do dono no canal do orquestrador do
--    app digiai.) É DROP. E há uma razão além de ser drop para ser o dono: ver §2.
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

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — MEDIDO DEPOIS: quem de FACTO a consultou (pg_stat_statements), 10/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- O §2 dizia que consulta à mão "não se prova por código". Prova-se pelo banco. O
-- agente do MKT foi às estatísticas de consulta, e eu reconferi:
--
--   estatísticas desde ..................... 2026-07-31 15:48 UTC (41 dias)
--   descartes por encher (dealloc) ......... 0   (max 5000, ocupadas 3085)
--   consultas que citam a view:
--     postgres (Management API) ............ 35 distintas, 57 chamadas —
--                                            aplicações de migration e verificações
--     authenticated ........................ 1 distinta, 1 chamada — e NÃO é leitor:
--                                            um bloco DO de 09/09 18:43 UTC que tenta
--                                            INSERIR em três views para provar que a
--                                            escrita é recusada (42501). Não é PostgREST.
--     service_role / anon .................. 0
--   funções das rotinas diárias (ordem do dia, sentinela, status diário) ... 0
--
-- O `dealloc = 0` é o que fecha o limite que o MKT declarou com honestidade ("uma
-- consulta rara pode ter sido expulsa quando a tabela enche"): nesta janela a tabela
-- nunca encheu, logo nada foi expulso. Nenhuma tela, função, cliente da API ou pessoa
-- com utilizador de app a leu em 41 dias.
--
-- O que continua sem prova: uso ANTES de 31/07. E o "briefing diário" do documento de
-- cadência não existe em nenhuma rotina. A regra que a view tinha não se perde: desde a
-- `_14` do MKT, `public.v_vendas_hoje` (ramo `sla_vencido`) filtra os mesmos estados e
-- deu a mesma contagem (17 = 17) — e essa é lida (22 consultas distintas registadas).
--
-- O MKT confirmou, do lado dele, que nada seu a lê, e concorda com a linha 39 do
-- documento de cadência passar a apontar para a /vendas.
--
-- Continua a ser do dono: é DROP, e é ele quem sabe se a usava antes de 31/07.

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
