-- 139 — régua da curadoria: "reais" só é preço com número colado
--
-- ✔ APLICADA em 17/09/2026 às 00:21:48 BRT, com a palavra do dono neste canal ("temos que aplicar todas as migrations em nosso banco todo"),
--   reensaiada contra o banco do dia antes. Medido depois: régua com [0-9]\s*reais; pauta segue com 9 ideias.
--
-- (Escrita como NÃO APLICADA.)
-- ⛔ NÃO APLICADA. Pede a palavra do dono neste canal.
--
-- POR QUE: o ensaio do lote 1 da OSI (16/09 ~21:20) teve o lote INTEIRO recusado com "preco no texto" por causa da frase
--   "Rosto e voz reais dela" — "reais" também é plural de "real" (casos reais, vozes reais, clientes reais). A régua da 135
--   usava \mreais\M sozinho. Pedido do Orquestrador Geral, 16/09.
--
-- O QUE MUDA: só o padrão de preço de marketing.fn_ideia_problemas:
--   antes: (r\$|\mreais\M|[0-9]+,[0-9]{2}\M)
--   depois: (r\$|[0-9]\s*reais\M|[0-9]+,[0-9]{2}\M)
--   "R$" e "00,00" continuam pegando sozinhos; "reais" só com número antes ("49 reais", "49reais").
--   Resto da função intacto: a troca é feita sobre a definição que está no banco, conferida por md5 antes.
--
-- EFEITO: nenhuma ideia aprovada hoje (a pauta está vazia); o lote 1 passa a poder usar "reais" no sentido de verdadeiro.

begin;

do $$
declare
  v_def text := pg_get_functiondef('marketing.fn_ideia_problemas(uuid)'::regprocedure);
  v_velho constant text := '(r\$|\mreais\M|[0-9]+,[0-9]{2}\M)';
  v_novo  constant text := '(r\$|[0-9]\s*reais\M|[0-9]+,[0-9]{2}\M)';
begin
  if md5(v_def) <> '8c542ce4c0cd61c3f4a57bab69513e52' then
    raise exception 'fn_ideia_problemas mudou desde a 135 — conferir antes de trocar o padrao.';
  end if;
  if (length(v_def) - length(replace(v_def, v_velho, ''))) / length(v_velho) <> 1 then
    raise exception 'o padrao antigo nao aparece exatamente uma vez na funcao.';
  end if;
  execute replace(v_def, v_velho, v_novo);
end $$;

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
declare v_def text := pg_get_functiondef('marketing.fn_ideia_problemas(uuid)'::regprocedure);
begin
  if position('(r\$|[0-9]\s*reais\M|[0-9]+,[0-9]{2}\M)' in v_def) = 0
  or position('\mreais\M|' in v_def) > 0 then
    raise exception 'o padrao novo nao entrou, ou o antigo ficou.';
  end if;
end $$;

-- prova de comportamento, desfeita na hora: 1 frase que deve passar e 3 que devem cair
do $$
declare
  v_ok uuid; v_n1 uuid; v_n2 uuid; v_n3 uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  begin
    insert into marketing.content_ideas (hook, narrative, status, marca, pilar, valida_ate)
    values ('PROVA_139', 'Casos reais do balcão, com clientes reais e vozes reais.', 'available', 'osi', 'metodo de balcao na pratica', v_hoje + 5)
    returning id into v_ok;
    insert into marketing.content_ideas (hook, narrative, status, marca, pilar, valida_ate)
    values ('PROVA_139', 'Leve por 49 reais hoje.', 'available', 'osi', 'metodo de balcao na pratica', v_hoje + 5)
    returning id into v_n1;
    insert into marketing.content_ideas (hook, narrative, status, marca, pilar, valida_ate)
    values ('PROVA_139', 'Sai por R$ 49.', 'available', 'osi', 'metodo de balcao na pratica', v_hoje + 5)
    returning id into v_n2;
    insert into marketing.content_ideas (hook, narrative, status, marca, pilar, valida_ate)
    values ('PROVA_139', 'Custa 49,00 no checkout.', 'available', 'osi', 'metodo de balcao na pratica', v_hoje + 5)
    returning id into v_n3;

    if 'preco no texto' = any (marketing.fn_ideia_problemas(v_ok)) then
      raise exception 'PROVA_139_FALHOU: "casos reais" ainda e tratado como preco';
    end if;
    if not ('preco no texto' = any (marketing.fn_ideia_problemas(v_n1)))
    or not ('preco no texto' = any (marketing.fn_ideia_problemas(v_n2)))
    or not ('preco no texto' = any (marketing.fn_ideia_problemas(v_n3))) then
      raise exception 'PROVA_139_FALHOU: "49 reais", "R$ 49" ou "49,00" deixou de ser preco';
    end if;
    raise exception 'PROVA_139_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_139_OK' then raise; end if;
  end;
end $$;

commit;
