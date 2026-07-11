import { useState } from 'react';

/**
 * Aba "Clearix Lens" do módulo Brand Guidelines (app DIGIAI).
 *
 * REGRA: o brand guidelines de TODAS as marcas vive aqui, no app da empresa,
 * como abas. Esta é a aba do produto-âncora Clearix.
 *
 * A paleta Clearix (blue/cyan/zinc-warm, cantos arredondados, sombras) é
 * ESCOPADA em variáveis --cx-* no wrapper `.cxb`, para não vazar sobre os
 * tokens DIGIAI House (forest/navy) do resto do app. Segue o mesmo
 * data-theme global (claro/escuro) alternado no <html>.
 *
 * Fonte visual: "Clearix Lens — Brand.dc.html" (protótipo aprovado).
 * DS canônico: D:\OneDrive\...\clearix\01-brand\assets\DESIGN_canonico.md
 */

const SCOPED_CSS = `
.cxb{
  --cx-sans:'Inter',ui-sans-serif,system-ui,sans-serif; --cx-mono:'JetBrains Mono',ui-monospace,monospace;
  --cx-text:#1C1917; --cx-text-2:#57534E; --cx-muted:#78716C; --cx-on-primary:#FFFFFF;
  --cx-surface:#FAFAF9; --cx-raised:#FFFFFF; --cx-overlay:#FFFFFF; --cx-sunken:#F5F5F4;
  --cx-bd-subtle:#E7E5E4; --cx-bd:#D6D3D1; --cx-bd-strong:#A8A29E; --cx-focus:#2563EB;
  --cx-action:#2563EB; --cx-action-hover:#1D4ED8; --cx-secondary:#E7E5E4; --cx-secondary-hover:#D6D3D1;
  --cx-link:#1D4ED8; --cx-blue-500:#2563EB; --cx-cyan-500:#06B6D4;
  --cx-su-bg:#ECFDF5; --cx-su-tx:#047857; --cx-su-bd:#A7F3D0;
  --cx-wa-bg:#FFFBEB; --cx-wa-tx:#B45309; --cx-wa-bd:#FDE68A;
  --cx-in-bg:#EFF6FF; --cx-in-tx:#1D4ED8; --cx-in-bd:#BFDBFE;
  --cx-da-bg:#FEF2F2; --cx-da-tx:#B91C1C; --cx-da-bd:#FECACA;
  --cx-ac-bg:#FFF7ED; --cx-ac-tx:#C2410C; --cx-ac-bd:#FED7AA;
  --cx-brand-mark:#1A3A5C; --cx-brand-dot:#06B6D4; --cx-wordmark-2:#57534E;
  --cx-el-1:0 1px 2px rgba(0,0,0,.04),0 1px 1px rgba(0,0,0,.03);
  --cx-el-2:0 2px 4px rgba(0,0,0,.06),0 4px 8px rgba(0,0,0,.04);
  --cx-el-3:0 4px 8px rgba(0,0,0,.08),0 8px 16px rgba(0,0,0,.06);
  --cx-el-4:0 8px 16px rgba(0,0,0,.10),0 16px 32px rgba(0,0,0,.08);
  --cx-grid:rgba(37,99,235,.05);
  background:var(--cx-surface); color:var(--cx-text);
  font-family:var(--cx-sans); line-height:1.55;
}
:root[data-theme="dark"] .cxb, .dark .cxb{
  --cx-text:#F5F5F4; --cx-text-2:#A8A29E; --cx-muted:#78716C; --cx-on-primary:#1C1917;
  --cx-surface:#1C1917; --cx-raised:#292524; --cx-overlay:#292524; --cx-sunken:#0C0A09;
  --cx-bd-subtle:#292524; --cx-bd:#44403C; --cx-bd-strong:#57534E; --cx-focus:#93C5FD;
  --cx-action:#93C5FD; --cx-action-hover:#BFDBFE; --cx-secondary:#44403C; --cx-secondary-hover:#57534E;
  --cx-link:#93C5FD;
  --cx-su-bg:#022C22; --cx-su-tx:#6EE7B7; --cx-su-bd:#065F46;
  --cx-wa-bg:#451A03; --cx-wa-tx:#FCD34D; --cx-wa-bd:#92400E;
  --cx-in-bg:#172554; --cx-in-tx:#93C5FD; --cx-in-bd:#1E3A8A;
  --cx-da-bg:#450A0A; --cx-da-tx:#FCA5A5; --cx-da-bd:#991B1B;
  --cx-ac-bg:#431407; --cx-ac-tx:#FDBA74; --cx-ac-bd:#9A3412;
  --cx-brand-mark:#93C5FD; --cx-brand-dot:#67E8F9; --cx-wordmark-2:#A8A29E;
  --cx-el-1:0 1px 2px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04);
  --cx-el-2:0 2px 4px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05);
  --cx-el-3:0 4px 12px rgba(0,0,0,.6),0 0 0 1px rgba(6,182,212,.08);
  --cx-el-4:0 8px 24px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.06);
  --cx-grid:rgba(147,197,253,.06);
}
.cxb .cx-tnum{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}
@keyframes cx-shimmer{0%{background-position:-360px 0}100%{background-position:360px 0}}
`;

