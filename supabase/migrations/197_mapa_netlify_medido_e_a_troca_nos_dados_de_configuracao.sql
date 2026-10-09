-- 197 — o mapa Netlify medido host por host, e a troca nos dados de configuração
--
-- ✔ APLICADA em 09/10/2026 às 17:05:59 BRT, reensaiada antes — e o ensaio recusou **três** versões minhas:
--   o gatilho de ideia aprovada, a nota de auditoria que repetia o host antigo (a minha própria prova contou
--   as 22 notas como sobra) e a prova que exigia zero em `observacoes`, que é histórico. Depois: **3** ativos
--   vivos com netlify no `valor`, e são exatamente os 3 sem destino; história intacta (257 eventos, 40
--   mensagens, 5.861 sinais).
--
-- (Escrita como NÃO APLICADA.)
--
-- RISCO QUE MOTIVA (R-046): a Netlify **não será paga** e tudo em `*.netlify.app` morre por volta de
--   **14/10/2026** — cinco dias. Ordem do dono em 09/10: "atualizar no digiai todos os links novos".
--
-- ═════ DOIS APPS EM OPERAÇÃO NÃO TÊM PARA ONDE IR, E ISSO É O ACHADO PRINCIPAL ═════
--   `limelight-studio.netlify.app` responde **200** (é o Limelight Studio, em operação desde 22/07) e
--   `pulsohub.netlify.app` responde **200** — e **nenhum dos dois tem endereço novo**. Não é suposição: medi
--   os candidatos óbvios e `limelight.digiai.app.br`, `studio.digiai.app.br`, `pulso.digiai.app.br` e
--   `hub.pulso.digiai.app.br` **não respondem**. Esses dois entram no mapa como `a_definir`, com a data da
--   morte, em vez de receberem um destino inventado. Trocar por endereço que não existe seria pior que não
--   trocar: o link pararia de parecer quebrado e continuaria quebrado.
--
-- ═════ O MAPA DO GERAL COBRIA ~15 HOSTS; EU ACHEI 37 NOS DADOS DE CONFIGURAÇÃO ═════
--   Varri **todas** as colunas de texto e jsonb do banco (mesmo método dele): 26 colunas com `netlify.app`,
--   6.397 linhas. Dessas, a maioria é HISTÓRIA e fica: `ops.apps_sinais.dados` (5.861),
--   `analytics.events_log.url` (257), `ops.pixel_medicao.url` (106), `iam.audit_logs.details` (60),
--   `mkt.mensagens.texto` (40), `mkt.publish_jobs.message`, `mkt.tick_log`, `marketing.landing_leads.source_url`
--   e `ops.pendencias_humanas.fechado_prova`. Esses registram **o que aconteceu** naquele endereço; reescrever
--   seria falsificar o passado. O que se troca é configuração e inventário.
--
--   E dentro da configuração achei hosts que o mapa não tinha, três deles com destino que ninguém havia dito:
--   `clearixbi` → **insights**, `clearixdcl` → **lab**, `clearixrh` → **people**. Mais dois que importam:
--   `digiaimkt` → **mkt.digiai.app.br** e `manual-clearix` → **manual.clearix.app.br** — este último está no
--   gerador de proposta (`src/modules/comercial/proposalGen.ts`), ou seja, ia dentro de proposta para cliente.
--
-- ═════ O QUE ESTAVA PRESTES A SAIR EM PÚBLICO ═════
--   `mkt.ai_config.osi_prospeccao_templates` — os textos de prospecção que vão em mensagem para ótica.
--   `mkt.content_rules.notas` (2) — o que a IA lê para gerar conteúdo.
--   `marketing.content_calendar`: 5 linhas com link morto, mas medi uma a uma e **só `2ddae9ae` está viva e
--   não publicada** (status `ready`). As outras três estão apagadas (`deleted_at`) e `158a3df6` já foi
--   publicada em 22/06 — essa é história e NÃO se reescreve: o post saiu com aquele link.
--
-- ═════ DUAS IDEIAS APROVADAS FICARAM DE FORA, E ISSO É DECISÃO DO DONO ═════
--   `marketing.content_ideas.etapa_funil` tem 2 linhas com "capturar (landing landingoticasemimproviso…)" e
--   **as duas estão aprovadas** — uma delas é a mesma que eu já revoguei e devolvi ao dono na 168. O gatilho
--   `tg_content_ideas_curadoria` barrou o update, e está certo: link dentro de ideia aprovada é conteúdo que
--   o dono aprovou. O caminho da casa é revogar, editar e levar de novo a ele.
--   **Não faço isso aqui de propósito:** revogar tira as duas do bolso de produção até ele reaprovar, e isso é
--   escolha dele, não efeito colateral de uma varredura de link. Prender 24 trocas urgentes a uma decisão que
--   só ele toma seria o pior arranjo. Vai como pendência no meu estado, com a frase que ele precisa dizer.
--
-- O MAPA MORA EM TABELA, não num `case` dentro de update: é a lição da 192 e da 188. Quem mexer em host novo
--   é obrigado a declarar destino, e a tela do Inventário pode mostrar o que ainda não tem.

