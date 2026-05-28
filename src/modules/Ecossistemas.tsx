import { useEffect, useState } from 'react';
import { ExternalLink, Boxes, Globe } from 'lucide-react';
import { companyStore } from '../lib/companyStore';
import type { DigitalAsset } from '../lib/supabase';

// Rótulo amigável por owner_product (agrupa os apps por ecossistema).
const OWNER_LABEL: Record<string, string> = {
  clearix: 'Ecossistema Clearix',
  digiai: 'DIGIAI (núcleo)',
  osi: 'Ótica Sem Improviso',
  polapetit: 'Polapetit',
  pulso: 'Pulso Control',
  nexus: 'Nexus',
  lumina: 'Lumina',
};

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  ativo:              { label: 'Ativo',       cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  a_registrar:        { label: 'A registrar', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  registrado_sem_uso: { label: 'Sem uso',     cls: 'bg-surface-high text-on-surface-variant border-outline/10' },
  arquivado:          { label: 'Arquivado',   cls: 'bg-surface-low text-muted border-outline/10' },
};

export default function Ecossistemas() {
  const [assets, setAssets] = useState<DigitalAsset[] | null>(null);

  useEffect(() => {
    companyStore.listDigitalAssets().then(setAssets).catch(() => setAssets([]));
  }, []);

  const sites = (assets ?? []).filter(a => a.categoria === 'site' || a.categoria === 'landing_page');
  const ativos = sites.filter(s => s.status === 'ativo').length;

  const groups: Record<string, DigitalAsset[]> = {};
  for (const s of sites) {
    const key = s.owner_product || 'outros';
    (groups[key] ||= []).push(s);
  }
  const orderedKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 font-serif">
          <Boxes className="w-7 h-7 text-secondary" /> Ecossistemas
        </h1>
        <p className="text-on-surface-variant mt-1">
          {assets === null ? 'Carregando…' : `${sites.length} apps · ${ativos} ativos`} · cada ecossistema tem banco, auth e deploy próprios{' '}
          <span className="font-mono text-muted">(ADR-0029)</span>
        </p>
      </div>

      {assets === null && <div className="text-sm text-muted">Carregando ecossistemas do banco…</div>}
      {assets !== null && sites.length === 0 && (
        <div className="text-sm text-muted">Nenhum app registrado em ativos digitais.</div>
      )}

      {orderedKeys.map(key => (
        <div key={key} className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant px-1">
            {OWNER_LABEL[key] || key}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups[key].map(s => {
              const st = STATUS_STYLE[s.status] || STATUS_STYLE.registrado_sem_uso;
              const clickable = s.status === 'ativo' && !!s.valor && s.valor.startsWith('http');
              return (
                <a
                  key={s.id || s.valor}
                  href={clickable ? s.valor! : undefined}
                  target={clickable ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className={`block border border-outline/10 bg-surface-low p-4 transition-all duration-150 ${
                    clickable ? 'hover:border-secondary/40 hover:bg-secondary/15' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-muted shrink-0" /> {s.rotulo}
                      </div>
                      <div className="text-xs font-mono text-muted truncate mt-1">{s.valor}</div>
                    </div>
                    {clickable && <ExternalLink className="w-3.5 h-3.5 text-muted shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border ${st.cls}`}>
                      {st.label}
                    </span>
                    {s.provider && <span className="text-[9px] font-mono text-muted">{s.provider}</span>}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ))}

      <div className="text-[11px] text-muted border-t border-outline/10 pt-4">
        Fonte: <span className="font-mono">company.digital_assets</span> (vivo). Monitoramento de uptime/health real
        via UptimeRobot é pendência (R-016).
      </div>
    </div>
  );
}
