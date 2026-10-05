-- DDL guardado das 4 views removidas pela migration 185 — 05/10/2026
--
-- POR QUE ESTE ARQUIVO EXISTE: remover é destrutivo, e a única forma honesta de remover é deixar o caminho
-- de volta escrito. Rodar este arquivo recria as 4 exatamente como estavam no momento da remoção, incluindo
-- grants e comentários.
--
-- POR QUE FORAM REMOVIDAS: nenhuma tinha consumidor em repo nenhum — medido em 05/10 com varredura de
-- código em todo o workspace, excluindo `database.types.ts` (gerado, faz qualquer view parecer usada) e as
-- próprias migrations. Nenhuma era lida por outra view ou função (pg_depend). `v_ops_cofre` já estava
-- apontada como candidata a remoção desde 09/09 (`docs/portao-65-views-definer-2026-09-09.md`).
--
-- ⚠ SE FOR RECRIAR, LEIA ISTO PRIMEIRO: as duas do cofre tinham **INSERT, UPDATE, DELETE e TRUNCATE**
-- concedidos a `authenticated`, não só SELECT. Não eram exploráveis (`v_ops_cofre` tem LEFT JOIN e
-- `v_ops_cofre_resumo` é agregada, então nenhuma é atualizável automaticamente pelo Postgres), mas o grant
-- estava errado. Os blocos abaixo recriam **só o SELECT**, de propósito. Se alguém precisar de escrita, que
-- seja decisão nova e escrita.

begin;

-- 1) v_ops_cofre — cofre da empresa por entidade. Levava secret_ref, url_painel, conta_dona e obs de TODA
--    conta ativa, sem filtro de papel. Era a view que mais expunha de todo o banco.
create or replace view public.v_ops_cofre as
 select e.slug as empresa,
    e.nome as empresa_nome,
    e.tipo as empresa_tipo,
    e.situacao as empresa_situacao,
    c.categoria,
    c.servico,
    c.identificador,
    c.conta_dona,
    c.navegador,
    c.status,
    c.situacao,
    c.encerrada_em,
    c.plano,
    c.custo_mensal,
    c.renova_em,
    c.secret_ref,
    c.url_painel,
    c.obs,
    c.dono_humano,
    c.ultima_verificacao,
    c.ultimo_detalhe,
    case when c.renova_em is not null then c.renova_em - current_date else null::integer end as dias_para_renovar
   from ops.contas_servicos c
     left join ops.empresas e on e.slug = c.empresa_slug
  where c.ativo
  order by e.tipo, e.slug, c.categoria, c.servico;

grant select on public.v_ops_cofre to authenticated;

comment on view public.v_ops_cofre is
  'Cofre da empresa: tudo que a casa tem, por entidade — e-mails, BMs, redes, telefones, infra, domínios, '
  'marketplaces. (Recriada do DDL guardado em 05/10; grants de escrita NÃO recriados de propósito.)';

-- 2) v_ops_cofre_resumo — contagens e custo mensal por empresa.
create or replace view public.v_ops_cofre_resumo as
 select coalesce(c.empresa_slug, '(sem empresa)'::text) as empresa,
    e.nome as empresa_nome,
    e.tipo,
    e.situacao as empresa_situacao,
    count(*) as contas,
    count(*) filter (where c.status = any (array['quebrado'::text, 'pausado'::text])) as com_problema,
    count(*) filter (where c.status = 'desconhecido'::text) as a_descobrir,
    count(*) filter (where c.categoria = 'rede_social'::text) as redes,
    count(*) filter (where c.categoria = 'telefonia'::text) as telefones,
    count(*) filter (where c.situacao = 'encerrada'::text) as encerradas,
    round(coalesce(sum(c.custo_mensal), 0::numeric), 2) as custo_mensal
   from ops.contas_servicos c
     left join ops.empresas e on e.slug = c.empresa_slug
  where c.ativo
  group by (coalesce(c.empresa_slug, '(sem empresa)'::text)), e.nome, e.tipo, e.situacao
  order by (count(*)) desc;

grant select on public.v_ops_cofre_resumo to authenticated;

-- 3) v_mkt_contas — recorte do inventário para os produtos de marketing. Criada pelo digiai (050/081) para
--    o MKT ler; o MKT nunca a adotou.
create or replace view public.v_mkt_contas as
 select servico,
    identificador,
    conta_dona,
    navegador,
    produtos,
    status,
    ultima_verificacao,
    ultimo_detalhe,
    renova_em,
    secret_ref,
    url_painel,
    obs
   from ops.contas_servicos
  where ativo
    and (produtos && array['mkt'::text, 'osi'::text, 'pulso'::text, 'limelight'::text, 'digiai'::text]
      or (servico = any (array['meta_pixel'::text, 'tiktok_pixel'::text, 'tiktok_dev'::text, 'telegram_bot'::text])))
  order by (status = any (array['quebrado'::text, 'pausado'::text])) desc, servico;

grant select on public.v_mkt_contas to authenticated;

comment on view public.v_mkt_contas is
  'DEFINER DE PROPOSITO e CANDIDATA A DROP: le ops.contas_servicos, leva secret_ref e url_painel. '
  '(Recriada do DDL guardado em 05/10.)';

-- 4) v_vendas_leads — COMPAT do rename de 14/09, substituída por public.v_mkt_vendas_leads. Definição byte
--    a byte idêntica à substituta: duas portas para o mesmo phone_e164 de lead.
create or replace view public.v_vendas_leads as
 select id,
    company,
    stage,
    contact,
    owner,
    next_touch_at,
    last_touch_at,
    wa_opt_out_em,
    motivo_perda is not null as tem_motivo_perda,
    wa_status,
    name,
    phone_e164
   from ops.commercial_leads l
  where deleted_at is null and lgpd_request_at is null;

grant select on public.v_vendas_leads to authenticated;

comment on view public.v_vendas_leads is
  'COMPAT — substituida por public.v_mkt_vendas_leads (20260914_01, rename em dois tempos). Nao criar '
  'consumidor novo aqui. (Recriada do DDL guardado em 05/10.)';

commit;
