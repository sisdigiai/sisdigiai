-- 167 — o último toque por lead, que é o que a coluna "morno" do kanban precisa
--
-- ✔ APLICADA em 30/09/2026 às 19:06:05 BRT, reensaiada antes.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE SEPARADA DA 166: escrevi a tela do kanban depois de aplicar a 166 e percebi que ela precisava de um
--   corte que eu não tinha criado — um toque POR LEAD, não a contagem por semana. Preferi migration nova a
--   remendar a 166 já aplicada: migration aplicada é registro do que aconteceu, não rascunho.
--
-- O QUE FAZ: para cada lead do funil que o dono tocou, devolve o ÚLTIMO toque e quantos foram. Lead tocado
--   com nome livre (sem lead_id) não entra aqui — ele existe no placar, mas não tem coluna no kanban porque
--   não é um lead do funil.

begin;

do $$
begin
  if to_regclass('public.v_ops_toques_lead') is not null then
    raise exception 'v_ops_toques_lead ja existe — a 167 ja foi aplicada?';
  end if;
end $$;

create view public.v_ops_toques_lead
with (security_invoker = true) as
select distinct on (lead_id)
       lead_id, tipo, quando, otica,
       count(*) over (partition by lead_id) as toques
  from ops.toque_venda
 where lead_id is not null
 order by lead_id, quando desc;

revoke all on public.v_ops_toques_lead from public, anon;
grant select on public.v_ops_toques_lead to authenticated, service_role;
comment on view public.v_ops_toques_lead is
  '167: último toque de venda por lead do funil, para a coluna "morno" do kanban. Toque com nome livre não entra.';

do $$
declare v_id bigint; v_n int;
begin
  -- controle positivo (R-043 §4-A): authenticated LÊ, anon NÃO
  if not has_table_privilege('authenticated', 'public.v_ops_toques_lead', 'select') then
    raise exception 'PROVA_167_FALHOU: authenticated nao le a view';
  end if;
  if has_table_privilege('anon', 'public.v_ops_toques_lead', 'select') then
    raise exception 'PROVA_167_FALHOU: anon le a view';
  end if;

  -- dois toques no mesmo lead têm de virar UMA linha, com o último
  insert into ops.toque_venda (tipo, otica, lead_id, quando)
  values ('ligacao', 'Prova 167', '00000000-0000-0000-0000-000000000167', now() - interval '2 days')
  returning id into v_id;
  insert into ops.toque_venda (tipo, otica, lead_id, quando)
  values ('demo', 'Prova 167', '00000000-0000-0000-0000-000000000167', now());

  select count(*) into v_n from public.v_ops_toques_lead
   where lead_id = '00000000-0000-0000-0000-000000000167';
  if v_n <> 1 then raise exception 'PROVA_167_FALHOU: % linhas para o mesmo lead', v_n; end if;
  if (select tipo from public.v_ops_toques_lead
       where lead_id = '00000000-0000-0000-0000-000000000167') <> 'demo' then
    raise exception 'PROVA_167_FALHOU: nao trouxe o ULTIMO toque';
  end if;
  if (select toques from public.v_ops_toques_lead
       where lead_id = '00000000-0000-0000-0000-000000000167') <> 2 then
    raise exception 'PROVA_167_FALHOU: a contagem de toques nao bate';
  end if;

  delete from ops.toque_venda where otica = 'Prova 167';
  if (select count(*) from ops.toque_venda) <> 0 then
    raise exception 'PROVA_167_FALHOU: sobrou linha de prova';
  end if;
end $$;

commit;
