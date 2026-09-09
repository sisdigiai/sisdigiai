-- 096 — ops.motivos_perda: fechar a lista de motivo de perda
--
-- ⚠ NÃO APLICADA, e NÃO APLICÁVEL COMO ESTÁ — falta a semente. Ver §0.
--    Estrutura pedida pelo Orquestrador Geral (09/09) para adiantar o desenho.
--    A semente sai do dono, com as palavras dele. O MKT pergunta no canal dele.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §0 — "ESTRUTURA SEM SEMENTE NÃO TRAVA NADA" — trava, sim
-- ═══════════════════════════════════════════════════════════════════════════
-- Foi-me dito que a estrutura pode entrar sozinha porque não bloqueia ninguém.
-- Não é o caso, e o efeito é o oposto do pretendido:
--
--   * a CHECK que já existe (`commercial_leads_perdido_exige_motivo`) exige que
--     `motivo_perda` esteja preenchido quando `stage = 'perdido'`;
--   * a FK que esta migration acrescenta exige que esse valor EXISTA na lista;
--   * com a lista VAZIA, nenhum valor existe.
--
--   Resultado: aplicar só a estrutura torna IMPOSSÍVEL marcar um lead como
--   perdido. Não com erro claro na tela — com violação de FK no meio do salvar.
--
-- Por isso a FK vem DEPOIS de uma trava que recusa aplicar com a tabela vazia.
-- Ou entra tudo (estrutura + semente), ou não entra nada. Meio caminho aqui é
-- pior que caminho nenhum: hoje o campo é livre e funciona; com a estrutura
-- sozinha ele para de funcionar.
--
-- ⚠ Isto é o mesmo formato do que o MKT achou hoje ("caro" em notes = 6 leads,
--    todos "Óticas Carol"): a conclusão parecia segura até alguém olhar linha a
--    linha. "Não trava nada" parecia seguro até alguém seguir a FK até o CHECK.

begin;

create table if not exists ops.motivos_perda (
  chave      text primary key,
  rotulo     text not null,
  ativo      boolean not null default true,
  ordem      integer not null default 100,
  criado_em  timestamptz not null default now()
);

comment on table ops.motivos_perda is
  'Lista fechada de motivos de perda de lead. Existe como TABELA e não como CHECK IN porque motivo de perda é lista que APRENDE: a razão real pela qual uma ótica diz não vai ser descoberta nas primeiras conversas, e com CHECK cada descoberta viraria migration — atrito que faz a pessoa escolher "outro" para sempre, que é o campo livre de volta com outro nome. Acrescentar motivo é INSERT.';
comment on column ops.motivos_perda.ativo is
  'false ESCONDE da tela e PRESERVA o histórico. Nunca apagar linha em uso — ver a FK com on delete restrict.';
comment on column ops.motivos_perda.ordem is
  'Ordem de exibição na tela. Não tem significado de negócio; serve para o motivo mais comum ficar em cima.';

-- ─── SEMENTE — PREENCHER ANTES DE APLICAR ───────────────────────────────────
-- Sai do dono, com as palavras dele, e a mesma lista vai para a tela do MKT.
-- Não invento motivo de perda de uma venda que ainda não aconteceu: quem está
-- falando com as óticas é quem sabe por que elas dizem não.
--
-- insert into ops.motivos_perda (chave, rotulo, ordem) values
--   ('preco',            '<palavras do dono>', 10),
--   ('sem_resposta',     '<palavras do dono>', 20),
--   ('...',              '...',                30)
-- on conflict (chave) do nothing;
-- ────────────────────────────────────────────────────────────────────────────

-- TRAVA: sem semente, a FK abaixo tornaria impossível marcar lead como perdido.
do $$
declare n int;
begin
  select count(*) into n from ops.motivos_perda where ativo;
  if n = 0 then
    raise exception 'ops.motivos_perda está vazia: aplicar a FK agora impede marcar qualquer lead como perdido (a CHECK exige motivo e a FK exige que ele exista). Preencher a semente — palavras do dono — antes de aplicar a 096.';
  end if;
end $$;

alter table ops.commercial_leads
  drop constraint if exists commercial_leads_motivo_perda_fk;
alter table ops.commercial_leads
  add constraint commercial_leads_motivo_perda_fk
  foreign key (motivo_perda) references ops.motivos_perda(chave)
  on delete restrict;

comment on column ops.commercial_leads.motivo_perda is
  'Motivo da perda, da lista fechada ops.motivos_perda (FK, on delete restrict). NULL enquanto o lead não está perdido; a CHECK commercial_leads_perdido_exige_motivo obriga o preenchimento quando stage = perdido.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE `on delete restrict` E `ativo`, e não delete
-- ═══════════════════════════════════════════════════════════════════════════
-- Motivo em uso não pode sumir: se sumisse, os leads perdidos por ele ficariam
-- sem explicação, e o relatório do trimestre passaria a somar errado sem avisar.
-- `restrict` faz o banco recusar; `ativo = false` é a saída certa — some da tela,
-- fica no histórico. As duas coisas juntas: não dá para apagar, dá para aposentar.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS DEPOIS DE APLICAR
-- ═══════════════════════════════════════════════════════════════════════════
--   a) marcar lead como perdido com motivo da lista → grava;
--   b) marcar com motivo fora da lista → violação de FK (é o ponto);
--   c) `delete` de motivo em uso → recusado por restrict;
--   d) `ativo = false` num motivo em uso → some da tela, os leads continuam
--      explicados (é a diferença entre aposentar e apagar);
--   e) lead não perdido continua com motivo_perda NULL, sem reclamação.
