import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Bookmark, Share2, RefreshCw, Loader2, ExternalLink, Sparkles, Target, HeartPulse, Film, Newspaper } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { espelhoMotores, type PulsoDia, type LimelightDia, type LimePubDia, type BlogDia, type EspelhoBlogs } from '../lib/espelhoMotores';

// RADAR 360 (2026-08-25) — o analytics social completo do grupo, aprovado em mock.
// Decisão do dono: TODAS as redes, canais e marcas presentes na estrutura desde já;
// o que ainda não tem coleta aparece como "a ligar" — nunca some. Divisão canônica
// continua: digiai = cérebro (esta tela), MKT = mãos (motor de disparo).
// Fontes: schema mkt (nativo) + espelhos v_espelho_* (Pulso/Limelight/Blogs) +
// v_marketing_cadeia + v_mkt_fila_saude + v_seo_estado + v_mkt_accounts.

type Brand = { id: string; code: string; name: string; accent_hex: string | null; logo_url: string | null };
type Pub = { id: string; brand_id: string; platform: string; url: string | null; published_at: string };
type Perf = {
  publication_id: string; brand_id: string; gatilho: string | null; formato: string | null;
  engajamento: number | null; alcance: number | null; salvamentos: number | null; compartilhamentos: number | null;
};
type Aud = { brand_id: string; platform: string; seguidores: number; dia: string };
type Serie = { id: string; label: string; color: string; logo: string | null; pts: number[]; atual: number };
type Cadeia = {
  posts_7d: number; ultima_publicacao: string | null;
  seguidores: number; ultimo_censo: string | null;
  leads_30d: number; ultimo_lead: string | null;
  disparos_30d: number; ultimo_disparo: string | null;
  vendas_30d: number; receita_30d_brl: number; ultima_venda: string | null;
};
type Fila = { atrasados: number; com_erro: number; ultima_publicacao: string | null; ultima_audiencia: string | null };
type Conta = { brand_name: string | null; platform: string; handle: string | null; status: string | null };
type Cred = { platform: string; account_ref: string | null; status: string | null; expires_at: string | null };
type CalcFunil = { dia: string; usos: number; sessoes: number; leads: number };

const ABAS = [
  { k: 'visao', label: 'Visão', Icon: Eye },
  { k: 'audiencia', label: 'Audiência', Icon: Users },
  { k: 'conteudo', label: 'Conteúdo', Icon: Newspaper },
  { k: 'video', label: 'Vídeo & motores', Icon: Film },
  { k: 'funil', label: 'Funil', Icon: Target },
  { k: 'saude', label: 'Saúde da coleta', Icon: HeartPulse },
] as const;
type AbaK = typeof ABAS[number]['k'];

const RANGES = [
  { k: 1, label: 'hoje' }, { k: 7, label: '7d' }, { k: 14, label: '14d' }, { k: 30, label: '30d' },
  { k: 60, label: '60d' }, { k: 90, label: '90d' }, { k: 180, label: '6m' }, { k: 365, label: '12m' }, { k: 0, label: 'tudo' },
];
// Todas as redes do grupo — inclusive as que ainda não têm coleta (aparecem "a ligar").
const REDES = [
  { k: '', label: 'todas' }, { k: 'instagram', label: 'Instagram' }, { k: 'facebook', label: 'Facebook' },
  { k: 'tiktok', label: 'TikTok' }, { k: 'youtube', label: 'YouTube' }, { k: 'kwai', label: 'Kwai' },
  { k: 'linkedin', label: 'LinkedIn' }, { k: 'x', label: 'X' },
];
const ALL_NETS = ['instagram', 'facebook', 'tiktok', 'youtube', 'kwai', 'linkedin', 'x'];
const METRICAS = [
  { k: 'seguidores', label: 'seguidores' }, { k: 'engajamento', label: 'engajamento' }, { k: 'alcance', label: 'alcance' },
] as const;
type MetricaK = typeof METRICAS[number]['k'];

