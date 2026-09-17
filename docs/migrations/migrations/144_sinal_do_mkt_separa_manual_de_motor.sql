-- 144 — sinal do MKT na ordem do dia: cartão manual e job não confirmado não são "atraso do motor"
--
-- ✔ APLICADA em 17/09/2026 às 13:23:47 BRT, com a palavra do dono neste canal ("pode ter este filtro de separação"), reensaiada antes.
--   Medido depois: sinal de hoje: "Motor: 0 atrasado(s)... Fora do motor: 45 cartao(oes) manual(is)... e 1 vencido(s) sem confirmado".
--
-- (Escrita como NÃO APLICADA.)
-- ⛔ NÃO APLICADA. Pede a palavra do dono neste canal. (O Geral classificou como "correção de leitura de sinal, sem
--   palavra"; muda uma função do banco, então segue a regra de toda DDL: ensaio + palavra.)
--
-- DE ONDE VEM: a 1ª ordem do dia pela 141 (17/09 01:40) disse "MKT publicou 1 peca(s) em 24h · Fila: 43 atrasado(s)".
--   Resposta do MKT, repassada pelo Geral: são 42 cartões MANUAIS de WhatsApp Status (cron mkt-status-diario, 14 por marca,
--   02–15/09) que ninguém marcou como postados + 1 Instagram da Lancaster; sem mídia; fila pausada.
--
-- MEDIDO EM mkt.publish_jobs (17/09 ~01:5x BRT):
--   atrasado · whatsapp  · não confirmado · sem mídia · 42 (02–15/09)
--   atrasado · instagram · não confirmado · sem mídia ·  1 (10/09)
--   agendado · instagram,facebook · não confirmado · sem mídia · 119 (17/09 → 23/01/2027) — criados pela tela Ideias;
--     a partir de hoje 16:00 viram "vencidos" um por dia. O dono decide no canal do MKT se cancela.
--   agendado · whatsapp · não confirmado · 3 (16/09)
--   NENHUM job está confirmado. Nenhum tem account_id.
--
-- A REGRA NOVA (três contas separadas, e só a primeira é falha do motor):
--   • motor atrasado ....... status 'atrasado' OU ('agendado' e vencido), CONFIRMADO, e com alguma plataforma que não seja
--                            whatsapp — o motor tinha ordem e API para publicar e não publicou;
--   • cartão manual ........ plataformas só 'whatsapp' (Status não tem API): tarefa humana, não conta como atraso;
--   • não confirmado ....... qualquer outro job vencido sem confirmado: segurado por regra, o motor não publica sem o "confirmado".
--   O título só fala do motor. Manual e não confirmado vão no "porquê", com o número, para não sumirem.
--
-- NÃO MUDA: o que é publicação (mkt.publications), o título quando o MKT fica > 48h sem publicar, a fila do MKT.

begin;

do $$
begin
  if md5(pg_get_functiondef('public.fn_ordem_bloco_mkt(date)'::regprocedure)) <> 'f7272757de92295fc95d682ec86845e6' then
    raise exception 'fn_ordem_bloco_mkt mudou desde 17/09 — conferir antes.';
  end if;
end $$;

create or replace function public.fn_ordem_bloco_mkt(p_dia date)
returns table(titulo text, porque text)
language sql
stable security definer
set search_path to 'public', 'mkt'
as $function$
  with p as (
    select max(created_at) as ultima,
           count(*) filter (where created_at > now() - interval '24 hours') as d1,
           count(*) filter (where created_at > now() - interval '7 days')   as d7
      from mkt.publications
  ), vencidos as (
    select j.*,
           (j.platforms <@ array['whatsapp']::text[]) as so_manual
      from mkt.publish_jobs j
     where j.status = 'atrasado'
        or (j.status = 'agendado' and j.scheduled_for < now())
  ), f as (
    select count(*) filter (where confirmado and not so_manual)       as motor_atrasado,
           count(*) filter (where so_manual)                           as cartoes_manuais,
           count(*) filter (where not confirmado and not so_manual)    as nao_confirmados,
           (select count(*) from mkt.publish_jobs where status = 'erro') as erros
      from vencidos
  )
  select
    case
      when p.ultima is null or p.ultima < now() - interval '48 hours'
        then 'MKT sem publicar ha ' ||
             coalesce((extract(epoch from now() - p.ultima) / 3600)::int::text || 'h', 'muito tempo')
      when f.motor_atrasado > 0
        then 'MKT: ' || f.motor_atrasado || ' publicacao(oes) confirmada(s) atrasada(s) no motor'
      else 'MKT publicou ' || p.d1 || ' peca(s) em 24h'
    end,
    case
      when p.ultima is null or p.ultima < now() - interval '48 hours'
        then 'A esteira deveria publicar todo dia. Silencio prolongado ja aconteceu por falha muda '
             || '(fila travada em 2026-08-03, 11 dias parada). Conferir o painel de robos do MKT.'
      else p.d7 || ' na semana. Ultima em ' || to_char(p.ultima at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '. '
           || 'Motor: ' || f.motor_atrasado || ' atrasado(s), ' || f.erros || ' com erro. '
           || 'Fora do motor: ' || f.cartoes_manuais || ' cartao(oes) manual(is) de WhatsApp Status nao marcado(s) como postado(s) e '
           || f.nao_confirmados || ' vencido(s) sem "confirmado" (segurados por regra).'
    end
  from p, f;
$function$;

-- prova de comportamento, desfeita na hora
do $$
declare v_t text; v_p text; v_brand uuid := (select id from mkt.brands where code = 'osi');
begin
  begin
    select titulo, porque into v_t, v_p from public.fn_ordem_bloco_mkt((now() at time zone 'America/Sao_Paulo')::date);
    -- hoje não há job confirmado: o título não pode acusar atraso do motor
    if v_t like 'MKT: %atrasada(s) no motor' then
      raise exception 'PROVA_144_FALHOU: acusou atraso do motor sem job confirmado';
    end if;
    if v_p not like '%cartao(oes) manual(is)%' and v_t not like 'MKT sem publicar%' then
      raise exception 'PROVA_144_FALHOU: o porque nao separou os cartoes manuais';
    end if;

    -- um job confirmado de Instagram vencido = atraso do motor
    insert into mkt.publish_jobs (brand_id, platforms, status, confirmado, scheduled_for)
    values (v_brand, array['instagram'], 'agendado', true, now() - interval '2 hours');
    select titulo into v_t from public.fn_ordem_bloco_mkt((now() at time zone 'America/Sao_Paulo')::date);
    if v_t not like 'MKT: 1 publicacao(oes) confirmada(s) atrasada(s) no motor' and v_t not like 'MKT sem publicar%' then
      raise exception 'PROVA_144_FALHOU: job confirmado vencido nao virou atraso do motor (titulo: %)', v_t;
    end if;

    raise exception 'PROVA_144_OK';
  exception when others then
    if sqlerrm <> 'PROVA_144_OK' then raise; end if;
  end;
end $$;

commit;
