-- 208 — as quatro views deixam de furar a RLS, e nada é apagado
--
-- ✔ APLICADA em 30/10/2026, reensaiada antes (e o ensaio REESCREVEU o conserto: invoker nas quatro
--   dava `permission denied for table ops.empresas`, o que me fez medir e achar a RLS sem política).
--   MEDIDO DEPOIS, com as duas identidades simuladas por JWT:
--     · LOGADO FORA DA EQUIPE: 0 leads, 0 telefones, 0 em `v_mkt_contas`, e sem acesso às duas do
--       cofre — contra **946 leads e 917 telefones** antes.
--     · EQUIPE (o dono): 946 leads, 917 telefones, 60 contas — **igual a antes**, nada quebrou.
--   As quatro views continuam existindo. Nada foi apagado.
--
-- (Escrita como NÃO APLICADA.)
--
-- ═════ A PERGUNTA DO DONO, EM 30/10: "por que apagar as views?" ═════
--   A pergunta está certa e a minha moldura estava errada. **Apagar nunca foi o objetivo** — o objetivo é
--   fechar um vazamento. As quatro foram para a mesma migration (a 185) porque nenhuma tem leitor, e aí
--   "remover" pareceu o caminho limpo. Mas "sem leitor" justifica FAXINA, não urgência; o que é urgente é
--   o vazamento. Eu passei 26 dias pedindo a decisão CARA (drop em produção, destrutivo, que exige a
--   palavra dele) quando existia esta, que é barata, reversível e não apaga nada.
--
-- ═════ O VAZAMENTO, MEDIDO HOJE E NÃO SUPOSTO ═════
--   Simulando um **logado que NÃO é da equipe** (`role authenticated` + `request.jwt.claims` com um `sub`
--   que não existe em `iam.users`):
--     · `ops.commercial_leads` direto na tabela → **0 linhas**. A RLS funciona.
--     · `public.v_vendas_leads`                 → **946 leads e 917 telefones**.
--     · `public.v_mkt_vendas_leads` (a nova)    → **0 linhas**. Já nasceu certa.
--     · `v_ops_cofre` → 101, `v_ops_cofre_resumo` → 13 (com a coluna `telefones`), `v_mkt_contas` → 60.
--   A view era a única coisa furando a RLS. E são **duas** com telefone, não uma — eu vinha citando só a
--   de lead, e `v_ops_cofre_resumo` carrega telefone pelo mesmo mecanismo.
--
--   Causa: view sem `security_invoker` roda como a DONA (`postgres`, que tem BYPASSRLS), então a política
--   da tabela não é consultada. R-043 em estado puro.
--
--   AGRAVANTE que muda o peso: entre os 946 há **38 que pediram opt-out**. O telefone de quem pediu para
--   não ser incomodado estava legível junto do pedido.
--
-- ═════ O ENSAIO MUDOU O CONSERTO, E ESTE É O ACHADO DE VERDADE ═════
--   A 1.ª versão desta migration declarava `invoker` nas quatro. O ensaio recusou:
--   **`permission denied for table ops.empresas`**. Fui medir e achei o que realmente se passa:
--     · `ops.contas_servicos` → RLS ligada, grant para `authenticated`, política `is_staff()`. Normal.
--     · **`ops.empresas` → RLS LIGADA e ZERO POLÍTICAS**, sem grant para `authenticated`.
--   RLS ligada sem política nenhuma significa **negar a todos**. Então as duas views do cofre não são
--   "views com um defeito de segurança": elas só **funcionavam porque furavam a RLS** de uma tabela que
--   ninguém tem permissão de ler. Não existe caminho legítimo para elas hoje, nem para a equipe.
--
--   Por isso o tratamento é diferente para cada par, e cada um pelo seu motivo:
--     · **`v_vendas_leads` e `v_mkt_contas` → `security_invoker`.** As origens
--       (`ops.commercial_leads` com `pode_tocar_lead()`, `mkt.accounts` com 4 políticas) têm grant e
--       política, logo a view passa a mostrar o certo a cada um: nada para quem não é da equipe, e o que
--       é dela para quem é.
--     · **`v_ops_cofre` e `v_ops_cofre_resumo` → sai o `select` de `authenticated`.** Declarar invoker
--       aqui trocaria o vazamento por **42501 para todo mundo**, inclusive a equipe, e dar grant em
--       `ops.empresas` devolveria **zero linhas** (a RLS nega a todos) — uma view que parece funcionar e
--       não mostra nada é a mentira que eu mais recuso nesta tela. Então o acesso sai; o objeto fica.
--       Quando aparecer um consumidor, quem o escrever decide o acesso com uma política de verdade.
--
-- ═════ POR QUE ISTO NÃO PRECISA DA PALAVRA DO DONO, E A 185 PRECISAVA ═════
--   Nada é apagado, nenhum dado se perde, e os dois comandos voltam com um comando cada
--   (`set (security_invoker = false)` / `grant select`). É a mesma classe das migrations **182, 183 e
--   184**, já aplicadas neste app pelo mesmo motivo. E erra para o lado seguro: quem lê, passa a ler
--   MENOS. O `drop` da 185 é que é destrutivo — e **depois desta ele deixa de ser risco e passa a ser
--   faxina**, para quando o dono quiser, ou nunca.
--
-- ═════ O QUE SE PROVA AQUI ═════
--   As duas pontas, com a mesma simulação: quem não é da equipe perde o acesso, e **quem é da equipe
--   continua lendo o que lia**. Sem a segunda, eu teria trocado um vazamento por uma tela vazia — que é
--   consertar mudando de quem é o problema.

