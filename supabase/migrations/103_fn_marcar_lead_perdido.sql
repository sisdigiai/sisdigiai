-- 103 — `fn_marcar_lead_perdido`: a porta que faltava para registrar uma perda
--
-- ⚠ NÃO APLICADA. Aguarda o "pode" do dono.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ISTO É MAIS URGENTE DO QUE PARECE
-- ═══════════════════════════════════════════════════════════════════════════
-- Medido em 09/09: **260 leads, ZERO em `perdido`**. Não é que ninguém perdeu
-- venda — é que **nunca deu para registrar**. A CHECK `perdido_exige_motivo`
-- existe há meses, e nenhuma tela oferece campo de motivo: quem marcasse "Perdido"
-- recebia violação de constraint no meio do salvar.
--
-- Construímos hoje a lista fechada (096), a trava de aposentado (101) e a FK —
-- tudo do lado do banco, e **sem porta**. Esta RPC é a porta.
--
-- POR QUE VALIDAR AQUI, se a FK e o trigger já guardam:
-- guardam, e devolvem `23503` / `23514` — códigos que a tela mostra como "erro ao
-- salvar". A RPC valida ANTES e devolve mensagem legível **com a lista dos motivos
-- válidos**, que é o que permite à pessoa consertar sozinha. A trava do banco
-- continua sendo a garantia; esta validação é a cortesia.
--
-- O QUE NÃO LIMPO, e é deliberado: `next_touch_at`. A agenda
-- (`marketing.v_whatsapp_followups_hoje`) filtra `stage = 'contatado'`, então lead
-- perdido **já sai da agenda sozinho** — conferido na definição da view. Apagar o
-- agendamento destruiria a informação de quando se pretendia tocar, sem ganho.

begin;

create or replace function public.fn_marcar_lead_perdido(p_lead_id uuid, p_motivo text)
returns ops.commercial_leads
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare r ops.commercial_leads; v_ativo boolean;
begin
  if not (public.pode_tocar_lead() or public.contexto_de_maquina()) then
    raise exception 'Acesso negado: marcar lead como perdido exige papel staff ou vendas'
      using errcode = '42501';
  end if;

  if p_lead_id is null then
    raise exception 'Informe o lead' using errcode = '22004';
  end if;

  -- Mensagem legível ANTES de a FK/trigger falarem em código.
  select ativo into v_ativo from ops.motivos_perda where chave = p_motivo;
  if v_ativo is null then
    raise exception 'Motivo "%" não existe. Motivos válidos: %', coalesce(p_motivo,'(vazio)'),
      (select string_agg(chave, ', ' order by ordem) from ops.motivos_perda where ativo)
      using errcode = '23503';
  end if;
  if not v_ativo then
    raise exception 'Motivo "%" está aposentado e não aceita registro novo. Motivos válidos: %', p_motivo,
      (select string_agg(chave, ', ' order by ordem) from ops.motivos_perda where ativo)
      using errcode = '23514';
  end if;

  update ops.commercial_leads set
    stage         = 'perdido',
    motivo_perda  = p_motivo,
    perdido_em    = now(),
    -- Marcar como perdido É um toque: foi quando se soube o desfecho.
    last_touch_at = now()
  where id = p_lead_id and deleted_at is null
  returning * into r;

  if r.id is null then
    raise exception 'Lead % não encontrado (ou já removido)', p_lead_id using errcode = 'P0002';
  end if;
  return r;
end $function$;

comment on function public.fn_marcar_lead_perdido(uuid, text) is
  'Marca lead como perdido com motivo da lista fechada (ops.motivos_perda). CONSUMIDORES: tela /vendas do digiai_mkt e o módulo Comercial do digiai. Valida o motivo ANTES da FK/trigger só para devolver mensagem legível com a lista de válidos — a garantia continua sendo a do banco. Autorização: pode_tocar_lead() (humano) ou contexto_de_maquina() (service_role).';

-- Pela 098, objeto novo não nasce concedido: conceder é explícito e diz a quem serve.
revoke all on function public.fn_marcar_lead_perdido(uuid, text) from public, anon;
grant execute on function public.fn_marcar_lead_perdido(uuid, text) to authenticated, service_role;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS POR EXECUÇÃO — em lead descartável, e depois apagá-lo
-- ═══════════════════════════════════════════════════════════════════════════
--   a) motivo ATIVO ('medo_mudanca')  → grava; stage='perdido', perdido_em e
--      last_touch_at preenchidos;
--   b) motivo INEXISTENTE             → 23503 com a lista de válidos na mensagem;
--   c) motivo APOSENTADO              → 23514 com a lista de válidos;
--   d) anon                           → 42501;
--   e) o lead marcado SOME da agenda (`v_whatsapp_followups_hoje`) sem ninguém
--      limpar `next_touch_at` — porque a view filtra `stage='contatado'`.
--
-- ⚠ A (e) é a que eu quase "consertei" sem precisar: o instinto era limpar
--    `next_touch_at` ao perder. Fui ler a view antes e ela já resolve. Limpar
--    teria apagado quando se pretendia tocar, em troca de nada.
--
-- ⚠ E ESTA MIGRATION SOZINHA NÃO CONSERTA A TELA DO DIGIAI: o módulo Comercial
--    continua sem campo de motivo, e ainda oferece o estágio 'lead', que o
--    vocabulário do banco NÃO aceita ('captado' é o primeiro). Sem o front,
--    "Perdido" continua falhando — agora por falta de porta, não de fechadura.
