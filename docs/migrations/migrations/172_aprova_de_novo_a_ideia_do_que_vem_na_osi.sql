-- 172 — "O que vem no Ótica Sem Improviso" volta à pauta curada
--
-- ✔ APLICADA em 05/10/2026 às 15:27:34 BRT, reensaiada antes. A ideia voltou à pauta: aprovada, pilar novo,
--   status available, validade 16/10 mantida, e a fonte da palavra gravada na própria linha.
--
-- (Escrita como NÃO APLICADA.)
--
-- PALAVRA DO DONO, no canal do app, 05/10/2026, textual: "pode aprovar a ideia da osi".
--
-- POR QUE PRECISOU DE DUAS PALAVRAS DELE: a ideia foi aprovada por ele em 16/09. Em 01/10 o pilar da OSI
--   mudou de "convite direto pra turma" para "convite direto pro manual" (palavra dele no canal do MKT), e a
--   168 renomeou o rótulo. A trava `tg_content_ideas_curadoria` não deixa editar ideia aprovada, e está certa:
--   então ela foi revogada, renomeada, e ficou fora da pauta esperando. O Geral repassou um "pode aprovar"
--   em 01/10; não aprovei por repasse, porque a função grava o NOME de quem aprovou dentro da linha e eu
--   estaria assinando por ele uma frase que não ouvi. Hoje a frase veio no meu canal. São 4 dias de espera
--   que eu faria de novo.
--
-- O TEXTO NÃO MUDOU: continua "manual em PDF para imprimir, app leitor para estudar no celular e apoio no
--   Nexus incluído". Só o rótulo do pilar.
--
-- VALIDADE MANTIDA em 16/10, não renovada: a validade foi posta quando ele aprovou o conteúdo, em 16/09, e o
--   conteúdo é o mesmo. Esticar o prazo porque a ideia deu uma volta burocrática seria eu dar mais vida a um
--   texto por conta própria. Se ele quiser mais prazo, é uma linha.

begin;

do $$
begin
  if (select aprovada_em from marketing.content_ideas where id = '26974497-c9af-46be-b7d5-671302b3dc45') is not null then
    raise exception 'a ideia ja esta aprovada — a 172 ja foi aplicada?';
  end if;
  if (select pilar from marketing.content_ideas where id = '26974497-c9af-46be-b7d5-671302b3dc45')
     <> 'convite direto pro manual' then
    raise exception 'o pilar nao esta no texto novo — rodar a 168 antes';
  end if;
end $$;

select marketing.fn_aprovar_ideias(
  array['26974497-c9af-46be-b7d5-671302b3dc45']::uuid[],
  'Gilberto, canal do app digiai, 05/10/2026: "pode aprovar a ideia da osi". Pedido veio do item 36 da lista '
  'única do Geral (01/10). Mesmo texto aprovado por ele em 16/09 22:13; só o rótulo do pilar mudou para '
  '"convite direto pro manual" (migration 168).',
  '2026-10-16'::date);

do $$
declare v record;
begin
  select pilar, status, aprovada_em, aprovada_por, valida_ate into v
    from marketing.content_ideas where id = '26974497-c9af-46be-b7d5-671302b3dc45';
  if v.aprovada_em is null then raise exception 'PROVA_172_FALHOU: nao aprovou'; end if;
  if v.pilar <> 'convite direto pro manual' then
    raise exception 'PROVA_172_FALHOU: o pilar mudou no caminho (%)', v.pilar;
  end if;
  if v.status <> 'available' then
    raise exception 'PROVA_172_FALHOU: aprovada mas fora da pauta (status %)', v.status;
  end if;
  if v.valida_ate <> '2026-10-16'::date then
    raise exception 'PROVA_172_FALHOU: a validade mudou (%)', v.valida_ate;
  end if;
  if position('05/10/2026' in v.aprovada_por) = 0 then
    raise exception 'PROVA_172_FALHOU: a fonte da palavra nao ficou registrada';
  end if;

  -- nenhuma outra ideia pode ter entrado de carona nesta aprovação
  if (select count(*) from marketing.content_ideas
       where aprovada_por ilike '%05/10/2026%') <> 1 then
    raise exception 'PROVA_172_FALHOU: mais de uma ideia aprovada com esta palavra';
  end if;
end $$;

commit;
