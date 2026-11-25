-- ============================================================
-- 272 — o fato de comissão do Clearix sai de citável (PREPARADA, NÃO APLICADA)
--
-- ESTA MIGRATION ERA MAIOR E FOI DIVIDIDA EM 25/11. Ela também reescrevia as OS de 2026; essa parte
-- saiu para a **273**, porque a folha única tem trava nesse número até o eco gravar a consulta e o
-- resultado em arquivo, conferidos pelo Vendas (prazo 26/11 12h). Gravar lá antes da trava sair
-- poria no gerador um número ainda em medição — exatamente o que eu mesmo escrevi para não fazer.
-- A comissão não depende disso e segue sozinha.
--
-- DE ONDE VEM: Geral → app digiai, 25/11/2026 18h07. O dono disse no canal do RH que **a comissão do
-- Clearix é teste e ninguém recebeu**; RH e eco conferiram no banco: 0 linhas pagas, 23 fechamentos
-- abertos. O Geral suspendeu o número na folha única ("SUSPENSO em 25/11"). Curadoria de `mkt.fatos`
-- é deste app, então o desligamento é meu — e aplicar pede a palavra do dono no meu canal.
--
-- O FATO É MEU, DE ONTEM. Eu o escrevi na migration 271, com o texto "1.449 linhas de comissão
-- calculadas sobre OS entregues em 2026, para 9 vendedores". Medi a frase de novo hoje: ela não diz
-- que alguém recebeu — diz "calculadas". **E ainda assim não pode sair.** Quem lê "1.449 linhas de
-- comissão para 9 vendedores" entende módulo em uso e gente sendo paga; o cálculo rodando num teste
-- não é isso. O erro não está no número, está no que a frase faz o leitor concluir — e esse é o tipo
-- de erro que uma medição correta não protege.
--
-- ALGUÉM JÁ DESLIGOU, E DO JEITO QUE PERDE O MOTIVO. Enquanto eu preparava isto, às **18h10:04**,
-- outra sessão marcou `ativo = false` nesta linha (medido por mim: a minha trava de entrada recusou
-- porque esperava o estado de 18h09, e aí fui ver). O efeito que o Geral pediu está feito — o número
-- saiu do prompt do gerador, citáveis caíram de 14 para 13. **Mas `ativo = false` apaga a medição do
-- painel inteiro e não deixa escrito por quê**: o próximo curador encontra um fato apagado, sem
-- razão e sem data de volta. A curadoria de `mkt.fatos` é deste app (despacho de 31/07/2026); quem
-- escreveu não é o curador. Fica dito sem drama, porque o resultado era o certo e o caminho não.
--
-- Esta migration repõe o estado correto: a medição volta a existir (`ativo = true`), o uso público
-- sai (`publico = false`) e o motivo fica escrito na própria linha.
--
-- POR QUE `publico = false` E NÃO `ativo = false`: o 1.449 é verdadeiro como cálculo, e apagá-lo da
-- tabela perderia uma medição boa. Fato não-público continua visível no painel da casa e fora do
-- prompt do gerador — o motor do MKT lê `fresco AND publico`, então deixa de ser citável no mesmo
-- instante. A trava da 266 exige `publico = false` para quem tem `uso_restrito`: aqui as duas coisas
-- andam juntas de propósito.
--
-- O QUE ESTA MIGRATION NÃO FAZ: não toca na folha única (é do Geral, e ele já suspendeu lá), nem em
-- `mkt.content_rules` — conferi em 25/11: **nenhuma das 7 travas de marca cita comissão**, e nenhum
-- outro fato da tabela cita (varri `fato`, `chave` e `fonte` por "comiss" e "vendedor": um só).
--
-- EFEITO NO FRONT: na aba Publicações, os citáveis caem de 14 para 13; o fato passa a aparecer com o
-- selo "preso a um uso" e a razão escrita. No gerador do MKT, o número some do prompt.
--
-- Volta: `Cockpit/controle/volta-fato-comissao-2026-11-25.sql`, lida do banco antes de qualquer
-- escrita, para as três linhas. Nenhum delete.
-- ============================================================
begin;

-- O MUNDO ANDA ENTRE ESCREVER E APLICAR (aprendido às 20h06 de 25/11, aplicando esta migration):
-- a primeira versão conferia "13 citáveis" e "34 fatos", números verdadeiros quando eu a escrevi.
-- Às 18h48 o MKT desligou os dois fatos de OS por precaução, e às 20h06 a trava recusou com
-- "esperava 13, achei 11" — corretamente, e nada foi escrito. Mas a conferência estava errada: ela
-- media o mundo, não o efeito desta migration. **Conferência boa compara antes e depois de SI
-- MESMA**, não com um número decorado de duas horas atrás. Guardo as contagens numa tabela
-- temporária da própria transação e comparo no fim.
create temporary table _antes on commit drop as
select (select count(*) from public.v_mkt_fatos where fresco and publico) as citaveis,
       (select count(*) from public.v_mkt_fatos) as no_painel;