const BLUE = [['50','#EFF6FF'],['100','#DBEAFE'],['200','#BFDBFE'],['300','#93C5FD'],['400','#60A5FA'],['500','#2563EB'],['600','#1D4ED8'],['700','#1E40AF'],['800','#1E3A8A'],['900','#1E2E78'],['950','#172554']];
const CYAN = [['50','#ECFEFF'],['100','#CFFAFE'],['200','#A5F3FC'],['300','#67E8F9'],['400','#22D3EE'],['500','#06B6D4'],['600','#0891B2'],['700','#0E7490'],['800','#155E75'],['900','#164E63'],['950','#083344']];
const NEUTRAL = [['50','#FAFAF9'],['100','#F5F5F4'],['200','#E7E5E4'],['300','#D6D3D1'],['400','#A8A29E'],['500','#78716C'],['600','#57534E'],['700','#44403C'],['800','#292524'],['900','#1C1917'],['950','#0C0A09']];

const TYPE = [
  { role: 'Display XL', meta: 'Inter 700 · 60/1.05', ff: 'var(--cx-sans)', size: 48, w: 700, tr: '-0.03em', s: 'Clareza com profundidade' },
  { role: 'Heading LG', meta: 'Inter 600 · 30/1.25', ff: 'var(--cx-sans)', size: 28, w: 600, tr: '-0.02em', s: 'Gestão óptica de precisão' },
  { role: 'Body MD', meta: 'Inter 400 · 16/1.55', ff: 'var(--cx-sans)', size: 16, w: 400, tr: '0', s: 'Alta densidade de informação com espaçamento respirável.' },
  { role: 'Label MD', meta: 'Mono 500 · 13 · +4%', ff: 'var(--cx-mono)', size: 13, w: 500, tr: '0.04em', s: 'STATUS DO PEDIDO' },
  { role: 'Data tabular', meta: 'Mono 400 · tnum', ff: 'var(--cx-mono)', size: 14, w: 400, tr: '0', s: 'R$ 18.750,00 · OD -2.25 · 22/05/2026' },
];

const RADII = [['sm','4px'],['md','6px'],['lg','8px'],['xl','12px'],['2xl','16px'],['full','9999px']];

const KPIS = [
  { label: 'Vendas do mês', value: 'R$ 87.320', delta: '12,5%' },
  { label: 'Pedidos ativos', value: '128', delta: '8 hoje' },
  { label: 'Ticket médio', value: 'R$ 682', delta: '4,1%' },
];

