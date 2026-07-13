import { useEffect, useState } from 'react';
import { ShieldCheck, Bot, Lock, Target, Heart, Store, Globe, Palette } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { supabase } from '../lib/supabase';

// Travas de marketing — DUAS camadas, cada uma com sua verdade única:
// 1. GLOBAIS (abaixo, TRAVAS): espelham as regras canônicas do Cockpit/Harness
//    (R-011, R-013/LGPD, marketplace-first...). Mudou a regra → atualizar lá e aqui.
// 2. POR MARCA (v_mkt_travas): a verdade vive em mkt.content_rules, editada SÓ
//    no app DIGIAI MKT — o digiai lê ao vivo, nunca duplica.

interface Trava {
  icone: typeof Bot;
  titulo: string;
  fonte: string;
  regras: string[];
  onde: string;
}

export const TRAVAS: Trava[] = [
  {
    icone: Bot,
    titulo: 'Cotrabalho AI / Humano',
    fonte: 'R-011 · ADR-0016',
    regras: [
      'AI produz rascunhos, copy, prompts e planos — humano valida e publica.',
      'AI nunca posta, envia mensagem, faz deploy ou cobra sozinho.',
      'Conteúdo só vai a "publicado" após revisão humana de aderência setorial.',
    ],
    onde: 'DIGIAI MKT (produção → publicação) · Materiais de afiliados',
  },
  {
    icone: Lock,
    titulo: 'LGPD + WhatsApp',
    fonte: 'R-013 · padrões de identidade',
    regras: [
      'Sem opt-in explícito registrado → não envia mensagem ativa.',
      'Fora da janela 24h/FEP, só com template aprovado na categoria certa.',
      'Classificar template certo: marketing é o mais caro e sem desconto por volume.',
    ],
    onde: 'Comunidade OSI · disparos · afiliados',
  },
  {
    icone: Target,
    titulo: 'Ponte sutil pro Clearix',
    fonte: 'plano-mestre §5 · landing-osi §104-108',
    regras: [
      'Clearix é sobremesa, não prato principal — Academy/OSI nunca empurram, abrem ponte.',
      'Distribuição > Produto: Academy/OSI são canais que constroem confiança pro Clearix futuro.',
      'Nenhuma frente editorial deve sobre-vender Clearix no low-ticket.',
    ],
    onde: 'DIGIAI MKT (ideias/roteiros) · Landing OSI · Funil',
  },
  {
    icone: Store,
    titulo: 'Marketplace-first',
    fonte: 'modelo-comercial §43-48 · presença-digital §12-30',
    regras: [
      'Hotmart/Kiwify é o canal primário de aquisição — landing e site são apoio, não eixo.',
      'Toda copy/CTA aponta pro listing do marketplace, não pra landing intermediária.',
      'Preço, capa e oferta no marketplace são fonte da verdade — sincronizar app ↔ marketplace.',
    ],
    onde: 'Marketplace · DIGIAI MKT · Materiais de afiliados · Landing OSI',
  },
  {
    icone: Globe,
    titulo: 'Disciplina de Redes Sociais',
    fonte: 'Cockpit/social/redes-sociais.md · decidido 2026-06-10',
    regras: [
      'Inventário de contas fechado — conta nova só com atualização do doc canônico no mesmo turno.',
      'Um navegador travado por rede; rede com navegador "a validar" não entra em rotina.',
      'Devlog diário = LinkedIn pessoal; contas DIGIAI = consolidado semanal; OSI nunca nas contas DIGIAI nem no LinkedIn.',
      'Meta (FB+IG) publica via Business Suite, SEMPRE com imagem (T-9/T-10) — conferir o portfólio "Digiai" antes de postar. LinkedIn segue texto livre.',
      'Toda atualização de rede é registrada no DIGIAI MKT (Marcas & Redes).',
    ],
    onde: 'DIGIAI MKT → Marcas & Redes',
  },
  {
    icone: Heart,
    titulo: 'Tom & Marca',
    fonte: 'Design system · brand DIGIAI',
    regras: [
      'PT-BR 100%, tom humano, sem jargão técnico — metáfora da marca.',
      'Não prometer o que não entrega; honestidade na mensagem (mesma régua do app).',
    ],
    onde: 'Copy · criativos · landing pages',
  },
];

// Banner compacto — plantar no topo de Marketing, Funil e Academy.
export function TravasBanner() {
  return (
    <div className="border border-warning/20 bg-warning/[0.06] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-warning" />
        <span className="text-xs font-semibold text-warning/90 uppercase tracking-wide">Travas de marketing ativas</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
        <span><b className="text-on-surface">AI produz / humano publica</b> (R-011)</span>
        <span><b className="text-on-surface">opt-in + template LGPD</b> (R-013)</span>
        <span><b className="text-on-surface">marketplace-first</b> (Hotmart/Kiwify)</span>
        <span><b className="text-on-surface">ponte sutil pro Clearix</b></span>
        <span><b className="text-on-surface">tom humano PT-BR</b></span>
        <span className="text-muted">· detalhe em Sistema → Travas Marketing</span>
      </div>
    </div>
  );
}

