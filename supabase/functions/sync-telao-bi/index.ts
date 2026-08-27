import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Sincroniza o snapshot do BI Clearix (espelho-telao-bi, crm_erp) para
 * public.espelho_telao_bi deste banco — a fonte do slide 8 do Telão.
 *
 * Por que existe: o Telão NÃO lê o crm_erp (R-033) e faturamento NÃO viaja por
 * anon key. O caminho é servidor-a-servidor com token compartilhado
 * (ESPELHO_TELAO_TOKEN, nos secrets dos dois projetos — nunca em código), o
 * mesmo desenho do sync-aporte-digiai.
 *
 * CONTRATO v3 (v2 + lojas_operantes e por_loja — ordem do dono: por loja, decisório) (27/08, medido na origem pelo orquestrador Clearix):
 * dia_referencia · mes_referencia · vendas_qtd_dia · faturamento_liquido_dia ·
 * ticket_medio_dia · entregas_dia · vendas_qtd_mes · faturamento_liquido_mes ·
 * media_diaria_30d · os_ativas_60d · os_prontas_retirada_60d ·
 * os_finalizadas_hoje · observacoes[] · gerado_em.
 * As OS usam JANELA DE 60 DIAS — o corte honesto: sem janela, o legado infla
 * 2.101 "abertas" onde a operação real tem 89. taxa_segundo_par/remake_rate/
 * missoes saíram no v2 (origem vazia — campo nulo é buraco na tela).
 *
 * Falha aqui NUNCA inventa dado: a linha antiga fica e o Telão envelhece o
 * carimbo (sincronizado_em) na tela.
 */

const ESPELHO_URL =
  'https://mhgbuplnxtfgipbemchb.supabase.co/functions/v1/espelho-telao-bi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'metodo nao suportado' }, 405);
  }

  const token = Deno.env.get('ESPELHO_TELAO_TOKEN');
  if (!token) return json({ error: 'ESPELHO_TELAO_TOKEN nao configurado' }, 503);

  let resp: Response;
  try {
    resp = await fetch(ESPELHO_URL, { headers: { 'x-espelho-token': token } });
  } catch (e) {
    return json({ error: 'falha de rede ao chamar o espelho', detalhe: String(e) }, 502);
  }
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    // 401 = token divergente entre os projetos (erro humano mais provável)
    return json({ error: `espelho respondeu ${resp.status}`, corpo: corpo.slice(0, 200) }, 502);
  }

  const p = await resp.json();

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await sb.from('espelho_telao_bi').upsert({
    id: 1,
    dia_referencia: p.dia_referencia ?? null,
    mes_referencia: p.mes_referencia ?? null,
    vendas_qtd_dia: p.vendas_qtd_dia ?? null,
    faturamento_liquido_dia: p.faturamento_liquido_dia ?? null,
    ticket_medio_dia: p.ticket_medio_dia ?? null,
    entregas_dia: p.entregas_dia ?? null,
    vendas_qtd_mes: p.vendas_qtd_mes ?? null,
    faturamento_liquido_mes: p.faturamento_liquido_mes ?? null,
    media_diaria_30d: p.media_diaria_30d ?? null,
    os_ativas_60d: p.os_ativas_60d ?? null,
    os_prontas_retirada_60d: p.os_prontas_retirada_60d ?? null,
    os_finalizadas_hoje: p.os_finalizadas_hoje ?? null,
    lojas_operantes: p.lojas_operantes ?? null,
    por_loja: p.por_loja ?? null,
    observacoes: p.observacoes ?? null,
    gerado_em: p.gerado_em ?? null,
    sincronizado_em: new Date().toISOString(),
    payload: p,
  });
  if (error) return json({ error: 'falha ao gravar', detalhe: error.message }, 500);

  return json({ ok: true, sincronizado_em: new Date().toISOString(), gerado_em: p.gerado_em ?? null });
});