begin;

do $$
begin
  if to_regclass('ops.netlify_destino') is not null then
    raise exception 'ops.netlify_destino ja existe — a 197 ja foi aplicada?';
  end if;
end $$;

create table ops.netlify_destino (
  host       text primary key,
  destino    text,                       -- nulo quando aposentado ou ainda sem endereço
  situacao   text not null check (situacao in ('redireciona', 'migrar', 'aposentado', 'a_definir', 'morto')),
  prova      text not null,              -- o que eu medi, e quando
  medido_em  timestamptz not null default now()
);

comment on table ops.netlify_destino is
  '197: para onde vai cada endereço *.netlify.app quando a Netlify sair do ar (~14/10/2026). `situacao`: '
  'redireciona = o host já devolve 301 para o destino; migrar = serve conteúdo e tem endereço novo conhecido; '
  'aposentado = decisão do dono, sem destino; a_definir = SERVE CONTEÚDO E NÃO TEM PARA ONDE IR; morto = já '
  'não responde. `prova` guarda o que foi medido, para ninguém trocar por endereço suposto.';

insert into ops.netlify_destino (host, destino, situacao, prova) values
  -- 301 medido: o próprio host já aponta o destino
  ('mellooticas.netlify.app',        'https://mellooticas.com.br',          'redireciona', 'curl 09/10: 301'),
  ('cleariximport.netlify.app',      'https://import.clearix.app.br',       'redireciona', 'curl 09/10: 301'),
  ('digiaiatlas.netlify.app',        'https://app.clearix.app.br',          'redireciona', 'curl 09/10: 301'),
  ('clearixarvision.netlify.app',    'https://arvision.clearix.app.br',     'redireciona', 'curl 09/10: 301'),
  ('clearixbi.netlify.app',          'https://insights.clearix.app.br',     'redireciona', 'curl 09/10: 301 (nao estava no mapa)'),
  ('clearixclient.netlify.app',      'https://crm.clearix.app.br',          'redireciona', 'curl 09/10: 301'),
  ('clearixclinics.netlify.app',     'https://clinics.clearix.app.br',      'redireciona', 'curl 09/10: 301'),
  ('clearixdcl.netlify.app',         'https://lab.clearix.app.br',          'redireciona', 'curl 09/10: 301 (nao estava no mapa)'),
  ('clearixestoque.netlify.app',     'https://inventory.clearix.app.br',    'redireciona', 'curl 09/10: 301'),
  ('clearixexpress.netlify.app',     'https://express.clearix.app.br',      'redireciona', 'curl 09/10: 301'),
  ('clearixfinance.netlify.app',     'https://finance.clearix.app.br',      'redireciona', 'curl 09/10: 301'),
  ('clearixfone.netlify.app',        'https://phone.clearix.app.br',        'redireciona', 'curl 09/10: 301'),
  ('clearixhub.netlify.app',         'https://app.clearix.app.br',          'redireciona', 'curl 09/10: 301'),
  ('clearixlens.netlify.app',        'https://lenses.clearix.app.br',       'redireciona', 'curl 09/10: 301'),
  ('clearixloyalty.netlify.app',     'https://loyalty.clearix.app.br',      'redireciona', 'curl 09/10: 301'),
  ('clearixmarketing.netlify.app',   'https://marketing.clearix.app.br',    'redireciona', 'curl 09/10: 301'),
  ('clearixpaciente.netlify.app',    'https://patient.clearix.app.br',      'redireciona', 'curl 09/10: 301'),
  ('clearixrh.netlify.app',          'https://people.clearix.app.br',       'redireciona', 'curl 09/10: 301 (nao estava no mapa)'),
  ('clearixvendas.netlify.app',      'https://sales.clearix.app.br',        'redireciona', 'curl 09/10: 301'),
  ('digiaimkt.netlify.app',          'https://mkt.digiai.app.br',           'redireciona', 'curl 09/10: 301 (nao estava no mapa)'),
  ('manual-clearix.netlify.app',     'https://manual.clearix.app.br',       'redireciona', 'curl 09/10: 301 — estava no gerador de proposta'),
  -- serve conteúdo (200) e tem endereço novo: destino do mapa do Geral, confirmado no ar quando dava
  ('landingoticasemimproviso.netlify.app', 'https://osi.digiai.app.br',     'migrar', 'curl 09/10: 200; destino do mapa do Geral'),
  ('oticasemimproviso.netlify.app',  'https://leitor-osi.digiai.app.br',    'migrar', 'curl 09/10: 200; destino do mapa do Geral'),
  ('polapetit.netlify.app',          'https://polapetit.com.br',            'migrar', 'curl 09/10: 200; destino do mapa do Geral'),
  ('polapetitapp.netlify.app',       'https://app.polapetit.com.br',        'migrar', 'curl 09/10: 200; destino do mapa do Geral'),
  ('luminabox.netlify.app',          'https://lumina.digiai.app.br',        'migrar', 'curl 09/10: 200; destino confirmado 200/cloudflare'),
  ('lumina.netlify.app',             'https://lumina.digiai.app.br',        'migrar', 'curl 09/10: 200; mesmo destino da luminabox'),
  ('sisnexus.netlify.app',           'https://nexus.digiai.app.br',         'migrar', 'curl 09/10: 200; destino do mapa do Geral'),
  ('sisdigiai.netlify.app',          'https://app.digiai.app.br',           'migrar', 'curl 09/10: 200; destino do mapa do Geral'),
  ('digiaisite.netlify.app',         'https://digiai.app.br',               'migrar', 'curl 09/10: 200; inventario ja dizia arquivado'),
  ('clearixcalc.netlify.app',        'https://calc.clearix.app.br',         'migrar', 'curl 09/10: 200; destino confirmado 200/cloudflare'),
  -- decisão do dono: sem destino
  ('easyidioma.netlify.app',         null, 'aposentado', 'decisao do dono 09/10; ops.apps ativo=false'),
  ('easyidiomas.netlify.app',        null, 'aposentado', 'variante de grafia do easyidioma'),
  ('qualfoto.netlify.app',           null, 'aposentado', 'decisao do dono 09/10; ops.apps ativo=false'),
  -- já não responde
  ('pulso-hub.netlify.app',          null, 'morto', 'curl 09/10: 404'),
  -- ⚠ SERVE CONTEÚDO E NÃO TEM PARA ONDE IR
  ('limelight-studio.netlify.app',   null, 'a_definir',
   'curl 09/10: 200 — app EM OPERACAO. limelight.digiai.app.br e studio.digiai.app.br nao respondem'),
  ('pulsohub.netlify.app',           null, 'a_definir',
   'curl 09/10: 200. pulso.digiai.app.br e hub.pulso.digiai.app.br nao respondem');

