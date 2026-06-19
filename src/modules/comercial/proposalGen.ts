import type { MeetingSession } from '../../lib/meetingStore';
import type { CommercialLead } from '../../lib/commercialStore';
import type { Proposal } from '../../lib/proposalStore';

// Pricing vigente (18/06): Essencial 349 / Controle 899 / Crescimento 1499
export const PLAN_PRICE: Record<string, number> = { Essencial: 349, Controle: 899, Crescimento: 1499 };
export const CONSULTOR = { nome: 'Gilberto (Junior)', whatsapp: '(11) 98602-7415' };

const brl = (v: number) => v.toLocaleString('pt-BR');

export function buildBody(p: Proposal, lead?: CommercialLead | null, meeting?: MeetingSession | null): string {
  const price = p.monthly_price ?? PLAN_PRICE[p.plan ?? 'Controle'] ?? 0;
  const apps = meeting?.interest_apps?.length ? `Apps de interesse: ${meeting.interest_apps.join(', ')}\n` : '';
  const dor = meeting?.pain_noted ? `O que vamos resolver: ${meeting.pain_noted}\n` : '';
  return `Olá ${lead?.name || lead?.company || ''},

Com base na nossa conversa, preparei a proposta do Clearix${lead?.company ? ` para a ${lead.company}` : ''}.

PLANO ${p.plan ?? ''} — R$ ${brl(price)}/mês
• Teste de ${p.trial_days ?? 90} dias com a sua empresa (cadastro real, funcionalidades completas)
• ${p.discount_pct ?? 30}% OFF nos 3 primeiros meses ao virar cliente
• ${p.setup_note ?? 'Implantação isenta no teste; cobrada ao virar plano.'}
• Migração de dados orçada por volume
${apps}${dor}
Acesso de demonstração: clearix.app.br (login enviado em separado).

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
    discount_pct: 30,
    trial_days: 90,
    setup_note: 'Implantação isenta no teste; cobrada ao virar plano.',
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
