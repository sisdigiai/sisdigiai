import { useEffect, useRef } from 'react';
import { initCeuDeDados } from '../lib/atelieCeu';

/**
 * Aba MKT do Brand Guidelines — "Ateliê de Convergência".
 * Exposição do tema visual do digiai_mkt (produto): a precisão geométrica
 * da casa fragmentada em planos cubistas + movimento em pincelada Van Gogh.
 * As cores aqui são CONTEÚDO do tema exibido (regra 5 do design system:
 * hex como conteúdo/produto é ok) — escopadas em .atl-root, sem tocar
 * nos tokens globais do app. Tema único escuro, deliberado (o mkt é dark-first).
 */

const CSS = `
.atl-root{
  --atl-noite:#0A0F1E; --atl-plano:#111A2E; --atl-plano-2:#0C1322;
  --atl-linha:#243350; --atl-linha-forte:#38507C;
  --atl-clarity:#F0F4F8; --atl-texto-2:#9FB0C6; --atl-texto-3:#5E7191;
  --atl-forest-acao:#7FB09A; --atl-trigo:#E8B94A; --atl-ciano:#00E0CA; --atl-magenta:#FF4D9C;
  background:var(--atl-noite); color:var(--atl-clarity);
  font-family:var(--font-sans); line-height:1.6;
}
.atl-root ::selection{background:var(--atl-trigo);color:var(--atl-noite);}
.atl-hero{position:relative;min-height:72vh;display:flex;flex-direction:column;justify-content:flex-end;padding:3rem clamp(1.25rem,5vw,4rem) 4rem;overflow:hidden;}
.atl-ceu{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
.atl-hero-conteudo{position:relative;max-width:60rem;}
.atl-selo{font-family:var(--font-mono);font-size:.65rem;letter-spacing:.28em;text-transform:uppercase;color:var(--atl-texto-3);display:flex;gap:1rem;align-items:center;margin-bottom:1.4rem;}
.atl-selo b{color:var(--atl-ciano);font-weight:500;}
.atl-selo::before{content:'';width:2.2rem;height:1px;background:var(--atl-linha-forte);display:inline-block;}
.atl-h1{font-family:var(--font-serif);font-weight:600;font-style:italic;font-size:clamp(2.2rem,5.5vw,4.4rem);line-height:1.02;margin:0 0 1.2rem;letter-spacing:-0.015em;}
.atl-h1 .atl-corte{color:var(--atl-trigo);font-style:normal;}
.atl-tese{max-width:44ch;color:var(--atl-texto-2);font-size:clamp(1rem,1.3vw,1.1rem);margin:0;}
.atl-tese em{color:var(--atl-clarity);font-style:normal;border-bottom:2px solid var(--atl-magenta);}
.atl-sec{padding:4rem clamp(1.25rem,5vw,4rem);position:relative;}
.atl-faixa{font-family:var(--font-mono);font-size:.65rem;letter-spacing:.28em;color:var(--atl-texto-3);text-transform:uppercase;margin-bottom:.6rem;}
.atl-faixa b{color:var(--atl-trigo);font-weight:500;}
.atl-h2{font-family:var(--font-serif);font-style:italic;font-weight:600;font-size:clamp(1.6rem,3vw,2.4rem);line-height:1.1;margin:0 0 .9rem;letter-spacing:-0.01em;}
.atl-sub{max-width:58ch;color:var(--atl-texto-2);margin:0 0 2.2rem;}
.atl-sub strong{color:var(--atl-clarity);font-weight:600;}
.atl-sub code{font-family:var(--font-mono);font-size:.85em;background:var(--atl-plano);border:1px solid var(--atl-linha);padding:.08em .4em;color:var(--atl-ciano);}
.atl-plano{position:relative;background:var(--atl-plano);border:1px solid var(--atl-linha);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));padding:1.4rem 1.5rem 1.5rem;}
.atl-wrap{position:relative;}
.atl-wrap::before{content:'';position:absolute;inset:0;transform:translate(9px,9px);background:var(--atl-plano-2);border:1px solid var(--atl-linha);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));}
.atl-wrap.p-ciano .atl-plano{border-color:rgba(0,224,202,.45);}
.atl-wrap.p-magenta .atl-plano{border-color:rgba(255,77,156,.5);}
.atl-wrap.p-trigo .atl-plano{border-color:rgba(232,185,74,.5);}
.atl-rotulo{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;color:var(--atl-texto-3);}
.atl-rotulo.r-ciano{color:var(--atl-ciano);} .atl-rotulo.r-magenta{color:var(--atl-magenta);} .atl-rotulo.r-trigo{color:var(--atl-trigo);}
.atl-grade{display:grid;gap:1.1rem;grid-template-columns:repeat(12,1fr);align-items:stretch;}
.atl-ga{grid-column:span 5;} .atl-gb{grid-column:span 3;} .atl-gc{grid-column:span 4;}
.atl-gd{grid-column:span 4;} .atl-ge{grid-column:span 8;}
@media (max-width:860px){.atl-ga,.atl-gb,.atl-gc,.atl-gd,.atl-ge{grid-column:span 12;}}
.atl-kpi{font-family:var(--font-serif);font-style:italic;font-weight:600;font-size:clamp(2.4rem,4.5vw,3.8rem);line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;margin:.35rem 0 .25rem;}
.atl-apoio{font-size:.85rem;color:var(--atl-texto-2);}
.atl-apoio b{color:var(--atl-clarity);font-weight:600;}
.atl-pincel{height:4px;width:56%;margin-top:.9rem;border-radius:2px;}
.atl-pincel.viva{background:linear-gradient(90deg,var(--atl-ciano),transparent);}
.atl-pincel.humana{background:linear-gradient(90deg,var(--atl-magenta),transparent);}
.atl-pincel.guia{background:linear-gradient(90deg,var(--atl-trigo),transparent);}
.atl-fila{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px dashed var(--atl-linha);font-size:.9rem;}
.atl-fila:last-of-type{border-bottom:0;}
.atl-chip{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;padding:.2rem .55rem;border:1px solid;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px);white-space:nowrap;}
.atl-chip.no-ar{color:var(--atl-ciano);border-color:rgba(0,224,202,.5);}
.atl-chip.sua-vez{color:var(--atl-magenta);border-color:rgba(255,77,156,.55);}
.atl-chip.guia{color:var(--atl-trigo);border-color:rgba(232,185,74,.55);}
.atl-acao{display:inline-block;font-family:var(--font-mono);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--atl-noite);background:var(--atl-forest-acao);border:1px solid var(--atl-forest-acao);padding:.7rem 1.3rem;margin-top:1.1rem;cursor:pointer;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);transition:transform .15s ease;}
.atl-acao:hover{transform:translate(-2px,-2px);}
.atl-acao.magenta{background:var(--atl-magenta);border-color:var(--atl-magenta);}
.atl-graf{width:100%;height:auto;display:block;}
.atl-legenda{display:flex;gap:1.4rem;flex-wrap:wrap;margin-top:.8rem;}
.atl-legenda span{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--atl-texto-3);display:flex;align-items:center;gap:.45rem;}
.atl-tra{width:1.4rem;height:3px;display:inline-block;border-radius:2px;}
.atl-assin-caixa{display:flex;gap:2rem;align-items:center;flex-wrap:wrap;}
.atl-assin path{stroke-dasharray:640;stroke-dashoffset:640;}
.atl-wrap:hover .atl-assin path,.atl-assin.desenhada path{animation:atl-desenhar 1.6s ease forwards;}
@keyframes atl-desenhar{to{stroke-dashoffset:0;}}
.atl-duelo{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;}
@media (max-width:760px){.atl-duelo{grid-template-columns:1fr;}}
.atl-duelo-t{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.24em;text-transform:uppercase;margin-bottom:.8rem;color:var(--atl-texto-3);}
.atl-depois .atl-duelo-t{color:var(--atl-trigo);}
.atl-mock-antes{background:#0d1622;border:1px solid rgba(255,255,255,.1);border-radius:.65rem;padding:1.1rem;}
.atl-mock-antes .atl-glow{color:#00e0ca;text-shadow:0 0 16px rgba(0,224,202,.35);font-family:var(--font-mono);font-size:1.6rem;}
.atl-mock-antes p{color:#9fb0c3;font-size:.8rem;margin:.4rem 0 0;}
.atl-regras{width:100%;border-collapse:collapse;font-size:.88rem;}
.atl-regras th{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--atl-texto-3);text-align:left;padding:.6rem .8rem;border-bottom:1px solid var(--atl-linha-forte);font-weight:500;}
.atl-regras td{padding:.65rem .8rem;border-bottom:1px dashed var(--atl-linha);vertical-align:top;}
.atl-regras td:first-child{color:var(--atl-clarity);font-weight:600;white-space:nowrap;}
.atl-regras td:last-child{color:var(--atl-texto-2);}
.atl-scroll{overflow-x:auto;}
.atl-fases{display:grid;grid-template-columns:repeat(4,1fr);gap:1.1rem;}
@media (max-width:900px){.atl-fases{grid-template-columns:1fr 1fr;}}
@media (max-width:560px){.atl-fases{grid-template-columns:1fr;}}
.atl-fase{border-top:2px solid var(--atl-linha-forte);padding-top:.9rem;}
.atl-fase .atl-fn{font-family:var(--font-serif);font-style:italic;font-size:2rem;color:var(--atl-trigo);line-height:1;}
.atl-fase h3{font-size:.95rem;margin:.4rem 0 .3rem;font-weight:600;}
.atl-fase p{font-size:.82rem;color:var(--atl-texto-2);margin:0;}
.atl-fase p code{font-family:var(--font-mono);font-size:.86em;color:var(--atl-ciano);}
.atl-divisor{height:1px;background:linear-gradient(90deg,transparent,var(--atl-linha-forte),transparent);margin:0 clamp(1.25rem,5vw,4rem);}
.atl-rodape{padding:2.5rem clamp(1.25rem,5vw,4rem) 3rem;border-top:1px solid var(--atl-linha);}
.atl-rodape p{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--atl-texto-3);margin:0;}
@media (prefers-reduced-motion:reduce){
  .atl-acao:hover{transform:none;}
  .atl-assin path{stroke-dashoffset:0 !important;animation:none !important;}
}
`;

