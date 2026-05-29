-- Migration 014: Roadmap interativo — phases + tasks + seed 45 dias
-- Contexto: transforma o módulo Roadmap de read-only em living roadmap
-- com checkboxes que persistem, barra de progresso e calendário de 45 dias seed.

-- ============================================================
-- 1. ops.roadmap_phases — 9 fases do roadmap executivo
-- ============================================================
CREATE TABLE IF NOT EXISTS ops.roadmap_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number smallint NOT NULL UNIQUE CHECK (phase_number BETWEEN 0 AND 8),
  nome text NOT NULL,
  duracao_estimada text,
  objetivo text,
  track_lider text CHECK (track_lider IN ('A','B','C')),
  tracks_ativos text[] NOT NULL DEFAULT '{}',
  metrica_unica text,
  playbook_sv text,
  decision_gate text,
  anti_patterns text[] NOT NULL DEFAULT '{}',
  track_paralelo_nota text,
  started_at timestamptz,
  completed_at timestamptz,
  decision_gate_met_at timestamptz,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roadmap_phases_number ON ops.roadmap_phases(phase_number);

ALTER TABLE ops.roadmap_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY phases_staff_all ON ops.roadmap_phases FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops.roadmap_phases
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_phases AFTER INSERT OR UPDATE OR DELETE ON ops.roadmap_phases
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ============================================================
-- 2. ops.roadmap_tasks — tarefas granulares com datas
-- ============================================================
CREATE TABLE IF NOT EXISTS ops.roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number smallint NOT NULL,
  track text CHECK (track IN ('A','B','C')),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'entregavel' CHECK (category IN ('entregavel','milestone','decision_gate','nota')),
  target_date date,
  completed_at timestamptz,
  completed_by uuid REFERENCES iam.users(id),
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  FOREIGN KEY (phase_number) REFERENCES ops.roadmap_phases(phase_number) ON DELETE CASCADE
);

CREATE INDEX idx_roadmap_tasks_phase ON ops.roadmap_tasks(phase_number);
CREATE INDEX idx_roadmap_tasks_track ON ops.roadmap_tasks(track);
CREATE INDEX idx_roadmap_tasks_target_date ON ops.roadmap_tasks(target_date);
CREATE INDEX idx_roadmap_tasks_completed ON ops.roadmap_tasks(completed_at);

ALTER TABLE ops.roadmap_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_staff_all ON ops.roadmap_tasks FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops.roadmap_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON ops.roadmap_tasks
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ============================================================
-- 3. Views públicas
-- ============================================================
CREATE OR REPLACE VIEW public.v_roadmap_phases AS
SELECT * FROM ops.roadmap_phases
ORDER BY phase_number;

CREATE OR REPLACE VIEW public.v_roadmap_tasks AS
SELECT * FROM ops.roadmap_tasks
WHERE deleted_at IS NULL
ORDER BY phase_number, display_order, target_date;

-- View com estatísticas de progresso por fase
CREATE OR REPLACE VIEW public.v_roadmap_phase_progress AS
SELECT
  p.phase_number,
  p.nome,
  p.track_lider,
  p.tracks_ativos,
  p.metrica_unica,
  p.started_at,
  p.completed_at,
  p.decision_gate_met_at,
  COUNT(t.id) AS total_tasks,
  COUNT(t.completed_at) AS completed_tasks,
  CASE WHEN COUNT(t.id) > 0
    THEN ROUND(100.0 * COUNT(t.completed_at) / COUNT(t.id), 1)
    ELSE 0 END AS percent_complete,
  MIN(t.target_date) FILTER (WHERE t.completed_at IS NULL) AS next_target_date,
  COUNT(t.id) FILTER (WHERE t.completed_at IS NULL AND t.target_date < current_date) AS overdue_tasks
FROM ops.roadmap_phases p
LEFT JOIN ops.roadmap_tasks t ON t.phase_number = p.phase_number AND t.deleted_at IS NULL
GROUP BY p.phase_number, p.nome, p.track_lider, p.tracks_ativos, p.metrica_unica, p.started_at, p.completed_at, p.decision_gate_met_at
ORDER BY p.phase_number;

-- Grants
GRANT SELECT ON public.v_roadmap_phases TO authenticated;
GRANT SELECT ON public.v_roadmap_tasks TO authenticated;
GRANT SELECT ON public.v_roadmap_phase_progress TO authenticated;

