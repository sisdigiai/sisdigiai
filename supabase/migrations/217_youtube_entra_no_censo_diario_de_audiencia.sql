-- 217 — O YouTube entra no censo diário de audiência (pedido do dono em 06/11/2026).
--
-- POR QUE: o dono perguntou se a casa recebia dado de todas as redes. Medido: só Instagram, Facebook,
-- Google Business e Search Console. YouTube, TikTok, Pinterest e LinkedIn tinham ZERO número — e o
-- YouTube era o único dos quatro que a casa já podia ler sozinha (refresh_token no Vault em 2 de 5
-- canais + YOUTUBE_CLIENT_ID/SECRET já como segredo do projeto). Ele escolheu ligar por API.
--
-- O QUE FALTAVA PARA "LIGADO" SIGNIFICAR ALGO: a função `youtube-metrics-sync` já está no ar e já
-- gravou o retrato de hoje, mas leitura que roda uma vez não é coleta — é foto. Sem o agendamento, o
-- número de amanhã seria o de hoje e a tela mostraria série parada como se fosse audiência parada.
--
-- HORÁRIO: 10:00 UTC = 07:00 BRT, junto do censo diário que a tela anuncia ("CENSO DIÁRIO 7H"). O dia
-- gravado é calculado em São Paulo DENTRO da função, não aqui — cron em UTC e dia do negócio em BRT são
-- coisas diferentes, e misturar as duas é como a tela amanhece vazia.
--
-- O QUE ESTE AGENDAMENTO NÃO FAZ: canal sem credencial não gera linha (a função recusa de propósito), e
-- por isso o censo nunca vai escrever "0 seguidores" por falta de token. Zero na tela é zero medido.

do $$
declare
  v_job_id bigint;
begin
  -- Idempotente: se o job já existe (re-execução da migration), desmarca antes de recriar, para não
  -- ficar com dois agendamentos chamando a mesma função no mesmo minuto.
  perform cron.unschedule('digiai-youtube-audiencia-diaria')
    where exists (select 1 from cron.job where jobname = 'digiai-youtube-audiencia-diaria');

  select cron.schedule(
    'digiai-youtube-audiencia-diaria',
    '0 10 * * *',
    $cmd$
    select net.http_post(
      url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/youtube-metrics-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
    $cmd$
  ) into v_job_id;

  if v_job_id is null then
    raise exception 'PROVA_217_FALHOU: cron.schedule nao devolveu jobid';
  end if;
end $$;

-- PROVA 1 — o job existe, está ativo e no horário combinado.
do $$
declare r record;
begin
  select schedule, active, command into r from cron.job where jobname = 'digiai-youtube-audiencia-diaria';
  if r is null then
    raise exception 'PROVA_217_FALHOU: job digiai-youtube-audiencia-diaria nao existe';
  end if;
  if r.schedule <> '0 10 * * *' or not r.active then
    raise exception 'PROVA_217_FALHOU: job com schedule % e active % (esperado 0 10 * * * e true)', r.schedule, r.active;
  end if;
  -- Job que não carrega Authorization bate na porta e volta 401 todos os dias, calado. A prova olha o
  -- comando, não só a existência: agendamento que não autentica não é coleta, é ruído no log.
  if r.command not like '%youtube-metrics-sync%' or r.command not like '%Authorization%' then
    raise exception 'PROVA_217_FALHOU: comando do job nao chama youtube-metrics-sync com Authorization';
  end if;
end $$;

-- PROVA 2 — existe exatamente UM agendamento para esta função. Dois jobs na mesma função gravariam duas
-- vezes no mesmo dia; a função tem guarda de uma linha por (conta, dia), mas duplicar a chamada gastaria
-- quota da API do YouTube de graça e esconderia o erro do segundo job.
do $$
declare n int;
begin
  select count(*) into n from cron.job where command like '%youtube-metrics-sync%';
  if n <> 1 then
    raise exception 'PROVA_217_FALHOU: % agendamento(s) chamando youtube-metrics-sync (esperado 1)', n;
  end if;
end $$;
