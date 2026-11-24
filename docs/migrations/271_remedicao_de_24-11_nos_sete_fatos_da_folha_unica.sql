-- ============================================================
-- 271 — a Remedição de 24/11/2026 entra nos sete fatos que a folha única já remediu
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Curadoria de mkt.fatos é do digiai (despacho de 31/07/2026).
--
-- DE ONDE VEM: Geral → app digiai, 24/11/2026 16h47 (e complemento), relatando a palavra do dono no
-- canal dele; o "pode gravar os fatos" veio do dono no canal deste app, 24/11. A fonte do TEXTO é a
-- folha única (`Cockpit/comercial/folha-de-mesa-clearix-2026-09-14.md`, seção "Remedição de
-- 24/11/2026", coluna "Frase que pode sair"). A medição é do eco no crm_erp, só leitura, 24/11 16h38
-- (`Cockpit/controle/remedicao-landing-2026-11-24.md`). Nada aqui é número novo: é o texto da folha.
--
-- O QUE ESTAVA ERRADO, e era mais que número velho: três das sete frases afirmavam coisa que a medição
-- de hoje não sustenta. "1.685 criadas no balcão NO DIA DA VENDA" — o critério, de setembro e de hoje,
-- é "criada até 2 dias depois da data da venda"; "no dia da venda" nunca foi literal. "3.401 mensagens
-- TROCADAS PELO SISTEMA" — de 3.357 enviadas, 1.964 foram digitadas no celular da loja e só registradas
-- (o registro começou em 04/11/2026); "pelo sistema" só vale para 1.393. Por isso o MKT havia desligado
-- três fatos por precaução (ativo = false): clearix_os_2026, clearix_whatsapp_30d e
-- clearix_receita_vencida_12m. Eles voltam ao ar NESTA transação, junto com o texto certo — nunca antes.
--
-- O ERRO QUE A TRAVA DO BANCO PEGOU, e fica registrado porque foi meu: o primeiro rascunho desta leva
-- pendurava `uso_restrito` em quatro dos sete, como se fosse ressalva ao lado de um número público.
-- `uso_restrito` é CERCA, não nota: a trava `fatos_uso_restrito_nao_e_publico` (migration 266, escrita
-- por este mesmo app em 19/11) exige `publico = false`. Gravar aquilo teria tirado do ar, em silêncio,
-- quatro dos números públicos da landing do Clearix. A trava recusou com 23514 e nada foi escrito.
--
-- ONDE CADA RESSALVA FICA, então:
--   • a que MUDA O QUE SE PODE DIZER entra DENTRO da frase ("nasceram no balcão, não por carga";
--     "dessas, 1.393 saíram pelo sistema"). Princípio da 266: fato cuja ressalva vive fora da frase é
--     fato que viaja sem ela.
--   • a de PROCEDÊNCIA entra em `fonte`, que a tela mostra embaixo de cada fato ("verificado … · vale
--     até … · {fonte}").
--   • `uso_restrito` NÃO é tocado por esta migration. As sete linhas continuam públicas.
--
-- O QUE ESTA MIGRATION NÃO FAZ: não cria trava para os números mortos (5.366 e 5.635 da comissão; a
-- forma "no dia da venda"; a forma "trocadas pelo sistema" para o total). Pelo padrão da casa isso é
-- linha própria, não-pública, com `uso_restrito` — como `pulso_tela_1710_nao_e_dinheiro` da 266. É
-- decisão separada, do dono, e fica dita ao Geral. A folha única já segura esses três hoje.
--
-- EFEITO NO FRONT: na aba Publicações do Marketing e em tudo que lê `v_mkt_fatos`, os fatos ativos vão
-- de 31 para 34 (os três que voltam) e os sete passam a trazer a data de 24/11 e as frases novas.
-- Nenhum fato muda de público para preso, nem o contrário.
--
-- Ensaio: FEITO (rollback) — o retrato de volta é `Cockpit/controle/volta-fatos-remedicao-2026-11-24.sql`,
-- gerado do banco antes da gravação, não digitado. Sabotagens no fim.
-- ============================================================
begin;

-- ── travas de entrada: o estado que eu medi antes de escrever ──────────────────
do $$
declare v_cols text; v_opts text; n int;
begin
  select string_agg(a.attname, ',' order by a.attnum) into v_cols
    from pg_attribute a
   where a.attrelid = 'public.v_mkt_fatos'::regclass and a.attnum > 0 and not a.attisdropped;
  if v_cols <> 'brand_slug,chave,fato,valor_numerico,fonte,verificado_em,validade_dias,publico,valido_ate,fresco,uso_restrito' then
    raise exception 'v_mkt_fatos nao e o contrato que eu medi: %', v_cols;
  end if;

  select array_to_string(c.reloptions, ',') into v_opts
    from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace
   where n2.nspname = 'public' and c.relname = 'v_mkt_fatos';
  -- o Postgres guarda a opcao com o texto que recebeu: `=true` aqui, `=on` em outras views da casa.
  -- A 266 testava so por `=on`; copiar aquele teste fez esta migration recusar uma view que esta certa.
  if coalesce(v_opts, '') !~ 'security_invoker=(on|true)' then
    raise exception 'v_mkt_fatos nao esta security_invoker (reloptions: %); esta migration nao pode rebaixar o caminho de leitura', coalesce(v_opts, '(vazio)');
  end if;

  -- as sete chaves existem, e nenhuma delas esta cercada hoje (se estivesse, esta leva teria de parar:
  -- fato cercado e fato nao-publico, e republicar texto nele seria mexer no estado da cerca as cegas)
  select count(*) into n from mkt.fatos
   where chave in ('clearix_os_2026','digiai_prova_operacao','clearix_caixas_equipe_2026',
                   'clearix_whatsapp_30d','clearix_comissao_2026','clearix_receita_vencida_12m',
                   'clearix_receita_vence_30d');
  if n <> 7 then raise exception 'esperava as 7 chaves da folha, achei %', n; end if;

  select count(*) into n from mkt.fatos
   where uso_restrito is not null
     and chave in ('clearix_os_2026','digiai_prova_operacao','clearix_caixas_equipe_2026',
                   'clearix_whatsapp_30d','clearix_comissao_2026','clearix_receita_vencida_12m',
                   'clearix_receita_vence_30d');
  if n <> 0 then raise exception '% das 7 chaves ja tem uso_restrito; parar e perguntar', n; end if;

  -- os tres que o MKT desligou por precaucao
  select count(*) into n from mkt.fatos
   where not ativo
     and chave in ('clearix_os_2026','clearix_whatsapp_30d','clearix_receita_vencida_12m');
  if n <> 3 then raise exception 'esperava 3 fatos desligados pelo MKT, achei %', n; end if;

  if (select count(*) from mkt.fatos where ativo) <> 31 then
    raise exception 'esperava 31 fatos ativos antes da leva, achei %', (select count(*) from mkt.fatos where ativo);
  end if;
end $$;

-- ── as sete frases da folha ────────────────────────────────────────────────────
-- 1) OS de 2026. A frase velha dizia "1.685 criadas no balcao NO DIA DA VENDA". O criterio sempre foi
--    "ate 2 dias depois da data da venda", que separa balcao de carga e nada mais. A frase nova diz o
--    que o criterio mede.
update mkt.fatos set
  fato = 'Em 2026, 2.004 OS na loja viva da rede da casa; 1.995 nasceram no balcão, não por carga (medido em 24/11/2026).',
  valor_numerico = 2004,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp, sales_finance.orders) · "no dia da venda" nunca foi literal: o critério, de setembro e de hoje, é "criada até 2 dias depois da data da venda", que só separa balcão de carga.',
  verificado_em = '2026-11-24',
  updated_at = now(),
  ativo = true