export default function BrandMktAtelie() {
  const ceuRef = useRef<HTMLCanvasElement>(null);
  const assinRef = useRef<SVGSVGElement>(null);

  useEffect(() => (ceuRef.current ? initCeuDeDados(ceuRef.current) : undefined), []);
  useEffect(() => {
    const el = assinRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es, o) => {
      es.forEach(e => { if (e.isIntersecting) { el.classList.add('desenhada'); o.disconnect(); } });
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="atl-root">
      <style>{CSS}</style>

      <div className="atl-hero">
        <canvas ref={ceuRef} className="atl-ceu" aria-hidden />
        <div className="atl-hero-conteudo">
          <div className="atl-selo">digiai / <b>mkt</b> · tema do produto · ateliê de convergência</div>
          <h1 className="atl-h1">A precisão vira <span className="atl-corte">cubismo</span>.<br />O movimento vira <span className="atl-corte">pincelada</span>.</h1>
          <p className="atl-tese">O motor de marketing da DIGIAI como ateliê noturno: a grade geométrica da marca-mãe se fragmenta em planos, e os dados fluem como um céu estrelado. <em>Cor continua sendo informação</em> — ciano é a máquina, magenta é a sua vez, trigo é o guia.</p>
        </div>
      </div>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>movimento 01</b> · fundo</div>
        <h2 className="atl-h2">Céu de dados, não blobs de neon</h2>
        <p className="atl-sub">O fundo do mkt troca os <code>radial-gradient</code> estáticos por um campo de fluxo generativo — traços de 1px que giram como a Noite Estrelada, nas cores da marca, em densidade baixa. É o herdeiro direto do <strong>dhMesh</strong> (malha de convergência): a mesma malha, agora com turbulência. Está rodando atrás do título acima. Para com <code>prefers-reduced-motion</code>; vira um frame único e silencioso.</p>
      </section>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>movimento 02</b> · superfície</div>
        <h2 className="atl-h2">Vidro sai, plano cubista entra</h2>
        <p className="atl-sub">O card deixa de ser vidro arredondado com blur e vira <strong>plano facetado</strong>: corte diagonal no canto (o raio da marca-mãe é 0px — o corte cubista é a versão radical disso) e um plano-sombra deslocado atrás, como colagem. A grade quebra a simetria, como um Braque. Abaixo, o <strong>Pulso do dia</strong> do mkt remontado nesse sistema:</p>

        <div className="atl-grade">
          <div className="atl-wrap p-ciano atl-ga"><div className="atl-plano">
            <div className="atl-rotulo r-ciano">no ar · máquina</div>
            <div className="atl-kpi">6<span style={{ fontSize: '.4em', color: 'var(--atl-texto-3)' }}>/sem</span></div>
            <div className="atl-apoio">cadência cumprida <b>seg–sáb</b> · OSI + Pessoal</div>
            <div className="atl-pincel viva" />
          </div></div>

          <div className="atl-wrap p-magenta atl-gb"><div className="atl-plano">
            <div className="atl-rotulo r-magenta">sua vez · humano</div>
            <div className="atl-kpi">3</div>
            <div className="atl-apoio">peças aguardando <b>aprovação</b></div>
            <div className="atl-pincel humana" />
          </div></div>

          <div className="atl-wrap p-trigo atl-gc"><div className="atl-plano">
            <div className="atl-rotulo r-trigo">guia · atenção</div>
            <div className="atl-kpi">+20<span style={{ fontSize: '.45em' }}>%</span></div>
            <div className="atl-apoio">alcance vs. semana anterior <b>(Apify)</b></div>
            <div className="atl-pincel guia" />
          </div></div>

          <div className="atl-wrap atl-gd"><div className="atl-plano">
            <div className="atl-rotulo">fila de produção</div>
            <div className="atl-fila"><span>Reel — lente fotossensível</span><span className="atl-chip no-ar">no ar</span></div>
            <div className="atl-fila"><span>Carrossel — armação infantil</span><span className="atl-chip sua-vez">sua vez</span></div>
            <div className="atl-fila"><span>Post — devlog builder</span><span className="atl-chip guia">guia</span></div>
            <button className="atl-acao" type="button">Abrir produção</button>
          </div></div>

          <div className="atl-wrap atl-ge"><div className="atl-plano">
            <div className="atl-rotulo">alcance · 14 dias — traço pintado, não linha de sistema</div>
            <svg className="atl-graf" viewBox="0 0 640 180" role="img" aria-label="Gráfico de alcance dos últimos 14 dias, com traço orgânico">
              <defs>
                <filter id="atl-mao" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
                </filter>
                <pattern id="atl-hachura" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(0,224,202,0.14)" strokeWidth="1.4" />
                </pattern>
              </defs>
              <g stroke="var(--atl-linha)" strokeWidth="1">
                <line x1="0" y1="45" x2="640" y2="45" /><line x1="0" y1="90" x2="640" y2="90" /><line x1="0" y1="135" x2="640" y2="135" />
              </g>
              <path filter="url(#atl-mao)" d="M0,150 L46,138 L92,142 L138,118 L184,124 L230,96 L276,104 L322,84 L368,90 L414,64 L460,74 L506,50 L552,58 L598,34 L640,40 L640,180 L0,180 Z" fill="url(#atl-hachura)" stroke="none" />
              <path filter="url(#atl-mao)" d="M0,150 L46,138 L92,142 L138,118 L184,124 L230,96 L276,104 L322,84 L368,90 L414,64 L460,74 L506,50 L552,58 L598,34 L640,40" fill="none" stroke="var(--atl-ciano)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
              <path filter="url(#atl-mao)" d="M0,156 L92,150 L184,152 L276,140 L368,142 L460,128 L552,132 L640,120" fill="none" stroke="var(--atl-trigo)" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
              <circle cx="598" cy="34" r="5.5" fill="var(--atl-ciano)" />
              <circle cx="598" cy="34" r="10" fill="none" stroke="var(--atl-ciano)" strokeWidth="1" opacity=".45" />
            </svg>
            <div className="atl-legenda">
              <span><i className="atl-tra" style={{ background: 'var(--atl-ciano)' }} /> alcance orgânico</span>
              <span><i className="atl-tra" style={{ background: 'var(--atl-trigo)', opacity: .8 }} /> média do trimestre</span>
            </div>
          </div></div>
        </div>
      </section>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>movimento 03</b> · cor</div>
        <h2 className="atl-h2">Neon vira pincelada — o significado fica</h2>
        <p className="atl-sub">A regra aprovada da skin Órbita Cyber-Glass (<strong>neon = informação</strong>) é boa demais para morrer. Ela evolui: mesma semântica, outra matéria. Em vez de <code>text-shadow</code> brilhando, a cor aparece como <strong>traço de tinta</strong> — sublinhados grossos, hachuras, bordas de pincel. O amarelo-trigo do Van Gogh assume o papel do âmbar. Forest continua sendo a única cor de ação, como manda a marca-mãe.</p>

        <div className="atl-duelo">
          <div>
            <div className="atl-duelo-t">hoje · órbita cyber-glass</div>
            <div className="atl-mock-antes">
              <div className="atl-glow">R$ 12.400</div>
              <p>vidro + blur 12px + glow ciano · raio 0.65rem · gradiente radial atrás</p>
            </div>
          </div>
          <div className="atl-depois">
            <div className="atl-duelo-t">proposta · ateliê de convergência</div>
            <div className="atl-wrap p-ciano"><div className="atl-plano">
              <div className="atl-rotulo r-ciano">no ar · máquina</div>
              <div className="atl-kpi">R$ 12.400</div>
              <div className="atl-apoio">serifa itálica como matéria · plano facetado · cor só no traço</div>
              <div className="atl-pincel viva" />
            </div></div>
          </div>
        </div>
      </section>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>movimento 04</b> · o gate humano</div>
        <h2 className="atl-h2">Aprovar é assinar a tela</h2>
        <p className="atl-sub">O momento mais importante do mkt é o gate humano (R-011): nada publica sem o dono. Hoje é um botão. Na proposta, vira o gesto do ateliê — <strong>aprovar é assinar o quadro</strong>. O traço magenta se desenha quando a peça é liberada:</p>

        <div className="atl-wrap p-magenta" style={{ maxWidth: '40rem' }}><div className="atl-plano">
          <div className="atl-assin-caixa">
            <div style={{ flex: 1, minWidth: '14rem' }}>
              <div className="atl-rotulo r-magenta">sua vez · aprovação</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.35rem', margin: '.5rem 0 .2rem' }}>Carrossel — armação infantil</div>
              <div className="atl-apoio">OSI · agendado para sáb 09:00 · Instagram + Facebook</div>
              <button className="atl-acao magenta" type="button">Aprovar e assinar</button>
            </div>
            <svg ref={assinRef} className="atl-assin" width="180" height="90" viewBox="0 0 180 90" aria-hidden>
              <path d="M12,62 C30,18 44,20 48,44 C52,66 60,68 72,40 C82,18 92,22 96,46 C100,66 112,64 126,38 C136,20 150,26 164,58" fill="none" stroke="var(--atl-magenta)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
        </div></div>
      </section>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>movimento 05</b> · estados vazios &amp; carregamento</div>
        <h2 className="atl-h2">Onde não há dado, há quadro</h2>
        <p className="atl-sub">Estados vazios e telas de carregamento viram <strong>composições cubistas generativas</strong> — uma por seção, nas cores da casa. É o único lugar onde a arte ocupa o palco inteiro, porque ali não compete com informação.</p>
        <div className="atl-grade">
          <div className="atl-wrap atl-gd"><div className="atl-plano" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden style={{ marginBottom: '.8rem' }}>
              <polygon points="60,8 96,34 88,78 60,100 32,78 24,34" fill="none" stroke="var(--atl-linha-forte)" strokeWidth="1.5" />
              <polygon points="60,8 96,34 60,52 24,34" fill="rgba(232,185,74,0.12)" stroke="var(--atl-trigo)" strokeWidth="1.5" />
              <polygon points="60,52 88,78 60,100 32,78" fill="rgba(0,224,202,0.08)" stroke="var(--atl-ciano)" strokeWidth="1.2" />
              <circle cx="60" cy="34" r="4" fill="var(--atl-trigo)" />
            </svg>
            <div className="atl-rotulo r-trigo">ideias · vazio</div>
            <p className="atl-apoio" style={{ margin: '.5rem 0 0' }}>Nenhuma ideia na fila.<br />A próxima nasce aqui.</p>
          </div></div>
          <div className="atl-wrap atl-gd"><div className="atl-plano" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden style={{ marginBottom: '.8rem' }}>
              <circle cx="60" cy="50" r="26" fill="rgba(232,185,74,0.14)" stroke="var(--atl-trigo)" strokeWidth="1.5" />
              <g stroke="var(--atl-trigo)" strokeWidth="1.4" strokeLinecap="round" opacity=".8">
                <line x1="60" y1="10" x2="60" y2="20" /><line x1="60" y1="80" x2="60" y2="92" />
                <line x1="20" y1="50" x2="30" y2="50" /><line x1="90" y1="50" x2="102" y2="50" />
                <line x1="33" y1="23" x2="40" y2="30" /><line x1="80" y1="70" x2="88" y2="78" />
                <line x1="88" y1="23" x2="80" y2="30" /><line x1="40" y1="70" x2="32" y2="78" />
              </g>
            </svg>
            <div className="atl-rotulo r-trigo">calendário · vazio</div>
            <p className="atl-apoio" style={{ margin: '.5rem 0 0' }}>Semana limpa.<br />Sol de trigo até a primeira pauta.</p>
          </div></div>
          <div className="atl-wrap atl-gd"><div className="atl-plano" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden style={{ marginBottom: '.8rem' }}>
              <path d="M18,60 C34,26 60,22 74,40 C86,55 78,72 62,70 C50,68 48,52 60,48 C70,45 76,54 70,60" fill="none" stroke="var(--atl-ciano)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="96" cy="30" r="3" fill="var(--atl-clarity)" opacity=".7" />
              <circle cx="104" cy="66" r="2" fill="var(--atl-clarity)" opacity=".45" />
              <circle cx="24" cy="88" r="2.5" fill="var(--atl-clarity)" opacity=".5" />
            </svg>
            <div className="atl-rotulo r-ciano">analytics · coletando</div>
            <p className="atl-apoio" style={{ margin: '.5rem 0 0' }}>O redemoinho ainda gira.<br />Dados chegam em minutos.</p>
          </div></div>
        </div>
      </section>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>fundação</b> · o que não se toca</div>
        <h2 className="atl-h2">Arte por cima, marca por baixo</h2>
        <p className="atl-sub">Tudo acima é expressão do produto. A fundação DIGIAI continua governando:</p>
        <div className="atl-scroll">
          <table className="atl-regras">
            <thead><tr><th>regra</th><th>como fica no ateliê</th></tr></thead>
            <tbody>
              <tr><td>Navy é o chão</td><td>O céu de dados vive sobre #0A0F1E — a base aprovada permanece.</td></tr>
              <tr><td>Forest = ação</td><td>Única cor de botão primário (tom claro forest-300 no dark, AA 4.5:1). Nunca decoração.</td></tr>
              <tr><td>Cor = informação</td><td>Ciano máquina · magenta humano · trigo guia — a semântica aprovada em 03/07 fica intacta; só troca de glow para traço.</td></tr>
              <tr><td>As 3 fontes</td><td>Source Serif 4 (agora em itálico, como display de arte) · Inter · JetBrains Mono. Nenhuma fonte nova.</td></tr>
              <tr><td>Token sempre</td><td>Tudo entra em digiai-tokens.css como tema: nenhum hex no markup do app.</td></tr>
              <tr><td>Acessibilidade</td><td>Texto AA 4.5:1 · foco visível 2px · movimento respeita prefers-reduced-motion.</td></tr>
              <tr><td>Gate humano (R-011)</td><td>Fica mais visível, não menos: a assinatura magenta é o rito central do app.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="atl-divisor" />

      <section className="atl-sec">
        <div className="atl-faixa"><b>adoção</b> · sem big-bang</div>
        <h2 className="atl-h2">Quatro fases, cada uma já bonita sozinha</h2>
        <p className="atl-sub" style={{ marginBottom: '2rem' }}>Cada fase é uma sessão de trabalho e deixa o app melhor mesmo se a próxima nunca vier.</p>
        <div className="atl-fases">
          <div className="atl-fase"><div className="atl-fn">i</div><h3>Matéria</h3><p>Trocar vidro/blur por planos facetados e serifa itálica nos números. Só CSS — <code>digiai-tokens.css</code>.</p></div>
          <div className="atl-fase"><div className="atl-fn">ii</div><h3>Céu</h3><p>Campo de fluxo generativo no fundo (canvas, ~200 partículas, 1px), aposentando os radial-gradients.</p></div>
          <div className="atl-fase"><div className="atl-fn">iii</div><h3>Gesto</h3><p>Assinatura magenta na Aprovação + gráficos pintados (turbulência) no Analytics.</p></div>
          <div className="atl-fase"><div className="atl-fn">iv</div><h3>Quadros</h3><p>Composições cubistas nos estados vazios e loading, seção por seção.</p></div>
        </div>
      </section>

      <footer className="atl-rodape">
        <p>digiai / mkt · ateliê de convergência · tema registrado 2026-07-09 · made with calm, by digiai</p>
      </footer>
    </div>
  );
}
