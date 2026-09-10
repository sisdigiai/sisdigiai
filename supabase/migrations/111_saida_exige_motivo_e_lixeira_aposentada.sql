-- 111 — sair da base passa a exigir motivo, e a lixeira antiga se aposenta
--
-- ✔ APLICADA em 10/09/2026 pelo Orquestrador Geral, DEPOIS de o front b3437a0
--   estar no ar (meta build 18:36:57 horário de Brasília (21:36 UTC), e fn_delete_commercial_lead com 0 ocorrências
--   no bundle publicado). Provas: (a) lixeira antiga → 0A000 apontando
--   fn_descartar_lead; (b) deleted_at sem motivo → 23514; (c) não-regressão —
--   fn_descartar_lead continua a gravar, numa transação desfeita. Reconferido por mim
--   depois: CHECK presente e VALIDADA (convalidated), lixeira aposentada,
--   authenticated executa fn_descartar_lead, 260 leads / 1 saída / 0 sem motivo.
--   Falta a (d), com sessão do dono na tela.
--   Faz parte do passe do front (consumidor `v_motivos_saida` + descarte pela
--   tela). Tabela minha (096) — R-032.
--
-- ⚠ ORDEM DE APLICAÇÃO: **DEPOIS** de o front novo do digiai estar no ar.
--    O front que está em produção quando esta migration foi escrita ainda chama
--    `fn_delete_commercial_lead` no ícone de lixo. Aplicar antes não quebra em
--    silêncio — desde o 0503c7b a tela mostra o erro, e o §2 dá uma mensagem que
--    diz o caminho novo — mas deixa um botão que só serve para mostrar erro.
--    Conferir o `<meta name="build">` de app.digiai.app.br antes de aplicar.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE, E O QUE FOI MEDIDO ANTES DE ESCREVER
-- ═══════════════════════════════════════════════════════════════════════════
-- A 109 pendurou o descarte em `deleted_at` (12 de 12 views já filtravam), e
-- deixou escrito o preço: `deleted_at is not null` passou a ter DOIS significados
-- — "descartado com motivo" e "alguém carregou no lixo" — porque a lixeira
-- (`fn_delete_commercial_lead`) grava `deleted_at` sem motivo nenhum. Distinguir
-- exigia derivar `motivo_perda is not null`, e ninguém deriva. Esta migration
-- fecha isso por construção, que era o combinado para o passe do front.
--
-- Medido em 10/09/2026:
--   linhas com deleted_at ....................... 1  (cadastro_ruim, 10/09 02:33)
--   linhas com deleted_at e SEM motivo .......... 0  → a CHECK é satisfazível hoje
--   quem chama fn_delete_commercial_lead:
--     front do digiai (commercialStore.remove) ... 1  — sai neste mesmo passe
--     fontes do digiai_mkt ........................ 0  (só o database.types.ts,
--                                                      que é gerado, não chamada)
--     edge functions do workspace ................. 0
--     funções do banco ............................ 0
--
-- ⚠ E uma coisa que a medição mostrou e corrige uma frase minha: a 109 disse que
--    o par errado ("perdido" com motivo de descarte) ficava impossível na origem.
--    Existe hoje UMA linha assim — o lead que estava marcado `medo_mudanca` foi
--    re-marcado com `cadastro_ruim` por `fn_descartar_lead`, que de propósito não
--    mexe em `stage`. Ficou stage='perdido' + motivo de descarte + deleted_at.
--    Não aparece em nenhuma view (todas filtram deleted_at), então nenhuma
--    contagem mente. O que a 109 torna impossível é CRIAR o par pela porta da
--    perda; pelo caminho perdido→descartado ele nasce, e é o histórico correto de
--    um erro corrigido. Registo em vez de "consertar": apagar o stage apagaria
--    o registo de que a linha foi, por algumas horas, uma perda falsa.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — ninguém sai da base sem dizer porquê
-- ═══════════════════════════════════════════════════════════════════════════
-- Se isto falhar a aplicar, é porque entretanto alguém usou a lixeira antiga:
-- as linhas culpadas aparecem em `v_leads_descartados` com motivo_rotulo NULO.
-- Não as "corrigir" inventando motivo — perguntar a quem apagou.
alter table ops.commercial_leads
  drop constraint if exists commercial_leads_saida_exige_motivo;
