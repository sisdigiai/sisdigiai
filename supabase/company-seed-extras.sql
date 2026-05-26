-- ============================================================
-- Seed: 6 ativos digitais adicionais (DIGIAI + OSI)
-- ============================================================
-- Complementa company-seed-digital-assets (sessão anterior).
-- Roda via Management API com trigger audit_digital temporariamente
-- desabilitado (auth.uid() é null no contexto da Management API).
-- ============================================================

CREATE OR REPLACE FUNCTION public.__company_seed_extras_one_shot()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, company
AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM company.digital_assets WHERE rotulo IN (
    'Threads DIGIAI', 'WhatsApp Business DIGIAI', 'Site institucional DIGIAI',
    'Domínio próprio DIGIAI', 'App leitor OSI', 'X (Twitter) OSI'
  );

  INSERT INTO company.digital_assets (categoria, rotulo, valor, owner_product, status, provider, observacoes) VALUES
  -- DIGIAI institucional (4)
  ('outro', 'Threads DIGIAI', 'threads.net/@_digiai (vincula ao IG @_digiai)', 'digiai', 'a_registrar', 'Meta',
   'Trivial — só confirmar vinculação ao Instagram @_digiai já existente.'),

  ('outro', 'WhatsApp Business DIGIAI', '+55 11 99999-0000 (a definir número institucional)', 'digiai', 'a_registrar', 'Meta',
   'Linha institucional pra parceiros/contadores/imprensa. Separado do WhatsApp Mello Óticas.'),

  ('site', 'Site institucional DIGIAI', 'digiai.com.br (a comprar + criar landing)', 'digiai', 'a_registrar', 'Netlify',
   'Landing pública externa (vs sisdigiai.netlify.app que é interno). Apresenta ecossistema: OSI, Clearix, futuros produtos.'),

  ('dominio', 'Domínio próprio DIGIAI', 'digiai.com.br (a comprar)', 'digiai', 'a_registrar', 'Registro.br',
   '~R$ 40/ano. Necessário pro site institucional + email @digiai.com.br'),

  -- OSI extras (2)
  ('site', 'App leitor OSI', 'https://oticasemimproviso.netlify.app', 'osi', 'ativo', 'Netlify',
   'App web que lê o PDF do livro. Comprador acessa após compra Hotmart. 28 páginas em 5 módulos.'),

  ('twitter', 'X (Twitter) OSI', 'x.com/oticasemimproviso (a criar)', 'osi', 'a_registrar', 'X Corp',
   'Texto curto pra vendedor de ótica. Hooks rápidos, threads sobre os 5 Movimentos.');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Executar:
-- ALTER TABLE company.digital_assets DISABLE TRIGGER audit_digital;
-- SELECT public.__company_seed_extras_one_shot();
-- ALTER TABLE company.digital_assets ENABLE TRIGGER audit_digital;
-- DROP FUNCTION public.__company_seed_extras_one_shot();
