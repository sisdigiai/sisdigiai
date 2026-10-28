-- 205 — mapa de nome citado, para atribuir menção do Google (NÃO é cadastro de pessoa)
--
-- (Escrita como NÃO APLICADA.)
--
-- ═════ POR QUE ISTO NÃO É UMA TABELA DE COLABORADOR, E NÃO DEVE SER ═════
--   O pedido era "dados de colaboradores" para saber quem tem melhor desempenho. Antes de criar tabela de
--   pessoa a casa manda ler `Cockpit/Harness/padroes-identidade-cadastros.md` (R-013), e eu li. O schema
--   obrigatório de pessoa exige:
--     · `tenant_id uuid NOT NULL REFERENCES iam.tenants(id)` — e **`iam.tenants` NÃO EXISTE neste banco**
--       (`iam` tem só `users` e `audit_logs`);
--     · a constraint `pessoa_tem_identificador`: pelo menos um de email, `phone_e164`, `wa_bsuid` ou `cpf`.
--   De quem é citado numa avaliação do Google eu tenho **o primeiro nome e nada mais**. Para caber no
--   schema de pessoa eu teria de **inventar** tenant e identificador — e cadastro de pessoa com
--   identificador inventado é pior que não ter cadastro: ele passa a parecer fonte de verdade sobre gente.
--
--   Então esta migration cria o que a tela precisa de verdade: um **mapa de nome → ficha**, para somar
--   menção. Não tem contato, não tem documento, não tem vínculo empregatício, e o comentário da tabela
--   diz isso para ninguém confundir depois. **Registro de colaborador de verdade** — com contato, para
--   folha ou placar — pertence a onde mora o vínculo (banco do **Clearix**), e exigiria `iam.tenants`
--   nascer aqui primeiro: decisão do dono, não efeito colateral de uma tela.
--
-- ═════ O QUE ENTRA, E DE ONDE VEIO ═════
--   Os 3 nomes são **medidos**, não recebidos: em outubro/2026 na ficha da Lancaster, 91 avaliações e
--   **84 citam um nome (92%)** — Thiago 73, Kayllaine 7, Nicolly 4. Nascem `confirmado = false`: eu não
--   confirmei com ninguém que são colaboradores, só que os clientes escreveram esses nomes. O dono
--   confirma e completa; a tela mostra o aviso enquanto `confirmado = false`.
--   Apelidos entram como array porque é assim que o cliente escreve (Kayllaine/Kayllane, Nicolly/Nicoly).
--
-- ═════ A JANELA É OUTUBRO, E ESTÁ NA VIEW, NÃO NO JEITO DE OLHAR ═════
--   A Lancaster saiu de **6 avaliações em setembro (0% citando nome)** para **91 em outubro (92%)**; na
--   ficha inteira, 2019→hoje, só **86 de 548** comentários citam os três. Começou uma campanha de
--   avaliação em outubro, e **a atribuição só existe dentro dela**. O corte `>= 2026-10-01` fica na
--   definição da view: proporção calculada sobre 9 anos mentiria, e deixar o corte "para quem olhar
--   lembrar" é como a 192 quase apagou 97 visitas reais.
--
-- ═════ MENÇÃO NÃO É DESEMPENHO, E A VIEW NÃO FINGE QUE É ═════
--   Thiago 73 × Kayllaine 7 com média 4,95 e **1** avaliação ruim no mês é **volume de quem atendeu**,
--   não qualidade: sem denominador (quantos clientes cada um atendeu, que vive no banco do Clearix) o
--   ranking premia quem faz mais turnos ou quem pede mais avaliação. Por isso a view se chama
--   `v_gbp_mencoes_mes`, a coluna é `mencoes`, e **não existe coluna de posição, nota ou ranking**. Se
--   alguém quiser placar, precisa trazer o denominador — e aí a prova desta migration falha de propósito.

begin;

do $$
begin
  if to_regclass('ops.gbp_nome_citado') is not null then
    raise exception 'ops.gbp_nome_citado ja existe — a 205 ja foi aplicada?';
  end if;
  if to_regclass('iam.tenants') is not null then
    raise exception 'iam.tenants passou a existir — reler R-013 antes, o desenho desta migration assumia que nao existe';
  end if;
  -- a premissa medida: a janela de outubro na Lancaster
  if (select count(*) from public.v_mkt_gbp_avaliacoes
       where marca = 'lancaster' and criada_em >= '2026-10-01') < 80 then
    raise exception 'esperava ~91 avaliacoes de outubro na Lancaster — conferir antes de gravar os nomes';
  end if;
end $$;

create table ops.gbp_nome_citado (
  id          bigserial primary key,
  nome        text not null,
  apelidos    text[] not null,
  marca       text not null,
  ficha       text,
  confirmado  boolean not null default false,
  ativo       boolean not null default true,
  obs         text,
  criado_em   timestamptz not null default now(),
  constraint gbp_nome_citado_uniq unique (marca, nome),
  constraint gbp_nome_citado_tem_apelido check (array_length(apelidos, 1) >= 1),
  -- apelido vazio viraria regex que casa com tudo, e toda avaliação seria atribuída a essa linha
  constraint gbp_nome_citado_apelido_nao_vazio check (not ('' = any(apelidos)))
);

