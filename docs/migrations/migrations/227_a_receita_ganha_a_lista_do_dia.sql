-- 227 — A página Receita ganha a Lista do dia: dez óticas para o dono ligar, montadas sozinhas às 08h (12/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/lista-do-dia`), por pedido do dono no canal
-- dele em 12/11/2026 ("quero a lista, porém preciso que inclua em uma aba no app").
-- APLICADA em 12/11/2026 pelo próprio Receita, depois de dois ensaios com rollback em que as seis provas
-- passaram. A lista de 12/11 foi montada a pedido em seguida: 10 óticas (5 com interesse, 5 que responderam).
--
-- O PROBLEMA: a rotina "lista do dia" estava no mandato desde 10/11 e nunca ligou, por dois motivos escritos:
-- a lista tem nome e telefone, que não podem ir ao git; e a esteira de WhatsApp do app de marketing já toca
-- os mesmos contatos. Esta migration resolve os dois: a lista mora no banco e é lida numa aba do app, e a
-- regra de quem entra olha o funil do marketing para não bater duas vezes na mesma ótica no mesmo dia.
--
-- CINCO DECISÕES DE DESENHO:
--
-- 1. A TABELA GUARDA SÓ O `lead_id`. Nome, telefone, cidade e etapa são lidos na hora, das views de
--    contrato que já existem (`v_vendas_leads`, `v_mkt_funil_leads`). Nenhum dado de contato é copiado para
--    o schema `receita`. Sem FK para `ops.commercial_leads` de propósito: é tabela de outro dono, e uma FK
--    daqui travaria uma exclusão de lá.
--
-- 2. QUEM ENTRA, e em que ordem (10 por dia, de segunda a sábado): primeiro quem mostrou interesse ou clicou
--    no link; depois quem respondeu como pessoa; depois quem recebeu WhatsApp e não respondeu; por último
--    quem nunca foi tocada. Dentro de cada faixa, loja independente antes de rede, e toque mais recente
--    antes do mais antigo.
--
-- 3. QUEM NUNCA ENTRA: sem telefone; saiu da lista do WhatsApp; marcada como perdida; já é cliente ou já
--    comprou; tem WhatsApp da esteira agendado para o mesmo dia; já foi falada pelo dono; pediu para não
--    ligar mais. Quem não atendeu volta depois de dois dias, no máximo três vezes. Quem ficou na lista sem
--    ser ligada pode voltar no dia seguinte: lista não ligada não queima a ótica.
--
-- 4. A ROTINA É DO BANCO (pg_cron, 08h de Brasília), não de tarefa agendada no computador do dono: roda com
--    o aplicativo fechado. Ela GRAVA A PRÓPRIA EXECUÇÃO em `receita.rotina`, e a falha também.
--
-- 5. O RESULTADO DA LIGAÇÃO só entra por pessoa logada (como a escolha de foco da 224). "Falei" é marcado
--    pela tela depois de o toque ser registrado pela porta que já existe (`fn_registrar_toque`).

create table if not exists receita.lista_dia (
  dia date not null,
  ordem smallint not null check (ordem between 1 and 50),
  lead_id uuid not null,
  faixa text not null check (faixa in ('interesse', 'respondeu', 'abordada', 'captada')),
  motivo text not null check (btrim(motivo) <> ''),
  resultado text check (resultado in ('falou', 'nao_atendeu', 'nao_ligar')),
  resultado_nota text,
  resultado_por text,
  resultado_em timestamptz,
  criado_em timestamptz not null default now(),
  primary key (dia, lead_id),
  unique (dia, ordem),
  -- Resultado sem autor e sem hora é boato. Ou vêm os três, ou nenhum.
  check ((resultado is null and resultado_por is null and resultado_em is null)
      or (resultado is not null and resultado_por is not null and resultado_em is not null))
);

comment on table receita.lista_dia is 'Lista do dia do Agente de Receita: as óticas para o dono ligar, uma linha por ótica por dia. Guarda só o lead_id; contato é lido das views de contrato. Montada pelo cron receita-lista-do-dia.';
comment on column receita.lista_dia.lead_id is 'id de ops.commercial_leads. Sem FK de propósito: a tabela é de outro dono.';
comment on column receita.lista_dia.faixa is 'Por que a ótica está na lista: interesse (mostrou interesse ou clicou) > respondeu (uma pessoa respondeu) > abordada (recebeu WhatsApp, sem resposta de pessoa) > captada (nunca tocada).';
comment on column receita.lista_dia.resultado is 'falou = o dono falou com alguém da ótica; nao_atendeu = ligou e ninguém atendeu; nao_ligar = pediram para não ligar mais (a ótica nunca mais entra). Nulo = ainda não ligada.';

alter table receita.lista_dia enable row level security;

drop policy if exists le_staff on receita.lista_dia;
-- Leitura de staff. Escrita sem política: as portas são as funções abaixo.
create policy le_staff on receita.lista_dia for select to authenticated using (public.is_staff());

grant select on receita.lista_dia to authenticated;

-- ─────────────────────────────────────────────────────────────── views de contrato (public, invoker)

-- A lista com o contato, lido na hora. Invoker: quem consulta precisa poder ler as três fontes, e as
-- políticas de cada uma continuam valendo (a de leads já limita a quem pode tocar lead).
create or replace view public.v_receita_lista_dia
with (security_invoker = true) as
select d.dia, d.ordem, d.lead_id, d.faixa, d.motivo, d.resultado, d.resultado_nota, d.resultado_por,
       d.resultado_em, d.criado_em,
       coalesce(nullif(btrim(l.company), ''), nullif(btrim(l.name), ''), f.otica) as otica,
       l.contact as contato, l.phone_e164 as telefone,
       f.cidade, f.uf, f.porte, f.etapa, f.ultimo_toque_em
  from receita.lista_dia d
  left join public.v_vendas_leads l on l.id = d.lead_id
  left join public.v_mkt_funil_leads f on f.lead_id = d.lead_id;

grant select on public.v_receita_lista_dia to authenticated;

-- Quem pediu para não ligar mais. Só o id e a data: é o contrato para o app de marketing respeitar o
-- pedido também no WhatsApp, se quiser ler.
create or replace view public.v_receita_nao_ligar
with (security_invoker = true) as
select d.lead_id, min(d.resultado_em) as desde
  from receita.lista_dia d
 where d.resultado = 'nao_ligar'
 group by d.lead_id;

grant select on public.v_receita_nao_ligar to authenticated;

-- ─────────────────────────────────────────────────────────────── a regra de quem entra

create or replace function receita.fn_montar_lista_do_dia(p_dia date default null, p_quantas integer default 10)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_dia date := coalesce(p_dia, (now() at time zone 'America/Sao_Paulo')::date);
  v_n integer;
begin
  -- Domingo não tem lista (regra da casa: nada da casa sai no domingo).
  if extract(dow from v_dia) = 0 then
    return 0;
  end if;
  -- Montar duas vezes no mesmo dia não troca a lista: o dono pode já ter ligado para metade dela.
  select count(*) into v_n from receita.lista_dia where dia = v_dia;
  if v_n > 0 then
    return v_n;
  end if;

  insert into receita.lista_dia (dia, ordem, lead_id, faixa, motivo)
  select v_dia, row_number() over (order by c.rank_faixa, c.e_rede, c.ultimo_toque_em desc nulls last, c.lead_id),
         c.lead_id, c.faixa, c.motivo
    from (
      select l.id as lead_id,
             x.faixa,
             case x.faixa when 'interesse' then 1 when 'respondeu' then 2 when 'abordada' then 3 else 4 end as rank_faixa,
             (coalesce(f.porte, '') = 'rede') as e_rede,
             f.ultimo_toque_em,
             case x.faixa
               when 'interesse' then 'mostrou interesse ou clicou no link'
               when 'respondeu' then 'uma pessoa respondeu o WhatsApp'
               when 'abordada' then case when f.robo_em is not null then 'recebeu WhatsApp; só veio resposta automática'
                                         else 'recebeu WhatsApp e não respondeu' end
               else 'nunca foi tocada'
             end
             || case when f.ultimo_toque_em is not null
                     then '; último toque em ' || to_char(f.ultimo_toque_em at time zone 'America/Sao_Paulo', 'DD/MM')
                     else '' end as motivo
        from public.v_vendas_leads l
        join public.v_mkt_funil_leads f on f.lead_id = l.id
        cross join lateral (
          select case
                   when f.interesse_em is not null or f.clicou_em is not null or f.etapa in ('interessada', 'clicou') then 'interesse'
                   when f.pessoa_em is not null or f.etapa in ('respondeu_pessoa', 'respondeu_a_conferir') then 'respondeu'
                   when f.abordada_em is not null then 'abordada'
                   else 'captada'
                 end as faixa) x
       where l.phone_e164 is not null
         and l.wa_opt_out_em is null
         and not l.tem_motivo_perda
         and l.stage <> 'cliente'
         and f.saiu_em is null
         and f.comprou_em is null
         and f.etapa not in ('saiu', 'perdida')
         -- já falada, ou pediu para não ligar: nunca mais
         and not exists (select 1 from receita.lista_dia d
                          where d.lead_id = l.id and d.resultado in ('falou', 'nao_ligar'))
         -- não atendeu: volta depois de dois dias, no máximo três vezes
         and not exists (select 1 from receita.lista_dia d
                          where d.lead_id = l.id and d.resultado = 'nao_atendeu' and d.dia > v_dia - 3)
         and (select count(*) from receita.lista_dia d
               where d.lead_id = l.id and d.resultado = 'nao_atendeu') < 3
         -- a esteira vai mandar WhatsApp a esta ótica hoje: não bater duas vezes no mesmo dia
         and not exists (select 1 from public.v_mkt_esteira_itens e
                          where e.lead_id = l.id and e.dia = v_dia and e.status = 'agendada')
    ) c
   order by c.rank_faixa, c.e_rede, c.ultimo_toque_em desc nulls last, c.lead_id
   limit greatest(1, least(coalesce(p_quantas, 10), 50));

  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

revoke all on function receita.fn_montar_lista_do_dia(date, integer) from public, anon, authenticated;

-- A rotina que o cron chama: monta a lista e GRAVA A PRÓPRIA EXECUÇÃO. Falha não some: fica escrita.
create or replace function receita.fn_rotina_lista_do_dia()
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare v_n integer; v_erro text;
begin
  begin
    v_n := receita.fn_montar_lista_do_dia();
    insert into receita.rotina (nome, descricao, hora, ligada, ultima_execucao, fonte, atualizado_em)
    values ('lista do dia', 'as dez óticas para o dono ligar das 9h às 11h', 'seg a sáb, 08h', true, now(),
            'cron receita-lista-do-dia · grava em receita.lista_dia', now())
    on conflict (nome) do update
       set ligada = true, ultima_execucao = now(), atualizado_em = now();
    return 'ok: ' || v_n || ' na lista';
  exception when others then
    v_erro := left(sqlerrm, 300);
    insert into receita.rotina (nome, descricao, hora, ligada, ultima_falha, detalhe_falha, fonte, atualizado_em)
    values ('lista do dia', 'as dez óticas para o dono ligar das 9h às 11h', 'seg a sáb, 08h', true, now(), v_erro,
            'cron receita-lista-do-dia · grava em receita.lista_dia', now())
    on conflict (nome) do update
       set ultima_falha = now(), detalhe_falha = v_erro, atualizado_em = now();
    return 'FALHOU: ' || v_erro;
  end;
end;
$function$;

revoke all on function receita.fn_rotina_lista_do_dia() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────── portas públicas

-- Montar a lista de hoje a pedido (staff ou a carga). Não conta como execução da rotina: quem grava a
-- execução é só o cron.
create or replace function public.rpc_receita_montar_lista_do_dia()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga monta a lista do dia' using errcode = 'insufficient_privilege';
  end if;
  return receita.fn_montar_lista_do_dia();
end;
$function$;

-- O resultado da ligação. Só pessoa logada: agente não diz que o dono ligou.
create or replace function public.rpc_receita_lista_resultado(
  p_dia date, p_lead_id uuid, p_resultado text, p_nota text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare v_quem text;
begin
  if not public.is_staff() then
    raise exception 'apenas pessoa da equipe marca o resultado da ligação' using errcode = 'insufficient_privilege';
  end if;
  if p_resultado is not null and p_resultado not in ('falou', 'nao_atendeu', 'nao_ligar') then
    raise exception 'resultado invalido: % (use falou, nao_atendeu, nao_ligar, ou nulo para limpar)', p_resultado;
  end if;
  v_quem := coalesce(nullif(btrim(auth.jwt() ->> 'email'), ''), auth.uid()::text);

  update receita.lista_dia
     set resultado = p_resultado,
         resultado_nota = case when p_resultado is null then null else nullif(btrim(coalesce(p_nota, '')), '') end,
         resultado_por = case when p_resultado is null then null else v_quem end,
         resultado_em = case when p_resultado is null then null else now() end
   where dia = p_dia and lead_id = p_lead_id;
  if not found then
    raise exception 'esta otica nao esta na lista de %', p_dia;
  end if;
  return coalesce(p_resultado, 'limpo');
end;
$function$;

revoke all on function public.rpc_receita_montar_lista_do_dia() from public, anon;
revoke all on function public.rpc_receita_lista_resultado(date, uuid, text, text) from public, anon;
grant execute on function public.rpc_receita_montar_lista_do_dia() to authenticated;
grant execute on function public.rpc_receita_lista_resultado(date, uuid, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── o agendamento (08h de Brasília, seg a sáb)

do $$
declare v_job bigint;
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'receita-lista-do-dia';
  -- 11:00 UTC = 08:00 em Brasília. Dias 1 a 6: segunda a sábado.
  select cron.schedule('receita-lista-do-dia', '0 11 * * 1-6',
                       $cmd$ select receita.fn_rotina_lista_do_dia(); $cmd$) into v_job;
  if v_job is null then
    raise exception 'PROVA_227_FALHOU: cron.schedule nao devolveu jobid';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — as duas views existem e rodam como QUEM CONSULTA (R-043).
do $$
declare v text;
begin
  select string_agg(n, ', ') into v from unnest(array['v_receita_lista_dia', 'v_receita_nao_ligar']) n
   where not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                      where s.nspname = 'public' and c.relname = n and c.reloptions @> array['security_invoker=true']);
  if v is not null then
    raise exception 'PROVA_227_FALHOU: view ausente ou sem security_invoker: %', v;
  end if;
end $$;

-- PROVA 2 — fechado para quem não é da casa: anon não lê nem executa; authenticated não escreve direto e
-- não executa as duas funções internas.
do $$
declare v text;
begin
  select string_agg(grantee || ':' || privilege_type, ', ') into v
    from information_schema.role_table_grants
   where table_schema = 'receita' and table_name = 'lista_dia'
     and ((grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')) or grantee = 'anon');
  if v is not null then
    raise exception 'PROVA_227_FALHOU: privilegio indevido em receita.lista_dia: %', v;
  end if;
  if has_table_privilege('anon', 'public.v_receita_lista_dia', 'select')
     or has_table_privilege('anon', 'public.v_receita_nao_ligar', 'select')
     or has_function_privilege('anon', 'public.rpc_receita_montar_lista_do_dia()', 'execute')
     or has_function_privilege('anon', 'public.rpc_receita_lista_resultado(date, uuid, text, text)', 'execute')
     or has_function_privilege('authenticated', 'receita.fn_montar_lista_do_dia(date, integer)', 'execute')
     or has_function_privilege('authenticated', 'receita.fn_rotina_lista_do_dia()', 'execute') then
    raise exception 'PROVA_227_FALHOU: anon alcanca a lista, ou authenticated alcanca funcao interna';
  end if;
end $$;

-- PROVA 3 — a regra, rodada de verdade num dia de prova (uma segunda-feira distante, para não tocar em dia
-- real): monta 10, sem repetir ótica, ninguém sem telefone, ninguém que saiu, e a ordem respeita a faixa.
-- Montar de novo não muda nada. Domingo dá zero. As linhas de prova saem no fim.
do $$
declare
  v_seg date := date '2099-01-05';   -- segunda-feira
  v_dom date := date '2099-01-04';   -- domingo
  n int; n2 int; nd int; ruins int; fora_de_ordem int;
begin
  n := receita.fn_montar_lista_do_dia(v_seg);
  n2 := receita.fn_montar_lista_do_dia(v_seg);
  nd := receita.fn_montar_lista_do_dia(v_dom);
  select count(*) into ruins
    from receita.lista_dia d
    left join public.v_vendas_leads l on l.id = d.lead_id
    left join public.v_mkt_funil_leads f on f.lead_id = d.lead_id
   where d.dia = v_seg
     and (l.id is null or l.phone_e164 is null or l.wa_opt_out_em is not null or l.tem_motivo_perda
          or l.stage = 'cliente' or f.saiu_em is not null or f.comprou_em is not null);
  select count(*) into fora_de_ordem
    from receita.lista_dia a join receita.lista_dia b on b.dia = a.dia and b.ordem = a.ordem + 1
   where a.dia = v_seg
     and (case a.faixa when 'interesse' then 1 when 'respondeu' then 2 when 'abordada' then 3 else 4 end)
       > (case b.faixa when 'interesse' then 1 when 'respondeu' then 2 when 'abordada' then 3 else 4 end);
  delete from receita.lista_dia where dia in (v_seg, v_dom);
  if n <> 10 or n2 <> 10 or nd <> 0 then
    raise exception 'PROVA_227_FALHOU: montou % (esperado 10), remontou % (esperado 10), domingo % (esperado 0)', n, n2, nd;
  end if;
  if ruins > 0 or fora_de_ordem > 0 then
    raise exception 'PROVA_227_FALHOU: % otica(s) que nao podiam entrar; % par(es) fora da ordem das faixas', ruins, fora_de_ordem;
  end if;
end $$;

-- PROVA 4 — quem foi falada ou pediu para não ligar NÃO volta; quem não atendeu só volta depois de dois dias.
-- O resultado de prova é escrito direto na tabela (a migration corre como postgres, que a função de
-- resultado recusa: é a prova 5).
do $$
declare
  d1 date := date '2099-01-05'; d2 date := date '2099-01-06'; d4 date := date '2099-01-08';
  a uuid; b uuid; c uuid; volta_cedo int; volta_tarde int; proibidas int;
begin
  perform receita.fn_montar_lista_do_dia(d1);
  select lead_id into a from receita.lista_dia where dia = d1 and ordem = 1;
  select lead_id into b from receita.lista_dia where dia = d1 and ordem = 2;
  select lead_id into c from receita.lista_dia where dia = d1 and ordem = 3;
  update receita.lista_dia set resultado = 'falou', resultado_por = 'prova', resultado_em = now() where dia = d1 and lead_id = a;
  update receita.lista_dia set resultado = 'nao_ligar', resultado_por = 'prova', resultado_em = now() where dia = d1 and lead_id = b;
  update receita.lista_dia set resultado = 'nao_atendeu', resultado_por = 'prova', resultado_em = now() where dia = d1 and lead_id = c;
  perform receita.fn_montar_lista_do_dia(d2);
  perform receita.fn_montar_lista_do_dia(d4);
  select count(*) into proibidas from receita.lista_dia where dia in (d2, d4) and lead_id in (a, b);
  select count(*) into volta_cedo from receita.lista_dia where dia = d2 and lead_id = c;
  select count(*) into volta_tarde from receita.lista_dia where dia = d4 and lead_id = c;
  delete from receita.lista_dia where dia in (d1, d2, d4);
  if proibidas > 0 then
    raise exception 'PROVA_227_FALHOU: otica falada ou que pediu para nao ligar voltou para a lista';
  end if;
  if volta_cedo <> 0 or volta_tarde <> 1 then
    raise exception 'PROVA_227_FALHOU: a que nao atendeu voltou no dia seguinte (%) ou nao voltou depois de dois dias (%)', volta_cedo, volta_tarde;
  end if;
end $$;

-- PROVA 5 — a carga NÃO marca resultado: quem diz que o dono ligou é o dono.
do $$
declare passou boolean := false;
begin
  begin
    perform public.rpc_receita_lista_resultado(date '2099-01-05', gen_random_uuid(), 'falou', 'a carga tentando');
    passou := true;
  exception when insufficient_privilege then
    passou := false;
  end;
  if passou then
    raise exception 'PROVA_227_FALHOU: a carga conseguiu marcar resultado de ligacao';
  end if;
end $$;

-- PROVA 6 — o agendamento existe, ativo, na hora certa; e nenhuma linha de prova ficou.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'receita-lista-do-dia' and schedule = '0 11 * * 1-6' and active) then
    raise exception 'PROVA_227_FALHOU: o cron receita-lista-do-dia nao esta ativo as 11h UTC de segunda a sabado';
  end if;
  if exists (select 1 from receita.lista_dia where dia >= date '2099-01-01') then
    raise exception 'PROVA_227_FALHOU: sobrou linha de prova em receita.lista_dia';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────── a quem serve cada porta (regra 5 do README)

comment on view public.v_receita_lista_dia is 'Consumidor: página Receita do app digiai, aba Lista do dia. Grant: select a authenticated, porque a view é invoker: a RLS de receita.lista_dia limita a staff e as views de leads e do funil aplicam as políticas delas.';
comment on view public.v_receita_nao_ligar is 'Consumidor: o app de marketing, se quiser respeitar no WhatsApp quem pediu ao dono para não ligar mais. Só lead_id e data. Grant: select a authenticated; a RLS de receita.lista_dia limita a staff.';
comment on function public.rpc_receita_montar_lista_do_dia() is 'Consumidor: o botão "montar a lista de hoje" da aba e a carga. Grant: execute a authenticated, porque o portão está dentro (is_staff ou a identidade da carga). Não grava execução de rotina.';
comment on function public.rpc_receita_lista_resultado(date, uuid, text, text) is 'Consumidor: os botões de resultado da aba Lista do dia. Grant: execute a authenticated, porque o portão está dentro (só is_staff). A carga é recusada: quem diz que o dono ligou é o dono.';
comment on function receita.fn_montar_lista_do_dia(date, integer) is 'Interna: a regra de quem entra na lista. Chamada pelo cron e pela rpc_receita_montar_lista_do_dia. Sem grant a authenticated.';
comment on function receita.fn_rotina_lista_do_dia() is 'Interna: o que o cron receita-lista-do-dia chama às 08h de Brasília, de segunda a sábado. Monta a lista e grava a própria execução (ou a falha) em receita.rotina.';
