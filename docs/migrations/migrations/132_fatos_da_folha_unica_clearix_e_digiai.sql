-- 132 — fatos da folha única: Clearix e DIGIAI em mkt.fatos
--
-- ✔ APLICADA em 16/09/2026 às 15:11:19 BRT (18:11 UTC), por mim, com a palavra do dono neste canal ("continuar",
--   depois do pedido de aplicar). Ensaio contra o estado do dia passou antes. Medido depois: digiai 12 ativos /
--   10 públicos / 12 frescos; clearix 0; mello 1/1/0; osi 1/1/1; pulso 2/2/0. Acentos conferidos no banco.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: leva redigida pelo Orquestrador Geral em Cockpit/comercial/fatos-mkt-clearix-digiai-2026-09-16.md,
--   a partir da folha única (Cockpit/comercial/verdade-landing-vs-app-2026-09-14.md §1/§2/§3/§6 + errata do eco
--   de 15/09 22h). A curadoria de mkt.fatos é do digiai (despacho de 31/07); o MKT só lê v_mkt_fatos.
--
-- POR QUE AGORA: dos 10 fatos ativos, só o da OSI está fresco. clearix_uso_vivo, digiai_prova_operacao,
--   digiai_cadencia_conteudo, mello_serie_no_ar, pulso_* venceram em 25/08 + 7 dias. E clearix_suite_producao
--   afirma "suíte de 17 aplicativos", que a folha §3 proíbe (não se conta apps).
--
-- O QUE MUDA:
--   • 5 fatos saem de circulação (ativo = false), sem apagar linha: clearix_suite_producao, clearix_uso_vivo,
--     digiai_portfolio, digiai_cadencia_conteudo, digiai_custo_roteiro;
--   • entram 11 fatos novos e digiai_prova_operacao é reescrito — todos em brand_slug = 'digiai',
--     validade_dias = 30, com a data da medição dentro do texto;
--   • clearix_rede e digiai_prospeccao_esteira entram com publico = false: são trava do gerador
--     (o que NÃO se diz), não argumento de post.
--
-- DUAS COISAS QUE A LEVA DIZ E O BANCO NÃO TEM, resolvidas aqui:
--   1. "UPSERT por (brand_slug, chave)" — a única chave única de mkt.fatos é fatos_chave_key (chave),
--      brand_slug nem entra. O upsert é por chave, e por isso a chave carrega o prefixo da marca.
--   2. Não existe marca 'clearix' em mkt.brands; os fatos do produto ficam na marca digiai com prefixo
--      clearix_ (decisão do Geral de 16/09 00:50). As duas linhas antigas em brand_slug = 'clearix' saem.
--
-- EFEITO NO FRONT: o card "Fatos publicáveis" do Marketing (MarketingEspelho.tsx, lê v_mkt_fatos) passa de
--   10 linhas com 1 fresca para 16 com 13 frescas. (Este cabeçalho dizia que nenhuma tela lia fatos — errado:
--   a tabela estava fechada, mas a view era definer e a tela lia por ela; a 133 corrigiu o caminho.)
--   E o gerador do MKT, pela mesma view: 12 fatos frescos da DIGIAI em vez de 1 número vencido, sem as duas
--   frases proibidas ("17 aplicativos", "18 frentes").

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'mkt' and t.relname = 'fatos' and c.conname = 'fatos_chave_key'
       and pg_get_constraintdef(c.oid) = 'UNIQUE (chave)'
  ) then
    raise exception 'mkt.fatos nao tem mais UNIQUE (chave) — o upsert desta migration nao vale.';
  end if;

  if md5(pg_get_viewdef('public.v_mkt_fatos'::regclass)) <> 'c40382e15d7fb59f9bd5026e06796f2a' then
    raise exception 'v_mkt_fatos mudou — o contrato de leitura do MKT nao e o que esta migration mediu.';
  end if;

  if (select count(*) from mkt.fatos where ativo) <> 10 then
    raise exception 'esperava 10 fatos ativos antes da leva, achei %.', (select count(*) from mkt.fatos where ativo);
  end if;

  if (select count(*) from mkt.fatos
       where ativo and chave in ('clearix_suite_producao','clearix_uso_vivo','digiai_portfolio',
                                 'digiai_cadencia_conteudo','digiai_custo_roteiro')) <> 5 then
    raise exception 'os 5 fatos a desativar nao estao todos ativos — a leva ja foi aplicada?';
  end if;

  if exists (
    select 1 from mkt.fatos
     where chave in ('clearix_os_2026','clearix_caixas_equipe_2026','clearix_entregas_2026','clearix_prazo_entrega',
                     'clearix_carne_2026','clearix_conciliacao_2026','clearix_whatsapp_30d','clearix_historico',
                     'clearix_rede','digiai_produtos','digiai_prospeccao_esteira')
  ) then
    raise exception 'chave nova ja existe em mkt.fatos — conferir antes de reescrever.';
  end if;

  if not exists (select 1 from mkt.fatos where chave = 'digiai_prova_operacao') then
    raise exception 'digiai_prova_operacao sumiu — esta migration reescreve essa linha, nao cria outra.';
  end if;
