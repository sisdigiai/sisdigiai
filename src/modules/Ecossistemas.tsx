import { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { companyStore } from '../lib/companyStore';
import { inventarioStore, type BlogAudiencia } from '../lib/inventarioStore';
import type { DigitalAsset } from '../lib/supabase';
import { PRODUTO_BY_SLUG, type ProdutoInfo } from './Portfolio';

// Rótulo amigável por owner_product (agrupa os apps por ecossistema).
const OWNER_LABEL: Record<string, string> = {
  clearix: 'Ecossistema Clearix',
  digiai: 'DIGIAI (núcleo)',
  osi: 'Ótica Sem Improviso',
  polapetit: 'Polapetit',
  pulso: 'Pulso Control',
  nexus: 'Nexus',
  lumina: 'Lumina',
  easyidiomas: 'Easy Idiomas',
  niposchool: 'Nipo School',
  qualfoto: 'Qual a Foto',
};

// owner_product (digital_assets) → slug do índice PRODUTOS (verdade única do Portfólio)
const OWNER_TO_SLUG: Record<string, string> = {
  clearix: 'clearix', digiai: 'digiai-app', osi: 'osi', polapetit: 'polapetit',
  pulso: 'pulso', nexus: 'nexus', lumina: 'lumina',
  easyidiomas: 'easy-idiomas', niposchool: 'nipo-school', qualfoto: 'qual-a-foto',
};

function produtoDoOwner(owner: string): ProdutoInfo | undefined {
  return PRODUTO_BY_SLUG[OWNER_TO_SLUG[owner] ?? owner];
}

function LogoTile({ p, size = 'sm' }: { p?: ProdutoInfo; size?: 'sm' | 'md' }) {
  const box = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  if (!p) return <Globe className="w-3.5 h-3.5 text-muted shrink-0" />;
  return (
    <span className={`${box} shrink-0 flex items-center justify-center overflow-hidden`} style={{ background: p.badge ? 'transparent' : p.cor }}>
      {p.logo
        ? <img src={p.logo} alt="" className={p.badge ? `${box} object-cover` : 'w-[70%] h-[70%] object-contain'} style={p.badge ? undefined : { filter: 'brightness(0) invert(1)' }} />
        : <span className="text-[9px] font-mono font-bold text-white">{p.mono}</span>}
    </span>
  );
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  ativo:              { label: 'Ativo',       cls: 'bg-success/15 text-success border-success/30' },
  a_registrar:        { label: 'A registrar', cls: 'bg-warning/15 text-warning border-warning/30' },
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
    <div>
      <PageHeader
        eyebrow="Mapa de apps"
        title="Ecossistemas"
        subtitle={
          <>
            {assets === null ? 'Carregando…' : `${sites.length} apps · ${ativos} ativos`} · cada ecossistema tem banco, auth e deploy próprios{' '}
            <span className="font-mono text-muted">(ADR-0029)</span>
          </>
        }
      />
      <BlocoBlogs />

      <div className="space-y-6">
      {assets === null && <div className="text-sm text-muted">Carregando ecossistemas do banco…</div>}
      {assets !== null && sites.length === 0 && (
        <div className="text-sm text-muted">Nenhum app registrado em ativos digitais.</div>
      )}

      {orderedKeys.map(key => (
        <div key={key} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <LogoTile p={produtoDoOwner(key)} size="md" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
              {OWNER_LABEL[key] || key}
            </span>
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
                        <LogoTile p={produtoDoOwner(key)} /> {s.rotulo}
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
    </div>
  );
}

// Audiência dos 5 blogs do Ecoax (migration 161). O Ecoax é dono do dado; aqui é retrato com data.
// Gente e máquina aparecem separadas de propósito: a rede tem 277 acessos brutos e 2 de pessoa —
// juntar os dois números numa coluna só seria inventar plateia.
function BlocoBlogs() {
  const [linhas, setLinhas] = useState<BlogAudiencia[] | null>(null);
  useEffect(() => { inventarioStore.blogsAudiencia().then(setLinhas).catch(() => setLinhas([])); }, []);
  if (!linhas || linhas.length === 0) return null;

  const gente = linhas.reduce((n, l) => n + l.eventos_humanos, 0);
  const maquina = linhas.reduce((n, l) => n + l.eventos_rajada + l.eventos_internos, 0);
  const medido = linhas[0].medido_em;
  const velho = linhas.some((l) => l.retrato_velho);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Blogs regionais · Ecoax</span>
        <span className="h-px flex-1 bg-outline/15" />
        <span className={`font-mono text-[9px] uppercase tracking-wider ${velho ? 'text-warning' : 'text-muted'}`}>
          retrato de {new Date(medido).toLocaleDateString('pt-BR')}{velho ? ' · velho' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <div className="border border-outline/15 bg-surface-container p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Leitor de verdade</div>
          <div className={`font-serif text-3xl font-semibold tabular-nums mt-1 ${gente ? 'text-on-surface' : 'text-warning'}`}>{gente}</div>
          <div className="text-[11px] text-muted mt-0.5">eventos fora de rajada, desde 20/08</div>
        </div>
        <div className="border border-outline/15 bg-surface-container p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Máquina</div>
          <div className="font-serif text-3xl font-semibold tabular-nums mt-1 text-muted">{maquina}</div>
          <div className="text-[11px] text-muted mt-0.5">rajada nos 5 blogs + interno declarado</div>
        </div>
        <div className="border border-outline/15 bg-surface-container p-4 col-span-2 md:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Blogs no ar</div>
          <div className="font-serif text-3xl font-semibold tabular-nums mt-1 text-on-surface">{linhas.length}</div>
          <div className="text-[11px] text-muted mt-0.5">medição própria, sem pixel de terceiro</div>
        </div>
      </div>

      <div className="border border-outline/15 bg-surface-container">
        {linhas.map((l) => (
          <div key={l.blog_slug} className="flex items-center gap-3 px-3 py-2 border-b border-outline/10 last:border-b-0">
            <span className="flex-1 min-w-0 font-serif text-sm text-on-surface truncate">{l.nome}</span>
            <span className="font-mono text-[10px] text-muted">{l.page_views} brutos</span>
            <span className={`font-mono text-[11px] w-24 text-right ${l.eventos_humanos ? 'text-success' : 'text-warning'}`}>
              {l.eventos_humanos} de gente
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-2 leading-relaxed">
        Medido no banco do Ecoax por <code className="font-mono">scripts/espelhar-audiencia-blogs.mjs</code>.
        Rajada = os 5 blogs abrindo a home no mesmo minuto, que é assinatura de verificador automático.
        Só o agregado atravessa: nada de leitor sai do Ecoax.
      </p>
    </section>
  );
}
