-- Bloco B: encerra 3 items do checklist Academy + ativa WhatsApp DIGIAI institucional.
-- Cross-ref: Cockpit/sessoes/META_setup_2026-06-02.md (sessão 2026-06-02 Bloco B).
-- academy.products do OSI já tem access_duration_days=90 + delivery_mode='nexus' + delivery_provider='Nexus'
-- + sales_page_url + checkout_url preenchidos. Falta só fechar checklist + WA suporte definido.

-- 1. Fechar 3 items do checklist Academy
UPDATE academy.product_checklist_items
SET done = true, updated_at = now()
WHERE area IN ('delivery', 'support')
  AND done = false
  AND (
    title ILIKE '%Padronizar pagina de obrigado%'
    OR title ILIKE '%Definir regra de acesso no Nexus%'
    OR title ILIKE '%Centralizar canal de suporte%'
  );

-- 2. Ativar WhatsApp DIGIAI institucional (default landing + suporte OSI)
UPDATE company.digital_assets
SET status = 'ativo',
    valor = 'https://wa.me/5511986027415',
    observacoes = $obs$
[2026-06-02 Bloco B] Definido como canal único de suporte do lançamento OSI (decisão Gilberto).
- Número usado: 5511986027415
- Aparece em: landing OSI (footer + obrigado), Hotmart obrigado page, emails de onboarding, página /obrigado da landing.
- Variável env: VITE_SUPPORT_WHATSAPP_URL=https://wa.me/5511986027415 (já é default na landing).
- Fonte da decisão: usar número atual da landing por já estar configurado e testado; trocar quando definir número institucional novo.
- Cross-ref: Cockpit/sessoes/META_setup_2026-06-02.md
$obs$,
    updated_at = now()
WHERE id = '56431ff0-f77f-4c6a-80e0-e89d4ef5372b';