-- ============================================================
-- 4. Seed — 9 fases
-- ============================================================
INSERT INTO ops.roadmap_phases (phase_number, nome, duracao_estimada, objetivo, track_lider, tracks_ativos, metrica_unica, playbook_sv, decision_gate, anti_patterns, track_paralelo_nota, started_at, display_order) VALUES
(0, 'Validação do Problema', '1 mês', 'Entender o cliente real antes de escalar qualquer coisa', 'B', ARRAY['A','B','C'], '20 entrevistas honestas + 3 cartas de intenção', 'YC — The Mom Test / Problem Pyramid', 'Só avançar se: ≥3 cartas de intenção reais + 70% confirmam dor top 3 + faixa de preço validada', ARRAY['Construir feature nova sem entrevistar','Entrevistar amigos e parentes','Perguntar "você compraria X?"','Pular validação porque "o Clearix já está pronto"'], 'Academy: pesquisa de tema + landing + 3 conteúdos. Empresa: CNPJ + contador + domínios.', now(), 0),
(1, 'Ramen Profitability via Academy', '2 meses', 'Caixa para sustentar a empresa + lista + autoridade', 'A', ARRAY['A','B','C'], '20 alunos pagantes (≥ R$ 2.000 MRR)', 'Pat Flynn (SPI) + Ramit Sethi (IWT) + Alex Hormozi ($100M Offers)', 'Só avançar se: 20+ alunos + CPA < 50% do ticket + ≥1 depoimento espontâneo', ARRAY['Cobrar muito caro e não vender','Cobrar barato demais e não cobrir custo de tráfego','Usar 100% tráfego orgânico','Não pedir depoimento de cada aluno novo','Começar a vender Clearix antes da hora'], 'Playbook detalhado em nexus/docs/academy/marketing/playbook-renda-imediata.md', NULL, 1),
(2, 'Clearix Pilot', '2 meses', '3 óticas em uso real com NPS ≥ 8', 'B', ARRAY['A','B','C'], '3 pilotos estáveis com NPS ≥ 8 e zero churn em 60 dias', 'Paul Graham — Do things that don''t scale / Tien Tzuo — Subscribed', 'Só avançar se: 3 pilotos NPS≥8 + 2 depoimentos em vídeo + onboarding ≤15h totais', ARRAY['Fechar 10 pilotos ao mesmo tempo','Dar desconto sem contrapartida obrigatória','Construir features novas baseadas em pedido de 1 piloto','Delegar onboarding antes de ter o playbook provado'], NULL, NULL, 2),
(3, 'First 10 Customers (full price)', '2 meses', 'Validar preço de tabela e repetibilidade inicial', 'B', ARRAY['A','B','C'], '10 clientes pagando full price, MRR ≥ R$ 7.000, NRR ≥ 100%', '500 Startups — 10 customers playbook / Stripe — Collison brothers', 'Só avançar se: 10 clientes + churn <5%/mês + CAC < LTV/3 + 1+ indicação virou cliente', ARRAY['Contratar vendedor antes do fundador ter fechado 10 sozinho','Gastar em Ads pesadamente antes do CAC confiável','Baixar preço para "fechar rápido"'], NULL, NULL, 3),
(4, 'Product-Market Fit (PMF)', '3 meses', 'Provar PMF com métrica Sean Ellis e NRR saudável', 'B', ARRAY['A','B'], 'Sean Ellis ≥ 40% + NRR ≥ 110%', 'David Skok — SaaS metrics / Rahul Vohra — Sean Ellis Test', 'Sean Ellis ≥ 40% é binário. 39% = voltar para Fase 3. Sem exceções.', ARRAY['Interpretar 35% como "quase lá"','Começar aquisição paga pesada sem PMF','Contratar vendedor sem playbook provado'], NULL, NULL, 4),
(5, 'Growth Engine + First Hire', '3 meses', 'Primeira contratação produtiva + aquisição paga rodando', 'B', ARRAY['A','B'], 'R$ 40-60k MRR + CS contratado e produtivo', 'HubSpot — First salesperson / First Round Review — First 10 Hires', 'CS executa onboarding sem fundador em 80% casos + payback < 12m + MRR ≥ R$ 40k', ARRAY['Contratar muito sênior','Contratar vendas antes de CS','Investir em Ads sem NRR ≥ 110%'], NULL, NULL, 5),
(6, 'Scale Team & Processos', '6 meses', 'Fundador sai do operacional, time assume', 'B', ARRAY['A','B'], 'R$ 100-150k MRR + time de 4-6 pessoas produtivo', 'Atlassian — Product-led / Linear — Team of 10 before 100', 'Time 4-6 pessoas + processos documentados + fundador estratégico + MRR ≥ R$ 100k', ARRAY['Contratar gerente antes de ter gerenciáveis','Escalar time antes de escalar processos','Terceirizar cultura para headhunter'], NULL, NULL, 6),
(7, 'Expansão de Produto', '6 meses', 'Segundo produto pagante alavancando base Clearix', 'B', ARRAY['A','B'], 'R$ 250k+ MRR + segundo produto com 10+ pagantes', 'Stripe — Multi-product / Notion — From tool to platform', 'Clearix sustenta sem fundador + 2º produto 10+ pagantes da base Clearix', ARRAY['Reativar TODOS os produtos ao mesmo tempo','Entrar em nicho adjacente sem base instalada','Parar de investir no Clearix'], NULL, NULL, 7),
(8, 'Unicorn Path', '12+ meses', 'ARR ≥ R$ 3M e unit economics Series-A-ready', 'B', ARRAY['A','B'], 'ARR ≥ R$ 3M + NRR ≥ 120% + Gross Margin ≥ 75%', 'Benchmark / Sequoia — Series A Playbook', 'Escolher path: Bootstrapped (LTV/CAC ≥ 3) OU Série A (ARR ≥ R$ 3M) OU M&A estratégico', ARRAY['Captar para "acelerar" sem unit economics saudáveis','Vender empresa antes de saber o valor real','Perder foco do ICP original'], NULL, NULL, 8)
ON CONFLICT (phase_number) DO NOTHING;

