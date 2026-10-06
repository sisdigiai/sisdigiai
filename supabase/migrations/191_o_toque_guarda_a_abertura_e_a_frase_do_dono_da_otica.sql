-- 191 — o toque passa a guardar a abertura usada e a frase do dono da ótica
--
-- ✔ APLICADA em 06/10/2026 às 02:30:46 BRT, reensaiada antes (e a 1.ª versão da prova foi barrada pelo
--   próprio portão da RPC — `is_staff()` lê o JWT e a Management API não tem nenhum; virou teste).
--   **Falta a conferência na tela** (R-005): registrar um toque com abertura e frase e ver as duas aparecerem.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: eu mesmo achei o buraco respondendo a pauta das dores (06/10,
--   `Cockpit/comercial/dores-2026-10/app-digiai.md`): **67 pessoas clicaram no WhatsApp do Clearix, 1 demo foi
--   pedida, 0 toques registrados, e dor anotada em lugar nenhum.** O registro de toque (166) tem só `nota`
--   livre — que é *o que eu achei*, não *o que ele disse*. Sem separar os dois, a pergunta "qual é a dor"
--   volta vazia no mês que vem. O Geral concordou e pediu antes de sexta.
--
-- OS DOIS CAMPOS, e por que são dois e não um:
--   · `abertura` — lista FECHADA. Serve para responder "qual abertura faz a pessoa responder", e isso só tem
--     resposta se o valor for comparável. Texto livre aqui daria 20 grafias da mesma coisa e zero contagem.
--   · `frase_do_dono` — texto curto, as palavras dele. Separado da `nota` de propósito: nota é a minha
--     leitura, frase é o dado bruto. Misturados, perde-se exatamente o que esta pauta quer — e é tarde para
--     separar depois, porque ninguém reescreve nota antiga.
--
-- LGPD, resolvido na origem e não depois: `frase_do_dono` é **fala de pessoa identificável**, ligada a um
--   lead. A view de contrato **mascara a frase quando o lead pediu exclusão** (`lgpd_request_at`) — e
--   mascara também quando o lead **não está visível** para quem lê. A condição é por `not exists`, então
--   falha FECHADA: na dúvida, a frase não sai. Portão que abre no erro não é portão.
--   Fica dito para quem atender um pedido de exclusão: apagar o lead não basta — `frase_do_dono` dos toques
--   dele tem de ir a nulo no mesmo ato. A view esconde; o dado continua lá.
--
-- UMA FUNÇÃO, NÃO DUAS: `fn_registrar_toque` ganha os dois parâmetros com `default null`. Não dá para
--   `create or replace` com assinatura nova, e deixar as duas vivas tornaria a chamada por nome **ambígua**
--   (a tela chama com argumentos nomeados). Então a antiga sai e a nova aceita a chamada antiga pelos
--   defaults — assim não existe janela em que o botão da tela esteja quebrado entre dois deploys.
--
-- R-044/R-043: a tabela continua em `ops` e `public` só recebe RPC e view. Escrita só pela RPC definer com
--   `is_staff()` explícito. A view nova nasce `security_invoker` **na definição** (R-043 §4-B).
--
-- ESTADO ANTES: `ops.toque_venda` com **0 linhas**. Nada a migrar, nenhum valor a preencher para trás.
--
-- O QUE EU PROVO AQUI E O QUE NÃO PROVO — a 1.ª versão desta prova tentou chamar a RPC e **o portão dela me
--   barrou**: `is_staff()` lê o JWT e a Management API não tem nenhum. Isso não é obstáculo, é a prova de que
--   o portão está fechado, e fica como teste explícito abaixo.
--     PROVO: que a lista de abertura é fechada de verdade (valor fora dela é recusado pelo banco); que a frase
--       não aceita 1 caractere; que a view devolve a frase de toque sem lead; que a máscara da LGPD esconde a
--       frase no instante em que o lead pede exclusão e a devolve quando o pedido sai; e que a RPC **recusa**
--       quem não tem papel.
--     NÃO PROVO aqui: que a RPC grava os dois campos nas posições certas — isso exige sessão com JWT de staff,
--       que é a do dono. **A conferência é na tela** (R-005), e está pedida: registrar um toque com abertura
--       e frase, e ver as duas aparecerem.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='ops' and table_name='toque_venda' and column_name='abertura') then
    raise exception 'a coluna abertura ja existe — a 191 ja foi aplicada?';
  end if;
  if to_regclass('ops.toque_venda') is null then
    raise exception 'ops.toque_venda nao existe — a 166 nao foi aplicada';
  end if;
