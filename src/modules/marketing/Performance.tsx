import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, ExternalLink, Eye, Heart, MessageCircle, RefreshCw, Bookmark, Users } from 'lucide-react';
import { marketingStore, type SocialAccount, type AccountStatus, type PostMetric } from '../../lib/marketingStore';

// Central de Postagens — Performance (ADR-0039 / F3).
// Lê o que as edge functions de sync gravam. Enquanto a F1 (token Meta) não roda,
// mostra o placar vazio + aviso de configuração. Publicação segue humana (T-9/T-10).

const CAMADA_LABEL: Record<string, string> = { pessoal: 'Pessoal', digiai: 'DIGIAI', osi: 'OSI' };
const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR'));

export function Performance() {
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [status, setStatus] = useState<AccountStatus[] | null>(null);
  const [metrics, setMetrics] = useState<PostMetric[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [a, s, m] = await Promise.all([
      marketingStore.listSocialAccounts(),
      marketingStore.latestAccountStatus(),
      marketingStore.latestPostMetrics(),
    ]);
    setAccounts(a); setStatus(s); setMetrics(m);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const statusByCode = useMemo(() => new Map((status ?? []).map(s => [s.account_code, s])), [status]);
  const accByCode = useMemo(() => new Map((accounts ?? []).map(a => [a.account_code, a])), [accounts]);
  const anyEnabled = (accounts ?? []).some(a => a.metrics_enabled);
  const metricsRows = useMemo(
    () => (metrics ?? []).filter(m => (m.reach ?? m.likes ?? m.comments) != null),
    [metrics],
  );

  if (accounts === null && !loading) {
    return (
      <div className="p-8">
        <div className="border border-warning/20 bg-warning/[0.06] px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-sm text-on-surface-variant">
            <b className="text-on-surface">Fundação indisponível.</b> Migration 042 (Central de Postagens) ainda não aplicada no banco.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-secondary" /> Performance das postagens</h3>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          Métricas reais puxadas das contas Meta (leitura). Publicação segue humana via Business Suite (ADR-0039).
        </p>

        {!anyEnabled && (
          <div className="border border-warning/20 bg-warning/[0.06] px-4 py-3 flex gap-3 items-start mb-5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-on-surface-variant">
              <b className="text-on-surface">Aguardando configuração (F1).</b> Nenhuma conta tem coleta de métricas ligada ainda.
              Falta cadastrar o token de leitura Meta (BM Digiai) — passo a passo em{' '}
              <span className="font-mono">docs/setup-meta-graph-token.md</span>. A fundação e a tela já estão prontas; assim que o token entrar, os números aparecem aqui sozinhos.
            </div>
          </div>
        )}
      </div>

      {/* Placar de seguidores */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface mb-3 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Placar de seguidores</h4>
        {loading ? (
          <div className="text-center py-8 text-muted text-sm">Carregando...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(accounts ?? []).map(a => {
              const s = statusByCode.get(a.account_code);
              return (
                <div key={a.account_code} className="bg-surface-low border border-outline/10 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted">{CAMADA_LABEL[a.camada]} · {a.platform}</span>
                    {a.public_url && <a href={a.public_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-on-surface"><ExternalLink className="w-3 h-3" /></a>}
                  </div>
                  <div className="text-sm font-medium truncate">{a.display_name}</div>
                  <div className="text-2xl font-semibold mt-2">{s ? fmt(s.followers) : '—'}</div>
                  <div className="text-[11px] text-muted">{s ? `seguidores · ${s.captured_on}` : (a.metrics_enabled ? 'aguardando 1ª coleta' : 'coleta desligada')}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Performance por post */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface mb-3">Por post (último snapshot)</h4>
        {loading ? (
          <div className="text-center py-8 text-muted text-sm">Carregando...</div>
        ) : metricsRows.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm border border-outline/10 bg-surface-low">
            Nenhuma métrica coletada ainda. Os números aparecem aqui após a 1ª coleta (F1 + sync).
          </div>
        ) : (
          <div className="border border-outline/10 divide-y divide-outline/10">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-low text-[10px] uppercase tracking-wider text-muted font-bold">
              <div className="col-span-4">Conta · post</div>
              <div className="col-span-2 text-right flex items-center justify-end gap-1"><Eye className="w-3 h-3" /> Alcance</div>
              <div className="col-span-2 text-right flex items-center justify-end gap-1"><Heart className="w-3 h-3" /> Curtidas</div>
              <div className="col-span-2 text-right flex items-center justify-end gap-1"><MessageCircle className="w-3 h-3" /> Coment.</div>
              <div className="col-span-2 text-right flex items-center justify-end gap-1"><Bookmark className="w-3 h-3" /> Salvos</div>
            </div>
            {metricsRows.map(m => {
              const a = accByCode.get(m.account_code);
              return (
                <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-surface-low text-sm items-center">
                  <div className="col-span-4 min-w-0">
                    <div className="truncate">{a?.display_name ?? m.account_code}</div>
                    {m.permalink && <a href={m.permalink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-secondary hover:text-on-surface flex items-center gap-1"><ExternalLink className="w-3 h-3" /> ver post</a>}
                  </div>
                  <div className="col-span-2 text-right font-mono">{fmt(m.reach)}</div>
                  <div className="col-span-2 text-right font-mono">{fmt(m.likes)}</div>
                  <div className="col-span-2 text-right font-mono">{fmt(m.comments)}</div>
                  <div className="col-span-2 text-right font-mono">{fmt(m.saves)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
