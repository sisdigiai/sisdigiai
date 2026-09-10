-- 107 — `motivo_rotulo` na v_commercial_leads
--
-- ⚠ NÃO APLICADA. Pedido do MKT, aceite pelo Orquestrador Geral. Chegou depois
--    de a 106 já estar aplicada, por isso é migration própria e não emenda dela.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE RESOLVER O RÓTULO AQUI E NÃO NA TELA
-- ═══════════════════════════════════════════════════════════════════════════
-- Argumento do MKT, e é bom: rótulo derivado no cliente obriga CADA tela a
-- lembrar-se de derivar, e a que esquecer mostra o slug cru (`cadastro_ruim`)
-- **sem se queixar**. Resolver na leitura também faz um rename de rótulo aparecer
-- em todo o lado na chamada seguinte, sem deploy de front.
--
-- ⚠ E o preço, que fica escrito para não virar regra automática: derivar na view
--    CONGELA a regra na definição. Se um dia "perda de verdade" passar a excluir
--    também quem nunca foi contactado, muda-se num sítio — que é a vantagem — e
--    todas as telas mudam sem saber, que é o custo. Aqui compensa: a regra é
--    estável e os consumidores são três, em dois apps. Não generalizar para "toda
--    derivação vai para a view".
--
-- ═══════════════════════════════════════════════════════════════════════════
-- UMA RESTRIÇÃO DO POSTGRES QUE MUDA O RESULTADO — e o pedido não a previa
-- ═══════════════════════════════════════════════════════════════════════════
-- O pedido diz "o join do rótulo na view", ao lado do `motivo_tipo`. Não dá:
-- `create or replace view` **só deixa acrescentar colunas NO FIM** da lista —
-- não deixa inserir no meio, nem renomear, nem trocar tipo. Pôr o rótulo junto do
-- tipo exigiria `drop view` + recriar, e isso **apaga os grants** (e nesta view
-- os grants são a única trava: anon não lê, authenticated lê). Trocar uma trava
-- de acesso pela arrumação das colunas seria um mau negócio.
--
-- Então `motivo_rotulo` entra DEPOIS de `perdido_em`. Quem lê por nome não nota;
-- quem lê por posição notaria — e ninguém aqui lê por posição (o meu store faz
-- `select *` e mapeia por nome; Posto.tsx e Oticas.tsx nomeiam colunas).

begin;

create or replace view public.v_commercial_leads
with (security_invoker = true) as
  select l.id, l.name, l.company, l.product, l.stage, l.source, l.contact,
         l.value_brl, l.owner, l.next_step, l.notes, l.created_at, l.updated_at,
         l.motivo_perda,
         -- Subqueries escalares e não LEFT JOIN: escalar NÃO PODE duplicar linha,
         -- aconteça o que acontecer do outro lado. Aqui `chave` é PK e o join
         -- seria igualmente seguro — mas view que alimenta CONTAGEM é o pior
         -- sítio para depender de uma unicidade que vive noutra migration.
         -- Duas subqueries em vez de um lateral: são duas buscas por PK numa
         -- tabela de 7 linhas, e esse custo não paga trocar um construto que
         -- provadamente não duplica por um que depende do `limit 1` certo.
         (select m.tipo   from ops.motivos_perda m where m.chave = l.motivo_perda) as motivo_tipo,
         l.perdido_em,
         (select m.rotulo from ops.motivos_perda m where m.chave = l.motivo_perda) as motivo_rotulo
  from ops.commercial_leads l
  where l.deleted_at is null
  order by l.created_at desc;

comment on view public.v_commercial_leads is
  'Leads vivos (deleted_at is null). INVOKER: a RLS de ops.commercial_leads é que manda, e é assim que tem de ser — isto é dado de pessoa. CONSUMIDORES: módulo Comercial do digiai (select *), Posto.tsx e Oticas.tsx do digiai_mkt (colunas nomeadas). `motivo_tipo` (106) separa "a ótica disse não" (objeção de mercado) de "o cadastro não presta" (higiene de dado): contar perda de verdade é stage=perdido AND motivo_tipo=perda. `motivo_rotulo` (107) vem pronto de propósito — verdade derivável só é verdade se cada consumidor se lembrar de derivar, e quem esquecer mostra o slug cru sem reclamar. `motivo_rotulo` está no FIM e não junto do tipo porque create or replace view só acrescenta no fim, e recriar apagaria os grants, que aqui são a trava.';

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA SEMÂNTICA
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n_view int; n_nulo int;
begin
  select count(*) into n_view from information_schema.columns
   where table_schema='public' and table_name='v_commercial_leads'
     and column_name in ('motivo_perda','motivo_tipo','motivo_rotulo','perdido_em');
  if n_view <> 4 then
    raise exception 'v_commercial_leads devia expor 4 colunas de saída, expõe %.', n_view;
  end if;

  -- A trava que interessa, e não é a contagem de colunas: esta subquery falha
  -- em SILÊNCIO. Se a chave não casar, devolve null sem erro, a coluna existe,
  -- a migration "aplica com sucesso", e a tela mostra o slug cru. Então exijo
  -- que nenhum lead COM motivo fique sem rótulo. Hoje é 1 lead; a conta é a
  -- mesma quando forem 200.
  select count(*) into n_nulo from public.v_commercial_leads
   where motivo_perda is not null and motivo_rotulo is null;
  if n_nulo > 0 then
    raise exception '% lead(s) com motivo_perda ficaram sem motivo_rotulo — a subquery não casou, e a tela mostraria o slug cru sem reclamar.', n_nulo;
  end if;

  -- Não-regressão do grant: `create or replace view` preservar grant é o que eu
  -- ACHO. Aqui é o que se prova.
  if has_table_privilege('anon','public.v_commercial_leads','select') then
    raise exception 'anon voltou a ler v_commercial_leads.';
  end if;
  if not has_table_privilege('authenticated','public.v_commercial_leads','select') then
    raise exception 'authenticated perdeu o select em v_commercial_leads — a tela ficaria vazia.';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `select motivo_perda, motivo_tipo, motivo_rotulo from v_commercial_leads
--       where motivo_perda is not null` → o lead perdido de hoje traz
--       medo_mudanca / perda / "Medo de mudar de sistema";
--   b) num descartável marcado com `cadastro_ruim` → descarte / "Cadastro
--      quebrado (nome/telefone de outra empresa)";
--   c) `motivo_rotulo` NULO em lead sem motivo (é o correcto: não perdeu, não
--      tem rótulo) e NÃO NULO em todo lead com motivo — a trava já verifica,
--      mas convém ver a linha;
--   d) as contagens da 106 continuam a valer:
--      `count(*) filter (where stage='perdido')` vs
--      `count(*) filter (where stage='perdido' and motivo_tipo='perda')`;
--   e) anon continua sem ler a view, por chamada real e não só pela trava.
--
-- ⚠ NÃO CONSERTA a tela: o front continua a contar "Perdido" por estágio e a
--    não usar rótulo nenhum. Isso é o passe que espera o rename do MKT para
--    `v_motivos_saida` — consumidor + contagens separadas + selector em dois
--    grupos, num commit só.
