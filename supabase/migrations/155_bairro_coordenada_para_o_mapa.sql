-- 155 — as óticas sem coordenada entram no mapa pelo CENTRO DO BAIRRO, marcadas como aproximadas
--
-- ✔ APLICADA em 24/09/2026 às 00:43:58 BRT, com a palavra do dono neste canal ("sim, marcando as aproximadas"),
--   reensaiada antes. Medido depois, com o script rodado: 89 bairros com centro · 687 medidas + 196 aproximadas +
--   63 ainda fora = 946, a conta do MKT fecha. 19 centros vieram na cidade errada ("Santana" a 426 km, "Pompeia"
--   a 401 km — nome de bairro que também é nome de cidade): apagados, e o script ganhou trava de 30 km do miolo
--   da cidade, que descarta em vez de chutar.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE NÃO PELO CEP (medido em 24/09, antes de escrever isto): a pergunta do dono era CEP. Testei o serviço
--   público de CEP com 6 dos nossos: em São Paulo capital ele devolve SEMPRE o mesmo ponto — o centro da cidade —
--   para Jardim Capela, Vila Perus, Penha de França e Recanto Campo Belo. Só cidade pequena (Arujá) vem com rua.
--   Posicionar por CEP empilharia centenas de óticas no centro da capital e criaria uma mancha quente que não existe.
--   Por isso a posição aproximada é o CENTRO DO BAIRRO, que também é a granularidade em que se decide raspagem.
--
-- O QUE CRIA:
--   ops.bairro_coordenada        — centro de cada bairro (cidade/uf), com a fonte e a data. Preenchida uma vez pelo
--                                  script digiai/scripts/geocodificar-bairros.mjs (Nominatim/OpenStreetMap, 1 req/s).
--   public.v_ops_cobertura_aproximada — quantas óticas de cada bairro NÃO têm coordenada, e onde fica o centro dele.
--
-- COMO SE SABE QUEM FALTA, sem pedir nada ao MKT: v_mkt_cobertura_geografica tem o total por bairro (946) e
--   v_mkt_cobertura_pontos tem só quem tem coordenada (687). A diferença por bairro é o que falta (253).
--
-- A TELA NÃO MISTURA: ponto medido e ponto aproximado são desenhados diferente e contados em quadros separados.
--   Precisão inventada é pior que buraco no mapa — o buraco a gente vê; a precisão falsa, não.

begin;

do $$
begin
  if to_regclass('ops.bairro_coordenada') is not null then
    raise exception 'ops.bairro_coordenada ja existe — a 155 ja foi aplicada?';
  end if;
end $$;

create table ops.bairro_coordenada (
  uf         text not null,
  cidade     text not null,
  bairro     text not null,
  lat        numeric(9,6) not null,
  lng        numeric(9,6) not null,
  fonte      text not null default 'nominatim/openstreetmap',
  obtido_em  timestamptz not null default now(),
  primary key (uf, cidade, bairro)
);
comment on table ops.bairro_coordenada is
  '155: centro do bairro para posicionar no mapa o que a raspagem trouxe sem coordenada. Aproximação declarada, nunca apresentada como medição.';
alter table ops.bairro_coordenada enable row level security;
revoke all on ops.bairro_coordenada from anon;
grant select on ops.bairro_coordenada to authenticated;

create function ops.fn_registrar_bairro_coordenada(p jsonb)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into ops.bairro_coordenada (uf, cidade, bairro, lat, lng, fonte)
  select x->>'uf', x->>'cidade', x->>'bairro', (x->>'lat')::numeric, (x->>'lng')::numeric,
         coalesce(x->>'fonte', 'nominatim/openstreetmap')
    from jsonb_array_elements(p) x
  on conflict (uf, cidade, bairro) do update
     set lat = excluded.lat, lng = excluded.lng, fonte = excluded.fonte, obtido_em = now()
  returning 1;
$$;
revoke all on function ops.fn_registrar_bairro_coordenada(jsonb) from public, anon, authenticated;
grant execute on function ops.fn_registrar_bairro_coordenada(jsonb) to service_role;

create view public.v_ops_cobertura_aproximada as
with total as (
  select uf, cidade, coalesce(bairro, '—') bairro, sum(oticas) oticas
    from public.v_mkt_cobertura_geografica group by 1, 2, 3
), com_coordenada as (
  select uf, cidade, coalesce(bairro, '—') bairro, sum(oticas) oticas
    from public.v_mkt_cobertura_pontos group by 1, 2, 3
)
select t.uf, t.cidade, t.bairro,
       (t.oticas - coalesce(c.oticas, 0))::int as oticas_sem_coordenada,
       b.lat, b.lng, b.fonte, b.obtido_em
  from total t
  left join com_coordenada c on c.uf = t.uf and c.cidade = t.cidade and c.bairro = t.bairro
  left join ops.bairro_coordenada b on b.uf = t.uf and b.cidade = t.cidade and b.bairro = t.bairro
 where t.oticas - coalesce(c.oticas, 0) > 0;

revoke all on public.v_ops_cobertura_aproximada from public, anon;
grant select on public.v_ops_cobertura_aproximada to authenticated, service_role;
comment on view public.v_ops_cobertura_aproximada is
  '155: por bairro, quantas óticas ficaram sem coordenada (total do MKT − pontos com coordenada) e o centro do bairro, quando já geocodificado.';

do $$
declare v_falta int; v_soma int;
begin
  if has_table_privilege('anon', 'ops.bairro_coordenada', 'select')
  or has_table_privilege('anon', 'public.v_ops_cobertura_aproximada', 'select')
  or has_function_privilege('authenticated', 'ops.fn_registrar_bairro_coordenada(jsonb)', 'execute') then
    raise exception 'anon/authenticated com acesso indevido.';
  end if;

  -- a conta tem de fechar com o que o MKT publicou: 946 na base = 687 com coordenada + o que sobra aqui + 6 sem ficha
  select coalesce(sum(oticas_sem_coordenada), 0) into v_falta from public.v_ops_cobertura_aproximada;
  select (select coalesce(sum(oticas), 0) from public.v_mkt_cobertura_geografica)
       - (select coalesce(sum(oticas), 0) from public.v_mkt_cobertura_pontos) into v_soma;
  if v_falta <> v_soma then
    raise exception 'PROVA_155_FALHOU: a diferenca por bairro (%) nao bate com a diferenca total (%)', v_falta, v_soma;
  end if;

  begin
    perform ops.fn_registrar_bairro_coordenada(
      '[{"uf":"SP","cidade":"Prova 155","bairro":"Centro","lat":-23.5,"lng":-46.6}]'::jsonb);
    if (select count(*) from ops.bairro_coordenada where cidade = 'Prova 155') <> 1 then
      raise exception 'PROVA_155_FALHOU: nao gravou o centro do bairro';
    end if;
    raise exception 'PROVA_155_OK';
  exception when others then
    if sqlerrm <> 'PROVA_155_OK' then raise; end if;
  end;
end $$;

commit;
