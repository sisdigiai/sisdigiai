-- ============================================================
-- 056 — Fase A: recolocar o roadmap na realidade
-- ============================================================
-- Achado em 2026-08-13 (auditoria de verdade do painel):
--   - Fase 0 ("20 entrevistas honestas + 3 cartas de intencao") e Fase 1
--     ("20 alunos pagantes, >= R$ 2.000 MRR") foram fechadas NO MESMO DIA,
--     18/06/2026.
--   - A Fase 1 nunca teve `decision_gate_met_at` preenchido, e a metrica
--     ficou em ZERO alunos: `marketing.hotmart_sales` = 0, `finance.revenue` = 0.
--   - Resultado: a empresa executa a Fase 2 sobre um alicerce que nao existe,
--     e a Fase 2 esta travada ha 56 dias no primeiro elo de 8.
--
-- Decisao do dono (2026-08-14): a receita NAO vem da Academy — vem da venda do
-- Clearix. A Fase 1 foi descontinuada por escolha estrategica, nao concluida.
-- E metrica de VOLUME sem publico e carro na frente dos bois: a metrica da fase
-- atual passa a ser a TRAVESSIA (a primeira venda), nao o vigesimo cliente.
--
-- Esta migration NAO reescreve historico: mantem as datas como estao e
-- acrescenta a explicacao que faltava, mais a metrica honesta.
-- ============================================================

-- 1) Fase 2 — metrica de travessia no lugar de metrica de volume
UPDATE ops.roadmap_phases
SET metrica_unica = '1 otica pagando o Clearix (primeira receita recorrente real)',
    notes = concat_ws(E'\n\n', notes,
      '2026-08-14 — metrica reescrita (Fase A). Era "3 pilotos estaveis com NPS >= 8 e zero churn em 60 dias". '
      'Com publico zero e nenhuma venda em nenhum canal, exigir 3 pilotos estaveis antes do primeiro cliente '
      'e carro na frente dos bois. NPS e churn voltam como metrica na Fase 3, quando houver cliente para medir.'),
    updated_at = now()
WHERE phase_number = 2;

-- 2) Fase 1 — descontinuada por decisao, nao concluida (o gate segue vazio de proposito)
UPDATE ops.roadmap_phases
SET notes = concat_ws(E'\n\n', notes,
      '2026-08-14 — DESCONTINUADA POR DECISAO, nao concluida. O `decision_gate_met_at` esta vazio porque a '
      'metrica (20 alunos pagantes, >= R$ 2.000 MRR) nunca foi atingida: zero vendas registradas. A fase foi '
      'fechada em 18/06/2026 junto com a Fase 0. A decisao de 2026-08-14 e que a receita da DIGIAI vem da '
      'venda do Clearix, nao da Academy — entao o degrau nao volta para a fila; ele deixa de existir como '
      'caminho de receita. O OSI permanece, mas como APOIO a venda do Clearix, nao como fonte de receita.'),
    updated_at = now()
WHERE phase_number = 1;

-- 3) Fase 0 — metrica era de volume sem audiencia
UPDATE ops.roadmap_phases
SET notes = concat_ws(E'\n\n', notes,
      '2026-08-14 — registro honesto (Fase A). A metrica ("20 entrevistas honestas + 3 cartas de intencao") '
      'pressupunha audiencia que nao existia. Foi dada por cumprida em 18/06/2026 sem evidencia no dado. '
      'Nao se reabre: a validacao veio por outro caminho — o Clearix opera o varejo real do proprio grupo '
      '(2.141 transacoes em 30 dias, verificado em 2026-08-14). Validacao de cliente-zero, nao de mercado.'),
    updated_at = now()
WHERE phase_number = 0;

-- 4) A decisao fica registrada como decisao, nao como edicao silenciosa
INSERT INTO ops.decisions (title, context, decision, alternatives, expected_impact, tags, decided_at)
VALUES (
  'Receita vem da venda do Clearix; Academy deixa de ser caminho de receita',
  'Auditoria de verdade em 2026-08-13/14 mediu na fonte: receita R$ 0, zero vendas no Hotmart, zero linhas '
  'em finance.revenue, e o funil do OSI com 87 visitas totais, 1 unico clique de checkout em toda a historia '
  'e nenhuma compra. Ao mesmo tempo, o Clearix opera de verdade (2.141 transacoes/30d, 404/7d, 194 pedidos, '
  '78 usuarios) — porem com um unico tenant ativo, que e a rede de oticas do proprio grupo. As Fases 0 e 1 '
  'foram fechadas no mesmo dia 18/06/2026, e o gate da Fase 1 nunca foi cumprido.',
  'A receita da DIGIAI vem da VENDA DO CLEARIX. A Fase 1 (Ramen Profitability via Academy) fica '
  'DESCONTINUADA por decisao, nao concluida. A metrica da Fase 2 passa de "3 pilotos estaveis com NPS >= 8" '
  'para "1 otica pagando o Clearix". Papeis definidos: Pulso e Limelight geram receita propria (views e '
  'e-commerce); OSI, MKT, Clearix Calc e os dois sites existem para EMPURRAR a venda do Clearix; Lumina e '
  'brinde de fechamento com validade de 6 meses, depois entra em pacote; Nexus e a camada de educacao '
  'transversal a todos os apps; os demais produtos ficam congelados ate haver valor recebido.',
  'Manter a Academy como caminho de receita — descartado: 20 alunos pagantes nunca saiu do zero e exigiria '
  'audiencia que nao existe. Perseguir Clearix e OSI em paralelo — descartado: um operador em duas frentes '
  'foi o que produziu 56 dias de trava no primeiro elo da Fase 2.',
  'Foco unico e metrica alcancavel. O roadmap deixa de declarar fase cumprida sem dado que sustente, e o '
  'marketing ganha limite claro do que pode afirmar: cliente-zero e verdade, tracao de mercado nao.',
  ARRAY['roadmap','receita','clearix','fase-a'],
  '2026-08-14'
);
