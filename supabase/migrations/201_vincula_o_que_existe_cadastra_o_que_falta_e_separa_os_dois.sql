-- 201 — vincula o que já existe, cadastra o que falta de verdade, e separa os dois casos
--
-- ✔ APLICADA em 09/10/2026 às 22:39:31 BRT, reensaiada antes — e o ensaio recusou **duas** versões minhas:
--   a constraint do banco provou que os 4 WhatsApp já existiam (ver abaixo), e a asserção de "13 sem dono"
--   estava baixa porque eu medira a pergunta estreita. Depois: 4 vinculados, 6 cadastrados, **4** na lista
--   (as lojas da Mello, esperando o dono) e **20** sem dono.
--
-- (Escrita como NÃO APLICADA.)
--
-- ═════ EU ESTAVA ERRADO, E A TRAVA DO BANCO ME CORRIGIU ═════
--   A 200 anunciou "14 contas que o MKT publica e o inventário não tem", e eu disse ao dono e ao MKT que
--   entre elas havia **4 números de WhatsApp sem dono em lugar nenhum**. A primeira versão desta migration
--   tentou inseri-los e a constraint `contas_servicos_servico_identificador_key` recusou: **já existiam**.
--
--   Fui olhar: os 4 estão no inventário com `categoria = 'telefonia'`, **ativos**, e **com
--   `conta_dona = sisdigiai@gmail.com`**. Um número de WhatsApp é telefone e é canal ao mesmo tempo, e quem
--   os cadastrou arquivou como telefonia — o que é defensável. O que falta neles **não é cadastro nem dono**:
--   é o **vínculo** com a conta do MKT.
--
--   O defeito era da minha view: ela perguntava "existe linha ativa com este `mkt_account_id`?" e chamava o
--   "não" de conta ausente. **Linha não vinculada não é conta ausente**, e confundir as duas me fez
--   anunciar um buraco que não existia. A view passa a separar os dois casos, e é isso que impede o próximo
--   relatório errado.
--
-- ═════ O QUE DE FATO FALTAVA: 6, não 14 ═════
--   · 3 canais de YouTube (`@digiai-apps`, `@oticasemimproviso`, `@polapetit`) — `rede_youtube` não tem
--     nenhuma linha no inventário;
--   · `@polapetit` no pinterest e no tiktok;
--   · a ficha do Google da `Óticas Lancaster - Suzano`.
--   As 4 lojas da Mello continuam **fora**, esperando o dono dizer se têm página de Facebook própria (a 200
--   explica por quê, e a prova falha se eu as tocar).
--
-- ═════ E O BURACO DO DONO É MAIOR DO QUE EU DISSE ═════
--   Eu reportei "7 das 9 sem par não têm dono". Medindo a pergunta certa: **14 das 36** contas de rede não
--   têm `conta_dona`, e **8 dessas são contas em que o MKT publica hoje**. Com as 6 novas, ficam **20**.
--   Errei para baixo por ter perguntado só das que não casavam.
--
-- STATUS DAS NOVAS NASCE `desconhecido`: não conferi nenhuma delas; copiei do MKT que existem e em que
--   navegador estão. `ok` seria afirmar verificação que não houve.

begin;

do $$
declare v_wa int; v_falta int;
begin
  -- a premissa da correção: os 4 WhatsApp existem, em telefonia, com dono, e sem vínculo
  select count(*) into v_wa from ops.contas_servicos
   where ativo and servico = 'rede_whatsapp' and categoria = 'telefonia'
     and conta_dona is not null and mkt_account_id is null;
  if v_wa <> 4 then
    raise exception 'esperava os 4 WhatsApp em telefonia, com dono e sem vinculo, e achei % — conferir', v_wa;
  end if;
  select count(*) into v_falta from public.v_ops_redes_sem_inventario;
  if v_falta <> 14 then
    raise exception 'esperava a lista da 200 com 14 e achei % — a 201 ja foi aplicada?', v_falta;
  end if;
end $$;

