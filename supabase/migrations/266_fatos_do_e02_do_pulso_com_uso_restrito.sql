-- ============================================================
-- 266 — os números do E02 dos Bastidores do Pulso entram em mkt.fatos, e entram FECHADOS
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Curadoria de mkt.fatos é do digiai (despacho de 31/07/2026).
--
-- ✔ APLICADA em 19/11/2026 às 11h07 BRT. Ensaio (rollback) passou antes; duas sabotagens morderam no
--   lugar certo. Medido depois: 34 fatos ativos, 26 públicos, os 6 novos presos e com acento inteiro;
--   e 0 fatos entrando no prompt do gerador para a marca pulso.
--   ACHADO AO MEDIR: a marca pulso não tem NENHUM fato fresco e público — os dois antigos (views do canal
--   e inscritos no YouTube) venceram em 01/09/2026. Para qualquer peça do Pulso fora do E02, a IA está
--   proibida de citar número por construção. Avisado ao Geral; reverificar é assunto do Pulso.
--
-- DE ONDE VEM: Geral → app digiai, 19/11/2026 10h56, pedindo o carimbo dos números do E02 que ele pôs na
-- folha única às 10h55 (Cockpit e7adc724, seção "Bastidores do Pulso, episódio 2"). Conferi na folha e no
-- arquivo do Pulso (`Cockpit/sessoes/_PARA_GERAL_2026-11-19-pulso-e02-texto-novo.md`): os seis números
-- batem, com fonte e data cada um. A palavra do dono está no canal do Pulso ("trocar pelo número real",
-- "R$ 559 (bruto)"), registrada pelo Geral na folha — é a folha que autoriza número público nesta casa.
--
-- O PROBLEMA QUE ESTE CARIMBO TEM DE RESOLVER, e que a tabela não sabia expressar: a folha escreve
-- **"Uso: episódio 2 dos Bastidores do Pulso (longo, cortes, chamada e descrição). Fora disso, pedir."**
-- Em mkt.fatos não havia onde guardar isso. Carimbar com `publico = true` jogaria "R$ 559 num dia" em
-- TODO prompt da marca pulso (o gerador lê `fresco and publico` e manda a lista para a IA): o número
-- escaparia para qualquer post, que é exatamente o que a folha proíbe. Carimbar e não registrar a
-- restrição seria pior: o próximo que reverificar o fato não teria como saber que ele é preso a um
-- episódio.
--
-- O QUE MUDA:
--   • coluna nova `mkt.fatos.uso_restrito` (texto, nula = sem restrição) e uma TRAVA de banco:
--     fato com uso restrito **não pode** ser público. Para liberar, é preciso apagar a restrição —
--     ato deliberado, não um update distraído. Portão que abre no erro não é portão (R-037).
--   • `v_mkt_fatos` passa a mostrar `uso_restrito` (coluna no fim, o resto do contrato intacto).
--   • entram 6 fatos em brand_slug = 'pulso', todos `publico = false` e com uso restrito ao E02.
--     Cinco são os números do episódio; o sexto é a trava do número que morreu ("R$ 1.710").
--
-- EFEITO NO FRONT: o card "Fatos publicáveis" do Marketing (lê v_mkt_fatos) vai de 28 para 34 linhas,
-- as 6 novas marcadas como não-públicas e com a restrição de uso à vista. No gerador do MKT, efeito
-- ZERO por construção — e isso é o objetivo, não um defeito: o E02 é escrito à mão pelo Pulso.
--
-- O QUE ESTE CARIMBO NÃO FAZ: não mexe em `mkt.content_rules` (travas de marca), que é a outra porta por
-- onde o "R$ 1.710" poderia voltar. Fica dito ao Geral, não resolvido aqui.
--
-- Ensaio: FEITO (rollback) + sabotagens listadas no fim.
-- ============================================================
begin;

