import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

// Mapa de calor da prospecção (pedido do dono, 23/09/2026 — resultado mora no digiai, não no MKT).
// Fonte: public.v_mkt_cobertura_geografica (view de contrato do MKT, sem PII): 1 linha por uf/cidade/bairro.
//
// O VAZIO É O DADO PRINCIPAL. Cidade sem linha na view não é "zero óticas": é raspagem que nunca passou ali.
// Por isso cada nível compara o que foi tocado com o território inteiro — as 39 cidades da Grande São Paulo,
// os 645 municípios de SP, os 1.668 do Sudeste e os 5.570 do Brasil (contagem do IBGE). O que não foi tocado
// aparece em branco com borda tracejada, nunca some da tela.

interface Linha {
  uf: string; cidade: string; bairro: string | null;
  oticas: number; com_celular: number; salvas_no_google: number;
  ja_receberam: number; responderam: number; pediram_sair: number;
}

// Região Metropolitana de São Paulo — 39 municípios (IBGE). Lista fixa: território não muda com o dado.
const GRANDE_SP = [
  'Arujá', 'Barueri', 'Biritiba-Mirim', 'Caieiras', 'Cajamar', 'Carapicuíba', 'Cotia', 'Diadema',
  'Embu das Artes', 'Embu-Guaçu', 'Ferraz de Vasconcelos', 'Francisco Morato', 'Franco da Rocha',
  'Guararema', 'Guarulhos', 'Itapecerica da Serra', 'Itapevi', 'Itaquaquecetuba', 'Jandira', 'Juquitiba',
  'Mairiporã', 'Mauá', 'Mogi das Cruzes', 'Osasco', 'Pirapora do Bom Jesus', 'Poá', 'Ribeirão Pires',
  'Rio Grande da Serra', 'Salesópolis', 'Santa Isabel', 'Santana de Parnaíba', 'Santo André',
  'São Bernardo do Campo', 'São Caetano do Sul', 'São Lourenço da Serra', 'São Paulo', 'Suzano',
  'Taboão da Serra', 'Vargem Grande Paulista',
];

const UFS_SUDESTE = ['SP', 'RJ', 'MG', 'ES'];
const UFS_BRASIL = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const MUNICIPIOS = { grandesp: 39, sp: 645, sudeste: 1668, brasil: 5570 };

type Zoom = 'grandesp' | 'sp' | 'sudeste' | 'brasil';
const ZOOMS: { k: Zoom; label: string }[] = [
  { k: 'grandesp', label: 'Grande São Paulo' },
  { k: 'sp', label: 'Estado de SP' },
  { k: 'sudeste', label: 'Sudeste' },
  { k: 'brasil', label: 'Brasil' },
];

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Cor pela quantidade de óticas raspadas. Zero é branco vazado — a ausência tem de saltar aos olhos.
function corDe(oticas: number, max: number): { fundo: string; borda: string } {
  if (oticas === 0) return { fundo: 'transparent', borda: '1px dashed var(--color-outline)' };
  const t = Math.min(1, Math.log10(oticas + 1) / Math.log10(max + 1));
  return { fundo: `color-mix(in srgb, var(--color-action) ${Math.round(12 + t * 78)}%, transparent)`, borda: '1px solid var(--color-outline)' };
}