grant select on ops.netlify_destino to authenticated;
alter table ops.netlify_destino enable row level security;
create policy netlify_destino_staff_select on ops.netlify_destino
  for select to authenticated using (is_staff());

-- ═════ A TROCA, só em configuração e inventário ═════
-- Troca por host, do mais longo para o mais curto, senão `lumina` casaria dentro de `luminabox` e
-- `easyidioma` dentro de `easyidiomas`. Ordem por length desc resolve, e a prova confere que sobrou zero.
do $$
declare r record; v_sql text;
begin
  for r in select host, destino from ops.netlify_destino
            where destino is not null order by length(host) desc
  loop
    update company.digital_assets
       set valor = replace(valor, r.host, replace(r.destino, 'https://', '')),
           -- A nota NÃO repete o host antigo de propósito: a 1.ª versão o escrevia aqui "para registro", e
           -- a minha própria prova contou essas 22 notas como sobra de link vivo. O host já está em
           -- ops.netlify_destino, que é o lugar dele; duplicar criava a aparência do problema que eu
           -- acabara de resolver.
           observacoes = coalesce(observacoes || ' · ', '') ||
             format('197 (09/10): endereco antigo na Netlify morria em ~14/10; trocado por %s. Mapa em ops.netlify_destino.',
                    r.destino),
           updated_at = now()
     where deleted_at is null and valor ilike '%' || r.host || '%';

    update company.digital_assets set observacoes = replace(observacoes, r.host, replace(r.destino,'https://',''))
     where deleted_at is null and observacoes ilike '%' || r.host || '%'
       and observacoes not ilike '%197 (09/10)%';

    update ops.apps set urls = replace(urls::text, r.host, replace(r.destino,'https://',''))::jsonb
     where urls::text ilike '%' || r.host || '%';

    update ops.contas_servicos set obs = replace(obs, r.host, replace(r.destino,'https://',''))
     where obs ilike '%' || r.host || '%';
    update ops.contas_servicos set ultimo_detalhe = replace(ultimo_detalhe, r.host, replace(r.destino,'https://',''))
     where ultimo_detalhe ilike '%' || r.host || '%';

    update mkt.ai_config set valor = replace(valor::text, r.host, replace(r.destino,'https://',''))::jsonb
     where valor::text ilike '%' || r.host || '%';
    update mkt.content_rules set notas = replace(notas, r.host, replace(r.destino,'https://',''))
     where notas ilike '%' || r.host || '%';
    update mkt.landings_prospeccao set obs = replace(obs, r.host, replace(r.destino,'https://',''))
     where obs ilike '%' || r.host || '%';

    -- calendário: só o que NÃO foi publicado. Post publicado é história — saiu com aquele link.
    update marketing.content_calendar
       set media_external_url = replace(media_external_url, r.host, replace(r.destino,'https://','')),
           copy_full = replace(coalesce(copy_full,''), r.host, replace(r.destino,'https://',''))
     where (media_external_url ilike '%' || r.host || '%' or copy_full ilike '%' || r.host || '%')
       and coalesce(status,'') <> 'published' and published_at is null;

    update ops.backlog_items set description = replace(description, r.host, replace(r.destino,'https://',''))
     where description ilike '%' || r.host || '%';
    update ops.backlog_items set blocker = replace(blocker, r.host, replace(r.destino,'https://',''))
     where blocker ilike '%' || r.host || '%';

    update ops.pendencias_humanas set titulo = replace(titulo, r.host, replace(r.destino,'https://',''))
     where titulo ilike '%' || r.host || '%';
    update ops.pendencias_humanas set porque = replace(porque, r.host, replace(r.destino,'https://',''))
     where porque ilike '%' || r.host || '%';
  end loop;
