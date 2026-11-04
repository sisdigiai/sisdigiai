-- 213 — o custo da Supabase é POR PROJETO; só o plano é por org. E o easy_idiomas sai com data e motivo.
--
-- ✔ APLICADA em 03/11/2026, ensaiada antes. Lido depois: Supabase **US$ 64,24/mes** (plano 25 + 5 x 9,81
--   de compute - 9,81 de credito) e total da casa em USD **47 -> 86,24** (com os US$ 22 do ElevenLabs).
--   Teve um conserto meu na mesma entrega — ver "213-b" no passo 4.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Geral, 03/11, medido por ele no painel da Supabase: o inventário diz US$ 47/mês e a fatura de
--   01/11 é **US$ 73,87**. Composição real: Pro US$ 25 por org + ≈ US$ 10/mês por projeto Micro, menos
--   US$ 10 de crédito que o plano inclui. O dono apagou o `easy_idiomas` hoje (decisão 133).
--
-- ═════ O ERRO É MEU, DA 202 (09/10), E ESTÁ ESCRITO COM TODAS AS LETRAS LÁ ═════
--   Eu lancei o custo na linha da ORG e deixei os projetos sem custo, com esta justificativa na própria
--   coluna `obs`: "o Pro se cobra por org, não por projeto — o custo mora aqui e os 6 projetos dela ficam
--   sem custo, para a soma da casa não contar seis vezes". **Metade certa e metade falsa:** o PLANO é por
--   org (lançar 25 em cada projeto contaria seis vezes, e nisso eu estava certo), mas o COMPUTE é por
--   projeto — cada projeto roda a sua instância e é cobrado por hora. Eu generalizei de uma linha da fatura
--   para a fatura inteira e não conferi o resto. Resultado: o inventário dizia 47 e a conta real é ~75, e
--   **fatura não esperada já pausou o gj_pessoal de 02 a 07/10**.
--
-- ═════ MEDIDO AQUI, SEM DEPENDER DO QUE ME CONTARAM ═════
--   `GET /v1/projects/{ref}/billing/addons` devolve o preço de catálogo do compute, da boca da Supabase:
--     `ci_micro` = **US$ 0,01344/hora (~US$ 10/mês)**, 2 vCPU compartilhadas, 1 GB. × 730 h = **US$ 9,81**.
--   `GET /v1/projects` devolve a org com **5 projetos** (digiai, nexus, lumina_box, gj_pessoal, ecoax) —
--     o `easy_idiomas` (`nrrkcfxcqnvvhhamhrqf`) **não está mais lá**, o que confirma o apagamento pelo dono.
--   O modelo reproduz a fatura, e é por isso que eu acredito nele:
--     6 projetos (como em 01/11): 25 + 6 × 9,81 − 9,81 = **US$ 73,86**  ·  faturado: **US$ 73,87**.
--     5 projetos (hoje):          25 + 5 × 9,81 − 9,81 = **US$ 64,24**  ·  ≈ os US$ 65 do Geral.
--   Um centavo de diferença em cima de uma fatura real é prova; "≈ 10 por projeto" sozinho era palpite.
--
-- ═════ COMO FICA LANÇADO ═════
--   · linha da ORG: segue com **US$ 25** — é o plano, e é por org.
--   · cada um dos **5 projetos** da org: **US$ 9,81** (compute Micro, preço de catálogo medido).
--   · linha nova de **CRÉDITO: −US$ 9,81**, porque o plano inclui US$ 10 de compute e cobre 1 projeto. Sem
--     ela a soma daria 74 com 5 projetos, e eu estaria trocando um erro de 28 dólares por outro de 10.
--     Entra como linha própria, negativa, em vez de descontada do plano: 25 é o preço do Pro, e número que
--     já vem abatido esconde dois fatos num só.
--   · `easy_idiomas`: `situacao = encerrada`, `encerrada_em = 2026-11-03`, `ativo = false`, motivo na `obs`.
--     **Não apago a linha** — inventário que apaga história não responde "o que a gente desligou e quando".
--
-- ═════ DUAS ARMADILHAS QUE EU ENCONTREI MEDINDO, E QUE ESTA MIGRATION NÃO CONSERTA ═════
--   (a) `public.v_ops_cofre_resumo` faz `sum(custo_mensal)` **misturando moedas** — hoje passa batido porque
--       só há linhas em USD com valor; com 5 linhas novas continua coincidência, não acerto. As duas views do
--       cofre estão **sem leitura para `authenticated` desde a 208**, logo ninguém lê isso hoje.
--   (b) `public.v_ops_contas_custo` chama a coluna de `custo_declarado_brl` e devolve o valor **na moeda da
--       própria linha** — US$ 25 sai rotulado como BRL. A tela não lê essa coluna (só `custo_medido_brl`),
--       então não há mentira na tela hoje; mas é um alçapão para o próximo que ler.
--   As duas ganham `comment on column` dizendo isso. Conserto de verdade é tela + view no mesmo turno, e eu
--   não vou abrir isso no mesmo turno em que mexo no dado — fica em "Em aberto" do estado do dia.
--
-- R-044: tabela no schema do domínio (`ops`), `public` segue recebendo só view. Nenhuma estrutura muda aqui:
--   é correção de DADO MEDIDO, por isso vem com leitura de volta e não só com `update`.

