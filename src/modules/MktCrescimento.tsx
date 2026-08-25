import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Bookmark, Share2, RefreshCw, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { espelhoMotores, type PulsoDia, type LimelightDia, type BlogDia } from '../lib/espelhoMotores';

// Crescimento (analytics de redes) — MOVIDO do app MKT em 2026-08-25.
// A tela sempre leu o banco do digiai (schema mkt); só a UI morava no app errado.
// Divisão canônica: digiai = cérebro (dados/analytics), mkt = mãos (motor de disparo).
// Fontes: mkt.publications + mkt.content_performance + mkt.audiencia_diaria (censo 7h)
// + mkt.brands. O botão "sincronizar" invoca a edge `sync-metricas` (mesmo projeto).

type Brand = { id: string; code: string; name: string; accent_hex: string | null; logo_url: string | null };
type Pub = { id: string; brand_id: string; platform: string; url: string | null; published_at: string };
type Perf = {
  publication_id: string; brand_id: string; gatilho: string | null; formato: string | null;
  engajamento: number | null; alcance: number | null; salvamentos: number | null; compartilhamentos: number | null;
};
type Aud = { brand_id: string; platform: string; seguidores: number; dia: string };
type Serie = { id: string; label: string; color: string; logo: string | null; pts: number[]; atual: number };

const RANGES = [{ k: 7, label: '7 dias' }, { k: 30, label: '30 dias' }, { k: 90, label: '90 dias' }];
const REDES = [
  { k: '', label: 'todas' }, { k: 'instagram', label: 'Instagram' }, { k: 'facebook', label: 'Facebook' },
  { k: 'linkedin', label: 'LinkedIn' }, { k: 'tiktok', label: 'TikTok' },
];
const ALL_NETS = ['instagram', 'facebook', 'linkedin', 'tiktok'];
const METRICAS = [
  { k: 'seguidores', label: 'seguidores' }, { k: 'engajamento', label: 'engajamento' }, { k: 'alcance', label: 'alcance' },
] as const;
type MetricaK = typeof METRICAS[number]['k'];

