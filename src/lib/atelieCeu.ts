/**
 * Ateliê de Convergência (tema MKT) — céu de dados.
 * Campo de fluxo generativo: traços 1px que giram como redemoinhos
 * (herdeiro do dhMesh, com turbulência). Vanilla, mesmo contrato Cleanup.
 *
 *   const stop = initCeuDeDados(canvasEl);   // no unmount: stop()
 *
 * Com prefers-reduced-motion, desenha um frame acumulado único e para.
 */

type Cleanup = () => void;

const FUNDO = '#0A0F1E';
const CORES: { c: string; p: number }[] = [
  { c: '240,244,248', p: 0.62 }, // clarity — estrelas
  { c: '0,224,202', p: 0.16 },   // ciano — máquina
  { c: '232,185,74', p: 0.14 },  // trigo — guia
  { c: '127,176,154', p: 0.08 }, // forest claro — ação
];

export function initCeuDeDados(canvas: HTMLCanvasElement): Cleanup {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1, raf = 0;

  type Particula = { x: number; y: number; vida: number; cor: string; esp: number };
  let parts: Particula[] = [];

  const pick = () => {
    let r = Math.random(), a = 0;
    for (const k of CORES) { a += k.p; if (r <= a) return k.c; }
    return CORES[0].c;
  };
  const nasce = (emQualquerLugar: boolean): Particula => ({
    x: Math.random() * W,
    y: emQualquerLugar ? Math.random() * H : Math.random() * H * 0.5,
    vida: 60 + Math.random() * 160,
    cor: pick(),
    esp: (0.4 + Math.random() * 1.1) * DPR,
  });

  const resize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width * DPR));
    H = canvas.height = Math.max(1, Math.round(r.height * DPR));
    ctx.fillStyle = FUNDO;
    ctx.fillRect(0, 0, W, H);
    parts = Array.from({ length: Math.min(230, Math.round(W / 9)) }, () => nasce(true));
    // Sem animação, o céu é um frame acumulado — precisa ser redesenhado a cada resize
    if (reduce && W > 1) for (let f = 0; f < 420; f++) passo(f * 16);
  };

  // Redemoinhos suaves — pseudo-noise barato por senos sobrepostos
  const campo = (x: number, y: number, t: number) => {
    const s = 0.0016 / DPR;
    return Math.sin(x * s * 3 + t * 0.00022) * 1.6
      + Math.cos(y * s * 4 - t * 0.00017) * 1.6
      + Math.sin((x + y) * s * 1.5 + t * 0.0001) * 0.9;
  };

  const passo = (t: number) => {
    ctx.fillStyle = 'rgba(10,15,30,0.055)';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const a = campo(p.x, p.y, t);
      const nx = p.x + Math.cos(a) * 1.35 * DPR;
      const ny = p.y + Math.sin(a) * 1.35 * DPR;
      ctx.strokeStyle = `rgba(${p.cor},0.5)`;
      ctx.lineWidth = p.esp;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; p.vida--;
      if (p.vida < 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) parts[i] = nasce(false);
    }
  };

  const loop = (now: number) => { passo(now); raf = requestAnimationFrame(loop); };

  resize();
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', resize);

  if (!reduce) raf = requestAnimationFrame(loop);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('resize', resize);
  };
}