comment on table ops.gbp_nome_citado is
  '205: mapa de NOME CITADO em avaliação do Google → marca/ficha, só para somar menção. **NÃO é cadastro '
  'de pessoa** e não deve virar um: não tem contato, documento nem vínculo. O schema obrigatório de pessoa '
  '(R-013) exige `tenant_id` referenciando `iam.tenants` — que não existe neste banco — e pelo menos um '
  'identificador externo (email/telefone/BSUID/CPF), e de um nome citado numa avaliação não se tem nenhum: '
  'caber no schema exigiria inventar identificador, e cadastro de pessoa com identificador inventado passa '
  'a parecer fonte de verdade sobre gente. Registro de colaborador de verdade pertence a onde mora o '
  'vínculo (banco do Clearix). `confirmado = false` significa: os clientes escreveram este nome, e ninguém '
  'confirmou que é colaborador.';

comment on column ops.gbp_nome_citado.apelidos is
  'Como o cliente escreve, não como o RH escreveria (Kayllaine/Kayllane, Nicolly/Nicoly). Vira alternativa '
  'de regex com fronteira de palavra; apelido curto demais casaria dentro de outra palavra.';

alter table ops.gbp_nome_citado enable row level security;

create policy gbp_nome_citado_leitura_equipe on ops.gbp_nome_citado
  for select to authenticated using (is_staff());
create policy gbp_nome_citado_escrita_admin on ops.gbp_nome_citado
  for all to authenticated using (is_admin()) with check (is_admin());

-- grant e policy na mesma migration: grant sem policy e policy sem grant falham de formas diferentes e
-- igualmente caladas (R-044 — `authenticated` não tem grant em tabela de `ops` por desenho).
grant select on ops.gbp_nome_citado to authenticated;

insert into ops.gbp_nome_citado (nome, apelidos, marca, ficha, obs) values
  ('Thiago',    array['thiago','tiago'],                       'lancaster', 'Óticas Lancaster - Suzano',
   '205 (28/10): medido em 73 das 91 avaliacoes de outubro/2026. Nao confirmado com ninguem.'),
  ('Kayllaine', array['kayllaine','kayllane','kaylaine','kaylane'], 'lancaster', 'Óticas Lancaster - Suzano',
   '205 (28/10): medido em 7 avaliacoes de outubro/2026. Apelidos cobrem as grafias que o cliente escreve.'),
  ('Nicolly',   array['nicolly','nicoly','nicole'],            'lancaster', 'Óticas Lancaster - Suzano',
   '205 (28/10): medido em 4 avaliacoes de outubro/2026.');

create view public.v_gbp_mencoes_mes
  with (security_invoker = true) as
with janela as (
  select a.ficha, a.marca, a.review_id, a.estrelas, a.comentario,
         to_char(a.criada_em at time zone 'America/Sao_Paulo', 'YYYY-MM') as mes
    from public.v_mkt_gbp_avaliacoes a
   -- 205: o corte da campanha vive AQUI, não no jeito de olhar. Antes de 10/2026 a citação é ~0 e
   -- qualquer proporção sobre 9 anos mentiria.
   where a.criada_em >= '2026-10-01'
)
select j.mes,
       j.marca,
       j.ficha,
       n.nome,
       n.confirmado,
       count(*)                                        as mencoes,
       round(avg(j.estrelas), 2)                       as media_estrelas,
       count(*) filter (where j.estrelas <= 3)         as mencoes_ruins
  from janela j
  join ops.gbp_nome_citado n
    on n.ativo
   and n.marca = j.marca
   and j.comentario ~* ('\y(' || array_to_string(n.apelidos, '|') || ')\y')
 group by j.mes, j.marca, j.ficha, n.nome, n.confirmado;

comment on view public.v_gbp_mencoes_mes is
  '205: quantas vezes cada nome foi CITADO em avaliação do Google, por mês e ficha. **Menção não é '
  'desempenho** e esta view não tem coluna de posição, nota nem ranking de propósito: 73 menções contra 7, '
  'com média 4,95 e 1 avaliação ruim no mês, é volume de quem atendeu — sem denominador (clientes '
  'atendidos por pessoa, que vive no banco do Clearix) o ranking premia quem faz mais turnos ou quem pede '
  'mais avaliação. Janela a partir de 10/2026 porque foi quando a campanha de avaliação começou (a '
  'Lancaster saiu de 6 avaliações em setembro, 0% citando nome, para 91 em outubro, 92%).';

create view public.v_gbp_mencoes_cobertura_mes
  with (security_invoker = true) as