do $$
declare n int;
begin
  -- o fato existe e está no estado que outra sessão deixou às 18h10 de 25/11: desativado e ainda
  -- marcado como público. Se alguém mexer de novo antes de aplicar, esta trava recusa — como
  -- recusou às 18h11, que foi como eu descobri a mudança.
  select count(*) into n from mkt.fatos
   where chave = 'clearix_comissao_2026' and not ativo and publico and uso_restrito is null;
  if n <> 1 then
    raise exception 'o fato de comissao nao esta no estado medido (desativado, publico, sem restricao); alguem mexeu de novo';
  end if;

  select count(*) into n from mkt.fatos
   where (fato ~* 'comiss|vendedor' or chave ~* 'comiss' or coalesce(fonte,'') ~* 'comiss')
     and chave <> 'clearix_comissao_2026';
  if n <> 0 then raise exception '% outro(s) fato(s) citam comissao — esta migration nao os cobre', n; end if;
end $$;

update mkt.fatos set
  ativo = true,              -- a medição volta ao painel: o 1.449 é verdadeiro como cálculo
  publico = false,           -- o uso público sai: é isso que "deixa de ser citável" quer dizer
  uso_restrito = 'SUSPENSO em 25/11/2026: a comissão do Clearix é teste e ninguém recebeu (dono, canal do RH; RH e eco conferiram no banco: 0 linhas pagas, 23 fechamentos abertos). O 1.449 é verdadeiro como cálculo e por isso o fato fica — mas não se cita, porque "1.449 linhas de comissão para 9 vendedores" faz quem lê entender módulo em uso e gente sendo paga. Volta a público só com a palavra do dono, e só depois de alguém receber de verdade.',
  fonte = fonte || ' · SUSPENSO em 25/11/2026 (folha única, pelo Geral): comissão em teste, ninguém recebeu.',
  updated_at = now()
where chave = 'clearix_comissao_2026';

-- ── a conferência ─────────────────────────────────────────────────────────────
do $$ declare n int; begin
  if (select publico from mkt.fatos where chave='clearix_comissao_2026') then
    raise exception 'o fato continua publico'; end if;
  if (select ativo from mkt.fatos where chave='clearix_comissao_2026') is not true then
    raise exception 'o fato continua desativado, e nao era para isso: a medicao fica, o uso publico e que sai'; end if;

  -- esta é a prova que importa: a MESMA consulta do motor do MKT (_shared/fatos.ts)
  select count(*) into n from public.v_mkt_fatos
   where fresco and publico and chave = 'clearix_comissao_2026';
  if n <> 0 then raise exception 'o numero ainda chega ao prompt do gerador'; end if;

  -- citáveis continuam 13: o fato já não chegava ao prompt desde as 18h10. O que muda é que ele
  -- volta a aparecer no painel, com o motivo à vista.
  -- o efeito desta migration, medido contra ela mesma: os citáveis NÃO mudam (a comissão já não
  -- era citável desde as 18h10) e o painel ganha exatamente UM fato (a comissão volta a ativo).
  if (select count(*) from public.v_mkt_fatos where fresco and publico) <> (select citaveis from _antes) then
    raise exception 'os citaveis mudaram, e esta migration nao devia mexer neles: % antes, % agora',
      (select citaveis from _antes), (select count(*) from public.v_mkt_fatos where fresco and publico); end if;
  if (select count(*) from public.v_mkt_fatos) <> (select no_painel from _antes) + 1 then
    raise exception 'o painel devia ganhar exatamente 1 fato (a comissao de volta): % antes, % agora',
      (select no_painel from _antes), (select count(*) from public.v_mkt_fatos); end if;

  if (select count(*) from mkt.fatos where uso_restrito is not null and publico) <> 0 then
    raise exception 'ha fato de uso restrito publicado'; end if;
  if exists (select 1 from mkt.fatos where uso_restrito like '%' || chr(65533) || '%'
              or fato like '%' || chr(65533) || '%' or fonte like '%' || chr(65533) || '%') then
    raise exception 'acento corrompido (U+FFFD): a escrita passou por um caminho que estraga UTF-8'; end if;

end $$;

commit;

-- Sabotagens a conferir no ensaio:
--   a) trocar por `ativo = false` → a 2.ª conferência acusa: a medição não se apaga, o uso é que sai.
--   b) deixar `publico = true` com `uso_restrito` preenchido → a trava da 266 recusa (23514).
--   c) esquecer o `uso_restrito` → o fato sai do ar sem motivo escrito, e o próximo curador não sabe
--      por que, nem quando pode voltar. (Não há check para isto no banco: é regra de quem escreve.)
--
-- Reversão: `Cockpit/controle/volta-fato-comissao-2026-11-25.sql`.
