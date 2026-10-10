-- 202 — o que se paga e o que vence, com o plano MEDIDO na API (e o que eu não sei, dito)
--
-- ✔ APLICADA em 09/10/2026 às 23:04:39 BRT, reensaiada antes. Depois: **2 contas com custo, somando
--   US$ 47/mês**; **0** projetos Supabase dizendo `free` (eram 10); **5** com plano nulo declarado; nada
--   vencendo em 7 dias.
--
-- (Escrita como NÃO APLICADA.)
--
-- PERGUNTA DO DONO (09/10): *"temos este controle no digiai?"* — o de conta a pagar que trava app.
--   **A resposta medida é não, e é pior que campo vazio: onde havia valor, o valor estava errado.**
--     · os **10** projetos Supabase do inventário diziam `plano = 'free'`. Medi na API: a org que este token
--       alcança (`sisdigiai's Org`, `mjqoctgruveqlmcqzhsi`) está em **`pro`** — e nela vivem 6 projetos,
--       incluindo o banco do **próprio digiai**. Inventário que diz "free" é a razão pela qual ninguém espera
--       fatura; e fatura não esperada foi o que pausou o `gj_pessoal` de 02 a 07/10.
--     · o **ElevenLabs não existe no inventário** — nem no vocabulário de serviços. O dono pagou US$ 22 hoje
--       e a OSI e o Limelight usam a voz.
--     · o **`ecoax`** (`zgojkioieztikqhwcoae`) é um 11.º projeto Supabase, na org que eu alcanço, e **não
--       estava no inventário**.
--     · a Netlify estava `plano free · situacao ativa` **cinco dias antes de ser desligada por não
--       pagamento**.
--     · **zero** contas com `custo_mensal`, e a única conta de IA tem identificador `(a confirmar)`.
--
-- ═════ O CUSTO É DA ORGANIZAÇÃO, NÃO DO PROJETO ═════
--   O Pro do Supabase se cobra por **org**. Pôr US$ 25 em cada um dos 6 projetos faria o custo da casa
--   aparecer **seis vezes** — o mesmo erro que eu evitei hoje de manhã ao recusar coluna de venda na view de
--   motor (venda é da marca, não do motor). Então entra **uma linha para a org**, com o custo, e os 6
--   projetos ficam com `plano = pro` e **sem** custo, dizendo onde ele mora.
--
-- ═════ O QUE EU NÃO SEI FICA DITO, NÃO PREENCHIDO ═════
--   5 projetos estão em orgs que este token **não alcança** (Clearix, pulso ×2, niposchool-design,
--   tgjphotos) — e o inventário já registrava isso desde 16/08, honestamente. O erro deles era só o
--   `plano = 'free'`, que eu troco por **nulo**: "não sei" é melhor que um "free" que ninguém conferiu.
--   O plano real dessas vai para "Pendente do dono".
--
-- FONTE DE CADA NÚMERO, porque número sem fonte vira folclore:
--   · Supabase `pro`: **medido por mim** em `GET /v1/organizations` com o PAT do digiai, 09/10.
--   · ElevenLabs US$ 22, renova 05/11: **leitura da fatura pelo Geral**, 09/10 (o dono pagou hoje).
--   · OpenAI saldo US$ 9,49: idem, e é **saldo pré-pago**, não mensalidade — por isso vai em
--     `ultimo_detalhe` e **não** em `custo_mensal`.
--   · Netlify encerrada em 14/10: decisão do dono de não pagar, e eu medi os 37 hosts na 197/198.
--
-- NADA DE CARTÃO NEM SEGREDO (R-042): valor de assinatura é custo, não credencial. `secret_ref` continua
--   ponteiro.

begin;

do $$
begin
  if exists (select 1 from ops.servicos where slug = 'elevenlabs') then
    raise exception 'o slug elevenlabs ja existe — a 202 ja foi aplicada?';
  end if;
  -- a premissa medida: a org que eu alcanco esta em pro
  if (select count(*) from ops.contas_servicos
       where ativo and servico='supabase' and plano='free') < 6 then
    raise exception 'esperava pelo menos 6 projetos Supabase marcados free — conferir antes';
  end if;
end $$;

