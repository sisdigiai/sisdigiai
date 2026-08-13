import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Sincroniza o espelho do aporte 7.4 (custo real de infraestrutura) do Finance
 * para finance.infra_costs deste banco.
 *
 * Por que existe: o digiai NAO pode ler o crm_erp em tempo de tela (ADR-0001/R-009,
 * e o crm_erp e o unico banco de producao real — R-033). Entao o dado vem por
 * espelho servidor-a-servidor e a UI le a tabela local.
 *
 * O token vive no secret ESPELHO_DIGIAI_TOKEN deste projeto e nunca no frontend:
 * variavel VITE_* iria embutida no bundle e ficaria visivel a qualquer visitante.
 */

const ESPELHO_URL =
  'https://mhgbuplnxtfgipbemchb.supabase.co/functions/v1/espelho-aporte-digiai';

// O espelho nao atribui ferramenta a produto — Supabase serve o ecossistema
// inteiro. Marcar tudo como 'compartilhado' e honesto; fingir rateio seria pior.
const PRODUCT_ID = 'compartilhado';

interface LinhaEspelho {
  mes: string;
  ferramenta: string;
  conta_pagadora: string;
  lancamentos: number;
  aporte_brl: number | string;
  parcial: boolean;
  extrato_ate: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'metodo nao suportado' }, 405);
  }

  const token = Deno.env.get('ESPELHO_DIGIAI_TOKEN');
  if (!token) return json({ error: 'ESPELHO_DIGIAI_TOKEN nao configurado' }, 503);

  const desde = new URL(req.url).searchParams.get('desde');
  const alvo = desde ? `${ESPELHO_URL}?desde=${encodeURIComponent(desde)}` : ESPELHO_URL;

  let resp: Response;
  try {
    resp = await fetch(alvo, { headers: { 'x-espelho-token': token } });
  } catch (e) {
    return json({ error: 'falha de rede ao chamar o espelho', detalhe: String(e) }, 502);
  }

  if (!resp.ok) {
    // 401 aqui significa token divergente entre os dois projetos — o caso mais
    // provavel de erro humano, entao vale dizer isso em vez de repassar o codigo.
    const corpo = await resp.text().catch(() => '');
    return json(
      {
        error: 'espelho recusou',
        status: resp.status,
        dica: resp.status === 401
          ? 'ESPELHO_DIGIAI_TOKEN difere entre o projeto do digiai e o do Finance'
          : undefined,
        corpo: corpo.slice(0, 300),
      },
      502,
    );
  }

  const payload = await resp.json();
  const linhas: LinhaEspelho[] = payload?.dados ?? [];
  if (linhas.length === 0) {
    return json({ ok: true, sincronizadas: 0, aviso: 'espelho devolveu vazio' });
  }

  const agora = new Date().toISOString();
  const registros = linhas.map((l) => ({
    product_id: PRODUCT_ID,
    service: l.ferramenta,
    month: l.mes,
    cost_brl: Number(l.aporte_brl),
    conta_pagadora: l.conta_pagadora,
    lancamentos: l.lancamentos,
    parcial: l.parcial,
    extrato_ate: l.extrato_ate,
    sincronizado_em: agora,
    notes: 'Espelho do aporte 7.4 (Finance/crm_erp). Valor BRUTO — cashback e reembolso nao abatidos.',
  }));

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Grava via RPC: o schema `finance` nao esta exposto no PostgREST (migration 052)
  // e continuamos nao expondo — ele carrega expenses e snapshots.
  const { data: gravadas, error } = await supabase.rpc('fn_sync_infra_costs', {
    p_linhas: registros,
  });

  if (error) return json({ error: 'falha ao gravar infra_costs', detalhe: error.message }, 500);

  return json({
    ok: true,
    sincronizadas: gravadas ?? registros.length,
    aporte_total_brl: payload?.aporte_total_brl ?? null,
    extrato_ate: linhas[0]?.extrato_ate ?? null,
    meses_parciais: linhas.filter((l) => l.parcial).length,
    sincronizado_em: agora,
  });
});
