-- Migration 018: Adicionar coluna frequencia_cobranca em company.tools
-- Permite controlar se a ferramenta é cobrada mensalmente, sob demanda (pay-per-use),
-- em planos longos (bimestral/trimestral/semestral/anual), ou de forma avulsa.
-- Já aplicada em produção em 2026-05-22 via Management API.

BEGIN;

-- ========== Coluna nova ==========
ALTER TABLE company.tools
  ADD COLUMN IF NOT EXISTS frequencia_cobranca text NOT NULL DEFAULT 'mensal';

-- Idempotente: limpa constraint anterior antes de recriar
ALTER TABLE company.tools
  DROP CONSTRAINT IF EXISTS tools_frequencia_cobranca_check;

ALTER TABLE company.tools
  ADD CONSTRAINT tools_frequencia_cobranca_check
  CHECK (frequencia_cobranca IN (
    'mensal',
    'bimestral',
    'trimestral',
    'semestral',
    'anual',
    'sob_demanda',
    'avulso'
  ));

COMMENT ON COLUMN company.tools.frequencia_cobranca IS
  'Frequencia de cobranca: mensal (assinatura fixa), bimestral/trimestral/semestral/anual (planos longos pre-pagos), sob_demanda (pay-per-use API), avulso (cobranca unica ou esporadica).';

-- ========== Backfill com base no padrao observado em finance.expenses ==========
-- Pay-per-use (consumo varia, sem assinatura fixa)
UPDATE company.tools SET frequencia_cobranca = 'sob_demanda'
WHERE nome IN (
  'Anthropic (Claude)',
  'OpenAI',
  'Google Cloud (Brasil)',
  'Google API (BRL via PIX)',
  'Pagar.me',
  'ElevenLabs',
  'Manus AI',
  'Higgsfield Inc.',
  'EBANX (repasse SaaS)',
  'Microsoft'  -- compras avulsas no Microsoft Store (8 cobrancas em ago/25), nao Office 365 mensal
);

-- Cobranca avulsa (nao recorrente)
UPDATE company.tools SET frequencia_cobranca = 'avulso'
WHERE nome IN ('Meta Ads');

-- Demais ficam mensal (default): Supabase Inc, Netlify Inc, GitHub, Z-API.IO,
-- Vercel Inc, Fabbler.AI, Google (assinaturas), n8n (Paddle), Canva

COMMIT;
