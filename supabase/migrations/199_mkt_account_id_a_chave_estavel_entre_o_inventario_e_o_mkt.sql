-- 199 — `mkt_account_id`: a chave estável entre o inventário da casa e as contas do MKT
--
-- ✔ APLICADA em 09/10/2026 às 22:29:26 BRT, reensaiada antes — e o ensaio recusou **duas** versões minhas,
--   as duas por eu ter medido errado (ver abaixo). Depois: **27 com par, 9 sem**, e **7 das 9 sem
--   `conta_dona`** no inventário.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: ordem do dono em 09/10 ("a lista de redes do app digiai se atualiza sozinha, como a do MKT").
--   Perguntei ao MKT qual era a chave e ele respondeu: **`v_mkt_accounts.id`** (uuid), que existe em todas as
--   contas e **não muda quando o perfil é renomeado**. O `account_ref` não serve — só 25 das 46 contas têm.
--
-- POR QUE NÃO JUNTAR POR `handle`: handle muda quando a pessoa renomeia o perfil, e a junção quebraria
--   calada — a tela continuaria mostrando, com a conta errada ou com nenhuma. Guardar o uuid custa uma
--   coluna e sobrevive a rename.
--
-- O QUE A MEDIÇÃO MOSTROU, e mudou a regra de casamento:
--   Minhas 36 contas `rede_social` contra as 46 do MKT, e **a ordem das tentativas decidiu o resultado**:
--   casamento **EXATO** primeiro, normalização depois, `account_ref` por último.
--
--   O meu primeiro ensaio usava só a normalização (tirar o rótulo entre parênteses do `identificador`) e
--   produziu um problema que não existe: `Gilberto Junior` e `Gilberto Junior (2º perfil)` colapsavam no
--   mesmo valor e pareciam disputar uma única conta do MKT. Fui olhar: **o MKT tem os DOIS perfis
--   separadamente** — e com o casamento exato cada um casa com o seu, mais o `Gilberto Junior` do LinkedIn.
--   Os três casam certo. A disputa era artefato da minha consulta, não do dado.
--   A normalização **continua condicional** (só vale quando o valor limpo é único do meu lado), não porque
--   houve colisão, mas porque é o que impede uma colisão futura de entrar calada.
--
-- OS QUE FICAM SEM PAR, e não forço nenhum:
--   · 5 `Óticas Taty Mello - <loja>` que eu classifico como **facebook** e o MKT cadastrou como
--     **google_business** (ele acrescentou as 5 fichas do Google agora, em `20261009_17`). Ou são coisas
--     diferentes — página de Facebook por loja × ficha do Google por local — ou uma das duas classificações
--     está errada. Casar por cima decidiria isso no escuro; fica nulo e vai como pergunta.
--   · `@acervopolapetit` e `@atelietatymello`: o MKT não as conhece (ele disse). Decisão do dono.
--   · `Óticas Sem Improviso`, `Polá Petit`, `@decamargosilvajunior (Mello Óticas)`: sem par pelo critério atual.
--     (`DIGIAI (Company Page)` casou — pelo casamento EXATO, que a normalização teria estragado.)
--
-- ACHADO DE CARONA, e é do meu lado: **7 das 9 sem par não têm `conta_dona`** — `Óticas Taty Mello` das 4
--   lojas e `Polá Petit`. Conta de rede no inventário sem dono registrado é furo de R-042: se amanhã alguém
--   precisar entrar nela, não há onde olhar. Vai para o meu "em aberto".
--
-- ÍNDICE ÚNICO DE PROPÓSITO: duas linhas minhas não podem apontar para a mesma conta do MKT. Sem isso, o
--   caso do "2º perfil" entraria calado e a tela mostraria a mesma conta duas vezes — o mesmo defeito que eu
--   consertei hoje na página Controle para as decisões do dono.
--
-- O QUE ESTA COLUNA NÃO É: ela não transforma `ops.contas_servicos` em cópia da view. O inventário guarda de
--   quem a conta É (`conta_dona`, `navegador`, `secret_ref` — R-042); a view guarda o que a rede MOSTRA. A
--   chave só liga os dois, e cada lado continua dono do que sabe.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='ops' and table_name='contas_servicos' and column_name='mkt_account_id') then
    raise exception 'a coluna mkt_account_id ja existe — a 199 ja foi aplicada?';
  end if;
  if to_regclass('public.v_mkt_accounts') is null then
    raise exception 'v_mkt_accounts nao existe — sem ela nao ha o que ligar';
  end if;
end $$;

alter table ops.contas_servicos add column mkt_account_id uuid;

create unique index contas_servicos_mkt_account
  on ops.contas_servicos (mkt_account_id) where mkt_account_id is not null;

comment on column ops.contas_servicos.mkt_account_id is
  '199: `v_mkt_accounts.id` — a chave estável da conta no MKT, que sobrevive a rename do perfil (handle não). '
  'Nula quando o MKT não tem par para a conta, e isso é resposta, não falta: há conta que a casa inventaria e '
  'o MKT não publica, e vice-versa. Índice único: duas linhas daqui não podem apontar para a mesma conta lá.';

