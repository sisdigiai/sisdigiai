-- 116 — o "próximo passo" de 247 leads deixa de citar o preço velho da OSI
--
-- ⚠ NÃO APLICADA, e NÃO APLICAR sem a palavra do dono dita no canal do orquestrador
--    do app digiai. É UPDATE em massa em dado real de lead.
--    Tabela minha (ops.commercial_leads) — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MUDA
-- ═══════════════════════════════════════════════════════════════════════════
-- `next_step` desses leads não é anotação sobre uma pessoa: é um de dois textos de
-- modelo, gravados em lote na raspagem. Medido em 10/09/2026, por igualdade EXATA:
--
--   "Primeiro contato — abordar via OSI (R$48,50) como porta de entrada do Clearix"
--        139 vivos · 0 saídos
--   "QUENTE (regiao Suzano) — abordar via OSI (R$48,50) como porta de entrada do Clearix"
--        108 vivos · 1 saído
--   outros next_step com 48,50 fora destes dois ............ 0
--
-- Os textos novos TIRAM o preço em vez de o trocar por R$ 49. Foi um preço embutido
-- em 248 linhas que envelheceu; embutir o novo repete o mesmo defeito na próxima
-- mudança. O preço mora num sítio só: `academy.products` (114).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O PERIGO QUE NÃO ESTÁ NO TEXTO: `updated_at`
-- ═══════════════════════════════════════════════════════════════════════════
-- `ops.commercial_leads` tem o trigger `set_updated_at` (BEFORE UPDATE,
-- incondicional). Um update em 247 leads marcava os 247 como tocados agora — e a
-- tela Comercial calcula "parado há N dias" e o painel "leads esfriando" a partir
-- de `updated_at`. O sinal de lead parado desaparecia de uma vez, e ninguém via
-- porquê. É o mesmo defeito que a trava da 093 apanhou. O trigger é desligado só
-- durante o update, dentro da transação, e a trava final prova por comparação linha
-- a linha que nenhum `updated_at` mudou.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE FICA, e por quê
-- ═══════════════════════════════════════════════════════════════════════════
--   • o 1 lead SAÍDO da base com o modelo "QUENTE": fora de todas as views; o
--     registo de um lead descartado fica como estava;
--   • o lead ca8095a3, com "R$48,50" nas NOTAS: "1ª msg fria enviada 11/06 ... via
--     WhatsApp Web (lote 1, mensagem padrão Taty 25 anos R$48,50)". É o registo de
--     uma mensagem que FOI enviada com aquele preço. Corrigir falsificava o
--     histórico do contacto — o preço mudou depois, a mensagem não.

begin;

create temp table _antes_116 on commit drop as
  select id, updated_at, next_step from ops.commercial_leads
  where deleted_at is null
    and next_step in ('Primeiro contato — abordar via OSI (R$48,50) como porta de entrada do Clearix',
                      'QUENTE (regiao Suzano) — abordar via OSI (R$48,50) como porta de entrada do Clearix');

do $$
declare n1 int; n2 int;
begin
  select count(*) filter (where next_step = 'Primeiro contato — abordar via OSI (R$48,50) como porta de entrada do Clearix'),
         count(*) filter (where next_step = 'QUENTE (regiao Suzano) — abordar via OSI (R$48,50) como porta de entrada do Clearix')
    into n1, n2 from _antes_116;
  if n1 <> 139 or n2 <> 108 then
    raise exception 'Esperava 139 + 108 leads vivos com os dois modelos (medido em 10/09): encontrei % + %. A base mudou — medir de novo antes de aplicar.', n1, n2;
  end if;
end $$;

alter table ops.commercial_leads disable trigger set_updated_at;

update ops.commercial_leads l set
  next_step = case l.next_step
    when 'Primeiro contato — abordar via OSI (R$48,50) como porta de entrada do Clearix'
      then 'Primeiro contato — abordar via OSI como porta de entrada do Clearix'
    when 'QUENTE (regiao Suzano) — abordar via OSI (R$48,50) como porta de entrada do Clearix'
      then 'QUENTE (regiao Suzano) — abordar via OSI como porta de entrada do Clearix'
  end
from _antes_116 a
where a.id = l.id;

alter table ops.commercial_leads enable trigger set_updated_at;

do $$
declare n int;
begin
  -- a mudança que se queria
  select count(*) into n from ops.commercial_leads
   where deleted_at is null and next_step ~* '48[,.]50';
  if n > 0 then
    raise exception '% lead(s) vivo(s) ainda com 48,50 no next_step.', n;
  end if;

  select count(*) into n from ops.commercial_leads l join _antes_116 a on a.id = l.id
   where l.next_step in ('Primeiro contato — abordar via OSI como porta de entrada do Clearix',
                         'QUENTE (regiao Suzano) — abordar via OSI como porta de entrada do Clearix');
  if n <> 247 then
    raise exception 'Esperava 247 leads com o texto novo, encontrei %.', n;
  end if;

  -- a mudança que NÃO se queria: é esta a razão de ser da trava
  select count(*) into n from ops.commercial_leads l join _antes_116 a on a.id = l.id
   where l.updated_at is distinct from a.updated_at;
  if n > 0 then
    raise exception '% lead(s) tiveram updated_at alterado — o "parado há N dias" desses leads seria apagado.', n;
  end if;

  -- o trigger voltou; se não voltasse, todo update futuro deixava de marcar updated_at
  select count(*) into n from pg_trigger
   where tgrelid = 'ops.commercial_leads'::regclass and tgname = 'set_updated_at' and tgenabled = 'O';
  if n <> 1 then
    raise exception 'set_updated_at não ficou religado em ops.commercial_leads.';
  end if;

  select count(*) into n from ops.commercial_leads
   where coalesce(next_step, '') like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception '% lead(s) com acento corrompido no next_step (U+FFFD).', n;
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) 0 leads vivos com 48,50 no next_step; 139 + 108 com os textos novos;
--   b) `updated_at` idêntico antes/depois nos 247 — a trava faz, mas convém ver
--      que o "parado há N dias" da tela Comercial continua a mostrar os mesmos dias;
--   c) um update qualquer num lead DEPOIS de aplicar volta a mexer em updated_at
--      (o trigger religou de facto, não só no catálogo);
--   d) o lead saído e as notas do ca8095a3 INTACTOS.