type TravaMarca = {
  marca: string;
  marca_code: string;
  accent_hex: string | null;
  proibicoes: string[] | null;
  guardrails: { hard_never?: string[]; hard_always?: string[]; cor_marca?: string; extra?: string } | null;
  cadencia: { canais?: string[]; horario?: string; qtd_por_dia?: number } | null;
  updated_at: string;
};

export default function TravasMarketing() {
  const [marcas, setMarcas] = useState<TravaMarca[]>([]);

  useEffect(() => {
    supabase.from('v_mkt_travas').select('*').then(({ data }) => setMarcas((data ?? []) as TravaMarca[]));
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Governança"
        title="Travas de Marketing"
        subtitle="Duas camadas: regras globais (Cockpit/Harness — R-011, R-013…) + travas por marca (verdade única em mkt.content_rules, editadas só no DIGIAI MKT)."
      />
      <div className="space-y-6">

      {/* Travas POR MARCA — verdade única do MKT (leitura ao vivo) */}
      {marcas.length > 0 && (
        <div className="border border-outline/15 bg-surface-container">
          <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-secondary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Travas por marca — vivas do DIGIAI MKT ({marcas.length})</span>
            <a href="https://digiaimkt.netlify.app" target="_blank" rel="noreferrer" className="ml-auto font-mono text-[10px] text-secondary hover:underline">editar no MKT ↗</a>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline/10">
            {marcas.map((m) => (
              <div key={m.marca_code} className="bg-surface-container p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 shrink-0" style={{ background: m.accent_hex || 'var(--color-muted)' }} />
                  <span className="text-sm font-semibold text-on-surface">{m.marca}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted">atualizada {new Date(m.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {m.guardrails?.hard_never && m.guardrails.hard_never.length > 0 && (
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-danger mb-0.5">nunca</div>
                    <ul className="space-y-0.5">
                      {m.guardrails.hard_never.map((r, i) => <li key={i} className="text-[12px] text-on-surface-variant flex gap-1.5"><span className="text-danger/70 shrink-0">✗</span>{r}</li>)}
                    </ul>
                  </div>
                )}
                {m.guardrails?.hard_always && m.guardrails.hard_always.length > 0 && (
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-success mb-0.5">sempre</div>
                    <ul className="space-y-0.5">
                      {m.guardrails.hard_always.map((r, i) => <li key={i} className="text-[12px] text-on-surface-variant flex gap-1.5"><span className="text-success/70 shrink-0">✓</span>{r}</li>)}
                    </ul>
                  </div>
                )}
                {m.proibicoes && m.proibicoes.length > 0 && (
                  <details className="text-[12px] text-on-surface-variant">
                    <summary className="font-mono text-[9px] uppercase tracking-wider text-muted cursor-pointer">proibições da marca ({m.proibicoes.length})</summary>
                    <ul className="space-y-0.5 mt-1">
                      {m.proibicoes.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-warning/70 shrink-0">▪</span>{r}</li>)}
                    </ul>
                  </details>
                )}
                {m.cadencia && (
                  <div className="font-mono text-[10px] text-muted">
                    cadência: {m.cadencia.qtd_por_dia ?? '—'}/dia · {m.cadencia.horario ?? '—'} · {(m.cadencia.canais ?? []).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="font-mono text-[10px] uppercase tracking-widest text-muted pt-2">Travas globais — regras canônicas (Cockpit/Harness)</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAVAS.map(t => {
          const Icon = t.icone;
          return (
            <div key={t.titulo} className="border border-outline/10 bg-surface-low p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-secondary" />
                <div>
                  <div className="font-bold text-base">{t.titulo}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{t.fonte}</div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {t.regras.map((r, i) => (
                  <li key={i} className="text-sm text-on-surface flex gap-2">
                    <span className="text-warning/70 shrink-0">▪</span> {r}
                  </li>
                ))}
              </ul>
              <div className="text-[11px] text-on-surface-variant border-t border-outline/10 pt-2">
                <span className="font-mono uppercase tracking-wider text-muted">Onde aplica:</span> {t.onde}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-muted border-t border-outline/10 pt-4">
        Estas travas foram codificadas a partir das regras canônicas existentes. Para mudar uma trava,
        atualize a regra de origem (Harness/ADR/decisão) e este painel no mesmo turno.
      </div>
      </div>
    </div>
  );
}
