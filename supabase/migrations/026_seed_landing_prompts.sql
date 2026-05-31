-- Seed dos 2 prompts canônicos de landing pages que viviam só em docs/digiai/docs/05-marketing/:
--   - prompt-landing-otica-sem-improviso.md → landing-osi-canonico
--   - prompt-copy-landing-page-clearix-academy.md → landing-academy-low-ticket-canonico
--
-- Reconcilia M4.5 (RECONCILIACAO_marketing_2026-05-31.md): docs canônicos não tinham
-- espelho operacional em marketing.ai_prompt_templates. Agora estão disponíveis
-- pra Marketing > Prompts IA dentro do app.

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, locks, placeholders, is_active, sort_order)
VALUES
  (
    'landing-osi-canonico',
    'Landing OSI (canônico)',
    'text',
    'chatgpt',
    'Prompt canônico (docs/digiai/docs/05-marketing/prompt-landing-otica-sem-improviso.md) pra criar ou refinar a landing externa de APOIO do produto Ótica Sem Improviso. NÃO transforma landing em motor principal — papel é apoiar conversão de tráfego externo encaminhando pro marketplace.',
    E'Crie ou refine uma landing externa de apoio para o produto Ótica Sem Improviso.\n\nVerdade da oferta:\n- Produto principal: Ótica Sem Improviso\n- Subtítulo: Manual Visual de Atendimento e Conversão para Óticas\n- Formato comercial: ebook / manual visual em PDF\n- Complemento: 90 dias de acesso na Nexus\n- Canal principal de descoberta hoje: marketplaces como Hotmart e Kiwify\n- Papel da landing: apoiar conversão de tráfego externo, não substituir o marketplace\n\nPúblico principal:\n- vendedor de ótica\n- atendente\n- consultor óptico\n- colaborador de linha de frente\n\nPromessa central:\nEm 3 dias, você sai do atendimento no improviso, responde melhor no WhatsApp e aprende a vender com mais segurança sem depender de desconto.\n\nRegras:\n- vender primeiro o ebook\n- tratar a Nexus como complemento\n- falar com quem vive balcão real\n- manter o Clearix apenas como referência sutil de ecossistema\n- evitar tom de curso genérico\n- evitar urgência artificial\n- evitar promessa inflada\n- usar CTA para checkout do marketplace\n\nEstrutura sugerida:\n1. Hero\n2. Problema\n3. Transformação\n4. O que é\n5. O que vem dentro\n6. Módulos\n7. Nexus como apoio\n8. Para quem é / não é\n9. Oferta\n10. FAQ\n11. CTA final',
    'Saída: landing completa em HTML/Markdown estruturado nas 11 seções acima. CTA final aponta pra Hotmart/Kiwify.',
    '{"marketplace_first": true, "clearix_sutil": true, "no_hype": true, "no_curso_generico": true, "nexus_como_complemento": true}'::jsonb,
    ARRAY[]::text[],
    true,
    100
  ),
  (
    'landing-academy-low-ticket-canonico',
    'Landing Academy low-ticket (canônico)',
    'text',
    'chatgpt',
    'Prompt canônico (docs/digiai/docs/05-marketing/prompt-copy-landing-page-clearix-academy.md) pra gerar copy de página externa de apoio ao low-ticket do Clearix Academy. NÃO contradiz marketplace-first.',
    E'Você é um copywriter de conversão especializado em páginas de oferta para low tickets.\n\nCrie a copy de uma página externa de apoio para um low ticket do Clearix Academy.\n\nContexto da oferta:\n- Marca-mãe: DIGIAI\n- Frente de entrada: Clearix Academy\n- Produto-âncora futuro: Clearix\n- Produto atual: ebook / manual visual em PDF\n- Complemento: 90 dias de acesso na Nexus\n- Canal principal de descoberta atual: marketplaces como Hotmart e Kiwify\n- Papel desta página: apoiar conversão de tráfego externo e reforçar autoridade, não substituir o marketplace\n- Público principal: vendedor, atendente e consultor óptico\n- Posicionamento: prático, profissional, específico do varejo óptico, sem hype\n- Faixa de preço base: R$ 97\n\nMonte a página nas seções abaixo:\n1. Hero\n2. Dores reais\n3. O que muda na prática\n4. O que é o produto\n5. O que vem dentro\n6. FAQ\n7. Oferta\n8. CTA final\n\nRegras:\n- Deixe explícito que a compra é do ebook / manual visual.\n- Trate a Nexus como apoio complementar por 90 dias.\n- Não escreva como se estivéssemos vendendo um curso grande ou plataforma principal.\n- Não transforme a página em pré-venda do Clearix.\n- O CTA principal deve apontar para o checkout do marketplace.\n- Escreva em português do Brasil.',
    'Saída: copy completa em PT-BR nas 8 seções acima. CTA final → checkout Hotmart/Kiwify.',
    '{"marketplace_first": true, "clearix_sutil": true, "ebook_explicito": true, "nexus_como_complemento": true, "no_curso_grande": true, "pt_br": true}'::jsonb,
    ARRAY[]::text[],
    true,
    101
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  output_hint = EXCLUDED.output_hint,
  locks = EXCLUDED.locks,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
