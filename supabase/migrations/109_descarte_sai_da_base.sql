-- 109 — descarte deixa de ser estágio e passa a ser saída da base
--
-- ⚠ NÃO APLICADA. Desenho fechado entre o Orquestrador Geral e o MKT; a tabela é
--    minha (096), então a migration vem por aqui — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- A PERGUNTA QUE ME FIZERAM, RESPONDIDA COM MEDIÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- "`deleted_at` tem para o app outro significado (purga LGPD pendente,
--  exportação)? Se tiver, a coluna vira `descartado_em` própria."
--
-- **Não tem significado de LGPD.** A LGPD tem colunas próprias em
-- `ops.commercial_leads`: `lgpd_request_at` e `anonymized_at`. Zero colisão.
--
-- **Mas `deleted_at` já tem dono, e não é ninguém abstrato: é a minha tela.**
-- `public.fn_delete_commercial_lead(uuid)` faz exatamente
--     update ops.commercial_leads set deleted_at = now() where id = p_id
-- sem motivo nenhum. É o ícone de lixo do módulo Comercial.
--
-- **E há zero linhas com `deleted_at` preenchido hoje** (260 linhas, 0 apagadas).
-- Não se herda ambiguidade nenhuma — o que se decide agora vale para tudo o que
-- vier, e esta janela não volta a abrir.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- RECOMENDAÇÃO: REUSAR `deleted_at`, E O MOTIVO É MEDIDO
-- ═══════════════════════════════════════════════════════════════════════════
-- `descartado_em` própria obrigaria a acrescentar o filtro a **12 views**, e
-- qualquer uma esquecida reproduz exatamente o defeito de que se está a fugir.
-- Contado no banco:
--
--   12 views/matviews mencionam commercial_leads
--   12 têm `deleted_at is null` EXPLÍCITO no predicado  (não só a palavra solta)
--    0 sem filtro
--
--   marketing.v_outreach_agenda · marketing.v_whatsapp_followups_hoje ·
--   v_commercial_leads · v_marketing_outreach · v_meeting_sessions ·
--   v_mkt_osi_controle · v_mkt_osi_fila_whatsapp · v_ops_placar_hoje ·
--   v_proposals · v_telao_pipeline · v_vendas_hoje · v_vendas_leads
--
-- Ou seja: **o filtro já está montado em todo o lado.** Pendurar o descarte nele
-- é a diferença entre correção por construção e correção por disciplina — e a
-- disciplina falhou duas vezes hoje, nas duas telas que contavam por estágio puro.
--
-- ⚠ O PREÇO, e não o escondo: depois desta migration, `deleted_at is not null`
--    passa a ter DOIS significados — "alguém carregou no lixo" (sem motivo) e
--    "descartado" (com motivo de tipo descarte). Distinguir exige derivar
--    (`motivo_perda is not null`), e hoje aprendi duas vezes que ninguém deriva.
--    O §4 diz como se fecha isso, e por que não se fecha nesta migration.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — fn_descartar_lead: tirar da base sem fingir que foi uma perda
-- ═══════════════════════════════════════════════════════════════════════════
-- Não mexe em `stage` de propósito. O lead foi captado — isso aconteceu e continua
-- verdade. O que mudou é que ele saiu da base, e o motivo diz porquê. Reescrever o
-- estágio apagaria o único facto que o registo tinha.
--
-- A linha FICA (soft delete) e isso é o ponto: 254 dos 260 leads vêm de raspagem
-- e vem mais. Apagar a linha perderia a memória do que já se rejeitou, e a próxima
-- raspagem traria de volta o mesmo cadastro quebrado para alguém rejeitar outra vez.
create or replace function public.fn_descartar_lead(p_lead_id uuid, p_motivo text)
returns ops.commercial_leads
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare r ops.commercial_leads; v_ativo boolean; v_tipo text; v_lista text;
begin
  if not (public.pode_tocar_lead() or public.contexto_de_maquina()) then
    raise exception 'Acesso negado: descartar lead exige papel staff ou vendas'
      using errcode = '42501';
  end if;

  if p_lead_id is null then
    raise exception 'Informe o lead' using errcode = '22004';
  end if;

  select ativo, tipo into v_ativo, v_tipo from ops.motivos_perda where chave = p_motivo;

  -- A lista só se monta quando há erro a explicar — agregação de cortesia não
  -- entra no caminho de quem acertou (mesma razão do bloco protegido da 104).
  if v_ativo is null or not v_ativo or v_tipo <> 'descarte' then
    select string_agg(chave, ', ' order by ordem) into v_lista
      from ops.motivos_perda where ativo and tipo = 'descarte';

    if v_ativo is null then
      raise exception 'Motivo "%" não existe. Motivos de descarte válidos: %',
        coalesce(p_motivo,'(vazio)'), v_lista using errcode = '23503';
    elsif not v_ativo then
      raise exception 'Motivo "%" está aposentado e não aceita registro novo. Motivos de descarte válidos: %',
        p_motivo, v_lista using errcode = '23514';
    else
      raise exception 'Motivo "%" é de PERDA (a ótica avaliou e disse não), não serve para descartar um cadastro. Motivos de descarte válidos: %',
        p_motivo, v_lista using errcode = '23514';
    end if;
  end if;

  update ops.commercial_leads set
    deleted_at    = now(),
    motivo_perda  = p_motivo,
    -- Descartar É um toque: foi quando alguém olhou o cadastro e decidiu.
    last_touch_at = now()
  where id = p_lead_id and deleted_at is null
  returning * into r;

  if r.id is null then
    raise exception 'Lead % não encontrado (ou já descartado)', p_lead_id using errcode = 'P0002';
  end if;
  return r;