-- ============================================================
-- 5. Seed — Calendário fixo de 45 dias (Fase 0 + início Fase 1)
-- Início: 2026-04-17 · Fim: 2026-06-01
-- ============================================================

-- Track C — Empresa / Ops (11 tarefas, Fase 0)
INSERT INTO ops.roadmap_tasks (phase_number, track, title, description, category, target_date, priority, display_order) VALUES
(0, 'C', 'Validar CNPJ, razão social e regime tributário', 'Conferir cartão CNPJ atualizado, Simples Nacional ativo, anexo correto.', 'entregavel', '2026-04-24', 1, 1),
(0, 'C', 'Contratar/confirmar contador', 'Registrar contato do contador no Cadastro Empresa. Combinar honorários mensais.', 'entregavel', '2026-04-24', 1, 2),
(0, 'C', 'Registrar domínios digiai.com.br e clearix.com.br', 'Via Registro.br. DNS no Cloudflare (free).', 'entregavel', '2026-04-24', 1, 3),
(0, 'C', 'Abrir/validar conta bancária PJ', 'Sugestão: Banco Inter ou Nubank PJ. Certificar emissão de boletos e PIX.', 'entregavel', '2026-05-01', 2, 4),
(0, 'C', 'Contratar gateway de pagamento', 'Stripe, Pagar.me ou Asaas. Integrar com conta PJ.', 'entregavel', '2026-05-01', 2, 5),
(0, 'C', 'Configurar email corporativo (Google Workspace)', 'Criar contato@, comercial@, suporte@, dpo@.', 'entregavel', '2026-05-01', 2, 6),
(0, 'C', 'Nomear DPO formalmente', 'Registrar nome e email do DPO no Cadastro Empresa → aba LGPD.', 'entregavel', '2026-05-08', 1, 7),
(0, 'C', 'Publicar Política de Privacidade mínima', 'Versão v1 no rodapé do site + registro de aceite.', 'entregavel', '2026-05-08', 1, 8),
(0, 'C', 'Publicar Termos de Uso mínimos', 'Versão v1 no rodapé do site + registro de aceite.', 'entregavel', '2026-05-08', 2, 9),
(0, 'C', 'Contratar advogado tech especialista SaaS', 'Consulta de 1h para revisão de MSA, ToS, Privacidade, DPA.', 'entregavel', '2026-05-15', 2, 10),
(0, 'C', 'Finalizar MSA + DPA templates com advogado', 'Contrato SaaS + DPA prontos para assinatura digital.', 'entregavel', '2026-05-22', 1, 11);