begin;

do $$
declare v_n int; v_pol int;
begin
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and c.relname in ('v_ops_cofre','v_ops_cofre_resumo','v_mkt_contas','v_vendas_leads')
     and coalesce((select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                    where split_part(o,'=',1) = 'security_invoker'), 'f') not in ('true','on');
  if v_n <> 4 then
    raise exception 'esperava 4 views sem invoker e achei % — a 208 ja foi aplicada?', v_n;
  end if;

  -- a premissa que mudou o desenho: `ops.empresas` com RLS ligada e nenhuma politica.
  -- Se alguem criar politica la, o tratamento do cofre deve ser reconsiderado (invoker em vez de revoke).
  select count(*) into v_pol from pg_policy where polrelid = 'ops.empresas'::regclass;
  if v_pol <> 0 then
    raise exception 'ops.empresas agora tem % politica(s) — rever o cofre antes de aplicar', v_pol;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'ops.empresas'::regclass) then
    raise exception 'ops.empresas esta sem RLS — rever a premissa antes de aplicar';
  end if;
end $$;

-- `alter view ... set (security_invoker = true)` NÃO recria a view: preserva definição, colunas, grants e
-- comentário. É o que faz desta mudança uma correção de propriedade, e não uma reescrita.
alter view public.v_vendas_leads set (security_invoker = true);
alter view public.v_mkt_contas   set (security_invoker = true);

-- O cofre: sai o acesso, fica o objeto. Ver o bloco acima para o motivo de não ser invoker aqui.
revoke select on public.v_ops_cofre        from authenticated;
revoke select on public.v_ops_cofre_resumo from authenticated;

comment on view public.v_vendas_leads is
  '208: COMPAT do rename de 14/09, agora `security_invoker`. Rodava como dona e por isso ignorava a RLS de '
  '`ops.commercial_leads`: um logado que NÃO era da equipe lia 946 leads e 917 telefones por aqui, '
  'enquanto a mesma consulta na tabela devolvia 0 (medido em 30/10 com JWT de quem não é staff). Entre '
  'eles, 38 que pediram opt-out. A substituta é `public.v_mkt_vendas_leads`, que já nasceu invoker. '
  'Removê-la (migration 185) é faxina, não risco — o risco fechou aqui.';

comment on view public.v_ops_cofre is
  '208: `select` retirado de `authenticated`. Esta view lê `ops.empresas`, que tem **RLS ligada e ZERO '
  'políticas** (nega a todos) e nenhum grant para `authenticated` — ou seja, ela só funcionava porque '
  'rodava como dona e furava a RLS. Invoker aqui daria 42501 para todos, inclusive a equipe, e dar grant '
  'em `ops.empresas` devolveria zero linhas: view que parece funcionar e não mostra nada é pior que view '
  'fechada. Nenhum consumidor em repo nenhum (medido na 185). Quando aparecer um, escreva a política antes '
  'do grant.';

comment on view public.v_ops_cofre_resumo is
  '208: `select` retirado de `authenticated`, pelo mesmo motivo de `v_ops_cofre` — e esta carregava a '
  'coluna `telefones` (13 linhas) legível por qualquer logado.';

