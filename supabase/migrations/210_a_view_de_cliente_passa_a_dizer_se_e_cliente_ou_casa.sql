-- 210 — a view de cliente passa a dizer se é CLIENTE QUE PAGA ou PROPRIEDADE DA CASA
--
-- ✔ APLICADA em 31/10/2026, ensaiada antes. Lido depois: **cliente que paga = 501** (mello, de
--   `mello-loja`), **casa = 182** (digiai, de `digiai-site`) e **sem espécie / sem dono = 1.027**
--   (`clearix-site`, `osi`, `clearix-calc`). O total "por cliente que paga" sai limpo: não soma a
--   casa nem o desconhecido.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: nenhum, e é correção de uma fraqueza no meu próprio desenho de hoje (209), apontada pelo
--   desacordo entre mim e o Geral sobre a decisão 131 do dono.
--
-- ═════ O DESACORDO, E POR QUE EU MUDEI DE LADO ═════
--   Eu sugeri ao dono `cliente_slug = digiai` para as nossas propriedades (`clearix-site` 536 eventos,
--   `osi` 428, `clearix-calc` 63), com o argumento de que `product` já distingue a superfície. O Geral
--   recomendou o contrário: slugs próprios `clearix` e `osi`, porque a folha única e o funil
--   OSI→Nexus→Clearix leem por produto.
--
--   Fui medir o meu próprio argumento — "`ops.empresas` é registro de entidade legal, produto ali
--   corromperia o vocabulário" — e ele **não se sustenta**:
--     · os 7 do tipo `cliente` têm CNPJ e razão social, todos;
--     · mas `pulso` ("Projetos Pulso") já está lá como `tipo = 'propria'` **sem CNPJ**, e `nipo` e
--       `pessoal` também não têm;
--     · a restrição é só `(cnpj is null) = (razao_social is null)` — entrada sem CNPJ é prevista.
--   Ou seja: **o registro já guarda produto/projeto da casa, e o precedente é exatamente o que o Geral
--   propõe.** A recomendação dele é melhor que a minha, e quem decide é o dono (decisão 131).
--
-- ═════ O QUE SOBRAVA DA MINHA OBJEÇÃO, E O QUE ESTA MIGRATION FAZ ═════
--   Sobrava uma coisa real: a coluna se chama `cliente_slug`, e com `clearix`/`osi` dentro ela passa a
--   guardar **duas espécies** — empresa que paga e propriedade nossa. Somar as duas num total chamado
--   "por cliente" seria o mesmo erro da tela do Google somando loja fechada com loja aberta.
--
--   O schema já tem o separador (`ops.empresas.tipo`), e a view não o expunha. Agora expõe. Assim a
--   decisão do dono — qualquer que seja — nasce com as duas populações separáveis, e ninguém precisa
--   lembrar de filtrar: o campo está na cara de quem lê.
--
--   Vale para os dois caminhos: se ele escolher `digiai`, `tipo` dirá `propria` e o `product` continua
--   distinguindo; se escolher `clearix`/`osi`, `tipo` dirá `propria` neles e `cliente` nos que pagam.
--   Em nenhum dos dois o número "por cliente que paga" sai contaminado.
--
-- R-043: view recriada mantendo `security_invoker`. R-044: `public` recebe só view.

begin;

do $$
begin
  if to_regclass('public.v_analytics_eventos_cliente_dia') is null then
    raise exception 'a view da 209 nao existe — aplicar a 209 antes';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='v_analytics_eventos_cliente_dia'
                and column_name='cliente_tipo') then
    raise exception 'cliente_tipo ja existe — a 210 ja foi aplicada?';
  end if;
  -- a premissa que me fez trocar de lado: produto da casa JA vive no registro, sem CNPJ
  if not exists (select 1 from ops.empresas where slug='pulso' and tipo='propria' and cnpj is null) then
    raise exception 'o precedente (pulso, propria, sem CNPJ) mudou — rever o raciocinio da 210';
  end if;
end $$;

-- `create or replace view` nao reordena coluna, entao `cliente_tipo` entra no FIM de proposito.
create or replace view public.v_analytics_eventos_cliente_dia
  with (security_invoker = true) as
 select (e.occurred_at at time zone 'America/Sao_Paulo')::date       as dia,
        e.cliente_slug                                               as cliente,
        case when e.cliente_slug is not null then null
             else (select p.slug from ops.empresas p
                    where e.product is not null
                      and (e.product = p.slug or e.product like p.slug || '-%')
                    order by length(p.slug) desc limit 1)
        end                                                          as cliente_inferido_do_product,
        (e.cliente_slug is not null)                                 as cliente_declarado,
        (e.cliente_slug is not null
           and exists (select 1 from ops.empresas p where p.slug = e.cliente_slug))
                                                                     as cliente_conhecido,
        e.product,
        e.event_code,
        count(*)::int                                                as eventos,
        count(distinct e.session_id)::int                             as sessoes,
        -- 210: CLIENTE QUE PAGA ou PROPRIEDADE DA CASA. Sem este campo, um total chamado "por cliente"
        -- somaria os dois — o mesmo erro da tela do Google somando loja fechada com loja aberta.
        -- Resolve pelo declarado e, na falta dele, pelo inferido, para a linha nunca ficar sem espécie
        -- quando a espécie é conhecível.
        (select p.tipo from ops.empresas p
          where p.slug = coalesce(
            e.cliente_slug,
            (select q.slug from ops.empresas q
              where e.product is not null
                and (e.product = q.slug or e.product like q.slug || '-%')
              order by length(q.slug) desc limit 1)))                as cliente_tipo
   from analytics.events_log e
  where not coalesce(e.teste, false)
  group by 1, 2, 3, 4, 5, 6, 7, 10;