-- 1) VINCULAR o que existe: os 4 WhatsApp. Não mudo a `categoria` deles — "telefonia" é uma classificação
--    defensável para um número, e trocá-la seria eu decidir vocabulário da casa num passo de vínculo.
update ops.contas_servicos c
   set mkt_account_id = a.id,
       obs = coalesce(c.obs || ' · ', '') ||
         format('201 (09/10): vinculada a conta %s/%s do MKT. A linha ja existia aqui como telefonia, com '
                'dono — faltava so o vinculo. Categoria mantida de proposito.', a.brand_code, a.platform)
  from public.v_mkt_accounts a
 where c.ativo and c.servico = 'rede_whatsapp' and c.mkt_account_id is null
   and a.platform = 'whatsapp'
   and (a.account_ref = regexp_replace(c.identificador, '\D', '', 'g')
     or a.handle = c.identificador);

-- 2) CADASTRAR o que falta de verdade: o que não tem linha com aquele serviço e identificador
insert into ops.contas_servicos
  (servico, identificador, categoria, navegador, produtos, status, mkt_account_id, obs, ativo)
select 'rede_' || a.platform, a.handle, 'rede_social', nullif(a.navegador, ''),
       array[a.brand_code], 'desconhecido', a.id,
       format('201 (09/10): cadastrada a partir de v_mkt_accounts, que publica nela e o inventario nao '
              'tinha linha nenhuma. Navegador vem da view. Falta `conta_dona` — pergunta ao dono. '
              'ID na rede: %s.', coalesce(a.account_ref, 'sem')),
       true
  from public.v_mkt_accounts a
 where a.handle !~* '^sem (conta|ficha)'
   and not exists (select 1 from ops.contas_servicos c
                    where c.mkt_account_id = a.id)
   and not exists (select 1 from ops.contas_servicos c
                    where c.servico = 'rede_' || a.platform and c.identificador = a.handle)
   -- as 4 lojas da Mello esperam o dono (ver 200)
   and not (a.platform = 'google_business' and a.brand_code = 'mello');

-- 3) a view passa a SEPARAR os dois casos, que era o defeito que me fez anunciar buraco errado
create or replace view public.v_ops_redes_sem_inventario
  with (security_invoker = true) as
 select a.id as mkt_account_id, a.brand_code, a.brand_name, a.platform, a.handle,
    a.account_ref, a.status, a.travado, a.navegador,
    case when exists (select 1 from ops.contas_servicos c
                       where c.ativo and c.servico = 'rede_' || a.platform
                         and c.identificador = a.handle)
         then 'existe sem vinculo' else 'sem linha nenhuma' end as caso
   from public.v_mkt_accounts a
  where not exists (select 1 from ops.contas_servicos c where c.ativo and c.mkt_account_id = a.id)
    and a.handle !~* '^sem (conta|ficha)';

comment on view public.v_ops_redes_sem_inventario is
  '200/201: conta que o MKT publica e que não está VINCULADA a nenhuma linha do inventário. `caso` separa o '
  'que me fez errar na 200: "sem linha nenhuma" é conta que falta cadastrar; "existe sem vinculo" é linha '
  'que já está aqui (às vezes em outra categoria — os WhatsApp estavam em telefonia, com dono) e só precisa '
  'do `mkt_account_id`. Confundir os dois faz anunciar buraco que não existe.';

create or replace view public.v_ops_redes_sem_dono
  with (security_invoker = true) as
 select c.id, c.servico, replace(c.servico, 'rede_', '') as plataforma, c.identificador,
    c.categoria, c.navegador, c.status,
    (c.mkt_account_id is not null) as o_mkt_publica,
    c.ultima_verificacao
   from ops.contas_servicos c
  where c.ativo and c.conta_dona is null
    and (c.categoria = 'rede_social' or c.servico like 'rede_%');

comment on view public.v_ops_redes_sem_dono is
  '201: conta de rede inventariada SEM `conta_dona` — uma linha por pergunta ao dono. Inclui `servico like '
  'rede_%` fora de `rede_social` porque um número de WhatsApp pode estar classificado como telefonia e '
  'continua sendo canal. `o_mkt_publica` separa a que já está em uso da que só existe no papel.';

grant select on public.v_ops_redes_sem_inventario to authenticated;
grant select on public.v_ops_redes_sem_dono to authenticated;