where chave = 'clearix_os_2026';

-- 2) a prova de que a casa opera o proprio varejo. Mesmo numero da 1, mesma data.
update mkt.fatos set
  fato = 'A DIGIAI opera o próprio varejo óptico dentro do Clearix: uma rede da casa, com 1 loja vendendo todo dia e 2.004 OS em 2026 (medido em 24/11/2026).',
  valor_numerico = 2004,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp, sales_finance.orders)',
  verificado_em = '2026-11-24',
  updated_at = now()
where chave = 'digiai_prova_operacao';

-- 3) caixas. Cresceu de 132 para 165 no ano; a procedencia diz o que o numero do ANO nao prova.
update mkt.fatos set
  fato = '165 caixas abertos e fechados pela equipe em 2026, na loja viva (medido em 24/11/2026).',
  valor_numerico = 165,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp, cash_sessions) · é número do ano: em novembro foram 11 caixas, motivo não investigado — não serve de prova de uso do mês.',
  verificado_em = '2026-11-24',
  updated_at = now()
where chave = 'clearix_caixas_equipe_2026';

-- 4) WhatsApp. A frase velha era a pior das sete: "trocadas PELO SISTEMA" para o total. A nova separa
--    o que o sistema mandou (1.393) do que a loja digitou no celular e o sistema so registrou.
update mkt.fatos set
  fato = '6.298 mensagens de WhatsApp registradas em 30 dias: 2.941 recebidas e 3.357 enviadas; dessas, 1.393 saíram pelo sistema (medido em 24/11/2026).',
  valor_numerico = 6298,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp) · "trocadas pelo sistema" não vale para o total: 1.964 das enviadas foram digitadas no celular da loja e só registradas (o registro começou em 04/11/2026).',
  verificado_em = '2026-11-24',
  updated_at = now(),
  ativo = true
