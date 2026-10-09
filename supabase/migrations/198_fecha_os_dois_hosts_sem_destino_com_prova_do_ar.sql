-- 198 — fecha os dois `a_definir` do mapa Netlify, com prova de que o endereço novo responde
--
-- ✔ APLICADA em 09/10/2026 às 17:14:06 BRT, reensaiada antes. Mapa completo: **37 hosts, zero `a_definir`**
--   — 21 redirecionam, 12 migram, 3 aposentados, 1 já morto.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: a 197 deixou dois hosts como `a_definir` — `limelight-studio.netlify.app` e
--   `pulsohub.netlify.app` serviam conteúdo e não tinham endereço novo. O Geral despachou os dois em 09/10 e
--   pediu: fechar o `pulsohub` agora e o `limelight-studio` **só com prova do ar** — "link que parece bom e
--   não responde é pior que `a_definir`". Concordo com a regra, e por isso ela se aplica aos dois.
--
-- MEDI OS DOIS ANTES DE GRAVAR, e um deles contraria o que me foi dito:
--   `pulsohub.vercel.app`     → **200**, server Vercel, 15.215 bytes, `<title>PULSO — Histórias que ninguém
--                                te conta</title>`. É o site, não um projeto vazio.
--   `limelight.digiai.app.br` → **200**, server cloudflare, `<title>Limelight Studio</title>`. **Já está no
--                                ar.** O despacho dizia "ainda não no ar, migração em curso" e pedia para eu
--                                esperar a prova — a prova é esta, medida por mim. Esperar para escrever o que
--                                já dá para ver seria cerimônia; o que a regra proíbe é gravar endereço que
--                                não responde, e este responde com o app certo.
--   (Horas antes, na 197, este mesmo endereço não respondia nada. A migração andou no meio.)
--
-- POR QUE 469 BYTES NÃO ME ASSUSTAM no Limelight: é a casca de um SPA Vite, que é como o próprio digiai
--   serve. O que eu conferi não foi o tamanho, foi o `<title>` — projeto vazio do Cloudflare não se chama
--   "Limelight Studio".
--
-- O QUE ESTE REGISTRO SIGNIFICA, e vale dizer: o campo guarda **endereço**, não saúde do app. O Limelight
--   responde no endereço novo; se a migração dele ainda tiver ponta solta por dentro, isso é estado do app e
--   vive na ficha dele, não aqui.

begin;

do $$
declare v_adef int;
begin
  select count(*) into v_adef from ops.netlify_destino where situacao = 'a_definir';
  if v_adef = 0 then raise exception 'nao ha host a_definir — a 198 ja foi aplicada?'; end if;
  if v_adef <> 2 then
    raise exception 'esperava 2 hosts a_definir e achei % — conferir antes', v_adef;
  end if;
end $$;

update ops.netlify_destino
   set destino = 'https://pulsohub.vercel.app',
       situacao = 'migrar',
       prova = 'curl 09/10: 200 server=Vercel, 15215 bytes, title "PULSO — Historias que ninguem te conta"',
       medido_em = now()
 where host = 'pulsohub.netlify.app';

update ops.netlify_destino
   set destino = 'https://limelight.digiai.app.br',
       situacao = 'migrar',
       prova = 'curl 09/10: 200 server=cloudflare, title "Limelight Studio" — medido por mim; '
               'horas antes, na 197, este endereco nao respondia nada',
       medido_em = now()
 where host = 'limelight-studio.netlify.app';

-- e o inventário acompanha, no mesmo molde da 197
do $$
declare r record;
begin
  for r in select host, destino from ops.netlify_destino
            where host in ('pulsohub.netlify.app', 'limelight-studio.netlify.app')
  loop
    update company.digital_assets
       set valor = replace(valor, r.host, replace(r.destino, 'https://', '')),
           observacoes = coalesce(observacoes || ' · ', '') ||
             format('198 (09/10): endereco antigo na Netlify morria em ~14/10; trocado por %s, conferido no '
                    'ar. Mapa em ops.netlify_destino.', r.destino),
           status = case when status = 'a_registrar' then 'ativo' else status end,
           updated_at = now()
     where deleted_at is null and valor ilike '%' || r.host || '%';

    update ops.apps set urls = replace(urls::text, r.host, replace(r.destino,'https://',''))::jsonb
     where urls::text ilike '%' || r.host || '%';
    update ops.contas_servicos set obs = replace(obs, r.host, replace(r.destino,'https://',''))
     where obs ilike '%' || r.host || '%';
  end loop;
end $$;

do $$
declare v_adef int; v_assets int; v_hist int;
begin
  -- a) nenhum host ficou sem destino
  select count(*) into v_adef from ops.netlify_destino where situacao = 'a_definir';
  if v_adef <> 0 then raise exception 'PROVA_198_FALHOU: sobraram % hosts a_definir', v_adef; end if;

  -- b) os dois destinos novos estão gravados, e com prova escrita
  if (select destino from ops.netlify_destino where host='pulsohub.netlify.app')
     <> 'https://pulsohub.vercel.app' then
    raise exception 'PROVA_198_FALHOU: pulsohub sem o destino da Vercel';
  end if;
  if (select destino from ops.netlify_destino where host='limelight-studio.netlify.app')
     <> 'https://limelight.digiai.app.br' then
    raise exception 'PROVA_198_FALHOU: limelight sem o destino novo';
  end if;
  if exists (select 1 from ops.netlify_destino
              where situacao = 'migrar' and (prova is null or prova not ilike '%curl%')) then
    raise exception 'PROVA_198_FALHOU: ha destino sem prova de medicao — e o que a 197 existe para impedir';
  end if;

  -- c) o invariante da 197 continua valendo: nenhum ativo vivo aponta para host que TEM destino
  select count(*) into v_assets from company.digital_assets a
   where a.deleted_at is null and a.valor ilike '%netlify.app%'
     and exists (select 1 from ops.netlify_destino d where d.destino is not null
                  and a.valor ilike '%' || d.host || '%');
  if v_assets <> 0 then
    raise exception 'PROVA_198_FALHOU: % ativos ainda apontam para netlify com destino', v_assets;
  end if;

  -- d) CONTROLE POSITIVO (R-043 §4-A): os que NÃO têm destino continuam lá, intocados. Se a conta zerasse,
  --    eu teria "resolvido" o aposentado e o morto junto, escondendo que eles morrem em 14/10.
  if (select count(*) from ops.netlify_destino where destino is null) < 3 then
    raise exception 'PROVA_198_FALHOU: os aposentados/mortos sairam do mapa — eles tambem morrem em 14/10';
  end if;

  -- e) história intacta, igual à 197
  select count(*) into v_hist from analytics.events_log where url ilike '%netlify.app%';
  if v_hist <> 257 then
    raise exception 'PROVA_198_FALHOU: events_log mudou (%) — mexi na historia', v_hist;
  end if;
end $$;

commit;
