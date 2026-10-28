-- 204 — `ainda_no_estado` olhava todos os dias, e isso mandou avisar o eco por 19 dias à toa
--
-- ✔ APLICADA em 28/10/2026 às 14:19:56 BRT, ensaiada antes. Depois: a linha do eco de 09/10
--   lê `ainda_no_estado = false` e **continua na tabela**, como histórico. Zero linha fantasma.
--
-- (Escrita como NÃO APLICADA.)
--
-- ═════ O DEFEITO É MEU, DA 196, E QUEM ACHOU FOI O ECO ═════
--   `public.v_controle_resolvidos_dia.ainda_no_estado` existe para separar duas coisas: "o dono resolveu"
--   de "o agente fechou". Ela perguntava:
--
--       exists (select 1 from ops.controle_itens i
--                where i.agente = r.agente and i.tipo = r.tipo and i.texto_hash = r.texto_hash)
--
--   **sem filtrar `data`** — ou seja, "este item já apareceu algum dia", não "o agente ainda escreve".
--   A carga da Controle só apaga as linhas do próprio dia, então todo estado antigo fica na tabela como
--   histórico e o `exists` sempre acha. Medido hoje: **1 linha resolvida**, a do eco de 09/10
--   ("Supabase SIS Vision fatura Outstanding"), com `ainda_no_estado = true`, enquanto o item aparece
--   por último em **09/10** e o estado mais recente do eco é de **10/10**. Logo: ele não escreve o item,
--   e `controle/resolvidos-<data>.md` manda avisá-lo **desde 09/10, por nada**.
--
--   Erro de forma, o terceiro da mesma família neste app: a condição cobria o caso que eu tinha em mente
--   (o agente reescreveu o item hoje) e não o vizinho (o item existe em dia velho). Igual à 180
--   ("view nova nasce invoker" sem cobrir recriação) e à 203 ("a opção está escrita" sem cobrir o valor).
--   E erra para o lado de **inventar trabalho**, que é o lado que gasta gente.
--
-- ═════ RECUSEI A CORREÇÃO QUE VEIO, E A MEDIÇÃO DIZ POR QUÊ ═════
--   O despacho propunha
--       and i.data = (select max(data) from ops.controle_itens x
--                      where x.agente = r.agente and x.origem = 'agente')
--   O `and x.origem = 'agente'` **quebra o item do dono**. Medido em `ops.controle_itens`:
--     · `origem = 'agente'`  → 27 agentes, 571 linhas, 09/10 a 28/10;
--     · `origem = 'decisao'` → **um** "agente", que é o **`dono`**, 125 linhas, 30/09 a 05/10.
--   O `dono` **não tem nenhuma linha** com `origem = 'agente'`. Então, para uma decisão do dono resolvida,
--   aquele `max` viria **nulo**, `i.data = null` nunca casa, e `ainda_no_estado` diria **false sempre** —
--   trocando "manda avisar à toa" por "diz que saiu do estado sem olhar". Pior: silêncio lido como
--   resolução. O filtro certo é por **agente**, sem amarrar a origem; hoje `dono`, `eco` e `urgente` têm
--   cada um uma só origem, e a expressão fica certa para os três.
--
--   A alternativa `i.data = current_date` (em BRT) também foi recusada, e por motivo medido: **este app
--   ficou 13 dias sem escrever estado** (16 a 28/10) e o **eco está sem escrever desde 10/10**. Com
--   `current_date`, todo item de todo agente que não escreveu hoje viraria "saiu do estado" — a tela
--   diria que foi fechado quando ninguém olhou. "O último estado do agente" é a leitura honesta: é a
--   última palavra que ele deu.
--
-- O QUE ESTA MIGRATION PROVA: que o predicado responde **true** para item presente no estado mais recente
--   do agente e **false** para item que só existe em dia velho — as duas pontas, com dado real que já está
--   na tabela, sem inserir linha de teste. E que nenhuma linha de `controle_resolvidos` desaparece (a
--   migration não apaga nada: as linhas de 09/10 ficam como histórico, que é o que elas são).
--   CORRETO POR CONSTRUÇÃO, NÃO MEDIDO: o caso de um agente que passe a ter duas origens no mesmo
--   histórico — hoje não existe (medido acima), e se passar a existir o `max` por agente continua sendo
--   "a última palavra dele", que é a semântica que esta view quer.

begin;

do $$
declare v_def text; v_fantasma int;
begin
  v_def := pg_get_viewdef('public.v_controle_resolvidos_dia'::regclass, true);
  if v_def ~* 'i\.data' then
    raise exception 'a view ja filtra data — a 204 ja foi aplicada?';
  end if;
  -- a premissa: existe exatamente 1 linha fantasma hoje (a do eco)
  select count(*) into v_fantasma from public.v_controle_resolvidos_dia where ainda_no_estado;
  if v_fantasma <> 1 then
    raise exception 'esperava 1 linha dizendo ainda_no_estado e achei % — conferir antes', v_fantasma;
  end if;
end $$;