-- ── travas de entrada: o estado que eu medi antes de escrever ──────────────────
do $$
declare v_cols text; v_opts text;
begin
  select string_agg(a.attname, ',' order by a.attnum) into v_cols
    from pg_attribute a
   where a.attrelid = 'public.v_mkt_fatos'::regclass and a.attnum > 0 and not a.attisdropped;
  if v_cols <> 'brand_slug,chave,fato,valor_numerico,fonte,verificado_em,validade_dias,publico,valido_ate,fresco' then
    raise exception 'v_mkt_fatos nao e o contrato que eu medi: %', v_cols;
  end if;

  select array_to_string(c.reloptions, ',') into v_opts
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'v_mkt_fatos';
  if coalesce(v_opts, '') not like '%security_invoker=on%' then
    raise exception 'v_mkt_fatos nao esta security_invoker; esta migration nao pode rebaixar o caminho de leitura';
  end if;

  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'mkt' and t.relname = 'fatos' and c.conname = 'fatos_chave_key'
       and pg_get_constraintdef(c.oid) = 'UNIQUE (chave)') then
    raise exception 'mkt.fatos nao tem mais UNIQUE (chave) — o upsert desta migration nao vale';
  end if;

  if (select count(*) from mkt.fatos where ativo) <> 28 then
    raise exception 'esperava 28 fatos ativos antes da leva, achei %', (select count(*) from mkt.fatos where ativo);
  end if;

  if exists (select 1 from mkt.fatos where chave like 'pulso_custo%' or chave like 'pulso_videos%'
                                        or chave like 'pulso_fatia%' or chave like 'pulso_tela%') then
    raise exception 'ja existe fato do E02 no banco; esta leva seria uma segunda escrita cega';
  end if;
end $$;

-- ── a coluna que faltava, com a trava ──────────────────────────────────────────
alter table mkt.fatos add column if not exists uso_restrito text;

alter table mkt.fatos drop constraint if exists fatos_uso_restrito_nao_e_publico;
alter table mkt.fatos add constraint fatos_uso_restrito_nao_e_publico
  check (uso_restrito is null or publico = false);

comment on column mkt.fatos.uso_restrito is
  'Onde este fato pode ser usado, quando a folha única restringe o uso (ex.: "só no episódio 2 dos Bastidores do Pulso; fora disso, pedir ao dono"). Nulo = sem restrição. Fato com uso restrito NÃO pode ser publico = true: o gerador do MKT lê fresco+publico e mandaria o número para qualquer peça da marca. Para liberar, apaga-se a restrição — de propósito, com a palavra do dono.';

-- ── o contrato de leitura ganha a restrição no fim, o resto intacto ────────────
create or replace view public.v_mkt_fatos with (security_invoker = true) as
select
  brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico,
  (verificado_em + validade_dias) as valido_ate,
  ((now() at time zone 'America/Sao_Paulo')::date <= verificado_em + validade_dias) as fresco,
  uso_restrito
from mkt.fatos
where ativo
order by brand_slug, chave;

comment on view public.v_mkt_fatos is
  'Fonte única de NÚMEROS para a IA do MKT citar. A IA só pode usar linha com fresco = true E publico = true; vencido ou não-público = silêncio por construção. `uso_restrito` diz onde o fato pode aparecer quando a folha única prende o uso a uma peça. Curadoria é do app digiai; o MKT só lê.';

revoke all on public.v_mkt_fatos from public, anon;
grant select on public.v_mkt_fatos to authenticated, service_role;