-- Track B — Clearix / Validação (13 tarefas, Fase 0)
INSERT INTO ops.roadmap_tasks (phase_number, track, title, description, category, target_date, priority, display_order) VALUES
(0, 'B', 'Definir cidade foco para Fase 0', 'Escolher 1 cidade (São Paulo Zona Norte, Curitiba ou BH). Registrar decisão em ops.decisions.', 'entregavel', '2026-04-23', 1, 20),
(0, 'B', 'Montar lista de 20 óticas-alvo na cidade', 'Lista com nome, endereço, dono, telefone. Usar Google Maps + Instagram.', 'entregavel', '2026-04-23', 1, 21),
(0, 'B', 'Criar roteiro de entrevista (Mom Test)', 'Perguntar sobre o problema, não sobre a solução. Template em docs/04-comercial/.', 'entregavel', '2026-04-24', 1, 22),
(0, 'B', 'Agendar 5 primeiras entrevistas', 'WhatsApp ou visita presencial. 30min cada.', 'entregavel', '2026-04-30', 1, 23),
(0, 'B', 'Realizar 5 primeiras entrevistas', 'Gravar (com autorização) ou tomar nota detalhada.', 'entregavel', '2026-05-03', 1, 24),
(0, 'B', 'Documentar 5 entrevistas', 'Criar arquivos em docs/04-comercial/entrevistas/. Consolidar padrões de dor.', 'entregavel', '2026-05-07', 2, 25),
(0, 'B', 'Agendar +10 entrevistas', 'Pedir indicação aos 5 entrevistados.', 'entregavel', '2026-05-10', 2, 26),
(0, 'B', 'Realizar entrevistas 6-15 (total 15)', 'Manter o mesmo roteiro. Ajustar se surgir nova linha de dor.', 'entregavel', '2026-05-14', 1, 27),
(0, 'B', 'Documentar entrevistas 6-15', 'Atualizar dossiê de insights.', 'entregavel', '2026-05-17', 2, 28),
(0, 'B', 'Realizar últimas 5 entrevistas (total 20)', 'Fechar os 20 alvos iniciais.', 'entregavel', '2026-05-21', 1, 29),
(0, 'B', 'Consolidar dossiê de insights', 'Dor top 3, faixa de preço validada, quem decide, quando decide.', 'milestone', '2026-05-24', 1, 30),
(0, 'B', 'Obter 3 cartas de intenção formais', 'Por escrito ou áudio: "se funcionar como descrito, eu fecharia a R$X/mês por pelo menos 6 meses".', 'milestone', '2026-05-28', 1, 31),
(0, 'B', 'Validar decision gate da Fase 0', '≥3 cartas + 70% confirmam dor top 3 + preço validado. Atingiu → avançar. Não atingiu → +30 dias de novas entrevistas.', 'decision_gate', '2026-05-31', 1, 32);

-- Track A — Academy / Renda imediata (12 tarefas, Fase 0 → início Fase 1)
INSERT INTO ops.roadmap_tasks (phase_number, track, title, description, category, target_date, priority, display_order) VALUES
(0, 'A', 'Definir tema e nome do 1º produto low-ticket', 'Ex: "Como vender mais na sua ótica sem apelar para descontos". Preço R$ 97-197.', 'entregavel', '2026-04-24', 1, 40),
(0, 'A', 'Escolher plataforma (Hotmart ou Kiwify)', 'Criar conta e estudar fluxo de produção de curso.', 'entregavel', '2026-04-25', 2, 41),
(0, 'A', 'Rascunhar landing page (v1)', 'Headline + vídeo 2min + bullets + preço + garantia + CTA. Usar Systeme.io ou Leadlovers.', 'entregavel', '2026-05-02', 2, 42),
(0, 'A', 'Produzir 3 primeiros conteúdos (blog+reel+PDF)', 'Tema: os maiores erros de venda em óticas. Distribuir orgânico.', 'entregavel', '2026-05-09', 2, 43),
(0, 'A', 'Configurar sistema de lista de email', 'ActiveCampaign, Mailchimp ou Substack. Form opt-in na landing.', 'entregavel', '2026-05-09', 2, 44),
(0, 'A', 'Instalar Google Analytics + Pixel Meta', 'Em todos os domínios (digiai.com.br, clearix.com.br, landing).', 'entregavel', '2026-05-09', 3, 45),
(0, 'A', 'Gravar as 4-6 aulas do curso', 'Celular + tripé + microfone lapela. CapCut para edição simples. 15-30min cada aula.', 'entregavel', '2026-05-16', 1, 46),
(0, 'A', 'Editar e publicar aulas na plataforma', 'Upload no Hotmart/Kiwify. Configurar acesso vitalício + comunidade Telegram/Discord.', 'entregavel', '2026-05-23', 1, 47),
(0, 'A', 'Landing + checkout live', 'Conectar gateway. Testar 1 compra de ponta a ponta.', 'milestone', '2026-05-23', 1, 48),
(0, 'A', 'Configurar email de boas-vindas automático', 'Sequência de 3 emails: acesso, primeiro passo, upsell futuro.', 'entregavel', '2026-05-25', 2, 49),
(1, 'A', 'Começar campanha Meta Ads R$ 500/mês', 'R$ 17/dia. Objetivo: Conversões. Criativo: vídeo do fundador.', 'entregavel', '2026-05-29', 2, 50),
(1, 'A', 'Primeiras 3 vendas do Academy', 'Validação inicial. CPA deve ser < 50% do ticket.', 'milestone', '2026-06-01', 1, 51);
