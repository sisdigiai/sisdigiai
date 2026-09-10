-- 115 — os dois prompts ativos que punham o preço velho da OSI em cada peça gerada
--
-- ✔ APLICADA em 10/09/2026 pelo Orquestrador Geral, sob o portão 97. Reconferido por
--   mim com a trava final deste arquivo: 0 ocorrências de 48,50/lançamento/estreia nos
--   2 prompts, CTA novo presente nos 2, 0 U+FFFD. O que decidi não tocar ficou
--   intacto: d5eec42f ainda com "Faixa de preço base: R$ 97"; 2353ec9b ainda com
--   "estreia".
--
-- (Escrita como NÃO APLICADA.) Decisão do dono (portão 97): sem preço nos materiais, sem
--    "lançamento". Tabela minha (marketing.*) — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ENTRA, se marketing.* está congelado como histórico
-- ═══════════════════════════════════════════════════════════════════════════
-- Prompt ATIVO não é histórico: `marketing_render_prompt` usa-o, e o que estiver
-- escrito nele sai em cada peça gerada a partir dele. Um preço num prompt não é um
-- erro — é uma fábrica de erros.
--
-- MEDIDO EM 10/09/2026 — todas as ocorrências, não só a primeira:
--   1e3113bc  Cavalo de Troia · Reel para dono treinar equipe ........ 1
--             4. CTA (22-30s): "link no perfil — checkout Hotmart, R$ 48,50 lançamento"
--   57da4001  Cavalo de Troia · Carrossel para dono usar com equipe ... 1
--             Slide 10: CTA — "Link no perfil. Checkout Hotmart. R$ 48,50 lançamento."
-- A troca tira só o preço e o "lançamento". O resto do CTA fica.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE FICA, e por quê — é o que o pedido mandou dizer
-- ═══════════════════════════════════════════════════════════════════════════
--   d5eec42f  Landing Academy low-ticket (canônico): "Faixa de preço base: R$ 97".
--             NÃO é da OSI: é o modelo de TODAS as landings low-ticket da Academy.
--             Mudar a faixa de preço da linha inteira é decisão maior do que "a OSI
--             custa R$ 49", e eu não a tomo por extensão. Vai como pergunta ao dono.
--   2353ec9b  Card Consolidado Semanal DIGIAI: a busca casou "estreia" — é a
--             estreia do perfil @_digiai, não preço. Falso positivo.

begin;

do $$
declare
  v1 text := '"link no perfil — checkout Hotmart, R$ 48,50 lançamento"';
  v2 text := '"Link no perfil. Checkout Hotmart. R$ 48,50 lançamento."';
  n int;
begin
  -- Casamento EXATO, não regex: se houver um espaço não-quebrável ou um travessão
  -- diferente, o replace não troca nada e a migration "aplicaria com sucesso" sem
  -- mudar o prompt. Aqui recusa.
  select (length(prompt_template) - length(replace(prompt_template, v1, ''))) / length(v1)
    into n from marketing.ai_prompt_templates where id = '1e3113bc-8e97-423e-b486-7cb10e4df6f1';
  if n is distinct from 1 then
    raise exception 'Prompt 1e3113bc: esperava 1 ocorrência exata do CTA com preço, encontrei % — o texto não bate byte a byte.', n;
  end if;

  select (length(prompt_template) - length(replace(prompt_template, v2, ''))) / length(v2)
    into n from marketing.ai_prompt_templates where id = '57da4001-5fa8-42d2-81da-c921bb5eaf43';
  if n is distinct from 1 then
    raise exception 'Prompt 57da4001: esperava 1 ocorrência exata do CTA com preço, encontrei % — o texto não bate byte a byte.', n;
  end if;
end $$;

update marketing.ai_prompt_templates set
  prompt_template = replace(prompt_template,
    '"link no perfil — checkout Hotmart, R$ 48,50 lançamento"',
    '"link no perfil — checkout Hotmart"'),
  updated_at = now()
where id = '1e3113bc-8e97-423e-b486-7cb10e4df6f1';

update marketing.ai_prompt_templates set
  prompt_template = replace(prompt_template,
    '"Link no perfil. Checkout Hotmart. R$ 48,50 lançamento."',
    '"Link no perfil. Checkout Hotmart."'),
  updated_at = now()
where id = '57da4001-5fa8-42d2-81da-c921bb5eaf43';

do $$
declare n int;
begin
  select count(*) into n from marketing.ai_prompt_templates
   where id in ('1e3113bc-8e97-423e-b486-7cb10e4df6f1', '57da4001-5fa8-42d2-81da-c921bb5eaf43')
     and prompt_template ~* '48[,.]50|R\$\s?97|%\s?off|lan.amento|estreia';
  if n > 0 then
    raise exception '% dos 2 prompts ainda com preço / lançamento / estreia.', n;
  end if;

  select count(*) into n from marketing.ai_prompt_templates
   where (id = '1e3113bc-8e97-423e-b486-7cb10e4df6f1' and strpos(prompt_template, '"link no perfil — checkout Hotmart"') > 0)
      or (id = '57da4001-5fa8-42d2-81da-c921bb5eaf43' and strpos(prompt_template, '"Link no perfil. Checkout Hotmart."') > 0);
  if n <> 2 then
    raise exception 'O CTA novo não ficou nos 2 prompts (encontrei %).', n;
  end if;

  select count(*) into n from marketing.ai_prompt_templates
   where prompt_template like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception '% prompt(s) com acento corrompido (U+FFFD).', n;
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) os 2 prompts: 0 ocorrências de 48,50 / lançamento / estreia;
--   b) `marketing_render_prompt` com cada um: o CTA renderizado sai sem preço;
--   c) d5eec42f e 2353ec9b INTACTOS — o que esta migration decidiu não tocar.