where chave = 'clearix_whatsapp_30d';

-- 5) comissao. 1.449 e o que foi calculado sobre OS entregues; o total da tabela carrega a carga
--    retroativa de abril e nao se publica.
update mkt.fatos set
  fato = '1.449 linhas de comissão calculadas sobre OS entregues em 2026, para 9 vendedores (medido em 24/11/2026).',
  valor_numerico = 1449,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp) · 5.366 e 5.635 são o total da tabela, com a carga retroativa de abril, e não se publicam.',
  verificado_em = '2026-11-24',
  updated_at = now()
where chave = 'clearix_comissao_2026';

-- 6) receita vencida. Caiu de 926/912 para 802/713 — e parte da queda do "sem contato" nao e mais gente
--    chamada: e o contato passando a enxergar a mensagem digitada no celular da loja. Dito na fonte,
--    porque quem le o numero precisa saber que a melhora e em parte de medicao.
update mkt.fatos set
  fato = '802 clientes com a receita vencida no último ano; 713 deles sem nenhum contato da loja em 90 dias (Grupo Mello, medido em 24/11/2026).',
  valor_numerico = 802,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp) · parte da queda de 912 para 713 vem de o contato passar a enxergar a mensagem digitada no celular da loja, não de mais gente chamada; ligação não registrada continua fora (Fone: 0 ligações em novembro).',
  verificado_em = '2026-11-24',
  updated_at = now(),
  ativo = true
where chave = 'clearix_receita_vencida_12m';

-- 7) quem chamar hoje. Janela movel: a data e o inicio da janela, nao so a medicao.
update mkt.fatos set
  fato = '88 receitas vencem nos próximos 30 dias; 64 desses clientes sem contato (Grupo Mello, janela a partir de 24/11/2026).',
  valor_numerico = 88,
  fonte = 'folha única · Remedição de 24/11/2026 (eco, crm_erp) · segundo número, "quem chamar hoje"',
  verificado_em = '2026-11-24',
  updated_at = now()
where chave = 'clearix_receita_vence_30d';

-- ── 2-a) as sete escreveram, e escreveram o que a folha diz ────────────────────
do $$ declare n int; begin
  select count(*) into n from mkt.fatos
   where verificado_em = '2026-11-24'
     and fonte like 'folha única · Remedição de 24/11/2026%'
     and chave in ('clearix_os_2026','digiai_prova_operacao','clearix_caixas_equipe_2026',
                   'clearix_whatsapp_30d','clearix_comissao_2026','clearix_receita_vencida_12m',
                   'clearix_receita_vence_30d');
  if n <> 7 then raise exception 'so % das 7 linhas receberam a remedicao', n; end if;

  -- `mkt.fatos` nao tem trigger de updated_at: a coluna e mantida a mao. Sem carimbar, quatro linhas
  -- ficariam com data de setembro carregando texto de novembro, e a tabela mentiria sobre quando mudou.
  select count(*) into n from mkt.fatos
   where (updated_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
     and chave in ('clearix_os_2026','digiai_prova_operacao','clearix_caixas_equipe_2026',
                   'clearix_whatsapp_30d','clearix_comissao_2026','clearix_receita_vencida_12m',
                   'clearix_receita_vence_30d');
  if n <> 7 then raise exception 'so % das 7 linhas ficaram com updated_at de hoje', n; end if;
end $$;

-- 2-b) as frases mortas nao sobreviveram em nenhum fato da tabela
do $$ begin
  if exists (select 1 from mkt.fatos where fato ilike '%no dia da venda%') then
    raise exception 'a forma "no dia da venda" ainda esta em algum fato'; end if;
  if exists (select 1 from mkt.fatos where fato ilike '%trocadas pelo sistema%') then
    raise exception 'a forma "trocadas pelo sistema" ainda esta em algum fato'; end if;
  if exists (select 1 from mkt.fatos where fato like '%1.694%' or fato like '%3.401%' or fato like '%926 clientes%') then
    raise exception 'numero velho da remedicao ainda esta no ar'; end if;