begin;

do $$
declare v_proj int; v_easy int;
begin
  -- premissas do que eu medi na API, conferidas no banco antes de escrever
  select count(*) into v_proj from ops.contas_servicos
   where servico = 'supabase'
     and identificador in ('hswyopqvnolqpmprqvzh','tkbhhbzhlqsgcwljeesg','siinufinhffynevhydgu',
                           'xfkcqrlovqbcriiksxng','zgojkioieztikqhwcoae');
  if v_proj <> 5 then
    raise exception 'esperava as 5 linhas dos projetos da org e achei % — rever o inventario', v_proj;
  end if;
  select count(*) into v_easy from ops.contas_servicos
   where servico = 'supabase' and identificador = 'nrrkcfxcqnvvhhamhrqf' and coalesce(situacao,'ativa') = 'ativa';
  if v_easy <> 1 then
    raise exception 'a linha do easy_idiomas nao esta ativa — a 213 ja foi aplicada?';
  end if;
  if not exists (select 1 from ops.contas_servicos
                  where servico='supabase' and identificador like 'org sisdigiai%' and custo_mensal = 25) then
    raise exception 'a linha da org nao esta com os US$ 25 do plano — rever antes de somar compute';
  end if;
end $$;

-- 1. compute por projeto: preço de catálogo medido em /billing/addons (ci_micro 0,01344/h × 730 h)
update ops.contas_servicos
   set custo_mensal = 9.81,
       moeda        = 'USD',
       categoria    = coalesce(categoria, 'infra'),
       obs          = coalesce(obs || E'\n', '') ||
         '213 (03/11): compute Micro deste projeto = US$ 9,81/mes (ci_micro US$ 0,01344/h x 730 h, preco ' ||
         'medido em GET /v1/projects/{ref}/billing/addons). O COMPUTE e por projeto; o plano Pro (US$ 25) ' ||
         'fica na linha da org. A 202 deixava este campo nulo dizendo que o custo era todo da org — meio ' ||
         'certo: o plano e, o compute nao.',
       updated_at   = now()
 where servico = 'supabase'
   and identificador in ('hswyopqvnolqpmprqvzh','tkbhhbzhlqsgcwljeesg','siinufinhffynevhydgu',
                         'xfkcqrlovqbcriiksxng','zgojkioieztikqhwcoae');

-- 2. a linha da org: o plano continua 25, mas a nota que explicava o contrario sai
update ops.contas_servicos
   set produtos  = array['digiai','nexus','lumina','gj','blogs'],
       obs       = '213 (03/11): plano Pro = US$ 25/mes, cobrado POR ORG (lancar isto em cada projeto ' ||
                   'contaria 5x). O COMPUTE e por projeto e esta lancado em cada linha de projeto; o credito ' ||
                   'de compute que o plano inclui esta na linha "credito de compute". Fatura de 01/11 com 6 ' ||
                   'projetos: 25 + 6 x 9,81 - 9,81 = US$ 73,86 contra US$ 73,87 faturado. Com os 5 projetos ' ||
                   'de hoje: US$ 64,24/mes. A nota anterior (202, 09/10) dizia que o custo era todo da org — ' ||
                   'errado, e o inventario ficou dizendo US$ 47 enquanto a fatura real era ~75.',
       updated_at = now()
 where servico = 'supabase' and identificador like 'org sisdigiai%';

