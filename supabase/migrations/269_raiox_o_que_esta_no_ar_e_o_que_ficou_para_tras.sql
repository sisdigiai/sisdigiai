-- Raio-X: o que está no ar, e o que ficou para trás (23/11/2026).
--
-- O eco passou a medir deploy por app e mandou cinco campos novos no retrato. A tela precisa deles
-- porque a pergunta que o dono faz é essa: *"o que já tem e o que falta"* — e código commitado que
-- não está no ar é exatamente trabalho feito que ninguém está usando.
--
-- TRÊS SITUAÇÕES, TRÊS COLUNAS, DE PROPÓSITO. O eco resumiu como "5 apps com código fora do ar", e
-- no dado são coisas diferentes, que pedem ações diferentes:
--   · `commits_de_codigo_depois_do_deploy` — está no ramo certo e não subiu. **Falta deploy.**
--     Medido hoje: 4 apps (Clinics, com deploy de 23/09, DCL, Estoque e Finance).
--   · `commits_de_codigo_em_outro_ramo` — existe, mas noutro ramo. **Falta integrar.** 1 app (RH).
--   · `arquivos_de_codigo_sem_commit` — nem commitado está. **Pode se perder.** Finance, 3 arquivos.
-- Somar os três num número só seria cômodo e errado: "falta deploy", "falta integrar" e "pode se
-- perder" não se resolvem do mesmo jeito, e o terceiro é o único que some se a máquina morrer.
--
-- `deploy_lido` existe para a tela nunca mostrar traço como se fosse "nada pendente": app cujo
-- deploy o eco não conseguiu ler é **desconhecido**, não é "em dia". Ausência não é zero, de novo.
create or replace view public.v_raiox_apps with (security_invoker = true) as
select a.value ->> 'app'                                      as app,
       (a.value ->> 'arquivos')::integer                      as arquivos,
       (a.value ->> 'telas')::integer                         as telas,
       (a.value ->> 'rotas_de_api')::integer                  as rotas_de_api,
       (a.value ->> 'funcoes_chamadas')::integer              as funcoes_chamadas,
       (a.value ->> 'objetos_lidos')::integer                 as objetos_lidos,
       (a.value ->> 'chamadas_que_gravam')::integer           as chamadas_que_gravam,
       (a.value ->> 'edge_functions')::integer                as edge_functions,
       (a.value ->> 'gaps_altos')::integer                    as gaps_altos,
       (a.value ->> 'gaps_medios')::integer                   as gaps_medios,
       (a.value ->> 'gaps_info')::integer                     as gaps_info,
       (a.value ->> 'tem_spec')::boolean                      as tem_spec,
       (a.value ->> 'tem_agents')::boolean                    as tem_agents,
       a.value ->> 'spec_onde'                                as spec_onde,
       a.value ->> 'ultimo_deploy'                            as ultimo_deploy,
       a.value ->> 'versao_no_ar'                             as versao_no_ar,
       coalesce((a.value ->> 'deploy_lido') = 'sim', false)   as deploy_lido,
       (a.value ->> 'commits_de_codigo_depois_do_deploy')::integer as commits_fora_do_ar,
       (a.value ->> 'commits_de_codigo_em_outro_ramo')::integer    as commits_em_outro_ramo,
       (a.value ->> 'arquivos_de_codigo_sem_commit')::integer      as arquivos_sem_commit,
       (a.value ->> 'commits_inconclusivos')::integer              as commits_inconclusivos
from ops.raiox_snapshot s,
     lateral jsonb_array_elements(s.dados -> 'apps') a(value);

comment on view public.v_raiox_apps is
  'Um app por linha do último retrato do eco. As quatro colunas de código fora do ar são distintas '
  'de propósito: falta deploy, falta integrar, pode se perder e inconclusivo. `deploy_lido` falso '
  'quer dizer que o eco não leu o deploy deste app — desconhecido, nunca "em dia".';

-- Prova: quem tem código fora do ar, por tipo.
select app, deploy_lido, ultimo_deploy, commits_fora_do_ar, commits_em_outro_ramo,
       arquivos_sem_commit, commits_inconclusivos
from public.v_raiox_apps
where coalesce(commits_fora_do_ar, 0) > 0 or coalesce(commits_em_outro_ramo, 0) > 0
   or coalesce(arquivos_sem_commit, 0) > 0 or coalesce(commits_inconclusivos, 0) > 0
order by app;
