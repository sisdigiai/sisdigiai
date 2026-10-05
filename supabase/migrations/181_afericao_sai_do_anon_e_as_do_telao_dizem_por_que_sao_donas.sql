-- 181 — a aferição sai do `anon`, e as 6 views do Telão passam a dizer por que são donas
--
-- ✔ APLICADA em 05/10/2026 às 16:36:35 BRT, reensaiada antes. Medido depois: **0 views nossas legíveis por
--   `anon`** sem invoker (eram 1). As 36 continuam donas — este lote não mexeu em invoker de propósito.
--
-- (Escrita como NÃO APLICADA.)
--
-- LOTE 1 de 3 da varredura das 36 (achado da 180, despacho do Geral em 05/10). Este lote é o de risco zero:
--   um revoke que repete decisão já tomada, e 6 comentários.
--
-- A AFERIÇÃO NÃO É UMA DECISÃO NOVA: em 27/08 o dono tirou as views do Telão do `anon` ("o login é a porta;
--   chave no bundle é ofuscação"). Medido agora: `v_telao_cobranca`, `_financeiro`, `_pendencias`, `_pipeline`,
--   `_roadmap` e `_sai_hoje` estão todas com anon = false. **Só `v_telao_afericao` está com anon = true** —
--   ela nasceu em 09/09, depois daquela decisão, e ficou para trás. Este revoke põe a última no mesmo lugar.
--
-- E O TELÃO NÃO QUEBRA, isso foi medido no código dele antes: `digiai_telao/src/lib/espelhos.ts` lê com
--   `tokenDaSessao`, e `src/paginas/Diagnostico.tsx` sonda a aferição como fonte do projeto `digiai`, junto com
--   `v_ops_plataformas` e `v_ops_contas_servicos`, que já são authenticated-only. Se a sessão não existisse,
--   essas três já estariam falhando hoje.
--
-- POR QUE AS 6 SÓ GANHAM COMENTÁRIO: elas são definer **de propósito** — a TV mostra o agregado da casa, e
--   quem olha a tela não tem papel no `iam`. Virar invoker nelas devolveria vazio sem dar erro: tela viva,
--   número zero. O comentário existe para que o próximo que varrer a lista não "conserte" o que é desenho —
--   que é exatamente o risco que esta varredura cria.

begin;

do $$
begin
  if not pg_catalog.has_table_privilege('anon', 'public.v_telao_afericao', 'select') then
    raise exception 'a afericao ja saiu do anon — a 181 ja foi aplicada?';
  end if;
  -- se alguma das 6 irmãs estiver aberta a anon, a premissa deste lote está errada e eu paro
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public' and c.relname like 'v_telao%' and c.relname <> 'v_telao_afericao'
                and pg_catalog.has_table_privilege('anon', c.oid, 'select')) then
    raise exception 'ha view do telao aberta a anon — conferir antes, a premissa do lote caiu';
  end if;
end $$;

revoke select on public.v_telao_afericao from anon;

comment on view public.v_telao_afericao is
  '095/181: instrumento do próprio check-up — só fonte, tem_dado e atualizado_em, nenhum dado. DEFINER de '
  'propósito: lê as 6 views do Telão, que também são donas. Saiu do `anon` em 05/10 para acompanhar a decisão '
  'do dono de 27/08 (o login é a porta); o Telão lê com sessão, por tokenDaSessao.';

do $$
declare v_n int; v_nome text;
begin
  for v_nome in select unnest(array['v_telao_cobranca','v_telao_financeiro','v_telao_pendencias',
                                    'v_telao_pipeline','v_telao_roadmap','v_telao_sai_hoje'])
  loop
    execute format($f$comment on view public.%I is %L$f$, v_nome,
      'DEFINER de propósito (classificado na varredura de 05/10, lote 1): a TV mostra o agregado da casa e '
      'quem olha a tela não tem papel no iam. Virar security_invoker aqui NÃO dá erro — devolve vazio, e o '
      'resultado é tela viva com número zero. Se precisar restringir, o caminho é filtro explícito escrito '
      'nesta view, não invoker. Lida com sessão pelo digiai_telao (espelhos.ts). Grant de anon removido em '
      '27/08 por decisão do dono.');
  end loop;
end $$;

do $$
declare v_n int;
begin
  -- a) o revoke pegou
  if pg_catalog.has_table_privilege('anon', 'public.v_telao_afericao', 'select') then
    raise exception 'PROVA_181_FALHOU: anon continua lendo a afericao';
  end if;

  -- b) CONTROLE POSITIVO (R-043 §4-A): provar que a porta trancou não é provar que a chave certa abre.
  --    `set role` vale aqui porque a pergunta é de GRANT, não de RLS — a view é dona, não tem RLS a provar.
  set local role authenticated;
  select count(*) into v_n from public.v_telao_afericao;
  reset role;
  if v_n < 1 then
    raise exception 'PROVA_181_FALHOU: authenticated nao le mais a afericao (% linhas) — quebrei o Telao', v_n;
  end if;

  -- c) os 7 comentários estão lá: marca que ninguém escreve não documenta nada
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname like 'v_telao%'
     and obj_description(c.oid,'pg_class') ilike '%DEFINER de prop%';
  if v_n <> 7 then raise exception 'PROVA_181_FALHOU: esperava 7 views do telao comentadas, achei %', v_n; end if;

  -- d) e eu não mexi no grant de mais ninguém de carona
  if (select count(*) from ops.v_views_sem_invoker) <> 36 then
    raise exception 'PROVA_181_FALHOU: a lista das 36 mudou — mexi em invoker sem querer';
  end if;
  if (select count(*) from ops.v_views_sem_invoker where legivel_por_anon) <> 0 then
    raise exception 'PROVA_181_FALHOU: ainda ha view nossa sem invoker legivel por anon';
  end if;
end $$;

commit;
