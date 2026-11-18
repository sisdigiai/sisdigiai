-- 254 · O controle por marca e por rede: publicado, pronto e nível
--
-- Pedido do dono em 18/11, 15h37, olhando a aba Publicações: "não temos os card com a ideia que
-- passei: publicado, pronto e em nível crítico, que seria ideal controlar tudo nesta aba".
--
-- Uma linha por marca e rede, com as três coisas que decidem:
--   · **publicado** — última saída e quantas em 7 dias;
--   · **pronto** — quantas marcadas à frente e até quando;
--   · **o que falhou hoje**, que é o único que pede ação na hora.
--
-- O NÍVEL NÃO MORA AQUI, de propósito. A view entrega os fatos; quem classifica é a tela, com o
-- critério escrito ao lado do número. Critério guardado no banco é critério que muda sem ninguém ver.
--
-- `security_invoker`, sem PII (R-043, R-044).

begin;

drop view if exists public.v_mkt_controle_marca_rede;

create view public.v_mkt_controle_marca_rede with (security_invoker = true) as
select
  marca,
  rede,
  count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int as publicadas_7d,
  count(*) filter (where estado = 'publicado'
                     and (quando at time zone 'America/Sao_Paulo')::date
                         = (now() at time zone 'America/Sao_Paulo')::date)::int            as publicadas_hoje,
  -- A hora REAL quando se sabe; a marcada quando não. Uma peça publicada ANTES do slot tem hora
  -- marcada no futuro e já saiu — é o caso "adiantada", e usar só `quando` poria a última saída no
  -- futuro. Há uma assim hoje: mello/instagram marcada para 19h e já publicada.
  max(coalesce(saiu_em, quando)) filter (where estado = 'publicado')                       as ultima_saida,
  count(*) filter (where estado in ('agendado','planejado','no_planner','rascunho')
                     and quando >= now())::int                                             as na_fila,
  min(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho')
                     and quando >= now())                                                  as proxima_saida,
  max(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho')
                     and quando >= now())                                                  as ultima_marcada,
  count(*) filter (where estado = 'falhou'
                     and (quando at time zone 'America/Sao_Paulo')::date
                         = (now() at time zone 'America/Sao_Paulo')::date)::int            as falhou_hoje
from public.v_lousa
where marca is not null and rede is not null
group by 1, 2;

comment on view public.v_mkt_controle_marca_rede is
  'Uma linha por marca e rede: o que ja saiu, o que esta marcado e o que falhou hoje. O NIVEL (ok, '
  'atencao, critico) nao e calculado aqui: a tela classifica, com o criterio escrito ao lado.';

grant select on public.v_mkt_controle_marca_rede to authenticated;

do $$
declare v_n int;
begin
  if has_table_privilege('anon', 'public.v_mkt_controle_marca_rede', 'select') then
    raise exception 'PROVA 1 FALHOU: anon lê o controle';
  end if;

  -- 2. O que está marcado nunca está no passado — isto é invariante por construção.
  --    (Já a última saída PODE estar no futuro: peça publicada antes do slot tem hora marcada à
  --    frente. A primeira versão desta prova tratava isso como erro e o ensaio pegou — era a prova
  --    que estava errada, não o dado.)
  select count(*) into v_n from public.v_mkt_controle_marca_rede where proxima_saida < now();
  if v_n > 0 then raise exception 'PROVA 2 FALHOU: % linha(s) marcadas no passado', v_n; end if;

  -- 3. O caso que o dono quer ver: rede que publicou e não tem próxima. Se um dia não existir, a
  --    prova falha e alguém relê — não quero descobrir que o alarme nunca aparece porque não há caso.
  select count(*) into v_n from public.v_mkt_controle_marca_rede
   where ultima_saida is not null and proxima_saida is null;
  if v_n = 0 then
    raise exception 'PROVA 3: nenhuma rede publicou sem ter proxima — confirme se o alarme ainda faz sentido';
  end if;

  raise notice 'provas ok (% redes publicaram sem proxima)', v_n;
end $$;

commit;
