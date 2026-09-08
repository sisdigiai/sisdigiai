// espelho-pulso — devolve public.v_espelho_pulso (agregado do Pulso, COM custo/receita) a quem
// tem sessão válida no digiai. Nasceu em 08/09/2026 quando o anon foi revogado no Pulso: a view
// expunha custo_caixa/consumo/receita a qualquer portador da chave pública. Contrato entre
// projetos por anon key é contrato público; dado financeiro vai por credencial de servidor.
//
// Portão (R-037): o chamador precisa ser (a) um usuário real do digiai — JWT validado por
// auth.getUser, não decode local — ou (b) o service_role do digiai (uso máquina-a-máquina).
// A anon key do bundle NÃO passa: getUser falha para ela. Erro = fechado (401), nunca aberto.
//
// Segredos (projeto digiai): PULSO_SERVICE_ROLE_KEY (lê a view no projeto do Pulso). Nunca
// chega ao navegador: a função devolve só o JSON da view.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PULSO_URL = Deno.env.get('PULSO_URL') ?? 'https://nlcisbfdiokmipyihtuz.supabase.co';
const ORIGENS = new Set([
  'https://app.digiai.app.br',
  'https://sisdigiai.netlify.app',
  'https://digiai-telao.pages.dev',
  'http://localhost:5173',
  'http://localhost:5183',
]);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENS.has(o) ? o : 'https://app.digiai.app.br',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'GET') return json(req, 405, { error: 'metodo' });

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json(req, 401, { error: 'sem_sessao' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

  // service_role: o gateway (verify_jwt=true) já validou a assinatura deste JWT; aqui só se
  // lê o claim `role`. O env SUPABASE_SERVICE_ROLE_KEY do runtime não é comparável por string
  // (chaves legadas × novas), por isso o claim, e não a igualdade.
  let liberado = false;
  let roleClaim = '';
  try {
    const p = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    roleClaim = String(p.role ?? '');
  } catch { roleClaim = ''; }
  if (jwt === SERVICE || roleClaim === 'service_role') {
    liberado = true; // máquina-a-máquina do próprio digiai
  } else {
    // Valida a sessão no Auth do digiai (não decode local). Anon key não é usuário → falha.
    const cli = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data, error } = await cli.auth.getUser(jwt);
    liberado = !error && !!data?.user?.id;
  }
  if (!liberado) return json(req, 401, { error: 'sem_sessao' });

  const PULSO_KEY = Deno.env.get('PULSO_SERVICE_ROLE_KEY');
  if (!PULSO_KEY) return json(req, 503, { error: 'sem_credencial_pulso' }); // fecha, não abre

  try {
    const r = await fetch(`${PULSO_URL}/rest/v1/v_espelho_pulso?select=*`, {
      headers: { apikey: PULSO_KEY, Authorization: `Bearer ${PULSO_KEY}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return json(req, 502, { error: 'pulso_http_' + r.status });
    const rows = await r.json();
    return json(req, 200, Array.isArray(rows) && rows.length ? rows[0] : null);
  } catch (e) {
    return json(req, 502, { error: 'pulso_inacessivel', detalhe: e instanceof Error ? e.name : 'erro' });
  }
});
