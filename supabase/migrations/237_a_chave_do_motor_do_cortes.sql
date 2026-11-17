-- 237 · A chave pública do motor do DIGIAI Cortes, com a porta `cortes`
--
-- Pedida por ele em 17/11 às 12h30 (`_PARA_APP_DIGIAI_2026-11-17-cortes-chave-publica.md`) e cobrada
-- pelo Orquestrador às 16h53: o motor está parado à espera disto, e o primeiro corte é segunda, 23/11.
--
-- CONFERIDA POR MIM, não pelo relato, a partir de `Cockpit/chaves-publicas/cortes.txt`:
-- 44 bytes SPKI, tipo ed25519, uma assinatura falsa é recusada por ela, e a impressão sha256 da SPKI é
-- 0f9b170a669fe4905d90360979abd2de1330978d7e2ec5f99c4ac80f8c43629c. A prova 2 desta migration falha se
-- o que está no banco não for essa chave — é o que impede um erro de cópia passar calado.
--
-- PORTA: só `cortes`. Este motor não escreve na Lousa, e os emissores da Lousa não escrevem aqui.

begin;

insert into ops.emissor_externo (nome, chave_publica, ativo, descricao, registrado_por, portas)
values ('cortes', 'MCowBQYDK2VwAyEAHNLytj0BfVgRPAqNicUjNruLFpBZnyR2s2eRbTriOzw=', true,
        'Motor do DIGIAI Cortes: monta vídeo com FFmpeg na máquina local e grava no schema cortes.',
        'app digiai, conferida em 17/11/2026', array['cortes'])
on conflict (nome) do update
  set chave_publica = excluded.chave_publica, ativo = true, portas = excluded.portas;

do $$
declare v_txt text;
begin
  -- 1. Entra na porta dele e em nenhuma outra.
  if ops.fn_emissor_chave('cortes', 'cortes') is null then
    raise exception 'PROVA 1 FALHOU: o motor do cortes não recebe chave na porta dele';
  end if;
  if ops.fn_emissor_chave('cortes', 'lousa') is not null then
    raise exception 'PROVA 1 FALHOU: a chave do cortes abre a Lousa';
  end if;

  -- 2. É a chave que eu conferi no arquivo, byte a byte.
  select encode(sha256(decode(chave_publica, 'base64')), 'hex') into v_txt
    from ops.emissor_externo where nome = 'cortes';
  if v_txt <> '0f9b170a669fe4905d90360979abd2de1330978d7e2ec5f99c4ac80f8c43629c' then
    raise exception 'PROVA 2 FALHOU: a chave do cortes no banco não é a que eu conferi (%)', v_txt;
  end if;

  -- 3. Os emissores da Lousa continuam fora do cortes (o buraco fechado pela 235 segue fechado).
  if ops.fn_emissor_chave('limelight', 'cortes') is not null
     or ops.fn_emissor_chave('pulso', 'cortes') is not null then
    raise exception 'PROVA 3 FALHOU: emissor da Lousa voltou a abrir o cortes';
  end if;

  raise notice 'as 3 provas passaram';
end $$;

commit;