-- 3. o crédito de compute que o plano inclui, como linha própria e negativa
insert into ops.contas_servicos
       (servico, identificador, conta_dona, plano, custo_mensal, moeda, categoria, situacao, status,
        ativo, produtos, obs)
values ('supabase', 'credito de compute (org sisdigiai)', 'sisdigiai@gmail.com', 'pro', -9.81, 'USD',
        'infra', 'ativa', 'ok', true, array['digiai','nexus','lumina','gj','blogs'],
        '213 (03/11): o plano Pro inclui US$ 10/mes de credito de compute, que cobre 1 projeto Micro. ' ||
        'Linha NEGATIVA de proposito: sem ela a soma dos 5 projetos + plano daria US$ 74 e a fatura real com ' ||
        '6 projetos foi US$ 73,87. Descontar o credito dentro dos US$ 25 do plano esconderia dois fatos num ' ||
        'numero so. Valor = o mesmo 9,81 de um projeto, porque e exatamente isso que o credito paga.');

-- 4. easy_idiomas: encerrada com data e motivo, SEM apagar a linha
update ops.contas_servicos
   set situacao    = 'encerrada',
       encerrada_em = date '2026-11-03',
       ativo       = true,          -- 213-b: ver nota abaixo. NAO e false.
       status      = 'pausado',
       custo_mensal = null,
       obs         = coalesce(obs || E'\n', '') ||
         '213 (03/11): PROJETO APAGADO pelo dono (decisao 133, confirmada em pergunta explicita). Tinha so ' ||
         'dados de semente; copia de 01/11 no OneDrive e migrations no repo. Conferido em GET /v1/projects: ' ||
         'o ref nao aparece mais na org. A linha fica no inventario encerrada, com data — inventario que ' ||
         'apaga historia nao responde "o que desligamos e quando". Deixa de somar US$ 9,81/mes. ' ||
         E'
213-b (03/11, conserto meu na MESMA entrega): eu havia posto `ativo = false` e isso TIRA a ' ||
         'linha da tela — `v_ops_contas_servicos` filtra `ativo`. Contradizia o meu proprio motivo. O ' ||
         'precedente da casa e netlify:sis_digiai: `encerrada` com `ativo = true`, visivel como historia. ' ||
         'Quem tira da soma e o `custo_mensal` nulo, nao o `ativo`.',
       updated_at  = now()
 where servico = 'supabase' and identificador = 'nrrkcfxcqnvvhhamhrqf';

-- 5. achado de passagem: o nexus esta ATIVO e a nota dizia INACTIVE desde 16/08
update ops.contas_servicos
   set obs = coalesce(obs || E'\n', '') ||
         '213 (03/11): medido em GET /v1/projects — nexus esta ACTIVE_HEALTHY (us-west-2). A nota de 16/08 ' ||
         'dizia INACTIVE e virou mentira em silencio; por isso ele paga compute como qualquer outro.',
       updated_at = now()
 where servico = 'supabase' and identificador = 'tkbhhbzhlqsgcwljeesg';

-- 6. os dois alçapões de moeda, declarados onde quem lê vai tropeçar
comment on column ops.contas_servicos.custo_mensal is
  '213: valor mensal DECLARADO, na moeda da coluna `moeda` da MESMA linha — pode ser negativo (credito). '
  'NUNCA somar sem agrupar por moeda: hoje convivem USD e BRL. Supabase: o plano (US$ 25) esta na linha da '
  'org, o compute (US$ 9,81) em cada linha de projeto, e o credito do plano numa linha negativa.';
comment on view public.v_ops_contas_custo is
  '151/152/213: custo MEDIDO no extrato do Finance (BRL) ao lado do DECLARADO no inventario. ATENCAO (213): '
  '`custo_declarado_brl` devolve `contas_servicos.custo_mensal` na moeda DA LINHA, que hoje e USD nas linhas '
  'de Supabase e ElevenLabs — o sufixo `_brl` do nome mente. A tela nao le essa coluna (so '
  '`custo_medido_brl`); quem passar a ler tem de converter antes de comparar.';
comment on view public.v_ops_cofre_resumo is
  '213: resumo por empresa. ATENCAO: `custo_mensal` aqui e `sum(custo_mensal)` MISTURANDO MOEDAS (USD e '
  'BRL). Passa batido hoje porque so ha linhas em USD com valor. As duas views do cofre estao sem leitura '
  'para `authenticated` desde a 208 (ops.empresas tem RLS sem politica).';

