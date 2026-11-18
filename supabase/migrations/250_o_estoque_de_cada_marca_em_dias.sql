-- 250 · O estoque de cada marca, em dias
--
-- O dono chamou isto de "coração da empresa": por marca, as redes e o que está pronto para publicar,
-- "e já apareceria a parte fila baixa". Fila baixa é estoque dividido por ritmo — e aí está a escolha
-- que esta view faz, escrita para ninguém a desfazer por engano:
--
-- O ritmo é o **MEDIDO**: o que de facto saiu nos últimos 7 dias, dividido por 7. A cadência
-- combinada vive noutra tabela e é nula para metade das marcas; o que saiu é sempre verdade e está
-- aqui ao lado, para quem ler poder conferir a conta.
--
-- Marca que não publicou nada em 7 dias fica com `dias_de_estoque` NULO — e nulo aqui é **"não dá
-- para saber"**, nunca "estoque infinito". Uma marca parada com 100 artes prontas não tem fôlego
-- eterno: não tem ritmo nenhum, e dividir por zero daria a resposta mais perigosa possível.
--
-- `security_invoker`, sem PII (R-043, R-044).

begin;

drop view if exists public.v_mkt_estoque_marca;

create view public.v_mkt_estoque_marca with (security_invoker = true) as
with prontos as (
  select brand_id, count(*)::int as n
    from mkt.assets where status = 'a_postar' group by 1
), saiu7 as (
  select brand_id, count(*)::int as n
    from mkt.publications
   where published_at is not null and published_at <= now()
     and published_at > now() - interval '7 days'
   group by 1
)
select
  b.code                                                        as marca,
  b.name                                                        as marca_nome,
  b.accent_hex,
  coalesce(pr.n, 0)                                             as prontos,
  coalesce(s7.n, 0)                                             as publicadas_7d,
  round(coalesce(s7.n, 0) / 7.0, 2)                             as ritmo_medido,
  case when coalesce(s7.n, 0) > 0 then 'medido' else null end    as ritmo_de,
  case when coalesce(s7.n, 0) > 0
       then round(coalesce(pr.n, 0) / (coalesce(s7.n, 0) / 7.0), 1)
       else null end                                             as dias_de_estoque
from mkt.brands b
left join prontos pr on pr.brand_id = b.id
left join saiu7  s7 on s7.brand_id = b.id;

comment on view public.v_mkt_estoque_marca is
  'Estoque pronto por marca e quantos dias ele dura, pelo ritmo MEDIDO dos ultimos 7 dias. '
  '`dias_de_estoque` nulo e "nao da para saber" (marca sem ritmo), nunca folego infinito.';

grant select on public.v_mkt_estoque_marca to authenticated;

do $$
declare v_n int;
begin
  if has_table_privilege('anon', 'public.v_mkt_estoque_marca', 'select') then
    raise exception 'PROVA 1 FALHOU: anon lê o estoque';
  end if;

  -- 2. Toda marca aparece, inclusive a que não tem nada pronto: some da tela é pior que aparecer zerada.
  select count(*) into v_n from mkt.brands;
  if (select count(*) from public.v_mkt_estoque_marca) <> v_n then
    raise exception 'PROVA 2 FALHOU: a view perdeu marcas pelo caminho';
  end if;

  -- 3. Marca sem ritmo nenhum NÃO ganha dias de estoque — nulo é "não dá para saber".
  select count(*) into v_n from public.v_mkt_estoque_marca
   where ritmo_de is null and dias_de_estoque is not null;
  if v_n > 0 then raise exception 'PROVA 3 FALHOU: % marca(s) com fôlego sem ritmo', v_n; end if;

  -- 4. O estoque é o que está PRONTO, não o total de artes: a conta de fila baixa depende disso.
  select count(*) into v_n from public.v_mkt_estoque_marca e
   join mkt.brands b on b.code = e.marca
   where e.prontos <> (select count(*) from mkt.assets a where a.brand_id = b.id and a.status = 'a_postar');
  if v_n > 0 then raise exception 'PROVA 4 FALHOU: % marca(s) com estoque que não é o pronto', v_n; end if;

  raise notice 'as 4 provas passaram';
end $$;

commit;
