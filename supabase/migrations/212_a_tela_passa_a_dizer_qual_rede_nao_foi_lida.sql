-- 212 — a tela passa a dizer QUAL REDE não foi lida, em vez de eu afirmar isso numa frase fixa
--
-- ✔ APLICADA em 31/10/2026, ensaiada antes. Lido depois, semana 19/10: mello FB 14/0 "não medido",
--   digiai FB 3/0, osi FB 3/0, lancaster FB 2/2 com 0 views = "só engajamento", pessoal LinkedIn 2/0. A soma
--   por rede bate com a tabela de 211 (78 publicadas / 51 lidas). Tela: `src/modules/ComparativoMotores.tsx`.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Geral, 31/10, vindo do MKT: no Comparativo o Facebook deve aparecer como "não medido" por marca e
--   rede, nunca como zero. Motivo do MKT: a Meta recusa DIGIAI, OSI e Mello (erro #10, falta
--   `pages_read_engagement` no app da Meta — acesso avançado é pedido do dono) e a Lancaster mede só
--   engajamento, sem views. A leitura de volta do Facebook **não vem antes do placar de segunda e não tem
--   data**, logo isto não é espera: é estado que a tela tem de saber mostrar por tempo indefinido.
--
-- ═════ ONDE A 211 FICOU CURTA, e por que é defeito meu e não do pedido ═════
--   A 211 já impede o pior: as 14 publicações de Facebook do Mello entram em `publicacoes` e ficam fora de
--   `publicacoes_medidas`, então nenhum zero mentiroso aparece. Mas a view agrupa por marca, **não por
--   rede** — e eu tapei o buraco com uma FRASE FIXA no rodapé da tela: "hoje quase todo o Facebook é assim".
--   Isso é declaração minha dentro do código. No dia em que a Meta liberar, a frase continua lá, mentindo
--   com cara de dado. É exatamente a lição da 192 e da 193: distinção escondida em texto (ou em `case`)
--   envelhece calada. O número tem de dizer qual rede, e sozinho.
--
-- ═════ MEDIDO AGORA, semana 19/10 (19–25/10 BRT) — e são TRÊS estados, não dois ═════
--     marca      rede        publicadas   medidas   engaj. lidos   views lidas
--     mello      instagram           20        20             20            17
--     mello      facebook            14         0              0             0   ← não medido
--     lancaster  instagram           22        21             21            21
--     lancaster  facebook             2         2              2             0   ← só engajamento
--     digiai     instagram            6         4              4             2
--     digiai     facebook             3         0              0             0   ← não medido
--     osi        instagram            6         4              4             3
--     osi        facebook             3         0              0             0   ← não medido
--     pessoal    linkedin             2         0              0             0   ← não medido
--   Confere com o que o MKT descreveu, inclusive a Lancaster: **2 publicações lidas no Facebook e 0 views**.
--   Então "não medido" e "só engajamento" são estados DIFERENTES e já estão nos dados — tratar os dois como
--   um só jogaria no lixo a única cobertura de Facebook que existe hoje.
--
-- ═════ DESENHO ═════
--   View NOVA por rede, em vez de rede dentro da view de 211: plataforma é outra dimensão, e enfiá-la lá
--   multiplicaria as linhas da tabela principal (é a mesma razão de 193 ter duas views, esforço e
--   resultado). A de 211 continua sendo a tabela do placar; esta é o rodapé de cobertura.
--   R-043: nasce `security_invoker`, e `mkt.publications`/`brands`/`content_performance` têm política
--   `pode_ver_brand(brand_id)` — o recorte por marca continua sendo do banco. R-044: `public` recebe view.

begin;

do $$
begin
  if to_regclass('public.v_comparativo_cobertura_rede_semana') is not null then
    raise exception 'v_comparativo_cobertura_rede_semana ja existe — a 212 ja foi aplicada?';
  end if;
  if to_regclass('public.v_comparativo_motores_semana') is null then
    raise exception 'a view da 211 nao existe — aplicar a 211 antes';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='v_comparativo_motores_semana'
                    and column_name='publicacoes_medidas') then
    raise exception 'a 211 nao foi aplicada — esta view e o rodape dela';
  end if;
end $$;

create view public.v_comparativo_cobertura_rede_semana
  with (security_invoker = true) as
 select 'mkt'::text as motor,
    b.code      as marca,
    b.name      as marca_nome,
    p.platform  as rede,
    date_trunc('week', p.published_at at time zone 'America/Sao_Paulo')::date as semana,
    count(*)::int                                as publicacoes,
    count(cp.publication_id)::int                as publicacoes_medidas,
    count(cp.engajamento)::int                   as engajamento_lidos,
    count(cp.views_d7)::int                      as views_medidas,
    round(coalesce(sum(cp.engajamento), 0))::int as engajamento,
    sum(cp.views_d7)::int                        as views
   from mkt.publications p
   join mkt.brands b on b.id = p.brand_id
   left join mkt.content_performance cp on cp.publication_id = p.id
  where p.published_at >= (now() - '70 days'::interval)
  group by 1, 2, 3, 4, 5;

comment on view public.v_comparativo_cobertura_rede_semana is
  '212: COBERTURA DE LEITURA por motor × marca × REDE × semana (BRT), 70 dias — o rodapé da view de 211, que '
  'agrupa por marca e não sabe dizer qual rede ficou cega. Três estados, todos nos dados e nenhum igual a '
  'zero de resultado: `publicacoes_medidas = 0` é **não medido** (hoje o Facebook de mello/digiai/osi, que a '
  'Meta recusa com erro #10 por falta de `pages_read_engagement`, e o LinkedIn da pessoal); '
  '`publicacoes_medidas > 0` com `views_medidas = 0` é **só engajamento** (hoje o Facebook da lancaster); e o '
  'resto é medido. Existe porque a frase fixa no rodapé da tela ("quase todo o Facebook") é declaração minha '
  'dentro do código e continuaria mentindo no dia em que a Meta liberasse. Publicação não lida NÃO é '
  'publicação sem resultado.';

