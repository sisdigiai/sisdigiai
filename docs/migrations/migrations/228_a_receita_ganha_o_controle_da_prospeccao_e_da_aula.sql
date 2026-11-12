-- 228 — A página Receita ganha o controle da prospecção a empresas e o da aula, e a Lista do dia passa a dizer
-- em qual produto a ótica se interessou (12/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/controle-prospeccao-aula`), por pedido do
-- dono no canal dele em 12/11/2026 ("agora coloca o controle da prospecção e da aula no app").
-- APLICADA em 12/11/2026 pelo próprio Receita, depois de ensaio com rollback em que as sete provas passaram.
-- A carga rodou em seguida: 20 empresas e a aula de 24/11.
--
-- O PROBLEMA: as duas frentes em curso que podem trazer o primeiro real não tinham onde ser acompanhadas.
-- A fila das 20 empresas morava num arquivo, com o estado de cada uma escrito à mão; e a aula de 24/11 não
-- mostrava em lugar nenhum quantas vagas vendeu nem quantas ligações foram feitas.
--
-- QUATRO DECISÕES DE DESENHO:
--
-- 1. A EMPRESA e o ESTADO moram na mesma linha, com portas diferentes (como a ficha de ideia e a escolha,
--    na 224). A base (nome, cidade, telefone da unidade, site, canal publicado) entra pela carga, a partir
--    de `Cockpit/receita/pacotes/prospeccao-b2b/fila.md`. A ETAPA e o TOQUE só entram por pessoa logada: a
--    carga é recusada. Agente não diz que alguém ligou. Recarregar a base não desfaz a etapa.
--
-- 2. AS TRÊS EMPRESAS QUE PEDIRAM PARA SAIR EM AGOSTO NÃO ENTRAM NA TABELA. É `check`, não aviso em texto:
--    Ecolab, Kimberly-Clark e Suzano S/A são recusadas pelo banco, venham de onde vierem.
--
-- 3. É TABELA DE EMPRESA, não de pessoa (a regra R-013 de identidade vale para pessoa física). O campo
--    "canal de quem decide" é o canal do SETOR (e-mail ou ramal de RH, segurança, compras).
--
-- 4. A VENDA DA AULA NÃO É COPIADA: a view lê a view de contrato de vendas (`v_vendas_eventos`) e conta só
--    o que casa com o nome do produto e está aprovado. Zero venda aparece como zero; produto ainda não
--    criado na plataforma aparece dito, para o zero não ser lido como "ninguém quis".

create table if not exists receita.prospeccao_empresa (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordem integer not null,
  empresa text not null check (btrim(empresa) <> ''),
  cidade text,
  telefone text,
  site text,
  canal_publicado text,
  observacao text,
  cnpj text check (cnpj is null or cnpj ~ '^[0-9A-Z]{14}$'),
  etapa text not null default 'nao_iniciada'
    check (etapa in ('nao_iniciada', 'ligada', 'canal_obtido', 'em_sequencia', 'respondeu',
                     'conversa_marcada', 'dia_marcado', 'recusou', 'nao_contatar')),
  canal_decisor text,
  proximo_passo text,
  etapa_nota text,
  etapa_por text,
  etapa_em timestamptz,
  atualizado_em timestamptz not null default now(),
  -- Pediram para sair em agosto de 2026. Não é filtro de tela: o banco recusa.
  constraint prospeccao_empresa_cerca check (empresa !~* '(ecolab|kimberly|^\s*suzano\s+s\.?\s*/?\s*a|suzano papel)'),
  check ((etapa_por is null) = (etapa_em is null))
);

comment on table receita.prospeccao_empresa is 'Uma linha por empresa da prospecção B2B do Agente de Receita. A base vem de Cockpit/receita/pacotes/prospeccao-b2b/fila.md pela carga; a etapa só entra por pessoa logada. Tabela de empresa, não de pessoa.';
comment on column receita.prospeccao_empresa.etapa is 'nao_iniciada > ligada (ligou e ainda não achou o canal) > canal_obtido > em_sequencia (recebendo os toques) > respondeu > conversa_marcada > dia_marcado. Fins: recusou, nao_contatar.';
comment on column receita.prospeccao_empresa.canal_decisor is 'Canal do setor que decide (e-mail ou ramal de RH, benefícios, segurança ou compras), achado na ligação. Não é o contato do cadastro fiscal.';
comment on column receita.prospeccao_empresa.telefone is 'Telefone da unidade publicado pela empresa, como está na fila. Texto livre: vários vêm com "a conferir".';

create table if not exists receita.prospeccao_toque (
  id bigint generated always as identity primary key,
  empresa_slug text not null references receita.prospeccao_empresa (slug) on delete cascade,
  quando timestamptz not null default now(),
  canal text not null check (canal in ('ligacao', 'email', 'whatsapp', 'visita', 'outro')),
  resultado text not null check (resultado in ('sem_resposta', 'contato', 'recusou')),
  nota text,
  por text not null check (btrim(por) <> '')
);

create index if not exists prospeccao_toque_empresa_idx on receita.prospeccao_toque (empresa_slug, quando desc);

comment on table receita.prospeccao_toque is 'Cada toque feito a uma empresa da prospecção: quando, por qual canal, com que resultado. Só entra por pessoa logada.';
comment on column receita.prospeccao_toque.resultado is 'sem_resposta = ligou ou enviou e nada voltou; contato = falou com alguém ou a empresa respondeu; recusou = disseram não.';

create table if not exists receita.aula (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null check (btrim(titulo) <> ''),
  quando timestamptz not null,
  preco_brl numeric(10, 2) not null check (preco_brl >= 0),
  minimo_ao_vivo integer not null check (minimo_ao_vivo >= 1),
  prazo_vendas date not null,
  prazo_produto date,
  produto_filtro text not null check (btrim(produto_filtro) <> ''),
  produto_criado boolean not null default false,
  link_inscricao text,
  pode_do_dono boolean not null default false,
  atualizado_em timestamptz not null default now()
);

comment on table receita.aula is 'Uma linha por edição de aula paga do Agente de Receita. Vem da carga (tabela "Controle no app" do pacote da aula). As vendas não ficam aqui: são lidas de v_vendas_eventos.';
comment on column receita.aula.produto_filtro is 'Trecho do nome do produto na plataforma de pagamento, para casar as vendas (comparação sem diferenciar maiúsculas).';
comment on column receita.aula.minimo_ao_vivo is 'Com quantas vagas pagas, até prazo_vendas, a aula acontece ao vivo. Abaixo disso vale a regra escrita no pacote.';

-- ─────────────────────────────────────────────────────────────── RLS (as views invoker dependem disto)

alter table receita.prospeccao_empresa enable row level security;
alter table receita.prospeccao_toque enable row level security;
alter table receita.aula enable row level security;

drop policy if exists le_staff on receita.prospeccao_empresa;
drop policy if exists le_staff on receita.prospeccao_toque;
drop policy if exists le_staff on receita.aula;
create policy le_staff on receita.prospeccao_empresa for select to authenticated using (public.is_staff());
create policy le_staff on receita.prospeccao_toque for select to authenticated using (public.is_staff());
create policy le_staff on receita.aula for select to authenticated using (public.is_staff());

grant select on receita.prospeccao_empresa, receita.prospeccao_toque, receita.aula to authenticated;

-- ─────────────────────────────────────────────────────────────── views de contrato (public, invoker)

create or replace view public.v_receita_prospeccao
with (security_invoker = true) as
select e.slug, e.ordem, e.empresa, e.cidade, e.telefone, e.site, e.canal_publicado, e.observacao, e.cnpj,
       e.etapa, e.canal_decisor, e.proximo_passo, e.etapa_nota, e.etapa_por, e.etapa_em, e.atualizado_em,
       coalesce(t.toques, 0)::integer as toques,
       coalesce(t.contatos, 0)::integer as contatos,
       t.ultimo_toque_em, t.ultimo_canal, t.ultimo_resultado
  from receita.prospeccao_empresa e
  left join lateral (
    select count(*) as toques,
           count(*) filter (where x.resultado = 'contato') as contatos,
           max(x.quando) as ultimo_toque_em,
           (array_agg(x.canal order by x.quando desc))[1] as ultimo_canal,
           (array_agg(x.resultado order by x.quando desc))[1] as ultimo_resultado
      from receita.prospeccao_toque x
     where x.empresa_slug = e.slug) t on true;

create or replace view public.v_receita_prospeccao_toques
with (security_invoker = true) as
select t.id, t.empresa_slug, e.empresa, t.quando, t.canal, t.resultado, t.nota, t.por
  from receita.prospeccao_toque t
  join receita.prospeccao_empresa e on e.slug = t.empresa_slug;

create or replace view public.v_receita_aula
with (security_invoker = true) as
select a.slug, a.titulo, a.quando, a.preco_brl, a.minimo_ao_vivo, a.prazo_vendas, a.prazo_produto,
       a.produto_filtro, a.produto_criado, a.link_inscricao, a.pode_do_dono, a.atualizado_em,
       coalesce(v.vendas, 0)::integer as vendas,
       coalesce(v.vendas_brl, 0)::numeric(12, 2) as vendas_brl,
       v.ultima_venda,
       coalesce(l.na_lista, 0)::integer as ligacoes_na_lista,
       coalesce(l.faladas, 0)::integer as ligacoes_faladas,
       coalesce(l.nao_atenderam, 0)::integer as ligacoes_nao_atenderam,
       coalesce(l.nao_ligar, 0)::integer as ligacoes_nao_ligar
  from receita.aula a
  left join lateral (
    select count(*) as vendas, sum(ev.valor) as vendas_brl, max(ev.dia) as ultima_venda
      from public.v_vendas_eventos ev
     where ev.canal = 'hotmart'
       and ev.produto_nome_origem ilike '%' || a.produto_filtro || '%'
       and lower(coalesce(ev.status_origem, '')) in ('approved', 'complete', 'completed')) v on true
  left join lateral (
    -- As ligações contadas são as da Lista do dia até o dia da aula: é o canal de convite desta edição.
    select count(*) as na_lista,
           count(*) filter (where d.resultado = 'falou') as faladas,
           count(*) filter (where d.resultado = 'nao_atendeu') as nao_atenderam,
           count(*) filter (where d.resultado = 'nao_ligar') as nao_ligar
      from receita.lista_dia d
     where d.dia <= (a.quando at time zone 'America/Sao_Paulo')::date) l on true;

grant select on public.v_receita_prospeccao, public.v_receita_prospeccao_toques, public.v_receita_aula to authenticated;

-- ─────────────────────────────────────────────────────────────── escrita 1: a base (staff ou a carga)

create or replace function public.rpc_receita_gravar_prospeccao_empresa(
  p_slug text, p_ordem integer, p_empresa text, p_cidade text, p_telefone text, p_site text,
  p_canal_publicado text, p_observacao text, p_cnpj text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava empresa da prospecção' using errcode = 'insufficient_privilege';
  end if;
  insert into receita.prospeccao_empresa (slug, ordem, empresa, cidade, telefone, site, canal_publicado, observacao, cnpj, atualizado_em)
  values (p_slug, p_ordem, p_empresa, nullif(btrim(coalesce(p_cidade, '')), ''), nullif(btrim(coalesce(p_telefone, '')), ''),
          nullif(btrim(coalesce(p_site, '')), ''), nullif(btrim(coalesce(p_canal_publicado, '')), ''),
          nullif(btrim(coalesce(p_observacao, '')), ''), nullif(btrim(coalesce(p_cnpj, '')), ''), now())
  on conflict (slug) do update
     -- As colunas da etapa ficam de fora de propósito: recarregar a base não desfaz o que a pessoa marcou.
     set ordem = excluded.ordem, empresa = excluded.empresa, cidade = excluded.cidade,
         telefone = excluded.telefone, site = excluded.site, canal_publicado = excluded.canal_publicado,
         observacao = excluded.observacao, cnpj = coalesce(excluded.cnpj, receita.prospeccao_empresa.cnpj),
         atualizado_em = now();
  return p_slug;
end;
$function$;

create or replace function public.rpc_receita_gravar_aula(
  p_slug text, p_titulo text, p_quando timestamptz, p_preco_brl numeric, p_minimo_ao_vivo integer,
  p_prazo_vendas date, p_prazo_produto date, p_produto_filtro text, p_produto_criado boolean,
  p_link_inscricao text, p_pode_do_dono boolean)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava aula' using errcode = 'insufficient_privilege';
  end if;
  insert into receita.aula (slug, titulo, quando, preco_brl, minimo_ao_vivo, prazo_vendas, prazo_produto,
                            produto_filtro, produto_criado, link_inscricao, pode_do_dono, atualizado_em)
  values (p_slug, p_titulo, p_quando, p_preco_brl, p_minimo_ao_vivo, p_prazo_vendas, p_prazo_produto,
          p_produto_filtro, coalesce(p_produto_criado, false), nullif(btrim(coalesce(p_link_inscricao, '')), ''),
          coalesce(p_pode_do_dono, false), now())
  on conflict (slug) do update
     set titulo = excluded.titulo, quando = excluded.quando, preco_brl = excluded.preco_brl,
         minimo_ao_vivo = excluded.minimo_ao_vivo, prazo_vendas = excluded.prazo_vendas,
         prazo_produto = excluded.prazo_produto, produto_filtro = excluded.produto_filtro,
         produto_criado = excluded.produto_criado, link_inscricao = excluded.link_inscricao,
         pode_do_dono = excluded.pode_do_dono, atualizado_em = now();
  return p_slug;
end;
$function$;

-- ─────────────────────────────────────────────────────────────── escrita 2: etapa e toque (só pessoa logada)

create or replace function public.rpc_receita_prospeccao_etapa(
  p_slug text, p_etapa text, p_canal_decisor text default null, p_proximo_passo text default null,
  p_nota text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare v_quem text;
begin
  -- Sem a identidade da carga: quem diz em que pé está a conversa com a empresa é quem conversou.
  if not public.is_staff() then
    raise exception 'apenas pessoa da equipe muda a etapa da empresa' using errcode = 'insufficient_privilege';
  end if;
  v_quem := coalesce(nullif(btrim(auth.jwt() ->> 'email'), ''), auth.uid()::text);
  update receita.prospeccao_empresa
     set etapa = p_etapa,
         canal_decisor = nullif(btrim(coalesce(p_canal_decisor, '')), ''),
         proximo_passo = nullif(btrim(coalesce(p_proximo_passo, '')), ''),
         etapa_nota = nullif(btrim(coalesce(p_nota, '')), ''),
         etapa_por = v_quem, etapa_em = now()
   where slug = p_slug;
  if not found then
    raise exception 'empresa % nao esta na prospecção', p_slug;
  end if;
  return p_slug;
end;
$function$;

create or replace function public.rpc_receita_prospeccao_toque(
  p_slug text, p_canal text, p_resultado text, p_nota text default null)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id bigint; v_quem text; v_etapa text;
begin
  if not public.is_staff() then
    raise exception 'apenas pessoa da equipe registra toque na empresa' using errcode = 'insufficient_privilege';
  end if;
  select etapa into v_etapa from receita.prospeccao_empresa where slug = p_slug;
  if not found then
    raise exception 'empresa % nao esta na prospecção', p_slug;
  end if;
  if v_etapa = 'nao_contatar' then
    raise exception 'esta empresa esta marcada como nao contatar: nenhum toque e registrado';
  end if;
  v_quem := coalesce(nullif(btrim(auth.jwt() ->> 'email'), ''), auth.uid()::text);
  insert into receita.prospeccao_toque (empresa_slug, canal, resultado, nota, por)
  values (p_slug, p_canal, p_resultado, nullif(btrim(coalesce(p_nota, '')), ''), v_quem)
  returning id into v_id;
  -- O primeiro toque tira a empresa de "não iniciada". As outras etapas são escolha de quem conversou.
  update receita.prospeccao_empresa
     set etapa = 'ligada', etapa_por = v_quem, etapa_em = now()
   where slug = p_slug and etapa = 'nao_iniciada';
  return v_id;
end;
$function$;

revoke all on function public.rpc_receita_gravar_prospeccao_empresa(text, integer, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.rpc_receita_gravar_aula(text, text, timestamptz, numeric, integer, date, date, text, boolean, text, boolean) from public, anon;
revoke all on function public.rpc_receita_prospeccao_etapa(text, text, text, text, text) from public, anon;
revoke all on function public.rpc_receita_prospeccao_toque(text, text, text, text) from public, anon;
grant execute on function public.rpc_receita_gravar_prospeccao_empresa(text, integer, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.rpc_receita_gravar_aula(text, text, timestamptz, numeric, integer, date, date, text, boolean, text, boolean) to authenticated;
grant execute on function public.rpc_receita_prospeccao_etapa(text, text, text, text, text) to authenticated;
grant execute on function public.rpc_receita_prospeccao_toque(text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── Lista do dia: em qual produto foi o interesse
--
-- Pedido do dono em 12/11, ao ver a lista no ar: "temos 2 produtos sendo oferecidos; em qual produto se
-- interessou?". A esteira do marketing oferece a OSI a umas óticas e o Clearix a outras (uma oferta por
-- ótica), e a lista da 227 dizia "mostrou interesse" sem dizer em quê. Medido em 12/11: os 4 interesses e
-- os 5 cliques da base são todos da OSI; nenhum é do Clearix. Sem esse dado o dono ligaria sem saber do
-- que a pessoa do outro lado está falando.
--
-- O produto é FOTOGRAFADO na linha no dia em que a lista é montada (uma conversa pode trocar de ramal
-- depois) e vem de `v_mkt_funil_leads.ramal`. Sem `check` de valores: a lista de ramais é do marketing.

alter table receita.lista_dia add column if not exists produto text;

comment on column receita.lista_dia.produto is 'Qual produto o marketing ofereceu a esta ótica, no dia em que a lista foi montada (ramal de v_mkt_funil_leads: osi, clearix…). Nulo = nunca foi abordada. É a resposta a "em qual produto se interessou".';

-- As listas que já existiam (a de 12/11) ganham o produto pelo funil de hoje.
update receita.lista_dia d
   set produto = f.ramal
  from public.v_mkt_funil_leads f
 where f.lead_id = d.lead_id and d.produto is null and f.ramal is not null;

-- Coluna nova no FIM: `create or replace view` não deixa mudar a ordem das que já existem.
create or replace view public.v_receita_lista_dia
with (security_invoker = true) as
select d.dia, d.ordem, d.lead_id, d.faixa, d.motivo, d.resultado, d.resultado_nota, d.resultado_por,
       d.resultado_em, d.criado_em,
       coalesce(nullif(btrim(l.company), ''), nullif(btrim(l.name), ''), f.otica) as otica,
       l.contact as contato, l.phone_e164 as telefone,
       f.cidade, f.uf, f.porte, f.etapa, f.ultimo_toque_em,
       d.produto
  from receita.lista_dia d
  left join public.v_vendas_leads l on l.id = d.lead_id
  left join public.v_mkt_funil_leads f on f.lead_id = d.lead_id;

create or replace function receita.fn_montar_lista_do_dia(p_dia date default null, p_quantas integer default 10)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_dia date := coalesce(p_dia, (now() at time zone 'America/Sao_Paulo')::date);
  v_n integer;
begin
  -- Domingo não tem lista (regra da casa: nada da casa sai no domingo).
  if extract(dow from v_dia) = 0 then
    return 0;
  end if;
  -- Montar duas vezes no mesmo dia não troca a lista: o dono pode já ter ligado para metade dela.
  select count(*) into v_n from receita.lista_dia where dia = v_dia;
  if v_n > 0 then
    return v_n;
  end if;

  insert into receita.lista_dia (dia, ordem, lead_id, faixa, motivo, produto)
  select v_dia, row_number() over (order by c.rank_faixa, c.e_rede, c.ultimo_toque_em desc nulls last, c.lead_id),
         c.lead_id, c.faixa, c.motivo, c.produto
    from (
      select l.id as lead_id,
             x.faixa,
             case x.faixa when 'interesse' then 1 when 'respondeu' then 2 when 'abordada' then 3 else 4 end as rank_faixa,
             (coalesce(f.porte, '') = 'rede') as e_rede,
             f.ultimo_toque_em,
             -- O produto que o marketing ofereceu a esta ótica (o ramal da conversa). Fotografado no dia.
             f.ramal as produto,
             case x.faixa
               when 'interesse' then 'mostrou interesse ou clicou no link'
               when 'respondeu' then 'uma pessoa respondeu o WhatsApp'
               when 'abordada' then case when f.robo_em is not null then 'recebeu WhatsApp; só veio resposta automática'
                                         else 'recebeu WhatsApp e não respondeu' end
               else 'nunca foi tocada'
             end
             || case when f.ultimo_toque_em is not null
                     then '; último toque em ' || to_char(f.ultimo_toque_em at time zone 'America/Sao_Paulo', 'DD/MM')
                     else '' end as motivo
        from public.v_vendas_leads l
        join public.v_mkt_funil_leads f on f.lead_id = l.id
        cross join lateral (
          select case
                   when f.interesse_em is not null or f.clicou_em is not null or f.etapa in ('interessada', 'clicou') then 'interesse'
                   when f.pessoa_em is not null or f.etapa in ('respondeu_pessoa', 'respondeu_a_conferir') then 'respondeu'
                   when f.abordada_em is not null then 'abordada'
                   else 'captada'
                 end as faixa) x
       where l.phone_e164 is not null
         and l.wa_opt_out_em is null
         and not l.tem_motivo_perda
         and l.stage <> 'cliente'
         and f.saiu_em is null
         and f.comprou_em is null
         and f.etapa not in ('saiu', 'perdida')
         -- já falada, ou pediu para não ligar: nunca mais
         and not exists (select 1 from receita.lista_dia d
                          where d.lead_id = l.id and d.resultado in ('falou', 'nao_ligar'))
         -- não atendeu: volta depois de dois dias, no máximo três vezes
         and not exists (select 1 from receita.lista_dia d
                          where d.lead_id = l.id and d.resultado = 'nao_atendeu' and d.dia > v_dia - 3)
         and (select count(*) from receita.lista_dia d
               where d.lead_id = l.id and d.resultado = 'nao_atendeu') < 3
         -- a esteira vai mandar WhatsApp a esta ótica hoje: não bater duas vezes no mesmo dia
         and not exists (select 1 from public.v_mkt_esteira_itens e
                          where e.lead_id = l.id and e.dia = v_dia and e.status = 'agendada')
    ) c
   order by c.rank_faixa, c.e_rede, c.ultimo_toque_em desc nulls last, c.lead_id
   limit greatest(1, least(coalesce(p_quantas, 10), 50));

  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

revoke all on function receita.fn_montar_lista_do_dia(date, integer) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — as três views existem e rodam como QUEM CONSULTA (R-043).
do $$
declare v text;
begin
  select string_agg(n, ', ') into v
    from unnest(array['v_receita_prospeccao', 'v_receita_prospeccao_toques', 'v_receita_aula']) n
   where not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                      where s.nspname = 'public' and c.relname = n and c.reloptions @> array['security_invoker=true']);
  if v is not null then
    raise exception 'PROVA_228_FALHOU: view ausente ou sem security_invoker: %', v;
  end if;
end $$;

-- PROVA 2 — fechado para fora: anon não lê nem executa; authenticated não escreve direto nas três tabelas.
do $$
declare v text;
begin
  select string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ') into v
    from information_schema.role_table_grants
   where table_schema = 'receita' and table_name in ('prospeccao_empresa', 'prospeccao_toque', 'aula')
     and ((grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')) or grantee = 'anon');
  if v is not null then
    raise exception 'PROVA_228_FALHOU: privilegio indevido: %', v;
  end if;
  if has_table_privilege('anon', 'public.v_receita_prospeccao', 'select')
     or has_table_privilege('anon', 'public.v_receita_prospeccao_toques', 'select')
     or has_table_privilege('anon', 'public.v_receita_aula', 'select')
     or has_function_privilege('anon', 'public.rpc_receita_prospeccao_etapa(text, text, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.rpc_receita_prospeccao_toque(text, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.rpc_receita_gravar_prospeccao_empresa(text, integer, text, text, text, text, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.rpc_receita_gravar_aula(text, text, timestamptz, numeric, integer, date, date, text, boolean, text, boolean)', 'execute') then
    raise exception 'PROVA_228_FALHOU: anon alcanca o controle da prospecção ou da aula';
  end if;
end $$;

-- PROVA 3 — `authenticated` consegue PEDIR TODAS AS COLUNAS das três views (prova GRANT, não RLS), inclusive
-- as que vêm das views de contrato de vendas.
do $$
declare v integer;
begin
  set local role authenticated;
  select count(slug || etapa || toques::text || contatos::text || coalesce(telefone, '') || coalesce(canal_decisor, '')
               || coalesce(ultimo_canal, '') || coalesce(ultimo_toque_em::text, '')) into v from public.v_receita_prospeccao;
  select count(id::text || empresa || canal || resultado || por || quando::text) into v from public.v_receita_prospeccao_toques;
  select count(slug || titulo || vendas::text || vendas_brl::text || coalesce(ultima_venda::text, '')
               || ligacoes_na_lista::text || ligacoes_faladas::text || produto_criado::text) into v from public.v_receita_aula;
  reset role;
exception when others then
  reset role;
  raise exception 'PROVA_228_FALHOU: authenticated nao le as views com todas as colunas: %', sqlerrm;
end $$;

-- PROVA 4 — A CERCA: as três que pediram para sair são recusadas pelo banco; uma empresa de Suzano comum entra.
do $$
declare n text; recusadas int := 0;
begin
  foreach n in array array['Ecolab Química', 'Kimberly-Clark Brasil', 'Suzano S/A', 'Suzano S.A. Papel e Celulose', 'SUZANO PAPEL E CELULOSE'] loop
    begin
      perform public.rpc_receita_gravar_prospeccao_empresa('prova-228-cerca', 9999, n, 'Suzano', null, null, null, null, null);
    exception when check_violation then
      recusadas := recusadas + 1;
    end;
  end loop;
  delete from receita.prospeccao_empresa where slug = 'prova-228-cerca';
  if recusadas <> 5 then
    raise exception 'PROVA_228_FALHOU: a cerca deixou passar % de 5 nomes que pediram para sair', 5 - recusadas;
  end if;
  perform public.rpc_receita_gravar_prospeccao_empresa('prova-228-suzano', 9998, 'Metalúrgica Exemplo, unidade Suzano', 'Suzano', null, null, null, null, null);
  if not exists (select 1 from receita.prospeccao_empresa where slug = 'prova-228-suzano') then
    raise exception 'PROVA_228_FALHOU: a cerca barrou uma empresa comum de Suzano';
  end if;
  delete from receita.prospeccao_empresa where slug = 'prova-228-suzano';
end $$;

-- PROVA 5 — regravar a base NÃO apaga a etapa; e a carga NÃO marca etapa nem toque (a migration corre como
-- postgres, que é a identidade da carga).
do $$
declare v record; etapa_passou boolean := false; toque_passou boolean := false;
begin
  perform public.rpc_receita_gravar_prospeccao_empresa('prova-228', 9997, 'Empresa de Prova', 'Mogi', '1', 'a.com', 'x', 'y', null);
  update receita.prospeccao_empresa set etapa = 'canal_obtido', canal_decisor = 'rh@prova', etapa_por = 'prova', etapa_em = now() where slug = 'prova-228';
  perform public.rpc_receita_gravar_prospeccao_empresa('prova-228', 9997, 'Empresa de Prova Regravada', 'Mogi', '2', 'b.com', 'x2', 'y2', '12345678000199');
  select empresa, telefone, cnpj, etapa, canal_decisor into v from receita.prospeccao_empresa where slug = 'prova-228';
  begin
    perform public.rpc_receita_prospeccao_etapa('prova-228', 'dia_marcado');
    etapa_passou := true;
  exception when insufficient_privilege then etapa_passou := false;
  end;
  begin
    perform public.rpc_receita_prospeccao_toque('prova-228', 'ligacao', 'contato');
    toque_passou := true;
  exception when insufficient_privilege then toque_passou := false;
  end;
  delete from receita.prospeccao_empresa where slug = 'prova-228';
  if v.empresa <> 'Empresa de Prova Regravada' or v.telefone <> '2' or v.cnpj <> '12345678000199' then
    raise exception 'PROVA_228_FALHOU: regravar nao atualizou a base (%, %, %)', v.empresa, v.telefone, v.cnpj;
  end if;
  if v.etapa <> 'canal_obtido' or v.canal_decisor <> 'rh@prova' then
    raise exception 'PROVA_228_FALHOU: regravar a base apagou a etapa (ficou %, %)', v.etapa, v.canal_decisor;
  end if;
  if etapa_passou or toque_passou then
    raise exception 'PROVA_228_FALHOU: a carga conseguiu marcar etapa (%) ou toque (%)', etapa_passou, toque_passou;
  end if;
end $$;

-- PROVA 6 — a aula: grava, a view devolve zero venda como ZERO (não nulo) e nenhuma linha de prova fica.
do $$
declare v record;
begin
  perform public.rpc_receita_gravar_aula('prova-228-aula', 'Aula de prova', now() + interval '10 days', 97, 3,
    current_date + 8, current_date + 1, 'produto que nao existe 228', false, null, false);
  select vendas, vendas_brl, ligacoes_na_lista, produto_criado into v from public.v_receita_aula where slug = 'prova-228-aula';
  delete from receita.aula where slug = 'prova-228-aula';
  if v.vendas is distinct from 0 or v.vendas_brl is distinct from 0 or v.ligacoes_na_lista is null or v.produto_criado then
    raise exception 'PROVA_228_FALHOU: aula sem venda nao voltou como zero (%, %, %)', v.vendas, v.vendas_brl, v.ligacoes_na_lista;
  end if;
  if exists (select 1 from receita.prospeccao_empresa where slug like 'prova-228%')
     or exists (select 1 from receita.aula where slug like 'prova-228%') then
    raise exception 'PROVA_228_FALHOU: sobrou linha de prova';
  end if;
end $$;

-- PROVA 7 — a lista diz o produto: montada num dia de prova, toda ótica que já foi abordada sai com o
-- produto escrito, e a view entrega a coluna a quem consulta.
do $$
declare d date := date '2099-01-05'; sem int; n int; v int;
begin
  n := receita.fn_montar_lista_do_dia(d);
  select count(*) into sem from receita.lista_dia where dia = d and faixa <> 'captada' and produto is null;
  set local role authenticated;
  select count(coalesce(produto, '')) into v from public.v_receita_lista_dia where dia = d;
  reset role;
  delete from receita.lista_dia where dia = d;
  if n <> 10 or sem > 0 then
    raise exception 'PROVA_228_FALHOU: lista de prova com % linhas e % otica(s) abordada(s) sem produto', n, sem;
  end if;
  if exists (select 1 from receita.lista_dia where dia >= date '2099-01-01') then
    raise exception 'PROVA_228_FALHOU: sobrou linha de prova em receita.lista_dia';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────── a quem serve cada porta (regra 5 do README)

comment on view public.v_receita_prospeccao is 'Consumidor: página Receita do app digiai, aba Prospecção. Grant: select a authenticated, porque a view é invoker e a RLS das tabelas limita a staff.';
comment on view public.v_receita_prospeccao_toques is 'Consumidor: página Receita do app digiai, aba Prospecção (histórico de toques). Grant: select a authenticated; a RLS limita a staff.';
comment on view public.v_receita_aula is 'Consumidor: página Receita do app digiai, aba Aula. Grant: select a authenticated; invoker: a RLS de receita.aula limita a staff, e as vendas vêm de v_vendas_eventos com as políticas dela.';
comment on function public.rpc_receita_gravar_prospeccao_empresa(text, integer, text, text, text, text, text, text, text) is 'Consumidor: a carga Cockpit/scripts/receita-controle-sync.mjs e staff. Grant: execute a authenticated, com o portão dentro (is_staff ou a identidade da carga). Não toca na etapa.';
comment on function public.rpc_receita_gravar_aula(text, text, timestamptz, numeric, integer, date, date, text, boolean, text, boolean) is 'Consumidor: a carga Cockpit/scripts/receita-controle-sync.mjs e staff. Grant: execute a authenticated, com o portão dentro (is_staff ou a identidade da carga).';
comment on function public.rpc_receita_prospeccao_etapa(text, text, text, text, text) is 'Consumidor: o formulário de etapa da aba Prospecção. Grant: execute a authenticated, com o portão dentro (só is_staff). A carga é recusada: quem diz em que pé está a empresa é quem conversou.';
comment on function public.rpc_receita_prospeccao_toque(text, text, text, text) is 'Consumidor: os botões de toque da aba Prospecção. Grant: execute a authenticated, com o portão dentro (só is_staff). Recusa empresa marcada como não contatar. O primeiro toque tira a empresa de "não iniciada".';
