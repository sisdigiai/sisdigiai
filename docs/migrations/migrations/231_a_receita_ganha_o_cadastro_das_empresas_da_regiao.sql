-- 231 — A página Receita ganha o cadastro das empresas da região (Alto Tietê), pela base oficial do CNPJ
-- (13/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/empresas-regiao`), por pedido do dono no
-- canal dele em 13/11/2026 ("mede as pequenas e médias e já cadastra todas em nosso banco").
-- APLICADA em 13/11/2026 pelo próprio Receita, depois de ensaio com rollback em que as quatro provas passaram.
-- A carga rodou em seguida: 65.009 estabelecimentos, edição 2026-10.
--
-- O PROBLEMA: a prospecção a empresas tinha 20 nomes numa fila e o resto da região num arquivo fora do
-- banco. Não dava para responder, na tela, quantas empresas existem em cada cidade, de que tamanho e de
-- que ramo, nem escolher a próxima leva a partir do cadastro.
--
-- CINCO DECISÕES DE DESENHO:
--
-- 1. É TABELA DE EMPRESA, não de pessoa (a R-013 vale para pessoa física). A fonte são os dados abertos do
--    CNPJ da Receita Federal. EMPRESÁRIO INDIVIDUAL, MEI E SOCIEDADE UNIPESSOAL DE ADVOCACIA NÃO ENTRAM: o
--    nome da empresa é o nome da pessoa. A carga tira; o `check` da natureza recusa as duas naturezas.
--
-- 2. O CONTATO DO CADASTRO FISCAL NÃO ENTRA NESTE BANCO. Telefone e e-mail da Receita Federal são, muitas
--    vezes, do escritório de contabilidade. Não há coluna para eles: o que não está aqui não vira
--    destinatário por engano. O contato de quem decide entra em `receita.prospeccao_empresa`, pela ligação.
--
-- 3. TAMANHO E RAMO SÃO CALCULADOS PELO BANCO, por duas funções imutáveis, e não escritos pela carga. O
--    critério fica num lugar só e pode ser contestado. A base NÃO traz número de funcionários: "média ou
--    grande" quer dizer "empresa que não se declarou micro nem pequena", o que inclui clínica, holding e
--    filial de rede. É ponto de partida para conferir, não fila de envio.
--
-- 4. AS TRÊS QUE PEDIRAM PARA SAIR EM AGOSTO ficam no cadastro (ele é o retrato da região), marcadas em
--    `nao_contatar` por coluna calculada. Em `receita.prospeccao_empresa` o banco continua recusando-as.
--
-- 5. ESTAR NO CADASTRO NÃO AUTORIZA CONTATO. Vale o "pode" do dono por pacote.
--
-- Cada linha guarda a edição da base (`edicao`, AAAA-MM). Empresa que fechar some da edição seguinte e
-- fica aqui com a edição antiga, à vista.

create table if not exists receita.empresa_regiao (
  cnpj text primary key check (cnpj ~ '^[0-9A-Z]{14}$'),
  razao_social text not null check (btrim(razao_social) <> ''),
  nome_fantasia text,
  matriz boolean not null,
  natureza_codigo text not null check (natureza_codigo ~ '^[0-9]{4}$' and natureza_codigo not in ('2135', '2321', '4081', '4014', '4090', '4120')),
  natureza text not null,
  porte text not null check (porte in ('microempresa', 'pequeno porte', 'demais')),
  cnae text not null check (cnae ~ '^[0-9]{7}$'),
  cnae_descricao text,
  capital_social numeric(18, 2),
  inicio date,
  municipio text not null,
  municipio_ibge text not null,
  bairro text,
  cep text,
  endereco text,
  edicao text not null check (edicao ~ '^[0-9]{4}-[0-9]{2}$'),
  carregado_em timestamptz not null default now()
);

-- Ramo pelo código de atividade (as duas primeiras posições são a divisão da CNAE).
create or replace function receita.fn_ramo_do_cnae(p_cnae text)
returns text language sql immutable parallel safe
set search_path = ''
as $$
  select case
    when n between 1 and 3 then 'agro'
    when n between 5 and 9 then 'extrativa'
    when n between 10 and 33 then 'indústria'
    when n between 35 and 39 then 'energia, água e resíduos'
    when n between 41 and 43 then 'construção'
    when n = 45 then 'veículos'
    when n = 46 then 'atacado'
    when n = 47 then 'varejo'
    when n between 49 and 53 then 'transporte e logística'
    when n between 55 and 56 then 'alimentação e hospedagem'
    when n between 58 and 63 then 'informação e tecnologia'
    when n between 64 and 66 then 'financeiro e seguros'
    when n = 68 then 'imobiliário'
    when n between 69 and 75 then 'profissionais e técnicos'
    when n between 77 and 82 then 'serviços administrativos'
    when n = 84 then 'administração pública'
    when n = 85 then 'educação'
    when n between 86 and 88 then 'saúde'
    when n between 90 and 93 then 'cultura e esporte'
    when n between 94 and 96 then 'outros serviços'
    else 'outros'
  end
  from (select case when left(p_cnae, 2) ~ '^[0-9]{2}$' then left(p_cnae, 2)::int else 0 end as n) x
$$;

-- Tamanho: natureza de empresa + o porte que ela declarou. Associação, igreja, condomínio, partido, cartório
-- e órgão público são "entidade", qualquer que seja o porte.
create or replace function receita.fn_tamanho_da_empresa(p_natureza_codigo text, p_porte text)
returns text language sql immutable parallel safe
set search_path = ''
as $$
  select case
    when left(p_natureza_codigo, 1) <> '2' then 'entidade'
    when p_porte = 'microempresa' then 'micro'
    when p_porte = 'pequeno porte' then 'pequena'
    else 'media_ou_grande'
  end
$$;

alter table receita.empresa_regiao
  add column if not exists ramo text generated always as (receita.fn_ramo_do_cnae(cnae)) stored,
  add column if not exists tamanho text generated always as (receita.fn_tamanho_da_empresa(natureza_codigo, porte)) stored,
  add column if not exists nao_contatar boolean generated always as (
    razao_social ~* '(ecolab|kimberly|^\s*suzano\s+s\.?\s*/?\s*a\.?(\s|$)|suzano papel)'
    or coalesce(nome_fantasia, '') ~* '(ecolab|kimberly|suzano papel)'
  ) stored;

create index if not exists empresa_regiao_municipio_tamanho on receita.empresa_regiao (municipio, tamanho);
create index if not exists empresa_regiao_ramo on receita.empresa_regiao (ramo);

comment on table receita.empresa_regiao is 'Cadastro das empresas ativas do Alto Tietê pelos dados abertos do CNPJ (Receita Federal). Uma linha por estabelecimento. Sem empresário individual, MEI e sociedade unipessoal de advocacia. Sem contato do cadastro fiscal. Estar aqui não autoriza contato.';
comment on column receita.empresa_regiao.tamanho is 'micro | pequena | media_ou_grande | entidade. Calculado: natureza de empresa + porte declarado. A base não traz número de funcionários; "media_ou_grande" é quem não se declarou micro nem pequena.';
comment on column receita.empresa_regiao.capital_social is 'Capital da EMPRESA, repetido em cada estabelecimento. Filial carrega o capital da matriz.';
comment on column receita.empresa_regiao.nao_contatar is 'Calculado: as três que pediram para sair em agosto de 2026 (Ecolab, Kimberly-Clark, Suzano S/A).';
comment on column receita.empresa_regiao.edicao is 'Edição da base oficial de onde a linha veio (AAAA-MM).';

alter table receita.empresa_regiao enable row level security;
drop policy if exists le_staff on receita.empresa_regiao;
-- (select ...) faz o portão ser avaliado uma vez por consulta, não uma vez por linha: são 65 mil linhas.
create policy le_staff on receita.empresa_regiao for select to authenticated using ((select public.is_staff()));
revoke all on receita.empresa_regiao from public, anon, authenticated;
grant select on receita.empresa_regiao to authenticated;

-- ─────────────────────────────────────────────────────────────── VIEWS DE CONTRATO (public, R-044)

create or replace view public.v_receita_empresas_regiao
with (security_invoker = true) as
select cnpj, razao_social, nome_fantasia, matriz, natureza, porte, tamanho, ramo, cnae, cnae_descricao,
       capital_social, inicio, municipio, bairro, cep, endereco, nao_contatar, edicao, carregado_em
  from receita.empresa_regiao;

-- O resumo que a tela lê: no máximo município x tamanho x ramo (bem abaixo do teto de 1.000 linhas da API).
create or replace view public.v_receita_empresas_resumo
with (security_invoker = true) as
select municipio, tamanho, ramo,
       count(*)::int as estabelecimentos,
       (count(*) filter (where matriz))::int as matrizes,
       max(edicao) as edicao,
       max(carregado_em) as carregado_em
  from receita.empresa_regiao
 group by municipio, tamanho, ramo;

revoke all on public.v_receita_empresas_regiao, public.v_receita_empresas_resumo from public, anon;
grant select on public.v_receita_empresas_regiao, public.v_receita_empresas_resumo to authenticated;

-- ─────────────────────────────────────────────────────────────── A PORTA DA CARGA

-- Só a carga (sessão `postgres`) grava. Recebe um lote em JSON e devolve quantas linhas gravou.
create or replace function receita.fn_gravar_empresas_regiao(p_linhas jsonb)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare v integer;
begin
  if session_user <> 'postgres' then
    raise exception 'so a carga grava o cadastro das empresas da regiao' using errcode = '42501';
  end if;
  insert into receita.empresa_regiao as e
         (cnpj, razao_social, nome_fantasia, matriz, natureza_codigo, natureza, porte, cnae, cnae_descricao,
          capital_social, inicio, municipio, municipio_ibge, bairro, cep, endereco, edicao, carregado_em)
  select x.cnpj, btrim(x.razao_social), nullif(btrim(x.nome_fantasia), ''), x.matriz, x.natureza_codigo, x.natureza,
         x.porte, x.cnae, nullif(x.cnae_descricao, ''), x.capital_social, x.inicio, x.municipio, x.municipio_ibge,
         nullif(x.bairro, ''), nullif(x.cep, ''), nullif(x.endereco, ''), x.edicao, now()
    from jsonb_to_recordset(p_linhas) as x(
         cnpj text, razao_social text, nome_fantasia text, matriz boolean, natureza_codigo text, natureza text,
         porte text, cnae text, cnae_descricao text, capital_social numeric, inicio date, municipio text,
         municipio_ibge text, bairro text, cep text, endereco text, edicao text)
  on conflict (cnpj) do update set
         razao_social = excluded.razao_social, nome_fantasia = excluded.nome_fantasia, matriz = excluded.matriz,
         natureza_codigo = excluded.natureza_codigo, natureza = excluded.natureza, porte = excluded.porte,
         cnae = excluded.cnae, cnae_descricao = excluded.cnae_descricao, capital_social = excluded.capital_social,
         inicio = excluded.inicio, municipio = excluded.municipio, municipio_ibge = excluded.municipio_ibge,
         bairro = excluded.bairro, cep = excluded.cep, endereco = excluded.endereco, edicao = excluded.edicao,
         carregado_em = now();
  get diagnostics v = row_count;
  return v;
end $$;

revoke all on function receita.fn_gravar_empresas_regiao(jsonb) from public, anon, authenticated;
revoke all on function receita.fn_ramo_do_cnae(text), receita.fn_tamanho_da_empresa(text, text) from public, anon;
grant execute on function receita.fn_ramo_do_cnae(text), receita.fn_tamanho_da_empresa(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — as duas views existem e rodam como QUEM CONSULTA (R-043).
do $$
declare v text;
begin
  select string_agg(n, ', ') into v
    from unnest(array['v_receita_empresas_regiao', 'v_receita_empresas_resumo']) n
   where not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                      where s.nspname = 'public' and c.relname = n and c.reloptions @> array['security_invoker=true']);
  if v is not null then
    raise exception 'PROVA_231_FALHOU: view ausente ou sem security_invoker: %', v;
  end if;
end $$;

-- PROVA 2 — fechado para fora: anon não lê; authenticated não escreve na tabela nem chama a porta da carga.
do $$
declare v text;
begin
  select string_agg(grantee || ':' || privilege_type, ', ') into v
    from information_schema.role_table_grants
   where table_schema = 'receita' and table_name = 'empresa_regiao'
     and ((grantee = 'authenticated' and privilege_type <> 'SELECT') or grantee = 'anon');
  if v is not null then
    raise exception 'PROVA_231_FALHOU: privilegio indevido: %', v;
  end if;
  if has_table_privilege('anon', 'public.v_receita_empresas_regiao', 'select')
     or has_table_privilege('anon', 'public.v_receita_empresas_resumo', 'select')
     or has_function_privilege('anon', 'receita.fn_gravar_empresas_regiao(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'receita.fn_gravar_empresas_regiao(jsonb)', 'execute') then
    raise exception 'PROVA_231_FALHOU: anon alcanca o cadastro, ou authenticated alcanca a porta da carga';
  end if;
end $$;

-- PROVA 3 — o critério: ramo, tamanho, a marca das três, e a recusa de quem tem nome de pessoa.
do $$
declare r record; recusou boolean := false;
begin
  if receita.fn_ramo_do_cnae('2511000') <> 'indústria' or receita.fn_ramo_do_cnae('4711302') <> 'varejo'
     or receita.fn_ramo_do_cnae('8610101') <> 'saúde' or receita.fn_ramo_do_cnae('') <> 'outros' then
    raise exception 'PROVA_231_FALHOU: ramo pelo cnae';
  end if;
  if receita.fn_tamanho_da_empresa('2062', 'pequeno porte') <> 'pequena'
     or receita.fn_tamanho_da_empresa('2054', 'demais') <> 'media_ou_grande'
     or receita.fn_tamanho_da_empresa('2062', 'microempresa') <> 'micro'
     or receita.fn_tamanho_da_empresa('3999', 'demais') <> 'entidade' then
    raise exception 'PROVA_231_FALHOU: tamanho pela natureza e porte';
  end if;
  perform receita.fn_gravar_empresas_regiao(jsonb_build_array(
    jsonb_build_object('cnpj', '00000000000191', 'razao_social', 'SUZANO S.A.', 'nome_fantasia', '', 'matriz', true,
      'natureza_codigo', '2046', 'natureza', 'Sociedade Anônima Aberta', 'porte', 'demais', 'cnae', '1721400',
      'cnae_descricao', 'prova', 'capital_social', 1, 'inicio', '2000-01-01', 'municipio', 'Suzano',
      'municipio_ibge', '3552502', 'bairro', '', 'cep', '', 'endereco', '', 'edicao', '2026-10'),
    jsonb_build_object('cnpj', '00000000000272', 'razao_social', 'SUZANO SAUDE LTDA', 'nome_fantasia', '', 'matriz', true,
      'natureza_codigo', '2062', 'natureza', 'Sociedade Empresária Limitada', 'porte', 'pequeno porte', 'cnae', '8630501',
      'cnae_descricao', 'prova', 'capital_social', 1, 'inicio', '2000-01-01', 'municipio', 'Suzano',
      'municipio_ibge', '3552502', 'bairro', '', 'cep', '', 'endereco', '', 'edicao', '2026-10')));
  select bool_and(case cnpj when '00000000000191' then nao_contatar and tamanho = 'media_ou_grande' and ramo = 'indústria'
                            else not nao_contatar and tamanho = 'pequena' and ramo = 'saúde' end) as ok, count(*) as n
    into r from receita.empresa_regiao where cnpj in ('00000000000191', '00000000000272');
  if r.n <> 2 or not r.ok then
    raise exception 'PROVA_231_FALHOU: colunas calculadas (tamanho, ramo, nao_contatar)';
  end if;
  begin
    perform receita.fn_gravar_empresas_regiao(jsonb_build_array(
      jsonb_build_object('cnpj', '00000000000353', 'razao_social', 'FULANO DE TAL SOCIEDADE INDIVIDUAL DE ADVOCACIA',
        'nome_fantasia', '', 'matriz', true, 'natureza_codigo', '2321', 'natureza', 'Sociedade Unipessoal de Advocacia',
        'porte', 'demais', 'cnae', '6911701', 'cnae_descricao', 'prova', 'capital_social', 1, 'inicio', '2000-01-01',
        'municipio', 'Suzano', 'municipio_ibge', '3552502', 'bairro', '', 'cep', '', 'endereco', '', 'edicao', '2026-10')));
  exception when check_violation then
    recusou := true;
  end;
  if not recusou then
    raise exception 'PROVA_231_FALHOU: o banco aceitou natureza com nome de pessoa';
  end if;
end $$;

-- PROVA 4 — O PORTÃO: logado que não é da equipe lê zero; `authenticated` consegue pedir todas as colunas.
do $$
declare n_fora integer; v integer;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000231","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n_fora from public.v_receita_empresas_regiao;
  select count(cnpj || razao_social || coalesce(nome_fantasia, '') || matriz::text || natureza || porte || tamanho || ramo
               || cnae || coalesce(cnae_descricao, '') || coalesce(capital_social::text, '') || coalesce(inicio::text, '')
               || municipio || coalesce(bairro, '') || coalesce(cep, '') || coalesce(endereco, '') || nao_contatar::text
               || edicao || carregado_em::text) into v from public.v_receita_empresas_regiao;
  select count(municipio || tamanho || ramo || estabelecimentos::text || matrizes::text || edicao || carregado_em::text)
    into v from public.v_receita_empresas_resumo;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n_fora <> 0 then
    raise exception 'PROVA_231_FALHOU: logado fora da equipe leu % linha(s) do cadastro', n_fora;
  end if;
exception when insufficient_privilege then
  reset role;
  raise exception 'PROVA_231_FALHOU: authenticated nao le as views com todas as colunas: %', sqlerrm;
end $$;

-- As linhas de prova saem: o cadastro entra pela carga.
delete from receita.empresa_regiao where cnpj in ('00000000000191', '00000000000272', '00000000000353');
