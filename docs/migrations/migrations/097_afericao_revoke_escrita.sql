-- 097 — tira a escrita que a 095 concedeu a anon sem querer
--
-- ⚠ CONSERTO DE DEFEITO MEU, aplicado sob a mesma autorização da 095 ("1 pode",
--    09/09) por ser correção do que acabei de aplicar e por REDUZIR permissão.
--
-- O QUE FALHOU, e é o erro que eu diagnostiquei nos outros DUAS VEZES hoje:
-- a 095 terminava com
--     revoke all on public.v_telao_afericao from public;
--     grant select on public.v_telao_afericao to anon, authenticated;
-- O `revoke ... from public` mira o PAPEL `PUBLIC`, que não tinha nada. Quem
-- tinha era `anon` e `authenticated`, por DEFAULT PRIVILEGES do schema `public`
-- (medido: `anon=arwdDxtm/postgres` em pg_default_acl). O revoke foi no-op e o
-- grant de SELECT foi redundante: a view NASCEU com escrita para anon.
--
-- Inerte na prática — `UNION ALL` não é auto-atualizável, então o INSERT falharia
-- de qualquer forma. Mas grant que não devia existir não se justifica por não ser
-- explorável hoje: justifica-se corrigir porque amanhã a view pode mudar de forma.
--
-- ⚠ E ISTO É A CAUSA DO PORTÃO 64, não um caso isolado: TODA view criada em
--    `public` neste projeto nasce com escrita para anon e authenticated. As 135
--    views com escrita não foram concedidas uma a uma — foram GERADAS. Consertar
--    as 12 atualizáveis trata sintoma; enquanto o default estiver assim, a
--    próxima view nasce aberta. Ver a proposta no despacho ao orquestrador.

begin;

revoke insert, update, delete, truncate, references, trigger
  on public.v_telao_afericao from anon, authenticated, public;

grant select on public.v_telao_afericao to anon, authenticated;

commit;

-- PROVA: has_table_privilege('anon', …, 'INSERT'|'UPDATE'|'DELETE') = false,
--        'SELECT' = true, e a chamada anon crua continua devolvendo 7 linhas.
