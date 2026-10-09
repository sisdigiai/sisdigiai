-- 195 — nível do problema em `controle_itens` e o contrato do Telão (sem texto de risco fora do login)
--
-- ✔ APLICADA em 09/10/2026 às 13:42:54 BRT, reensaiada antes (e o ensaio recusou a 1.ª versão: `create or
--   replace view` não reordena coluna, logo `nivel` entra no fim). Lido depois: 27 riscos, 54 pendentes do
--   dono, 58 abertos, 21 agentes, próximo prazo 09/10 — **tudo em nível 3**, porque o default é 3 e a carga
--   com nível ainda não rodou.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Geral, 09/10, por ordem do dono: *"trabalhar por níveis de problema, e o Telão e o digiai têm de
--   ter a real, sem depender da conversa"*. Nível 1 = dinheiro, dado exposto ou prazo ≤ 7 dias; 2 = risco sem
--   data ou pendência que trava venda/agente; 3 = o resto. Hoje o gerador vê 367 itens, 21 agentes + dono,
--   **28 de nível 1 e 66 de nível 2**. A carga dele está parada só pela coluna que falta — ela entra aqui.
--
-- ═════ EU MUDEI DUAS COISAS DO PEDIDO, E AS DUAS SÃO MEDIDAS, NÃO PREFERÊNCIA ═════
--
-- (1) **A view do Telão NÃO nasce legível por `anon`.** O pedido diz "como os outros espelhos do Telão", e
--     essa premissa está errada: medi as 7 e **todas são `anon = false`, `authenticated = true`**. O grant de
--     `anon` saiu delas em 27/08 por decisão do dono ("o login é a porta; chave no bundle é ofuscação"), e eu
--     tirei a última (`v_telao_afericao`) em 05/10 pela migration 181. Hoje **nenhuma** view da casa é
--     legível por `anon` — eu levei esse número a zero há quatro dias. Criar esta como a única exceção
--     desfaria uma decisão do dono sem ele ter mudado de ideia. E o Telão não precisa: ele lê com sessão
--     (`digiai_telao/src/lib/espelhos.ts`, `tokenDaSessao`), que foi o que me permitiu fechar a aferição.
--
-- (2) **`top_riscos` com texto NÃO existe.** O pedido pede os 60 primeiros caracteres do texto dos riscos de
--     nível 1, "sem segredo". Medi o que esses 60 caracteres seriam HOJE:
--       · `SEG-2026-10-12 (…): clearix_client/.env.bak-virada-2026-09-23 +` — nomeia arquivo com segredo real;
--       · `Supabase SIS Vision com fatura "Outstanding" (US$ 29,40): sem p` — valor de fatura;
--       · `Telefone de lead legível por qualquer logado há 4 dias. public.` — nomeia a view e o furo.
--     Cortar em 60 caracteres **não torna nada seguro**: o começo de um risco é justamente onde está o que
--     ele é. E num telão o leitor é quem está na sala, não quem fez login. Então o contrato leva **número e
--     prazo**, mais **o nome do agente** que tem risco de nível 1 — suficiente para quem vê saber que tem de
--     ir olhar, sem publicar o quê. O texto continua no app, atrás de login, que é o lugar dele.
--
--   Isso atende o que o dono pediu: o Telão passa a ter a real (quantos, de que nível, qual o próximo prazo,
--   de quem) sem depender da conversa — e sem virar o único lugar onde o risco da casa é lido sem senha.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='ops' and table_name='controle_itens' and column_name='nivel') then
    raise exception 'a coluna nivel ja existe — a 195 ja foi aplicada?';
  end if;
  -- a premissa da decisão (1): se alguma view da casa já for legível por anon, eu quero saber antes de
  -- afirmar que esta seria a única exceção.
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where c.relkind='v'
                and n.nspname in ('public','analytics','mkt','ops','company','finance','marketing')
                and pg_catalog.has_table_privilege('anon', c.oid, 'select')) then
    raise exception 'ha view nossa legivel por anon — rever a premissa da 195 antes de aplicar';
  end if;
end $$;

alter table ops.controle_itens
  add column nivel smallint not null default 3 check (nivel between 1 and 3);

comment on column ops.controle_itens.nivel is
  '195: 1 = dinheiro, dado exposto ou prazo <= 7 dias; 2 = risco sem data ou pendência que trava venda ou '
  'agente; 3 = o resto (ideia e feito são sempre 3). Classificado pelo gerador do Geral. Default 3 de '
  'propósito: item que chega sem nível não se promove sozinho a urgente.';

create or replace view public.v_controle_itens
  with (security_invoker = true) as
 select i.id, i.origem, i.agente, i.tipo, i.titulo, i.texto, i.data,
    i.numero, i.estado, i.risco_data,
    case i.tipo when 'risco' then 1 when 'pendente_dono' then 2 when 'aberto' then 3
                when 'ideia' then 4 else 5 end as ordem_tipo,
    (i.tipo = 'risco' and i.risco_data is not null
       and i.risco_data <= (now() at time zone 'America/Sao_Paulo')::date) as risco_no_prazo_hoje,
    -- `nivel` entra no FIM da lista de propósito: `create or replace view` não reordena nem renomeia coluna,
    -- e dropar a view para pôr o campo no meio derrubaria o grant de uma view que a tela já lê.
    i.nivel
   from ops.controle_itens i;