end $$;

-- ── sai de circulação, sem apagar ─────────────────────────────────────────────
update mkt.fatos
   set ativo = false, updated_at = now()
 where chave in ('clearix_suite_producao','clearix_uso_vivo','digiai_portfolio',
                 'digiai_cadencia_conteudo','digiai_custo_roteiro');

-- ── a folha única vira fato ───────────────────────────────────────────────────
insert into mkt.fatos (brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico, ativo)
values
  ('digiai', 'clearix_os_2026',
   'Em 2026, 1.694 OS na loja viva da rede da casa, 1.685 criadas no balcão no dia da venda (medido em 14/09/2026).',
   1694, 'folha única §1 · sales_finance.orders', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_caixas_equipe_2026',
   '132 caixas abertos e fechados pela equipe em 2026, na loja viva (medido em 15/09/2026).',
   132, 'folha única §1 · cash_sessions (errata do eco 15/09)', date '2026-09-15', 30, true, true),

  ('digiai', 'clearix_entregas_2026',
   '1.588 OS de 2026 entregues em 2026 (medido em 15/09/2026).',
   1588, 'folha única §1 · orders.delivery_date (errata do eco 15/09)', date '2026-09-15', 30, true, true),

  ('digiai', 'clearix_prazo_entrega',
   'Do pedido à entrega, a mediana é de 7 a 10 dias (abril a agosto de 2026).',
   10, 'folha única §1', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_carne_2026',
   '1.477 parcelas de carnê recebidas em 2026 (medido em 14/09/2026). Sem valor em R$.',
   1477, 'folha única §1 · installments com order_id', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_conciliacao_2026',
   '2.410 linhas de extrato bancário conciliadas em 2026 (medido em 14/09/2026); a conciliação é semi-automática: o sistema sugere, quem confirma é a loja.',
   2410, 'folha única §1/§2', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_whatsapp_30d',
   '3.401 mensagens de WhatsApp trocadas pelo sistema em 30 dias: 2.562 recebidas e 839 enviadas (medido em 14/09/2026).',
   3401, 'folha única §1', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_historico',
   '20.375 OS no histórico preservado desde 2020; de 2020 a 2025 é migração, não operação no Clearix (medido em 14/09/2026).',
   20375, 'folha única §1', date '2026-09-14', 30, true, true),

  ('digiai', 'clearix_rede',
   'A prova do Clearix é a própria operação: rede da casa com 10 lojas cadastradas, 3 ativas e 1 vendendo todo dia; ainda sem cliente externo pagante.',
   1, 'folha única §1 (frase D4) e §3', date '2026-09-14', 30, false, true),

  ('digiai', 'digiai_prova_operacao',
   'A DIGIAI opera o próprio varejo óptico dentro do Clearix: uma rede da casa, com 1 loja vendendo todo dia e 1.694 OS em 2026 (medido em 14/09/2026).',
   1694, 'folha única §1', date '2026-09-14', 30, true, true),

  ('digiai', 'digiai_produtos',
   'A DIGIAI tem dois produtos à venda: o Clearix (gestão de ótica, entrada por demonstração de 20 minutos e piloto pago e assistido) e o Ótica Sem Improviso (manual visual de atendimento e conversão para óticas, na Hotmart).',
   null, 'folha única §2 · content.products', date '2026-09-15', 30, true, true),

  ('digiai', 'digiai_prospeccao_esteira',
   'Desde 15/09/2026 a prospecção por WhatsApp roda em esteira automática (ADR-0057): primeiro toque, janela e SAIR respeitados; resposta é humana.',
   null, 'ADR-0057', date '2026-09-15', 30, false, true)

