-- 229 — O funil da página Receita para de subestimar o toque (12/11/2026).
--
-- O ERRO, e ele é meu: `v_receita_funil` lia **só** `ops.commercial_leads.last_touch_at` e dizia
-- "928 sem nenhum toque, último toque em 29/09". Medido hoje, 12/11:
--   · **450 leads abordados por WhatsApp**, 847 mensagens enviadas, a última **hoje**.
--   · 19 responderam pessoa, 150 responderam robô, 10 a conferir, 4 clicaram, 1 interessada, 48 saíram.
-- `last_touch_at` nunca foi tocado pelo motor de WhatsApp: quem escreve nessa coluna é só o ciclo de vida
-- do lead (`fn_upsert_commercial_lead`, `fn_marcar_lead_perdido`, `fn_descartar_lead`,
-- `fn_registrar_venda_clearix`). Os 18 valores que existem são de setembro, à mão.
--
-- O QUE ISSO CUSTOU: em 11/11 eu disse ao dono, com todas as letras, que "a linha 2 não está devagar, está
-- parada há 42 dias; ninguém falou com ninguém desde setembro". **Era falso.** O motor estava abordando.
-- Eu li uma coluna como se fosse o mundo — a mesma família de erro que passei a semana consertando nos
-- outros. Quem apontou foi o Agente de Receita, com medição, em 12/11.
--
-- O CONSERTO NÃO É SÓ SOMAR NÚMERO: é parar de chamar de "toque" duas coisas diferentes.
--   · **Abordagem por WhatsApp** é o motor trabalhando sozinho (450).
--   · **Toque manual** é alguém tendo falado com a ótica e registrado (18, o último em 29/09) — e é
--     exatamente o que as dez ligações do dono vão virar a partir de 16/11.
-- As duas contam história diferente e pedem ação diferente. Por isso as colunas mentirosas **mudam de
-- nome** em vez de ganharem companhia: coluna que se chama `sem_nenhum_toque` e quer dizer "sem toque
-- manual" já enganou uma vez, e enganaria de novo com o número certo ao lado.
--
-- PARA O AGENTE DE RECEITA (a página é dele desde 11/11): `sem_nenhum_toque`, `com_algum_toque` e
-- `ultimo_toque_em` **deixam de existir**. O bloco "Funil da venda do Clearix" precisa ler os nomes novos.
-- Até ele republicar, a seção mostra campo vazio — que é pior de ver e melhor de verdade do que o número
-- errado que estava lá.

drop view if exists public.v_receita_funil;

create view public.v_receita_funil
with (security_invoker = true) as
with base as (
  select count(*)::int                                                   as leads,
         count(*) filter (where stage = 'captado')::int                  as captado,
         count(*) filter (where stage = 'contatado')::int                as contatado,
         count(*) filter (where stage = 'conversa')::int                 as conversa,
         count(*) filter (where stage = 'cliente')::int                  as cliente,
         count(*) filter (where last_touch_at is not null)::int          as com_toque_manual,
         count(*) filter (where last_touch_at is null)::int              as sem_toque_manual,
         max(last_touch_at)                                              as ultimo_toque_manual_em
    from public.v_vendas_leads
), whats as (
  -- Abordagem é mensagem que SAIU e não falhou. Mensagem que falhou não é conversa com ninguém.
  select count(distinct lead_id)::int as abordados_whatsapp,
         max(enviado_em)              as ultima_mensagem_em
    from mkt.mensagens
   where direcao = 'out' and status <> 'falhou' and lead_id is not null
), funil as (
  select count(*) filter (where etapa = 'respondeu_pessoa')::int as responderam_pessoa,
         count(*) filter (where etapa = 'respondeu_robo')::int    as responderam_robo,
         count(*) filter (where etapa = 'clicou')::int            as clicaram,
         count(*) filter (where etapa = 'interessada')::int       as interessadas,
         count(*) filter (where etapa = 'saiu')::int              as sairam,
         count(*) filter (where etapa = 'perdida')::int           as perdidas
    from public.v_mkt_funil_leads
)
select b.leads,
       w.abordados_whatsapp,
       (b.leads - w.abordados_whatsapp) as nunca_abordados,
       f.responderam_pessoa, f.responderam_robo, f.clicaram, f.interessadas, f.sairam, f.perdidas,
       b.com_toque_manual, b.sem_toque_manual, b.ultimo_toque_manual_em,
       w.ultima_mensagem_em,
       b.captado, b.contatado, b.conversa, b.cliente
  from base b, whats w, funil f;

