-- 161 — audiência dos 5 blogs (Ecoax) espelhada aqui, já separando leitor de máquina
--
-- ✔ APLICADA em 28/09/2026 às 17:50:28 BRT, reensaiada antes. Commentários de coluna ajustados logo depois,
--   quando o espelho revelou que o "83 page_views" do Ecoax é já filtrado (navegador + desconhecido) e o bruto
--   é 277 — a tabela guarda o BRUTO, e a tela nunca o mostra sem o número de gente ao lado.
--   Primeiro retrato gravado: 5 blogs, 277 acessos brutos e **2 de pessoa**.
--   CORRIGIDO em 29/09, quando o dono viu a tela: os baldes 'rajada' e 'interno' se sobrepõem (a rajada É o
--   verificador interno) e a tela somava os dois, mostrando '764 de máquina' num universo de 473 eventos.
--   Agora são disjuntos: interno declarado (360) + rajada que passou como leitor (70) + gente (3).
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE AQUI: o dono pediu (28/09) que a audiência dos blogs, já medida no próprio Ecoax, apareça também no
--   painel da empresa — é a régua "resultado sempre no digiai". O Ecoax continua dono do dado bruto; aqui
--   entra só o AGREGADO, sem nada de leitor. Isso também respeita a muralha editorial-comercial do Ecoax
--   (trava 23): atravessa número de audiência, nunca a ligação entre empresa citada e tráfego.
--
-- POR QUE COM A SEPARAÇÃO EXPLÍCITA, medido no banco do Ecoax em 28/09/2026 16:1x BRT:
--   os 5 blogs somam 83 page_views e 30 leituras de 30s. Parece audiência. Não é:
--     · 312 eventos já estavam marcados 'interno_provavel/rajada_5_blogs' pela 0027 do Ecoax;
--     · dos 61 eventos classificados 'navegador' (leitor de verdade), **59 estão dentro de rajadas** — os 5
--       blogs abrindo a home no MESMO minuto, que é exatamente a assinatura de máquina que a 0027 definiu;
--     · sobram **2 eventos** fora de rajada desde 24/09. Essa é a audiência humana medida da rede hoje.
--   A classificação do Ecoax parou de marcar rajada depois de 23/09 23:42 — de lá para cá a máquina entra como
--   'navegador'. Avisei o agente do Ecoax; o conserto é lá, não aqui.
--
-- O QUE ESTA TABELA NÃO FAZ: não vira fonte de verdade da audiência. A fonte é o Ecoax; aqui é retrato com
--   data, igual ao pixel_medicao da 158. Retrato velho aparece como velho, nunca como número de hoje.

begin;

do $$
begin
  if to_regclass('ops.blog_audiencia') is not null then
    raise exception 'ops.blog_audiencia ja existe — a 161 ja foi aplicada?';
  end if;
end $$;

create table ops.blog_audiencia (
  id                bigserial primary key,
  blog_slug         text not null,
  nome              text not null,
  medido_em         timestamptz not null default now(),
  page_views        int not null default 0,
  leituras_30s      int not null default 0,
  sessoes           int not null default 0,
  eventos_humanos   int not null default 0,   -- navegador E fora de rajada: o que sobra de gente
  eventos_rajada    int not null default 0,   -- 3+ blogs no mesmo minuto: máquina, mesmo se rotulada navegador
  eventos_internos  int not null default 0,   -- dono/equipe/teste, declarados como tal no Ecoax
  ultimo_humano     timestamptz,
  fonte             text not null default 'scripts/espelhar-audiencia-blogs.mjs'
);
create index blog_audiencia_slug_idx on ops.blog_audiencia (blog_slug, medido_em desc);
comment on table ops.blog_audiencia is
  '161: retrato da audiência dos blogs do Ecoax, com leitor e máquina separados. Dado bruto e dono do número continuam no Ecoax.';

alter table ops.blog_audiencia enable row level security;
create policy blog_audiencia_staff_select on ops.blog_audiencia for select using (is_staff());
revoke all on ops.blog_audiencia from anon;
grant select on ops.blog_audiencia to authenticated;

create function ops.fn_registrar_blog_audiencia(p jsonb)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into ops.blog_audiencia (blog_slug, nome, page_views, leituras_30s, sessoes,
                                  eventos_humanos, eventos_rajada, eventos_internos, ultimo_humano, fonte)
  select x->>'blog_slug', x->>'nome',
         coalesce((x->>'page_views')::int, 0), coalesce((x->>'leituras_30s')::int, 0),
         coalesce((x->>'sessoes')::int, 0), coalesce((x->>'eventos_humanos')::int, 0),
         coalesce((x->>'eventos_rajada')::int, 0), coalesce((x->>'eventos_internos')::int, 0),
         nullif(x->>'ultimo_humano','')::timestamptz,
         coalesce(x->>'fonte', 'scripts/espelhar-audiencia-blogs.mjs')
    from jsonb_array_elements(p) x
  returning 1;
$$;
revoke all on function ops.fn_registrar_blog_audiencia(jsonb) from public, anon, authenticated;
grant execute on function ops.fn_registrar_blog_audiencia(jsonb) to service_role;

create view public.v_ops_blog_audiencia
with (security_invoker = true) as
select distinct on (blog_slug)
       blog_slug, nome, medido_em, page_views, leituras_30s, sessoes,
       eventos_humanos, eventos_rajada, eventos_internos, ultimo_humano,
       (now() - medido_em) > interval '7 days' as retrato_velho
  from ops.blog_audiencia
 order by blog_slug, medido_em desc;

revoke all on public.v_ops_blog_audiencia from public, anon;
grant select on public.v_ops_blog_audiencia to authenticated, service_role;
comment on view public.v_ops_blog_audiencia is
  '161: último retrato por blog. eventos_humanos é o único número que descreve gente; o resto é máquina declarada.';

do $$
begin
  if has_table_privilege('anon', 'ops.blog_audiencia', 'select')
  or has_table_privilege('anon', 'public.v_ops_blog_audiencia', 'select')
  or has_function_privilege('authenticated', 'ops.fn_registrar_blog_audiencia(jsonb)', 'execute') then
    raise exception 'PROVA_161_FALHOU: anon/authenticated com acesso indevido.';
  end if;

  begin
    perform ops.fn_registrar_blog_audiencia(
      '[{"blog_slug":"prova_161","nome":"Prova","page_views":9,"eventos_humanos":1,"fonte":"prova"}]'::jsonb);
    if (select count(*) from public.v_ops_blog_audiencia where blog_slug='prova_161') <> 1 then
      raise exception 'PROVA_161_FALHOU: a view nao mostrou o retrato gravado';
    end if;
    raise exception 'PROVA_161_OK';
  exception when others then
    if sqlerrm <> 'PROVA_161_OK' then raise; end if;
  end;

  if (select count(*) from ops.blog_audiencia) <> 0 then
    raise exception 'PROVA_161_FALHOU: sobrou linha de prova';
  end if;
end $$;

commit;
