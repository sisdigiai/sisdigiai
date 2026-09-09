-- 101 — motivo APOSENTADO deixa de aceitar registro novo
--
-- ⚠ NÃO APLICADA. Aguarda o "pode" do dono.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- FURO NO MEU PRÓPRIO DESENHO, achado pelo Orquestrador Geral ao TESTAR a 096
-- ═══════════════════════════════════════════════════════════════════════════
-- Ele marcou um lead com `preco`, que está `ativo = false`, e **a FK aceitou**.
-- Eu tinha escrito no comment da coluna: *"false ESCONDE da tela e PRESERVA o
-- histórico"* — e implementei só a segunda metade. A primeira ficou por conta da
-- tela.
--
-- É o mesmo erro que passei o dia a apontar nos outros, aplicado a mim:
-- **guarda que só existe na interface não é guarda** (R-037). O `preco` está
-- inativo justamente porque não se sabe se a objeção existe; se a RPC, um import
-- ou a tela do MKT o gravarem, o relatório de perdas ganha um motivo que ninguém
-- confirmou — que era exatamente o que o `ativo = false` devia impedir.
--
-- POR QUE TRIGGER E NÃO CHECK/FK:
--   * a FK só pergunta "existe?", não "está ativo?";
--   * um CHECK não pode consultar outra tabela;
--   * e a regra é assimétrica: linha ANTIGA com motivo aposentado tem de
--     continuar válida (é o histórico que a 096 promete preservar), só o registro
--     NOVO é que não pode usá-lo. Trigger é a única forma que distingue os dois.

begin;

create or replace function ops.tg_motivo_perda_ativo()
returns trigger
language plpgsql
as $function$
declare v_ativo boolean;
begin
  -- Só interessa quando o motivo é DEFINIDO ou MUDA. Update que não toca o
  -- motivo passa livre, senão editar o telefone de um lead perdido há um ano
  -- falharia porque o motivo dele foi aposentado no mês passado.
  if new.motivo_perda is null then return new; end if;
  if tg_op = 'UPDATE' and new.motivo_perda is not distinct from old.motivo_perda then
    return new;
  end if;

  select ativo into v_ativo from ops.motivos_perda where chave = new.motivo_perda;
  if v_ativo is false then
    raise exception 'Motivo de perda "%" está aposentado e não aceita registro novo. Motivos ativos: %',
      new.motivo_perda,
      (select string_agg(chave, ', ' order by ordem) from ops.motivos_perda where ativo)
      using errcode = '23514';
  end if;
  return new;
end $function$;

drop trigger if exists motivo_perda_ativo on ops.commercial_leads;
create trigger motivo_perda_ativo
  before insert or update of motivo_perda on ops.commercial_leads
  for each row execute function ops.tg_motivo_perda_ativo();

comment on column ops.motivos_perda.ativo is
  'false = APOSENTADO: some da tela E o banco recusa registro NOVO com ele (trigger motivo_perda_ativo, 101). Linhas antigas continuam válidas — é o histórico que esta tabela existe para preservar. Antes da 101 a recusa era só da tela, e tela não é guarda.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS DEPOIS DE APLICAR — por execução, em lead descartável
-- ═══════════════════════════════════════════════════════════════════════════
--   a) marcar perdido com `medo_mudanca` (ativo) → grava;
--   b) marcar perdido com `preco` (aposentado) → **23514** com a lista dos ativos
--      na mensagem (antes da 101, isto GRAVAVA — é o furo);
--   c) lead já gravado com um motivo que DEPOIS foi aposentado: editar OUTRO
--      campo dele → passa (o histórico não vira refém da aposentadoria);
--   d) motivo fora da lista → continua 23503 da FK, como na 096.
--
-- E a (c) é a que eu erraria se tivesse escrito o trigger com pressa: sem o
-- `is not distinct from`, aposentar um motivo tornaria imutável todo lead que já
-- o usasse — o oposto de "preserva o histórico".