do $$
declare v_plano numeric; v_compute numeric; v_credito numeric; v_total numeric; v_n int; v_ativa text;
begin
  -- a) a soma em USD da org tem de dar os US$ 64,24 que o modelo previu para 5 projetos
  select coalesce(sum(custo_mensal),0) into v_total
    from ops.contas_servicos
   where servico = 'supabase' and ativo and moeda = 'USD' and coalesce(situacao,'ativa') = 'ativa';
  if round(v_total, 2) <> 64.24 then
    raise exception 'PROVA_213_FALHOU: a Supabase soma US$ % e o modelo diz 64,24', round(v_total,2);
  end if;

  -- b) e a soma tem de ser DECOMPONIVEL: plano 25, compute 5 x 9,81, credito -9,81. Se o total batesse por
  --    outro arranjo (um projeto a mais e o credito faltando, por exemplo), o numero certo esconderia
  --    lançamento errado — e e o lançamento que o Geral pediu, nao o total.
  select coalesce(sum(custo_mensal),0) into v_plano from ops.contas_servicos
   where servico='supabase' and identificador like 'org sisdigiai%' and ativo;
  select coalesce(sum(custo_mensal),0), count(*) into v_compute, v_n from ops.contas_servicos
   where servico='supabase' and ativo and custo_mensal = 9.81;
  select coalesce(sum(custo_mensal),0) into v_credito from ops.contas_servicos
   where servico='supabase' and identificador like 'credito%' and ativo;
  if v_plano <> 25 then raise exception 'PROVA_213_FALHOU: plano deu % e tem de ser 25', v_plano; end if;
  if v_n <> 5 then raise exception 'PROVA_213_FALHOU: % projetos com compute e a org tem 5', v_n; end if;
  if round(v_compute,2) <> 49.05 then
    raise exception 'PROVA_213_FALHOU: compute soma % e 5 x 9,81 = 49,05', round(v_compute,2);
  end if;
  if round(v_credito,2) <> -9.81 then
    raise exception 'PROVA_213_FALHOU: credito deu % e tem de ser -9,81', round(v_credito,2);
  end if;

  -- c) o easy_idiomas saiu da soma, com data, e NAO foi apagado
  select situacao into v_ativa from ops.contas_servicos
   where servico='supabase' and identificador='nrrkcfxcqnvvhhamhrqf';
  if v_ativa is distinct from 'encerrada' then
    raise exception 'PROVA_213_FALHOU: easy_idiomas ficou como "%"', v_ativa;
  end if;
  if not exists (select 1 from ops.contas_servicos
                  where identificador='nrrkcfxcqnvvhhamhrqf' and encerrada_em = date '2026-11-03'
                    and ativo = true and custo_mensal is null) then
    raise exception 'PROVA_213_FALHOU: easy_idiomas sem data, fora da tela (ativo=false), ou somando custo';
  end if;

  -- d) CONTROLE NEGATIVO: nenhum projeto FORA da org sisdigiai pode ter ganhado custo de compute. Os 5
  --    projetos que este token nao alcanca (Clearix, Pulso x2, niposchool, tgjphotos) continuam SEM custo
  --    declarado — eu nao sei o plano deles, e inventar US$ 9,81 ali seria trocar "nao sei" por palpite.
  if exists (select 1 from ops.contas_servicos
              where servico='supabase' and custo_mensal is not null
                and identificador in ('mhgbuplnxtfgipbemchb','gfdpvasbrxwulvpvyfvr','nlcisbfdiokmipyihtuz',
                                      'tqlwkgiytdikumtcnizf','zlfyxndjpdwbbxuypova')) then
    raise exception 'PROVA_213_FALHOU: lancei custo em projeto de org que eu nao meço';
  end if;

  -- e) o total da casa em USD (Supabase + ElevenLabs) muda de 47 para 86,24 — o antes->depois que o dono le
  select coalesce(sum(custo_mensal),0) into v_total from ops.contas_servicos
   where ativo and moeda='USD' and coalesce(situacao,'ativa')='ativa' and custo_mensal is not null;
  if round(v_total,2) <> 86.24 then
    raise exception 'PROVA_213_FALHOU: total em USD deu % e eu calculei 86,24', round(v_total,2);
  end if;
end $$;

commit;
