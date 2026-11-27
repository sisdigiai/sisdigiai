-- 277 — A chave do digiai para PEDIR coleta aos motores, e a lista de quem recebe.
--
-- De onde vem: o dono, 27/11/2026 — "clico em cada app para atualizar, não é nada automático" e
-- "pode fazer". Ele quer um comando só no painel que mande os motores coletarem.
--
-- POR QUE ASSINATURA, E NÃO CHAVE COLADA: o Limelight mediu e recusou a porta aberta, com razão. A
-- coleta deles bate na MESMA cota de Graph, TikTok e YouTube que a PUBLICAÇÃO usa — 43 s por rodada,
-- 565 mídias só da Lancaster. Porta pública não derrubaria só a coleta: derrubaria a publicação. E a
-- chave anônima deles viaja no pacote público de três apps.
--
-- O DESENHO É O ESPELHO DO QUE JÁ EXISTE. A `lousa-entrada` recebe de Pulso e Limelight: cada motor
-- gera o par Ed25519 no próprio projeto, a privada nunca sai de lá, e a PÚBLICA mora no banco do
-- digiai. Aqui é a mesma peça virada: o digiai gera o par dentro do PRÓPRIO projeto, a privada fica
-- nesta tabela (só service role lê — a edge function), e a pública vai para cada motor cadastrar.
-- Nenhum app guarda segredo de outro. **O dono não cola nada** (R-042).
--
-- AUTORIZAÇÃO VEM DO BANCO (R-037): ligar ou desligar um motor é uma linha em `ops.motor_coleta`,
-- sem deploy. Motor que não estiver `ativo` não é chamado, e portão que abre no erro não é portão.

create table if not exists ops.chave_propria (
  porta           text primary key,
  privada_pkcs8   text not null,
  publica_spki    text not null,
  criada_em       timestamptz not null default now(),
  ativa           boolean not null default true
);
comment on table ops.chave_propria is
  'Par Ed25519 do DIGIAI para assinar chamadas de saída. A privada só é lida pela service role (edge function); nunca sai por API. Ver 277.';

alter table ops.chave_propria enable row level security;
-- Sem policy nenhuma: ninguém com JWT lê. A service role passa por cima da RLS, e é só ela que precisa.

create table if not exists ops.motor_coleta (
  nome          text primary key,
  url           text not null,
  modo          text not null check (modo in ('assinado', 'rpc')),
  -- Só para `modo = 'rpc'`: a chave ANÔNIMA do motor, que é pública por desenho e que o painel já usa
  -- para ler os espelhos dele. Não é segredo; está aqui para a função não precisar de deploy quando
  -- um motor entrar.
  chave_anon    text,
  ativo         boolean not null default false,
  ultima_chamada timestamptz,
  ultima_resposta jsonb,
  observacao    text
);
comment on table ops.motor_coleta is
  'Quem o botão de coleta chama, e como. Ligar/desligar motor é uma linha, sem deploy (R-037). Ver 277.';

alter table ops.motor_coleta enable row level security;

-- Quem usa o painel pode VER a lista (para a tela dizer quais motores respondem), nunca mexer.
drop policy if exists motor_coleta_leitura_staff on ops.motor_coleta;
create policy motor_coleta_leitura_staff on ops.motor_coleta
  for select to authenticated using (public.is_staff());

-- Os motores nascem desligados, com a observação do que falta. Ligar é do dono, depois que o portão
-- do lado de lá existir — a palavra de cada portão é no canal de cada motor (R-037).
insert into ops.motor_coleta (nome, url, modo, ativo, observacao) values
  ('Limelight', 'https://gfdpvasbrxwulvpvyfvr.supabase.co/functions/v1/coletar-agora', 'assinado', false,
   'espera o portao no canal do Limelight; eles verificam a assinatura contra a publica do digiai'),
  ('Pulso', 'https://nlcisbfdiokmipyihtuz.supabase.co/rest/v1/rpc/pedir_coleta_pulso', 'rpc', false,
   'espera o portao no canal do Pulso; a RPC so grava o pedido se a ultima coleta tiver mais de 15 min')
on conflict (nome) do nothing;

-- A PÚBLICA é pública: quem opera o painel precisa poder lê-la para mandar a cada motor cadastrar.
-- A privada não tem caminho de saída por API nenhuma.
create or replace function public.fn_chave_publica_coleta()
returns text
language sql
stable
security definer
set search_path = ops, public
as $$
  select publica_spki from ops.chave_propria
   where porta = 'coleta' and ativa and public.is_staff()
$$;

revoke all on function public.fn_chave_publica_coleta() from public, anon;
grant execute on function public.fn_chave_publica_coleta() to authenticated;

comment on function public.fn_chave_publica_coleta() is
  'A chave PUBLICA do digiai para os motores cadastrarem. Devolve nulo para quem nao e staff. Ver 277.';