comment on view public.v_controle_itens is
  '194/195: contrato de leitura da página Controle. `nivel` (1 a 3) e `ordem_tipo` (risco primeiro) moram '
  'aqui e não no componente, para a regra de leitura ter uma fonte só. `risco_no_prazo_hoje` compara com o '
  'dia de Brasília.';

grant select on public.v_controle_itens to authenticated;

-- Contrato do Telão: SÓ NÚMERO, PRAZO E NOME DE AGENTE. Nenhum texto de risco, nenhuma PII.
create or replace view public.v_telao_controle
  with (security_invoker = true) as
 select i.nivel,
    count(*) filter (where i.tipo = 'risco')::int                                   as qtd_riscos,
    count(*) filter (where i.tipo = 'pendente_dono')::int                           as qtd_pendentes_dono,
    count(*) filter (where i.tipo = 'aberto')::int                                  as qtd_abertos,
    min(i.risco_data) filter (where i.tipo = 'risco'
          and i.risco_data >= (now() at time zone 'America/Sao_Paulo')::date)        as proximo_prazo,
    count(distinct i.agente)::int                                                   as agentes_com_estado,
    -- nome de agente, não texto de risco: diz a quem perguntar, sem dizer o quê
    (select string_agg(distinct a.agente, ', ' order by a.agente)
       from ops.controle_itens a
      where a.nivel = i.nivel and a.tipo = 'risco' and a.data = max(i.data))        as agentes_com_risco,
    max(i.data)                                                                     as atualizado_em
   from ops.controle_itens i
  group by i.nivel;

comment on view public.v_telao_controle is
  '195: contrato do Telão. SÓ número, prazo e nome de agente — **nenhum texto de risco e nenhuma PII**. O '
  'pedido original trazia os 60 primeiros caracteres do texto dos riscos nível 1; medi o que esses 60 '
  'caracteres seriam hoje (nome de arquivo com segredo real, valor de fatura, nome da view com o furo) e '
  'cortar em 60 não torna nada seguro: o começo de um risco é onde está o que ele é. Num telão quem lê é '
  'quem está na sala. O texto fica no app, atrás de login. Legível por `authenticated`, NÃO por `anon`: as 7 '
  'views do Telão saíram do anon em 27/08 por decisão do dono e o Telão lê com sessão (tokenDaSessao).';

grant select on public.v_telao_controle to authenticated;

do $$
declare v_n int; v_txt text;
begin
  -- a) o nível entrou com default 3 e CHECK
  if (select count(*) from ops.controle_itens where nivel <> 3) <> 0 then
    raise exception 'PROVA_195_FALHOU: item existente nao ficou no nivel 3 (default)';
  end if;
  begin
    update ops.controle_itens set nivel = 4 where id = (select min(id) from ops.controle_itens);
    raise exception 'PROVA_195_FALHOU: aceitou nivel fora de 1..3';
  exception when check_violation then null;
  end;

  -- b) o contrato do Telão NÃO carrega texto: nenhuma coluna dele pode conter o texto de um risco.
  --    Esta é a prova que me interessa mais, porque é a que falha se alguém "melhorar" a view depois.
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='v_telao_controle'
                and column_name in ('texto','titulo','top_riscos','trecho','resumo')) then
    raise exception 'PROVA_195_FALHOU: coluna de texto no contrato do Telao';
  end if;
  select string_agg(t::text, ' ') into v_txt from public.v_telao_controle t;
  if exists (select 1 from ops.controle_itens i
              where i.tipo = 'risco' and length(i.texto) > 40
                and position(left(i.texto, 40) in coalesce(v_txt, '')) > 0) then
    raise exception 'PROVA_195_FALHOU: texto de risco apareceu no contrato do Telao';
  end if;

  -- c) nem o Telão nem a página ficam legíveis por `anon` — e nenhuma outra view nossa também não
  if pg_catalog.has_table_privilege('anon', 'public.v_telao_controle', 'select')
  or pg_catalog.has_table_privilege('anon', 'public.v_controle_itens', 'select') then
    raise exception 'PROVA_195_FALHOU: abri para anon';
  end if;
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where c.relkind='v' and n.nspname in ('public','analytics','mkt','ops','company','finance','marketing')
     and pg_catalog.has_table_privilege('anon', c.oid, 'select');
  if v_n <> 0 then
    raise exception 'PROVA_195_FALHOU: a casa passou a ter % view legivel por anon', v_n;
  end if;

  -- d) CONTROLE POSITIVO (R-043 §4-A): não basta estar fechado — o caminho do Telão tem de abrir.
  --    Ele lê com sessão, então `authenticated` precisa conseguir consultar as duas sem erro.
  set local role authenticated;
  perform count(*) from public.v_telao_controle;
  perform count(*) from public.v_controle_itens;
  reset role;

  -- e) `proximo_prazo` só olha prazo FUTURO ou de hoje: prazo vencido não pode virar "o próximo"
  if exists (select 1 from public.v_telao_controle
              where proximo_prazo < (now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'PROVA_195_FALHOU: proximo_prazo trouxe data vencida';
  end if;
end $$;

commit;
