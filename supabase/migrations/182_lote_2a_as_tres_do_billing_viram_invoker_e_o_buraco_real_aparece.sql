-- 182 — lote 2a: as 3 views de billing viram invoker, e a medição mostra que o buraco é outro
--
-- ✔ APLICADA em 05/10/2026 às 16:41:47 BRT, reensaiada antes. Depois: 36 → 33 donas, 0 legível por anon.
--
-- (Escrita como NÃO APLICADA.)
--
-- O LOTE 2 ERA DE 17 E NÃO É. Antes de virar nada, li as policies de todas as tabelas-base. O que apareceu:
--
-- (a) **TRÊS tabelas têm RLS ligada e ZERO policies** — `ops.scorecard_entries`, `ops.scorecard_metrics` e
--     `ops.bairro_coordenada`. RLS ligada sem policy significa que ninguém lê. Virar invoker em
--     `v_ops_scorecard` (ambas as bases com 0 policies), `v_ops_frescor`/`v_ops_reconfirmar` (uma base) e
--     `v_ops_cobertura_aproximada` esvaziaria o placar e os pontos aproximados do mapa — tela viva, número
--     zero, que é o modo de falha que esta varredura existe para evitar. **Ficam de fora até a policy existir.**
--
-- (b) **O buraco real do billing não é view, é policy.** `billing.subscribers` e `billing.mp_events_raw` têm
--     `billing_leitura_logado SELECT authenticated USING (true)`. Ou seja: **qualquer logado lê assinantes,
--     MRR e eventos de pagamento**, com ou sem invoker. O portão 65 (09/09) dizia que o papel `vendas` leria
--     o financeiro "pelas views definer" — leria pelas views, sim, mas leria igual depois de consertá-las,
--     porque a tabela está aberta por baixo. Isso é decisão de acesso (R-037: autorização vem do banco, e
--     quem decide quem vê MRR é o dono / o Geral), então vai como achado e NÃO é mexido aqui.
--
-- (c) as outras 11 têm policy por papel de verdade (`is_staff()`, `mkt.is_admin()`, `pode_tocar_lead()`,
--     `mkt.pode_ver_brand()`). Invoker nelas funciona e muda algo — mas **não se prova sem a sessão do dono**:
--     `set role` troca `current_user` e não carrega JWT, então `is_staff()` mente (lição registrada). Vão no
--     lote 2b, com conferência na tela.
--
-- ENTÃO O QUE ESTE LOTE FAZ: vira as 3 do billing, que são as únicas provaveis agora — a policy da base é
--   `using (true)`, logo invoker não pode esvaziar nada, e `set role authenticated` prova de verdade (a
--   pergunta aqui é de grant + policy permissiva, não de papel no JWT).
--
-- E SE NÃO MUDA NADA HOJE, PARA QUE FAZER: para que, no dia em que a policy da base for fechada, as views
--   acompanhem sozinhas. Hoje elas ignorariam o aperto. É a diferença entre "está protegido" e "vai obedecer
--   quando for protegido" — e eu só afirmo a segunda.

begin;

do $$
declare v_tudo_true int;
begin
  if (select count(*) from ops.v_views_sem_invoker
       where view in ('v_billing_mrr','v_billing_subscriptions','v_billing_overdue')) <> 3 then
    raise exception 'as 3 do billing nao estao todas donas — a 182 ja foi aplicada?';
  end if;

  -- a premissa deste lote: a policy de leitura da base é permissiva. Se alguém a fechou enquanto eu escrevia,
  -- invoker PODE esvaziar, e então eu não tenho prova — paro em vez de aplicar no escuro.
  select count(*) into v_tudo_true from pg_policies
   where schemaname='billing' and tablename='subscribers' and cmd='SELECT' and qual='true';
  if v_tudo_true <> 1 then
    raise exception 'a policy de leitura de billing.subscribers nao e mais `true` — rever o lote, invoker pode esvaziar';
  end if;
end $$;

alter view public.v_billing_mrr          set (security_invoker = true);
alter view public.v_billing_subscriptions set (security_invoker = true);
alter view public.v_billing_overdue       set (security_invoker = true);

comment on view public.v_billing_subscriptions is
  '182: security_invoker. ATENÇÃO: isto NÃO restringe ninguém hoje — `billing.subscribers` tem policy de '
  'leitura `using (true)` para authenticated, então qualquer logado lê assinantes e MRR. O invoker existe '
  'para que a view obedeça no dia em que essa policy for fechada. Fechá-la é decisão do dono (R-037).';

comment on view public.v_billing_mrr is
  '182: security_invoker. Mesma ressalva de v_billing_subscriptions: a base está aberta a qualquer logado.';

comment on view public.v_billing_overdue is
  '182: security_invoker. Lê v_billing_subscriptions, que também é invoker — a cadeia inteira respeita a RLS '
  'da base. Mesma ressalva: a base está aberta a qualquer logado.';

do $$
declare v_dono int; v_auth int; v_n int;
begin
  -- a) as 3 saíram da lista do medidor
  if exists (select 1 from ops.v_views_sem_invoker
              where view in ('v_billing_mrr','v_billing_subscriptions','v_billing_overdue')) then
    raise exception 'PROVA_182_FALHOU: alguma das 3 continua dona';
  end if;

  -- b) CONTROLE POSITIVO (R-043 §4-A): não basta trancar, a chave certa tem de abrir. Aqui `set role` prova
  --    de verdade porque a policy é `using (true)` — não depende de papel no JWT.
  select count(*) into v_dono from public.v_billing_subscriptions;
  set local role authenticated;
  select count(*) into v_auth from public.v_billing_subscriptions;
  reset role;
  if v_auth <> v_dono then
    raise exception 'PROVA_182_FALHOU: authenticated passou a ver % de % linhas — esvaziei a tela', v_auth, v_dono;
  end if;

  -- c) a cadeia: a filha também tem de continuar lendo
  set local role authenticated;
  select count(*) into v_n from public.v_billing_overdue;
  reset role;
  if v_n is null then raise exception 'PROVA_182_FALHOU: v_billing_overdue quebrou na cadeia'; end if;

  -- d) e as de 0 policies NÃO foram tocadas de carona — é o ponto deste lote não ser o lote 2 inteiro
  if not exists (select 1 from ops.v_views_sem_invoker where view = 'v_ops_scorecard') then
    raise exception 'PROVA_182_FALHOU: mexi em v_ops_scorecard, cuja base tem RLS sem policy — esvaziaria o placar';
  end if;
  if not exists (select 1 from ops.v_views_sem_invoker where view = 'v_ops_cobertura_aproximada') then
    raise exception 'PROVA_182_FALHOU: mexi em v_ops_cobertura_aproximada, que esvaziaria os pontos do mapa';
  end if;

  select count(*) into v_n from ops.v_views_sem_invoker;
  if v_n <> 33 then raise exception 'PROVA_182_FALHOU: esperava 33 donas restantes e achei %', v_n; end if;
end $$;

commit;
