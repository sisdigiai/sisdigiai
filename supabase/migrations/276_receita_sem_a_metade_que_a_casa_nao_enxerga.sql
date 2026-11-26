-- ============================================================
-- 276 — os dois fatos de receita perdem a metade que a casa não enxerga (PREPARADA, NÃO APLICADA)
--
-- DE ONDE VEM: Geral → app digiai, 25/11 21h51. A folha única (commit `48366f75`) suspendeu
-- **"713 deles sem nenhum contato da loja em 90 dias"** e **"64 desses clientes sem contato"**.
-- Motivo, medido pelo eco: **só 140 de 2.093 mensagens digitadas no celular da loja ficam ligadas
-- ao cliente**. O número do "sem contato" não vê **84%** do contato que existe.
--
-- OS DOIS FATOS SÃO MEUS, DA 271. E o erro não é o número: é o que a frase faz o leitor concluir.
-- "713 sem nenhum contato da loja" soa como *a loja não falou com eles*. O que ele mede de verdade
-- é *a casa não consegue ver se falou*. São coisas opostas: a primeira manda ligar para 713
-- pessoas; a segunda manda consertar o registro do WhatsApp. Publicar a primeira mandaria a loja
-- trabalhar em cima de uma cegueira nossa.
--
-- Ontem eu já tinha escrito na `fonte` que parte da queda de 912 para 713 vinha de o contato
-- *passar a ser enxergado*, não de mais gente chamada. Era a mesma falha, vista pequena: eu tratei
-- como ressalva o que era motivo para não publicar. **Ressalva não conserta frase errada.**
--
-- O QUE FICA: "802 clientes com a receita vencida no último ano" e "88 receitas vencem nos próximos
-- 30 dias" — os dois com a data de 24/11/2026. Esses a casa mede de verdade: vêm da receita no
-- cadastro, não da visibilidade do contato.
--
-- ACEITA DESLIGADO E RELIGA: o MKT desligou os dois por precaução às **21h52:39** (medido por mim),
-- pela arbitragem de 24/11. A trava de entrada não olha `ativo` — olha a frase que precisa sair — e
-- o `update` religa na mesma transação. A ordem entre mim e ele não importa.
--
-- CONFERÊNCIA PELO EFEITO, NÃO POR TOTAL DECORADO. Às 20h06 de hoje uma migration minha abortou
-- porque conferia "13 citáveis", número verdadeiro duas horas antes. Aqui as contagens do painel
-- passam por uma temporária da própria transação: os citáveis ganham exatamente 2 (os dois voltam) e
-- nenhum outro fato se mexe.
--
-- Volta: `Cockpit/controle/volta-fatos-receita-2026-11-25.sql`, lida do banco às 21h55.
-- ============================================================
begin;

create temporary table _antes on commit drop as
select (select count(*) from public.v_mkt_fatos where fresco and publico) as citaveis,
       (select count(*) from public.v_mkt_fatos) as no_painel,
       (select count(*) from mkt.fatos) as total_linhas;

do $$ declare n int; begin
  select count(*) into n from mkt.fatos
   where chave in ('clearix_receita_vencida_12m','clearix_receita_vence_30d')
     and (fato like '%713 deles sem nenhum contato%' or fato like '%64 desses clientes sem contato%');
  if n <> 2 then
    raise exception 'esperava os dois fatos de receita com a frase do sem-contato, achei % — alguem ja reescreveu', n;
  end if;
end $$;

update mkt.fatos set
  fato = '802 clientes com a receita vencida no último ano (Grupo Mello, medido em 24/11/2026).',
  valor_numerico = 802,
  ativo = true,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp) · SUSPENSO em 25/11/2026 o trecho "713 deles sem nenhum contato da loja em 90 dias": o eco mediu que só 140 de 2.093 mensagens digitadas no celular da loja ficam ligadas ao cliente, então o "sem contato" não enxerga 84% do contato que existe. O que o número media não era "a loja não falou", era "a casa não consegue ver se falou" — e as duas mandam fazer coisas opostas.',
  updated_at = now()
where chave = 'clearix_receita_vencida_12m';

update mkt.fatos set
  fato = '88 receitas vencem nos próximos 30 dias (Grupo Mello, janela a partir de 24/11/2026).',
  valor_numerico = 88,
  ativo = true,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp) · SUSPENSO em 25/11/2026 o trecho "64 desses clientes sem contato", pelo mesmo motivo do fato da receita vencida: o registro do contato no celular da loja só liga 140 de 2.093 mensagens ao cliente.',
  updated_at = now()
where chave = 'clearix_receita_vence_30d';

-- ── a conferência ─────────────────────────────────────────────────────────────
do $$ begin
  -- a metade suspensa não sobrevive em fato nenhum da tabela
  if exists (select 1 from mkt.fatos where fato ~ 'sem nenhum contato|sem contato') then
    raise exception 'a frase do sem-contato continua em algum fato'; end if;
  if exists (select 1 from mkt.fatos where fato like '%713%' or fato like '%64 desses%') then
    raise exception 'o 713 ou o 64 ainda estao em algum fato'; end if;

  -- os dois ficaram como a folha manda, e citáveis
  if (select count(*) from public.v_mkt_fatos
       where fresco and publico
         and chave in ('clearix_receita_vencida_12m','clearix_receita_vence_30d')) <> 2 then
    raise exception 'os dois fatos de receita nao ficaram citaveis'; end if;

  -- efeito, não total decorado: ganham-se exatamente 2 citáveis e 2 no painel, e nada mais muda
  if (select count(*) from public.v_mkt_fatos where fresco and publico) <> (select citaveis from _antes) + 2 then
    raise exception 'esperava ganhar exatamente 2 citaveis: % antes, % agora',
      (select citaveis from _antes), (select count(*) from public.v_mkt_fatos where fresco and publico); end if;
  if (select count(*) from public.v_mkt_fatos) <> (select no_painel from _antes) + 2 then
    raise exception 'esperava ganhar exatamente 2 no painel'; end if;
  if (select count(*) from mkt.fatos) <> (select total_linhas from _antes) then
    raise exception 'o numero de linhas da tabela mudou, e esta migration nao cria nem apaga fato'; end if;

  if exists (select 1 from mkt.fatos where fato like '%' || chr(65533) || '%' or fonte like '%' || chr(65533) || '%') then
    raise exception 'acento corrompido (U+FFFD)'; end if;
end $$;

commit;

-- Sabotagens a conferir no ensaio:
--   a) deixar a segunda metade num dos dois → a 1.ª conferência acusa.
--   b) esquecer o `ativo = true` → a conferência dos citáveis acusa (eles estão desligados desde
--      21h52 e precisam voltar).
--   c) decorar "13 citáveis" em vez de comparar com `_antes` → é o erro que esta migration não
--      repete, e o motivo está no cabeçalho.
--
-- Reversão: `Cockpit/controle/volta-fatos-receita-2026-11-25.sql`.