end $$;

alter table ops.toque_venda
  add column abertura text
    check (abertura is null
           or abertura in ('dinheiro_parado', 'cliente_nao_volta', 'lente_cara', 'outra')),
  add column frase_do_dono text
    check (frase_do_dono is null or length(btrim(frase_do_dono)) between 3 and 500);

comment on column ops.toque_venda.abertura is
  '191: qual abertura foi usada, em lista fechada — dinheiro_parado (H1), cliente_nao_volta (H2), '
  'lente_cara (H3), outra. Fechada de propósito: "qual abertura responde mais" só tem resposta se o valor '
  'for comparável.';
comment on column ops.toque_venda.frase_do_dono is
  '191: o que o dono da ótica disse, NAS PALAVRAS DELE. Separado da `nota` de propósito: nota é a leitura de '
  'quem registrou, esta coluna é o dado bruto. É fala de pessoa identificável — a view de contrato mascara '
  'quando o lead pediu exclusão (lgpd_request_at) ou não está visível. Pedido de exclusão tem de pôr esta '
  'coluna a nulo nos toques do lead; a view esconde, o dado continua aqui.';

-- a função: uma só, com os novos campos opcionais
drop function if exists public.fn_registrar_toque(text, text, uuid, text);

create function public.fn_registrar_toque(
  p_tipo text,
  p_otica text,
  p_lead_id uuid default null,
  p_nota text default null,
  p_abertura text default null,
  p_frase_do_dono text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_id bigint;
begin
  -- Portão explícito: definer não herda RLS, então quem pode escrever se decide aqui e em lugar nenhum mais.
  if not public.is_staff() then
    raise exception 'apenas staff registra toque de venda' using errcode = 'insufficient_privilege';
  end if;
  if p_tipo not in ('ligacao', 'demo', 'piloto') then
    raise exception 'tipo invalido: % (use ligacao, demo ou piloto)', p_tipo;
  end if;
  if coalesce(btrim(p_otica), '') = '' then
    raise exception 'sem a otica o registro nao serve para nada';
  end if;
  if p_abertura is not null
     and p_abertura not in ('dinheiro_parado', 'cliente_nao_volta', 'lente_cara', 'outra') then
    raise exception 'abertura invalida: % (use dinheiro_parado, cliente_nao_volta, lente_cara ou outra)',
      p_abertura;
  end if;

  insert into ops.toque_venda (tipo, otica, lead_id, nota, abertura, frase_do_dono, quem)
  values (p_tipo,
          btrim(p_otica),
          p_lead_id,
          nullif(btrim(coalesce(p_nota, '')), ''),
          p_abertura,
          nullif(btrim(coalesce(p_frase_do_dono, '')), ''),
          auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.fn_registrar_toque(text, text, uuid, text, text, text) from public, anon;
grant execute on function public.fn_registrar_toque(text, text, uuid, text, text, text)
  to authenticated, service_role;

-- view de contrato: é por aqui que a pauta das dores vai ler as frases no mês que vem
create or replace view public.v_ops_toques
  with (security_invoker = true) as
 select t.id,
    t.tipo,
    t.otica,
    t.lead_id,
    t.abertura,
    case when t.lead_id is not null
           and not exists (select 1 from ops.commercial_leads l
                            where l.id = t.lead_id and l.lgpd_request_at is null)
         then null
         else t.frase_do_dono end as frase_do_dono,
    t.nota,
    t.quando,
    (t.quando at time zone 'America/Sao_Paulo')::date as dia
   from ops.toque_venda t;

comment on view public.v_ops_toques is
  '191: os toques com a abertura usada e a frase do dono da ótica. `frase_do_dono` vem NULA quando o lead '
  'pediu exclusão (lgpd_request_at) ou não está visível para quem lê — a condição é `not exists`, logo falha '
  'FECHADA. `dia` em BRT, não UTC (o dia do negócio é BRT). Fonte da pauta das dores.';

grant select on public.v_ops_toques to authenticated;

do $$
declare v_id bigint; v_frase text; v_n int;
begin
  -- a) os campos existem com a trava da lista fechada
  if (select count(*) from information_schema.columns
       where table_schema='ops' and table_name='toque_venda'
         and column_name in ('abertura','frase_do_dono')) <> 2 then
    raise exception 'PROVA_191_FALHOU: as duas colunas nao entraram';
  end if;

  -- b) a lista é FECHADA de verdade: valor fora dela tem de ser recusado
  begin
    insert into ops.toque_venda (tipo, otica, abertura) values ('ligacao', 'prova-191', 'dor_inventada');
    raise exception 'PROVA_191_FALHOU: a lista de abertura aceitou valor fora dela';
  exception when check_violation then null;
  end;

  -- c) a frase curta demais também: campo que aceita "a" não guarda fala
  begin
    insert into ops.toque_venda (tipo, otica, frase_do_dono) values ('ligacao', 'prova-191', 'a');
    raise exception 'PROVA_191_FALHOU: a frase aceitou 1 caractere';
  exception when check_violation then null;
  end;

  -- d) O PORTAO DA RPC ESTA FECHADO: esta sessao nao tem JWT, logo is_staff() e false e a chamada tem de ser
  --    recusada. Foi isto que derrubou a 1a versao desta prova, e virou teste em vez de obstaculo.
  begin
    perform public.fn_registrar_toque('ligacao', 'prova-191-sem-papel');
    raise exception 'PROVA_191_FALHOU: a RPC aceitou chamada sem papel de staff';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from ops.toque_venda where otica = 'prova-191-sem-papel') then
    raise exception 'PROVA_191_FALHOU: a RPC recusou e gravou de qualquer forma';
  end if;

  -- e) a assinatura nova existe e a antiga NAO — duas vivas tornariam a chamada por nome ambigua, e a tela
  --    chama com argumentos nomeados
  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='fn_registrar_toque') <> 1 then
    raise exception 'PROVA_191_FALHOU: ha mais de uma fn_registrar_toque — chamada por nome ficaria ambigua';
  end if;
  if (select pronargs from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='fn_registrar_toque') <> 6 then
    raise exception 'PROVA_191_FALHOU: a funcao nao ficou com os 6 parametros';
  end if;
  if (select pronargdefaults from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='fn_registrar_toque') <> 4 then
    raise exception 'PROVA_191_FALHOU: os defaults nao cobrem a chamada antiga de 4 argumentos';
  end if;

  -- insere direto na tabela para os testes que seguem (a RPC exige JWT, que esta sessao nao tem)
  insert into ops.toque_venda (tipo, otica, nota, abertura, frase_do_dono)
  values ('ligacao', 'prova-191', 'nota minha', 'dinheiro_parado',
          'o dinheiro fica parado na prateleira')
  returning id into v_id;
  if (select nota from ops.toque_venda where id = v_id) = 'o dinheiro fica parado na prateleira' then
    raise exception 'PROVA_191_FALHOU: a nota e a frase se confundiram';
  end if;

  -- f) a view devolve a frase para toque SEM lead (nao ha o que mascarar)
  select frase_do_dono into v_frase from public.v_ops_toques where id = v_id;
  if v_frase is null then
    raise exception 'PROVA_191_FALHOU: a view escondeu a frase de um toque sem lead';
  end if;

  -- g) CONTROLE POSITIVO DA MASCARA (R-043 §4-A): com lead que pediu exclusao, a frase tem de sair NULA.
  --    Sem este teste, "a mascara funciona" seria afirmacao sem medida.
  declare v_lead uuid; v_id2 bigint;
  begin
    select id into v_lead from ops.commercial_leads
     where deleted_at is null and lgpd_request_at is null limit 1;
    if v_lead is null then raise exception 'PROVA_191_FALHOU: sem lead para testar a mascara'; end if;

    insert into ops.toque_venda (tipo, otica, lead_id, abertura, frase_do_dono)
    values ('ligacao', 'prova-191-mascara', v_lead, 'lente_cara', 'a lente ficou caro demais')
    returning id into v_id2;
    if (select frase_do_dono from public.v_ops_toques where id = v_id2) is null then
      raise exception 'PROVA_191_FALHOU: mascarou a frase de um lead que NAO pediu exclusao';
    end if;

    update ops.commercial_leads set lgpd_request_at = now() where id = v_lead;
    if (select frase_do_dono from public.v_ops_toques where id = v_id2) is not null then
      raise exception 'PROVA_191_FALHOU: a frase saiu depois do pedido de exclusao';
    end if;
    update ops.commercial_leads set lgpd_request_at = null where id = v_lead;
  end;

  -- limpa as provas: rascunho meu na mesma transacao, nao dado real
  delete from ops.toque_venda where otica like 'prova-191%';
  select count(*) into v_n from ops.toque_venda;
  if v_n <> 0 then
    raise exception 'PROVA_191_FALHOU: sobrou linha de prova (% no total, esperava 0)', v_n;
  end if;
end $$;

commit;
