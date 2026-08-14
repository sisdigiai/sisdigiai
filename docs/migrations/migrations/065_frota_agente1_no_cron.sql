-- 065 — o verificador de fatos entra na cadeia noturna
-- 04:30 mede os fatos na fonte · 04:40 gera a ordem ja com o resultado.
-- O agente NAO renova o fato: reporta o veredito e a decisao fica com o MKT (R-032).

create or replace function public.fn_ordem_maquina_fatos(p_dia date)
returns void language plpgsql security definer set search_path = public, ops as $fn$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  select p_dia, 'maquina', 4,
         'Verificador de fatos: ' || count(*) filter (where veredito='divergente') || ' divergente(s)',
         'Medido na fonte agora. ' ||
         coalesce(string_agg(chave || ' afirma ' || coalesce(valor_numerico::text,'—') ||
                  ', fonte diz ' || coalesce(valor_medido::text,'—'), '; ')
                  filter (where veredito='divergente'), 'sem divergencia') ||
         '. ' || count(*) filter (where veredito='nao_verificavel') ||
         ' fonte(s) exigem humano. Renovar ou reescrever o fato e do agente do MKT (R-032).',
         'maquina', 'funil', 'ops.fato_medicao'
    from public.v_ops_fatos_verificados
   having count(*) filter (where veredito='divergente') > 0
  on conflict (dia, bloco, titulo) do nothing;
end $fn$;

revoke execute on function public.fn_ordem_maquina_fatos(date) from public, anon;
grant execute on function public.fn_ordem_maquina_fatos(date) to authenticated, service_role;

select cron.unschedule('ordem-do-dia-gerar');
select cron.schedule('ordem-do-dia-gerar','40 4 * * *',
  $$ select public.fn_gerar_ordem_do_dia();
     select public.fn_ordem_maquina_mkt(current_date);
     select public.fn_ordem_maquina_fatos(current_date); $$);

select cron.schedule('verificar-fatos-diario','30 4 * * *',
  $$ select net.http_post(
       url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/verificar-fatos',
       headers := jsonb_build_object('Content-Type','application/json','Authorization',
         'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='supabase_anon_key')),
       body := '{}'::jsonb, timeout_milliseconds := 30000); $$);
