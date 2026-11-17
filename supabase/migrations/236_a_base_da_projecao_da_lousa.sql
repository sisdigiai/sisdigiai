-- 236 · A base da projeção da Lousa (etapa 1b)
--
-- O QUE ELA RESPONDE: para uma peça que ainda vai sair, o que a história daquela conta, naquela rede,
-- naquele formato, diz que costuma acontecer.
--
-- POR QUE UMA VIEW E NÃO CONTA NA TELA: porque o critério tem de existir UMA vez. Eu e o Orquestrador
-- medimos o mesmo número hoje e demos valores diferentes (31 e 28) — era a janela de 4 semanas andando
-- com a hora. Dois números para a mesma coisa é pior que nenhum, então o critério mora aqui, escrito,
-- e quem lê a tela lê o mesmo que quem consulta o banco.
--
-- AS QUATRO TRAVAS, três do Orquestrador e uma minha, todas medidas antes de escrever:
--
--  1. **Mediana e faixa, nunca média.** Medido em 17/11: no grupo instagram/post a mediana é 119 e o
--     melhor post é 3.279. Uma peça fora da curva move a média e não move a mediana — e a média faria a
--     tela prometer, para a próxima peça, um número que quase nenhuma peça alcançou.
--
--  2. **O tamanho da base vai junto, e com menos de 4 peças não há base.** Número sem denominador é
--     palpite com cara de medição.
--
--  3. **Grupo cuja história é toda zero NÃO é base.** Medido: facebook/reel tem 37 peças, 37 com o
--     campo `views` preenchido, **todas em zero**, e nenhuma com compartilhamento. Isso é coleta vazia,
--     não peça que não rendeu. Sem esta trava a tela diria "previsto 0 views" para o Facebook — que o
--     dono leria como "vai fracassar" quando a verdade é "não medimos esta rede".
--
--  4. **Conta sem nome não entra.** Medido: 199 linhas da view de analytics têm `conta` nula, e são
--     justamente as de história mais rica (instagram/post com 111 peças, mediana 119). Elas não se ligam
--     a agenda nenhuma; entrar como grupo anônimo faria a projeção parecer existir onde ela não existe.
--     Avisado ao MKT no mesmo dia — o conserto é lá.
--
-- `security_invoker`: quem lê a base é a mesma pessoa que lê a Lousa, com as permissões dela (R-043).

begin;

drop view if exists public.v_lousa_base;

create view public.v_lousa_base with (security_invoker = true) as
with peca as (
  -- Uma peça conta uma vez, pela maior leitura dela no período: a view de analytics traz uma linha por
  -- dia, e somar os dias contaria a mesma peça várias vezes.
  select conta, rede, tipo, peca_ref, max(views) as v
    from public.v_mkt_analytics_peca_dia
   where data >= (now() at time zone 'America/Sao_Paulo')::date - 28
     and views is not null
     and conta is not null
   group by 1, 2, 3, 4
)
select
  conta,
  rede,
  tipo,
  count(*)::int                                                        as pecas,
  round(percentile_cont(0.5)  within group (order by v))::int          as mediana,
  round(percentile_cont(0.25) within group (order by v))::int          as p25,
  round(percentile_cont(0.75) within group (order by v))::int          as p75,
  max(v)::int                                                          as maior,
  (count(*) >= 4 and max(v) > 0)                                       as serve_de_base,
  (now() at time zone 'America/Sao_Paulo')::date - 28                  as desde
from peca
group by 1, 2, 3;

comment on view public.v_lousa_base is
  'História de 28 dias por conta/rede/tipo, para a projeção da Lousa. Mediana e faixa p25-p75, nunca '
  'média. `serve_de_base` é o critério único da casa: 4 peças ou mais E pelo menos uma leitura maior '
  'que zero. Grupo todo em zero é coleta vazia (facebook), não desempenho ruim.';

grant select on public.v_lousa_base to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- PROVAS
-- ---------------------------------------------------------------------------------------------------
do $$
declare v_n int; v_def text;
begin
  -- 1. Invoker.
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'v_lousa_base'
                    and array_to_string(c.reloptions, ',') like '%security_invoker=true%') then
    raise exception 'PROVA 1 FALHOU: v_lousa_base não é security_invoker';
  end if;

  -- 2. Visitante não lê.
  if has_table_privilege('anon', 'public.v_lousa_base', 'select') then
    raise exception 'PROVA 2 FALHOU: anon lê a base da projeção';
  end if;

  -- 3. O critério é o que está escrito: nunca serve de base com menos de 4 peças ou com tudo zerado.
  select count(*) into v_n from public.v_lousa_base where serve_de_base and (pecas < 4 or maior = 0);
  if v_n > 0 then
    raise exception 'PROVA 3 FALHOU: % grupo(s) servem de base violando o critério', v_n;
  end if;

  -- 4. Conta sem nome não entra (o defeito que está no MKT hoje não pode vazar para a projeção).
  select count(*) into v_n from public.v_lousa_base where conta is null;
  if v_n > 0 then
    raise exception 'PROVA 4 FALHOU: % grupo(s) sem conta entraram na base', v_n;
  end if;

  -- 5. É mediana, não média — lido da definição, não da intenção.
  select pg_get_viewdef('public.v_lousa_base'::regclass) into v_def;
  if v_def not like '%percentile_cont%' or v_def like '%avg(%' then
    raise exception 'PROVA 5 FALHOU: a view não calcula percentil, ou calcula média';
  end if;

  -- 6. A faixa é faixa: p25 nunca acima da mediana, mediana nunca acima de p75.
  select count(*) into v_n from public.v_lousa_base where p25 > mediana or mediana > p75;
  if v_n > 0 then
    raise exception 'PROVA 6 FALHOU: % grupo(s) com faixa invertida', v_n;
  end if;

  raise notice 'as 6 provas passaram';
end $$;

commit;