const ROWS = [
  { ini: 'MC', name: 'Maria Clara Souza', status: '● Entregue', tone: 'su', loja: 'Centro SP', valor: 'R$ 1.299,00', av: '#2563EB' },
  { ini: 'JP', name: 'João Pedro Alves', status: '◐ Produção', tone: 'wa', loja: 'Suzano', valor: 'R$ 890,00', av: '#06B6D4' },
  { ini: 'RF', name: 'Renata Ferreira', status: '◆ Novo', tone: 'in', loja: 'Mogi', valor: 'R$ 2.150,00', av: '#0891B2' },
  { ini: 'CL', name: 'Carlos Lima', status: '● Entregue', tone: 'su', loja: 'Centro SP', valor: 'R$ 640,00', av: '#1D4ED8' },
];

function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Clearix Lens">
      <path d="M 74.75 25.25 A 35 35 0 1 0 74.75 74.75" stroke="var(--cx-brand-mark)" strokeWidth="14" strokeLinecap="round" />
      <circle cx="85" cy="50" r="7" fill="var(--cx-brand-dot)" />
    </svg>
  );
}

function Ramp({ title, ramp }: { title: string; ramp: string[][] }) {
  return (
    <>
      <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cx-muted)', margin: '0 0 14px' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11,1fr)', gap: 1, background: 'var(--cx-bd-subtle)', border: '1px solid var(--cx-bd-subtle)', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        {ramp.map(([step, hex]) => (
          <div key={step} style={{ background: 'var(--cx-raised)' }}>
            <div style={{ height: 52, background: hex }} />
            <div style={{ padding: '7px 5px' }}>
              <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 9, color: 'var(--cx-text)' }}>{step}</div>
              <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 8, color: 'var(--cx-muted)' }}>{hex}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const label = { fontFamily: 'var(--cx-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--cx-muted)', margin: '0 0 14px' };
const kicker = { fontFamily: 'var(--cx-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--cx-action)', marginBottom: 12 };
const toneBg = (t: string) => `var(--cx-${t}-bg)`, toneTx = (t: string) => `var(--cx-${t}-tx)`, toneBd = (t: string) => `var(--cx-${t}-bd)`;