with janela as (
  select a.ficha, a.marca, a.review_id, a.comentario,
         to_char(a.criada_em at time zone 'America/Sao_Paulo', 'YYYY-MM') as mes
    from public.v_mkt_gbp_avaliacoes a
   where a.criada_em >= '2026-10-01'
)
select j.mes, j.marca, j.ficha,
       count(*) as avaliacoes,
       count(*) filter (
         where exists (select 1 from ops.gbp_nome_citado n
                        where n.ativo and n.marca = j.marca
                          and j.comentario ~* ('\y(' || array_to_string(n.apelidos, '|') || ')\y'))
       ) as com_nome,
       count(*) filter (
         where not exists (select 1 from ops.gbp_nome_citado n
                            where n.ativo and n.marca = j.marca
                              and j.comentario ~* ('\y(' || array_to_string(n.apelidos, '|') || ')\y'))
       ) as sem_nome
  from janela j
 group by j.mes, j.marca, j.ficha;

comment on view public.v_gbp_mencoes_cobertura_mes is
  '205: o buraco da atribuição, visível em vez de inventado — quantas avaliações do mês têm nome '
  'reconhecido e quantas não. É a coluna que impede ler "Thiago 73" como se fosse a loja inteira: se '
  '`sem_nome` é grande, o resto é amostra. Mesma janela (>= 10/2026) da view de menções.';

grant select on public.v_gbp_mencoes_mes          to authenticated;
grant select on public.v_gbp_mencoes_cobertura_mes to authenticated;

do $$
declare v_th int; v_ka int; v_ni int; v_com int; v_sem int; v_total int; v_cols int;
begin
  -- a) os números da view batem com o que eu medi antes de escrever (73 / 7 / 4)
  select mencoes into v_th from public.v_gbp_mencoes_mes where mes='2026-10' and nome='Thiago';
  select mencoes into v_ka from public.v_gbp_mencoes_mes where mes='2026-10' and nome='Kayllaine';
  select mencoes into v_ni from public.v_gbp_mencoes_mes where mes='2026-10' and nome='Nicolly';
  if coalesce(v_th,0) <> 73 or coalesce(v_ka,0) <> 7 or coalesce(v_ni,0) <> 4 then
    raise exception 'PROVA_205_FALHOU: esperava 73/7/4 e achei %/%/%', v_th, v_ka, v_ni;
  end if;

  -- b) CONTROLE POSITIVO do buraco (R-043 §4-A): a cobertura tem de mostrar os DOIS lados. Se `sem_nome`
  --    viesse 0, a tela diria que a loja inteira está atribuída — e são 91 avaliações com 84 citando.
  select avaliacoes, com_nome, sem_nome into v_total, v_com, v_sem
    from public.v_gbp_mencoes_cobertura_mes where mes='2026-10' and marca='lancaster';
  if v_total is null then raise exception 'PROVA_205_FALHOU: cobertura vazia para outubro/lancaster'; end if;
  if v_com + v_sem <> v_total then
    raise exception 'PROVA_205_FALHOU: cobertura nao fecha (% + % <> %)', v_com, v_sem, v_total;
  end if;
  if v_sem = 0 then
    raise exception 'PROVA_205_FALHOU: sem_nome deu 0, e medi 7 avaliacoes de outubro sem nome reconhecido';
  end if;

  -- c) a janela existe: avaliação de setembro NÃO entra
  if exists (select 1 from public.v_gbp_mencoes_mes where mes < '2026-10') then
    raise exception 'PROVA_205_FALHOU: entrou mes anterior a 10/2026, e a atribuicao nao existe la';
  end if;

  -- d) os 3 nomes nascem NÃO confirmados: eu não confirmei nada com ninguém
  if (select count(*) from ops.gbp_nome_citado where confirmado) <> 0 then
    raise exception 'PROVA_205_FALHOU: nome nasceu confirmado, e eu nao confirmei nenhum';
  end if;

  -- e) a view NÃO tem coluna de ranking. Se alguém acrescentar posição/nota, esta prova quebra de
  --    propósito: menção não é desempenho, e a trava é estrutural, não visual.
  select count(*) into v_cols from information_schema.columns
   where table_schema='public' and table_name='v_gbp_mencoes_mes'
     and column_name ~* '(rank|posicao|posição|nota|score|placar|desempenho)';
  if v_cols <> 0 then
    raise exception 'PROVA_205_FALHOU: a view ganhou % coluna de ranking — mencao nao e desempenho', v_cols;
  end if;

  -- f) nada disto é legível por anon, e a equipe lê
  if pg_catalog.has_table_privilege('anon','public.v_gbp_mencoes_mes','select')
  or pg_catalog.has_table_privilege('anon','public.v_gbp_mencoes_cobertura_mes','select')
  or pg_catalog.has_table_privilege('anon','ops.gbp_nome_citado','select') then
    raise exception 'PROVA_205_FALHOU: abri algo para anon';
  end if;
  if not pg_catalog.has_table_privilege('authenticated','ops.gbp_nome_citado','select') then
    raise exception 'PROVA_205_FALHOU: sem grant na tabela, a view invoker daria 403 em vez de vazio';
  end if;
end $$;

commit;
