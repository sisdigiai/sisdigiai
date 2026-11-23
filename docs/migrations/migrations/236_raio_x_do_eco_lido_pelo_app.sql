-- Raio-X do ecossistema Clearix, lido pelo app digiai (23/11/2026).
--
-- POR QUE O DADO VEM PARAR AQUI: a página é estática e o Cockpit é outro repositório — ela não
-- consegue ler `Cockpit/raio-x/latest.json` em tempo de execução. Embutir no build faria a tela ter
-- a idade do último deploy, que é o defeito que passei a semana removendo deste app. Então o
-- arquivo é carregado para cá por um irmão do `controle-sync`, e a tela lê view, como o Controle.
--
-- O BANCO DO CLEARIX CONTINUA ISOLADO: nada aqui fala com ele. O que chega é o retrato que o eco
-- gera, sem dado de pessoa.
--
-- R-044: tabela nasce no schema do domínio (`ops`); `public` só recebe view.
-- R-043: toda view nasce `security_invoker`.
create table if not exists ops.raiox_snapshot (
  id            smallint primary key default 1 check (id = 1),
  contrato      text        not null,
  gerado_em     timestamptz not null,
  carregado_em  timestamptz not null default now(),
  dados         jsonb       not null
);

comment on table ops.raiox_snapshot is
  'Último retrato do Raio-X do eco (Cockpit/raio-x/latest.json). Uma linha só: o retrato anterior não serve para nada depois que chega o novo, e guardar histórico aqui seria inventar uma necessidade que ninguém pediu.';

-- ---------------------------------------------------------------- estado
create or replace view public.v_raiox_estado with (security_invoker = true) as
select s.contrato, s.gerado_em, s.carregado_em,
       s.dados ->> 'projeto'            as projeto,
       s.dados -> 'banco'               as banco,
       s.dados -> 'gaps_por_tipo'       as gaps_por_tipo,
       s.dados -> 'rotulos_de_tipo'     as rotulos_de_tipo,
       (select count(*) from jsonb_array_elements(s.dados -> 'gaps') g
         where g ->> 'sev' = 'alta' and coalesce(g #>> '{conferido,veredito}', '') <> 'dispensado') as gaps_alta,
       (select count(*) from jsonb_array_elements(s.dados -> 'gaps') g
         where g ->> 'sev' = 'media' and coalesce(g #>> '{conferido,veredito}', '') <> 'dispensado') as gaps_media,
       (select count(*) from jsonb_array_elements(s.dados -> 'gaps') g
         where g ->> 'sev' = 'info' and coalesce(g #>> '{conferido,veredito}', '') <> 'dispensado') as gaps_info,
       jsonb_array_length(s.dados -> 'apps')     as apps,
       jsonb_array_length(s.dados -> 'robos')    as robos
from ops.raiox_snapshot s;

create or replace view public.v_raiox_limites with (security_invoker = true) as
select l.ord, l.texto
from ops.raiox_snapshot s,
     lateral (select ordinality as ord, value #>> '{}' as texto
                from jsonb_array_elements(s.dados -> 'limites') with ordinality) l;

-- ---------------------------------------------------------------- apps
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
       (a.value ->> 'tem_agents')::boolean          as tem_agents
from ops.raiox_snapshot s, jsonb_array_elements(s.dados -> 'apps') a;

-- ---------------------------------------------------------------- achados
-- `dispensado` continua na lista, marcado — some da contagem, não da vista. Sumir sem deixar marca
-- é como o defeito volta no mês que vem sem ninguém lembrar que já foi olhado.
create or replace view public.v_raiox_gaps with (security_invoker = true) as
select g.value ->> 'tipo'                                  as tipo,
       coalesce(s.dados #>> array['rotulos_de_tipo', g.value ->> 'tipo'], g.value ->> 'tipo') as rotulo,
       g.value ->> 'sev'                                   as sev,
       nullif(g.value ->> 'app', '-')                      as app,
       g.value ->> 'objeto'                                as objeto,
       g.value ->> 'detalhe'                               as detalhe,
       g.value ->> 'arq'                                   as arq,
       (g.value ->> 'l')::int                              as linha,
       g.value #>> '{conferido,veredito}'                  as conferido,
       g.value #>> '{conferido,por}'                       as conferido_por,
       g.value #>> '{conferido,em}'                        as conferido_em,
       g.value #>> '{conferido,motivo}'                    as conferido_motivo
from ops.raiox_snapshot s, jsonb_array_elements(s.dados -> 'gaps') g;

-- ---------------------------------------------------------------- ligações, pares, robôs
create or replace view public.v_raiox_ligacoes with (security_invoker = true) as
select l.value ->> 'objeto'                                           as objeto,
       array(select jsonb_array_elements_text(l.value -> 'apps'))     as apps,
       jsonb_array_length(l.value -> 'apps')                          as quantos
from ops.raiox_snapshot s, jsonb_array_elements(s.dados -> 'ligacoes') l;

create or replace view public.v_raiox_pares with (security_invoker = true) as
select p.value ->> 'par'                      as par,
       (p.value ->> 'objetos_em_comum')::int  as objetos_em_comum
from ops.raiox_snapshot s, jsonb_array_elements(s.dados -> 'pares_de_apps') p;

create or replace view public.v_raiox_robos with (security_invoker = true) as
select (r.value ->> 'id')::int        as id,
       r.value ->> 'nome'             as nome,
       r.value ->> 'agenda'           as agenda,
       (r.value ->> 'ativo')::boolean as ativo,
       r.value ->> 'alvo'             as alvo,
       r.value ->> 'ultima'           as ultima,
       r.value ->> 'status'           as status
from ops.raiox_snapshot s, jsonb_array_elements(s.dados -> 'robos') r;

grant select on public.v_raiox_estado, public.v_raiox_limites, public.v_raiox_apps,
                public.v_raiox_gaps, public.v_raiox_ligacoes, public.v_raiox_pares,
                public.v_raiox_robos
  to authenticated;
