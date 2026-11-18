-- 248 · A pontualidade, das duas fontes, num lugar só
--
-- POR QUÊ: o dono pediu para conferir "saiu no horário o vídeo". A hora marcada e a hora real existem
-- em dois sítios diferentes — no MKT, em `mkt.publish_jobs.scheduled_for` contra
-- `mkt.publications.published_at`; nas peças de fora, em `ops.lousa_peca.quando` contra `saiu_em`.
-- Deixar a tela juntar isso seria pôr a mesma regra em dois lugares, e regra repetida é regra que um
-- dia diverge.
--
-- AS REGRAS DA CASA, escritas aqui uma vez (desenho de 18/11, aprovado):
--   · **as DUAS horas são obrigatórias.** Peça sem hora marcada não é pontual nem atrasada — não
--     entra. Contar o silêncio como acerto inflaria a pontualidade com o que ninguém mediu.
--   · **janela de dois lados: ±15 min.** A primeira versão da regra era `real <= marcada + 15min`, que
--     dava "no horário" a QUALQUER adiantamento — e nos dados reais havia peça 22 horas adiantada.
--     Quem sai um dia antes não cumpriu a agenda; cumpriu outra coisa.
--   · **atrasado nunca soma com falhado.** Aqui só entra o que SAIU; o que não saiu é outra conta.
--   · **o dia é BRT.**
--
-- `security_invoker`, sem PII: conta é identificador público de rede (R-043, R-044).

begin;

drop view if exists public.v_pontualidade;

create view public.v_pontualidade with (security_invoker = true) as
with mkt as (
  select
    'mkt'::text                                as origem,
    'mkt'::text                                as publicador,
    lower(coalesce(b.code, 'sem marca'))       as marca,
    lower(coalesce(p.platform, 'sem rede'))    as rede,
    j.scheduled_for                            as marcada,
    p.published_at                             as real_,
    'motor'::text                              as saiu_por
  from mkt.publications p
  join mkt.publish_jobs j on j.id = p.job_id
  left join mkt.brands b on b.id = p.brand_id
  where j.scheduled_for is not null
    and p.published_at is not null
    and p.published_at <= now()
), fora as (
  select origem, publicador, marca, rede, quando as marcada, saiu_em as real_, saiu_por
    from ops.lousa_peca
   where estado = 'publicado' and quando is not null and saiu_em is not null and saiu_em <= now()
), tudo as (
  select * from mkt union all select * from fora
)
select
  origem, publicador, marca, rede, saiu_por,
  marcada, real_ as saiu_em,
  (marcada at time zone 'America/Sao_Paulo')::date                         as dia,
  round(extract(epoch from (real_ - marcada)) / 60.0)::int                 as minutos,
  case
    when abs(extract(epoch from (real_ - marcada))) <= 900 then 'no horario'
    when real_ > marcada                                   then 'atrasada'
    else                                                        'adiantada'
  end                                                                      as pontualidade
from tudo;

comment on view public.v_pontualidade is
  'Peças que SAÍRAM, com a hora marcada e a hora real, das duas fontes. Só entra o que tem as duas '
  'horas: sem hora marcada não é pontual nem atrasada. Janela de 15 min para os dois lados.';

grant select on public.v_pontualidade to authenticated;

do $$
declare v_n int; v_mkt int; v_fora int;
begin
  if has_table_privilege('anon', 'public.v_pontualidade', 'select') then
    raise exception 'PROVA 1 FALHOU: anon lê a pontualidade';
  end if;

  -- 2. Nada sem as duas horas, e nada no futuro.
  select count(*) into v_n from public.v_pontualidade
   where marcada is null or saiu_em is null or saiu_em > now();
  if v_n > 0 then raise exception 'PROVA 2 FALHOU: % linha(s) sem as duas horas ou no futuro', v_n; end if;

  -- 3. A janela é de DOIS lados: nada classificado "no horario" pode estar fora de ±15 min, e nada
  --    adiantado além da janela pode aparecer como pontual (o defeito da primeira regra).
  select count(*) into v_n from public.v_pontualidade
   where (pontualidade = 'no horario' and abs(minutos) > 15)
      or (pontualidade = 'adiantada'  and minutos >= -15)
      or (pontualidade = 'atrasada'   and minutos <= 15);
  if v_n > 0 then raise exception 'PROVA 3 FALHOU: % linha(s) classificadas contra a regra', v_n; end if;

  -- 4. As duas fontes entram mesmo — se uma secar, a tela mostraria metade da casa sem avisar.
  select count(*) into v_mkt  from public.v_pontualidade where origem = 'mkt';
  select count(*) into v_fora from public.v_pontualidade where origem <> 'mkt';
  if v_mkt = 0 or v_fora = 0 then
    raise exception 'PROVA 4 FALHOU: mkt=% fora=%, uma das fontes não entrou', v_mkt, v_fora;
  end if;

  raise notice 'as 4 provas passaram (mkt %, fora %)', v_mkt, v_fora;
end $$;

commit;
