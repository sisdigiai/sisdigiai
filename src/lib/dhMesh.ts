/**
 * DIGIAI House — motor visual (vanilla, framework-agnóstico).
 * Portado 1:1 da referência verificada (DIGIAI Design System — Brand.dc.html).
 * Sem dependências. Usar via useEffect nas páginas /brand e /referencias-design.
 *
 *   const stop = initConvergenceMesh(canvasEl);   // no unmount: stop()
 *   const stop2 = initReveal(rootEl);
 *
 * Lê o tema de document.documentElement[data-theme] a cada frame (theme-aware).
 */

type Cleanup = () => void;

export function initConvergenceMesh(canvas: HTMLCanvasElement): Cleanup {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1, raf = 0, poll = 0, polls = 0;

  const resize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };

  const N = 42, gold = Math.PI * (3 - Math.sqrt(5));
  const nodes: { x: number; y: number; z: number; accent: boolean }[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = gold * i;
    nodes.push({ x: Math.cos(th) * rad, y, z: Math.sin(th) * rad, accent: i % 7 === 0 });
  }
  const eset = new Set<string>(); const E: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const d: [number, number][] = [];
    for (let j = 0; j < N; j++) if (j !== i) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
      d.push([dx * dx + dy * dy + dz * dz, j]);
    }
    d.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 3; k++) { const j = d[k][1], a = Math.min(i, j), b = Math.max(i, j), key = a + '-' + b; if (!eset.has(key)) { eset.add(key); E.push([a, b]); } }
  }

  let mx = 0, my = 0, tmx = 0, tmy = 0, t = 0;
  const onMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5; };
  const proj = (px: number, py: number, pz: number, rY: number, rX: number, s: number, cx: number, cy: number) => {
    const x = px * Math.cos(rY) - pz * Math.sin(rY), z = px * Math.sin(rY) + pz * Math.cos(rY);
    const y2 = py * Math.cos(rX) - z * Math.sin(rX), z2 = py * Math.sin(rX) + z * Math.cos(rX), persp = 3 / (3 - z2);
    return { sx: cx + x * s * persp, sy: cy + y2 * s * persp, depth: z2, persp };
  };
  const paint = () => {
    if (W <= 1 || H <= 1) return;
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    const cMain = light ? '10,15,30' : '221,226,243', cAcc = light ? '45,75,62' : '143,184,161';
    ctx.clearRect(0, 0, W, H);
    const rotY = t + mx * 0.7, rotX = -0.2 + my * 0.4, scale = Math.min(W, H) * 0.32, cx = W / 2, cy = H / 2;
    const P = nodes.map(n => proj(n.x, n.y, n.z, rotY, rotX, scale, cx, cy));
    const c = proj(0, 0, 0, rotY, rotX, scale, cx, cy);
    for (let i = 0; i < N; i++) { if (!nodes[i].accent) continue; const p = P[i], b = (p.depth + 1) / 2; ctx.strokeStyle = `rgba(${cAcc},${0.2 + b * 0.4})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.sx, c.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke(); }
    for (const [a, b] of E) { const pa = P[a], pb = P[b], dep = (pa.depth + pb.depth) / 2; ctx.strokeStyle = `rgba(${cAcc},${0.05 + (dep + 1) / 2 * 0.13})`; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke(); }
    const order = P.map((p, i) => [p.depth, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    for (const [, i] of order) { const p = P[i], b = (p.depth + 1) / 2, size = (1.5 + b * 3) * p.persp; ctx.fillStyle = nodes[i].accent ? `rgba(${cAcc},${0.55 + b * 0.45})` : `rgba(${cMain},${0.22 + b * 0.55})`; ctx.fillRect(p.sx - size / 2, p.sy - size / 2, size, size); }
    ctx.strokeStyle = light ? 'rgba(10,15,30,0.9)' : 'rgba(248,249,250,0.92)'; ctx.lineWidth = 1.5; ctx.strokeRect(c.sx - 8, c.sy - 8, 16, 16);
    ctx.fillStyle = light ? '#2D4B3E' : '#8FB8A1'; ctx.fillRect(c.sx - 3, c.sy - 3, 6, 6);
  };
  const measure = () => { resize(); paint(); };
  const loop = () => {
    const cr = canvas.getBoundingClientRect();
    if (Math.abs(cr.width - W) > 0.5 || Math.abs(cr.height - H) > 0.5) resize();
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05; if (!reduce) t += 0.0018;
    paint(); raf = requestAnimationFrame(loop);
  };

  resize();
  const ro = window.ResizeObserver ? new ResizeObserver(() => measure()) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', measure);
  window.addEventListener('mousemove', onMove);
  document.addEventListener('visibilitychange', measure);
  window.addEventListener('load', measure);
  measure();
  poll = window.setInterval(() => { measure(); if ((W > 1 && H > 1) || ++polls > 80) { clearInterval(poll); poll = 0; } }, 120);
  loop();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    if (poll) clearInterval(poll);
    ro?.disconnect();
    window.removeEventListener('resize', measure);
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('visibilitychange', measure);
    window.removeEventListener('load', measure);
  };
}

/**
 * Reveal on-enter + count-up ([data-count], data-pre/suf/dec) + draw-in ([data-draw]).
 * Marque elementos com data-reveal / data-draw / data-count no JSX.
 */
export function initReveal(root: HTMLElement): Cleanup {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counterOf = (el: HTMLElement) => (el.matches('[data-count]') ? el : el.querySelector<HTMLElement>('[data-count]'));
  const setCount = (el: HTMLElement, v: number) => {
    const dec = parseInt(el.dataset.dec || '0', 10), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    el.textContent = pre + v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
  };
  const animateCount = (el: HTMLElement) => {
    const target = parseFloat(el.dataset.count || '0'), dur = 1100, start = performance.now();
    const tick = (now: number) => { let p = Math.min(1, (now - start) / dur); p = 1 - Math.pow(1 - p, 3); setCount(el, target * p); if (p < 1) requestAnimationFrame(tick); else setCount(el, target); };
    requestAnimationFrame(tick);
  };
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal],[data-draw],[data-count]'));
  if (reduce) { els.forEach(el => { const c = counterOf(el); if (c) setCount(c, parseFloat(c.dataset.count || '0')); }); return () => {}; }
  els.forEach(el => {
    if (el.hasAttribute('data-draw')) { el.style.transform = 'scaleX(0)'; el.style.transformOrigin = 'left center'; el.style.transition = 'transform 0.8s cubic-bezier(0,0,0.2,1)'; }
    else if (el.hasAttribute('data-reveal')) {
      const sibs = Array.from(el.parentElement?.children || []).filter(c => (c as HTMLElement).hasAttribute('data-reveal'));
      el.style.opacity = '0'; el.style.transform = 'translateY(18px)';
      el.style.transition = 'opacity 0.7s cubic-bezier(0,0,0.2,1), transform 0.7s cubic-bezier(0,0,0.2,1)';
      el.style.transitionDelay = Math.max(0, sibs.indexOf(el)) * 0.06 + 's';
    }
    const c = counterOf(el); if (c) setCount(c, 0);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target as HTMLElement;
      if (el.hasAttribute('data-draw')) el.style.transform = 'scaleX(1)';
      else if (el.hasAttribute('data-reveal')) { el.style.opacity = '1'; el.style.transform = 'none'; }
      const c = counterOf(el); if (c) animateCount(c);
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
  return () => io.disconnect();
}
