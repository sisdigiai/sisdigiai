-- ============================================================
-- 264 — o recorte do resultado também por rede, para não comparar réguas diferentes
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Depende da 263, aplicada hoje.
-- Por quê: a 263 entregou o recorte certo e **a leitura dele saiu misturada**. Medido logo depois de aplicar,
--   quase todo grupo veio com `mistura_redes = true`: a faixa "12h–15h" soma Instagram, Facebook, TikTok e
--   YouTube numa mediana só. View de TikTok não é view de Instagram — uma é entregue a quem não segue, a outra
--   quase só a quem segue. Entregar essa mediana ao dono repetiria exatamente a queixa que abriu o trabalho
--   ("resultados complexos e misturados").
-- O que muda: a coluna `rede_recorte`. Nulo = todas as redes juntas (como na 263, para o total), preenchida =
--   o mesmo recorte dentro de uma rede só. A tela mostra a de rede única por padrão e o total como contexto.
-- Ensaio: FEITO (rollback) + 3 sabotagens.
-- Regras: [x] R-043 invoker, portão herdado da v_mkt_resultado_peca  [x] grants na mesma migration
-- ============================================================
begin;

do $$ begin
  if to_regclass('public.v_mkt_resultado_peca') is null then raise exception 'a 263 não está aplicada'; end if;
end $$;

create or replace view public.v_mkt_resultado_recorte with (security_invoker = true) as
with base as (
  select * from public.v_mkt_resultado_peca where idade_dias >= 7 and idade_dias <= 90
),
cortes as (
  select 'marca'   as recorte, marca_nome as valor, * from base
  union all select 'rede',    rede, * from base
  union all select 'tipo',    coalesce(nullif(tipo, ''), '(sem tipo registrado)'), * from base
  union all select 'tema',    coalesce(nullif(tema, ''), '(sem tema registrado)'), * from base
  union all select 'formato', coalesce(nullif(formato, ''), '(sem formato registrado)'), * from base
  union all select 'hora',    lpad(((hora_brt / 3) * 3)::text, 2, '0') || 'h–' || lpad(((hora_brt / 3) * 3 + 3)::text, 2, '0') || 'h', * from base
  union all select 'dia da semana',
                   (array['segunda','terça','quarta','quinta','sexta','sábado','domingo'])[dia_da_semana], * from base
),
-- os dois níveis: dentro de uma rede (grouping sets dá a linha por rede e a linha de todas)
agrupado as (
  select recorte, valor, rede, grouping(rede) as e_total,
         count(*) as pecas,
         count(distinct rede) as redes,
         count(*) filter (where lida) as lidas,
         count(views) as com_views,
         percentile_cont(0.5) within group (order by views) as views_mediana,
         percentile_cont(0.9) within group (order by views) as views_p90,
         max(views) as views_melhor,
         count(alcance) as com_alcance,
         percentile_cont(0.5) within group (order by alcance) as alcance_mediana,
         count(*) filter (where engajamento_confiavel) as engaj_confiaveis,
         percentile_cont(0.5) within group (order by engajamento) filter (where engajamento_confiavel) as engaj_mediana,
         max(engajamento) filter (where engajamento_confiavel) as engaj_melhor
    from cortes
   group by grouping sets ((recorte, valor, rede), (recorte, valor))
)
-- A coluna nova entra NO FIM da lista: `create or replace view` só acrescenta coluna no fim, nunca no meio
-- (tentei no meio e levei "cannot change name of view column"). Pôr no fim evita derrubar a view para recriá-la.
select recorte, valor,
       pecas, redes, lidas, com_views,
       round(views_mediana::numeric, 0) as views_mediana,
       round(views_p90::numeric, 0) as views_p90,
       views_melhor, com_alcance,
       round(alcance_mediana::numeric, 0) as alcance_mediana,
       engaj_confiaveis,
       round(engaj_mediana::numeric, 1) as engaj_mediana,
       engaj_melhor,
       (com_views >= 4) as serve_de_base,
       -- só a linha de todas as redes pode misturar régua; a de rede única, por construção, não
       (e_total = 1 and redes > 1) as mistura_redes,
       case when e_total = 1 then null else rede end as rede_recorte
  from agrupado;