export default function MapaCobertura() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState<Zoom>('grandesp');

  useEffect(() => {
    let vivo = true;
    supabase.from('v_mkt_cobertura_geografica').select('*').then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setErro(error.message); return; }
      setLinhas((data ?? []) as Linha[]);
    });
    return () => { vivo = false; };
  }, []);

  const porCidade = useMemo(() => {
    const m = new Map<string, { cidade: string; uf: string; oticas: number; salvas: number; receberam: number; responderam: number; bairros: number }>();
    for (const l of linhas ?? []) {
      const k = semAcento(l.cidade) + '|' + l.uf;
      const a = m.get(k) ?? { cidade: l.cidade, uf: l.uf, oticas: 0, salvas: 0, receberam: 0, responderam: 0, bairros: 0 };
      a.oticas += l.oticas; a.salvas += l.salvas_no_google; a.receberam += l.ja_receberam; a.responderam += l.responderam; a.bairros += 1;
      m.set(k, a);
    }
    return m;
  }, [linhas]);

  const porUf = useMemo(() => {
    const m = new Map<string, { oticas: number; cidades: number; responderam: number }>();
    for (const c of porCidade.values()) {
      const a = m.get(c.uf) ?? { oticas: 0, cidades: 0, responderam: 0 };
      a.oticas += c.oticas; a.cidades += 1; a.responderam += c.responderam;
      m.set(c.uf, a);
    }
    return m;
  }, [porCidade]);

  if (erro) return (
    <div className="border border-danger/40 bg-danger/5 p-4 text-sm text-on-surface">
      Não foi possível ler a cobertura (<span className="font-mono text-[12px]">v_mkt_cobertura_geografica</span>): {erro}.
    </div>
  );
  if (!linhas) return <div className="text-sm text-muted py-6">Lendo a cobertura…</div>;

  // Cada nível devolve as células na ordem do território, não na ordem do dado.
  const celulas: { nome: string; sub: string; oticas: number; responderam: number; tocada: boolean }[] = (() => {
    if (zoom === 'grandesp') {
      return GRANDE_SP.map((nome) => {
        const c = [...porCidade.values()].find((x) => semAcento(x.cidade) === semAcento(nome) && x.uf === 'SP');
        return { nome, sub: c ? `${c.bairros} bairro(s) · ${c.salvas} no Google` : 'raspagem não passou aqui',
                 oticas: c?.oticas ?? 0, responderam: c?.responderam ?? 0, tocada: !!c };
      });
    }
    if (zoom === 'sp') {
      const tocadas = [...porCidade.values()].filter((c) => c.uf === 'SP').sort((a, b) => b.oticas - a.oticas)
        .map((c) => ({ nome: c.cidade, sub: `${c.bairros} bairro(s) · ${c.responderam} resposta(s)`, oticas: c.oticas, responderam: c.responderam, tocada: true }));
      return tocadas;
    }
    const ufs = zoom === 'sudeste' ? UFS_SUDESTE : UFS_BRASIL;
    return ufs.map((uf) => {
      const u = porUf.get(uf);
      return { nome: uf, sub: u ? `${u.cidades} cidade(s)` : 'sem raspagem', oticas: u?.oticas ?? 0, responderam: u?.responderam ?? 0, tocada: !!u };
    });
  })();

  const max = Math.max(1, ...celulas.map((c) => c.oticas));
  const tocadas = celulas.filter((c) => c.tocada).length;
  const totalTerritorio = zoom === 'sp' ? MUNICIPIOS.sp : zoom === 'grandesp' ? MUNICIPIOS.grandesp : celulas.length;
  const oticas = celulas.reduce((a, c) => a + c.oticas, 0);
  const respostas = celulas.reduce((a, c) => a + c.responderam, 0);

  return (
    <section className="border border-outline/15 bg-surface-container p-5">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h3 className="font-serif text-lg text-on-surface">Território da prospecção</h3>
        <div className="flex gap-1 ml-auto border border-outline/15 p-0.5">
          {ZOOMS.map((z) => (
            <button key={z.k} onClick={() => setZoom(z.k)}
              className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 transition-colors ${zoom === z.k ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
              {z.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-on-surface-variant mb-4">
        O branco é o dado principal: quadro vazado com borda tracejada = a raspagem nunca passou ali.
        Cor mais forte = mais óticas levantadas.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { r: 'território tocado', v: zoom === 'sp' ? `${tocadas} de 645 cidades` : `${tocadas} de ${totalTerritorio}` },
          { r: 'óticas levantadas', v: oticas.toLocaleString('pt-BR') },
          { r: 'responderam', v: respostas.toLocaleString('pt-BR') },
          { r: 'sem raspagem', v: zoom === 'sp' ? `${645 - tocadas} cidades` : `${totalTerritorio - tocadas}` },
        ].map((k) => (
          <div key={k.r} className="border border-outline/15 bg-surface-lowest px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{k.r}</div>
            <div className="font-mono text-[15px] tabular-nums text-on-surface mt-0.5">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {celulas.map((c) => {
          const cor = corDe(c.oticas, max);
          return (
            <div key={c.nome} className="px-2.5 py-2 min-h-[64px] flex flex-col justify-between"
              style={{ background: cor.fundo, border: cor.borda }}
              title={`${c.nome}: ${c.oticas} ótica(s), ${c.responderam} resposta(s)`}>
              <div className={`text-[12px] leading-tight ${c.tocada ? 'text-on-surface' : 'text-muted'}`}>{c.nome}</div>
              <div className="flex items-end justify-between gap-2">
                <span className={`font-mono text-[9px] ${c.tocada ? 'text-on-surface-variant' : 'text-muted'}`}>{c.sub}</span>
                <span className="font-mono text-[13px] tabular-nums text-on-surface">{c.tocada ? c.oticas : '—'}</span>
              </div>
              {c.responderam > 0 && (
                <span className="font-mono text-[9px] text-success mt-1">{c.responderam} resposta(s)</span>
              )}
            </div>
          );
        })}
      </div>

      {zoom === 'sp' && (
        <div className="mt-3 border border-dashed border-outline/40 px-3 py-2 text-[12px] text-muted">
          <b className="text-on-surface-variant">{(645 - tocadas).toLocaleString('pt-BR')} cidades de SP sem nenhuma raspagem.</b>{' '}
          A lista acima é só o que foi tocado; o estado inteiro tem 645 municípios.
        </div>
      )}
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-3">
        fonte: v_mkt_cobertura_geografica (contrato do MKT, sem PII) · território: contagem de municípios do IBGE
      </div>
    </section>
  );
}
