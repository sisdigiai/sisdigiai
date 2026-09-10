-- 106 — separar "a ótica disse não" de "o cadastro não presta"
--
-- ✔ APLICADA em 09/09/2026 pelo Orquestrador Geral, nesta versão (3 colunas de
--   saída na view). O `motivo_rotulo`, aceite depois, entrou pela 107.
--   Decisão dele com o MKT; a tabela é minha (096), então a migration veio por
--   aqui — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O PROBLEMA, MEDIDO ANTES DE ESCREVER — e é maior do que o caso que o motivou
-- ═══════════════════════════════════════════════════════════════════════════
-- O MKT testou o botão numa ótica real e teve de marcar um cadastro sujo de
-- raspagem como `medo_mudanca`. Fui medir a dimensão disto:
--
--   260 leads · 254 vêm de raspagem (apify_google_maps 139, apify_suzano 115)
--     · 5 de prospecção IA · 1 interno (o cliente) · e 1 perdido, que é a mentira
--
-- Ou seja: **97,7% da base é raspagem**. Descarte não vai ser exceção no relatório
-- de perda — vai ser a maioria esmagadora dele. Um relatório que some "recusou"
-- com "o telefone era de outra empresa" não fica um pouco enviesado: fica
-- dominado pela higiene de dado, e a conclusão sobre o mercado sai invertida.
--
-- Confirmado também o caso concreto: existe exatamente 1 lead em `perdido`, com
-- `medo_mudanca`, vindo de `apify_suzano_regiao`. Enquanto não for re-marcado,
-- qualquer relatório dá "100% medo de mudança" — sobre uma amostra de um, que é
-- falso. Registado aqui porque é o primeiro dado da série.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — o discriminador
-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK e não tabela de apoio, e isto é o CONTRÁRIO do que argumentei na 096
-- para os motivos — de propósito. Lá a lista APRENDE: a razão real pela qual uma
-- ótica diz não descobre-se conversando, e cada descoberta viraria migration.
-- Aqui não há o que aprender: são duas PERGUNTAS diferentes ("por que o mercado
-- recusou" e "por que o registro não presta"), e um terceiro tipo não aparece com
-- a experiência — apareceria com uma mudança de modelo, que merece migration.
alter table ops.motivos_perda
  add column if not exists tipo text not null default 'perda';

alter table ops.motivos_perda
  drop constraint if exists motivos_perda_tipo_check;
alter table ops.motivos_perda
  add constraint motivos_perda_tipo_check check (tipo in ('perda','descarte'));

comment on column ops.motivos_perda.tipo is
  'perda = a ótica avaliou e disse não (objeção de mercado; muda o discurso comercial). descarte = o registro não presta e sai da base (higiene de dado; muda o filtro da raspagem). São PERGUNTAS DIFERENTES e a média das duas não significa nada — com 97,7% da base vinda de raspagem, sem esta coluna o relatório de perda seria dominado por descarte e diria que o mercado recusa quando o que falha é o cadastro. Os 3 motivos que já existiam ficam `perda` pelo default: nenhum deles é higiene de dado.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — os motivos de descarte
-- ═══════════════════════════════════════════════════════════════════════════
-- Estes NÃO precisam das palavras do dono, e a diferença tem razão de ser: motivo
-- de PERDA é leitura do mercado e só ele sabe o que ouviu (por isso a 096 esperou
-- a frase dele, e a 102 corrigiu a minha leitura). Motivo de DESCARTE é fato
-- verificável no próprio registro — o nome tem pipes, a loja fechou, não é ótica.
-- Quem olha o cadastro sabe. O dono é informado, não consultado.
--
-- ORDEM 110+: depois de todos os de perda, e com folga. Na tela, o que se escolhe
-- primeiro ganha viés (096) — e aqui o viés é perigoso ao contrário: descarte é
-- mais fácil de marcar do que perda, então deixá-lo em cima faria a pessoa
-- descartar o que devia ter perguntado.
insert into ops.motivos_perda (chave, rotulo, ativo, ordem, tipo) values
  ('cadastro_ruim', 'Cadastro quebrado (nome/telefone de outra empresa)', true, 110, 'descarte'),
  ('duplicado',     'Duplicado',                                         true, 120, 'descarte'),
  ('fechou',        'A loja não existe mais',                            true, 130, 'descarte'),
  ('nao_e_otica',   'Não é ótica',                                       true, 140, 'descarte')
on conflict (chave) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — ⚠ ACRÉSCIMO MEU AO PLANO, e é a parte que decide se o relatório mente
-- ═══════════════════════════════════════════════════════════════════════════
-- O plano recebido trata a view de MOTIVOS (o seletor) e para aí. Fui conferir e
-- o buraco está noutro sítio: **`public.v_commercial_leads` não expõe
-- `motivo_perda` nenhum** — as colunas são id, name, company, product, stage,
-- source, contact, value_brl, owner, next_step, notes, created_at, updated_at.
--
-- Consequência, que a frase "perdido de verdade = stage='perdido' and
-- tipo='perda', derivável" esconde: é derivável NO BANCO, e as telas não leem o
-- banco — leem esta view. Hoje a tela Comercial conta a coluna "Perdido" por
-- `stage='perdido'` e não tem como fazer diferente, porque a informação não chega
-- lá. No dia em que o descarte começar a correr, o número "Perdidos" no ecrã passa
-- a somar recusa com lixo, **e ninguém repara**, porque o número continua a
-- aparecer e a somar. É o defeito que não reclama, outra vez, e desta vez sei
-- exatamente onde vai aparecer.
--
-- Acrescentar coluna a view é aditivo: `select *` (o meu store) ganha campos que
-- ignora, e quem nomeia colunas (Posto.tsx e Oticas.tsx do MKT) não vê diferença.
-- ⚠ Mas a view é COMPARTILHADA com o digiai_mkt — o dono dela que avise, não que
--    descubra.
create or replace view public.v_commercial_leads
with (security_invoker = true) as
  select l.id, l.name, l.company, l.product, l.stage, l.source, l.contact,
         l.value_brl, l.owner, l.next_step, l.notes, l.created_at, l.updated_at,
         l.motivo_perda,
         -- Subquery escalar e não LEFT JOIN: escalar NÃO PODE duplicar linha,
         -- aconteça o que acontecer do outro lado. Aqui `chave` é PK e o join
         -- seria igualmente seguro — mas view que alimenta contagem é o pior
         -- sítio para depender de uma unicidade que vive noutra migration.
         (select m.tipo from ops.motivos_perda m where m.chave = l.motivo_perda) as motivo_tipo,
         l.perdido_em
  from ops.commercial_leads l
  where l.deleted_at is null
  order by l.created_at desc;

comment on view public.v_commercial_leads is
  'Leads vivos (deleted_at is null). INVOKER: a RLS de ops.commercial_leads é que manda, e é assim que tem de ser — isto é dado de pessoa. CONSUMIDORES: módulo Comercial do digiai (select *), Posto.tsx e Oticas.tsx do digiai_mkt (colunas nomeadas). `motivo_tipo` acrescentado na 106: sem ele nenhuma tela consegue separar "a ótica disse não" de "o cadastro não presta", e a contagem de "Perdidos" no ecrã soma as duas coisas. Contar perda de verdade é stage=perdido AND motivo_tipo=perda.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §4 — ⚠ SEGUNDO ACRÉSCIMO, pequeno: a mensagem de erro deixa de ensinar errado
-- ═══════════════════════════════════════════════════════════════════════════
-- Foi-me dito que `fn_marcar_lead_perdido` não muda, e a lógica dela de facto não
-- muda. O que muda é o TEXTO: hoje ela responde "Motivos válidos: <todos os
-- ativos>", e depois do §2 isso passa a oferecer `cadastro_ruim` e `duplicado` a
-- quem tentou registar uma perda. A mensagem existe para a pessoa se corrigir
-- sozinha (foi o argumento da 103); oferecer-lhe a lista errada faz o contrário.
-- Separo por tipo. Se preferires aplicar só §1–§3, corta este bloco: não há
-- dependência nenhuma dos outros.
create or replace function public.fn_marcar_lead_perdido(p_lead_id uuid, p_motivo text)
returns ops.commercial_leads
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare r ops.commercial_leads; v_ativo boolean; v_lista text;
begin
  if not (public.pode_tocar_lead() or public.contexto_de_maquina()) then
    raise exception 'Acesso negado: marcar lead como perdido exige papel staff ou vendas'
      using errcode = '42501';
  end if;

  if p_lead_id is null then
    raise exception 'Informe o lead' using errcode = '22004';
  end if;

  select ativo into v_ativo from ops.motivos_perda where chave = p_motivo;

  -- A lista só se monta quando há erro a explicar. Na primeira escrita disto ela
  -- era calculada sempre, e isso punha uma agregação de cortesia dentro do
  -- caminho de quem acertou — se a expressão da mensagem tivesse um defeito,
  -- derrubava a gravação boa. É a mesma razão do bloco protegido da 104:
  -- melhoria de mensagem não pode partir o que a mensagem serve.
  if v_ativo is null or not v_ativo then
    select string_agg(t.linha, ' | ' order by t.o) into v_lista from (
      select case when tipo = 'perda' then 'a ótica disse não: ' else 'descartar o registro: ' end
             || string_agg(chave, ', ' order by ordem) as linha,
             min(ordem) as o
      from ops.motivos_perda where ativo group by tipo
    ) t;

    if v_ativo is null then
      raise exception 'Motivo "%" não existe. Motivos válidos — %', coalesce(p_motivo,'(vazio)'), v_lista
        using errcode = '23503';
    else
      raise exception 'Motivo "%" está aposentado e não aceita registro novo. Motivos válidos — %', p_motivo, v_lista
        using errcode = '23514';
    end if;
  end if;

  update ops.commercial_leads set
    stage         = 'perdido',
    motivo_perda  = p_motivo,
    perdido_em    = now(),
    last_touch_at = now()
  where id = p_lead_id and deleted_at is null
  returning * into r;

  if r.id is null then
    raise exception 'Lead % não encontrado (ou já removido)', p_lead_id using errcode = 'P0002';
  end if;
  return r;
end $function$;

comment on function public.fn_marcar_lead_perdido(uuid, text) is
  'Caminho ÚNICO de escrita para tirar um lead do funil, com motivo da lista fechada (ops.motivos_perda). Serve os dois tipos: motivo `perda` (a ótica disse não) e `descarte` (o cadastro não presta) — o nome da função diz só "perdido" por ser anterior à 106, e renomear partiria os dois consumidores. CONSUMIDORES: tela /vendas do digiai_mkt e módulo Comercial do digiai. Autorização: pode_tocar_lead() ou contexto_de_maquina().';

-- ═══════════════════════════════════════════════════════════════════════════
-- §5 — trava semântica: só aplica se o efeito for o pretendido
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n_perda int; n_descarte int; n_view int;
begin
  select count(*) filter (where tipo='perda' and ativo),
         count(*) filter (where tipo='descarte' and ativo)
    into n_perda, n_descarte from ops.motivos_perda;

  if n_perda < 3 then
    raise exception 'Motivos de PERDA ativos caíram para % — a 106 não pode reclassificar os que vieram das palavras do dono.', n_perda;
  end if;
  if n_descarte <> 4 then
    raise exception 'Esperava 4 motivos de descarte ativos, encontrei %.', n_descarte;
  end if;

  select count(*) into n_view from information_schema.columns
   where table_schema='public' and table_name='v_commercial_leads'
     and column_name in ('motivo_perda','motivo_tipo','perdido_em');
  if n_view <> 3 then
    raise exception 'v_commercial_leads não expôs as 3 colunas de saída (achei %) — sem elas a tela continua a somar perda com descarte.', n_view;
  end if;

  -- Controle de não-regressão do grant: a 098 diz que objeto não nasce concedido,
  -- e `create or replace view` preserva grants — mas preservar é o que eu ACHO.
  if has_table_privilege('anon','public.v_commercial_leads','select') then
    raise exception 'anon voltou a ler v_commercial_leads.';
  end if;
  if not has_table_privilege('authenticated','public.v_commercial_leads','select') then
    raise exception 'authenticated perdeu o select em v_commercial_leads — a tela ficaria vazia.';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS POR EXECUÇÃO — em lead descartável, e depois apagá-lo
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `fn_marcar_lead_perdido(lead, 'cadastro_ruim')` → grava, e a view devolve
--      motivo_tipo = 'descarte';
--   b) o mesmo com 'medo_mudanca' → motivo_tipo = 'perda';
--   c) motivo inexistente → 23503 com a lista SEPARADA nos dois tipos (é o §4);
--   d) `select count(*) filter (where stage='perdido') as ecra_hoje,
--              count(*) filter (where stage='perdido' and motivo_tipo='perda') as perda_real
--       from v_commercial_leads` → os dois números DIFEREM depois de (a).
--      Esta é a prova que interessa: é exatamente o erro que a tela comete hoje;
--   e) anon continua sem ler a view (está na trava, mas conferir por chamada real).
--
-- ⚠ O QUE ESTA MIGRATION NÃO CONSERTA, e não deve ser esquecido:
--   1. a tela Comercial continua a contar "Perdido" por stage, e a somar as duas
--      coisas — a view agora PERMITE separar, mas o front ainda não separa. É meu,
--      e faço no mesmo passe da troca de consumidor para `v_motivos_saida`;
--   2. o único lead perdido hoje continua com `medo_mudanca` mentiroso até o MKT
--      o re-marcar pela tela. Enquanto isso, "100% medo de mudança" sobre n=1;
--   3. arrastar um cartão para a coluna "Perdido" vai passar a oferecer "Cadastro
--      quebrado" — a coluna diz uma coisa e o seletor oferece outra. Resolve-se na
--      tela (seletor em dois grupos), não no banco.
