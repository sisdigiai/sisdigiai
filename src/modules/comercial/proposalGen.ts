import type { MeetingSession } from '../../lib/meetingStore';
import type { CommercialLead } from '../../lib/commercialStore';
import type { Proposal } from '../../lib/proposalStore';

// A OFERTA DESTE GERADOR VEM DA FOLHA ÚNICA, e só de lá (regra da casa para todo número publicado).
//
// 14/11/2026 — o que saiu daqui e por quê: o corpo prometia "Teste de 90 dias", "30% OFF nos 3 primeiros
// meses", "implantação isenta no teste" e um "acesso de demonstração" autosserviço. A casa NÃO FAZ NADA
// DISSO desde 24/09/2026: a folha diz "sem período grátis e sem demo automática; a demonstração é ao vivo,
// em 20 minutos; piloto pago e assistido, a partir de R$ 349/mês, um piloto por vez". Proposta é documento
// que vai para fora — oferta que a casa não cumpre não é erro de texto, é promessa falsa com o nome do
// dono embaixo. Achado pelo Orquestrador Geral em 14/11, antes de o dono mandar um pitch pronto.
//
// Desconto deixou de ser padrão: só entra no corpo se alguém escrever um na proposta.
//
// Preços: folha única, seção "Preços dos planos" (registrada em 14/11/2026). Eu havia marcado 899 e 1499
// como número sem fonte; o Geral mediu a landing e o achado era lacuna DA FOLHA, não do app — os três
// estão públicos em clearix.app.br desde 01/06/2026. Ficaram registrados lá como estão no ar, e a
// **ratificação do dono ainda falta** (item 139 da lista dele). Proposta cita os três sempre com o nome do
// plano; desconto e período grátis continuam fora. Se um valor mudar, muda na folha primeiro e aqui depois.
export const PLAN_PRICE: Record<string, number> = { Essencial: 349, Controle: 899, Crescimento: 1499 };
export const CONSULTOR = { nome: 'Gilberto (Junior)', whatsapp: '(11) 98602-7415' };

const brl = (v: number) => v.toLocaleString('pt-BR');

export function buildBody(p: Proposal, lead?: CommercialLead | null, meeting?: MeetingSession | null): string {
  const price = p.monthly_price ?? PLAN_PRICE[p.plan ?? 'Controle'] ?? 0;
  const apps = meeting?.interest_apps?.length ? `Apps de interesse: ${meeting.interest_apps.join(', ')}\n` : '';
  const dor = meeting?.pain_noted ? `O que vamos resolver: ${meeting.pain_noted}\n` : '';
  // Desconto só sai escrito se alguém o tiver escrito: nada de porcentagem por omissão.
  const descontoLinha = p.discount_pct ? `\n• Desconto combinado: ${p.discount_pct}%` : '';
  return `Olá ${lead?.name || lead?.company || ''},

Com base na nossa conversa, preparei a proposta do Clearix${lead?.company ? ` para a ${lead.company}` : ''}.

PLANO ${p.plan ?? ''} — R$ ${brl(price)}/mês
• Piloto pago e assistido, a partir de R$ 349/mês. Um piloto por vez.
• Sem período grátis e sem demo automática: a demonstração é ao vivo, em 20 minutos, com os números de uma ótica de verdade (dados desfocados).
• Diagnóstico pago, R$ 349 por Pix antes: em até 5 dias úteis você recebe uma página dizendo quanto tem de carnê vencido e quantos clientes não voltaram. Se assinar o piloto em até 30 dias, esse valor vira a sua primeira mensalidade (não abate da implantação).
• ${p.setup_note ?? 'Implantação cotada à parte, só depois do diagnóstico.'}
• Migração guiada, orçada por volume — trazemos seu histórico, nada se perde
• Pagamento mensal via Mercado Pago — sem cartão preso, sem fidelidade (cancela quando quiser)${descontoLinha}
${apps}${dor}
Manual completo (o ecossistema tela por tela): manual.clearix.app.br

Qualquer dúvida, estou à disposição.
${CONSULTOR.nome} — ${CONSULTOR.whatsapp}`;
}

export function proposalFromMeeting(meeting: MeetingSession | null, lead: CommercialLead | null): Proposal {
  const plan = meeting?.interest_plan || 'Controle';
  const price = PLAN_PRICE[plan] ?? 899;
  const base: Proposal = {
    lead_id: lead?.id ?? null,
    meeting_id: meeting?.id ?? null,
    title: `Proposta Clearix — ${lead?.company ?? 'Ótica'}`,
    plan,
    monthly_price: price,
    discount_pct: null,
    trial_days: null,
    setup_note: 'Implantação cotada à parte, só depois do diagnóstico.',
    items: [],
    status: 'rascunho',
  };
  base.body = buildBody(base, lead, meeting);
  return base;
}

const digits = (s?: string | null) => (s || '').replace(/\D/g, '');

export function whatsappLink(body: string, phone?: string | null): string {
  const d = digits(phone);
  const num = d ? (d.startsWith('55') ? d : `55${d}`) : '';
  return `https://wa.me/${num}?text=${encodeURIComponent(body)}`;
}

export function mailtoLink(body: string, subject: string, email?: string | null): string {
  return `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