do $$
declare v_claims_fora text; v_claims_staff text;
        v_leads int; v_tel int; v_contas int; v_fechou boolean;
begin
  -- as duas identidades sao lidas ANTES da troca de papel: como `authenticated` a leitura de iam.users
  -- volta vazia e a simulacao nasceria sem `sub` (licao do ensaio da 207).
  select '{"sub":"' || u.auth_id::text || '","role":"authenticated"}' into v_claims_staff
    from iam.users u
   where u.role in ('super_admin','admin','founder') and u.status = 'active' and u.deleted_at is null
   order by u.role limit 1;
  if v_claims_staff is null then
    raise exception 'PROVA_208_FALHOU: nao achei staff ativo para o controle positivo';
  end if;
  v_claims_fora := '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}';

  -- ───── a) O VAZAMENTO FECHOU para quem nao e da equipe
  set local role authenticated;
  perform set_config('request.jwt.claims', v_claims_fora, true);
  if public.is_staff() then
    raise exception 'PROVA_208_FALHOU: o sub inexistente apareceu como staff — prova invalida';
  end if;

  select count(*), count(phone_e164) into v_leads, v_tel from public.v_vendas_leads;
  if v_leads <> 0 or v_tel <> 0 then
    raise exception 'PROVA_208_FALHOU: fora da equipe ainda le % leads e % telefones', v_leads, v_tel;
  end if;
  select count(*) into v_contas from public.v_mkt_contas;
  if v_contas <> 0 then
    raise exception 'PROVA_208_FALHOU: v_mkt_contas ainda devolve % para fora da equipe', v_contas;
  end if;

  -- o cofre tem de RECUSAR, nao devolver vazio: porta fechada se reconhece
  v_fechou := false;
  begin
    perform count(*) from public.v_ops_cofre;
  exception when insufficient_privilege then v_fechou := true;
  end;
  if not v_fechou then
    raise exception 'PROVA_208_FALHOU: v_ops_cofre continua acessivel fora da equipe';
  end if;
  v_fechou := false;
  begin
    perform count(*) from public.v_ops_cofre_resumo;
  exception when insufficient_privilege then v_fechou := true;
  end;
  if not v_fechou then
    raise exception 'PROVA_208_FALHOU: v_ops_cofre_resumo continua acessivel fora da equipe';
  end if;

  -- ───── b) CONTROLE POSITIVO: quem E da equipe continua lendo o que lia.
  --      Sem isto, "fechar tudo" passaria pela prova (a) e eu teria quebrado o trabalho de alguem.
  perform set_config('request.jwt.claims', v_claims_staff, true);
  if not public.is_staff() then
    raise exception 'PROVA_208_FALHOU: a simulacao de staff nao produziu staff';
  end if;

  select count(*), count(phone_e164) into v_leads, v_tel from public.v_vendas_leads;
  if v_leads = 0 then
    raise exception 'PROVA_208_FALHOU: a equipe parou de ler lead — grant ou politica faltando na origem';
  end if;
  select count(*) into v_contas from public.v_mkt_contas;
  if v_contas = 0 then
    raise exception 'PROVA_208_FALHOU: a equipe parou de ler v_mkt_contas';
  end if;

  perform set_config('request.jwt.claims', null, true);
  reset role;

  -- ───── c) a propriedade se confere na DEFINICAO (R-043 §4-B), nao na intencao
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relname in ('v_vendas_leads','v_mkt_contas')
                and coalesce((select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                               where split_part(o,'=',1) = 'security_invoker'), 'f')
                    not in ('true','on')) then
    raise exception 'PROVA_208_FALHOU: alguma das duas ficou sem invoker na definicao';
  end if;

  -- ───── d) NADA FOI APAGADO: as quatro continuam existindo
  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'v'
         and c.relname in ('v_ops_cofre','v_ops_cofre_resumo','v_mkt_contas','v_vendas_leads')) <> 4 then
    raise exception 'PROVA_208_FALHOU: esta migration nao apaga view, e falta alguma';
  end if;

  -- ───── e) e nenhuma delas abriu para anon
  if pg_catalog.has_table_privilege('anon','public.v_vendas_leads','select')
  or pg_catalog.has_table_privilege('anon','public.v_mkt_contas','select') then
    raise exception 'PROVA_208_FALHOU: anon le alguma das duas';
  end if;
end $$;

commit;
