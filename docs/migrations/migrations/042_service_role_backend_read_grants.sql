-- === 042 — service_role: acesso de leitura de backend nas schemas da aplicação ===
-- Aplicada em produção via Management API em 2026-06-14.
--
-- Contexto: a 035 (segurança LGPD) travou as views para `security_invoker=true` e
-- concedeu USAGE+SELECT ao `authenticated` (RLS is_staff filtra). Mas o `service_role`
-- — papel de BACKEND, cuja chave vive só nas edge functions / servidor e NUNCA no
-- bundle do browser — nunca teve grant nessas schemas custom (só `marketing` tinha).
--
-- Sintoma: a edge fn `/health` (R-016) consulta `public.v_decisions` como service_role;
-- como a view é security_invoker, o service_role precisa de USAGE no schema + SELECT na
-- base table `ops.decisions`. Sem isso → PostgREST 403 → /health sempre 503 ("down").
-- (Outras edge fns sobrevivem porque escrevem via RPCs SECURITY DEFINER.)
--
-- Fix: restaurar a capacidade de leitura de backend do service_role. Isto NÃO reabre
-- acesso a anon/authenticated (a fronteira de segurança da 035 permanece intacta);
-- service_role não é exposto a clientes. iam (PII de identidade) deixado de fora de
-- propósito — não é necessário e mantém o raio mínimo. DML não concedido (escritas
-- de backend já passam por RPCs SECURITY DEFINER).

do $$
declare s text;
begin
  foreach s in array array['ops','company','finance','academy','analytics'] loop
    execute format('grant usage on schema %I to service_role', s);
    execute format('grant select on all tables in schema %I to service_role', s);
    execute format('alter default privileges in schema %I grant select on tables to service_role', s);
  end loop;
end $$;

notify pgrst, 'reload schema';
