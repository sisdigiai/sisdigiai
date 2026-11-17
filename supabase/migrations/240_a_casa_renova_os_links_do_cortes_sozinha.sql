-- 240 · A casa renova os links de vídeo do Cortes sozinha, sem depender de máquina ligada
--
-- O RISCO, com data: os 85 links do ECO01 foram assinados em 17/11 às 17h54 e valem 7 dias — vencem
-- **24/11 às 17h54**. O robô do MKT já agendou 84 peças, de 23/11 a 08/12, e só baixa o vídeo na hora
-- de publicar. Sem renovação, o longo de 24/11 às 20h30 e **tudo de 24/11 em diante sai com "sem
-- mídia"**. A renovação existia desde as 17h08, mas só quando alguém chamava a ação `links` — e quem
-- chamaria é o motor, que roda na máquina do dono e está com a rodada agendada desligada.
--
-- Eu próprio escrevi, na função, que link vencendo sem ninguém ver "deixa o robô sem vídeo e ninguém
-- vê, porque não há erro: há um vídeo que não abre". E deixei a renovação dependendo de alguém chamar.
-- A arbitragem do Orquestrador está certa: **renovação é do servidor, não de máquina ligada.**
--
-- COMO, sem segredo novo e sem ninguém digitar nada: o padrão que a casa já usa (jobid 123) — o cron
-- lê a chave do Vault e chama a função. A `cortes-gravar` passa a aceitar a chave de serviço **só para
-- a ação `links`**, que não tem entrada nenhuma do chamador. Isso não alarga poder: quem tem a chave de
-- serviço já escreve no banco inteiro; o que muda é não precisar de assinatura para uma renovação.
--
-- O motor continua chamando `links` quando rodar. Os dois juntos, como pediu o Orquestrador.

begin;

-- 1. Peça já publicada sai da fila de renovação: o vídeo dela já foi buscado, e reassinar 85 links por
--    dia para sempre gastaria trabalho e depósito à toa. Com `codigo`, nada muda — ali o motor pede
--    todas as do episódio de propósito.
create or replace function public.cortes_pecas_para_assinar(p_codigo text default null, p_horas int default 48)
returns jsonb
language plpgsql
security definer
set search_path = public, cortes, pg_temp
as $$
declare v jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'cortes_pecas_para_assinar: só a borda da casa' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'caminhos', x.caminhos)), '[]'::jsonb)
    into v
    from (
      select p.id,
             array(select distinct c
                     from unnest(array_remove(array[p.arquivo] || p.arquivos, null)) c
                    where c <> '') as caminhos
        from cortes.pecas p
        join cortes.episodios e on e.id = p.episodio_id
       where (p_codigo is null or e.codigo = p_codigo)
         and (p.arquivo is not null or coalesce(array_length(p.arquivos, 1), 0) > 0)
         and (p_codigo is not null
              or (p.status <> 'publicado'
                  and (p.url_expira is null
                       or p.url_expira < now() + make_interval(hours => greatest(p_horas, 1)))))
       order by p.criado_em
       limit 500
    ) x
   where coalesce(array_length(x.caminhos, 1), 0) > 0;

  return v;
end;
$$;

revoke all on function public.cortes_pecas_para_assinar(text, int) from public, anon, authenticated;
grant execute on function public.cortes_pecas_para_assinar(text, int) to service_role;

-- 2. A rodada diária. 09h BRT (12h UTC), janela de 72h: mesmo que dois dias seguidos falhem, nada
--    vence antes da terceira tentativa. Chave lida do Vault, como o jobid 123 da casa — ninguém digita.
select cron.schedule(
  'cortes-renova-links-diario',
  '0 12 * * *',
  $cron$
  select net.http_post(
    url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/cortes-gravar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'mkt_service_key'
      )
    ),
    body := '{"acao":"links","horas":72}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

-- ---------------------------------------------------------------------------------------------------
-- PROVAS
-- ---------------------------------------------------------------------------------------------------
do $$
declare v_n int; v_job record; v_ep uuid; v_peca uuid; v_lista jsonb; v_antes int;
begin
  select count(*) into v_antes from cortes.pecas;

  -- 1. A rodada existe, está ativa e no horário certo.
  select * into v_job from cron.job where jobname = 'cortes-renova-links-diario';
  if not found or not v_job.active or v_job.schedule <> '0 12 * * *' then
    raise exception 'PROVA 1 FALHOU: a rodada diária não ficou de pé';
  end if;

  -- 2. O comando não carrega segredo escrito: lê do Vault.
  if v_job.command not like '%vault.decrypted_secrets%' or v_job.command like '%eyJhbGciOiJI%' then
    raise exception 'PROVA 2 FALHOU: o comando do cron tem chave escrita dentro';
  end if;

  -- 3. A chave que o cron vai ler existe mesmo. Rodada que lê segredo vazio manda `Bearer ` e leva 401
  --    em silêncio, todos os dias, sem ninguém ver.
  if not exists (select 1 from vault.decrypted_secrets
                  where name = 'mkt_service_key' and length(decrypted_secret) > 100) then
    raise exception 'PROVA 3 FALHOU: mkt_service_key não está no Vault, ou está vazia';
  end if;

  -- 4. Peça publicada não entra na renovação em massa; a mesma peça entra quando pedida por episódio.
  insert into cortes.episodios (codigo, serie, numero, titulo)
  values ('_PROVA_240_', 'prova', 0, 'prova da 240, apagada aqui mesmo') returning id into v_ep;
  insert into cortes.pecas (episodio_id, tipo, destino, rede, titulo, legenda, status, arquivo, url_expira)
  values (v_ep, 'corte', 'bastidores', 'youtube', 'já publicada', '', 'publicado', 'a/um.mp4', now())
  returning id into v_peca;

  v_lista := public.cortes_pecas_para_assinar(null, 72);
  if exists (select 1 from jsonb_array_elements(v_lista) e where (e ->> 'id')::uuid = v_peca) then
    raise exception 'PROVA 4 FALHOU: peça já publicada entrou na renovação diária';
  end if;
  v_lista := public.cortes_pecas_para_assinar('_PROVA_240_');
  if not exists (select 1 from jsonb_array_elements(v_lista) e where (e ->> 'id')::uuid = v_peca) then
    raise exception 'PROVA 4 FALHOU: peça pedida por episódio deixou de vir';
  end if;

  -- 5. Peça não publicada e a vencer continua entrando.
  update cortes.pecas set status = 'agendado' where id = v_peca;
  v_lista := public.cortes_pecas_para_assinar(null, 72);
  if not exists (select 1 from jsonb_array_elements(v_lista) e where (e ->> 'id')::uuid = v_peca) then
    raise exception 'PROVA 5 FALHOU: peça agendada a vencer não entrou na renovação';
  end if;

  delete from cortes.pecas where episodio_id = v_ep;
  delete from cortes.episodios where id = v_ep;

  select count(*) into v_n from cortes.pecas;
  if v_antes <> v_n then
    raise exception 'PROVA FINAL FALHOU: as peças do ECO01 mudaram de número (% para %)', v_antes, v_n;
  end if;

  raise notice 'as 5 provas passaram; peças do ECO01 intactas: %', v_n;
end $$;

commit;