end $$;

-- os aposentados e os sem destino NÃO se trocam — ganham a nota com a data da morte, para a tela poder dizer
update company.digital_assets a
   set status = case when d.situacao in ('aposentado','morto') then 'arquivado' else a.status end,
       observacoes = coalesce(a.observacoes || ' · ', '') ||
         case d.situacao
           when 'aposentado' then '197 (09/10): APOSENTADO por decisao do dono; o endereco morre com a Netlify em ~14/10.'
           when 'morto'      then '197 (09/10): ja nao responde (404) e morre com a Netlify em ~14/10.'
           else '197 (09/10): ⚠ SERVE CONTEUDO E NAO TEM ENDERECO NOVO; morre com a Netlify em ~14/10.'
         end,
       updated_at = now()
  from ops.netlify_destino d
 where a.deleted_at is null and d.destino is null and a.valor ilike '%' || d.host || '%';

-- Duas notas guardam um PLANO que o desligamento anula. O texto fica (e historia), e ganha o aviso ao lado —
-- senao o inventario segue dizendo "decidimos manter na Netlify" e "a Netlify e o nosso rollback" cinco dias
-- antes de a Netlify sair do ar.
update company.digital_assets
   set observacoes = observacoes ||
         ' · 197 (09/10): ⚠ a decisao acima esta VENCIDA — a Netlify nao sera paga e sai do ar em ~14/10.'
                     ' O endereco novo esta no campo do ativo; mapa em ops.netlify_destino.',
       updated_at = now()
 where deleted_at is null
   and (observacoes ilike '%manter em digiaiatlas.netlify.app%'
     or observacoes ilike '%netlify segue como rollback%');

