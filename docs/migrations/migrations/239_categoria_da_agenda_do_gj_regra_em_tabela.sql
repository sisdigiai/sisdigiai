-- Categoria na agenda do GJ: a regra mora em TABELA, não em constante (23/11/2026).
--
-- Contrato: `Cockpit/controle/contrato-categoria-da-agenda-2026-11-23.md`, mapa fechado com o Geral
-- no mesmo dia e "pode" do dono no canal do app.
--
-- POR QUE EM TABELA: a lista de categorias é fixa, mas o que cai em cada uma muda com o tempo — e
-- mudar categoria não pode exigir deploy de edge function. Regra em constante é regra que ninguém
-- acha quando precisa mexer.
--
-- O QUE FOI MEDIDO ANTES DE ESCREVER ESTE MAPA (e derrubou duas suposições):
--   · `ops.ordem_do_dia` NÃO tem coluna `agente` — 1.731 linhas, zero casando com `ops.controle_itens`.
--     Não existe "área do agente dono" para consultar; o que existe em toda linha é `origem_tipo`.
--   · Lendo os títulos reais de 30 dias: `funil` é sobretudo publicação atrasada do MKT e custo de
--     infra (NÃO é `vendas`), e `sentinela` é divergência de custo, despesa sem importação e fila de
--     travas (NÃO é `seguranca`).
--
-- A RECUSA DELIBERADA: linha sem área clara sai SEM o campo. O GJ marca `outros` e o
-- `v_saude_origens` acusa. Mandar categoria errada é pior que não mandar — o alarme dele existe para
-- a fonte que esqueceu, não para a fonte que mentiu.
create table if not exists ops.gj_categoria_regra (
  id         smallserial primary key,
  ordem      smallint not null,
  campo      text     not null check (campo in ('origem_tipo', 'titulo_prefixo')),
  padrao     text     not null,
  categoria  text     not null check (categoria in ('postagem', 'vendas', 'seguranca', 'produto', 'financeiro', 'pessoal')),
  nota       text,
  ativo      boolean  not null default true,
  criado_em  timestamptz not null default now(),
  unique (campo, padrao)
);

comment on table ops.gj_categoria_regra is
  'Como cada evento da ordem do dia vira `categoria` na agenda do GJ. Regra em tabela para mudar sem deploy. Sem regra que case, o evento sai SEM o campo e o GJ marca `outros` — de propósito.';

insert into ops.gj_categoria_regra (ordem, campo, padrao, categoria, nota) values
  (10, 'titulo_prefixo', 'MKT:',        'postagem', 'alerta de publicação atrasada do motor do MKT; é trabalho de postagem, qualquer que seja a origem_tipo'),
  (20, 'origem_tipo',    'roadmap',     'produto',  'marco de roadmap do app'),
  (30, 'origem_tipo',    'backlog',     'produto',  'obra de app com data'),
  (40, 'origem_tipo',    'reconfirmar', 'produto',  'ficha de app vencida, tela com dado parado — higiene do produto')
on conflict (campo, padrao) do update
  set ordem = excluded.ordem, categoria = excluded.categoria, nota = excluded.nota, ativo = true;

-- `pendencia`, `funil`, `sentinela` e `gate` ficam de fora de propósito: medidos, não têm área única.

-- A regra aplicada onde ela mora. A porta do GJ lê esta vista, não a tabela crua.
create or replace view ops.ordem_do_dia_evento with (security_invoker = true) as
select o.id, o.dia, o.bloco, o.posicao, o.titulo, o.porque, o.estado, o.dono,
       (select r.categoria
          from ops.gj_categoria_regra r
         where r.ativo
           and ((r.campo = 'origem_tipo'    and o.origem_tipo = r.padrao)
             or (r.campo = 'titulo_prefixo' and o.titulo like r.padrao || '%'))
         order by r.ordem
         limit 1) as categoria
from ops.ordem_do_dia o;

comment on view ops.ordem_do_dia_evento is
  'Ordem do dia com a categoria já resolvida pela tabela de regra. `categoria` nula quer dizer "sem área clara" — a porta então NÃO manda o campo, e o GJ marca `outros`.';

grant select on ops.ordem_do_dia_evento to service_role;
grant select on ops.gj_categoria_regra to service_role;

-- Prova: quantos eventos ganham categoria e quantos saem sem o campo, por origem.
select coalesce(categoria, '(sem o campo)') as categoria, count(*) as eventos
from ops.ordem_do_dia_evento
where dono = 'humano'
group by 1
order by 2 desc;
