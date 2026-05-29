-- Migration 012: Seed inicial
-- Cria o usuário founder na tabela iam.users (linkado ao auth.users quando logar)
-- Cria registros singleton vazios que serão preenchidos via form

-- NOTA: Este INSERT vai funcionar SEM auth.users linkado (auth_id NULL).
-- Quando o founder fizer signup via app com oticastatymello@gmail.com,
-- um trigger (futuro) pode atualizar auth_id automaticamente.

INSERT INTO iam.users (email, full_name, role, status)
VALUES ('oticastatymello@gmail.com', 'Fundador DIGIAI', 'founder', 'active')
ON CONFLICT (email) DO NOTHING;

-- Registro singleton vazio de legal_status (para começar a marcar checkboxes)
INSERT INTO company.legal_status (dpo_nomeado)
VALUES (false)
ON CONFLICT DO NOTHING;

-- Registro singleton vazio de identity (para começar a preencher)
INSERT INTO company.identity (nome_fantasia)
VALUES ('DIGIAI')
ON CONFLICT DO NOTHING;
