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

// Só um service_role autêntico responde 200 em /auth/v1/admin/users; anon, usuário e JWT
// forjado recebem 401/403. Verificação no servidor, nunca por decode local.
async function ehServiceRoleValido(url: string, anon: string, jwt: string): Promise<boolean> {
  try {
    const r = await fetch(`${url}/auth/v1/admin/users?per_page=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(6000),
    });
    return r.status === 200;
  } catch {
    return false;
  }
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

  // Portão que NÃO depende do verify_jwt do gateway (flag fora do repo; já caiu uma vez na casa):
  // nenhum claim é lido localmente. service_role só passa se o servidor de Auth aceitar o JWT
  // num endpoint admin (assinatura verificada lá); usuário só passa por auth.getUser.
  // Prova de 08/09 (orquestrador do app): JWT forjado com role=service_role → 401.
  // Ordem = caminho comum primeiro (usuário: UMA ida ao Auth); service_role no else (raro).
  // Um JWT de service_role não vira usuário no getUser e cai no else naturalmente.
  // (v4, 08/09 — o orquestrador do app mediu a v3 pagando duas idas ao Auth por usuário.)
  let liberado = false;
  if (jwt === SERVICE) {
    liberado = true; // máquina-a-máquina do próprio digiai (igualdade exata com o env)
  } else {
    // Valida a sessão no Auth do digiai (não decode local). Anon key não é usuário → falha.
    const cli = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data, error } = await cli.auth.getUser(jwt);
    liberado = !error && !!data?.user?.id;
    if (!liberado) liberado = await ehServiceRoleValido(SUPABASE_URL, ANON, jwt);
  }
  if (!liberado) return json(req, 401, { error: 'sem_sessao' });

  // Fonte, por ordem: (1) rota do próprio Pulso `GET /api/espelho` com segredo de escopo "uma
  // leitura" (ESPELHO_SECRET — portão 38, 08/09); (2) enquanto o segredo não existir, a view
  // direto com a service key do Pulso (chave-mestra; some no mesmo dia em que (1) entrar).
  const ESPELHO_SECRET = Deno.env.get('ESPELHO_SECRET');
  const ROTA = Deno.env.get('PULSO_ESPELHO_ROTA') ?? 'https://pulsoprojects.vercel.app/api/espelho';
  const PULSO_KEY = Deno.env.get('PULSO_SERVICE_ROLE_KEY');
  if (!ESPELHO_SECRET && !PULSO_KEY) return json(req, 503, { error: 'sem_credencial_pulso' }); // fecha, não abre

  try {
    if (ESPELHO_SECRET) {
      const r = await fetch(ROTA, {
        headers: { 'x-espelho-secret': ESPELHO_SECRET, Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return json(req, 502, { error: 'pulso_rota_http_' + r.status });
      const obj = await r.json();
      return json(req, 200, obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : (Array.isArray(obj) ? obj[0] ?? null : null));
    }
    const r = await fetch(`${PULSO_URL}/rest/v1/v_espelho_pulso?select=*`, {
      headers: { apikey: PULSO_KEY!, Authorization: `Bearer ${PULSO_KEY}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return json(req, 502, { error: 'pulso_http_' + r.status });
    const rows = await r.json();
    return json(req, 200, Array.isArray(rows) && rows.length ? rows[0] : null);
  } catch (e) {
    return json(req, 502, { error: 'pulso_inacessivel', detalhe: e instanceof Error ? e.name : 'erro' });
  }
});
