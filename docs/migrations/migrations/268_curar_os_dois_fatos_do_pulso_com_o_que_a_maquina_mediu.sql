-- Curar os dois fatos do Pulso com o que a máquina mediu hoje (23/11/2026).
--
-- Medir não é curar: o verificador diário mede e grava veredito, mas não reescreve fato — isso é
-- curadoria, e curadoria do `mkt.fatos` é do digiai, por migration. Esta é a migration.
--
-- Os dois estavam vencidos há 109 e 84 dias **porque a porta de leitura tinha fechado em 08/09** e
-- o verificador não sabia dizer isso (migration 267). Com a porta certa, o número apareceu:
--
--   · `pulso_views_total` — afirmava 436.314 views em 739 publicações (medido em 25/08). A
--     `v_espelho_pulso` mede agora **820.006 views em 1.325 publicações**. Quase o dobro: o fato
--     não estava errado, estava velho, e ninguém conseguia ver porque a porta respondia 401.
--
--   · `pulso_youtube_crescimento` — afirmava 223 inscritos e +114 em 28 dias, lido À MÃO no
--     YouTube Studio em 31/07. Hoje o canal tem **543 inscritos** (26/10: 487 → **+56 em 28
--     dias**) e **13.730 views em 28 dias, em 32 publicações**. O crescimento DESACELEROU, e o
--     fato tem que poder piorar: reverificar que só confirma não é verificação.
--     A fonte muda junto: sai "YouTube Studio (verificação direta na fonte)", que condenava o fato
--     a uma tarefa humana semanal que ninguém fez em quatro meses, entra o espelho do Pulso, que
--     coleta sozinho todo dia. **Rotina que depende de alguém lembrar não é rotina.**
--
-- A validade sai de 7 para 30 dias nos dois. Sete dias era a validade de um número lido à mão: ela
-- não media frescor, media a frequência com que a tarefa ia vencer.
update mkt.fatos set
  fato = 'O Pulso acumula 820 mil visualizações em 1.325 publicações nos canais faceless, '
      || 'somadas em todas as plataformas (medido em 23/11/2026).',
  valor_numerico = 820006,
  fonte = 'v_espelho_pulso (banco Pulso — coleta automática diária; lida pela edge espelho-pulso)',
  verificado_em = '2026-11-23 18:00:00-03',
  validade_dias = 30,
  updated_at = now()
where chave = 'pulso_views_total';

update mkt.fatos set
  fato = 'O canal PULSO no YouTube tem 543 inscritos, com +56 nos últimos 28 dias e 13,7 mil '
      || 'visualizações em 32 publicações no mesmo período (medido em 23/11/2026).',
  valor_numerico = 543,
  fonte = 'v_seguidores_pulso_dias e v_espelho_pulso_contas_dias (espelho do Pulso, coleta diária)',
  verificado_em = '2026-11-23 18:00:00-03',
  validade_dias = 30,
  updated_at = now()
where chave = 'pulso_youtube_crescimento';

-- Prova: os dois saem da lista de vencidos e ninguém mais entra sem querer.
select chave, valor_numerico, verificado_em::date as verificado, validade_dias,
       (verificado_em + (validade_dias || ' days')::interval)::date as vale_ate
from mkt.fatos
where chave in ('pulso_views_total', 'pulso_youtube_crescimento');