const nf = (n: number) => n.toLocaleString('pt-BR');
const platName = (p: string) => ({ instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube' }[p] ?? p);
const fmtDM = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const COR_OK = 'var(--color-action)';
const COR_WARN = 'var(--color-warning)';
const COR_DANGER = 'var(--color-danger)';
const COR_SEC = 'var(--color-secondary)';

export default function MktCrescimento() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [perf, setPerf] = useState<Perf[]>([]);
  const [aud, setAud] = useState<Aud[]>([]);
  const [pulsoDias, setPulsoDias] = useState<PulsoDia[]>([]);
  const [limeDias, setLimeDias] = useState<LimelightDia[]>([]);
  const [blogDias, setBlogDias] = useState<BlogDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [fMarca, setFMarca] = useState('');
  const [fRede, setFRede] = useState('');
  const [fDias, setFDias] = useState(30);
  const [fConteudo, setFConteudo] = useState('');
  const [metrica, setMetrica] = useState<MetricaK>('seguidores');

  async function load() {
    setLoading(true);
    const corte = new Date(Date.now() - 90 * 864e5).toISOString();
    const [b, p, cp, ad, pd, ld, bd] = await Promise.all([
      supabase.schema('mkt').from('brands').select('id, code, name, accent_hex, logo_url').order('name'),
      supabase.schema('mkt').from('publications').select('id, brand_id, platform, url, published_at').gte('published_at', corte).order('published_at', { ascending: false }).limit(1000),
      supabase.schema('mkt').from('content_performance').select('publication_id, brand_id, gatilho, formato, engajamento, alcance, salvamentos, compartilhamentos'),
      supabase.schema('mkt').from('audiencia_diaria').select('brand_id, platform, seguidores, dia').order('dia'),
      espelhoMotores.pulsoDias(),
      espelhoMotores.limelightDias(),
      espelhoMotores.blogsDias(),
    ]);
    setBrands((b.data ?? []) as Brand[]);
    setPubs((p.data ?? []) as Pub[]);
    setPerf((cp.data ?? []) as Perf[]);
    setAud((ad.data ?? []) as Aud[]);
    setPulsoDias(pd);
    setLimeDias(ld);
    setBlogDias(bd);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function sincronizar() {
    setSincronizando(true);
    try { await supabase.functions.invoke('sync-metricas', { body: {} }); await load(); } finally { setSincronizando(false); }
  }

  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const brandOf = (id: string) => brandById.get(id);
  const accent = (id: string) => brandOf(id)?.accent_hex || COR_SEC;

  // ---- filtros ----
  const corteISO = new Date(Date.now() - fDias * 864e5).toISOString();
  const corteDia = corteISO.slice(0, 10);
  const pubsF = useMemo(() => pubs.filter((p) =>
    p.published_at >= corteISO &&
    (!fMarca || brandOf(p.brand_id)?.code === fMarca) &&
    (!fRede || p.platform === fRede)), [pubs, corteISO, fMarca, fRede, brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const perfByPub = useMemo(() => new Map(perf.map((x) => [x.publication_id, x])), [perf]);
  const linhas = useMemo(() => pubsF.map((p) => ({ p, m: perfByPub.get(p.id) }))
    .filter((l) => !fConteudo || l.m?.gatilho === fConteudo || l.m?.formato === fConteudo), [pubsF, perfByPub, fConteudo]);

  const medidos = linhas.filter((l) => l.m);
  const engTotal = medidos.reduce((s, l) => s + (l.m!.engajamento || 0), 0);
  const alcanceTotal = medidos.reduce((s, l) => s + (l.m!.alcance || 0), 0);
  const savesTotal = medidos.reduce((s, l) => s + (l.m!.salvamentos || 0), 0);
  const sharesTotal = medidos.reduce((s, l) => s + (l.m!.compartilhamentos || 0), 0);
  const temAlcance = medidos.some((l) => l.m!.alcance != null);
  const taxaEng = temAlcance && alcanceTotal > 0 ? (engTotal / alcanceTotal * 100) : null;
  const engMed = medidos.length ? engTotal / medidos.length : 0;

  const audF = useMemo(() => aud.filter((a) => (!fRede || a.platform === fRede) && (!fMarca || brandOf(a.brand_id)?.code === fMarca)), [aud, fRede, fMarca, brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const segAtual = useMemo(() => {
    const porConta = new Map<string, Aud>();
    for (const a of audF) porConta.set(`${a.brand_id}:${a.platform}`, a); // ordenado asc → fica o último dia
    return [...porConta.values()].reduce((s, a) => s + a.seguidores, 0);
  }, [audF]);
  const segDelta = useMemo(() => {
    const chaves = new Set(audF.map((a) => `${a.brand_id}:${a.platform}`));
    let delta = 0; let temBase = false;
    for (const k of chaves) {
      const dentro = audF.filter((a) => `${a.brand_id}:${a.platform}` === k && a.dia >= corteDia);
      if (dentro.length >= 2) { delta += dentro[dentro.length - 1].seguidores - dentro[0].seguidores; temBase = true; }
    }
    return temBase ? delta : null;
  }, [audF, corteDia]);

  // saúde da coleta
  const ultimoCenso = useMemo(() => aud.reduce<string | null>((m, a) => (m == null || a.dia > m ? a.dia : m), null), [aud]);
  const contasMedidas = useMemo(() => new Set(audF.map((a) => `${a.brand_id}:${a.platform}`)).size, [audF]);

  // eixo de dias do gráfico (dentro do período)
  const diasEixo = useMemo(() => [...new Set(audF.filter((a) => a.dia >= corteDia).map((a) => a.dia))].sort(), [audF, corteDia]);

  // série da métrica escolhida, por marca, sobre diasEixo
  const seriesMetrica = useMemo<Serie[]>(() => {
    const out: Serie[] = [];
    for (const b of brands) {
      if (fMarca && b.code !== fMarca) continue;
      let pts: number[];
      if (metrica === 'seguidores') {
        const contas = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
        pts = diasEixo.map((d) => contas.reduce((s, plat) => {
          const ate = audF.filter((a) => a.brand_id === b.id && a.platform === plat && a.dia <= d);
          return s + (ate.length ? ate[ate.length - 1].seguidores : 0);
        }, 0));
      } else {
        pts = diasEixo.map((d) => linhas
          .filter((l) => l.p.brand_id === b.id && l.p.published_at.slice(0, 10) === d)
          .reduce((s, l) => s + (metrica === 'engajamento' ? (l.m?.engajamento || 0) : (l.m?.alcance || 0)), 0));
      }
      if (pts.every((v) => v === 0)) continue;
      out.push({ id: b.id, label: b.name, color: b.accent_hex || COR_SEC, logo: b.logo_url, pts, atual: pts.length ? pts[pts.length - 1] : 0 });
    }
    return out;
  }, [brands, audF, linhas, diasEixo, metrica, fMarca]);

  // audiência por marca (cards spark) — série cumulativa completa (histórico)
  const seriePorMarca = useMemo(() => {
    const out = new Map<string, number[]>();
    const dias = [...new Set(audF.map((a) => a.dia))].sort();
    for (const b of brands) {
      const contas = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
      out.set(b.id, dias.map((d) => contas.reduce((s, plat) => {
        const ate = audF.filter((a) => a.brand_id === b.id && a.platform === plat && a.dia <= d);
        return s + (ate.length ? ate[ate.length - 1].seguidores : 0);
      }, 0)));
    }
    return out;
  }, [audF, brands]);

  // crescimento por marca (independe da métrica selecionada) — base das sacadas
  const crescimentoMarca = useMemo(() => brands.map((b) => {
    const contas = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
    const dias = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.dia))].sort();
    const val = (d: string) => contas.reduce((s, p) => {
      const ate = audF.filter((a) => a.brand_id === b.id && a.platform === p && a.dia <= d);
      return s + (ate.length ? ate[ate.length - 1].seguidores : 0);
    }, 0);
    if (dias.length < 2) return { b, delta: 0, pct: 0, atual: dias.length ? val(dias[0]) : 0 };
    const first = val(dias[0]); const last = val(dias[dias.length - 1]);
    return { b, delta: last - first, pct: first > 0 ? (last - first) / first * 100 : 0, atual: last };
  }).filter((x) => x.atual > 0).sort((a, b) => b.pct - a.pct), [brands, audF]);

  // comparativo marca × rede
  const matriz = useMemo(() => brands.filter((b) => !fMarca || b.code === fMarca).map((b) => ({
    b,
    cells: ALL_NETS.filter((n) => !fRede || n === fRede).map((net) => {
      const serie = audF.filter((a) => a.brand_id === b.id && a.platform === net).sort((x, y) => x.dia.localeCompare(y.dia));
      if (!serie.length) return { net, seg: null as number | null, delta: null as number | null };
      const seg = serie[serie.length - 1].seguidores;
      const base = serie.find((a) => a.dia >= corteDia);
      return { net, seg, delta: base ? seg - base.seguidores : null };
    }),
  })), [brands, audF, fMarca, fRede, corteDia]);
  const redesMatriz = ALL_NETS.filter((n) => !fRede || n === fRede);

  // ranking de conteúdo por formato / gatilho
  const rankBy = (key: 'formato' | 'gatilho') => {
    const m = new Map<string, { n: number; eng: number; alc: number; alcN: number }>();
    for (const l of medidos) {
      const k = l.m![key]; if (!k) continue;
      const cur = m.get(k) ?? { n: 0, eng: 0, alc: 0, alcN: 0 };
      cur.n++; cur.eng += l.m!.engajamento || 0;
      const alc = l.m!.alcance;
      if (alc != null) { cur.alc += alc; cur.alcN++; }
      m.set(k, cur);
    }
    return [...m.entries()].map(([k, v]) => ({ k, n: v.n, engMed: v.eng / v.n, taxa: v.alcN > 0 && v.alc > 0 ? v.eng / v.alc * 100 : null }))
      .sort((a, b) => b.engMed - a.engMed);
  };
  const porFormato = useMemo(() => rankBy('formato'), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const porGatilho = useMemo(() => rankBy('gatilho'), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  // melhor janela de horário
  const porHora = useMemo(() => {
    const faixas = [{ k: 'manhã · 6–12h', lo: 6, hi: 12 }, { k: 'tarde · 12–18h', lo: 12, hi: 18 }, { k: 'noite · 18–24h', lo: 18, hi: 24 }, { k: 'madrugada · 0–6h', lo: 0, hi: 6 }];
    const buck = faixas.map((f) => ({ ...f, n: 0, eng: 0 }));
    for (const l of medidos) {
      const h = new Date(l.p.published_at).getHours();
      const b = buck.find((x) => h >= x.lo && h < x.hi);
      if (b) { b.n++; b.eng += l.m!.engajamento || 0; }
    }
    const list = buck.filter((b) => b.n >= 2).map((b) => ({ faixa: b.k, n: b.n, engMed: b.eng / b.n })).sort((a, b) => b.engMed - a.engMed);
    return { list, best: list[0] || null };
  }, [linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Motores externos (Pulso/Limelight/Blogs) sob os MESMOS filtros de periodo/rede/marca.
  // Mapeamento de marca: Pulso -> marca PULSO, Limelight -> Mello, Blogs -> DIGIAI.
  const codePulso = useMemo(() => brands.find((b) => /pulso/i.test(b.name))?.code ?? '__pulso', [brands]);
  const codeMello = useMemo(() => brands.find((b) => /mello/i.test(b.name))?.code ?? '__mello', [brands]);
  const codeDigiai = useMemo(() => brands.find((b) => /^digiai$/i.test(b.name))?.code ?? '__digiai', [brands]);
  const pulsoF = useMemo(() => pulsoDias.filter((d) => d.dia >= corteDia && (!fRede || d.plataforma === fRede)), [pulsoDias, corteDia, fRede]);
  const limeF = useMemo(() => limeDias.filter((d) => d.dia >= corteDia && (!fRede || d.plataforma === fRede)), [limeDias, corteDia, fRede]);
  const blogF = useMemo(() => blogDias.filter((d) => d.dia >= corteDia), [blogDias, corteDia]);
  const pulsoTot = useMemo(() => ({
    views: pulsoF.reduce((a, d) => a + (d.views || 0), 0),
    pubs: pulsoF.reduce((a, d) => a + (d.publicacoes || 0), 0),
  }), [pulsoF]);
  const limeSegAtual = useMemo(() => {
    const porPlat = new Map<string, LimelightDia>();
    for (const d of limeDias.filter((x) => !fRede || x.plataforma === fRede)) {
      const cur = porPlat.get(d.plataforma);
      if (!cur || d.dia > cur.dia || (d.dia === cur.dia && (d.seguidores ?? 0) > (cur.seguidores ?? 0))) porPlat.set(d.plataforma, d);
    }
    return [...porPlat.values()].reduce((a, d) => a + (d.seguidores ?? 0), 0);
  }, [limeDias, fRede]);
  const blogTot = useMemo(() => blogF.reduce((a, d) => a + (d.leituras || 0), 0), [blogF]);
  const serieDe = (rows: { dia: string; v: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.dia, (m.get(r.dia) ?? 0) + r.v);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const pulsoSerie = useMemo(() => serieDe(pulsoF.map((d) => ({ dia: d.dia, v: d.views || 0 }))), [pulsoF]); // eslint-disable-line react-hooks/exhaustive-deps
  const blogSerie = useMemo(() => serieDe(blogF.map((d) => ({ dia: d.dia, v: d.leituras || 0 }))), [blogF]); // eslint-disable-line react-hooks/exhaustive-deps
  const mostrarPulso = (!fMarca || fMarca === codePulso) && pulsoDias.length > 0;
  const mostrarLime = (!fMarca || fMarca === codeMello) && limeDias.length > 0;
  const mostrarBlogs = (!fMarca || fMarca === codeDigiai) && !fRede && blogDias.length > 0;

  // sacadas (insights automáticos)
  const sacadas = useMemo(() => {
    const out: { icon: string; color: string; titulo: string; valor: string; sub: string }[] = [];
    if (porFormato.length && porFormato[0].n >= 2 && engMed > 0) {
      const f = porFormato[0]; const mult = f.engMed / engMed;
      if (mult >= 1.15) out.push({ icon: '▲', color: COR_OK, titulo: `${f.k} é o formato que mais rende`, valor: `${mult.toFixed(1)}×`, sub: `vs média · ${f.n} posts` });
    }
    if (porGatilho.length && porGatilho[0].n >= 2) {
      const g = porGatilho[0];
      out.push({ icon: '✦', color: COR_SEC, titulo: `gatilho premiado: ${g.k.length > 30 ? g.k.slice(0, 30) + '…' : g.k}`, valor: nf(Math.round(g.engMed)), sub: `eng médio · ${g.n} posts` });
    }
    if (porHora.best) out.push({ icon: '◷', color: COR_WARN, titulo: `melhor janela: ${porHora.best.faixa}`, valor: nf(Math.round(porHora.best.engMed)), sub: `eng médio · ${porHora.best.n} posts` });
    if (crescimentoMarca.length && crescimentoMarca[0].pct > 0 && !fMarca) {
      const c = crescimentoMarca[0];
      out.push({ icon: '↗', color: c.b.accent_hex || COR_SEC, titulo: `${c.b.name} lidera o crescimento`, valor: `+${c.pct.toFixed(1)}%`, sub: `${c.delta >= 0 ? '+' : ''}${nf(c.delta)} seguidores no período` });
    }
    if (sharesTotal > 0) {
      const top = medidos.filter((l) => (l.m!.compartilhamentos || 0) > 0).sort((a, b) => (b.m!.compartilhamentos || 0) - (a.m!.compartilhamentos || 0))[0];
      if (top) out.push({ icon: '⇪', color: COR_OK, titulo: `mais compartilhado (anúncio grátis)`, valor: nf(top.m!.compartilhamentos || 0), sub: `${brandOf(top.p.brand_id)?.name ?? ''} · ${platName(top.p.platform)}` });
    }
    if (taxaEng != null) out.push({ icon: '◈', color: COR_SEC, titulo: `taxa de engajamento do recorte`, valor: `${taxaEng.toFixed(1)}%`, sub: `${nf(engTotal)} eng / ${nf(alcanceTotal)} alcance` });
    return out;
  }, [porFormato, porGatilho, porHora, crescimentoMarca, sharesTotal, taxaEng, engMed, fMarca]); // eslint-disable-line react-hooks/exhaustive-deps

  const conteudos = useMemo(() => {
    const g = new Set<string>(); perf.forEach((x) => { if (x.gatilho) g.add(x.gatilho); if (x.formato) g.add(x.formato); });
    return [...g].sort();
  }, [perf]);

  const chartMode: 'line' | 'bar' = metrica === 'seguidores' ? 'line' : 'bar';

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-1">
        <BarChart3 className="w-5 h-5 text-secondary" />
        <h1 className="font-serif text-2xl font-semibold text-on-surface">Crescimento</h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted hidden sm:inline">redes · schema mkt</span>
        <button onClick={sincronizar} disabled={sincronizando}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 border border-outline/30 text-on-surface-variant hover:bg-surface-highest disabled:opacity-50">
          {sincronizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} sincronizar agora
        </button>
      </div>
      <p className="text-on-surface-variant text-sm mb-5">Métricas reais das redes — seguidores, alcance e o que o público premia. Coleta diária 7h. O motor de postagem vive no MKT; a leitura vive aqui.</p>

      {/* filtros */}
      <div className="border border-outline/15 bg-surface-container px-3.5 py-3 mb-5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted mr-1 shrink-0">marca</span>
          <Chip on={fMarca === ''} onClick={() => setFMarca('')}>todas</Chip>
          {brands.map((b) => <Chip key={b.id} on={fMarca === b.code} onClick={() => setFMarca(fMarca === b.code ? '' : b.code)} cor={b.accent_hex}>{b.name}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted mr-1 shrink-0">redes</span>
          {REDES.map((r) => <Chip key={r.k} on={fRede === r.k} onClick={() => setFRede(r.k)}>{r.label}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted mr-1 shrink-0">período</span>
          {RANGES.map((r) => <Chip key={r.k} on={fDias === r.k} onClick={() => setFDias(r.k)}>{r.label}</Chip>)}
        </div>
        {conteudos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted mr-1 shrink-0">conteúdo</span>
            <Chip on={fConteudo === ''} onClick={() => setFConteudo('')}>todos</Chip>
            {conteudos.slice(0, 10).map((c) => <Chip key={c} on={fConteudo === c} onClick={() => setFConteudo(fConteudo === c ? '' : c)}>{c.length > 26 ? c.slice(0, 26) + '…' : c}</Chip>)}
          </div>
        )}
      </div>

      {loading ? <div className="py-20 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin inline" /></div> : (
        <>
          {/* Dado velho engana: coleta parada +3 dias é AVISO no topo, não rodapé discreto.
              (lição da parada de 39 dias 08/07→16/08 no MKT) */}
          {(() => {
            const dias = ultimoCenso ? Math.floor((Date.now() - new Date(ultimoCenso + 'T12:00:00').getTime()) / 864e5) : null;
            if (dias === null || dias < 3) return null;
            const cor = dias >= 7 ? COR_DANGER : COR_WARN;
            return (
              <div className="border px-3 py-2.5 mb-3 bg-surface-container" style={{ borderColor: cor }}>
                <div className="text-[13px]" style={{ color: cor }}>
                  ⚠ Os números de audiência abaixo são de <strong>{fmtDM(ultimoCenso!)}</strong> — {dias} dias atrás.
                </div>
                <div className="text-[12px] text-on-surface-variant mt-1">
                  A coleta (<span className="font-mono">sync-metricas</span>) não roda desde então. Engajamento e alcance por post continuam válidos; só a curva de seguidores está congelada.
                </div>
              </div>
            );
          })()}

          {/* ── HUD telemetria ── */}
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-secondary">●</span> crescimento
            <span>▸</span> coleta 7h
            <span>▸</span> último censo {ultimoCenso ? fmtDM(ultimoCenso) : '—'}
            <span>▸</span> {contasMedidas} contas
            <span>▸</span> alcance {temAlcance ? <span style={{ color: COR_OK }}>ok</span> : <span style={{ color: COR_WARN }}>🔒 permissão Meta</span>}
          </div>
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Kpi icon={<Users className="w-4 h-4" />} label="seguidores (agora)" value={nf(segAtual)} sub={segDelta != null ? (segDelta >= 0 ? `+${nf(segDelta)} no período` : `${nf(segDelta)} no período`) : 'curva forma amanhã'} glow={COR_SEC} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="engajamento" value={nf(engTotal)} sub={`${medidos.length} posts · média ${nf(Math.round(engMed))}`} glow={COR_OK} />
            <Kpi icon={<Eye className="w-4 h-4" />} label="alcance" value={temAlcance ? nf(alcanceTotal) : '🔒'} sub={temAlcance ? (taxaEng != null ? `taxa ${taxaEng.toFixed(1)}%` : '') : 'aguarda permissão do app Meta'} glow={COR_WARN} />
            <Kpi icon={<Bookmark className="w-4 h-4" />} label="salvamentos" value={temAlcance ? nf(savesTotal) : '🔒'} sub="o que o público guarda" glow={COR_SEC} />
            <Kpi icon={<Share2 className="w-4 h-4" />} label="compartilhamentos" value={sharesTotal > 0 ? nf(sharesTotal) : (temAlcance ? '0' : '🔒')} sub="anúncio grátis" glow={COR_SEC} />
          </section>

          {/* ── sacadas ── */}
          {sacadas.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-2.5"><Sparkles className="w-4 h-4 text-secondary" /><h2 className="text-sm text-on-surface-variant">sacadas do recorte</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted">o que os dados contam</span></div>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
                {sacadas.map((s, i) => (
                  <div key={i} className="border border-outline/15 bg-surface-container px-4 py-3.5 flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5 shrink-0" style={{ color: s.color }}>{s.icon}</span>
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold font-mono tabular-nums leading-none mb-1" style={{ color: s.color }}>{s.valor}</div>
                      <div className="text-[13px] text-on-surface leading-snug">{s.titulo}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* ── evolução no tempo ── */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <TrendingUp className="w-4 h-4 text-secondary" /><h2 className="text-sm text-on-surface-variant">evolução no tempo</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{diasEixo.length} dias no eixo</span>
            <div className="ml-auto flex items-center gap-1.5">
              {METRICAS.map((m) => <Chip key={m.k} on={metrica === m.k} onClick={() => setMetrica(m.k)}>{m.label}</Chip>)}
            </div>
          </div>
          <section className="border border-outline/15 bg-surface-container px-4 pt-4 pb-3 mb-3">
            <TrendChart series={seriesMetrica} dias={diasEixo} mode={chartMode} />
          </section>
          {seriesMetrica.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {seriesMetrica.slice().sort((a, b) => b.atual - a.atual).map((s) => (
                <div key={s.id} className="border border-outline/15 bg-surface-container inline-flex items-center gap-2 px-2.5 py-1.5">
                  {s.logo ? <img src={s.logo} alt="" className="w-4 h-4 object-cover" /> : <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />}
                  <span className="text-[12px] text-on-surface-variant">{s.label}</span>
                  <span className="font-mono tabular-nums text-[13px]" style={{ color: s.color }}>{nf(s.atual)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── comparativo marca × rede ── */}
          <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">comparativo marca × rede</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted">seguidores agora · Δ no período</span></div>
          <section className="border border-outline/15 bg-surface-container overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/15">
                  <th className="text-left font-normal px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted">marca</th>
                  {redesMatriz.map((n) => <th key={n} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">{platName(n)}</th>)}
                </tr>
              </thead>
              <tbody>
                {matriz.map(({ b, cells }) => (
                  <tr key={b.id} className="border-b border-outline/10 hover:bg-surface-highest/50">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        {b.logo_url && <img src={b.logo_url} alt="" className="w-5 h-5 object-cover" />}
                        <span className="truncate text-on-surface">{b.name}</span>
                      </span>
                    </td>
                    {cells.map((c) => (
                      <td key={c.net} className="px-3 py-2.5 text-center">
                        {c.seg == null ? <span className="text-muted">—</span> : (
                          <div className="leading-tight">
                            <div className="font-mono tabular-nums" style={{ color: b.accent_hex || undefined }}>{nf(c.seg)}</div>
                            {c.delta != null && c.delta !== 0 && <div className="font-mono tabular-nums text-[10px]" style={{ color: c.delta >= 0 ? COR_OK : COR_DANGER }}>{c.delta >= 0 ? '+' : ''}{nf(c.delta)}</div>}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {matriz.length === 0 && <tr><td colSpan={redesMatriz.length + 1} className="px-4 py-8 text-center text-muted">sem contas no recorte.</td></tr>}
              </tbody>
            </table>
          </section>

          {/* ── audiência por marca (spark) ── */}
          <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">audiência por marca</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted">censo diário 7h · redes do filtro</span></div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {brands.map((b) => {
              const serie = (seriePorMarca.get(b.id) ?? []).filter((v) => v > 0);
              const atual = serie.length ? serie[serie.length - 1] : 0;
              const delta = serie.length >= 2 ? atual - serie[0] : null;
              if (atual === 0 && fMarca !== b.code) return null;
              const c = b.accent_hex || COR_SEC;
              return (
                <div key={b.id} className="border border-outline/15 bg-surface-container px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    {b.logo_url ? <img src={b.logo_url} alt="" className="w-6 h-6 object-cover" /> : <span className="w-6 h-6 flex items-center justify-center text-[10px]" style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c }}>{b.name[0]}</span>}
                    <span className="text-sm flex-1 truncate text-on-surface">{b.name}</span>
                    {delta != null && <span className="text-[11px] font-mono tabular-nums" style={{ color: delta >= 0 ? COR_OK : COR_DANGER }}>{delta >= 0 ? '+' : ''}{delta}</span>}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-2xl font-semibold font-mono tabular-nums" style={{ color: c }}>{nf(atual)}</div>
                    <Spark serie={serie} color={c} />
                  </div>
                  <div className="text-[10px] text-muted mt-1">{serie.length <= 1 ? 'baseline de hoje — a curva nasce amanhã' : `${serie.length} dias de série`}</div>
                </div>
              );
            })}
          </section>

          {/* ── motores externos (mesmos filtros) ── */}
          {(mostrarPulso || mostrarLime || mostrarBlogs) && (
            <>
              <div className="flex items-center gap-2 mb-2.5"><h2 className="text-sm text-on-surface-variant">motores externos no recorte</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted">Pulso · Limelight (Mello) · Blogs — mesmos filtros</span></div>
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
                {mostrarPulso && (
                  <MotorCard titulo="Pulso · canais faceless" cor={COR_SEC}
                    headline={`${nf(pulsoTot.views)} views`} sub={`${pulsoTot.pubs} publicações no período · por data de publicação`}
                    serie={pulsoSerie} rotuloSerie="views/dia de publicação" />
                )}
                {mostrarLime && (
                  <MotorCard titulo="Limelight · fábrica Mello" cor={COR_OK}
                    headline={`${nf(limeSegAtual)} seguidores`} sub={`censo diário próprio${fRede ? ` · ${platName(fRede)}` : ' · todas as redes da fábrica'}`}
                    serie={serieDe(limeF.filter((d) => d.seguidores != null).map((d) => ({ dia: d.dia, v: d.seguidores ?? 0 })))} rotuloSerie="seguidores somados/dia" />
                )}
                {mostrarBlogs && (
                  <MotorCard titulo="Blogs regionais · 5 sites" cor={COR_WARN}
                    headline={`${nf(blogTot)} leituras`} sub="first-party, zero PII · medição desde 20/08"
                    serie={blogSerie} rotuloSerie="leituras/dia" />
                )}
              </section>
            </>
          )}

          {/* ── ranking de conteúdo ── */}
          <div className="flex items-center gap-2 mb-2.5"><h2 className="text-sm text-on-surface-variant">o que rende por tipo de conteúdo</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted">eng médio · taxa quando há alcance</span></div>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            <RankPanel titulo="por formato" itens={porFormato} accent={COR_SEC} />
            <RankPanel titulo="por gatilho" itens={porGatilho} accent={COR_OK} />
          </section>
          {porHora.list.length > 0 && (
            <section className="border border-outline/15 bg-surface-container px-4 py-3.5 mb-8">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">janelas de horário · eng médio por post</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {porHora.list.map((h) => {
                  const top = porHora.best && h.faixa === porHora.best.faixa;
                  return (
                    <div key={h.faixa} className="px-3 py-2.5 border" style={{ borderColor: top ? COR_WARN : 'color-mix(in srgb, var(--color-outline, #888) 30%, transparent)' }}>
                      <div className="font-mono tabular-nums text-lg" style={{ color: top ? COR_WARN : undefined }}>{nf(Math.round(h.engMed))}</div>
                      <div className="text-[11px] text-on-surface-variant">{h.faixa}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{h.n} posts</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── top publicações ── */}
          <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">o que o público premiou</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted">{linhas.length} publicações no recorte</span></div>
          <section className="border border-outline/15 bg-surface-container overflow-hidden mb-8">
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted border-b border-outline/15">
              <span>rede</span><span>marca · quando</span><span className="text-right">eng</span><span className="text-right">alcance</span><span className="text-right">saves</span><span></span>
            </div>
            {linhas.slice().sort((a, b2) => (b2.m?.engajamento ?? -1) - (a.m?.engajamento ?? -1)).slice(0, 12).map(({ p, m }) => (
              <div key={p.id} className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center px-4 py-2.5 border-b border-outline/10 hover:bg-surface-highest/50 text-sm">
                <span className="w-6 h-6 flex items-center justify-center font-mono text-[9px] uppercase" style={{ background: `color-mix(in srgb, ${accent(p.brand_id)} 13%, transparent)`, color: accent(p.brand_id) }}>{platName(p.platform).slice(0, 2)}</span>
                <span className="min-w-0 truncate text-on-surface">{brandOf(p.brand_id)?.name ?? '—'} <span className="text-muted text-xs">· {fmtDM(p.published_at)} · {platName(p.platform)}{m?.gatilho ? ' · ' + m.gatilho.slice(0, 22) : ''}</span></span>
                <span className="text-right font-mono tabular-nums" style={{ color: COR_OK }}>{m ? m.engajamento : '—'}</span>
                <span className="hidden sm:block text-right font-mono tabular-nums text-on-surface-variant">{m?.alcance ?? '—'}</span>
                <span className="hidden sm:block text-right font-mono tabular-nums text-on-surface-variant">{m?.salvamentos ?? '—'}</span>
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="text-muted hover:text-secondary"><ExternalLink className="w-3.5 h-3.5" /></a> : <span />}
              </div>
            ))}
            {linhas.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">Nada neste recorte — ajuste os filtros.</div>}
          </section>
        </>
      )}
    </div>
  );
}

function Chip({ on, onClick, children, cor }: { on: boolean; onClick: () => void; children: React.ReactNode; cor?: string | null }) {
  return (
    <button onClick={onClick}
      className={'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border transition-colors ' +
        (on ? 'border-secondary/60 text-on-surface bg-surface-highest' : 'border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40')}
      style={on && cor ? { borderColor: cor } : undefined}>
      {children}
    </button>
  );
}

function Kpi({ icon, label, value, sub, glow }: { icon: React.ReactNode; label: string; value: string; sub?: string; glow: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] mb-1.5">{icon}{label}</div>
      <div className="text-xl font-semibold font-mono tabular-nums" style={{ color: glow }}>{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function RankPanel({ titulo, itens, accent }: { titulo: string; itens: { k: string; n: number; engMed: number; taxa: number | null }[]; accent: string }) {
  const max = Math.max(1, ...itens.map((i) => i.engMed));
  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2.5">{titulo}</div>
      {itens.length === 0 ? <div className="text-sm text-muted py-4 text-center">sem posts medidos com este dado.</div> : (
        <div className="space-y-2">
          {itens.slice(0, 6).map((i) => (
            <div key={i.k}>
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-[13px] text-on-surface truncate">{i.k}</span>
                <span className="shrink-0 flex items-baseline gap-2">
                  {i.taxa != null && <span className="font-mono text-[10px] uppercase tracking-widest text-muted">taxa {i.taxa.toFixed(1)}%</span>}
                  <span className="font-mono tabular-nums text-[13px]" style={{ color: accent }}>{nf(Math.round(i.engMed))}</span>
                  <span className="font-mono text-[10px] text-muted">· {i.n}</span>
                </span>
              </div>
              <div className="h-1.5 bg-surface-highest overflow-hidden">
                <div className="h-full" style={{ width: `${(i.engMed / max) * 100}%`, background: accent }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendChart({ series, dias, mode }: { series: Serie[]; dias: string[]; mode: 'line' | 'bar' }) {
  const W = 920, H = 240, padL = 6, padR = 48, padT = 14, padB = 24;
  if (series.length === 0 || dias.length < 2) {
    return <div className="py-16 text-center text-sm text-muted">sem série suficiente no recorte — a curva nasce com os próximos censos diários.</div>;
  }
  const stacked = dias.map((_, i) => series.reduce((s, se) => s + (se.pts[i] || 0), 0));
  const max = Math.max(1, mode === 'bar' ? Math.max(...stacked) : Math.max(...series.flatMap((s) => s.pts)));
  const min = mode === 'line' ? Math.min(...series.flatMap((s) => s.pts)) : 0;
  const span = Math.max(1, max - min);
  const X = (i: number) => padL + (dias.length === 1 ? 0 : (i / (dias.length - 1)) * (W - padL - padR));
  const Y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: padT + f * (H - padT - padB), v: max - f * span }));
  const labIdx = [...new Set([0, Math.floor((dias.length - 1) / 2), dias.length - 1])];
  const bw = Math.max(2, ((W - padL - padR) / dias.length) * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="currentColor" className="text-outline/20" />
          <text x={W - padR + 5} y={g.y + 3} fill="currentColor" className="text-muted" fontSize="9" fontFamily="ui-monospace,monospace">{nf(Math.round(g.v))}</text>
        </g>
      ))}
      {labIdx.map((i) => (
        <text key={i} x={X(i)} y={H - 6} fill="currentColor" className="text-muted" fontSize="9" fontFamily="ui-monospace,monospace" textAnchor="middle">{fmtDM(dias[i])}</text>
      ))}
      {mode === 'bar'
        ? dias.map((_, i) => {
            let acc = 0;
            return series.map((se) => {
              const v = se.pts[i] || 0; if (v <= 0) return null;
              const yTop = Y(min + acc + v); const h = (v / span) * (H - padT - padB); acc += v;
              return <rect key={se.id + i} x={X(i) - bw / 2} y={yTop} width={bw} height={Math.max(0, h)} style={{ fill: se.color }} opacity="0.82" />;
            });
          })
        : series.map((se) => {
            const pts = se.pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
            const last = se.pts.length - 1;
            return (
              <g key={se.id}>
                <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: se.color }} />
                <circle cx={X(last)} cy={Y(se.pts[last])} r="2.6" style={{ fill: se.color }} />
              </g>
            );
          })}
    </svg>
  );
}

function Spark({ serie, color }: { serie: number[]; color: string }) {
  if (serie.length < 2) return <div className="h-8 flex-1 max-w-[110px] bg-surface-highest border border-outline/20 flex items-center justify-center text-[9px] text-muted">dia 1</div>;
  const w = 110, h = 32, min = Math.min(...serie), max = Math.max(...serie), span = Math.max(1, max - min);
  const pts = serie.map((v, i) => `${(i / (serie.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 8)}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" style={{ stroke: color }} />
    </svg>
  );
}

function MotorCard({ titulo, cor, headline, sub, serie, rotuloSerie }: {
  titulo: string; cor: string; headline: string; sub: string;
  serie: [string, number][]; rotuloSerie: string;
}) {
  const max = Math.max(1, ...serie.map(([, v]) => v));
  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
        <span className="text-sm text-on-surface truncate">{titulo}</span>
      </div>
      <div className="text-2xl font-semibold font-mono tabular-nums" style={{ color: cor }}>{headline}</div>
      <div className="text-[10px] text-muted mt-0.5 mb-2">{sub}</div>
      {serie.length >= 2 ? (
        <div className="flex items-end gap-[2px] h-12">
          {serie.slice(-45).map(([dia, v]) => (
            <div key={dia} title={`${fmtDM(dia)}: ${nf(v)}`} className="flex-1 min-h-[2px]"
              style={{ height: `${Math.max(3, (v / max) * 100)}%`, background: cor, opacity: v === 0 ? 0.15 : 0.85 }} />
          ))}
        </div>
      ) : (
        <div className="h-12 flex items-center justify-center text-[10px] text-muted border border-outline/15">série curta — cresce com os dias</div>
      )}
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">{rotuloSerie}</div>
    </div>
  );
}
