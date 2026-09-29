-- 163 — a passada do estado passa a dizer DE ONDE veio, porque nem tudo pode sair da máquina do dono
--
-- ✔ APLICADA em 29/09/2026 às 14:38:23 BRT, reensaiada antes. A Action `.github/workflows/estado-runner.yml`
--   foi pushada na Cockpit (eafccab) e roda no minuto 5 de cada hora assim que o dono puser o segredo.
--   Provado antes de subir: o runner com DIGIAI_RAIZ inexistente e ESTADO_ORIGEM=servidor leu 25 fichas,
--   14 portões abertos e 13 fechados, com sinais_repo = 0 — exatamente a divisão desenhada.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE: o dono pediu (28/09) para tirar o runner do estado da máquina dele — hoje, se o PC dorme, a ficha e
--   o repo na tela envelhecem calados. Ao abrir o runner ficou claro que "mover para o servidor" não é mover:
--   ele lê quatro coisas e só três podem sair daqui.
--
--   A. decisões (Cockpit/decisoes/*.md)   → estão no repo. Servidor lê.
--   B. portões (Cockpit/portoes-abertos.md) → está no repo. Servidor lê.
--   C. fichas (Cockpit/Apps/<app>/ficha.md) → estão no repo. Servidor lê.
--   D. sinais de git de cada app            → **NÃO SAEM DAQUI, e não é limitação técnica**: "push atrasado" e
--      "arquivo não commitado" só existem na máquina onde o trabalho está. Do servidor, o remoto É a verdade,
--      então perguntar "está pushado?" lá de fora sempre responderia "sim". Medir isso no servidor não seria
--      mover o sinal — seria apagá-lo e fingir que está tudo em dia.
--
-- ENTÃO: duas passadas com papéis diferentes. O servidor (GitHub Actions, de hora em hora) mantém ficha,
--   decisão e portão sempre frescos, com ou sem o dono. A máquina, quando ligada, acrescenta os sinais de git.
--   A coluna `origem` é o que permite a tela dizer a verdade sobre cada metade em vez de uma média mentirosa.
--
-- O ALARME SE PARTE EM DOIS, pelo mesmo motivo:
--   `estado_parado`      — nenhuma passada, de origem nenhuma, há mais de 2 h: a tela inteira está velha.
--   `sinais_repo_velhos` — o servidor está passando, mas a máquina do dono não passa há mais de 36 h: ficha e
--                          portão estão frescos, e só o "push atrasado" é que é retrato velho. Dizer isso é
--                          diferente de dizer "runner parado" — e a diferença muda o que a pessoa faz.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='ops' and table_name='estado_passada' and column_name='origem') then
    raise exception 'ops.estado_passada.origem ja existe — a 163 ja foi aplicada?';
  end if;
end $$;

alter table ops.estado_passada
  add column origem text not null default 'maquina'
  check (origem in ('maquina', 'servidor'));

comment on column ops.estado_passada.origem is
  '163: maquina = runner na máquina do dono (única que enxerga push atrasado e arquivo não commitado); '
  'servidor = GitHub Actions da Cockpit, lê só o que está no repo.';

create or replace function ops.fn_registrar_passada(p jsonb)
returns bigint
language sql
security definer
set search_path = ''
as $$
  insert into ops.estado_passada (fichas, nao_declarados, recusadas, origem)
  values (coalesce((p->>'fichas')::int, 0),
          coalesce(array(select jsonb_array_elements_text(p->'nao_declarados')), '{}'),
          coalesce(array(select jsonb_array_elements_text(p->'recusadas')), '{}'),
          case when p->>'origem' = 'servidor' then 'servidor' else 'maquina' end)
  returning id;
$$;

create or replace view public.v_ops_reconfirmar as
select 'ficha_vencida'::text as tipo, a.slug as ref, a.nome as titulo,
       'Ficha declarada em ' || to_char(a.declarado_em::timestamptz, 'DD/MM') || ', validade de ' ||
       a.validade_dias || ' dias. Fonte: ' || a.ficha_fonte as porque
  from ops.apps a
 where a.ativo and (now() at time zone 'America/Sao_Paulo')::date > (a.declarado_em + a.validade_dias)
union all
select 'portao_sumiu_do_indice', p.numero, p.titulo,
       'Saiu de Cockpit/portoes-abertos.md sem entrada em Fechados. Visto pela última vez em ' ||
       to_char(p.visto_no_indice_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.'
  from ops.pendencias_humanas p
 where p.indice_estado = 'sumiu_do_indice' and p.deleted_at is null
union all
select 'decisao_vencida', d.fonte_arquivo, d.title,
       'Validade até ' || to_char(d.valida_ate::timestamptz, 'DD/MM') ||
       '. Decisão do dono: reconfirmar ou revogar por arquivo.'
  from ops.decisions d
 where d.valida_ate is not null and d.revogada_em is null and d.deleted_at is null
   and (now() at time zone 'America/Sao_Paulo')::date > d.valida_ate
union all
select 'app_nao_declarado', x.app, x.app,
       'Cockpit/Apps/' || x.app || '/ficha.md existe mas não tem o bloco de frontmatter que o runner lê — ' ||
       'o app não aparece no Portfólio nem tem estado medido.'
  from (select unnest(u.nao_declarados) app
          from (select * from ops.estado_passada order by medido_em desc limit 1) u) x
union all
select 'ficha_recusada', split_part(x.motivo, ':', 1), split_part(x.motivo, ':', 1),
       'Ficha recusada pelo runner: ' || x.motivo || '. Valor fora do padrão — corrigir na ficha.'
  from (select unnest(u.recusadas) motivo
          from (select * from ops.estado_passada order by medido_em desc limit 1) u) x
union all
-- 163: nenhuma passada de origem nenhuma. A tela inteira está velha.
select 'estado_parado', 'estado-runner', 'Estado dos apps parado',
       'Última passada em ' || to_char(u.medido_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') ||
       ' (servidor passa de hora em hora). Ficha, portão e repo na tela são retrato velho.'
  from (select * from ops.estado_passada order by medido_em desc limit 1) u
 where u.medido_em < now() - interval '2 hours'
union all
-- 163: o servidor cobre ficha/portão/decisão, mas push atrasado e arquivo solto só a máquina do dono vê.
select 'sinais_repo_velhos', 'estado-runner-maquina', 'Sinais de git sem medição recente',
       'A máquina do dono não passa desde ' ||
       coalesce(to_char(m.medido_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'), 'nunca') ||
       '. Ficha e portão seguem frescos pelo servidor; o que envelhece é "push atrasado" e "arquivo não commitado", ' ||
       'que só existem na máquina onde o trabalho está.'
  from (select max(medido_em) medido_em from ops.estado_passada where origem = 'maquina') m
 where coalesce(m.medido_em, '-infinity'::timestamptz) < now() - interval '36 hours'
   and exists (select 1 from ops.estado_passada where medido_em > now() - interval '2 hours')
union all
select 'tela_parada', f.tela, f.nome,
       'Fonte ' || f.fonte || ' sem mexida desde ' ||
       to_char(f.ultimo at time zone 'America/Sao_Paulo', 'DD/MM') || ' (validade de ' || f.validade_dias ||
       ' dias). Aparece em: ' || f.onde || '.'
  from public.v_ops_frescor f
 where f.ultimo < now() - ((f.validade_dias || ' days')::interval);

do $$
declare v_id bigint;
begin
  -- a passada do servidor tem de gravar 'servidor', e a omissão continua sendo 'maquina'
  begin
    select ops.fn_registrar_passada('{"fichas":1,"origem":"servidor"}'::jsonb) into v_id;
    if (select origem from ops.estado_passada where id = v_id) <> 'servidor' then
      raise exception 'PROVA_163_FALHOU: origem servidor nao gravou';
    end if;
    select ops.fn_registrar_passada('{"fichas":1}'::jsonb) into v_id;
    if (select origem from ops.estado_passada where id = v_id) <> 'maquina' then
      raise exception 'PROVA_163_FALHOU: sem origem deveria ser maquina';
    end if;
    raise exception 'PROVA_163_OK';
  exception when others then
    if sqlerrm <> 'PROVA_163_OK' then raise; end if;
  end;

  -- as passadas de verdade ficaram como 'maquina' (é o que eram) e o alarme novo não toca hoje
  if (select count(*) from ops.estado_passada where origem <> 'maquina') <> 0 then
    raise exception 'PROVA_163_FALHOU: passada historica mudou de origem';
  end if;
  if exists (select 1 from public.v_ops_reconfirmar where tipo = 'sinais_repo_velhos') then
    raise exception 'PROVA_163_FALHOU: alarme de sinais velhos tocou com a maquina passando agora';
  end if;
  if exists (select 1 from public.v_ops_reconfirmar where tipo = 'runner_parado') then
    raise exception 'PROVA_163_FALHOU: o tipo antigo runner_parado sobreviveu';
  end if;
end $$;

commit;