-- ── os seis fatos do E02 ───────────────────────────────────────────────────────
-- Cada frase sai pronta COM a ressalva dentro ("num dia", "projeção", "estimativa de junho",
-- "até 18 de novembro", "no bruto"). Fato cuja ressalva vive fora da frase é fato que viaja sem ela.
insert into mkt.fatos (brand_slug, chave, fato, valor_numerico, fonte, verificado_em, validade_dias, publico, uso_restrito) values
  ('pulso', 'pulso_custo_dia_12_06',
   'Em 12 de junho de 2026, num único dia, o PULSO gastou R$ 559 na ferramenta de vídeo: 2.070 créditos a R$ 0,27 cada. É o gasto bruto do extrato — 495 desses créditos voltaram como reembolso de gerações bloqueadas, o que dá cerca de R$ 425 líquidos. Não foi conferido contra a fatura do cartão.',
   559,
   'Extrato da ferramenta de vídeo (higgsfield account transactions), lido pelo Pulso em 18/11/2026; R$ 0,27 por crédito da calibração de 12/06/2026 (lib/config/custos.ts). Registrado na folha única em 19/11/2026, 10h55, seção "Bastidores do Pulso, episódio 2".',
   '2026-11-18', 365, false,
   'Só no episódio 2 dos Bastidores do Pulso (longo, cortes, chamada e descrição). Fora disso, pedir ao dono. Sai sempre com "num dia" e, havendo espaço, com a data.'),

  ('pulso', 'pulso_custo_mes_projecao',
   'Nesse ritmo, o gasto passaria de dezesseis mil reais por mês — R$ 16.770. É projeção (R$ 559 × 30 dias), não gasto que aconteceu.',
   16770,
   'Conta sobre o gasto de 12/06/2026 (fato pulso_custo_dia_12_06). Registrado na folha única em 19/11/2026, 10h55.',
   '2026-11-18', 365, false,
   'Só no episódio 2 dos Bastidores do Pulso, e sempre dita como projeção ("passaria"). Nunca como gasto realizado. Fora disso, pedir ao dono.'),

  ('pulso', 'pulso_custo_por_video_junho',
   'Pela estimativa de junho de 2026, o custo de cada vídeo caiu de R$ 93,80 para R$ 11,18 — do formato antigo (7 cenas com repetições) para o formato de junho (3 cenas, voz e texto). É estimativa, não preço pago por vídeo.',
   11.18,
   'lib/config/custos.ts (historicoBRL, totalBRL) e o Livro de Problemas do Pulso, em 14/06/2026. NÃO sai de extrato nem de fatura: a frase "conferido no extrato" está proibida pela folha única.',
   '2026-06-14', 365, false,
   'Só no episódio 2 dos Bastidores do Pulso, sempre com "estimativa de junho". Fora disso, pedir ao dono.'),

  ('pulso', 'pulso_videos_sem_cena_paga',
   'Até 18 de novembro de 2026, 179 dos 257 vídeos publicados saíram sem pagar nenhuma cena em vídeo — os curtos de 26/07 a 18/11. A última cena em vídeo paga foi em 25/07/2026.',
   179,
   'pulso_content.metricas_publicacao (ideias distintas) e o extrato da ferramenta de vídeo; recontado pelo Pulso em 19/11/2026.',
   '2026-11-19', 30, false,
   'Só no episódio 2 dos Bastidores do Pulso, sempre com a data "até 18/11". Número que envelhece: passados 30 dias, recontar antes de usar. Fora disso, pedir ao dono.'),

  ('pulso', 'pulso_fatia_modelo_junho',
   'Entre 12 e 17 de junho de 2026, um único modelo de vídeo levou 81% do gasto — 2.070 de 2.528 créditos, no bruto — e custava 5,6 vezes o preço do outro.',
   81,
   'Extrato da ferramenta de vídeo de 12 a 17/06/2026, medido em 17/06/2026 (memória higgsfield-custos-modelos do Pulso).',
   '2026-06-17', 365, false,
   'Só no episódio 2 dos Bastidores do Pulso. Fora disso, pedir ao dono.'),

  ('pulso', 'pulso_tela_1710_nao_e_dinheiro',
   'O "R$ 1.710 num dia" não é dinheiro: era a tela do app em 12/06/2026, que contava cada crédito a R$ 1,00. O valor real daquele dia é R$ 559, do extrato. Só pode aparecer na forma "a tela mostrava R$ 1.710", com a correção ao lado.',
   null,
   'Medido pelo Pulso em 18/11/2026, a tela contra o extrato. Está na folha única na seção "Números que NÃO existem".',
   '2026-11-18', 365, false,
   'Trava, não argumento: o número não se diz como dinheiro em lugar nenhum. Dentro do episódio 2, só na forma "a tela mostrava R$ 1.710" com a correção ao lado. O corte 1 publicado em 18/11, 12h, ficou no ar com o número antigo — apagar ou manter é decisão do dono, no canal do MKT.');

-- ── 2-a) a prova que importa: nenhum destes números alcança o prompt do gerador ─
-- Esta é a MESMA consulta do motor do MKT (_shared/fatos.ts): fresco + publico + marca ou geral.
do $$ declare n int; begin
  select count(*) into n
    from public.v_mkt_fatos
   where fresco and publico and (brand_slug = 'pulso' or brand_slug is null)
     and chave in ('pulso_custo_dia_12_06','pulso_custo_mes_projecao','pulso_custo_por_video_junho',
                   'pulso_videos_sem_cena_paga','pulso_fatia_modelo_junho','pulso_tela_1710_nao_e_dinheiro');
  if n <> 0 then
    raise exception '% fato(s) do E02 entrariam no prompt do gerador — a restricao da folha nao esta valendo', n;
  end if;
end $$;

-- 2-b) a trava morde: liberar sem apagar a restrição tem de ser impossível
do $$ declare v_estado text; begin
  begin
    update mkt.fatos set publico = true where chave = 'pulso_custo_dia_12_06';
    raise exception 'o banco aceitou publicar um fato de uso restrito: a trava nao existe';
  exception when check_violation then
    get stacked diagnostics v_estado = returned_sqlstate;
    if v_estado <> '23514' then raise exception 'recusou, mas nao foi a trava: %', v_estado; end if;
  end;
  -- e apagar a restrição de propósito tem de funcionar (senão o fato nunca poderia ser liberado)
  update mkt.fatos set uso_restrito = null, publico = true where chave = 'pulso_custo_dia_12_06';
  if (select publico from mkt.fatos where chave = 'pulso_custo_dia_12_06') is not true then
    raise exception 'apagar a restricao nao liberou o fato: a porta nao abre nem de proposito';
  end if;
  -- desfaz: o fato volta preso, que é como ele tem de ficar
  update mkt.fatos
     set publico = false,
         uso_restrito = 'Só no episódio 2 dos Bastidores do Pulso (longo, cortes, chamada e descrição). Fora disso, pedir ao dono. Sai sempre com "num dia" e, havendo espaço, com a data.'
   where chave = 'pulso_custo_dia_12_06';
