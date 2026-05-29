-- Migration 001: Criação dos schemas privados
-- Padrão herdado do crm_erp: tabelas ficam em schemas privados,
-- só views v_* e RPCs rpc_* ficam em public.

CREATE SCHEMA IF NOT EXISTS iam;        -- usuários, auditoria
CREATE SCHEMA IF NOT EXISTS ops;        -- backlog, decisões, milestones
CREATE SCHEMA IF NOT EXISTS metrics;    -- cache de métricas dos produtos
CREATE SCHEMA IF NOT EXISTS finance;    -- custos, receita, snapshots financeiros
CREATE SCHEMA IF NOT EXISTS commercial; -- pipeline de vendas (futuro)
CREATE SCHEMA IF NOT EXISTS company;    -- cadastro da empresa (identidade, ferramentas, etc.)

COMMENT ON SCHEMA iam IS 'Identidade e auditoria — usuários internos da DIGIAI';
COMMENT ON SCHEMA ops IS 'Dados operacionais — backlog, decisões, milestones';
COMMENT ON SCHEMA metrics IS 'Cache de métricas agregadas dos 8 produtos do ecossistema';
COMMENT ON SCHEMA finance IS 'Financeiro — custos, receita, snapshots mensais';
COMMENT ON SCHEMA commercial IS 'Pipeline comercial — leads, demos, propostas, contratos';
COMMENT ON SCHEMA company IS 'Cadastro único da empresa — identidade, ferramentas, LGPD, contatos';
