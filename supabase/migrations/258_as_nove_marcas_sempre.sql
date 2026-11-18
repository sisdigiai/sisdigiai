-- 258 · As nove marcas, sempre, nas três abas
--
-- O dono contou, 18/11 16h54: *"em marcas temos 9 marcas e em publicações temos somente 8, precisamos
-- parear tudo"*. Ele tem razão, e **a marca que faltava sumiu por decisão minha**: em 252 eu tirei da
-- view quem não tinha nada em nenhum dos três números, com o argumento de que "cartão que não diz nada
-- ocupa o lugar de um que diz". Era a Polá Petit — e tirá-la fez a tela **mentir por omissão**: quem
-- conta os cartões conclui que a casa tem oito marcas.
--
-- Some da tela é pior que aparecer vazia: a marca vazia **é** a informação, e agora ela aparece com o
-- motivo escrito. Quem decide se uma marca sai da lista é o dono, não um filtro meu.
--
-- A lista canónica passa a ser `mkt.brands` — as nove, nem mais nem menos. Isso também resolve um
-- ruído que vinha do outro lado: a Lousa traz duas grafias de "Mello Óticas", e a segunda entrava como
-- um décimo cartão sem nada.

begin;

drop view if exists public.v_mkt_estoque_marca;

create view public.v_mkt_estoque_marca with (security_invoker = true) as
with fila as (
  select marca,
         count(*) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())::int as na_fila,
         count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int                     as publicadas_7d,
         max(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())    as ultima_marcada
    from public.v_lousa group by 1
), biblioteca as (
  select b.code as marca, count(*)::int as artes_prontas
    from mkt.assets a join mkt.brands b on b.id = a.brand_id
   where a.status = 'a_postar' group by 1
)
select
  b.code                                                    as marca,
  b.name                                                    as marca_nome,
  b.accent_hex,
  b.logo_url,
  coalesce(f.na_fila, 0)                                    as na_fila,
  coalesce(bi.artes_prontas, 0)                             as artes_prontas,
  coalesce(f.publicadas_7d, 0)                              as publicadas_7d,
  round(coalesce(f.publicadas_7d, 0) / 7.0, 2)              as ritmo_medido,
  f.ultima_marcada,
  case when coalesce(f.publicadas_7d, 0) > 0 then 'medido' else null end as ritmo_de,
  greatest(0, ((f.ultima_marcada at time zone 'America/Sao_Paulo')::date
               - (now() at time zone 'America/Sao_Paulo')::date))::numeric as dias_marcados,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(coalesce(bi.artes_prontas, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end                                        as dias_biblioteca,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(greatest(0, ((f.ultima_marcada at time zone 'America/Sao_Paulo')::date
                               - (now() at time zone 'America/Sao_Paulo')::date))::numeric
                  + coalesce(bi.artes_prontas, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end                                        as dias_de_estoque,
  -- Para a tela poder escrever o motivo em vez de mostrar zero: esta marca tem alguma coisa em algum
  -- lugar da casa?
  (coalesce(f.na_fila,0) + coalesce(bi.artes_prontas,0) + coalesce(f.publicadas_7d,0)
   + (select count(*) from public.v_lousa l where l.marca = b.code)) > 0 as tem_movimento
from mkt.brands b
left join fila f on f.marca = b.code
left join biblioteca bi on bi.marca = b.code;

comment on view public.v_mkt_estoque_marca is
  'As marcas da casa (lista canonica: mkt.brands), com folego e estoque. Marca sem dado NAO e filtrada: '
  'some da tela e pior que aparecer vazia, e a tela escreve o motivo. `tem_movimento` diz se ha algo '
  'em algum lugar.';

grant select on public.v_mkt_estoque_marca to authenticated;

do $$
declare v_n int;
begin
  -- 1. São as nove, nem mais nem menos.
  select count(*) into v_n from public.v_mkt_estoque_marca;
  if v_n <> (select count(*) from mkt.brands) then
    raise exception 'PROVA 1 FALHOU: % cartões para % marcas', v_n, (select count(*) from mkt.brands);
  end if;

  -- 2. A que sumiu está de volta, e marcada como sem movimento.
  if not exists (select 1 from public.v_mkt_estoque_marca where marca = 'polapetit') then
    raise exception 'PROVA 2 FALHOU: a Polá Petit voltou a sumir';
  end if;
  if (select tem_movimento from public.v_mkt_estoque_marca where marca = 'polapetit') then
    raise exception 'PROVA 2 FALHOU: a Polá aparece com movimento que ela não tem';
  end if;

  -- 3. O Pulso tem movimento (140 linhas na Lousa) mesmo com zero no MKT — senão a tela diria dele o
  --    mesmo que diz da Polá, e são situações diferentes.
  if not (select tem_movimento from public.v_mkt_estoque_marca where marca = 'pulso') then
    raise exception 'PROVA 3 FALHOU: o Pulso aparece sem movimento, tendo fila na Lousa';
  end if;

  -- 4. Nenhuma grafia extra: a lista é a de mkt.brands.
  select count(*) into v_n from public.v_mkt_estoque_marca where marca not in (select code from mkt.brands);
  if v_n > 0 then raise exception 'PROVA 4 FALHOU: % marca(s) fora da lista canônica', v_n; end if;

  raise notice 'provas ok (% marcas)', (select count(*) from public.v_mkt_estoque_marca);
end $$;

commit;
