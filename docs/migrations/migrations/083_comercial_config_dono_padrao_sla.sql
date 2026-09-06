-- ============================================================
-- 083 — Comercial: dono padrão do lead + SLA (config no banco) e aplicação aos leads sem dono
-- ============================================================
-- Decisão por delegação do orquestrador na ordem noturna de 05/09/2026 (autorização
-- textual do dono: "resolver por completo tudo"). REVERSÍVEL: o dono muda os
-- valores em ops.comercial_config; o owner dos leads pode ser reatribuído.
-- Motivo: 254 de 259 prospects externos estavam sem dono; zero dos que avançaram
-- tinham dono. Trava que não é lida não trava — e campo vazio não é lido.

create table if not exists ops.comercial_config (
  chave text primary key,
  valor jsonb not null,
  descricao text,
  updated_at timestamptz not null default now()
);
comment on table ops.comercial_config is
  'Configuracao da funcao COMERCIAL (nivel DIGIAI). Chaves: owner_padrao, sla_primeiro_toque_horas, sla_segundo_toque_dias. Fonte unica para o app e para o agente comercial; muda aqui, nunca em constante de app (R-037).';
grant select on ops.comercial_config to authenticated;
grant all on ops.comercial_config to service_role;
alter table ops.comercial_config enable row level security;
drop policy if exists comercial_config_le on ops.comercial_config;
create policy comercial_config_le on ops.comercial_config for select to authenticated using (true);

insert into ops.comercial_config (chave, valor, descricao) values
  ('owner_padrao', '"Gilberto (Junior)"', 'Dono padrao de todo lead externo sem dono. Unico humano da funcao comercial em 09/2026.'),
  ('sla_primeiro_toque_horas', '48', 'Prazo para o primeiro contato apos captacao/atribuicao.'),
  ('sla_segundo_toque_dias', '7', 'Prazo para o segundo toque quando o primeiro nao respondeu.')
on conflict (chave) do nothing;

-- Aplicação: todo prospect externo sem dono recebe o dono padrão (reversível)
update ops.commercial_leads
   set owner = 'Gilberto (Junior)',
       notes = coalesce(notes,'') || E'\n[05/09 ordem noturna] owner padrao atribuido pelo orquestrador (ops.comercial_config.owner_padrao)',
       updated_at = now()
 where deleted_at is null and source <> 'interno' and coalesce(owner,'') = '';
