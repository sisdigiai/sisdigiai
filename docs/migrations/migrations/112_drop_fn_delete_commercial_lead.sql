-- 112 — `fn_delete_commercial_lead` sai de vez
--
-- ⚠ NÃO APLICADA. É `drop function` — ação DESTRUTIVA. Só com a palavra do dono.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE A APOSENTADORIA DA 111 NÃO BASTOU — achado do MKT ao regenerar os tipos
-- ═══════════════════════════════════════════════════════════════════════════
-- A 111 trocou o corpo por um `raise 0A000` que aponta `fn_descartar_lead`. Isso
-- protege o DADO: quem chama leva a explicação e nada é gravado. Escrevi lá que o
-- MKT devia regenerar os tipos "para ninguém ser guiado para ela".
--
-- Ele regenerou, e a função continuou nos tipos. O gerador lista toda função que
-- EXISTE no schema exposto, sem olhar o que o corpo faz. O `database.types.ts`
-- continuou a oferecer, no autocomplete, a quem escrever código contra os tipos:
--     fn_delete_commercial_lead: { Args: { p_id: string }; Returns: undefined }
--
-- Aposentar fecha a porta; os tipos continuam a desenhar a porta na parede. E a
-- minha frase na 111 prometia um efeito que a regeneração sozinha não entrega.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- MEDIDO EM 10/09/2026, antes de propor o drop
-- ═══════════════════════════════════════════════════════════════════════════
--   chamadas nas fontes do workspace (src, edge functions, scripts) ... 0
--     (única ocorrência: digiai_mkt/src/lib/database.types.ts — gerado)
--   bundle publicado do digiai (b3437a0) ............................. 0
--   bundle publicado do digiai_mkt (3cfed95, medido pelo MKT) ........ 0
--   pg_depend, dependentes não-internos .............................. 0
--   outras funções / views / cron que a citam ........................ 0
--   sobrecargas ....................................................... 1
--
-- O ÚNICO "CHAMADOR" QUE SOBRA é uma aba de navegador aberta com o bundle
-- anterior ao b3437a0. Depois do drop, essa aba leva "função não encontrada" em
-- vez da mensagem da 111. A tela mostra o erro (desde o 0503c7b) e nada é gravado.
-- Recarregar a página resolve. É o custo, e é pequeno.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PRÉ-DROP — as mesmas medições, refeitas no momento de aplicar
-- ═══════════════════════════════════════════════════════════════════════════
-- Entre escrever e aplicar pode ter nascido um chamador no banco. Se nascer, a
-- migration recusa inteira e diz qual, em vez de o deixar a chamar o vazio.
do $$
declare n int;
begin
  if to_regprocedure('public.fn_delete_commercial_lead(uuid)') is null then
    raise exception 'fn_delete_commercial_lead(uuid) já não existe — nada a fazer; conferir se a 112 já foi aplicada.';
  end if;

  select count(*) into n from pg_depend
   where refobjid = 'public.fn_delete_commercial_lead(uuid)'::regprocedure and deptype <> 'i';
  if n > 0 then
    raise exception '% dependente(s) em pg_depend — o drop sem CASCADE recusaria; ver quem antes de seguir.', n;
  end if;

  select count(*) into n from pg_proc
   where prosrc ilike '%fn_delete_commercial_lead%'
     and oid <> 'public.fn_delete_commercial_lead(uuid)'::regprocedure;
  if n > 0 then
    raise exception '% função(ões) citam fn_delete_commercial_lead no corpo — plpgsql não entra em pg_depend, então o drop passaria e elas partiriam em silêncio.', n;
  end if;

  select count(*) into n from pg_class c
   where c.relkind in ('v','m') and pg_get_viewdef(c.oid, true) ilike '%fn_delete_commercial_lead%';
  if n > 0 then
    raise exception '% view(s) citam fn_delete_commercial_lead.', n;
  end if;

  select count(*) into n from cron.job where command ilike '%fn_delete_commercial_lead%';
  if n > 0 then
    raise exception '% job(s) do cron chamam fn_delete_commercial_lead.', n;
  end if;
end $$;

-- Sem CASCADE, de propósito: se algo depender dela, o drop recusa em vez de levar
-- junto em silêncio.
drop function public.fn_delete_commercial_lead(uuid);

do $$
begin
  if to_regprocedure('public.fn_delete_commercial_lead(uuid)') is not null then
    raise exception 'fn_delete_commercial_lead ainda existe depois do drop.';
  end if;
  -- Não-regressão: o caminho que a substitui continua lá e executável.
  if not has_function_privilege('authenticated', 'public.fn_descartar_lead(uuid,text)', 'execute') then
    raise exception 'authenticated perdeu fn_descartar_lead — a tela ficaria sem porta de saída.';
  end if;
end $$;

-- Recarrega o cache do PostgREST no commit, para a função sumir da API já e não
-- só na próxima recarga automática.
notify pgrst, 'reload schema';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `select to_regprocedure('public.fn_delete_commercial_lead(uuid)')` → nulo;
--   b) `select public.fn_delete_commercial_lead(gen_random_uuid())` → 42883
--      (undefined_function) — é o erro que a aba antiga passaria a ver;
--   c) não-regressão: `fn_descartar_lead(<descartável>, 'duplicado')` continua a
--      gravar, numa transação desfeita;
--   d) o MKT regenera os tipos e `fn_delete_commercial_lead` SAI do
--      `database.types.ts`. Esta é a prova que justifica a migration — sem ela,
--      o drop foi feito pelo motivo certo e não se viu o efeito.
