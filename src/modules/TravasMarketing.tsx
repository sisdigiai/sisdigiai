import { ShieldCheck, Bot, Lock, Target, Heart } from 'lucide-react';

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
    titulo: 'Estratégia / CTA pro Clearix',
    fonte: 'Decisões 17/04 · Verdades Canônicas',
    regras: [
      'Academy e OSI são funil de entrada do Clearix — todo conteúdo puxa pro ecossistema.',
      'Distribuição > Produto: Academy/Pulso são canais do Clearix, não fins em si.',
      'Nenhuma frente editorial pode competir com a venda do Clearix.',
    ],
    onde: 'Banco de Ideias · Calendário · Landing OSI',
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
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-amber-300" />
        <span className="text-xs font-semibold text-amber-200/90 uppercase tracking-wide">Travas de marketing ativas</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span><b className="text-white/75">AI produz / humano publica</b> (R-011)</span>
        <span><b className="text-white/75">opt-in + template LGPD</b> (R-013)</span>
        <span><b className="text-white/75">CTA pro Clearix</b> em tudo</span>
        <span><b className="text-white/75">tom humano PT-BR</b></span>
        <span className="text-white/30">· detalhe em Sistema → Travas Marketing</span>
      </div>
    </div>
  );
}

export default function TravasMarketing() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-amber-300" /> Travas de Marketing
        </h1>
        <p className="text-white/50 mt-1">
          Regras inegociáveis que regem todo conteúdo de marketing — derivadas das regras canônicas
          (R-011, R-013, decisões 17/04, design system). Aplicam em Marketing, Funil OSI e Academy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAVAS.map(t => {
          const Icon = t.icone;
          return (
            <div key={t.titulo} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#06B6D4]" />
                <div>
                  <div className="font-bold text-base">{t.titulo}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">{t.fonte}</div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {t.regras.map((r, i) => (
                  <li key={i} className="text-sm text-white/75 flex gap-2">
                    <span className="text-amber-300/70 shrink-0">▪</span> {r}
                  </li>
                ))}
              </ul>
              <div className="text-[11px] text-white/40 border-t border-white/5 pt-2">
                <span className="font-mono uppercase tracking-wider text-white/30">Onde aplica:</span> {t.onde}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-white/30 border-t border-white/5 pt-4">
        Estas travas foram codificadas a partir das regras canônicas existentes. Para mudar uma trava,
        atualize a regra de origem (Harness/ADR/decisão) e este painel no mesmo turno.
      </div>
    </div>
  );
}