comment on view public.v_mkt_resultado_recorte is
  'O que funciona, por recorte (marca, rede, tipo, tema, formato, faixa de hora, dia da semana), em dois níveis: `rede_recorte` preenchida = dentro de uma rede só, nula = todas as redes juntas. A linha de rede única é a que serve para decidir; a de todas serve de contexto e avisa em `mistura_redes` que compara réguas diferentes. Só peça com 7 a 90 dias de vida. Mediana e p90 só sobre métrica não nula, nunca coalesce(metrica,0). `serve_de_base` falso = menos de 4 leituras, base pequena para concluir.';

revoke all on public.v_mkt_resultado_recorte from public, anon;
grant select on public.v_mkt_resultado_recorte to authenticated, service_role;

-- ------------------------------------------------------------------ Provas
-- 2-a) a linha de rede única NUNCA mistura rede; a de todas continua existindo
do $$ declare n_rede int; n_total int; begin
  if exists (select 1 from public.v_mkt_resultado_recorte where rede_recorte is not null and redes <> 1) then
    raise exception 'uma linha de rede única contou mais de uma rede';
  end if;
  if exists (select 1 from public.v_mkt_resultado_recorte where rede_recorte is not null and mistura_redes) then
    raise exception 'uma linha de rede única se declarou misturada';
  end if;
  select count(*) into n_rede from public.v_mkt_resultado_recorte where rede_recorte is not null;
  select count(*) into n_total from public.v_mkt_resultado_recorte where rede_recorte is null;
  if n_rede = 0 or n_total = 0 then
    raise exception 'faltou um dos dois níveis: % por rede, % de total', n_rede, n_total;
  end if;
end $$;

-- 2-b) a soma das peças das linhas por rede fecha com a linha de todas, em cada recorte e valor
do $$ declare r record; begin
  for r in
    select t.recorte, t.valor, t.pecas as total,
           (select coalesce(sum(x.pecas), 0) from public.v_mkt_resultado_recorte x
             where x.recorte = t.recorte and x.valor = t.valor and x.rede_recorte is not null) as soma
      from public.v_mkt_resultado_recorte t where t.rede_recorte is null
  loop
    if r.total <> r.soma then
      raise exception 'o recorte % = % não fecha: total % contra soma por rede %', r.recorte, r.valor, r.total, r.soma;
    end if;
  end loop;
end $$;

-- 2-c) a mediana de uma rede única é a mediana honesta daquela rede, calculada da peça
do $$ declare v_calc numeric; v_view numeric; begin
  select round(percentile_cont(0.5) within group (order by views)::numeric, 0) into v_calc
    from public.v_mkt_resultado_peca
   where idade_dias between 7 and 90 and rede = 'instagram' and views is not null;
  select views_mediana into v_view from public.v_mkt_resultado_recorte
   where recorte = 'rede' and valor = 'instagram' and rede_recorte = 'instagram';
  if v_view is distinct from v_calc then
    raise exception 'a mediana do Instagram no recorte (%) não é a da peça (%)', v_view, v_calc;
  end if;
end $$;

commit;

-- Sabotagens conferidas (as três morderam):
--   a) `rede_recorte` sempre nula            → 2-a: "faltou um dos dois níveis"
--   b) `grouping sets` trocado por `group by` → 2-a: "faltou um dos dois níveis: 0 de total"
--   c) mediana por rede sobre nulo-como-zero  → 2-c: "a mediana do Instagram no recorte não é a da peça"
--
-- Reversão: aplicar de novo o corpo da view como estava na 263 (um nível só, sem `rede_recorte`).