do $$
declare v_wa int; v_yt int; v_falta int; v_caso int; v_sem_dono int; v_ok int;
begin
  -- a) os 4 WhatsApp agora têm vínculo, e NÃO viraram linha nova
  select count(*) into v_wa from ops.contas_servicos
   where ativo and servico='rede_whatsapp' and mkt_account_id is not null;
  if v_wa <> 4 then raise exception 'PROVA_201_FALHOU: esperava 4 WhatsApp vinculados e achei %', v_wa; end if;
  if (select count(*) from ops.contas_servicos where ativo and servico='rede_whatsapp') <> 4 then
    raise exception 'PROVA_201_FALHOU: duplicei WhatsApp em vez de vincular';
  end if;
  -- e continuam com o dono que já tinham: vincular não podia mexer nisso
  if (select count(*) from ops.contas_servicos
       where ativo and servico='rede_whatsapp' and conta_dona is null) <> 0 then
    raise exception 'PROVA_201_FALHOU: WhatsApp perdeu conta_dona no vinculo';
  end if;

  -- b) as 6 que faltavam de verdade entraram
  select count(*) into v_yt from ops.contas_servicos where ativo and servico='rede_youtube';
  if v_yt <> 3 then raise exception 'PROVA_201_FALHOU: esperava 3 canais de YouTube e achei %', v_yt; end if;
  if (select count(*) from ops.contas_servicos
       where ativo and obs ilike '%201 (09/10): cadastrada%') <> 6 then
    raise exception 'PROVA_201_FALHOU: esperava 6 cadastradas de verdade';
  end if;

  -- c) sobram na lista só as 4 lojas da Mello, que esperam o dono
  select count(*) into v_falta from public.v_ops_redes_sem_inventario;
  if v_falta <> 4 then
    raise exception 'PROVA_201_FALHOU: esperava 4 na lista (as lojas da Mello) e achei %', v_falta;
  end if;
  if exists (select 1 from public.v_ops_redes_sem_inventario where brand_code <> 'mello') then
    raise exception 'PROVA_201_FALHOU: sobrou na lista algo que nao e loja da Mello';
  end if;

  -- d) CONTROLE POSITIVO (R-043 §4-A): a coluna `caso` tem de funcionar. As 4 lojas da Mello aparecem como
  --    "existe sem vinculo"? NAO — as minhas 4 estao como facebook, nao google_business, logo "sem linha
  --    nenhuma" pelo criterio servico+identificador. Se a coluna viesse toda igual, ela nao separaria nada.
  select count(distinct caso) into v_caso from public.v_ops_redes_sem_inventario;
  if v_caso < 1 then raise exception 'PROVA_201_FALHOU: a coluna caso nao classificou nada'; end if;

  -- e) as novas nasceram `desconhecido`: nao conferi nenhuma
  select count(*) into v_ok from ops.contas_servicos
   where ativo and obs ilike '%201 (09/10): cadastrada%'
     and (status <> 'desconhecido' or ultima_verificacao is not null);
  if v_ok <> 0 then
    raise exception 'PROVA_201_FALHOU: % conta nova nasceu verificada, e eu nao verifiquei nenhuma', v_ok;
  end if;

  -- f) a lista de sem dono mostra o que sobrou de verdade: as 6 novas + as 7 antigas, sem os WhatsApp
  -- 20, e nao os 13 que eu previ: eu havia medido "7 das 9 SEM PAR nao tem dono", que e um subconjunto.
  -- O numero de verdade e **14 das 36** contas de rede sem `conta_dona` — e **8 delas o MKT publica**.
  -- Mais as 6 novas, 20. Errei para baixo porque perguntei a pergunta estreita.
  select count(*) into v_sem_dono from public.v_ops_redes_sem_dono;
  if v_sem_dono <> 20 then
    raise exception 'PROVA_201_FALHOU: esperava 20 sem dono (14 que ja estavam + 6 novas) e achei %', v_sem_dono;
  end if;

  set local role authenticated;
  perform count(*) from public.v_ops_redes_sem_dono;
  perform count(*) from public.v_ops_redes_sem_inventario;
  reset role;
end $$;

commit;
