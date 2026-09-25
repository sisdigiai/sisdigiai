-- 156 — o vocabulário de maturidade ganha três estados reais: parado, aposentado, estudo
--
-- ✔ APLICADA em 25/09/2026 às 00:02:47 BRT, reensaiada antes. Medido depois: runner passou de 18 para 25 fichas,
--   recusadas = 0 e não declarados = 0; entraram easy-idiomas/melloeyewear/qual_foto (parado), normalizacao_clientes
--   (aposentado) e trade_lab (estudo).
--
-- (Escrita como NÃO APLICADA.) Palavra do **Orquestrador Geral** (25/09), não do dono — ele dormiu e delegou ao Geral o que
--   estivesse dentro de decisão já escrita. Mudança aditiva e reversível (só amplia um CHECK); nenhum dado muda.
--   O dono revê de manhã e, se discordar, basta a migration inversa.
--
-- POR QUE: a 140 fixou 5 valores (ideia · protótipo · em uso interno · em uso externo · à venda). Ao declarar as
--   fichas dos apps sem agente, o Geral escreveu naturalmente "parado", "aposentado" e "estudo" — três estados que
--   a lista não sabe dizer. Resultado medido em 25/09 00:00: 7 fichas recusadas pelo runner e 7 apps de volta à
--   invisibilidade no Portfólio (easy-idiomas, import_design, melloeyewear, nipo_school, normalizacao_clientes,
--   qual_foto, trade_lab). Vocabulário que não descreve a realidade obriga quem preenche a mentir ou a ficar de fora.
--
-- O QUE NÃO ENTRA, de propósito: "material" (import_design não é app, é acervo — o Geral corrigiu para "em uso
--   interno") e "piloto" (cabe em "em uso externo"; nipo_school corrigido). Ampliar vocabulário sem critério
--   devolve o problema em outra forma: cada um inventa a própria palavra e o agrupamento morre.
--
-- EFEITO NA TELA (pedido do Geral): 'estudo' e 'parado' ficam fora do bloco comercial do Portfólio; 'aposentado'
--   só no histórico. Isso é mudança de tela e fica para o turno do dono, que confere no navegador.

begin;

do $$
begin
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'ops.apps'::regclass and conname = 'apps_maturidade_check') ilike '%estudo%' then
    raise exception 'o CHECK ja tem os valores novos — a 156 ja foi aplicada?';
  end if;
end $$;

alter table ops.apps drop constraint apps_maturidade_check;
alter table ops.apps add constraint apps_maturidade_check check (maturidade in (
  'ideia', 'protótipo', 'em uso interno', 'em uso externo', 'à venda',
  'parado',      -- existiu, não morreu e ninguém toca: não é ideia nem uso
  'aposentado',  -- tirado de circulação de propósito; fica no histórico
  'estudo'       -- investigação com critério de morte, não produto (ex.: trade_lab, ADR-0063)
));

comment on column ops.apps.maturidade is
  '140/156: ideia · protótipo · em uso interno · em uso externo · à venda · parado · aposentado · estudo. '
  'Valor fora da lista é recusado pelo runner e o app aparece na Hoje como ficha recusada — nunca some calado.';

do $$
begin
  -- os três novos passam
  insert into ops.apps (slug, nome, ficha_fonte, declarado_em, maturidade)
  values ('prova_156a', 'Prova 156', 'Cockpit/Apps/prova_156/ficha.md', current_date, 'parado'),
         ('prova_156b', 'Prova 156', 'Cockpit/Apps/prova_156/ficha.md', current_date, 'aposentado'),
         ('prova_156c', 'Prova 156', 'Cockpit/Apps/prova_156/ficha.md', current_date, 'estudo');
  -- e o que não é vocabulário segue barrado
  begin
    insert into ops.apps (slug, nome, ficha_fonte, declarado_em, maturidade)
    values ('prova_156d', 'Prova 156', 'Cockpit/Apps/prova_156/ficha.md', current_date, 'material');
    raise exception 'PROVA_156_FALHOU: valor fora da lista foi aceito';
  exception when check_violation then null;
  end;
  delete from ops.apps where slug like 'prova_156%';
  if (select count(*) from ops.apps where slug like 'prova_156%') <> 0 then
    raise exception 'PROVA_156_FALHOU: sobrou linha de prova';
  end if;
end $$;

commit;