end $$;

-- 2-c) cada frase carrega a própria ressalva, dentro do texto
do $$ begin
  if not exists (select 1 from mkt.fatos where chave='pulso_custo_dia_12_06' and fato like '%num único dia%' and fato like '%bruto%') then
    raise exception 'o fato do dia perdeu "num dia" ou "bruto"'; end if;
  if not exists (select 1 from mkt.fatos where chave='pulso_custo_mes_projecao' and fato like '%projeção%') then
    raise exception 'a projecao do mes nao se declara projecao'; end if;
  if not exists (select 1 from mkt.fatos where chave='pulso_custo_por_video_junho' and fato like '%estimativa de junho%') then
    raise exception 'o custo por video nao se declara estimativa de junho'; end if;
  if not exists (select 1 from mkt.fatos where chave='pulso_videos_sem_cena_paga' and fato like '%18 de novembro de 2026%') then
    raise exception 'o 179 de 257 saiu sem a data que o faz envelhecer com honestidade'; end if;
  if exists (select 1 from mkt.fatos where chave='pulso_custo_por_video_junho' and fato ilike '%extrato%') then
    raise exception 'a frase proibida ("conferido no extrato") voltou ao fato do custo por video'; end if;
end $$;

-- 2-d) o resto da tabela ficou onde estava, e o acento chegou inteiro
do $$ declare n_ativos int; n_publicos int; begin
  select count(*), count(*) filter (where publico) into n_ativos, n_publicos from mkt.fatos where ativo;
  if n_ativos <> 34 then raise exception 'esperava 34 fatos ativos depois da leva, achei %', n_ativos; end if;
  if n_publicos <> 26 then raise exception 'esperava 26 publicos (os 26 de antes), achei %', n_publicos; end if;
  if exists (select 1 from mkt.fatos where fato like '%' || chr(65533) || '%' or uso_restrito like '%' || chr(65533) || '%') then
    raise exception 'acento corrompido (U+FFFD) em algum fato: a escrita passou por um caminho que estraga UTF-8';
  end if;
  if (select count(*) from mkt.fatos where uso_restrito is not null and publico) <> 0 then
    raise exception 'ha fato de uso restrito publicado'; end if;
end $$;

-- 2-e) a view entrega a restrição e continua fechada para anon
do $$ declare v_cols text; begin
  select string_agg(a.attname, ',' order by a.attnum) into v_cols
    from pg_attribute a where a.attrelid = 'public.v_mkt_fatos'::regclass and a.attnum > 0 and not a.attisdropped;
  if v_cols <> 'brand_slug,chave,fato,valor_numerico,fonte,verificado_em,validade_dias,publico,valido_ate,fresco,uso_restrito' then
    raise exception 'o contrato de leitura saiu diferente do planejado: %', v_cols;
  end if;
  if has_table_privilege('anon', 'public.v_mkt_fatos', 'select') then
    raise exception 'anon le v_mkt_fatos'; end if;
  if not has_table_privilege('authenticated', 'public.v_mkt_fatos', 'select') then
    raise exception 'authenticated nao le v_mkt_fatos — a tela do Marketing quebraria'; end if;
end $$;

commit;

-- Sabotagens conferidas (todas morderam):
--   a) carimbar um dos seis com publico = true  → a trava do banco recusa (23514), e a 2-a acusa.
--   b) tirar a constraint e carimbar publico = true → 2-a: "1 fato(s) do E02 entrariam no prompt".
--   c) tirar "estimativa de junho" da frase do custo por vídeo → 2-c acusa a frase sem ressalva.
--   d) devolver "conferido no extrato" ao mesmo fato → 2-c acusa a frase proibida.
--   e) escrever a leva pelo heredoc do Git Bash → 2-d acusa U+FFFD (foi por isto que o arquivo
--      é escrito direto e lido como UTF-8 pelo script, nunca montado no shell).
--
-- Reversão: delete dos 6 fatos pela chave, view de volta às 10 colunas, drop da constraint e da coluna.
