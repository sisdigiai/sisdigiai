-- `spec_onde` na vista dos apps (23/11/2026). Campo novo que o eco acrescentou depois que a TELA
-- mostrou um defeito do script dele: a coluna DOC dizia "sem spec" para as sub-apps do Clearix, que
-- são cobertas pela Spec guarda-chuva `clearix_eco_full.md`. Dizer "sem spec" para quem tem spec é
-- a mesma família de erro que esta página existe para pegar — por isso o campo entra na tela.
create or replace view public.v_raiox_apps with (security_invoker = true) as
select a.value ->> 'app'                            as app,
       (a.value ->> 'arquivos')::int                as arquivos,
       (a.value ->> 'telas')::int                   as telas,
       (a.value ->> 'rotas_de_api')::int            as rotas_de_api,
       (a.value ->> 'funcoes_chamadas')::int        as funcoes_chamadas,
       (a.value ->> 'objetos_lidos')::int           as objetos_lidos,
       (a.value ->> 'chamadas_que_gravam')::int     as chamadas_que_gravam,
       (a.value ->> 'edge_functions')::int          as edge_functions,
       (a.value ->> 'gaps_altos')::int              as gaps_altos,
       (a.value ->> 'gaps_medios')::int             as gaps_medios,
       (a.value ->> 'gaps_info')::int               as gaps_info,
       (a.value ->> 'tem_spec')::boolean            as tem_spec,
       (a.value ->> 'tem_agents')::boolean          as tem_agents,
       a.value ->> 'spec_onde'                      as spec_onde
from ops.raiox_snapshot s, jsonb_array_elements(s.dados -> 'apps') a;

grant select on public.v_raiox_apps to authenticated;