export default function BrandClearixLens() {
  const [modalPulse, setModalPulse] = useState(false);
  return (
    <div className="cxb" style={{ minHeight: '100vh' }}>
      <style>{SCOPED_CSS}</style>

      {/* COVER */}
      <section style={{ borderBottom: '1px solid var(--cx-bd-subtle)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--cx-grid) 1px,transparent 1px),linear-gradient(90deg,var(--cx-grid) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 40px 64px', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 56, alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={kicker}>Ecossistema Clearix · Produto-âncora DIGIAI</div>
            <h1 style={{ fontWeight: 700, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 18px', color: 'var(--cx-text)' }}>Clareza com<br />profundidade.</h1>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--cx-text-2)', margin: '0 0 20px', maxWidth: '34ch' }}>A clareza que transforma informação em decisão. Ótica de precisão para ambientes de alta performance.</p>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--cx-muted)', maxWidth: '52ch', margin: 0 }}>Geometria precisa no lugar de ornamentação. A metáfora física do vidro e da luz — interfaces que focam e refratam os dados cruciais. Blue e cyan protagonistas; neutros zinc-warm.</p>
          </div>
          <div style={{ border: '1px solid var(--cx-bd)', borderRadius: 16, background: 'var(--cx-raised)', boxShadow: 'var(--cx-el-3)', padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0 28px' }}><Logo size={140} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['Ação', 'var(--cx-blue-500)'], ['Refração', 'var(--cx-cyan-500)'], ['Base', '#78716C']].map(([n, c]) => (
                <div key={n} style={{ textAlign: 'center', padding: '12px 6px', border: '1px solid var(--cx-bd-subtle)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{n}</div>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: c, margin: '8px auto 0' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COR */}
      <section style={{ borderBottom: '1px solid var(--cx-bd-subtle)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 40px' }}>
          <div style={kicker}>§ 01 — Cor</div>
          <h2 style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--cx-text)' }}>Blue e cyan protagonistas.</h2>
          <p style={{ fontSize: 15, color: 'var(--cx-text-2)', maxWidth: '60ch', margin: '0 0 32px' }}>Arquitetura de 3 camadas. Neutros zinc-warm. Ação = blue; no dark, clareia para blue-300 (WCAG AA 4.5:1).</p>
          <Ramp title="Blue — anchor" ramp={BLUE} />
          <Ramp title="Cyan — refração" ramp={CYAN} />
          <Ramp title="Neutral — zinc warm" ramp={NEUTRAL} />
          <div style={{ ...label }}>Status semânticos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['su', '● SUCCESS', 'Operação concluída'], ['wa', '▲ WARNING', 'Requer atenção'], ['in', '◆ INFO', 'Contexto do sistema'], ['da', '✕ DANGER', 'Ação irreversível']].map(([t, h, d]) => (
              <div key={t} style={{ border: `1px solid ${toneBd(t)}`, background: toneBg(t), borderRadius: 8, padding: 16 }}>
                <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, color: toneTx(t), letterSpacing: '0.06em' }}>{h}</div>
                <div style={{ fontSize: 12, color: toneTx(t), opacity: 0.8, marginTop: 6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIPO */}
      <section style={{ borderBottom: '1px solid var(--cx-bd-subtle)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 40px' }}>
          <div style={kicker}>§ 02 — Tipografia</div>
          <h2 style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--cx-text)' }}>Inter + JetBrains Mono.</h2>
          <p style={{ fontSize: 15, color: 'var(--cx-text-2)', maxWidth: '60ch', margin: '0 0 28px' }}>Duas famílias, sem exceção. Numéricos tabulares obrigatórios em valores, dioptrias, datas e IDs.</p>
          <div style={{ border: '1px solid var(--cx-bd-subtle)', borderRadius: 12, overflow: 'hidden' }}>
            {TYPE.map((t) => (
              <div key={t.role} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 24, padding: '18px 24px', borderBottom: '1px solid var(--cx-bd-subtle)', alignItems: 'baseline', background: 'var(--cx-raised)' }}>
                <div><div style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, color: 'var(--cx-text)' }}>{t.role}</div><div style={{ fontFamily: 'var(--cx-mono)', fontSize: 9, color: 'var(--cx-muted)', marginTop: 3 }}>{t.meta}</div></div>
                <div style={{ fontFamily: t.ff, fontSize: t.size, fontWeight: t.w, letterSpacing: t.tr, color: 'var(--cx-text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
            <div>
              <div style={label}>Radius — arredondado escalonado</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {RADII.map(([n, px]) => (
                  <div key={n} style={{ textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, background: 'var(--cx-blue-500)', borderRadius: px }} />
                    <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 9, color: 'var(--cx-muted)', marginTop: 6 }}>{n}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={label}>Elevação — sombra multi-camada</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {['1', '2', '3'].map((n) => (
                  <div key={n} style={{ flex: 1, height: 64, background: 'var(--cx-raised)', borderRadius: 8, boxShadow: `var(--cx-el-${n})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-muted)' }}>el-{n}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPONENTES */}
      <section style={{ background: 'var(--cx-sunken)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 40px' }}>
          <div style={kicker}>§ 03 — Componentes</div>
          <h2 style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', margin: '0 0 32px', color: 'var(--cx-text)' }}>Biblioteca operacional.</h2>

          {/* Botões */}
          <div style={label}>Botões · Primary é único na tela</div>
          <div style={{ border: '1px solid var(--cx-bd-subtle)', background: 'var(--cx-raised)', borderRadius: 12, boxShadow: 'var(--cx-el-1)', padding: 26, marginBottom: 28, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={{ fontSize: 14, fontWeight: 600, background: 'var(--cx-action)', color: 'var(--cx-on-primary)', border: 'none', padding: '10px 18px', borderRadius: 6, cursor: 'pointer', boxShadow: 'var(--cx-el-1)' }}>Primary</button>
            <button style={{ fontSize: 14, fontWeight: 600, background: 'var(--cx-secondary)', color: 'var(--cx-text)', border: 'none', padding: '10px 18px', borderRadius: 6, cursor: 'pointer' }}>Secondary</button>
            <button style={{ fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--cx-text)', border: '1px solid var(--cx-bd)', padding: '10px 18px', borderRadius: 6, cursor: 'pointer' }}>Tertiary</button>
            <button style={{ fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--cx-text-2)', border: 'none', padding: '10px 14px', borderRadius: 6, cursor: 'pointer' }}>Ghost</button>
            <button style={{ fontSize: 14, fontWeight: 600, background: '#EF4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, cursor: 'pointer' }}>Destructive</button>
            <a href="#clearix" style={{ fontSize: 14, fontWeight: 600, color: 'var(--cx-link)', padding: '10px 4px' }}>Link →</a>
          </div>

          {/* Inputs + tri-state */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 28 }}>
            <div>
              <div style={label}>Campos · label sempre acima</div>
              <div style={{ border: '1px solid var(--cx-bd-subtle)', background: 'var(--cx-raised)', borderRadius: 12, boxShadow: 'var(--cx-el-1)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'block' }}><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cx-text)', display: 'block', marginBottom: 7 }}>Paciente</span><input type="text" placeholder="Buscar por nome ou CPF" style={{ width: '100%', background: 'var(--cx-surface)', border: '1px solid var(--cx-bd)', borderRadius: 6, color: 'var(--cx-text)', padding: '10px 12px', fontSize: 14, outline: 'none' }} /></label>
                <label style={{ display: 'block' }}><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cx-da-tx)', display: 'block', marginBottom: 7 }}>Dioptria (com erro)</span><input type="text" defaultValue="+9.99" style={{ width: '100%', background: 'var(--cx-surface)', border: '1px solid var(--cx-da-bd)', borderRadius: 6, color: 'var(--cx-text)', padding: '10px 12px', fontSize: 14, outline: 'none' }} /><span style={{ fontSize: 12, color: 'var(--cx-da-tx)', marginTop: 6, display: 'block' }}>Valor fora do intervalo clínico.</span></label>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}><span style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid var(--cx-action)', background: 'var(--cx-action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 5, height: 9, borderRight: '2px solid var(--cx-on-primary)', borderBottom: '2px solid var(--cx-on-primary)', transform: 'rotate(45deg) translateY(-1px)' }} /></span><span style={{ fontSize: 14 }}>Ativo</span></label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}><span style={{ width: 36, height: 20, borderRadius: 9999, background: 'var(--cx-action)', position: 'relative', display: 'block' }}><span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--cx-on-primary)' }} /></span><span style={{ fontSize: 14 }}>Notificar</span></label>
                </div>
              </div>
            </div>
            <div>
              <div style={label}>Filtro tri-state · diferencial Clearix</div>
              <div style={{ border: '1px solid var(--cx-bd-subtle)', background: 'var(--cx-raised)', borderRadius: 12, boxShadow: 'var(--cx-el-1)', padding: 24 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 12, background: 'var(--cx-sunken)', color: 'var(--cx-text-2)', border: '1px solid var(--cx-bd)', borderRadius: 9999, padding: '6px 14px' }}>Antirreflexo</span>
                  <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 12, background: 'var(--cx-su-bg)', color: 'var(--cx-su-tx)', border: '1px solid var(--cx-su-bd)', borderRadius: 9999, padding: '6px 14px' }}>✓ Multifocal</span>
                  <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 12, background: 'var(--cx-da-bg)', color: 'var(--cx-da-tx)', border: '1px solid var(--cx-da-bd)', borderRadius: 9999, padding: '6px 14px' }}>✕ Fotossensível</span>
                  <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 12, background: 'var(--cx-sunken)', color: 'var(--cx-text-2)', border: '1px solid var(--cx-bd)', borderRadius: 9999, padding: '6px 14px' }}>Blue-light</span>
                </div>
                <div style={{ marginTop: 16, fontFamily: 'var(--cx-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cx-muted)' }}>Neutro → <span style={{ color: 'var(--cx-su-tx)' }}>Incluir</span> → <span style={{ color: 'var(--cx-da-tx)' }}>Excluir</span></div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--cx-bd-subtle)', fontSize: 13, color: 'var(--cx-text-2)' }}><span className="cx-tnum" style={{ fontFamily: 'var(--cx-mono)', color: 'var(--cx-action)' }}>24</span> lentes correspondem aos filtros.</div>
              </div>
            </div>
          </div>

          {/* KPIs + badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr) 1.3fr', gap: 16, marginBottom: 28 }}>
            {KPIS.map((k) => (
              <div key={k.label} style={{ border: '1px solid var(--cx-bd-subtle)', background: 'var(--cx-raised)', borderRadius: 12, boxShadow: 'var(--cx-el-1)', padding: 18 }}>
                <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cx-muted)' }}>{k.label}</div>
                <div className="cx-tnum" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--cx-text)', marginTop: 10 }}>{k.value}</div>
                <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, color: 'var(--cx-su-tx)', marginTop: 8 }}>↑ {k.delta}</div>
              </div>
            ))}
            <div style={{ border: '1px solid var(--cx-bd-subtle)', background: 'var(--cx-raised)', borderRadius: 12, boxShadow: 'var(--cx-el-1)', padding: 18 }}>
              <div style={{ ...label, marginBottom: 14 }}>Badges & status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['su', '● Entregue'], ['wa', '◐ Em produção'], ['in', '◆ Novo'], ['da', '✕ Cancelado'], ['ac', 'AR Vision']].map(([t, h]) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 500, color: toneTx(t), background: toneBg(t), border: `1px solid ${toneBd(t)}`, borderRadius: 9999, padding: '3px 10px' }}>{h}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div style={label}>Tabela enriquecida · componente mais usado</div>
          <div style={{ border: '1px solid var(--cx-bd-subtle)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--cx-el-1)', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--cx-raised)', borderBottom: '1px solid var(--cx-bd-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--cx-text)' }}>Pedidos <span className="cx-tnum" style={{ fontFamily: 'var(--cx-mono)', fontSize: 12, color: 'var(--cx-muted)', fontWeight: 400 }}>· 128</span></div>
              <div style={{ display: 'flex', gap: 8 }}><button style={{ fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid var(--cx-bd)', borderRadius: 6, padding: '7px 12px', color: 'var(--cx-text)', cursor: 'pointer' }}>Exportar</button><button style={{ fontSize: 12, fontWeight: 600, background: 'var(--cx-action)', color: 'var(--cx-on-primary)', border: 'none', borderRadius: 6, padding: '7px 12px', cursor: 'pointer' }}>+ Novo</button></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .8fr 1fr', background: 'var(--cx-sunken)', fontFamily: 'var(--cx-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cx-muted)' }}>
              <div style={{ padding: '10px 18px' }}>Paciente</div><div style={{ padding: '10px 18px' }}>Status</div><div style={{ padding: '10px 18px' }}>Loja</div><div style={{ padding: '10px 18px', textAlign: 'right' }}>Valor</div>
            </div>
            {ROWS.map((r) => (
              <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .8fr 1fr', alignItems: 'center', background: 'var(--cx-raised)', borderTop: '1px solid var(--cx-bd-subtle)' }}>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 28, height: 28, borderRadius: 9999, background: r.av, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.ini}</span><span style={{ fontSize: 13, color: 'var(--cx-text)' }}>{r.name}</span></div>
                <div style={{ padding: '12px 18px' }}><span style={{ fontSize: 11, fontWeight: 500, color: toneTx(r.tone), background: toneBg(r.tone), border: `1px solid ${toneBd(r.tone)}`, borderRadius: 9999, padding: '3px 10px' }}>{r.status}</span></div>
                <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--cx-text-2)' }}>{r.loja}</div>
                <div className="cx-tnum" style={{ padding: '12px 18px', textAlign: 'right', fontFamily: 'var(--cx-mono)', fontSize: 13, color: 'var(--cx-text)' }}>{r.valor}</div>
              </div>
            ))}
          </div>

          {/* Overlays + feedback */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22 }}>
            <div>
              <div style={label}>Modal · abrir spring, fechar ease-in</div>
              <div style={{ border: '1px solid var(--cx-bd-subtle)', background: 'var(--cx-sunken)', borderRadius: 12, padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 380, background: 'var(--cx-overlay)', border: '1px solid var(--cx-bd)', borderRadius: 16, boxShadow: 'var(--cx-el-4)', overflow: 'hidden', transform: modalPulse ? 'scale(1.015)' : 'scale(1)', transition: 'transform .2s cubic-bezier(0.34,1.2,0.64,1)' }}>
                  <div style={{ height: 3, background: 'var(--cx-action)' }} />
                  <div style={{ padding: 22 }}><h3 style={{ fontWeight: 600, fontSize: 19, margin: '0 0 8px', color: 'var(--cx-text)' }}>Confirmar entrega</h3><p style={{ fontSize: 13, color: 'var(--cx-text-2)', margin: 0, lineHeight: 1.5 }}>O pedido #2026-0891 será marcado como entregue ao paciente.</p></div>
                  <div style={{ padding: '14px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--cx-bd-subtle)' }}><button style={{ fontSize: 13, fontWeight: 600, background: 'var(--cx-secondary)', color: 'var(--cx-text)', border: 'none', borderRadius: 6, padding: '9px 16px', cursor: 'pointer' }}>Cancelar</button><button onMouseEnter={() => setModalPulse(true)} onMouseLeave={() => setModalPulse(false)} style={{ fontSize: 13, fontWeight: 600, background: 'var(--cx-action)', color: 'var(--cx-on-primary)', border: 'none', borderRadius: 6, padding: '9px 16px', cursor: 'pointer' }}>Confirmar entrega</button></div>
                </div>
              </div>
            </div>
            <div>
              <div style={label}>Feedback · toast, alert, skeleton</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--cx-overlay)', border: '1px solid var(--cx-bd-subtle)', borderLeft: '4px solid #10B981', borderRadius: 8, boxShadow: 'var(--cx-el-2)', padding: '13px 15px' }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cx-text)' }}>Pedido confirmado!</div><div style={{ fontSize: 12, color: 'var(--cx-text-2)', marginTop: 2 }}>Atualizamos o status para o paciente.</div></div>
                <div style={{ background: 'var(--cx-wa-bg)', border: '1px solid var(--cx-wa-bd)', borderRadius: 8, padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ color: 'var(--cx-wa-tx)', fontSize: 13 }}>▲</span><div style={{ fontSize: 13, color: 'var(--cx-wa-tx)' }}>Estoque da lente multifocal abaixo do mínimo.</div></div>
                <div style={{ background: 'var(--cx-overlay)', border: '1px solid var(--cx-bd-subtle)', borderRadius: 8, padding: 15 }}>
                  <div style={{ height: 12, borderRadius: 4, background: 'linear-gradient(90deg,var(--cx-sunken) 0px,var(--cx-bd-subtle) 180px,var(--cx-sunken) 360px)', backgroundSize: '720px 100%', animation: 'cx-shimmer 1.5s linear infinite', width: '70%' }} />
                  <div style={{ height: 12, borderRadius: 4, marginTop: 9, background: 'linear-gradient(90deg,var(--cx-sunken) 0px,var(--cx-bd-subtle) 180px,var(--cx-sunken) 360px)', backgroundSize: '720px 100%', animation: 'cx-shimmer 1.5s linear infinite', width: '45%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: 'var(--cx-surface)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'var(--cx-muted)' }}>CLEARIX LENS · DESIGN SYSTEM v1.0 · PRODUTO-ÂNCORA DIGIAI</span>
          <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'var(--cx-muted)' }}>Clareza que transforma informação em decisão.</span>
        </div>
      </footer>
    </div>
  );
}
