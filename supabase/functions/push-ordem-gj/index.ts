import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Empurra a ordem do dia (ops.ordem_do_dia) para a agenda pessoal no GJ.
 *
 * Por que existe: o painel so cobra se a cobranca sair dele. Ate 2026-08-14 quem
 * escrevia a agenda do dono era o digiai_mkt — o marketing ditando o dia, com um
 * roteiro semeado semanas antes. O cerebro (digiai) nao empurrava nada.
 *
 * So sobem itens `dono='humano'` e `estado='aberto'`: obrigacao da maquina nao
 * vira compromisso de gente. O bloco entra no titulo porque a agenda nao tem
 * como mostrar a hierarquia dos tres blocos.
 *
 * Idempotente: fn_importar_evento do GJ faz upsert por (user_id, origem,
 * origem_ref). Rodar de novo atualiza, nao duplica.
 */

const GJ_URL  = Deno.env.get('GJ_URL');
const GJ_KEY  = Deno.env.get('GJ_SERVICE_ROLE_KEY');
const GJ_USER = Deno.env.get('GJ_USER_ID');

const PREFIXO: Record<string, string> = {
  trava: '🔴 TRAVA',
  gate: '🎯 GATE',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'metodo nao suportado' }, 405);
  }

  // Falha fechada: sem os 3 secrets, nao inventa agenda.
  if (!GJ_URL || !GJ_KEY || !GJ_USER) {
    return json({ error: 'secrets do GJ ausentes (GJ_URL, GJ_SERVICE_ROLE_KEY, GJ_USER_ID)' }, 503);
  }

  const dia = new URL(req.url).searchParams.get('dia') ?? new Date().toISOString().slice(0, 10);

  const digiai = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: itens, error } = await digiai
    .schema('ops')
    .from('ordem_do_dia')
    .select('id, bloco, posicao, titulo, porque, dono, estado')
    .eq('dia', dia)
    .eq('dono', 'humano')
    .eq('estado', 'aberto')
    .order('posicao');

  if (error) return json({ error: 'falha ao ler a ordem', detalhe: error.message }, 500);
  if (!itens || itens.length === 0) return json({ ok: true, enviados: 0, aviso: 'nenhuma ordem humana aberta' });

  const gj = createClient(GJ_URL, GJ_KEY);
  const enviados: string[] = [];
  const falhas: { titulo: string; erro: string }[] = [];

  for (const it of itens) {
    const prefixo = PREFIXO[it.bloco] ?? '';
    const { error: e } = await gj.rpc('fn_importar_evento', {
      p_user_id:   GJ_USER,
      p_origem:    'digiai',
      p_origem_ref: `ordem-${it.id}`,
      p_titulo:    `${prefixo} ${it.titulo}`.trim(),
      p_data:      dia,
      p_hora:      null,
      p_contexto:  'trabalho',
      p_tipo:      'tarefa',
      p_local:     null,
    });
    if (e) falhas.push({ titulo: it.titulo, erro: e.message });
    else enviados.push(it.titulo);
  }

  return json({
    ok: falhas.length === 0,
    dia,
    enviados: enviados.length,
    falhas,
    detalhe: enviados,
  }, falhas.length > 0 ? 207 : 200);
});
