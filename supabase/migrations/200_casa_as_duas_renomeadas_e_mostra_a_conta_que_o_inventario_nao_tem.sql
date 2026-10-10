-- 200 — casa as duas contas renomeadas, e põe na tela a conta que o inventário não tem
--
-- ✔ APLICADA em 09/10/2026 às 22:33:43 BRT, reensaiada antes. **29 pares** (27 + as 2 renomeadas); a lista
--   `v_ops_redes_sem_inventario` mostra **14** contas que o MKT publica e o inventário não tem.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: a 199 deixou 9 contas minhas sem par. O MKT foi à API do Meta e identificou duas delas pelo
--   **ID da página**, que é o que o nome não conseguia dizer porque **as duas foram renomeadas**:
--     · minha `Óticas Sem Improviso` [facebook] = página **1079807541890310**, hoje "Ótica Sem Improviso"
--       no MKT (`osi/facebook`) — perdeu o "s" em julho.
--     · minha `Polá Petit` [facebook] = página **411169915680711**, hoje "Polá Petit - antiga Taty Mello
--       Festas" (`polapetit/facebook`).
--   É o primeiro uso real da chave fazendo o que ela existe para fazer: o `handle` mudou nos dois lados e o
--   uuid não. Se a junção fosse por nome, estas duas estariam quebradas e ninguém saberia.
--
-- CASAMENTO MANUAL, e assumido como tal: o par vem da leitura da API feita pelo MKT, não de string que bate.
--   Fica escrito aqui com o ID da página, para quem reler saber de onde veio a afirmação.
--
-- AS 4 LOJAS DA MELLO NÃO SÃO TOCADAS, e isso é deliberado. Elas estão como `rede_facebook` no inventário e
--   o MKT cadastrou as lojas como `google_business`; os nomes correspondem 1:1 (minhas "Óticas Taty Mello -
--   <loja>" × as dele "Mello Óticas - <loja>", mesmas 4 lojas, nome antigo × novo). A API dele mostra que as
--   nossas chaves do Meta gerenciam **uma** página da Mello, não uma por loja — o que prova que *nós* não
--   gerenciamos nenhuma, não que nenhuma exista. Reclassificar 4 linhas do inventário com base nessa
--   inferência seria decidir no escuro; o MKT está levando a pergunta ao dono e eu espero.
--
-- E O BURACO DO MEU LADO VAI PARA A TELA, não para uma mensagem: `public.v_ops_redes_sem_inventario` lista a
--   conta que o MKT publica e o inventário da casa não tem. Medido agora: **16 contas reais**, entre elas
--   **4 números de WhatsApp** e **3 canais de YouTube** — nenhuma com `conta_dona`, `navegador` ou
--   `secret_ref` em lugar nenhum (R-042: se amanhã alguém precisar entrar, não há onde olhar).
--   Os 3 marcadores do MKT ("sem conta — fora de escopo", "sem ficha — produto digital") ficam **fora** da
--   lista: são declaração de que a conta não existe de propósito, e contá-los como buraco seria inventar
--   trabalho.

begin;

do $$
begin
  if to_regclass('public.v_ops_redes_sem_inventario') is not null then
    raise exception 'a view ja existe — a 200 ja foi aplicada?';
  end if;
  if (select count(*) from ops.contas_servicos
       where ativo and categoria='rede_social' and mkt_account_id is not null) <> 27 then
    raise exception 'esperava os 27 pares da 199 — conferir antes';
  end if;
end $$;

-- os dois pares que só o ID da página revelava
update ops.contas_servicos c
   set mkt_account_id = a.id,
       obs = coalesce(c.obs || ' · ', '') ||
         format('200 (09/10): casada com a conta %s do MKT pelo ID da pagina %s (o nome mudou nos dois '
                'lados; o MKT leu da API do Meta).', a.platform, a.account_ref)
  from public.v_mkt_accounts a
 where c.ativo and c.categoria = 'rede_social' and c.mkt_account_id is null
   and a.platform = 'facebook'
   and ((c.identificador = 'Óticas Sem Improviso' and a.account_ref = '1079807541890310')
     or (c.identificador = 'Polá Petit'            and a.account_ref = '411169915680711'));

-- o que o MKT publica e o inventário da casa não tem
create or replace view public.v_ops_redes_sem_inventario
  with (security_invoker = true) as
 select a.id as mkt_account_id,
    a.brand_code,
    a.brand_name,
    a.platform,
    a.handle,
    a.account_ref,
    a.status,
    a.travado
   from public.v_mkt_accounts a
  where not exists (select 1 from ops.contas_servicos c
                     where c.ativo and c.mkt_account_id = a.id)
    -- marcador não é buraco: o MKT guarda linha dizendo que a conta NÃO existe de propósito
    and a.handle !~* '^sem (conta|ficha)';

comment on view public.v_ops_redes_sem_inventario is
  '200: conta que o MKT publica e que `ops.contas_servicos` não inventaria — logo sem `conta_dona`, '
  '`navegador` nem `secret_ref` em lugar nenhum (R-042: se alguém precisar entrar, não há onde olhar). '
  'Exclui os marcadores "sem conta/sem ficha" do MKT, que são declaração de ausência deliberada, não buraco. '
  'Vazia é a meta; enquanto não estiver, a lista diz exatamente o que falta cadastrar.';

grant select on public.v_ops_redes_sem_inventario to authenticated;

do $$
declare v_pares int; v_falta int; v_wa int; v_yt int;
begin
  -- a) as duas renomeadas casaram, e cada uma com a sua
  select count(*) into v_pares from ops.contas_servicos
   where ativo and categoria='rede_social' and mkt_account_id is not null;
  if v_pares <> 29 then
    raise exception 'PROVA_200_FALHOU: esperava 29 pares (27 + as 2 renomeadas) e achei %', v_pares;
  end if;
  -- O `servico` precisa entrar: ha DUAS linhas "Polá Petit" no inventario (facebook e google_business), e a
  -- do Google ja casou na 199. A 1a versao desta prova nao filtrou plataforma e morreu com "more than one
  -- row" — o erro era da prova, nao do update, que sempre filtrou `a.platform = 'facebook'`.
  if (select mkt_account_id from ops.contas_servicos
       where ativo and identificador='Óticas Sem Improviso' and servico='rede_facebook')
     is distinct from (select id from public.v_mkt_accounts where account_ref='1079807541890310') then
    raise exception 'PROVA_200_FALHOU: a pagina da OSI nao casou com a conta certa';
  end if;
  if (select mkt_account_id from ops.contas_servicos
       where ativo and identificador='Polá Petit' and servico='rede_facebook')
     is distinct from (select id from public.v_mkt_accounts where account_ref='411169915680711') then
    raise exception 'PROVA_200_FALHOU: a pagina do Pola no facebook nao casou com a conta certa';
  end if;

  -- b) AS 4 LOJAS CONTINUAM INTOCADAS: o controle de que eu nao reclassifiquei no escuro
  if (select count(*) from ops.contas_servicos
       where ativo and categoria='rede_social' and identificador like 'Óticas Taty Mello - %'
         and (servico <> 'rede_facebook' or mkt_account_id is not null)) <> 0 then
    raise exception 'PROVA_200_FALHOU: mexi nas 4 lojas, e isso espera a palavra do dono';
  end if;

  -- c) a lista do buraco mede o que eu medi, e nao conta marcador como falta
  select count(*) into v_falta from public.v_ops_redes_sem_inventario;
  if v_falta <> 14 then
    raise exception 'PROVA_200_FALHOU: esperava 14 contas sem inventario (16 menos as 2 que acabei de casar) e achei %', v_falta;
  end if;
  if exists (select 1 from public.v_ops_redes_sem_inventario where handle ~* '^sem (conta|ficha)') then
    raise exception 'PROVA_200_FALHOU: marcador do MKT entrou como buraco';
  end if;

  -- d) CONTROLE POSITIVO (R-043 §4-A): a lista nao pode estar vazia por estar quebrada. O que me motivou a
  --    escreve-la tem de aparecer nela: os 4 WhatsApp e os 3 YouTube.
  select count(*) into v_wa from public.v_ops_redes_sem_inventario where platform='whatsapp';
  select count(*) into v_yt from public.v_ops_redes_sem_inventario where platform='youtube';
  if v_wa <> 4 or v_yt <> 3 then
    raise exception 'PROVA_200_FALHOU: esperava 4 whatsapp e 3 youtube na lista, achei % e %', v_wa, v_yt;
  end if;

  -- e) e nada disso virou legivel por anon
  if pg_catalog.has_table_privilege('anon','public.v_ops_redes_sem_inventario','select') then
    raise exception 'PROVA_200_FALHOU: abri para anon';
  end if;
  set local role authenticated;
  perform count(*) from public.v_ops_redes_sem_inventario;
  reset role;
end $$;

commit;
