-- Migration 010: Operacional — backlog, decisões, milestones

-- Backlog executivo
CREATE TABLE ops.backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  product_id text,
  area text,
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','blocked','done','cancelled')),
  owner text,
  due_date date,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id)
);

CREATE INDEX idx_backlog_status ON ops.backlog_items(status);
CREATE INDEX idx_backlog_priority ON ops.backlog_items(priority);
CREATE INDEX idx_backlog_product ON ops.backlog_items(product_id);

ALTER TABLE ops.backlog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY backlog_staff_all ON ops.backlog_items FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Decisões estratégicas
CREATE TABLE ops.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  context text NOT NULL,
  decision text NOT NULL,
  alternatives text,
  expected_impact text,
  tags text[] NOT NULL DEFAULT '{}',
  decided_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id)
);

CREATE INDEX idx_decisions_decided ON ops.decisions(decided_at DESC);

ALTER TABLE ops.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decisions_staff_all ON ops.decisions FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops.decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Milestones da Trilha Zero aos Milhões
CREATE TABLE ops.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase smallint NOT NULL CHECK (phase BETWEEN 0 AND 8),
  title text NOT NULL,
  description text,
  target_date date,
  completed_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_milestones_phase ON ops.milestones(phase);

ALTER TABLE ops.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_staff_all ON ops.milestones FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops.milestones
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