grant select on public.v_receita_funil to authenticated;

comment on view public.v_receita_funil is
  'Funil da linha 2. ABORDADO = mensagem enviada pelo motor (não falhou). TOQUE MANUAL = alguém falou e '
  'registrou (é o que as ligações do dono viram). As duas coisas são diferentes e, até a 229, a view '
  'chamava só a segunda de "toque" — e por isso dizia 928 sem toque enquanto 450 estavam abordados.';

-- PROVA 1 — os nomes que mentiam sumiram. Enquanto existirem, alguém vai lê-los de novo.
do $$
declare v text;
begin
  select string_agg(column_name, ', ') into v
    from information_schema.columns
   where table_schema = 'public' and table_name = 'v_receita_funil'
     and column_name in ('sem_nenhum_toque', 'com_algum_toque', 'ultimo_toque_em');
  if v is not null then
    raise exception 'PROVA_229_FALHOU: coluna mentirosa ainda existe: %', v;
  end if;
end $$;

-- PROVA 2 — a abordagem da view bate com a contagem direta na fonte. Se um dia divergir, é porque alguém
-- mexeu no filtro de "não falhou" ou na junção, e o número da tela deixaria de ser o do motor.
do $$
declare v_view int; v_fonte int;
begin
  select abordados_whatsapp into v_view from public.v_receita_funil;
  select count(distinct lead_id) into v_fonte from mkt.mensagens
   where direcao = 'out' and status <> 'falhou' and lead_id is not null;
  if v_view <> v_fonte then
    raise exception 'PROVA_229_FALHOU: view diz % abordados e a fonte diz %', v_view, v_fonte;
  end if;
end $$;

-- PROVA 3 — as duas contas de toque manual fecham com o total. Conta que não fecha é conta que perdeu
-- lead pelo caminho, e numa tela de funil isso vira "sumiu gente" sem ninguém notar.
do $$
declare r record;
begin
  select leads, com_toque_manual, sem_toque_manual, abordados_whatsapp, nunca_abordados
    into r from public.v_receita_funil;
  if r.com_toque_manual + r.sem_toque_manual <> r.leads then
    raise exception 'PROVA_229_FALHOU: % + % <> % (toque manual)', r.com_toque_manual, r.sem_toque_manual, r.leads;
  end if;
  if r.abordados_whatsapp + r.nunca_abordados <> r.leads then
    raise exception 'PROVA_229_FALHOU: % + % <> % (abordagem)', r.abordados_whatsapp, r.nunca_abordados, r.leads;
  end if;
end $$;

-- PROVA 4 — o erro que originou esta migration não pode voltar calado: hoje a abordagem é MUITO maior que
-- o toque manual, e é essa diferença que a tela precisa mostrar. Se um dia a view voltar a devolver
-- abordagem igual ao toque manual, é porque alguém religou a leitura de uma coluna só.
do $$
declare r record;
begin
  select abordados_whatsapp, com_toque_manual into r from public.v_receita_funil;
  if r.abordados_whatsapp <= r.com_toque_manual then
    raise exception 'PROVA_229_FALHOU: abordados (%) nao pode ser menor ou igual ao toque manual (%) com o motor no ar',
      r.abordados_whatsapp, r.com_toque_manual;
  end if;
end $$;
