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

-- ─── SEMENTE — palavras do dono, 09/09/2026, canal do MKT ───────────────────
-- Texto original, sem tradução:
--   "medo de mudanças, valor muito alto em clientes do banco antigo,
--    treinamento de funcionarios, modo interno da loja, diferente do app"
--
-- ⚠ UMA DIVERGÊNCIA DE LEITURA QUE PRECISA DO DONO — e é a mais consequente.
-- O MKT leu a frase do meio como DOIS motivos: `preco` ("achou o valor alto") e
-- `migracao_base` ("base de clientes no sistema antigo"). Relendo o original,
-- ela também admite UM só:
--     "valor muito alto EM clientes do banco antigo"
--     = o que é valioso são os CLIENTES que estão no sistema antigo.
-- Nessa leitura não há objeção de preço nenhuma — há objeção de MIGRAÇÃO, e o
-- `preco` teria sido inventado na tradução.
--
-- Isso não é detalhe de rótulo: "achou caro" é a objeção mais consequente que
-- existe para uma empresa que acabou de cortar o preço em 61% (899 → 349). Se
-- ela entrar na lista sem o dono ter dito, o primeiro relatório de perdas vai
-- "confirmar" um problema de preço que ninguém relatou — e a resposta natural a
-- esse relatório é baixar o preço de novo.
--
-- Mantenho os cinco do MKT porque a decisão é do dono, não minha. Mas `preco`
-- fica marcado como `ativo = false` até ele confirmar: assim não aparece na tela,
-- não pode ser escolhido, e não some da lista se ele disser que é isso mesmo.
--
-- ⚠ E NÃO acrescentei `sem_resposta`: o dono não disse. "Não" e "nunca respondeu"
-- são coisas diferentes, e transformar silêncio em recusa é decisão de negócio.
-- Vai como pergunta a ele.
--
-- ORDEM = a ordem em que o dono os disse, e isto é deliberado. O MKT sugeriu
-- ordenar "por frequência esperada", e aí está uma armadilha: na tela, quem marca
-- escolhe rápido e o primeiro ganha viés. Ordenar pela frequência que se ESPERA
-- faz a lista PRODUZIR a frequência que confirma a expectativa. A ordem em que
-- ele pensou neles é o prior menos contaminado que temos — e quando houver
-- frequência real, ela é que manda.
insert into ops.motivos_perda (chave, rotulo, ativo, ordem) values
  ('medo_mudanca',    'Medo de mudar de sistema',              true,  10),
  ('migracao_base',   'Base de clientes está no sistema antigo', true,  20),
  ('treinamento',     'Treinamento da equipe',                 true,  30),
  ('processo_interno','O processo da loja é diferente do app',  true,  40),
  ('preco',           'Achou o valor alto',                    false, 50)
on conflict (chave) do nothing;

comment on column ops.motivos_perda.chave is
  'Slug estável. A lista veio das palavras do dono em 09/09/2026 (canal do MKT), lidas em cinco pelo agente do MKT. `preco` nasce INATIVO: a frase de origem ("valor muito alto em clientes do banco antigo") admite leitura de motivo único de migração, e nesse caso a objeção de preço não foi dita. Ativar só com a palavra do dono.';

-- TRAVA: sem semente, a FK abaixo tornaria impossível marcar lead como perdido.
do $$
declare n int;
begin
  select count(*) into n from ops.motivos_perda where ativo;
  if n = 0 then
    raise exception 'ops.motivos_perda está vazia (ou só com motivos inativos): aplicar a FK agora impede marcar qualquer lead como perdido. Preencher a semente antes de aplicar a 096.';
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