comment on view public.v_analytics_eventos_cliente_dia is
  '209/210: evento por cliente e por dia de Brasília (não UTC). Colunas que de propósito não se misturam: '
  '`cliente` é o que a ORIGEM DECLAROU, `cliente_inferido_do_product` é dedução a partir do rótulo '
  '`product` (só quando não há declarado, e nunca gravada na tabela), `cliente_conhecido` diz se o slug '
  'declarado existe em `ops.empresas` — é como a deriva aparece sem que um FK descarte evento — e '
  '**`cliente_tipo` (210) diz se é `cliente` que paga ou `propria`/`parceira`/`pessoal` da casa**, para '
  'um total chamado "por cliente" não somar as duas espécies. Evento de teste fica fora. Linha com '
  '`cliente` e `cliente_inferido_do_product` nulos é o que ninguém sabe de quem é, e esse número tem de '
  'aparecer na tela em vez de virar zero.';

grant select on public.v_analytics_eventos_cliente_dia to authenticated;
revoke all on public.v_analytics_eventos_cliente_dia from anon;

do $$
declare v_tipo text; v_n int;
begin
  -- a) a especie aparece, e certa, para quem EXISTE no registro (via inferencia, que e o que ha hoje)
  select cliente_tipo into v_tipo from public.v_analytics_eventos_cliente_dia
   where product = 'mello-loja' limit 1;
  if v_tipo <> 'cliente' then
    raise exception 'PROVA_210_FALHOU: mello-loja deu tipo "%" e mello e cliente que paga', v_tipo;
  end if;
  select cliente_tipo into v_tipo from public.v_analytics_eventos_cliente_dia
   where product = 'digiai-site' limit 1;
  if v_tipo <> 'propria' then
    raise exception 'PROVA_210_FALHOU: digiai-site deu tipo "%" e digiai e propria', v_tipo;
  end if;

  -- b) CONTROLE NEGATIVO: o que nao se sabe de quem e continua SEM especie, nao ganha uma por padrao.
  --    Sem esta prova, um coalesce distraido faria tudo virar "cliente" e o total por cliente que paga
  --    nasceria inflado — que e o defeito que esta migration existe para impedir.
  if exists (select 1 from public.v_analytics_eventos_cliente_dia
              where cliente is null and cliente_inferido_do_product is null
                and cliente_tipo is not null) then
    raise exception 'PROVA_210_FALHOU: evento sem dono ganhou especie de cliente';
  end if;
  select sum(eventos) into v_n from public.v_analytics_eventos_cliente_dia
   where cliente is null and cliente_inferido_do_product is null;
  if coalesce(v_n, 0) < 1 then
    raise exception 'PROVA_210_FALHOU: o nao-atribuido sumiu da view';
  end if;

  -- c) separar por especie tem de dar menos que o total: a razao de a coluna existir
  if (select coalesce(sum(eventos),0) from public.v_analytics_eventos_cliente_dia
       where cliente_tipo = 'cliente')
     >= (select coalesce(sum(eventos),0) from public.v_analytics_eventos_cliente_dia) then
    raise exception 'PROVA_210_FALHOU: "cliente que paga" deu o total inteiro — a especie nao separa nada';
  end if;

  -- d) nada se perdeu na recriacao: as colunas da 209 continuam todas la
  select count(*) into v_n from information_schema.columns
   where table_schema='public' and table_name='v_analytics_eventos_cliente_dia'
     and column_name in ('dia','cliente','cliente_inferido_do_product','cliente_declarado',
                         'cliente_conhecido','product','event_code','eventos','sessoes','cliente_tipo');
  if v_n <> 10 then
    raise exception 'PROVA_210_FALHOU: a view ficou com % das 10 colunas esperadas', v_n;
  end if;

  -- e) continua invoker na DEFINICAO (R-043 §4-B) e fora do anon
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_analytics_eventos_cliente_dia'
                    and (select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                          where split_part(o,'=',1)='security_invoker') in ('true','on')) then
    raise exception 'PROVA_210_FALHOU: a view perdeu o security_invoker na recriacao';
  end if;
  if pg_catalog.has_table_privilege('anon','public.v_analytics_eventos_cliente_dia','select') then
    raise exception 'PROVA_210_FALHOU: abri a view para anon';
  end if;
  if not pg_catalog.has_table_privilege('authenticated','public.v_analytics_eventos_cliente_dia','select') then
    raise exception 'PROVA_210_FALHOU: authenticated perdeu a leitura';
  end if;
end $$;

commit;