on conflict (chave) do update
   set brand_slug     = excluded.brand_slug,
       fato           = excluded.fato,
       valor_numerico = excluded.valor_numerico,
       fonte          = excluded.fonte,
       verificado_em  = excluded.verificado_em,
       validade_dias  = excluded.validade_dias,
       publico        = excluded.publico,
       ativo          = true,
       updated_at     = now();

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
declare
  v_digiai int;
  v_clearix int;
  v_ativos int;
  v_frescos int;
  v_publicos int;
begin
  if exists (select 1 from mkt.fatos
              where ativo and chave in ('clearix_suite_producao','clearix_uso_vivo','digiai_portfolio',
                                        'digiai_cadencia_conteudo','digiai_custo_roteiro')) then
    raise exception 'fato proibido continua ativo.';
  end if;

  select count(*) into v_digiai  from mkt.fatos where ativo and brand_slug = 'digiai';
  select count(*) into v_clearix from mkt.fatos where ativo and brand_slug = 'clearix';
  select count(*) into v_ativos  from mkt.fatos where ativo;
  if v_digiai <> 12 or v_clearix <> 0 or v_ativos <> 16 then
    raise exception 'contagem errada: digiai %, clearix %, total ativos % (esperado 12 / 0 / 16).',
      v_digiai, v_clearix, v_ativos;
  end if;

  -- fresco pela régua do leitor: v_mkt_fatos expõe verificado_em + validade_dias
  select count(*) into v_frescos from mkt.fatos
   where ativo and brand_slug = 'digiai' and verificado_em + validade_dias >= current_date;
  if v_frescos <> 12 then
    raise exception 'esperava os 12 fatos da DIGIAI frescos, achei %.', v_frescos;
  end if;

  select count(*) into v_publicos from mkt.fatos
   where ativo and brand_slug = 'digiai' and not publico;
  if v_publicos <> 2
     or not exists (select 1 from mkt.fatos where chave = 'clearix_rede' and not publico)
     or not exists (select 1 from mkt.fatos where chave = 'digiai_prospeccao_esteira' and not publico) then
    raise exception 'os dois fatos internos (clearix_rede, digiai_prospeccao_esteira) nao estao ambos publico = false.';
  end if;

  -- proibições da folha: nada de contar apps, nada de "processado pelo Clearix", nada de preço
  if exists (select 1 from mkt.fatos where ativo and (fato ~* '\m1[67] (aplicativos|apps)\M' or fato ~* 'processad. pelo Clearix')) then
    raise exception 'fato ativo com frase proibida pela folha.';
  end if;

  -- acento vivo: se o texto tiver chegado quebrado, isto pega
  if exists (select 1 from mkt.fatos where ativo and (fato like '%' || chr(65533) || '%' or fonte like '%' || chr(65533) || '%')) then
    raise exception 'texto com caractere de substituicao (U+FFFD) — encoding quebrado no caminho.';
  end if;
  if not exists (select 1 from mkt.fatos where chave = 'clearix_os_2026' and fato like '%balcão%')
  or not exists (select 1 from mkt.fatos where chave = 'clearix_historico' and fato like '%histórico preservado%') then
    raise exception 'acentuacao perdida no texto do fato.';
  end if;
end $$;

commit;
