-- 259 · `tem_movimento` deixa de ser uma subconsulta por linha
--
-- SINTOMA: a aba Marcas pedia seis colunas desta view e levava **HTTP 500**, enquanto a aba Publicações
-- pedia `*` da mesma view e funcionava. O cartão do Pulso continuava a dizer "sem post 7d" tendo 42 em
-- 7 dias, e o da Polá não ganhava o motivo — sem erro nenhum na tela, porque uma leitura que falha
-- devolve lista vazia e lista vazia parece "nada a dizer".
--
-- CAUSA: eu tinha escrito `tem_movimento` como `(select count(*) from public.v_lousa where marca = ...)`
-- — **uma subconsulta por marca**, dentro de uma view `security_invoker` sobre outra view que já é
-- cara. Sozinha aguenta; disparada junto com as outras dez consultas do carregamento da página,
-- estoura. A mesma pergunta já estava respondida pelo CTE que agrega a Lousa uma vez só.

begin;

drop view if exists public.v_mkt_estoque_marca;

create view public.v_mkt_estoque_marca with (security_invoker = true) as
with fila as (
  select marca,
         count(*)::int                                                                                               as linhas_lousa,
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
  -- mesma pergunta, sem subconsulta por linha: o CTE já agregou a Lousa uma vez
  (coalesce(f.linhas_lousa, 0) + coalesce(bi.artes_prontas, 0)) > 0 as tem_movimento
from mkt.brands b
left join fila f on f.marca = b.code
left join biblioteca bi on bi.marca = b.code;

comment on view public.v_mkt_estoque_marca is
  'As nove marcas da casa (lista canonica: mkt.brands), com folego, estoque e `tem_movimento`. Marca '
  'sem dado nao e filtrada: some da tela e pior que aparecer vazia.';

grant select on public.v_mkt_estoque_marca to authenticated;

do $$
declare v_n int;
begin
  select count(*) into v_n from public.v_mkt_estoque_marca;
  if v_n <> (select count(*) from mkt.brands) then
    raise exception 'PROVA 1 FALHOU: % cartões para % marcas', v_n, (select count(*) from mkt.brands);
  end if;
  if (select tem_movimento from public.v_mkt_estoque_marca where marca='polapetit') then
    raise exception 'PROVA 2 FALHOU: a Polá com movimento que não tem';
  end if;
  if not (select tem_movimento from public.v_mkt_estoque_marca where marca='pulso') then
    raise exception 'PROVA 3 FALHOU: o Pulso sem movimento, tendo 140 linhas na Lousa';
  end if;
  -- 4. A definição não pode voltar a ter subconsulta por linha sobre a Lousa.
  if pg_get_viewdef('public.v_mkt_estoque_marca'::regclass) ~ 'SELECT count\(\*\)[^;]*v_lousa l' then
    raise exception 'PROVA 4 FALHOU: voltou a subconsulta por linha';
  end if;
  raise notice 'provas ok';
end $$;

commit;