end $function$;

comment on function public.fn_descartar_lead(uuid, text) is
  'Tira um lead da base por defeito do CADASTRO (não por recusa do mercado): grava deleted_at + motivo_perda de tipo descarte, e NÃO mexe no stage — o lead foi mesmo captado, isso continua verdade. A linha fica de propósito: 254 dos 260 leads vêm de raspagem e vem mais; apagar perderia a memória do que já se rejeitou e a próxima raspagem traria o mesmo cadastro de volta. Recusa motivo de tipo perda. As 12 views sobre commercial_leads já filtram deleted_at, então o funil deixa de contar descarte POR CONSTRUÇÃO, não por disciplina de cada consumidor. CONSUMIDORES previstos: tela /vendas do digiai_mkt e módulo Comercial do digiai.';

revoke all on function public.fn_descartar_lead(uuid, text) from public, anon;
grant execute on function public.fn_descartar_lead(uuid, text) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — fn_marcar_lead_perdido passa a RECUSAR motivo de descarte
-- ═══════════════════════════════════════════════════════════════════════════
-- Sem isto, o par errado continuava possível na origem e ficava apenas invisível
-- na tela — que é a definição de guarda que não guarda (R-037). E foi exatamente
-- o par errado que originou tudo: um cadastro sujo marcado como `medo_mudanca`.
create or replace function public.fn_marcar_lead_perdido(p_lead_id uuid, p_motivo text)
returns ops.commercial_leads
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare r ops.commercial_leads; v_ativo boolean; v_tipo text; v_lista text;
begin
  if not (public.pode_tocar_lead() or public.contexto_de_maquina()) then
    raise exception 'Acesso negado: marcar lead como perdido exige papel staff ou vendas'
      using errcode = '42501';
  end if;

  if p_lead_id is null then
    raise exception 'Informe o lead' using errcode = '22004';
  end if;

  select ativo, tipo into v_ativo, v_tipo from ops.motivos_perda where chave = p_motivo;

  if v_ativo is null or not v_ativo or v_tipo <> 'perda' then
    select string_agg(chave, ', ' order by ordem) into v_lista
      from ops.motivos_perda where ativo and tipo = 'perda';

    if v_ativo is null then
      raise exception 'Motivo "%" não existe. Motivos de perda válidos: %',
        coalesce(p_motivo,'(vazio)'), v_lista using errcode = '23503';
    elsif not v_ativo then
      raise exception 'Motivo "%" está aposentado e não aceita registro novo. Motivos de perda válidos: %',
        p_motivo, v_lista using errcode = '23514';
    else
      raise exception 'Motivo "%" é de DESCARTE (o cadastro não presta), não é uma perda de venda. Para tirar da base use fn_descartar_lead. Motivos de perda válidos: %',
        p_motivo, v_lista using errcode = '23514';
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
  'Marca lead como PERDIDO: a ótica avaliou e disse não. Só aceita motivo de tipo perda — motivo de descarte é recusado com a indicação de usar fn_descartar_lead (109). Antes da 109 aceitava qualquer motivo ativo, e foi assim que um cadastro sujo de raspagem entrou como `medo_mudanca`. Autorização: pode_tocar_lead() ou contexto_de_maquina(). CONSUMIDORES: tela /vendas do digiai_mkt e módulo Comercial do digiai.';

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — trava semântica
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  if to_regprocedure('public.fn_descartar_lead(uuid,text)') is null then
    raise exception 'fn_descartar_lead não existe.';
  end if;
  if has_function_privilege('anon','public.fn_descartar_lead(uuid,text)','execute') then
    raise exception 'anon pode descartar lead.';
  end if;
  if not has_function_privilege('authenticated','public.fn_descartar_lead(uuid,text)','execute') then
    raise exception 'authenticated não pode descartar lead — a tela ficaria sem porta.';
  end if;

  -- O que faz esta migration valer a pena: o filtro tem de estar em TODAS as
  -- views, senão "por construção" é só uma frase. Reconferido no momento da
  -- aplicação, porque uma view nova pode ter nascido entre escrever e aplicar.
  select count(*) into n from pg_class c
   where c.relkind in ('v','m')
     and pg_get_viewdef(c.oid, true) ilike '%commercial_leads%'
     and pg_get_viewdef(c.oid, true) !~* 'deleted_at\s+is\s+null';
  if n > 0 then
    raise exception '% view(s) sobre commercial_leads sem filtro `deleted_at is null` — nessas, o descarte continuaria a aparecer, e a promessa desta migration é falsa.', n;
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS POR EXECUÇÃO — em leads descartáveis, e depois apagá-los
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `fn_descartar_lead(A, 'cadastro_ruim')` → grava; `deleted_at` e
--      `motivo_perda` preenchidos, **`stage` INTACTO**;
--   b) A **some** de `v_commercial_leads` e do funil, sem ninguém filtrar nada;
--   c) `fn_descartar_lead(B, 'medo_mudanca')` → 23514 dizendo que é motivo de
--      PERDA e listando os de descarte;
--   d) `fn_marcar_lead_perdido(B, 'cadastro_ruim')` → 23514 dizendo que é
--      DESCARTE e mandando usar fn_descartar_lead — **é o par que originou tudo,
--      agora impossível na origem e não só escondido na tela**;
--   e) `fn_marcar_lead_perdido(B, 'medo_mudanca')` → continua a gravar (controlo
--      de não-regressão: a 109 não pode partir o caminho que já funcionava);
--   f) descartar A outra vez → P0002 (`deleted_at is null` no where);
--   g) anon → 42501 nas duas.
--
-- ⚠ (e) é a prova que eu deixaria de fora por parecer óbvia. A §2 reescreve a
--    função inteira: se eu errasse a condição do tipo, o caminho normal partia e
--    as provas (c) e (d) passariam na mesma, porque testam só as recusas.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §4 — O QUE ESTA MIGRATION NÃO FECHA, e é preciso decidir, não esquecer
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. **A outra porta para `deleted_at` continua aberta.**
--    `fn_delete_commercial_lead(uuid)` — o ícone de lixo da tela Comercial —
--    continua a gravar `deleted_at = now()` **sem motivo nenhum**. Depois da 109,
--    `deleted_at is not null` quer dizer "descartado com motivo" OU "alguém
--    carregou no lixo", e só derivando se sabe qual. A memória do que se rejeitou,
--    que é o argumento para preservar a linha, fica incompleta na proporção em que
--    alguém usar a lixeira.
--
--    O fecho por construção é uma CHECK:
--        alter table ops.commercial_leads add constraint commercial_leads_saida_exige_motivo
--          check (deleted_at is null or motivo_perda is not null);
--    Satisfeita hoje (0 linhas com deleted_at). **Não entra nesta migration**
--    porque faria `fn_delete_commercial_lead` passar a falhar, e isso é mudança
--    de comportamento numa RPC que a minha tela usa: precisa do front no mesmo
--    passe (regra da 099). Vai no passe do front, junto com o resto.
--
-- 2. **Descarte fica ilegível para quem devia lê-lo.** O argumento para guardar a
--    linha é a memória do que já se rejeitou — dedupe da próxima raspagem. Mas
--    **nenhuma das 12 views mostra linha com `deleted_at`**, e `authenticated` não
--    tem SELECT na tabela. Ou seja: hoje a memória existe e não se alcança pelo
--    app. Só service_role a vê (é o caso do importador, presumo — não confirmei).
--    Se o dedupe é do importador, está resolvido e basta escrevê-lo; se alguém
--    quiser ver "o que rejeitámos e porquê" numa tela, falta uma view própria.
--    Não invento a view antes de saber quem a pede.
--
-- 3. **A 109 substitui o mecanismo que a 106/107 deram, e convém dizê-lo.**
--    Com o descarte a sair por `deleted_at`, `v_commercial_leads` nunca mostra um
--    lead de tipo descarte — logo `motivo_tipo` ali passa a ser sempre 'perda' ou
--    nulo. O filtro que a `Posto.tsx` acrescentou continua correto, mas passa a
--    ser cinto além de suspensórios. As colunas ficam: `motivo_rotulo` continua a
--    servir para mostrar POR QUE se perdeu, com palavra de gente. Só não são mais
--    a trava — a trava passou a ser o desenho.
