-- 137 — Central de Materiais da OSI: o prazo do apoio no Nexus sai do texto dos afiliados
--
-- ⛔ NÃO APLICADA. Pede a palavra do dono neste canal.
--
-- DE ONDE VEM: decisão do dono de 16/09 (~21:30, canal do Orquestrador Geral): "OSI no nexus 30 dias". Achado do
--   steward da OSI, repassado pelo Geral: materiais de afiliado dizem "90 dias de apoio". O Nexus já tem a própria
--   migration (nexus/supabase/migrations/0092_osi_30_dias.sql: "acesso ao Nexus incluído na compra passa de 90 para
--   30 dias").
--
-- A ESCOLHA: tirar o NÚMERO, não trocar 90 por 30. "apoio no Nexus incluído" é verdade com 90 e com 30 — então esta
--   migration NÃO depende de a landing republicar (a 136 depende, porque o fato osi_oferta diz o prazo). E material
--   que afiliado já baixou e colou por aí não envelhece de novo se o prazo mudar outra vez. Quem diz quantos dias é o
--   fato osi_oferta, lido na hora.
--
-- MEDIDO EM 16/09: 5 materiais ativos citam "90 dias" (nenhum apagado, nenhum diz "sem assinatura"):
--   05c849de banner quadrado (copy_short, copy_medium, copy_long)
--   1546cf5c banner story    (copy_medium, copy_long)
--   0df07742 carrossel 5 Movimentos (copy_long)
--   aa97dbf4 email de afiliado (copy_long)
--   bd89fbfa WhatsApp do afiliado (copy_medium, copy_long)
--   Trocas: "90 dias de apoio [complementar] no Nexus" → "apoio [complementar] no Nexus incluído";
--           "90 dias de apoio" (sem Nexus na frase) → "apoio no Nexus".
--
-- EFEITO NO FRONT: Central de Materiais (affiliate-materials-public e a tela do app) passa a mostrar os textos novos.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if (select count(*) from marketing.affiliate_materials
       where concat_ws(' ', title, description, copy_short, copy_medium, copy_long, notes) ~* '90 ?dias') <> 5 then
    raise exception 'esperava 5 materiais citando 90 dias, como medido em 16/09.';
  end if;

  if exists (
    select 1 from (values
      ('05c849de-9535-42b0-a1b4-674e76cf620d'::uuid, 'b75bf778a6319d6b158ab47a8a16bca0'),
      ('1546cf5c-5ba8-426a-ace4-64cd0cd0da28'::uuid, 'bf6ed6154ab5bdfb9a36f062262ffa07'),
      ('aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df'::uuid, 'c7b7b6c6ad52da391031985770a58201'),
      ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d'::uuid, 'acb09ac823254321587b6046fe85a00c'),
      ('0df07742-78e7-4965-8263-634023a29228'::uuid, '42d3f997cf60e6db42002050320762e8')
    ) as e(id, md5)
    where not exists (select 1 from marketing.affiliate_materials m
                       where m.id = e.id and m.deleted_at is null
                         and md5(concat_ws('|', m.copy_short, m.copy_medium, m.copy_long)) = e.md5)
  ) then
    raise exception 'algum dos 5 materiais mudou desde a medicao de 16/09 — conferir antes de reescrever.';
  end if;

  if exists (select 1 from marketing.affiliate_materials
              where concat_ws(' ', title, description, notes) ~* '90 ?dias') then
    raise exception '90 dias apareceu em title/description/notes — esta migration so reescreve copy_*.';
  end if;
end $$;

-- ── o prazo sai do texto ──────────────────────────────────────────────────────
update marketing.affiliate_materials
   set copy_short  = regexp_replace(regexp_replace(copy_short,  '\m90 dias de apoio( complementar)? no Nexus', 'apoio\1 no Nexus incluído', 'g'), '\m90 dias de apoio\M', 'apoio no Nexus', 'g'),
       copy_medium = regexp_replace(regexp_replace(copy_medium, '\m90 dias de apoio( complementar)? no Nexus', 'apoio\1 no Nexus incluído', 'g'), '\m90 dias de apoio\M', 'apoio no Nexus', 'g'),
       copy_long   = regexp_replace(regexp_replace(copy_long,   '\m90 dias de apoio( complementar)? no Nexus', 'apoio\1 no Nexus incluído', 'g'), '\m90 dias de apoio\M', 'apoio no Nexus', 'g'),
       updated_at  = now()
 where id in ('05c849de-9535-42b0-a1b4-674e76cf620d', '1546cf5c-5ba8-426a-ace4-64cd0cd0da28',
              'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d',
              '0df07742-78e7-4965-8263-634023a29228');

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from marketing.affiliate_materials
              where concat_ws(' ', title, description, copy_short, copy_medium, copy_long, notes) ~* '90 ?dias') then
    raise exception 'ainda ha material citando 90 dias.';
  end if;

  if exists (select 1 from marketing.affiliate_materials
              where concat_ws(' ', copy_short, copy_medium, copy_long) ~* '(apoio no Nexus no Nexus|incluído incluído|\m30 dias)') then
    raise exception 'troca gerou texto duplicado ou pos numero de dias.';
  end if;

  -- a frase-âncora de cada material, conferida por inteiro (inclui acento)
  if not exists (select 1 from marketing.affiliate_materials where id = '05c849de-9535-42b0-a1b4-674e76cf620d'
                   and copy_short  = 'Pare de atender no improviso. Manual visual + App leitor + apoio no Nexus. Link na bio.'
                   and copy_medium like '%PDF + App leitor + apoio no Nexus incluído. Garantia de 7 dias.'
                   and copy_long   like '%App leitor no celular + apoio complementar no Nexus incluído. Compra única, com garantia de 7 dias. Link na bio.')
  or not exists (select 1 from marketing.affiliate_materials where id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28'
                   and copy_medium = 'Manual visual + App leitor + apoio no Nexus. Garantia de 7 dias. Link na bio.'
                   and copy_long   like '%manual PDF + App leitor + apoio no Nexus incluído. Compra única%')
  or not exists (select 1 from marketing.affiliate_materials where id = '0df07742-78e7-4965-8263-634023a29228'
                   and copy_long   like '%PDF + App + apoio no Nexus incluído. Link na bio."')
  or not exists (select 1 from marketing.affiliate_materials where id = 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df'
                   and copy_long   like '%App leitor no celular + apoio complementar no Nexus incluído (onde você revisa%')
  or not exists (select 1 from marketing.affiliate_materials where id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d'
                   and copy_medium like '%PDF + App leitor + apoio no Nexus. Quer que eu te mande o link?'
                   and copy_long   like '%App leitor pra estudar no celular e apoio no Nexus incluído (com o Doug%') then
    raise exception 'o texto final de algum material nao e o esperado.';
  end if;

  if exists (select 1 from marketing.affiliate_materials
              where concat_ws(' ', copy_short, copy_medium, copy_long) like '%' || chr(65533) || '%') then
    raise exception 'caractere de substituicao (U+FFFD) nos materiais.';
  end if;
end $$;

commit;
