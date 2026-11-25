-- ============================================================
-- 275 — trava escrita no fato do histórico, para a curadoria de 30/11 não renovar às cegas
--       (PREPARADA, NÃO APLICADA)
--
-- DE ONDE VEM: Geral → app digiai, 25/11 20h33. **271 marcas de "cancelada" em vendas de 2021 a
-- 2025 foram postas por script e estão em disputa.** O fato `clearix_historico` diz "20.375 OS no
-- histórico preservado desde 2020" — e esse total depende justamente do que conta como cancelada.
--
-- POR QUE ISTO NÃO É URGENTE, E MESMO ASSIM EXISTE: medi em 25/11 — o fato está **vencido desde
-- 14/10** (`fresco = false`), portanto já fora do prompt do gerador. Ninguém pode citá-lo hoje.
-- O risco é de **30/11**, quando eu curar os 12 vencidos públicos: sem nada escrito na linha, eu
-- renovaria este com 20.375 e publicaria um número em disputa, sem saber.
--
-- A LIÇÃO DO DIA APLICADA A MIM MESMO: eu já ia registrar isto só no arquivo de estado. O estado é
-- bom e eu o leio — mas hoje o mundo andou três vezes entre escrever e aplicar, e o que me salvou
-- foram as travas **no dado**, não as anotações. Esta é uma trava no dado: quem abrir a linha para
-- renovar lê o motivo antes de tocar no número.
--
-- EFEITO: `publico = false` vem junto por exigência da trava da 266 (fato com `uso_restrito` não é
-- público) — e aqui isso não tira nada de ninguém, porque o fato já não era citável por estar
-- vencido. Ele continua no painel, agora com a razão à vista.
--
-- QUANDO SAIR: o dono decide sobre as 271 marcas; o eco remede o histórico pela régua do Vendas;
-- aí o número volta com data nova e esta restrição se apaga de propósito, como manda a 266.
-- ============================================================
begin;

do $$ begin
  if not exists (select 1 from mkt.fatos where chave = 'clearix_historico'
                   and valor_numerico = 20375 and uso_restrito is null) then
    raise exception 'o fato do historico nao esta no estado medido (20.375, sem restricao)';
  end if;
  -- se ele tiver sido renovado entre escrever e aplicar, esta migration nao serve mais
  if (select ((now() at time zone 'America/Sao_Paulo')::date <= verificado_em + validade_dias)
        from mkt.fatos where chave = 'clearix_historico') then
    raise exception 'o fato do historico voltou a estar fresco; alguem renovou e esta trava chegou tarde';
  end if;
end $$;

update mkt.fatos set
  publico = false,
  uso_restrito = 'NÃO RENOVAR COM NÚMERO EXATO até o dono decidir (Geral, 25/11/2026 20h33): 271 marcas de "cancelada" em vendas de 2021 a 2025 foram postas por script e estão em disputa, e o total de 20.375 depende do que conta como cancelada. A régua da casa é a do Vendas (venda cancelada = deleted_at IS NULL AND is_cancelled IS TRUE). Quem for curar este fato: pedir ao eco a remedição pela régua antes de pôr data nova. Enquanto isso, se for preciso falar do histórico, usar forma sem número exato.',
  updated_at = now()
where chave = 'clearix_historico';

-- ── a conferência ─────────────────────────────────────────────────────────────
do $$ begin
  if (select publico from mkt.fatos where chave='clearix_historico') then
    raise exception 'o fato continua publico'; end if;
  if (select ativo from mkt.fatos where chave='clearix_historico') is not true then
    raise exception 'o fato foi desativado, e nao era para isso: ele fica no painel com a razao a vista'; end if;
  if (select count(*) from mkt.fatos where uso_restrito is not null and publico) <> 0 then
    raise exception 'ha fato de uso restrito publicado'; end if;
  if exists (select 1 from mkt.fatos where uso_restrito like '%' || chr(65533) || '%') then
    raise exception 'acento corrompido (U+FFFD)'; end if;
end $$;

commit;

-- Reversão: `update mkt.fatos set publico = true, uso_restrito = null where chave = 'clearix_historico';`
-- (estado medido em 25/11: ativo true, publico true, uso_restrito nulo, valor 20375, vencido em 14/10).
