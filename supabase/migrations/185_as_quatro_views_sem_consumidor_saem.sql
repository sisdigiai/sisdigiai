-- 185 — lote 4: saem as 4 views que ninguém lia
--
-- ⏸ ESCRITA E ENSAIADA, **NÃO APLICADA**. Falta a palavra do dono no canal do agente do app.
--
-- POR QUE NÃO APLIQUEI AINDA: o Geral relatou que o dono disse "ratifico, e pode remover as 4" no canal
--   dele, em 05/10. Acredito nele — e ainda assim não aplico por relato. Remover objeto de produção é
--   destrutivo, e palavra do dono repassada por par não é palavra do dono no meu canal; foi o que ficou
--   combinado quando recusei um repasse antes, e a regra não vale menos quando o repasse é verdadeiro.
--   O Geral previu isso e mandou pedir aqui, o que foi feito. **Aplicar é um comando só, depois do sim.**
--
-- O CAMINHO DE VOLTA ESTÁ ESCRITO ANTES DA IDA: `docs/ddl-removido-2026-10-05-quatro-views-sem-consumidor.sql`
--   recria as 4 como estavam, com grants e comentários. Remover sem isso seria apagar, não remover.
--
-- MEDIDO ANTES (é o que sustenta a remoção):
--   · **Nenhum consumidor em repo nenhum.** Varredura no workspace inteiro, em `src/`, `scripts/`,
--     `functions/`, `lib/`, `api/`, excluindo `database.types.ts` (gerado — faz qualquer view parecer usada;
--     o erro que o portão 65 registra ter cometido na 1.ª passada) e as próprias migrations. Único eco é o
--     `database.types.ts` do MKT e um comentário em `dump-schema.mjs`.
--   · **Nenhuma é lida por outra view ou função** (`pg_depend`): as quatro dão "nenhuma".
--   · `v_ops_cofre` já estava apontada como candidata a remoção em 09/09, e continuou sem consumidor.
--   · `v_vendas_leads` já carrega comentário dizendo que é COMPAT do rename de 14/09, "em dois tempos" —
--     esta migration é o segundo tempo, não uma decisão nova.
--
-- ACHADO AO PREPARAR, que não estava na lista: as duas do cofre tinham **INSERT, UPDATE, DELETE e TRUNCATE
--   concedidos a `authenticated`**, não só SELECT. Não eram exploráveis (`v_ops_cofre` tem LEFT JOIN e
--   `v_ops_cofre_resumo` é agregada, logo nenhuma é atualizável automaticamente), mas o grant estava errado
--   e ninguém tinha visto. O arquivo de restauração recria **só o SELECT**, de propósito.
--
-- PARA O MKT: o `database.types.ts` dele cita as 4. É arquivo gerado e não quebra build por citar view que
--   não existe mais, mas na próxima geração elas desaparecem — e é bom que desapareçam.
--
-- SEM CASCADE, de propósito: se alguma dependência existir que eu não medi, o `drop` falha e a migration
--   inteira cai. Prefiro falhar a arrastar junto o que eu não sabia que estava pendurado.

begin;

do $$
declare v_n int;
begin
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='v'
     and c.relname in ('v_ops_cofre','v_ops_cofre_resumo','v_mkt_contas','v_vendas_leads');
  if v_n <> 4 then raise exception 'esperava as 4 views e achei % — a 185 ja foi aplicada?', v_n; end if;

  -- a substituta da compat tem de existir e responder ANTES de eu remover a compat
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_mkt_vendas_leads') then
    raise exception 'v_mkt_vendas_leads nao existe — nao removo a compat sem a substituta';
  end if;
  select count(*) into v_n from public.v_mkt_vendas_leads;
  if v_n = 0 then
    raise exception 'v_mkt_vendas_leads devolve 0 linhas — a substituta nao esta respondendo, nao removo a compat';
  end if;

  -- e as duas têm de ser de fato a mesma coisa; se divergiram, `v_vendas_leads` deixou de ser compat e
  -- removê-la perderia dado que a outra não mostra
  if (select pg_get_viewdef('public.v_vendas_leads'::regclass, true))
  <> (select pg_get_viewdef('public.v_mkt_vendas_leads'::regclass, true)) then
    raise exception 'v_vendas_leads e v_mkt_vendas_leads divergiram — nao e mais compat, rever antes';
  end if;
end $$;

drop view public.v_ops_cofre;
drop view public.v_ops_cofre_resumo;
drop view public.v_mkt_contas;
drop view public.v_vendas_leads;

do $$
declare v_n int; v_leads int;
begin
  -- a) as 4 saíram
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and c.relname in ('v_ops_cofre','v_ops_cofre_resumo','v_mkt_contas','v_vendas_leads');
  if v_n <> 0 then raise exception 'PROVA_185_FALHOU: sobraram % das 4', v_n; end if;

  -- b) CONTROLE POSITIVO (R-043 §4-A): provar que sumiram não é provar que nada mais sumiu com elas.
  --    A substituta tem de continuar respondendo, com as mesmas linhas.
  select count(*) into v_leads from public.v_mkt_vendas_leads;
  if v_leads = 0 then
    raise exception 'PROVA_185_FALHOU: v_mkt_vendas_leads parou de responder depois do drop';
  end if;

  -- c) e o inventário, que era a fonte das três do cofre/contas, continua legível pela view que o app usa
  select count(*) into v_n from public.v_ops_contas_servicos;
  if v_n = 0 then
    raise exception 'PROVA_185_FALHOU: v_ops_contas_servicos zerou — levei a fonte junto';
  end if;

  -- d) a conta das donas fecha: 23 menos as 4 removidas
  select count(*) into v_n from ops.v_views_sem_invoker;
  if v_n <> 19 then raise exception 'PROVA_185_FALHOU: esperava 19 donas restantes e achei %', v_n; end if;
  if (select count(*) from ops.v_views_sem_invoker where legivel_por_anon) <> 0 then
    raise exception 'PROVA_185_FALHOU: apareceu view dona legivel por anon';
  end if;

  raise notice '185: as 4 sairam; v_mkt_vendas_leads com % linhas; 19 views donas restantes', v_leads;
end $$;

commit;