end $$;

-- 2-c) cada frase carrega a propria ressalva, dentro do texto
do $$ begin
  if not exists (select 1 from mkt.fatos where chave='clearix_os_2026' and fato like '%não por carga%') then
    raise exception 'o fato das OS saiu sem dizer o que o criterio realmente separa'; end if;
  if not exists (select 1 from mkt.fatos where chave='clearix_whatsapp_30d'
                   and fato like '%registradas%' and fato like '%saíram pelo sistema%') then
    raise exception 'o fato do WhatsApp nao separa registrado de mandado pelo sistema'; end if;
  if not exists (select 1 from mkt.fatos where chave='clearix_receita_vence_30d' and fato like '%janela a partir%') then
    raise exception 'o segundo numero saiu sem dizer que a janela e movel'; end if;
end $$;

-- 2-d) os tres voltaram ao ar, e voltaram JUNTO com o texto novo
do $$ declare n int; begin
  select count(*) into n from mkt.fatos
   where ativo and verificado_em = '2026-11-24'
     and chave in ('clearix_os_2026','clearix_whatsapp_30d','clearix_receita_vencida_12m');
  if n <> 3 then raise exception 'os tres que o MKT desligou nao voltaram com o texto novo (achei %)', n; end if;
  if (select count(*) from mkt.fatos where ativo) <> 34 then
    raise exception 'esperava 34 fatos ativos depois da leva, achei %', (select count(*) from mkt.fatos where ativo); end if;
end $$;

-- 2-e) nenhuma das sete virou cercada, e a trava da 266 continua de pe na tabela inteira
do $$ begin
  if exists (select 1 from mkt.fatos
              where uso_restrito is not null
                and chave in ('clearix_os_2026','digiai_prova_operacao','clearix_caixas_equipe_2026',
                              'clearix_whatsapp_30d','clearix_comissao_2026','clearix_receita_vencida_12m',
                              'clearix_receita_vence_30d')) then
    raise exception 'alguma das 7 saiu cercada — era exatamente o erro que a trava pegou'; end if;
  if (select count(*) from mkt.fatos where uso_restrito is not null and publico) <> 0 then
    raise exception 'ha fato de uso restrito publicado'; end if;
  if (select count(*) from mkt.fatos where uso_restrito is not null) <> 6 then
    raise exception 'o numero de fatos cercados mudou (esperava os 6 do E02 do Pulso, achei %)',
      (select count(*) from mkt.fatos where uso_restrito is not null); end if;
end $$;

-- 2-f) as sete chegam ao prompt do gerador (esta e a MESMA consulta do motor do MKT, _shared/fatos.ts)
do $$ declare n int; begin
  select count(*) into n from public.v_mkt_fatos
   where fresco and publico
     and chave in ('clearix_os_2026','digiai_prova_operacao','clearix_caixas_equipe_2026',
                   'clearix_whatsapp_30d','clearix_comissao_2026','clearix_receita_vencida_12m',
                   'clearix_receita_vence_30d');
  if n <> 7 then raise exception 'so % das 7 estao citaveis (frescas E publicas) — a remedicao nao chegou a IA', n; end if;
end $$;

-- 2-g) o acento chegou inteiro (escrita por caminho que estraga UTF-8 deixa U+FFFD)
do $$ begin
  if exists (select 1 from mkt.fatos
              where fato like '%' || chr(65533) || '%' or fonte like '%' || chr(65533) || '%'
                 or uso_restrito like '%' || chr(65533) || '%') then
    raise exception 'acento corrompido (U+FFFD) em algum fato: a escrita passou por um caminho que estraga UTF-8';
  end if;
end $$;

commit;

-- Sabotagens conferidas (todas morderam):
--   a) pendurar `uso_restrito` nas sete, como no primeiro rascunho → a trava da 266 recusa (23514) e a
--      2-e acusa. Foi assim que o erro apareceu, antes de qualquer escrita.
--   b) deixar um dos tres em ativo = false → 2-d: "os tres ... nao voltaram com o texto novo".
--   c) manter a frase "no dia da venda" num deles → 2-b acusa a forma morta.
--   d) dizer "6.298 trocadas pelo sistema" → 2-b acusa, e a 2-c acusa a falta da separacao.
--   e) escrever a leva pelo heredoc do Git Bash → 2-g acusa U+FFFD.
--
-- Reversao: `Cockpit/controle/volta-fatos-remedicao-2026-11-24.sql` (retrato gerado do banco antes da
-- gravacao). Nenhum delete, de um lado nem do outro.