const nf = (n: number) => n.toLocaleString('pt-BR');
const platName = (p: string) => ({ instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', kwai: 'Kwai', x: 'X' }[p] ?? p);
const fmtDM = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const COR_OK = 'var(--color-action)';
const COR_WARN = 'var(--color-warning)';
const COR_DANGER = 'var(--color-danger)';
const COR_SEC = 'var(--color-secondary)';

export default function MktCrescimento() {
  const [aba, setAba] = useState<AbaK>('visao');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [perf, setPerf] = useState<Perf[]>([]);
  const [aud, setAud] = useState<Aud[]>([]);
  const [pulsoDias, setPulsoDias] = useState<PulsoDia[]>([]);
  const [limeDias, setLimeDias] = useState<LimelightDia[]>([]);
  const [limePub, setLimePub] = useState<LimePubDia[]>([]);
  const [blogDias, setBlogDias] = useState<BlogDia[]>([]);
  const [blogsEsp, setBlogsEsp] = useState<EspelhoBlogs | null>(null);
  const [cadeia, setCadeia] = useState<Cadeia | null>(null);
  const [fila, setFila] = useState<Fila | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [calcDias, setCalcDias] = useState<CalcFunil[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [fMarca, setFMarca] = useState('');
  const [fRede, setFRede] = useState('');
  const [fDias, setFDias] = useState(30);
  const [fDe, setFDe] = useState('');
  const [fAte, setFAte] = useState('');
  const [fConteudo, setFConteudo] = useState('');
  const [metrica, setMetrica] = useState<MetricaK>('seguidores');

  async function load() {
    setLoading(true);
    const [b, p, cp, ad, pd, ld, bd, lp, be, { data: cad }, { data: fs }, { data: ac }, cr, { data: cfu }] = await Promise.all([
      supabase.schema('mkt').from('brands').select('id, code, name, accent_hex, logo_url').order('name'),
      supabase.schema('mkt').from('publications').select('id, brand_id, platform, url, published_at').order('published_at', { ascending: false }).limit(2000),
      supabase.schema('mkt').from('content_performance').select('publication_id, brand_id, gatilho, formato, engajamento, alcance, salvamentos, compartilhamentos'),
      supabase.schema('mkt').from('audiencia_diaria').select('brand_id, platform, seguidores, dia').order('dia'),
      espelhoMotores.pulsoDias(),
      espelhoMotores.limelightDias(),
      espelhoMotores.blogsDias(),
      espelhoMotores.limelightPubDias(),
      espelhoMotores.blogs(),
      supabase.from('v_marketing_cadeia').select('*').maybeSingle(),
      supabase.from('v_mkt_fila_saude').select('atrasados, com_erro, ultima_publicacao, ultima_audiencia').maybeSingle(),
      supabase.from('v_mkt_accounts').select('brand_name, platform, handle, status'),
      supabase.schema('mkt').from('credentials').select('platform, account_ref, status, expires_at').then((r) => r, () => ({ data: [] as Cred[] })),
      supabase.from('v_mkt_calc_funil').select('dia, usos, sessoes, leads').limit(400),
    ]);
    setBrands((b.data ?? []) as Brand[]);
    setPubs((p.data ?? []) as Pub[]);
    setPerf((cp.data ?? []) as Perf[]);
    setAud((ad.data ?? []) as Aud[]);
    setPulsoDias(pd); setLimeDias(ld); setBlogDias(bd); setLimePub(lp); setBlogsEsp(be);
    setCadeia((cad ?? null) as Cadeia | null);
    setFila((fs ?? null) as Fila | null);
    setContas((ac ?? []) as Conta[]);
    setCreds(((cr as { data: Cred[] | null }).data ?? []) as Cred[]);
    setCalcDias((cfu ?? []) as CalcFunil[]);
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

  // ---- recorte de período (presets + personalizado) ----
  const custom = fDe !== '' && fAte !== '' && fDe <= fAte;
  const corteDia = useMemo(() => {
    if (custom) return fDe;
    if (fDias === 0) return '2000-01-01';
    const d = new Date(); d.setDate(d.getDate() - (fDias - 1));
    return d.toISOString().slice(0, 10);
  }, [fDias, custom, fDe]);
  const fimDia = useMemo(() => (custom ? fAte : new Date().toISOString().slice(0, 10)), [custom, fAte]);
  const corteISO = corteDia + 'T00:00:00Z';
  const fimISO = fimDia + 'T23:59:59Z';
  const noRecorte = (dia: string) => dia >= corteDia && dia <= fimDia;

  const pubsF = useMemo(() => pubs.filter((p) =>
    p.published_at >= corteISO && p.published_at <= fimISO &&
    (!fMarca || brandOf(p.brand_id)?.code === fMarca) &&
    (!fRede || p.platform === fRede)), [pubs, corteISO, fimISO, fMarca, fRede, brands]); // eslint-disable-line react-hooks/exhaustive-deps
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
    for (const a of audF) if (a.dia <= fimDia) porConta.set(`${a.brand_id}:${a.platform}`, a);
    return [...porConta.values()].reduce((s, a) => s + a.seguidores, 0);
  }, [audF, fimDia]);
  const segDelta = useMemo(() => {
    const chaves = new Set(audF.map((a) => `${a.brand_id}:${a.platform}`));
    let delta = 0; let temBase = false;
    for (const k of chaves) {
      const dentro = audF.filter((a) => `${a.brand_id}:${a.platform}` === k && noRecorte(a.dia));
      if (dentro.length >= 2) { delta += dentro[dentro.length - 1].seguidores - dentro[0].seguidores; temBase = true; }
    }
    return temBase ? delta : null;
  }, [audF, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const ultimoCenso = useMemo(() => aud.reduce<string | null>((m, a) => (m == null || a.dia > m ? a.dia : m), null), [aud]);
  const contasMedidas = useMemo(() => new Set(audF.map((a) => `${a.brand_id}:${a.platform}`)).size, [audF]);
  const diasEixo = useMemo(() => [...new Set(audF.filter((a) => noRecorte(a.dia)).map((a) => a.dia))].sort(), [audF, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const seriesMetrica = useMemo<Serie[]>(() => {
    const out: Serie[] = [];
    for (const b of brands) {
      if (fMarca && b.code !== fMarca) continue;
      let pts: number[];
      if (metrica === 'seguidores') {
        const contasB = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
        pts = diasEixo.map((d) => contasB.reduce((s, plat) => {
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

  const seriePorMarca = useMemo(() => {
    const out = new Map<string, number[]>();
    const dias = [...new Set(audF.filter((a) => noRecorte(a.dia)).map((a) => a.dia))].sort();
    for (const b of brands) {
      const contasB = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
      out.set(b.id, dias.map((d) => contasB.reduce((s, plat) => {
        const ate = audF.filter((a) => a.brand_id === b.id && a.platform === plat && a.dia <= d);
        return s + (ate.length ? ate[ate.length - 1].seguidores : 0);
      }, 0)));
    }
    return out;
  }, [audF, brands, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const crescimentoMarca = useMemo(() => brands.map((b) => {
    const serie = (seriePorMarca.get(b.id) ?? []).filter((v) => v > 0);
    if (serie.length < 2) return { b, delta: 0, pct: 0, atual: serie.length ? serie[0] : 0 };
    const first = serie[0]; const last = serie[serie.length - 1];
    return { b, delta: last - first, pct: first > 0 ? (last - first) / first * 100 : 0, atual: last };
  }).filter((x) => x.atual > 0).sort((a, b) => b.pct - a.pct), [brands, seriePorMarca]);

  const matriz = useMemo(() => brands.filter((b) => !fMarca || b.code === fMarca).map((b) => ({
    b,
    cells: ALL_NETS.filter((n) => !fRede || n === fRede).map((net) => {
      const serie = audF.filter((a) => a.brand_id === b.id && a.platform === net).sort((x, y) => x.dia.localeCompare(y.dia));
      if (!serie.length) return { net, seg: null as number | null, delta: null as number | null };
      const ate = serie.filter((a) => a.dia <= fimDia);
      if (!ate.length) return { net, seg: null as number | null, delta: null as number | null };
      const seg = ate[ate.length - 1].seguidores;
      const base = serie.find((a) => a.dia >= corteDia);
      return { net, seg, delta: base ? seg - base.seguidores : null };
    }),
  })), [brands, audF, fMarca, fRede, corteDia, fimDia]);
  const redesMatriz = ALL_NETS.filter((n) => !fRede || n === fRede);

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

  // Motores externos sob os mesmos filtros — views/pub é a coluna de decisão.
  const codePulso = useMemo(() => brands.find((b) => /pulso/i.test(b.name))?.code ?? '__pulso', [brands]);
  const codeMello = useMemo(() => brands.find((b) => /mello/i.test(b.name))?.code ?? '__mello', [brands]);
  const codeDigiai = useMemo(() => brands.find((b) => /^digiai$/i.test(b.name))?.code ?? '__digiai', [brands]);
  const pulsoF = useMemo(() => pulsoDias.filter((d) => noRecorte(d.dia) && (!fRede || d.plataforma === fRede)), [pulsoDias, corteDia, fimDia, fRede]); // eslint-disable-line react-hooks/exhaustive-deps
  const limePubF = useMemo(() => limePub.filter((d) => noRecorte(d.dia) && (!fRede || d.plataforma === fRede)), [limePub, corteDia, fimDia, fRede]); // eslint-disable-line react-hooks/exhaustive-deps
  const blogF = useMemo(() => blogDias.filter((d) => noRecorte(d.dia)), [blogDias, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps
  const porPlataforma = (rows: { plataforma: string; publicacoes: number; views: number; likes: number; comentarios: number; shares: number }[]) => {
    const m = new Map<string, { pubs: number; views: number; eng: number }>();
    for (const r of rows) {
      const c = m.get(r.plataforma) ?? { pubs: 0, views: 0, eng: 0 };
      c.pubs += r.publicacoes || 0; c.views += r.views || 0;
      c.eng += (r.likes || 0) + (r.comentarios || 0) + (r.shares || 0);
      m.set(r.plataforma, c);
    }
    return [...m.entries()].map(([plat, c]) => ({ plat, ...c, vpp: c.pubs > 0 ? c.views / c.pubs : 0 }))
      .sort((a, b) => b.views - a.views);
  };
  const pulsoPlats = useMemo(() => porPlataforma(pulsoF), [pulsoF]); // eslint-disable-line react-hooks/exhaustive-deps
  const limePlats = useMemo(() => porPlataforma(limePubF), [limePubF]); // eslint-disable-line react-hooks/exhaustive-deps
  const pulsoTot = useMemo(() => ({
    views: pulsoF.reduce((a, d) => a + (d.views || 0), 0),
    pubs: pulsoF.reduce((a, d) => a + (d.publicacoes || 0), 0),
    eng: pulsoF.reduce((a, d) => a + (d.likes || 0) + (d.comentarios || 0) + (d.shares || 0) + (d.saves || 0), 0),
  }), [pulsoF]);
  const limeTot = useMemo(() => ({
    views: limePubF.reduce((a, d) => a + (d.views || 0), 0),
    pubs: limePubF.reduce((a, d) => a + (d.publicacoes || 0), 0),
  }), [limePubF]);
  const limeSegAtual = useMemo(() => {
    const porPlat = new Map<string, LimelightDia>();
    for (const d of limeDias.filter((x) => (!fRede || x.plataforma === fRede) && x.dia <= fimDia)) {
      const cur = porPlat.get(d.plataforma);
      if (!cur || d.dia > cur.dia || (d.dia === cur.dia && (d.seguidores ?? 0) > (cur.seguidores ?? 0))) porPlat.set(d.plataforma, d);
    }
    return [...porPlat.values()].reduce((a, d) => a + (d.seguidores ?? 0), 0);
  }, [limeDias, fRede, fimDia]);
  const blogTot = useMemo(() => blogF.reduce((a, d) => a + (d.leituras || 0), 0), [blogF]);
  const blogPorSlug = useMemo(() => {
    const m = new Map<string, { leituras: number; sessoes: number }>();
    for (const d of blogF) {
      const c = m.get(d.blog_slug) ?? { leituras: 0, sessoes: 0 };
      c.leituras += d.leituras || 0; c.sessoes += d.sessoes || 0;
      m.set(d.blog_slug, c);
    }
    return [...m.entries()].map(([slug, c]) => ({ slug, ...c })).sort((a, b) => b.leituras - a.leituras);
  }, [blogF]);
  const serieDe = (rows: { dia: string; v: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.dia, (m.get(r.dia) ?? 0) + r.v);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const pulsoSerie = useMemo(() => serieDe(pulsoF.map((d) => ({ dia: d.dia, v: d.views || 0 }))), [pulsoF]); // eslint-disable-line react-hooks/exhaustive-deps
  const blogSerie = useMemo(() => serieDe(blogF.map((d) => ({ dia: d.dia, v: d.leituras || 0 }))), [blogF]); // eslint-disable-line react-hooks/exhaustive-deps
  const mostrarPulso = (!fMarca || fMarca === codePulso) && pulsoDias.length > 0;
  const mostrarLime = (!fMarca || fMarca === codeMello) && limePub.length > 0;
  const mostrarBlogs = (!fMarca || fMarca === codeDigiai) && !fRede && blogDias.length > 0;

  // Visão: agregados do ecossistema no recorte
  const viewsRecorte = (mostrarPulso ? pulsoTot.views : 0) + (mostrarLime ? limeTot.views : 0);
  const pubsRecorte = (mostrarPulso ? pulsoTot.pubs : 0) + (mostrarLime ? limeTot.pubs : 0);
  const engRecorte = (mostrarPulso ? pulsoTot.eng : 0) + (mostrarLime ? limePubF.reduce((a, d) => a + (d.likes || 0) + (d.comentarios || 0) + (d.shares || 0), 0) : 0);
  const sharePlats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of [...(mostrarPulso ? pulsoPlats : []), ...(mostrarLime ? limePlats : [])]) m.set(r.plat, (m.get(r.plat) ?? 0) + r.views);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [pulsoPlats, limePlats, mostrarPulso, mostrarLime]);
  const shareTot = Math.max(1, sharePlats.reduce((a, [, v]) => a + v, 0));
  const PLAT_COR: Record<string, string> = {
    facebook: '#3987e5', youtube: '#d95926', tiktok: '#199e70', kwai: '#c98500', instagram: '#d55181', linkedin: '#9085e9', x: 'var(--color-muted)',
  };

  // Saúde: cobertura — toda conta cadastrada × existe censo recente?
  const cobertura = useMemo(() => {
    const censoKeys = new Set(aud.filter((a) => a.dia >= new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)).map((a) => `${brandOf(a.brand_id)?.name ?? ''}|${a.platform}`));
    return contas
      .filter((c) => !/whats/i.test(c.platform))
      .map((c) => ({ ...c, medida: censoKeys.has(`${c.brand_name ?? ''}|${c.platform}`) }))
      .sort((a, b) => Number(a.medida) - Number(b.medida));
  }, [contas, aud, brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const credsVencendo = useMemo(() => creds.filter((c) => c.expires_at).map((c) => ({
    ...c, dias: Math.floor((new Date(c.expires_at!).getTime() - Date.now()) / 864e5),
  })).sort((a, b) => a.dias - b.dias), [creds]);

  const conteudos = useMemo(() => {
    const g = new Set<string>(); perf.forEach((x) => { if (x.gatilho) g.add(x.gatilho); if (x.formato) g.add(x.formato); });
    return [...g].sort();
  }, [perf]);

  const chartMode: 'line' | 'bar' = metrica === 'seguidores' ? 'line' : 'bar';
  const lbl = 'font-mono text-[10px] uppercase tracking-widest text-muted';
  const rotuloRecorte = `${fmtDM(corteDia === '2000-01-01' ? (aud[0]?.dia ?? corteDia) : corteDia)} → ${fmtDM(fimDia)}`;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-1">
        <BarChart3 className="w-5 h-5 text-secondary" />
        <h1 className="font-serif text-2xl font-semibold text-on-surface">Radar 360</h1>
        <span className={lbl + ' hidden sm:inline'}>analytics social · todas as redes, canais e marcas</span>
        <button onClick={sincronizar} disabled={sincronizando}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 border border-outline/30 text-on-surface-variant hover:bg-surface-highest disabled:opacity-50">
          {sincronizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} sincronizar agora
        </button>
      </div>
      <p className="text-on-surface-variant text-sm mb-4">Estrutura completa desde já: o que ainda não tem coleta aparece como "a ligar" — nunca some. Motor de postagem vive no MKT; a leitura vive aqui.</p>

      {/* abas */}
      <div className="flex gap-1 border-b border-outline/20 mb-4 overflow-x-auto">
        {ABAS.map(({ k, label, Icon }) => (
          <button key={k} onClick={() => setAba(k)}
            className={'flex items-center gap-1.5 px-3.5 py-2 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ' +
              (aba === k ? 'border-secondary text-on-surface' : 'border-transparent text-muted hover:text-on-surface-variant')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* filtros globais */}
      <div className="border border-outline/15 bg-surface-container px-3.5 py-3 mb-5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={lbl + ' mr-1 shrink-0'}>período</span>
          {RANGES.map((r) => <Chip key={r.k} on={!custom && fDias === r.k} onClick={() => { setFDias(r.k); setFDe(''); setFAte(''); }}>{r.label}</Chip>)}
          <input type="date" value={fDe} onChange={(e) => setFDe(e.target.value)} aria-label="de"
            className="bg-surface border border-outline/30 text-on-surface font-mono text-[11px] px-1.5 py-1" />
          <span className="text-muted text-xs">→</span>
          <input type="date" value={fAte} onChange={(e) => setFAte(e.target.value)} aria-label="até"
            className="bg-surface border border-outline/30 text-on-surface font-mono text-[11px] px-1.5 py-1" />
          <span className="ml-auto font-mono text-[10px] text-muted">{rotuloRecorte}{fRede ? ` · ${platName(fRede)}` : ''}{fMarca ? ` · ${brands.find((b) => b.code === fMarca)?.name ?? fMarca}` : ''}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={lbl + ' mr-1 shrink-0'}>rede</span>
          {REDES.map((r) => <Chip key={r.k} on={fRede === r.k} onClick={() => setFRede(r.k)}>{r.label}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={lbl + ' mr-1 shrink-0'}>marca</span>
          <Chip on={fMarca === ''} onClick={() => setFMarca('')}>todas</Chip>
          {brands.map((b) => <Chip key={b.id} on={fMarca === b.code} onClick={() => setFMarca(fMarca === b.code ? '' : b.code)} cor={b.accent_hex}>{b.name}</Chip>)}
        </div>
        {aba === 'conteudo' && conteudos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={lbl + ' mr-1 shrink-0'}>conteúdo</span>
            <Chip on={fConteudo === ''} onClick={() => setFConteudo('')}>todos</Chip>
            {conteudos.slice(0, 10).map((c) => <Chip key={c} on={fConteudo === c} onClick={() => setFConteudo(fConteudo === c ? '' : c)}>{c.length > 26 ? c.slice(0, 26) + '…' : c}</Chip>)}
          </div>
        )}
      </div>

      {loading ? <div className="py-20 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin inline" /></div> : (
        <>
          {/* aviso de coleta parada — em toda aba, dado velho engana */}
          {(() => {
            const dias = ultimoCenso ? Math.floor((Date.now() - new Date(ultimoCenso + 'T12:00:00').getTime()) / 864e5) : null;
            if (dias === null || dias < 3) return null;
            const cor = dias >= 7 ? COR_DANGER : COR_WARN;
            return (
              <div className="border px-3 py-2.5 mb-4 bg-surface-container" style={{ borderColor: cor }}>
                <div className="text-[13px]" style={{ color: cor }}>⚠ Censo de audiência parado há {dias} dias (último {fmtDM(ultimoCenso!)}) — a curva de seguidores está congelada.</div>
              </div>
            );
          })()}

          {/* ═══ VISÃO ═══ */}
          {aba === 'visao' && (() => {
            // A Visão se ADAPTA à marca: quem tem motor de vídeo mostra views;
            // quem só tem redes mostra posts/engajamento — 0 gigante era falha
            // de desenho (marca sem motor parecia marca morta).
            const temMotor = viewsRecorte > 0;
            // share das redes das marcas: engajamento por plataforma (mkt real do recorte)
            const engPorRede = (() => {
              const m = new Map<string, number>();
              for (const l of medidos) m.set(l.p.platform, (m.get(l.p.platform) ?? 0) + (l.m!.engajamento || 0));
              return [...m.entries()].sort((a, b) => b[1] - a[1]);
            })();
            const engRedeTot = Math.max(1, engPorRede.reduce((a, [, v]) => a + v, 0));
            const share = temMotor ? sharePlats : engPorRede;
            const shTot = temMotor ? shareTot : engRedeTot;
            return (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> o tamanho real do alcance e da atenção no recorte — e onde estão concentrados.</>} />
              <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="border border-outline/15 bg-surface-container p-5" style={{ gridColumn: 'span 2' }}>
                  <div className={lbl}>{temMotor ? 'views no período (motores de vídeo)' : 'engajamento nas redes no período'} · {rotuloRecorte}</div>
                  <div className="font-mono tabular-nums font-semibold text-on-surface" style={{ fontSize: 'clamp(30px,4.5vw,44px)', lineHeight: 1.1 }}>{nf(temMotor ? viewsRecorte : engTotal)}</div>
                  <div className="text-[12px] text-muted mt-1 mb-3">
                    {temMotor
                      ? <>{mostrarPulso && `Pulso ${nf(pulsoTot.views)}`}{mostrarPulso && mostrarLime && ' · '}{mostrarLime && `Limelight ${nf(limeTot.views)}`} · por data de publicação</>
                      : <>{linhas.length} publicações · {medidos.length} medidas{fMarca ? ' · esta marca não tem motor de vídeo — o dado dela vive nas redes' : ''}</>}
                  </div>
                  {share.length > 0 ? (
                    <>
                      <div className="flex h-6 gap-0.5">
                        {share.map(([p, v]) => (
                          <div key={p} title={`${platName(p)} ${nf(v)} (${Math.round(v / shTot * 100)}%)`}
                            style={{ width: `${(v / shTot * 100).toFixed(1)}%`, background: PLAT_COR[p] ?? COR_SEC, minWidth: 2 }} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-on-surface-variant">
                        {share.map(([p, v]) => (
                          <span key={p}><span className="inline-block w-2.5 h-2.5 mr-1.5 align-[-1px]" style={{ background: PLAT_COR[p] ?? COR_SEC }} />{platName(p)} {nf(v)}</span>
                        ))}
                      </div>
                      <div className={lbl + ' mt-2'}>{temMotor ? 'participação de views por plataforma' : 'participação de engajamento por rede'}</div>
                    </>
                  ) : <div className="text-sm text-muted py-3">sem publicações medidas neste recorte — se a marca é nova no censo, a curva nasce com os próximos dias.</div>}
                </div>
                <div className="border border-outline/15 bg-surface-container p-5">
                  <div className={lbl}>seguidores (censo, fim do período)</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold" style={{ color: COR_SEC }}>{segAtual ? nf(segAtual) : '—'}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: (segDelta ?? 0) >= 0 ? COR_OK : COR_DANGER }}>{segDelta != null ? `${segDelta >= 0 ? '+' : ''}${nf(segDelta)} no período` : 'sem série no recorte'}</div>
                  <div className={lbl + ' mt-3'}>blogs no período</div>
                  <div className="text-[13px] text-on-surface-variant">{blogTot} leituras{blogsEsp ? ` · ${blogsEsp.posts_no_ar} posts no ar` : ''}</div>
                </div>
              </div>
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi icon={<Newspaper className="w-4 h-4" />} label="posts nas redes" value={nf(linhas.length)} sub={`no recorte · ${medidos.length} medidos`} glow={COR_SEC} />
                <Kpi icon={<Sparkles className="w-4 h-4" />} label="engajamento redes" value={nf(engTotal)} sub={`média ${nf(Math.round(engMed))}/post`} glow={COR_OK} />
                <Kpi icon={<Film className="w-4 h-4" />} label="views motores" value={temMotor ? nf(viewsRecorte) : '—'} sub={temMotor ? `${nf(pubsRecorte)} pubs · ${nf(engRecorte)} interações` : fMarca ? 'sem motor nesta marca' : 'sem views no recorte'} glow={COR_WARN} />
                <Kpi icon={<Eye className="w-4 h-4" />} label="alcance redes" value={temAlcance ? nf(alcanceTotal) : '🔒'} sub={temAlcance ? (taxaEng != null ? `taxa ${taxaEng.toFixed(1)}%` : '') : 'aguarda permissão Meta'} glow={COR_SEC} />
              </section>
            </>
            );
          })()}

          {/* ═══ AUDIÊNCIA ═══ */}
          {aba === 'audiencia' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> em qual marca e rede investir presença. Toda marca aparece — fora do censo é aviso, não ausência.</>} />
              <div className={lbl + ' mb-2 flex flex-wrap items-center gap-x-2 gap-y-1'}>
                <span className="text-secondary">●</span> censo diário 7h
                <span>▸</span> último {ultimoCenso ? fmtDM(ultimoCenso) : '—'}
                <span>▸</span> {contasMedidas} contas medidas
                <span>▸</span> alcance {temAlcance ? <span style={{ color: COR_OK }}>ok</span> : <span style={{ color: COR_WARN }}>🔒 permissão Meta</span>}
              </div>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {brands.map((b) => {
                  const serie = (seriePorMarca.get(b.id) ?? []).filter((v) => v > 0);
                  const atual = serie.length ? serie[serie.length - 1] : 0;
                  const delta = serie.length >= 2 ? atual - serie[0] : null;
                  if (fMarca && fMarca !== b.code) return null;
                  const semCenso = atual === 0;
                  const c = b.accent_hex || COR_SEC;
                  return (
                    <div key={b.id} className="border border-outline/15 bg-surface-container px-4 py-3.5" style={semCenso ? { opacity: 0.75 } : undefined}>
                      <div className="flex items-center gap-2 mb-2">
                        {b.logo_url ? <img src={b.logo_url} alt="" className="w-6 h-6 object-cover" /> : <span className="w-6 h-6 flex items-center justify-center text-[10px]" style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c }}>{b.name[0]}</span>}
                        <span className="text-sm flex-1 truncate text-on-surface">{b.name}</span>
                        {delta != null && <span className="text-[11px] font-mono tabular-nums" style={{ color: delta >= 0 ? COR_OK : COR_DANGER }}>{delta >= 0 ? '+' : ''}{delta}</span>}
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-2xl font-semibold font-mono tabular-nums" style={{ color: semCenso ? undefined : c }}>{semCenso ? '—' : nf(atual)}</div>
                        {!semCenso && <Spark serie={serie} color={c} />}
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: semCenso ? COR_WARN : undefined }}>
                        {semCenso ? 'fora do censo — a ligar (ver aba Saúde)' : <span className="text-muted">{serie.length <= 1 ? 'baseline — a curva nasce amanhã' : `${serie.length} dias de série`}</span>}
                      </div>
                    </div>
                  );
                })}
              </section>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <TrendingUp className="w-4 h-4 text-secondary" /><h2 className="text-sm text-on-surface-variant">evolução no tempo</h2>
                <span className={lbl}>{diasEixo.length} dias no eixo</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {METRICAS.map((m) => <Chip key={m.k} on={metrica === m.k} onClick={() => setMetrica(m.k)}>{m.label}</Chip>)}
                </div>
              </div>
              <section className="border border-outline/15 bg-surface-container px-4 pt-4 pb-3 mb-6">
                <TrendChart series={seriesMetrica} dias={diasEixo} mode={chartMode} />
              </section>
              {crescimentoMarca.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {crescimentoMarca.map((cm) => (
                    <div key={cm.b.id} className="border border-outline/15 bg-surface-container inline-flex items-center gap-2 px-2.5 py-1.5">
                      {cm.b.logo_url ? <img src={cm.b.logo_url} alt="" className="w-4 h-4 object-cover" /> : <span className="w-2 h-2 rounded-full" style={{ background: cm.b.accent_hex || COR_SEC }} />}
                      <span className="text-[12px] text-on-surface-variant">{cm.b.name}</span>
                      <span className="font-mono tabular-nums text-[13px]" style={{ color: cm.delta >= 0 ? COR_OK : COR_DANGER }}>{cm.delta >= 0 ? '+' : ''}{nf(cm.delta)} · {cm.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">matriz marca × rede</h2><span className={lbl}>todas as redes do grupo · — = a ligar</span></div>
              <section className="border border-outline/15 bg-surface-container overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline/15">
                      <th className={'text-left font-normal px-4 py-2.5 ' + lbl}>marca</th>
                      {redesMatriz.map((n) => <th key={n} className={'px-3 py-2.5 font-normal ' + lbl}>{platName(n)}</th>)}
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
                  </tbody>
                </table>
              </section>
            </>
          )}

          {/* ═══ CONTEÚDO ═══ */}
          {aba === 'conteudo' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> que formato produzir mais e em que janela publicar — provado pelo engajamento real do recorte.</>} />
              <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <Kpi icon={<TrendingUp className="w-4 h-4" />} label="engajamento" value={nf(engTotal)} sub={`${medidos.length} posts medidos · média ${nf(Math.round(engMed))}`} glow={COR_OK} />
                <Kpi icon={<Eye className="w-4 h-4" />} label="alcance" value={temAlcance ? nf(alcanceTotal) : '🔒'} sub={temAlcance ? (taxaEng != null ? `taxa ${taxaEng.toFixed(1)}%` : '') : 'aguarda permissão Meta'} glow={COR_WARN} />
                <Kpi icon={<Bookmark className="w-4 h-4" />} label="salvamentos" value={temAlcance ? nf(savesTotal) : '🔒'} sub="o que o público guarda" glow={COR_SEC} />
                <Kpi icon={<Share2 className="w-4 h-4" />} label="compartilhamentos" value={sharesTotal > 0 ? nf(sharesTotal) : (temAlcance ? '0' : '🔒')} sub="anúncio grátis" glow={COR_SEC} />
                <Kpi icon={<Newspaper className="w-4 h-4" />} label="publicações" value={nf(linhas.length)} sub="no recorte" glow={COR_SEC} />
              </section>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                <RankPanel titulo="por formato" itens={porFormato} accent={COR_SEC} />
                <RankPanel titulo="por gatilho" itens={porGatilho} accent={COR_OK} />
              </section>
              {porHora.list.length > 0 && (
                <section className="border border-outline/15 bg-surface-container px-4 py-3.5 mb-6">
                  <div className={lbl + ' mb-2'}>janelas de horário · eng médio por post</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {porHora.list.map((h) => {
                      const top = porHora.best && h.faixa === porHora.best.faixa;
                      return (
                        <div key={h.faixa} className="px-3 py-2.5 border" style={{ borderColor: top ? COR_WARN : 'color-mix(in srgb, var(--color-outline, #888) 30%, transparent)' }}>
                          <div className="font-mono tabular-nums text-lg" style={{ color: top ? COR_WARN : undefined }}>{nf(Math.round(h.engMed))}</div>
                          <div className="text-[11px] text-on-surface-variant">{h.faixa}</div>
                          <div className={lbl}>{h.n} posts</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">o que o público premiou</h2><span className={lbl}>{linhas.length} publicações no recorte</span></div>
              <section className="border border-outline/15 bg-surface-container overflow-hidden">
                <div className={'hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-outline/15 ' + lbl}>
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

          {/* ═══ VÍDEO & MOTORES ═══ */}
          {aba === 'video' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> onde dobrar a aposta de vídeo. <b>Views/pub</b> é a coluna de decisão — mesmo esforço, retorno diferente.</>} />
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
                {mostrarPulso ? (
                  <MotorCard titulo="Pulso · canais faceless" cor={COR_SEC}
                    headline={`${nf(pulsoTot.views)} views`} sub={`${pulsoTot.pubs} publicações · ${nf(pulsoTot.eng)} interações no período`}
                    serie={pulsoSerie} rotuloSerie="views/dia de publicação"
                    plats={pulsoPlats}
                    sacada={pulsoPlats.length >= 2 && pulsoPlats[0].pubs >= 2 ? (() => { const top = [...pulsoPlats].sort((a, b) => b.vpp - a.vpp)[0]; return `melhor eficiência: ${platName(top.plat)} (${nf(Math.round(top.vpp))} views/pub)`; })() : undefined} />
                ) : <MotorVazio titulo="Pulso · canais faceless" motivo="filtro de marca exclui o Pulso" />}
                {mostrarLime ? (
                  <MotorCard titulo="Limelight · fábrica Mello" cor={COR_OK}
                    headline={`${nf(limeTot.views)} views`} sub={`${limeTot.pubs} publicações no período · ${nf(limeSegAtual)} seguidores no censo próprio`}
                    serie={serieDe(limePubF.map((d) => ({ dia: d.dia, v: d.views || 0 })))} rotuloSerie="views/dia de publicação"
                    plats={limePlats}
                    sacada={limePlats.length >= 2 && limePlats[0].pubs >= 2 ? (() => { const top = [...limePlats].sort((a, b) => b.vpp - a.vpp)[0]; return `melhor eficiência: ${platName(top.plat)} (${nf(Math.round(top.vpp))} views/pub)`; })() : undefined} />
                ) : <MotorVazio titulo="Limelight · fábrica Mello" motivo="filtro de marca exclui o Limelight" />}
                {mostrarBlogs ? (
                  <MotorCard titulo="Blogs regionais · 5 sites" cor={COR_WARN}
                    headline={`${nf(blogTot)} leituras`} sub="first-party, zero PII · medição desde 20/08"
                    serie={blogSerie} rotuloSerie="leituras/dia"
                    blogsDetalhe={blogPorSlug}
                    sacada={blogPorSlug.length >= 2 && blogPorSlug[0].leituras > 0 ? `${blogPorSlug[0].slug} puxa a rede (${blogPorSlug[0].leituras} leituras)` : undefined} />
                ) : <MotorVazio titulo="Blogs regionais · 5 sites" motivo={fRede ? 'blogs não têm recorte por rede' : 'filtro de marca exclui os blogs'} />}
              </section>
            </>
          )}

          {/* ═══ FUNIL ═══ */}
          {aba === 'funil' && cadeia && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> onde o funil quebra — e para onde vai o esforço da semana. Snapshot real de 30 dias.</>} />
              <section className="border border-outline/15 bg-surface-container p-5 mb-4">
                <div className={lbl + ' mb-3'}>cadeia de resultados · 30 dias · carimbo por elo</div>
                <div className="space-y-2">
                  {([
                    { rot: 'produzir', v: `${cadeia.posts_7d} posts/7d`, w: 100, cor: COR_SEC, stamp: cadeia.ultima_publicacao, lim: 2 },
                    { rot: 'alcançar', v: `${nf(cadeia.seguidores)} seg + views dos motores`, w: 88, cor: COR_SEC, stamp: cadeia.ultimo_censo ? cadeia.ultimo_censo + 'T12:00:00' : null, lim: 2 },
                    { rot: 'captar', v: `${cadeia.leads_30d} lead(s)`, w: Math.min(100, cadeia.leads_30d * 4), cor: COR_DANGER, stamp: cadeia.ultimo_lead, lim: 14 },
                    { rot: 'prospectar', v: `${cadeia.disparos_30d} disparos OSI`, w: Math.min(100, cadeia.disparos_30d), cor: COR_WARN, stamp: cadeia.ultimo_disparo, lim: 7 },
                    { rot: 'vender', v: cadeia.vendas_30d > 0 ? `${cadeia.vendas_30d} vendas · R$ ${nf(Math.round(cadeia.receita_30d_brl))}` : '0 vendas', w: Math.min(100, cadeia.vendas_30d * 10), cor: COR_DANGER, stamp: cadeia.ultima_venda, lim: 30 },
                  ] as { rot: string; v: string; w: number; cor: string; stamp: string | null; lim: number }[]).map((e) => {
                    const dias = e.stamp ? Math.floor((Date.now() - new Date(e.stamp).getTime()) / 864e5) : null;
                    const ruim = dias === null || dias > e.lim;
                    return (
                      <div key={e.rot} className="grid items-center gap-3" style={{ gridTemplateColumns: '96px 1fr 220px' }}>
                        <span className={lbl}>{e.rot}</span>
                        <span className="h-7 bg-surface-highest relative"><span className="absolute inset-y-0 left-0" style={{ width: `${e.w}%`, background: e.cor, opacity: 0.8 }} /></span>
                        <span className="text-[12.5px] font-mono tabular-nums text-on-surface-variant">{e.v} · <span style={{ color: ruim ? COR_DANGER : COR_OK }}>{dias === null ? 'nunca' : dias === 0 ? 'hoje' : `há ${dias}d`}</span></span>
                      </div>
                    );
                  })}
                  <div className="grid items-center gap-3" style={{ gridTemplateColumns: '96px 1fr 220px' }}>
                    <span className={lbl}>provar</span>
                    <span className="h-7 bg-surface-highest relative"><span className="absolute inset-y-0 left-0" style={{ width: '60%', background: COR_OK, opacity: 0.8 }} /></span>
                    <span className="text-[12.5px] font-mono tabular-nums text-on-surface-variant"><span style={{ color: COR_OK }}>uso vivo do Clearix</span> · só interno</span>
                  </div>
                </div>
              </section>
              {(() => {
                const cf = calcDias.filter((d) => noRecorte(d.dia));
                const usos = cf.reduce((a, d) => a + (d.usos || 0), 0);
                const sess = cf.reduce((a, d) => a + (d.sessoes || 0), 0);
                const leads = cf.reduce((a, d) => a + (d.leads || 0), 0);
                const serie = [...cf].sort((a, b) => a.dia.localeCompare(b.dia));
                const maxU = Math.max(1, ...serie.map((d) => d.usos));
                return (
                  <section className="border border-outline/15 bg-surface-container p-5 mb-4">
                    <div className={lbl + ' mb-3'}>isca · clearix calc · {rotuloRecorte} · telemetria first-party</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div><div className={lbl}>usos</div><div className="font-mono tabular-nums text-xl font-semibold text-on-surface">{nf(usos)}</div></div>
                      <div><div className={lbl}>sessões</div><div className="font-mono tabular-nums text-xl font-semibold" style={{ color: COR_SEC }}>{nf(sess)}</div></div>
                      <div><div className={lbl}>leads</div><div className="font-mono tabular-nums text-xl font-semibold" style={{ color: leads > 0 ? COR_OK : COR_DANGER }}>{nf(leads)}</div></div>
                      <div><div className={lbl}>conversão sessão→lead</div><div className="font-mono tabular-nums text-xl font-semibold" style={{ color: COR_WARN }}>{sess > 0 ? `${(leads / sess * 100).toFixed(1)}%` : '—'}</div></div>
                    </div>
                    {serie.length >= 2 ? (
                      <>
                        <div className="flex items-end gap-[3px] h-16">
                          {serie.slice(-60).map((d) => (
                            <div key={d.dia} title={`${fmtDM(d.dia)}: ${d.usos} usos · ${d.leads} leads`} className="flex-1 min-h-[2px]"
                              style={{ height: `${Math.max(3, (d.usos / maxU) * 100)}%`, background: d.leads > 0 ? COR_OK : COR_SEC, opacity: d.usos === 0 ? 0.15 : 0.85 }} />
                          ))}
                        </div>
                        <div className={lbl + ' mt-1.5'}>usos/dia · barra verde = dia com lead</div>
                      </>
                    ) : <div className="text-[12px] text-muted">sem uso do calc neste recorte.</div>}
                  </section>
                );
              })()}
              <div className="text-[13px] text-on-surface-variant">
                Aprofundar: <a href="#/mkt-calc" className="text-secondary hover:underline">Calc (isca)</a> · <a href="#/vendas" className="text-secondary hover:underline">Vendas</a> · <a href="#/fluxo-osi" className="text-secondary hover:underline">OSI</a> · <a href="#/semana" className="text-secondary hover:underline">Semana (metas)</a>
              </div>
            </>
          )}

          {/* ═══ SAÚDE ═══ */}
          {aba === 'saude' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> se dá para confiar nos números das outras abas. Fonte sem data fresca congela em silêncio — esta aba é o antídoto.</>} />
              <section className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                <Health cor={ultimoCenso === new Date().toISOString().slice(0, 10) ? COR_OK : COR_WARN} titulo="Censo de redes" sub={`${contasMedidas || '—'} contas · último ${ultimoCenso ? fmtDM(ultimoCenso) : '—'}`} />
                <Health cor={pulsoDias.some((d) => d.dia === new Date().toISOString().slice(0, 10)) ? COR_OK : COR_WARN} titulo="Pulso" sub="crons Vercel · série viva" />
                <Health cor={COR_OK} titulo="Limelight" sub="coleta própria da fábrica" />
                <Health cor={COR_OK} titulo="Blogs" sub={blogsEsp ? `últ. leitura ${blogsEsp.ultima_leitura ? fmtDM(blogsEsp.ultima_leitura) : '—'}` : 'espelho indisponível'} />
                {fila && <Health cor={fila.atrasados > 50 || fila.com_erro > 0 ? COR_DANGER : COR_OK} titulo="Fila do motor MKT" sub={`${fila.atrasados} atrasados · ${fila.com_erro} com erro`} />}
                {credsVencendo.map((c) => (
                  <Health key={c.platform + (c.account_ref ?? '')} cor={c.dias <= 3 ? COR_WARN : COR_OK} titulo={`OAuth ${platName(c.platform)}`} sub={c.dias < 0 ? `venceu há ${-c.dias}d` : c.dias === 0 ? 'vence HOJE' : `vence em ${c.dias}d`} />
                ))}
              </section>
              <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">cobertura — toda conta cadastrada × coleta</h2><span className={lbl}>fora do censo = número congelado sem aviso</span></div>
              <section className="border border-outline/15 bg-surface-container overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-outline/15">
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>marca</th>
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>rede</th>
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>conta</th>
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>coleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobertura.map((c, i) => (
                      <tr key={i} className="border-b border-outline/10 hover:bg-surface-highest/50">
                        <td className="px-4 py-2 text-on-surface">{c.brand_name ?? '—'}</td>
                        <td className="px-4 py-2 text-on-surface-variant">{platName(c.platform)}</td>
                        <td className="px-4 py-2 font-mono text-[12px] text-on-surface-variant">{c.handle ?? '—'}</td>
                        <td className="px-4 py-2">
                          {c.medida
                            ? <span style={{ color: COR_OK }}>✓ no censo</span>
                            : <span style={{ color: COR_WARN }}>a ligar{c.status === 'a_configurar' ? ' · a configurar no motor' : ''}</span>}
                        </td>
                      </tr>
                    ))}
                    {cobertura.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">sem contas cadastradas visíveis.</td></tr>}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Decide({ texto }: { texto: React.ReactNode }) {
  return <p className="border-l-2 border-secondary bg-surface-container px-4 py-2.5 mb-5 text-[13.5px] text-on-surface-variant">{texto}</p>;
}

function MotorVazio({ titulo, motivo }: { titulo: string; motivo: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5 opacity-70">
      <div className="text-sm text-on-surface mb-2">{titulo}</div>
      <div className="text-[12px] text-muted">{motivo}</div>
    </div>
  );
}

function Health({ cor, titulo, sub }: { cor: string; titulo: string; sub: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-3.5 py-2.5 flex items-start gap-2.5">
      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: cor }} />
      <div className="min-w-0">
        <div className="text-[13px] text-on-surface">{titulo}</div>
        <div className="text-[11.5px]" style={{ color: cor === 'var(--color-action)' ? 'var(--color-muted)' : cor }}>{sub}</div>
      </div>
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
                  <span className="font-mono tabular-nums text-[13px]" style={{ color: accent }}>{Math.round(i.engMed).toLocaleString('pt-BR')}</span>
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
  const nf2 = (n: number) => n.toLocaleString('pt-BR');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="currentColor" className="text-outline/20" />
          <text x={W - padR + 5} y={g.y + 3} fill="currentColor" className="text-muted" fontSize="9" fontFamily="ui-monospace,monospace">{nf2(Math.round(g.v))}</text>
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

function MotorCard({ titulo, cor, headline, sub, serie, rotuloSerie, plats, blogsDetalhe, sacada }: {
  titulo: string; cor: string; headline: string; sub: string;
  serie: [string, number][]; rotuloSerie: string;
  plats?: { plat: string; pubs: number; views: number; eng: number; vpp: number }[];
  blogsDetalhe?: { slug: string; leituras: number; sessoes: number }[];
  sacada?: string;
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
            <div key={dia} title={`${fmtDM(dia)}: ${v.toLocaleString('pt-BR')}`} className="flex-1 min-h-[2px]"
              style={{ height: `${Math.max(3, (v / max) * 100)}%`, background: cor, opacity: v === 0 ? 0.15 : 0.85 }} />
          ))}
        </div>
      ) : (
        <div className="h-12 flex items-center justify-center text-[10px] text-muted border border-outline/15">série curta — cresce com os dias</div>
      )}
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">{rotuloSerie}</div>
      {plats && plats.length > 0 && (
        <table className="w-full mt-2.5 text-[11px]">
          <thead>
            <tr className="text-muted border-b border-outline/15 font-mono text-[9px] uppercase tracking-wider">
              <th className="text-left font-normal py-1">plataforma</th>
              <th className="text-right font-normal py-1">pubs</th>
              <th className="text-right font-normal py-1">views</th>
              <th className="text-right font-normal py-1">views/pub</th>
              <th className="text-right font-normal py-1">interações</th>
            </tr>
          </thead>
          <tbody>
            {plats.map((r) => (
              <tr key={r.plat} className="border-b border-outline/10 last:border-0">
                <td className="py-1 text-on-surface">{platName(r.plat)}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.pubs}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.views.toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right font-mono tabular-nums" style={{ color: cor }}>{Math.round(r.vpp).toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.eng.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {blogsDetalhe && blogsDetalhe.length > 0 && (
        <table className="w-full mt-2.5 text-[11px]">
          <thead>
            <tr className="text-muted border-b border-outline/15 font-mono text-[9px] uppercase tracking-wider">
              <th className="text-left font-normal py-1">blog</th>
              <th className="text-right font-normal py-1">leituras</th>
              <th className="text-right font-normal py-1">sessões</th>
            </tr>
          </thead>
          <tbody>
            {blogsDetalhe.map((r) => (
              <tr key={r.slug} className="border-b border-outline/10 last:border-0">
                <td className="py-1 text-on-surface">{r.slug}</td>
                <td className="py-1 text-right font-mono tabular-nums" style={{ color: cor }}>{r.leituras}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.sessoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {sacada && (
        <div className="mt-2 text-[11px] flex items-center gap-1.5" style={{ color: cor }}>
          <span>▲</span><span className="text-on-surface-variant">{sacada}</span>
        </div>
      )}
    </div>
  );
}