-- Casamento, em três tentativas e nenhuma no escuro. A normalização do `identificador` (tirar o rótulo entre
-- parênteses) só vale quando o valor limpo é ÚNICO do meu lado — senão colapsaria dois perfis reais em um.
with meu as (
  select c.id,
         replace(c.servico, 'rede_', '')                                   as plat,
         lower(btrim(c.identificador))                                     as ident,
         lower(btrim(regexp_replace(c.identificador, '\s*\(.*\)\s*$', ''))) as ident_limpo
    from ops.contas_servicos c
   where c.ativo and c.categoria = 'rede_social'),
limpo_unico as (
  select plat, ident_limpo from meu group by plat, ident_limpo having count(*) = 1
),
par as (
  select m.id,
         coalesce(
           (select a.id from public.v_mkt_accounts a
             where a.platform = m.plat and lower(btrim(a.handle)) = m.ident limit 1),
           (select a.id from public.v_mkt_accounts a
             where a.platform = m.plat and lower(btrim(a.handle)) = m.ident_limpo
               and exists (select 1 from limpo_unico u
                            where u.plat = m.plat and u.ident_limpo = m.ident_limpo) limit 1),
           (select a.id from public.v_mkt_accounts a
             where a.platform = m.plat and lower(btrim(coalesce(a.account_ref,''))) = m.ident limit 1)
         ) as mkt_id
    from meu m)
update ops.contas_servicos c
   set mkt_account_id = p.mkt_id
  from par p
 where c.id = p.id and p.mkt_id is not null;

do $$
declare v_casaram int; v_minhas int; v_sem int; v_dono_fb int;
begin
  select count(*) filter (where mkt_account_id is not null), count(*)
    into v_casaram, v_minhas
    from ops.contas_servicos where ativo and categoria = 'rede_social';
  v_sem := v_minhas - v_casaram;

  -- a) casou o que eu medi: 25 de 36. Se o número mudar, mudou o dado ou a regra, e eu quero saber.
  if v_minhas <> 36 then
    raise exception 'PROVA_199_FALHOU: eu tinha 36 contas de rede e agora sao % — rever antes', v_minhas;
  end if;
  -- 27, e nao os 25 do meu ensaio solto: a migration tenta casamento EXATO antes da normalizacao, e isso
  -- pegou 2 que o ensaio perdia (`DIGIAI (Company Page)` casa exato; "limpo" viraria so "digiai").
  if v_casaram <> 27 then
    raise exception 'PROVA_199_FALHOU: casaram % e eu medi 27', v_casaram;
  end if;

  -- b) O CASO QUE O CASAMENTO EXATO RESOLVE: os TRES "Gilberto Junior" (2 no Facebook, 1 no LinkedIn) casam,
  --    cada um com a sua conta, e com uuid DIFERENTE. A primeira versao desta prova esperava 1 de 2, porque
  --    eu havia medido errado — o ilike pega as tres redes, e o MKT tem os dois perfis do Facebook. A prova
  --    agora afirma o que e verdade: tres pares, tres uuids distintos.
  select count(*) into v_dono_fb from ops.contas_servicos
   where ativo and categoria='rede_social' and identificador ilike 'Gilberto Junior%'
     and mkt_account_id is not null;
  if v_dono_fb <> 3 then
    raise exception 'PROVA_199_FALHOU: esperava os 3 perfis "Gilberto Junior" com par e achei %', v_dono_fb;
  end if;
  if (select count(distinct mkt_account_id) from ops.contas_servicos
       where ativo and categoria='rede_social' and identificador ilike 'Gilberto Junior%') <> 3 then
    raise exception 'PROVA_199_FALHOU: os 3 perfis nao receberam uuids distintos';
  end if;

  -- c) CONTROLE POSITIVO (R-043 §4-A): nao basta casar — o que NAO tem par tem de ficar nulo e visivel.
  --    Se sem_par fosse 0, eu teria forcado casamento no escuro, que e o que esta migration existe para nao
  --    fazer (5 lojas classificadas como facebook aqui e google_business la, 2 contas que o MKT nao conhece).
  if v_sem <> 9 then
    raise exception 'PROVA_199_FALHOU: esperava 9 sem par e achei % — ou forcei, ou perdi', v_sem;
  end if;

  -- d) nenhuma conta do MKT apontada por duas minhas (o indice ja barra; aqui fica dito)
  if exists (select mkt_account_id from ops.contas_servicos
              where mkt_account_id is not null group by mkt_account_id having count(*) > 1) then
    raise exception 'PROVA_199_FALHOU: conta do MKT disputada por duas linhas minhas';
  end if;

  -- e) o inventario NAO perdeu o que e dele: secret_ref/conta_dona/navegador seguem preenchidos
  if (select count(*) from ops.contas_servicos
       where ativo and categoria='rede_social' and conta_dona is not null) = 0 then
    raise exception 'PROVA_199_FALHOU: o inventario perdeu conta_dona — a chave nao substitui o que e da casa';
  end if;

  set local role authenticated;
  perform count(*) from public.v_ops_contas_servicos;
  reset role;
end $$;

commit;
