-- 152 — o custo medido chega ao Inventário: casar o nome do serviço dos dois lados
--
-- ✔ APLICADA em 23/09/2026 às 21:4x BRT, reensaiada antes. Medido depois: casam supabase, netlify e openai
--   (R$ 614,49 no mês); 'Outras' e 'Z-API' seguem sem conta no inventário.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE: a 151 juntou ops.contas_servicos com finance.infra_costs por igualdade do nome, e nenhum casou.
--   O Finance escreve como se lê no extrato ('Anthropic / Claude', 'Z-API', 'OpenAI'); o inventário usa slug
--   ('openai', 'supabase', 'netlify'). Resultado medido em 23/09: 0 de 6 serviços com custo casado,
--   e a tela mostrando "—" onde o extrato diz R$ 1.903,38.
--
-- O QUE FAZ: chave normalizada dos dois lados (só letras e dígitos, minúsculo) e casamento por igualdade
--   OU por conter — 'anthropicclaude' casa com 'claude'/'anthropic'. Casa hoje: openai, supabase, netlify.
--   'Outras' e 'Z-API' seguem sem conta correspondente no inventário: aparecem no total do mês, não na linha.
--   Sem inventar vínculo: nome que não casa fica sem custo, e o total do mês continua vindo de v_ops_dinheiro.

begin;

do $$
begin
  if to_regclass('public.v_ops_contas_custo') is null then
    raise exception 'v_ops_contas_custo nao existe — aplicar a 151 antes.';
  end if;
end $$;

create or replace view public.v_ops_contas_custo
with (security_invoker = on) as
with mes as (select (date_trunc('month', (now() at time zone 'America/Sao_Paulo')))::date m),
medido as (
  select regexp_replace(lower(btrim(service)), '[^a-z0-9]', '', 'g') chave,
         sum(cost_brl) custo_medido_brl, max(extrato_ate) extrato_ate, max(sincronizado_em) sincronizado_em
    from finance.infra_costs where month = (select m from mes) group by 1
)
select c.id, c.servico, c.identificador, c.conta_dona, c.status, c.custo_mensal as custo_declarado_brl,
       m.custo_medido_brl, m.extrato_ate, m.sincronizado_em,
       (m.custo_medido_brl is not null and coalesce(c.custo_mensal, 0) = 0) as declarado_zerado_com_gasto_real,
       c.ultima_verificacao
  from ops.contas_servicos c
  left join lateral (
    select * from medido m
     where m.chave = regexp_replace(lower(btrim(c.servico)), '[^a-z0-9]', '', 'g')
        or m.chave like '%' || regexp_replace(lower(btrim(c.servico)), '[^a-z0-9]', '', 'g') || '%'
        or regexp_replace(lower(btrim(c.servico)), '[^a-z0-9]', '', 'g') like '%' || m.chave || '%'
     order by length(m.chave) desc limit 1
  ) m on true
 where c.ativo;

comment on view public.v_ops_contas_custo is
  '151/152: conta do inventário × custo medido pelo Finance no mês, casando por nome normalizado (slug × nome do extrato).';

do $$
declare v_casadas int; v_total numeric;
begin
  select count(*) filter (where custo_medido_brl is not null), coalesce(sum(distinct custo_medido_brl), 0)
    into v_casadas, v_total from public.v_ops_contas_custo;
  if v_casadas = 0 then
    raise exception 'PROVA_152_FALHOU: nenhuma conta casou com o custo medido';
  end if;
  if exists (select 1 from public.v_ops_contas_custo where custo_medido_brl is not null and custo_medido_brl <= 0) then
    raise exception 'PROVA_152_FALHOU: custo medido nao positivo';
  end if;
  raise notice 'contas com custo medido: % · soma distinta: %', v_casadas, v_total;
end $$;

commit;
