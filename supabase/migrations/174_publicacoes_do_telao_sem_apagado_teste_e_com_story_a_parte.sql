-- 174 — a view do Telão contava post apagado, teste de conexão e story como se fossem publicação de feed
--
-- ✔ APLICADA em 05/10/2026 às 15:41:44 BRT, reensaiada antes. Estado agora: **276** publicações no ar
--   (251 feed + 11 stories + 14 sem url), contra 366 que a view mandava antes.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: o MKT mandou em 05/10 a lista do que mudou de significado lá (despacho
--   `digiai_mkt/docs/despachos/_AO_DIGIAI_2026-10-05_espelho-do-mkt.md`), a pedido do dono: "tudo que muda no
--   MKT tem que refletir no app". Três linhas daquela lista eram defeito meu, não aviso.
--
-- O TAMANHO DO ERRO, medido em 05/10 antes de corrigir:
--   · 366 publicações com data — o que a view mandava ao Telão
--   ·  88 estão marcadas `metadata.excluido_em`: foram APAGADAS das redes (48 Mello, 40 OSI, na limpeza dos
--      rostos de IA e dos pins). O Telão contava post que não existe mais.
--   ·   2 são `metadata.teste_de_conexao` (a demo do TikTok).
--   ·  11 são story (`url` com `/stories/`), que não é post de feed e nem tem alcance coletado.
--   ·  14 **não têm url nenhuma** — achado por acidente, pela prova desta migration: a soma feed+story não
--      fechava com o total. Sem url não dá para dizer se foram feed ou story. Ganharam coluna própria em vez
--      de serem chutadas para um lado (avisei o MKT; a falta da url é lá).
--   → publicação real de feed: **251**. A view inflava 46%.
--
-- O QUE MUDA NO CONTRATO, e por que não escondo isso: `publicacoes` continua existindo e continua querendo
--   dizer "publicações que foram ao ar e ainda existem" — mas o NÚMERO cai, porque antes incluía apagado e
--   teste. Isso é correção, não mudança de significado. O que é novo são duas colunas ao lado: `feed` e
--   `stories`, para quem precisa separar. Avisei o Telão; a grão da view (dia × plataforma × marca) não muda,
--   então quem já lê não quebra.
--
-- POR QUE NÃO APAGO STORY DA CONTA: story foi ao ar e é trabalho feito. Some-lo com feed é que engana, porque
--   feed tem alcance medido e story não. Então entra separado, e quem monta o slide escolhe.

begin;

do $$
begin
  if (select count(*) from information_schema.columns
       where table_schema='public' and table_name='v_mkt_publicacoes_dias' and column_name='stories') > 0 then
    raise exception 'a view ja tem a coluna stories — a 174 ja foi aplicada?';
  end if;
end $$;

create or replace view public.v_mkt_publicacoes_dias
with (security_invoker = true) as
select (p.published_at at time zone 'America/Sao_Paulo')::date as dia,
       p.platform                                              as plataforma,
       b.code                                                  as marca,
       b.name                                                  as marca_nome,
       count(*)::int                                           as publicacoes,
       count(*) filter (where p.url is not null and p.url not ilike '%/stories/%')::int as feed,
       count(*) filter (where p.url ilike '%/stories/%')::int                            as stories,
       -- 14 linhas (05/10) não têm url: não dá para dizer se foram feed ou story. Chutar "feed" inflaria o
       -- que tem alcance medido; esconder faria a soma não fechar. Ficam visíveis, com nome.
       count(*) filter (where p.url is null)::int                                        as sem_url
  from mkt.publications p
  left join mkt.brands b on b.id = p.brand_id
 where p.published_at is not null
   -- apagado da rede não é publicação no ar; teste de conexão nunca foi publicação
   and not (p.metadata ? 'excluido_em')
   and coalesce((p.metadata->>'teste_de_conexao')::boolean, false) = false
 group by 1, 2, 3, 4;

comment on view public.v_mkt_publicacoes_dias is
  '165/174: publicações do MKT por dia BRT, plataforma e marca. Exclui o que foi apagado da rede '
  '(metadata.excluido_em) e o teste de conexão. publicacoes = feed + stories + sem_url; feed é o que tem '
  'alcance medido, story não tem, e sem_url é publicação sem endereço registrado — nenhuma é chutada.';

do $$
declare v_total int; v_feed int; v_stories int; v_sem int;
begin
  select coalesce(sum(publicacoes),0), coalesce(sum(feed),0), coalesce(sum(stories),0), coalesce(sum(sem_url),0)
    into v_total, v_feed, v_stories, v_sem from public.v_mkt_publicacoes_dias;

  if v_feed <> 251 then raise exception 'PROVA_174_FALHOU: feed % , esperava 251 pelo medido de 05/10', v_feed; end if;
  if v_stories <> 11 then raise exception 'PROVA_174_FALHOU: stories %, esperava 11', v_stories; end if;
  -- a identidade que impede qualquer linha de sumir numa categoria que ninguem olha
  if v_total <> v_feed + v_stories + v_sem then
    raise exception 'PROVA_174_FALHOU: publicacoes (%) nao e feed+stories+sem_url (%+%+%)', v_total, v_feed, v_stories, v_sem;
  end if;

  -- a conta tem de fechar com a tabela: total menos apagados menos teste
  if v_total <> (select count(*) from mkt.publications
                  where published_at is not null and not (metadata ? 'excluido_em')
                    and coalesce((metadata->>'teste_de_conexao')::boolean,false) = false) then
    raise exception 'PROVA_174_FALHOU: a view perdeu ou ganhou linha no caminho';
  end if;

  -- e o portão continua de pé
  if has_table_privilege('anon', 'public.v_mkt_publicacoes_dias', 'select')
  or not has_table_privilege('authenticated', 'public.v_mkt_publicacoes_dias', 'select') then
    raise exception 'PROVA_174_FALHOU: grant saiu do lugar';
  end if;
  raise notice '174: % no ar (% feed + % stories + % sem url); antes iam 366', v_total, v_feed, v_stories, v_sem;
end $$;

commit;