insert into ops.servicos (slug, nome, familia, sort_order) values
  ('elevenlabs', 'ElevenLabs (voz)', 'plataformas', 35),
  ('vercel',     'Vercel (hospedagem)', 'infra', 36)
on conflict (slug) do nothing;

-- 1) a linha da ORG, que é quem paga
insert into ops.contas_servicos
  (servico, identificador, categoria, conta_dona, navegador, plano, custo_mensal, moeda,
   produtos, status, obs, ativo)
values
  ('supabase', 'org sisdigiai (mjqoctgruveqlmcqzhsi)', 'infra', 'sisdigiai@gmail.com', 'empresa DIGIAI',
   'pro', 25, 'USD', array['digiai','nexus','gj','lumina','blogs'], 'ok',
   '202 (09/10): plano MEDIDO por GET /v1/organizations com o PAT do digiai. O Pro se cobra por ORG, nao '
   'por projeto — o custo mora aqui e os 6 projetos dela ficam sem custo, para a soma da casa nao contar '
   'seis vezes. Base US$ 25 + uso.', true);

-- 2) ElevenLabs, que nao existia
insert into ops.contas_servicos
  (servico, identificador, categoria, conta_dona, plano, custo_mensal, moeda, renova_em,
   produtos, status, obs, ativo)
values
  ('elevenlabs', 'ElevenLabs Creator', 'ia', 'sisdigiai@gmail.com', 'Creator', 22, 'USD', date '2026-11-05',
   array['osi','limelight'], 'ok',
   '202 (09/10): NAO existia no inventario, nem o slug no vocabulario — e a OSI e o Limelight usam a voz. '
   'Valor e renovacao: leitura da fatura pelo Geral em 09/10 (fatura de 05/10, paga pelo dono hoje).', true);

-- 3) o projeto que faltava, medido na API
insert into ops.contas_servicos
  (servico, identificador, categoria, conta_dona, plano, produtos, status, obs, ativo)
values
  ('supabase', 'zgojkioieztikqhwcoae', 'infra', 'sisdigiai@gmail.com', 'pro', array['blogs'], 'desconhecido',
   '202 (09/10): projeto `ecoax`, medido em GET /v1/projects e ausente do inventario. Esta na org '
   'mjqoctgruveqlmcqzhsi, que o custo cobre. Status desconhecido: nao conferi o projeto, so que existe.',
   true);

-- 4) os 6 projetos da org que eu alcanço: plano medido, sem custo (o custo é da org)
update ops.contas_servicos
   set plano = 'pro',
       obs = coalesce(obs || E'\n', '') ||
         '202 (09/10): plano `pro` MEDIDO na API (org mjqoctgruveqlmcqzhsi). Dizia `free`, que era falso. '
         'Sem custo nesta linha de proposito: o Pro se cobra por org, e o custo esta na linha da org.',
       updated_at = now()
 where ativo and servico = 'supabase'
   and identificador in ('hswyopqvnolqpmprqvzh','tkbhhbzhlqsgcwljeesg','siinufinhffynevhydgu',
                         'xfkcqrlovqbcriiksxng','nrrkcfxcqnvvhhamhrqf','zgojkioieztikqhwcoae');

-- 5) os que este token não alcança: `free` vira NULO. "Nao sei" e melhor que um free que ninguem conferiu.
update ops.contas_servicos
   set plano = null,
       obs = coalesce(obs || E'\n', '') ||
         '202 (09/10): o `plano` dizia `free` e foi para NULO — este token nao alcanca a org desta conta '
         '(ja registrado aqui em 16/08), logo eu nao sei o plano. Plano real: pendente do dono.',
       updated_at = now()
 where ativo and servico = 'supabase' and plano = 'free'
   and identificador not in ('hswyopqvnolqpmprqvzh','tkbhhbzhlqsgcwljeesg','siinufinhffynevhydgu',
                             'xfkcqrlovqbcriiksxng','nrrkcfxcqnvvhhamhrqf','zgojkioieztikqhwcoae');

-- 6) Netlify: o dono decidiu nao pagar, e eu medi os 37 hosts
update ops.contas_servicos
   set situacao = 'encerrada',
       encerrada_em = date '2026-10-14',
       plano = null,
       obs = coalesce(obs || E'\n', '') ||
         '202 (09/10): o dono decidiu nao pagar; sai do ar em ~14/10. Mapa dos 37 hosts e destinos em '
         'ops.netlify_destino (197/198). Dizia `plano free · situacao ativa`, cinco dias antes do fim.',
       updated_at = now()
 where ativo and servico = 'netlify';

