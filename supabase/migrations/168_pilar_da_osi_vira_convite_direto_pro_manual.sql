-- 168 — o pilar "convite direto pra turma" vira "convite direto pro manual" nas ideias
--
-- ✔ APLICADA em 01/10/2026 às 18:03:01 BRT, reensaiada antes. Medido depois: 0 linhas com o pilar antigo,
--   25 com o novo; a curada ficou com o pilar certo e **aprovada_em = null** — esperando a palavra do dono.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: palavra do dono em 01/10 no canal do MKT ("pode fazer os três"), aplicada lá pela migration
--   20261001_09, que renomeou o pilar nas regras da marca e deixou escrito: "marketing.content_ideas é do app:
--   esta migration não mexe nela". O Geral repassou o pedido.
--
-- CORREÇÃO DE ESCOPO, medida antes de escrever: o despacho fala de UMA ideia. São **25 linhas** com o pilar
--   antigo, todas `available` — 1 curada em setembro (com título, marca e aprovação do dono registrada) e
--   **24 sementes de 25/05**, sem título e sem marca, entre elas as três que a própria curada cita como origem.
--   Quem contou "1" olhou só as que têm marca. Renomear só a curada deixaria 24 apontando para pilar morto.
--
-- A TRAVA DA CASA ME BARROU, e estava certa. A primeira versão desta migration tentou renomear as 25 de uma vez
--   e o gatilho `tg_content_ideas_curadoria` recusou: *"ideia aprovada não se edita — revogue
--   (fn_revogar_ideias), edite e leve de novo ao dono"*. Ou seja: a casa não deixa mudar por baixo um texto que
--   o dono aprovou. Então a migration passa a fazer o caminho certo, em vez de contorná-lo:
--     · as 24 sementes (sem aprovação) são renomeadas direto;
--     · a curada é REVOGADA com motivo, renomeada, e fica **esperando a palavra do dono** para voltar.
--   Não re-aprovo: aprovação é portão do dono, e foi ele quem aprovou esta ideia em 16/09.
--
-- O TEXTO DA IDEIA JÁ ESTAVA CERTO: ela diz "manual em PDF, app leitor e apoio no Nexus". A palavra "turma"
--   só existia no rótulo do pilar. Por isso renomear, e não reescrever.

begin;

do $$
declare v_velho int; v_aprovadas int;
begin
  select count(*), count(*) filter (where aprovada_em is not null) into v_velho, v_aprovadas
    from marketing.content_ideas where pilar = 'convite direto pra turma';
  if v_velho = 0 then raise exception 'nenhuma ideia com o pilar antigo — a 168 ja foi aplicada?'; end if;
  if v_velho <> 25 or v_aprovadas <> 1 then
    raise exception 'esperava 25 linhas (1 aprovada) e achei % (% aprovadas) — conferir antes', v_velho, v_aprovadas;
  end if;
end $$;

-- 1) as sementes, que ninguém aprovou: renomeia direto
update marketing.content_ideas
   set pilar = 'convite direto pro manual', updated_at = now()
 where pilar = 'convite direto pra turma' and aprovada_em is null;

-- 2) a curada: pelo caminho que a casa definiu — revoga, edita, espera o dono
select marketing.fn_revogar_ideias(
  array['26974497-c9af-46be-b7d5-671302b3dc45']::uuid[],
  'pilar renomeado por palavra do dono em 01/10 (convite direto pra turma -> pro manual). O texto já estava '
  'certo; só o rótulo do pilar carregava a palavra velha. Volta à pauta quando o dono aprovar de novo.');

update marketing.content_ideas
   set pilar = 'convite direto pro manual', updated_at = now()
 where id = '26974497-c9af-46be-b7d5-671302b3dc45';

do $$
declare v_curada record;
begin
  if exists (select 1 from marketing.content_ideas where pilar = 'convite direto pra turma') then
    raise exception 'PROVA_168_FALHOU: sobrou ideia com o pilar antigo';
  end if;
  if (select count(*) from marketing.content_ideas where pilar = 'convite direto pro manual') <> 25 then
    raise exception 'PROVA_168_FALHOU: as 25 nao chegaram no pilar novo';
  end if;

  select pilar, aprovada_em, status into v_curada
    from marketing.content_ideas where id = '26974497-c9af-46be-b7d5-671302b3dc45';
  if v_curada.pilar <> 'convite direto pro manual' then
    raise exception 'PROVA_168_FALHOU: a curada nao pegou o pilar novo';
  end if;
  if v_curada.aprovada_em is not null then
    raise exception 'PROVA_168_FALHOU: a curada continua aprovada — eu nao posso re-aprovar, isso e portao do dono';
  end if;

  -- nenhum outro pilar tocado de carona
  if (select count(*) from marketing.content_ideas where pilar = 'metodo de balcao na pratica') <> 38
  or (select count(*) from marketing.content_ideas where pilar = 'bastidores do metodo (prova)') <> 15 then
    raise exception 'PROVA_168_FALHOU: mexi em pilar que nao era para mexer';
  end if;
end $$;

commit;
