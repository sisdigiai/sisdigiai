import { ShieldCheck, Bot, Lock, Target, Heart, Store } from 'lucide-react';
import PageHeader from '../components/PageHeader';

// Travas de marketing — derivadas das regras canônicas (R-011, R-013/LGPD,
// decisões 17/04 Academy-funil, design system). Fonte única para Marketing,
// Funil e Academy. Ajustar aqui reflete no banner de todos os módulos.

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
    onde: 'Calendário Editorial · Planejador · Materiais de afiliados',
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
    onde: 'Banco de Ideias · Calendário · Landing OSI · PromptsIA',
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
    onde: 'Marketplace · Calendário · Materiais de afiliados · Landing OSI',
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
    <div className="border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-amber-300" />
        <span className="text-xs font-semibold text-amber-200/90 uppercase tracking-wide">Travas de marketing ativas</span>
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

export default function TravasMarketing() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Governança"
        title="Travas de Marketing"
        subtitle="Regras inegociáveis que regem todo conteúdo de marketing — derivadas das regras canônicas (R-011, R-013, decisões 17/04, design system). Aplicam em Marketing, Funil OSI e Academy."
      />
      <div className="space-y-6">
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
                    <span className="text-amber-300/70 shrink-0">▪</span> {r}
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
