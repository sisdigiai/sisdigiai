import { supabase } from './supabase';

// Reautorizar o Google Search Console pela tela SEO (portão 130).
//
// Ida: a edge monta a URL de consentimento (o client_id mora no vault) e o navegador vai
// para o Google. Volta: o Google devolve `?code&state` na raiz do app. O `redirect_uri`
// não pode ter `#`, e as rotas deste app são por hash, por isso App.tsx manda para o
// módulo SEO quando o `state` é deste fluxo. A SEO troca o code na edge, com a sessão de
// quem clicou.
//
// O `state` carrega um nonce guardado em sessionStorage. Um `?code` que chegue sem o nonce
// desta aba (link colado, aba antiga) é recusado em vez de ser trocado.

const PREFIXO = 'gsc-reauth.';
const CHAVE = 'digiai_gsc_reauth_nonce';

export type ResultadoReauth = { ok: boolean; erro?: string };

function redirectUri(): string {
  return `${window.location.origin}/`;
}

export function ehRetornoDoGoogle(): boolean {
  return (new URLSearchParams(window.location.search).get('state') ?? '').startsWith(PREFIXO);
}

async function erroDaEdge(error: unknown, data: unknown): Promise<string> {
  const ctx = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  const corpo = (ctx?.json ? await ctx.json().catch(() => null) : data) as
    { error?: string; detail?: { error?: string; error_description?: string } } | null;
  const detalhe = [corpo?.detail?.error, corpo?.detail?.error_description].filter(Boolean).join(' — ');
  return [corpo?.error, detalhe].filter(Boolean).join(': ') || (error instanceof Error ? error.message : 'erro desconhecido');
}

export async function iniciarReautorizacao(): Promise<ResultadoReauth> {
  const nonce = crypto.randomUUID();
  try { sessionStorage.setItem(CHAVE, nonce); } catch { return { ok: false, erro: 'o navegador bloqueou o armazenamento da sessão — sem ele a volta do Google não pode ser conferida' }; }

  const { data, error } = await supabase.functions.invoke<{ ok: boolean; url?: string }>('marketing-sync-gsc', {
    method: 'POST',
    body: { action: 'auth_url', redirect_uri: redirectUri(), state: PREFIXO + nonce },
  });
  if (error || !data?.ok || !data.url) return { ok: false, erro: await erroDaEdge(error, data) };
  window.location.assign(data.url);
  return { ok: true };
}

export async function concluirReautorizacao(): Promise<ResultadoReauth> {
  const q = new URLSearchParams(window.location.search);
  const state = q.get('state') ?? '';
  const code = q.get('code');
  const erroGoogle = q.get('error');

  let esperado: string | null = null;
  try { esperado = sessionStorage.getItem(CHAVE); sessionStorage.removeItem(CHAVE); } catch { /* sem storage: esperado fica nulo e recusa */ }
  // tira ?code da barra de endereço já: não fica no histórico nem é trocado duas vezes
  window.history.replaceState(null, '', `${window.location.pathname}#/seo`);

  if (erroGoogle) return { ok: false, erro: `o Google não autorizou: ${erroGoogle}` };
  if (!esperado || state !== PREFIXO + esperado) {
    return { ok: false, erro: 'a volta do Google não pertence a esta aba (state diferente) — nada foi gravado; clique em Reautorizar de novo' };
  }
  if (!code) return { ok: false, erro: 'o Google voltou sem code' };

  const { data, error } = await supabase.functions.invoke<{ ok: boolean }>('marketing-sync-gsc', {
    method: 'POST',
    body: { action: 'exchange_code', code, redirect_uri: redirectUri() },
  });
  if (error || !data?.ok) return { ok: false, erro: await erroDaEdge(error, data) };
  return { ok: true };
}