alter table ops.commercial_leads
  add constraint commercial_leads_saida_exige_motivo
  check (deleted_at is null or motivo_perda is not null);

comment on constraint commercial_leads_saida_exige_motivo on ops.commercial_leads is
  'Sair da base (deleted_at) exige motivo. Fecha o preço que a 109 deixou escrito: sem isto, deleted_at significava "descartado com motivo" OU "alguém carregou no lixo", e só derivando se sabia qual. O caminho para sair é fn_descartar_lead; fn_delete_commercial_lead foi aposentada na 111.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — a lixeira antiga passa a recusar, e diz para onde ir
-- ═══════════════════════════════════════════════════════════════════════════
-- Aposentar, não apagar. `drop function` é ação destrutiva e pede o dono; e o que
-- ainda a chamar — uma aba antiga aberta com o bundle velho, alguém guiado pelo
-- `database.types.ts` do MKT, que ainda a lista — recebe uma explicação em vez de
-- "function does not exist". A assinatura fica igual (create or replace não deixa
-- trocar o nome do parâmetro, e trocar partiria quem chama por nome).
create or replace function public.fn_delete_commercial_lead(p_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
begin
  raise exception 'fn_delete_commercial_lead foi aposentada (111): tirar um lead da base exige motivo. Use fn_descartar_lead(p_lead_id, p_motivo) com um motivo de descarte, ou fn_marcar_lead_perdido se a ótica avaliou e disse não.'
    using errcode = '0A000';
end $function$;

comment on function public.fn_delete_commercial_lead(uuid) is
  'APOSENTADA na 111. Gravava deleted_at sem motivo, o que dava dois significados a deleted_at. Mantida só para recusar com explicação quem ainda a chamar; o caminho é fn_descartar_lead. Apagar a função é decisão do dono (ação destrutiva).';

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — trava: por execução, não por catálogo
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  v_id uuid;
  v_msg text;
  v_recusou boolean := false;
  v_check_recusou boolean := false;
begin
  -- a) a lixeira antiga recusa E aponta o caminho novo
  begin
    perform public.fn_delete_commercial_lead(gen_random_uuid());
  exception when others then
    v_recusou := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_recusou then
    raise exception 'fn_delete_commercial_lead ainda executa sem recusar — a lixeira sem motivo continua aberta.';
  end if;
  if v_msg not like '%fn_descartar_lead%' then
    raise exception 'fn_delete_commercial_lead recusa, mas não aponta o caminho novo: %', v_msg;
  end if;

  -- b) a CHECK recusa DE FACTO. Catálogo diz que a constraint existe; isto prova
  --    que ela morde. Escreve numa linha real dentro de uma subtransação que é
  --    SEMPRE desfeita: se a CHECK recusar, o erro desfaz; se não recusar, o
  --    `raise` a seguir desfaz a subtransação e a trava aborta a migration
  --    inteira. Nos dois casos nenhuma linha fica alterada.
  select id into v_id from ops.commercial_leads
   where motivo_perda is null and deleted_at is null limit 1;
  if v_id is not null then
    begin
      update ops.commercial_leads set deleted_at = now() where id = v_id;
      raise exception 'nao_recusou';
    exception
      when check_violation then v_check_recusou := true;
      when others then get stacked diagnostics v_msg = message_text;
    end;
    if not v_check_recusou then
      raise exception 'A CHECK não recusou deleted_at sem motivo (o que aconteceu: %).', v_msg;
    end if;
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `select fn_delete_commercial_lead(<qualquer uuid>)` → 0A000 com a mensagem
--      que manda para fn_descartar_lead;
--   b) `update ops.commercial_leads set deleted_at = now() where id = <lead sem
--      motivo>` → 23514 (commercial_leads_saida_exige_motivo). A trava já faz isto
--      numa subtransação desfeita, mas convém ver o código do erro;
--   c) controlo de não-regressão: `fn_descartar_lead(<descartável>, 'duplicado')`
--      CONTINUA a gravar — a CHECK não pode partir o caminho certo;
--   d) com sessão do dono, na tela: ícone de lixo abre "Descartar cadastro" com os
--      4 motivos de descarte; o lead some do funil e aparece na aba Descartados
--      com o rótulo.