create or replace view public.v_controle_resolvidos_dia
  with (security_invoker = true) as
 select (r.resolvido_em at time zone 'America/Sao_Paulo')::date as dia,
    r.agente,
    r.tipo,
    r.texto_quando,
    r.nota,
    r.resolvido_em,
    exists (
      select 1
        from ops.controle_itens i
       where i.agente = r.agente
         and i.tipo = r.tipo
         and i.texto_hash = r.texto_hash
         -- 204: só o ESTADO MAIS RECENTE do agente conta. Sem isto, qualquer dia antigo guardado como
         -- histórico fazia o exists achar, e a tela mandava avisar um agente que não escreve mais o item.
         -- Sem filtro de `origem` de propósito: o `dono` só tem linhas `origem='decisao'`, e amarrar a
         -- origem em 'agente' faria o max vir nulo e o campo dizer false sempre para decisão do dono.
         and i.data = (select max(x.data) from ops.controle_itens x where x.agente = r.agente)
    ) as ainda_no_estado
   from ops.controle_resolvidos r;

comment on view public.v_controle_resolvidos_dia is
  '196/204: o que o dono resolveu, por dia de Brasília, para o Geral gerar controle/resolvidos-<data>.md. '
  '`ainda_no_estado` diz se o agente continua escrevendo o item — é o que separa "o dono resolveu" de "o '
  'agente fechou", e é a lista de quem precisa ser avisado. **204:** passou a comparar com o ESTADO MAIS '
  'RECENTE do agente (`max(data)` por agente). A versão da 196 não filtrava `data`, e como a carga só '
  'apaga as linhas do próprio dia, o histórico fazia o exists achar sempre: a linha do eco de 09/10 '
  'mandou avisá-lo por 19 dias à toa. Não se filtra `origem` aqui de propósito — o `dono` só tem linhas '
  '`origem=''decisao''`, e amarrar a origem em ''agente'' zeraria o campo para decisão do dono. Também '
  'não se usa `current_date`: agente que não escreveu hoje (este app ficou 13 dias sem escrever) apareceria '
  'como "fechado" sem ninguém ter olhado — silêncio não é resolução.';

grant select on public.v_controle_resolvidos_dia to authenticated;

do $$
declare v_ag text; v_tp text; v_hash text; v_true boolean; v_false boolean;
        v_total int; v_fantasma int;
begin
  -- a) CONTROLE POSITIVO (R-043 §4-A): item que ESTÁ no estado mais recente de um agente tem de dar true.
  --    Sem isto, um predicado que devolvesse `false` para tudo passaria pela prova (b) e eu teria trocado
  --    "avisa à toa" por "nunca avisa" — que é o defeito pior.
  select i.agente, i.tipo, i.texto_hash into v_ag, v_tp, v_hash
    from ops.controle_itens i
   where i.data = (select max(x.data) from ops.controle_itens x where x.agente = i.agente)
   order by i.data desc, i.agente limit 1;
  if v_ag is null then raise exception 'PROVA_204_FALHOU: nao achei item para o controle positivo'; end if;

  v_true := exists (select 1 from ops.controle_itens i
                     where i.agente = v_ag and i.tipo = v_tp and i.texto_hash = v_hash
                       and i.data = (select max(x.data) from ops.controle_itens x where x.agente = v_ag));
  if not v_true then
    raise exception 'PROVA_204_FALHOU: item no estado mais recente de % deu false', v_ag;
  end if;

  -- b) CONTROLE NEGATIVO com o dado que motivou a migration: o item do eco de 09/10, que só existe em dia
  --    velho, tem de dar false.
  select r.agente, r.tipo, r.texto_hash into v_ag, v_tp, v_hash
    from ops.controle_resolvidos r
   where r.agente = 'eco' order by r.resolvido_em limit 1;
  if v_ag is null then raise exception 'PROVA_204_FALHOU: a linha do eco nao esta mais na tabela'; end if;

  v_false := exists (select 1 from ops.controle_itens i
                      where i.agente = v_ag and i.tipo = v_tp and i.texto_hash = v_hash
                        and i.data = (select max(x.data) from ops.controle_itens x where x.agente = v_ag));
  if v_false then
    raise exception 'PROVA_204_FALHOU: o item do eco continua dizendo que esta no estado';
  end if;

  -- c) a view devolve exatamente isso, e o fantasma sumiu
  select count(*) into v_total    from public.v_controle_resolvidos_dia;
  select count(*) into v_fantasma from public.v_controle_resolvidos_dia where ainda_no_estado;
  if v_total <> (select count(*) from ops.controle_resolvidos) then
    raise exception 'PROVA_204_FALHOU: a view perdeu linha resolvida (% de %)',
      v_total, (select count(*) from ops.controle_resolvidos);
  end if;
  if v_fantasma <> 0 then
    raise exception 'PROVA_204_FALHOU: sobrou % linha fantasma', v_fantasma;
  end if;

  -- d) nada foi apagado: as linhas de 09/10 continuam no histórico
  if (select count(*) from ops.controle_itens where data = '2026-10-09') = 0 then
    raise exception 'PROVA_204_FALHOU: apaguei historico, e esta migration nao apaga nada';
  end if;

  -- e) a view continua invoker (na DEFINIÇÃO — R-043 §4-B) e fora do anon
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_controle_resolvidos_dia'
                    and (select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                          where split_part(o,'=',1)='security_invoker') in ('true','on')) then
    raise exception 'PROVA_204_FALHOU: a view perdeu o security_invoker';
  end if;
  if pg_catalog.has_table_privilege('anon','public.v_controle_resolvidos_dia','select') then
    raise exception 'PROVA_204_FALHOU: abri a view para anon';
  end if;

  set local role authenticated;
  perform count(*) from public.v_controle_resolvidos_dia;
  reset role;
end $$;

commit;