grant select on public.v_comparativo_cobertura_rede_semana to authenticated;
revoke all on public.v_comparativo_cobertura_rede_semana from anon;

do $$
declare r record; v_pub int; v_med int; v_vm int; v_a int; v_b int;
begin
  -- a) a semana 19/10 exatamente como eu medi antes de escrever, rede por rede
  for r in
    select * from (values
      ('mello','instagram',20,20,17), ('mello','facebook',14,0,0),
      ('lancaster','instagram',22,21,21), ('lancaster','facebook',2,2,0),
      ('digiai','instagram',6,4,2), ('digiai','facebook',3,0,0),
      ('osi','instagram',6,4,3), ('osi','facebook',3,0,0),
      ('pessoal','linkedin',2,0,0)) as e(marca, rede, pub, med, vm)
  loop
    select publicacoes, publicacoes_medidas, views_medidas into v_pub, v_med, v_vm
      from public.v_comparativo_cobertura_rede_semana
     where semana = date '2026-10-19' and marca = r.marca and rede = r.rede;
    if coalesce(v_pub,-1) <> r.pub or coalesce(v_med,-1) <> r.med or coalesce(v_vm,-1) <> r.vm then
      raise exception 'PROVA_212_FALHOU: %/% deu %/%/% e eu medi %/%/%',
        r.marca, r.rede, coalesce(v_pub,-1), coalesce(v_med,-1), coalesce(v_vm,-1), r.pub, r.med, r.vm;
    end if;
  end loop;

  -- b) a soma por rede tem de bater com a view de 211 na mesma semana: se o rodape contradiz a tabela de
  --    cima, o rodape e pior que nada (R-049 — o de cima bate com o de baixo).
  select coalesce(sum(publicacoes),0), coalesce(sum(publicacoes_medidas),0) into v_a, v_b
    from public.v_comparativo_cobertura_rede_semana where semana = date '2026-10-19';
  select coalesce(sum(publicacoes),0), coalesce(sum(publicacoes_medidas),0) into v_pub, v_med
    from public.v_comparativo_motores_semana where semana = date '2026-10-19';
  if v_a <> v_pub or v_b <> v_med then
    raise exception 'PROVA_212_FALHOU: por rede da %/% e a tabela da %/%', v_a, v_b, v_pub, v_med;
  end if;

  -- c) OS TRES ESTADOS EXISTEM. Sem isto, eu poderia estar entregando um rodape que rotula tudo igual —
  --    e o "so engajamento" da lancaster e a unica leitura de Facebook que a casa tem hoje.
  if not exists (select 1 from public.v_comparativo_cobertura_rede_semana
                  where publicacoes > 0 and publicacoes_medidas = 0) then
    raise exception 'PROVA_212_FALHOU: nenhuma rede "nao medida" — o rodape nao separa nada';
  end if;
  if not exists (select 1 from public.v_comparativo_cobertura_rede_semana
                  where publicacoes_medidas > 0 and views_medidas = 0) then
    raise exception 'PROVA_212_FALHOU: nenhuma rede "so engajamento" — a lancaster era esse caso';
  end if;
  if not exists (select 1 from public.v_comparativo_cobertura_rede_semana
                  where views_medidas > 0) then
    raise exception 'PROVA_212_FALHOU: nenhuma rede medida por inteiro';
  end if;

  -- d) CONTROLE NEGATIVO: rede nao lida nao pode aparecer com engajamento. Se um coalesce distraido
  --    somasse zero e a tela lesse "0 de engajamento", voltaria o erro da loja fechada contada como aberta.
  if exists (select 1 from public.v_comparativo_cobertura_rede_semana
              where publicacoes_medidas = 0 and (engajamento_lidos > 0 or views_medidas > 0 or views is not null)) then
    raise exception 'PROVA_212_FALHOU: rede sem leitura apareceu com numero lido';
  end if;

  -- e) invoker na definição (R-043 §4-B) e fora do anon
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_comparativo_cobertura_rede_semana'
                    and (select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                          where split_part(o,'=',1)='security_invoker') in ('true','on')) then
    raise exception 'PROVA_212_FALHOU: a view nasceu dona';
  end if;
  if pg_catalog.has_table_privilege('anon','public.v_comparativo_cobertura_rede_semana','select') then
    raise exception 'PROVA_212_FALHOU: abri a view para anon';
  end if;
  if not pg_catalog.has_table_privilege('authenticated','public.v_comparativo_cobertura_rede_semana','select') then
    raise exception 'PROVA_212_FALHOU: authenticated nao le a view';
  end if;
end $$;

-- f) CUSTO pelo papel e pela identidade de verdade — `pode_ver_brand(brand_id)` leva argumento e e avaliada
--    linha a linha (foi assim que a tela do Google estourou o timeout do dono em 30/10).
do $$
declare v_linhas int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"2956f8d9-f161-4333-a962-96eab02600fe","role":"authenticated"}';
  set local statement_timeout = '3s';
  select count(*) into v_linhas from public.v_comparativo_cobertura_rede_semana;
  reset role;
  if v_linhas < 1 then
    raise exception 'PROVA_212_FALHOU: authenticated leu 0 linhas — o portao fechou o rodape';
  end if;
end $$;

commit;