-- 7) OpenAI: saldo pre-pago nao e mensalidade
update ops.contas_servicos
   set plano = 'pay-as-you-go (saldo)',
       ultimo_detalhe = 'saldo US$ 9,49 em 09/10/2026 (leitura do Geral); org "pulso control"',
       obs = coalesce(obs || E'\n', '') ||
         '202 (09/10): saldo pre-pago, NAO mensalidade — por isso sem `custo_mensal`. O identificador segue '
         '"(a confirmar)": pendente do dono.',
       updated_at = now()
 where ativo and servico = 'openai';

do $$
declare v_pro int; v_nulo int; v_custo int; v_soma numeric; v_eleven int;
begin
  -- a) os 6 medidos dizem pro, e NENHUM deles carrega custo
  select count(*) into v_pro from ops.contas_servicos
   where ativo and servico='supabase' and plano='pro'
     and identificador in ('hswyopqvnolqpmprqvzh','tkbhhbzhlqsgcwljeesg','siinufinhffynevhydgu',
                           'xfkcqrlovqbcriiksxng','nrrkcfxcqnvvhhamhrqf','zgojkioieztikqhwcoae');
  if v_pro <> 6 then raise exception 'PROVA_202_FALHOU: esperava 6 projetos em pro e achei %', v_pro; end if;
  if exists (select 1 from ops.contas_servicos
              where ativo and servico='supabase' and custo_mensal is not null
                and identificador <> 'org sisdigiai (mjqoctgruveqlmcqzhsi)') then
    raise exception 'PROVA_202_FALHOU: custo em linha de projeto — a soma da casa contaria seis vezes';
  end if;

  -- b) nenhum Supabase ficou dizendo `free`: ou e pro medido, ou e nulo declarado
  if exists (select 1 from ops.contas_servicos where ativo and servico='supabase' and plano='free') then
    raise exception 'PROVA_202_FALHOU: sobrou projeto dizendo free, que era o valor falso';
  end if;
  select count(*) into v_nulo from ops.contas_servicos
   where ativo and servico='supabase' and plano is null;
  if v_nulo < 5 then
    raise exception 'PROVA_202_FALHOU: esperava >=5 com plano nulo (os fora do alcance) e achei %', v_nulo;
  end if;

  -- c) o ElevenLabs existe agora, com valor e renovacao
  select count(*) into v_eleven from ops.contas_servicos
   where ativo and servico='elevenlabs' and custo_mensal = 22 and renova_em = date '2026-11-05';
  if v_eleven <> 1 then raise exception 'PROVA_202_FALHOU: o ElevenLabs nao entrou direito'; end if;

  -- d) CONTROLE POSITIVO (R-043 §4-A): a casa passa a ter SOMA de custo, e ela tem de ser exatamente
  --    25 + 22 = 47 USD. Se viesse 25*6+22, o custo por projeto teria entrado; se viesse 22, a org falhou.
  select count(*), coalesce(sum(custo_mensal),0) into v_custo, v_soma
    from ops.contas_servicos where ativo and custo_mensal is not null and moeda = 'USD';
  if v_custo <> 2 or v_soma <> 47 then
    raise exception 'PROVA_202_FALHOU: esperava 2 contas somando 47 USD e achei % somando %', v_custo, v_soma;
  end if;

  -- e) a Netlify esta encerrada com data, e nao mais "ativa"
  if not exists (select 1 from ops.contas_servicos
                  where ativo and servico='netlify' and situacao='encerrada'
                    and encerrada_em = date '2026-10-14') then
    raise exception 'PROVA_202_FALHOU: a Netlify nao ficou encerrada com data';
  end if;

  -- f) e o OpenAI NAO ganhou custo mensal: saldo nao e mensalidade
  if exists (select 1 from ops.contas_servicos where ativo and servico='openai' and custo_mensal is not null) then
    raise exception 'PROVA_202_FALHOU: pus mensalidade num saldo pre-pago';
  end if;

  set local role authenticated;
  perform count(*) from public.v_ops_contas_servicos;
  reset role;
end $$;

commit;
