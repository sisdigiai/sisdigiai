-- 165 — publicações por dia, plataforma e marca: a view que o Telão vai consumir
--
-- ✔ APLICADA em 30/09/2026 às 00:56:09 BRT, reensaiada antes. A prova de soma passou: a view fecha com o total
--   de mkt.publications. Último dia com publicação: 23/09.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Orquestrador Geral (30/09), para o digiai_telao. Contrato combinado: dia BRT, plataforma, marca,
--   publicações; `security_invoker` e GRANT na mesma migration.
--
-- DIA EM BRT, NÃO UTC: `published_at::date` em UTC joga tudo que saiu depois das 21h para o dia seguinte —
--   e a esteira do MKT publica à noite. O corte é `at time zone 'America/Sao_Paulo'`.
--
-- INVOKER, E O QUE ISSO CUSTA AO TELÃO (medido em 30/09, antes de escrever): `mkt.publications` tem RLS por
--   marca — `pode_ver_brand()` = é admin OU está mapeado àquela marca. O Telão manda o token da sessão quando
--   está logado e cai na chave anônima quando não está (`Authorization: Bearer ${sessao ?? anon}`, em
--   digiai_telao/src/lib/espelhos.ts). Logado com conta de staff, esta view devolve tudo. **No anônimo,
--   devolve zero.**
--   Mantive invoker de propósito (R-043). Se o painel ficar mudo numa tela sem login, o conserto é logar o
--   Telão — não transformar a view em dono nem dar grant a anon para compensar. Contagem de publicação por
--   marca é informação de operação da casa; quem decide abri-la à chave pública é o dono, por escrito.
--
-- SEM NADA DE PESSOA: só dia, plataforma, marca e contagem. Nenhuma url, nenhum id de post, nenhum autor.

begin;

do $$
begin
  if to_regclass('public.v_mkt_publicacoes_dias') is not null then
    raise exception 'v_mkt_publicacoes_dias ja existe — a 165 ja foi aplicada?';
  end if;
end $$;

create view public.v_mkt_publicacoes_dias
with (security_invoker = true) as
select (p.published_at at time zone 'America/Sao_Paulo')::date as dia,
       p.platform                                              as plataforma,
       b.code                                                  as marca,
       b.name                                                  as marca_nome,
       count(*)::int                                           as publicacoes
  from mkt.publications p
  left join mkt.brands b on b.id = p.brand_id
 where p.published_at is not null
 group by 1, 2, 3, 4;

revoke all on public.v_mkt_publicacoes_dias from public, anon;
grant select on public.v_mkt_publicacoes_dias to authenticated, service_role;

comment on view public.v_mkt_publicacoes_dias is
  '165: publicações do MKT por dia BRT, plataforma e marca, para o Telão. Invoker: herda a RLS por marca de '
  'mkt.publications — no anônimo devolve zero, e a correção é logar o Telão, não afrouxar a view.';

do $$
declare v_n int; v_dias int;
begin
  if has_table_privilege('anon', 'public.v_mkt_publicacoes_dias', 'select') then
    raise exception 'PROVA_165_FALHOU: anon lê a view';
  end if;
  if not has_table_privilege('authenticated', 'public.v_mkt_publicacoes_dias', 'select') then
    raise exception 'PROVA_165_FALHOU: authenticated nao tem grant — foi o erro da 158, nao repetir';
  end if;

  -- a view precisa ABRIR como authenticated (o quanto vem depende do JWT, que aqui não existe)
  begin
    set local role authenticated;
    perform 1 from public.v_mkt_publicacoes_dias limit 1;
    reset role;
  exception when insufficient_privilege then
    reset role;
    raise exception 'PROVA_165_FALHOU: authenticated apanha permission denied';
  end;

  -- e a soma tem de bater com a tabela: agrupar não pode perder publicação pelo caminho
  select coalesce(sum(publicacoes), 0), count(distinct dia) into v_n, v_dias
    from public.v_mkt_publicacoes_dias;
  if v_n <> (select count(*) from mkt.publications where published_at is not null) then
    raise exception 'PROVA_165_FALHOU: a view soma % e a tabela tem %', v_n,
      (select count(*) from mkt.publications where published_at is not null);
  end if;
  raise notice '165: % publicacoes em % dias', v_n, v_dias;
end $$;

commit;
