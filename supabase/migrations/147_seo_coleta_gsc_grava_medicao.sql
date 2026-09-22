-- 147 — SEO religada: a coleta diária do GSC passa a gravar a medição que a tela lê
--
-- ✔ APLICADA em 21/09/2026 às 23:34 BRT, com a palavra do dono neste canal ("religo a tela de SEO na coleta do GSC": sim),
--   reensaiada antes. Edge marketing-sync-gsc v40 publicada (verify_jwt true). Rodada run_marketing_sync_daily() às 23:35:
--   3 medições gsc-api de 21/09 (digiai 2 cliques/401 imp/pos 6,9 · clearix 1/28/17,5 · mello 29/1.383/9,2); tela SEO
--   verificada no navegador com o login do dono, "antes" = 17/08.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE PAROU: a tela SEO lê public.v_seo_estado ← company.seo_medicoes (histórico, 078). Essa tabela só
--   recebeu a leitura manual de 17/08 (fonte gsc-navegador). A coleta marketing-sync-gsc roda todo dia às 09:00 UTC
--   e está ok desde 17/09 13:30, mas grava em company.metrics via fn_replace_metrics — que APAGA e regrava a cada
--   rodada (sem histórico) e numa janela de 7d/30d que a tela não usa. Resultado: a tela congelou em 17/08.
--
-- O QUE CRIA: public.fn_seo_registrar_medicao(...) — só service_role (a edge com a chave do servidor).
--   Uma linha por site por dia BRT, janela '3m' (mesma da leitura manual, para a comparação "antes" não misturar
--   janelas), fonte 'gsc-api'. Rodar de novo no mesmo dia atualiza a linha do dia; linha manual (gsc-navegador)
--   do mesmo dia NÃO é sobrescrita. ctr em % (como a 078: 0,70 = 0,7%).
--
-- Medido antes (21/09 23:4x BRT): seo_medicoes = 3 linhas, todas de 17/08 gsc-navegador; metrics gsc = 35 linhas
--   coletadas hoje 09:00 UTC.

begin;

do $$
begin
  if to_regprocedure('public.fn_seo_registrar_medicao(text,integer,integer,numeric,numeric,integer,text,date)') is not null then
    raise exception 'fn_seo_registrar_medicao ja existe — a 147 ja foi aplicada?';
  end if;
end $$;

create function public.fn_seo_registrar_medicao(
  p_site text, p_cliques integer, p_impressoes integer, p_posicao numeric, p_ctr_pct numeric,
  p_paginas_sitemap integer, p_sitemap_url text, p_sitemap_lido_em date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into company.seo_medicoes
    (site, medido_em, janela, cliques, impressoes, posicao_media, ctr, paginas_sitemap, sitemap_url, sitemap_lido_em, fonte, obs)
  values
    (p_site, (now() at time zone 'America/Sao_Paulo')::date, '3m', p_cliques, p_impressoes,
     round(p_posicao, 1), round(p_ctr_pct, 2), p_paginas_sitemap, p_sitemap_url, p_sitemap_lido_em, 'gsc-api',
     'Coleta diária automática (marketing-sync-gsc), últimos 90 dias até D-2.')
  on conflict (site, medido_em, janela) do update set
    cliques = excluded.cliques, impressoes = excluded.impressoes, posicao_media = excluded.posicao_media,
    ctr = excluded.ctr, paginas_sitemap = excluded.paginas_sitemap, sitemap_url = excluded.sitemap_url,
    sitemap_lido_em = excluded.sitemap_lido_em, created_at = now()
  where company.seo_medicoes.fonte = 'gsc-api';
$$;
comment on function public.fn_seo_registrar_medicao(text,integer,integer,numeric,numeric,integer,text,date) is
  '147: a coleta do GSC grava uma medição por site por dia (janela 3m, fonte gsc-api) em company.seo_medicoes.';
revoke all on function public.fn_seo_registrar_medicao(text,integer,integer,numeric,numeric,integer,text,date) from public, anon, authenticated;
grant execute on function public.fn_seo_registrar_medicao(text,integer,integer,numeric,numeric,integer,text,date) to service_role;

do $$
declare v_antes int; v_depois int;
begin
  if has_function_privilege('anon', 'public.fn_seo_registrar_medicao(text,integer,integer,numeric,numeric,integer,text,date)', 'execute')
  or has_function_privilege('authenticated', 'public.fn_seo_registrar_medicao(text,integer,integer,numeric,numeric,integer,text,date)', 'execute') then
    raise exception 'anon/authenticated executam a funcao.';
  end if;
  select count(*) into v_antes from company.seo_medicoes;
  begin
    perform public.fn_seo_registrar_medicao('digiai.app.br', 5, 300, 8.26, 1.667, 15, 'https://x/sitemap.xml', '2026-09-20');
    perform public.fn_seo_registrar_medicao('digiai.app.br', 6, 310, 8.1, 1.9, 15, 'https://x/sitemap.xml', '2026-09-20');
    select count(*) into v_depois from company.seo_medicoes;
    if v_depois <> v_antes + 1 then raise exception 'PROVA_147_FALHOU: esperava 1 linha nova, veio %', v_depois - v_antes; end if;
    if not exists (select 1 from public.v_seo_estado where site = 'digiai.app.br'
                    and medido_em = (now() at time zone 'America/Sao_Paulo')::date and cliques = 6 and posicao_media = 8.1
                    and cliques_antes = 2 and medido_antes_em = '2026-08-17') then
      raise exception 'PROVA_147_FALHOU: a tela nao le a medicao nova com o antes de 17/08';
    end if;
    raise exception 'PROVA_147_OK';
  exception when others then
    if sqlerrm <> 'PROVA_147_OK' then raise; end if;
  end;
end $$;

commit;