do $$
declare v_conf int; v_hist int; v_adef int; v_assets int;
begin
  -- a) ZERO netlify vivo nas colunas de CONFIGURAÇÃO que têm destino. O que sobra só pode ser
  --    aposentado, morto ou a_definir — e a prova diz quantos e quais.
  select count(*) into v_conf from (
    select valor as t from company.digital_assets where deleted_at is null
    -- `observacoes` NAO entra: e o log historico do ativo, e citar o endereco antigo ali e registro, nao
    -- link vivo. Medi as 6 notas uma a uma — todas descrevem o passado ("corrigido de X p/ Y", "migrado do
    -- Netlify em 30/07", "ADR-0032 decidiu manter"). Reescrever seria falsificar a historia do inventario.
    -- O campo VIVO e `valor`, e dele a prova exige zero.
    union all select urls::text from ops.apps
    union all select obs from ops.contas_servicos
    union all select ultimo_detalhe from ops.contas_servicos
    union all select valor::text from mkt.ai_config
    union all select notas from mkt.content_rules
    union all select obs from mkt.landings_prospeccao
    union all select media_external_url from marketing.content_calendar
             where coalesce(status,'') <> 'published' and published_at is null
    union all select copy_full from marketing.content_calendar
             where coalesce(status,'') <> 'published' and published_at is null
    union all select description from ops.backlog_items
    union all select blocker from ops.backlog_items
    union all select titulo from ops.pendencias_humanas
    union all select porque from ops.pendencias_humanas) x
   where t ilike '%netlify.app%'
     and exists (select 1 from ops.netlify_destino d
                  where d.destino is not null and x.t ilike '%' || d.host || '%');
  if v_conf <> 0 then
    raise exception 'PROVA_197_FALHOU: sobraram % textos de configuracao com host que TEM destino', v_conf;
  end if;

  -- b) CONTROLE POSITIVO (R-043 §4-A): a HISTÓRIA tem de continuar intacta. Se eu tivesse varrido tudo,
  --    estes números cairiam — e reescrever o passado é pior que deixar o link velho num log.
  select count(*) into v_hist from analytics.events_log where url ilike '%netlify.app%';
  if v_hist <> 257 then
    raise exception 'PROVA_197_FALHOU: events_log tinha 257 urls netlify e tem % — mexi na historia', v_hist;
  end if;
  if (select count(*) from ops.apps_sinais where dados::text ilike '%netlify.app%') <> 5861 then
    raise exception 'PROVA_197_FALHOU: apps_sinais mudou — mexi na historia';
  end if;
  if (select count(*) from mkt.mensagens where texto ilike '%netlify.app%') <> 40 then
    raise exception 'PROVA_197_FALHOU: mensagens enviadas mudaram — isso e o que foi dito, nao se reescreve';
  end if;

  -- c) o post JÁ PUBLICADO continua com o link que saiu: é história, não configuração
  if not exists (select 1 from marketing.content_calendar
                  where media_external_url ilike '%landingoticasemimproviso.netlify.app%'
                    and status = 'published') then
    raise exception 'PROVA_197_FALHOU: reescrevi o link de um post que ja foi publicado';
  end if;

  -- d) os dois sem destino continuam no mapa, marcados — é o achado que o dono precisa ver
  select count(*) into v_adef from ops.netlify_destino where situacao = 'a_definir';
  if v_adef <> 2 then
    raise exception 'PROVA_197_FALHOU: esperava 2 hosts a_definir e achei %', v_adef;
  end if;

  -- e) o inventário mudou de verdade: nenhum ativo vivo aponta para host com destino
  select count(*) into v_assets from company.digital_assets a
   where a.deleted_at is null and a.valor ilike '%netlify.app%'
     and exists (select 1 from ops.netlify_destino d where d.destino is not null
                  and a.valor ilike '%' || d.host || '%');
  if v_assets <> 0 then
    raise exception 'PROVA_197_FALHOU: % ativos ainda apontam para netlify com destino', v_assets;
  end if;

  set local role authenticated;
  perform count(*) from ops.netlify_destino;
  reset role;
end $$;

commit;
