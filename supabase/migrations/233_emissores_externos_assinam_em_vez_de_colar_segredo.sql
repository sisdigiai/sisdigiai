-- 233 — Emissor externo assina, em vez de o dono colar segredo (17/11/2026).
--
-- POR QUE: três processos fora do banco precisam escrever nele — o motor do DIGIAI Cortes, o Pulso e o
-- Limelight. O desenho que estava em pé pedia a **chave de serviço** no `.env` de cada um; essa chave passa
-- por cima da RLS do banco INTEIRO, e a R-042 diz que ela mora só em servidor. O dono estranhou em 17/11 e
-- não colou — e estava certo.
--
-- O QUE ENTRA NO LUGAR: assinatura Ed25519. Cada emissor gera o par dentro do próprio projeto, a chave
-- **privada nunca sai de lá**, e a **pública** — que não é segredo — vem por arquivo no Cockpit e é
-- cadastrada aqui. **O dono não cola nada.** Hoje havia 3 segredos esperando a mão dele; este desenho
-- derruba dois.
--
-- MEDIDO ANTES DE DESENHAR, e não suposto: publiquei uma sonda no runtime das edge functions e apaguei em
-- seguida. `supabase-edge-runtime-1.79.1 (Deno 2.1.4)` gera, assina, exporta, importa e **verifica Ed25519
-- no WebCrypto nativo**, sem biblioteca. Chave pública SPKI: 44 bytes.
--
-- POR QUE A CHAVE PÚBLICA MORA NO BANCO e não numa constante da função: autorização vem do banco (R-037).
-- Desligar um emissor vira uma linha — sem deploy, sem esperar ninguém. E a função, ao não conseguir ler
-- esta tabela, **recusa**: portão que abre no erro não é portão.

create table if not exists ops.emissor_externo (
  nome            text primary key,
  chave_publica   text not null,                 -- SPKI em base64, 44 bytes depois de decodificar
  ativo           boolean not null default true,
  descricao       text,
  registrado_em   timestamptz not null default now(),
  registrado_por  text not null,
  ultima_entrega  timestamptz,
  constraint chave_tem_cara_de_ed25519 check (
    -- 44 bytes em base64 são 60 caracteres com o padding; o prefixo MCowBQYDK2Vw é o cabeçalho SPKI do
    -- Ed25519. Não é criptografia, é portaria: impede cadastrar um texto qualquer no lugar de uma chave.
    chave_publica like 'MCowBQYDK2Vw%' and length(chave_publica) between 56 and 64
  )
);

comment on table ops.emissor_externo is
  'Quem pode escrever no banco da casa vindo de fora, e com que chave pública. Privada nunca entra aqui — '
  'se alguém colar uma, está no lugar errado e tem de ser trocada.';
comment on column ops.emissor_externo.ultima_entrega is
  'Carimbo da última entrega aceita. Emissor que nunca entregou tem nulo — e nulo aqui é "nunca", não "hoje".';

alter table ops.emissor_externo enable row level security;
drop policy if exists le_staff on ops.emissor_externo;
create policy le_staff on ops.emissor_externo for select to authenticated using (public.is_staff());
grant select on ops.emissor_externo to authenticated;

-- A função de entrada precisa LER a chave e CARIMBAR a última entrega — e nada mais. `insert` e `delete`
-- ficam de fora de propósito: cadastrar e remover emissor é migration, não é coisa que uma função com a
-- chave de serviço deva poder fazer sozinha.
-- Achado medindo, não lendo: a função já lia (o `select` vem por padrão da Supabase) e o carimbo falhava
-- **em silêncio**, porque `service_role` não tinha `update`. O código engolia o erro — consertado junto.
grant select, update on ops.emissor_externo to service_role;

create or replace view public.v_emissores_externos
with (security_invoker = true) as
select nome, ativo, descricao, registrado_em, registrado_por, ultima_entrega,
       ((now() at time zone 'America/Sao_Paulo')::date
         - (ultima_entrega at time zone 'America/Sao_Paulo')::date) as dias_sem_entregar,
       -- A chave pública NÃO sai na view. Ela não é segredo, mas também não é assunto de tela: quem
       -- precisa dela é a função, que lê a tabela.
       left(chave_publica, 16) || '…' as chave_inicio
  from ops.emissor_externo;

grant select on public.v_emissores_externos to authenticated;

-- O Limelight já entregou a dele em 17/11 (Cockpit/chaves-publicas/lousa-limelight.txt). Conferida por mim
-- antes de cadastrar: 44 bytes SPKI, tipo ed25519, sha256 3990c312…438f5e0e, e assinatura falsa recusada.
insert into ops.emissor_externo (nome, chave_publica, descricao, registrado_por)
values ('limelight', 'MCowBQYDK2VwAyEAXA3E8CHMOtCx1axLODWlus03nA/v4MX0KJspacpD298=',
        'Motor do Limelight Studio: segundo destino do mesmo envio que vai à torre do GJ (lousa).',
        'app digiai, conferida em 17/11/2026')
on conflict (nome) do nothing;

-- PROVA 1 — a portaria recusa o que não tem cara de chave Ed25519. Sem ela, um "ainda vou pegar a chave"
-- entraria como se fosse chave e a função tentaria verificar assinatura contra um texto qualquer.
do $$
declare v_recusou boolean := false;
begin
  begin
    insert into ops.emissor_externo (nome, chave_publica, registrado_por)
    values ('prova da 233', 'isto-nao-e-uma-chave', 'prova');
  exception when check_violation then v_recusou := true;
  end;
  if not v_recusou then
    delete from ops.emissor_externo where nome = 'prova da 233';
    raise exception 'PROVA_233_FALHOU: aceitou texto qualquer como chave publica';
  end if;
end $$;

-- PROVA 2 — o Limelight está cadastrado e ativo, com a chave exata do arquivo do Cockpit.
do $$
declare r record;
begin
  select chave_publica, ativo into r from ops.emissor_externo where nome = 'limelight';
  if r is null or not r.ativo then
    raise exception 'PROVA_233_FALHOU: limelight ausente ou inativo';
  end if;
  if r.chave_publica <> 'MCowBQYDK2VwAyEAXA3E8CHMOtCx1axLODWlus03nA/v4MX0KJspacpD298=' then
    raise exception 'PROVA_233_FALHOU: a chave cadastrada nao e a do arquivo do Cockpit';
  end if;
end $$;

-- PROVA 3 — a view não expõe a chave inteira, e `authenticated` não escreve na tabela. A chave pública não
-- é segredo, mas tela que mostra chave convida a copiar chave, e cadastro se faz por migration.
do $$
declare v text;
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'v_emissores_externos'
                and column_name = 'chave_publica') then
    raise exception 'PROVA_233_FALHOU: a view esta expondo a chave inteira';
  end if;
  select string_agg(privilege_type, ', ') into v from information_schema.role_table_grants
   where grantee = 'authenticated' and table_schema = 'ops' and table_name = 'emissor_externo'
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE');
  if v is not null then
    raise exception 'PROVA_233_FALHOU: authenticated escreve na tabela de emissores: %', v;
  end if;
end $$;
