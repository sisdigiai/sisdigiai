/**
 * Landing pública /osi no app DIGIAI — versão minimalista institucional.
 *
 * NÃO substitui a landing completa em landingoticasemimproviso.netlify.app.
 * Existe pra dar ao app DIGIAI uma rota pública oficial com CTA → Hotmart, garantindo
 * controle institucional do funil no domínio sisdigiai.netlify.app (e futuro digiai.app.br/osi).
 *
 * Cross-ref: academy.product_checklist_items 'Publicar landing publica com CTA preparado'
 * (FluxoOSI checklist sales) + Cockpit/sessoes/META_setup_2026-06-02.md (Bloco C).
 *
 * Mentor-led brand: Tatiana Camargo como autoridade visível.
 */

import { ArrowRight, BookOpen, Send, Target, Users, Wallet } from 'lucide-react';
import { useState } from 'react';

const HOTMART_URL = 'https://go.hotmart.com/B105515825L?dp=1';
const FULL_LANDING_URL = 'https://landingoticasemimproviso.netlify.app/';
const PRICE_BRL = 48.5;
const CAPTURE_URL = 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/lead-capture';
const CONSENT_TEXT =
  'Ao enviar, você concorda em receber conteúdos do método Ótica Sem Improviso por e-mail e WhatsApp. Sem spam — você pode sair quando quiser.';

function LeadForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !whatsapp.trim()) { setState('error'); return; }
    setState('sending');
    try {
      const res = await fetch(CAPTURE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: 'osi',
          name, email, whatsapp,
          website: honeypot,
          source_url: window.location.href,
          consent_text: CONSENT_TEXT,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setState(res.ok && data?.ok ? 'ok' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'ok') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center mb-6">
        <p className="text-[#06B6D4] font-bold text-sm">
          Recebido! Em breve entramos em contato. 👓
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
      <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1 text-center">
        Ainda não é a hora?
      </div>
      <div className="text-sm text-slate-300 mb-4 text-center">
        Deixe seu contato e receba o <strong>Movimento 1</strong> do método de graça.
      </div>
      <input
        type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="flex flex-col gap-2">
        <input
          type="text" placeholder="Seu nome" value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2.5 rounded-md bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#06B6D4]"
        />
        <input
          type="email" placeholder="Seu melhor e-mail" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2.5 rounded-md bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#06B6D4]"
        />
        <input
          type="tel" placeholder="WhatsApp (com DDD)" value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="px-3 py-2.5 rounded-md bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#06B6D4]"
        />
        <button
          type="submit" disabled={state === 'sending'}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#06B6D4]/60 text-[#06B6D4] hover:bg-[#06B6D4]/10 disabled:opacity-60 font-bold text-xs uppercase tracking-widest rounded-md transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          {state === 'sending' ? 'Enviando…' : 'Quero receber o Movimento 1'}
        </button>
        {state === 'error' && (
          <p className="text-red-400 text-xs text-center">
            Não foi possível enviar. Confira o e-mail ou WhatsApp e tente de novo.
          </p>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed">{CONSENT_TEXT}</p>
      </div>
    </form>
  );
}

const MOVIMENTOS = [
  { n: '1', titulo: 'Sair do automático', resumo: 'Atender com presença real, não roteiro decorado.' },
  { n: '2', titulo: 'Ler o cliente', resumo: 'Identificar o que o cliente precisa antes do que ele pede.' },
  { n: '3', titulo: 'Indicar com segurança', resumo: 'Recomendar a partir do diagnóstico, não da margem.' },
  { n: '4', titulo: 'Sustentar valor', resumo: 'Justificar preço com argumentação técnica, sem desconto reflexo.' },
  { n: '5', titulo: 'WhatsApp que converte', resumo: 'Reabrir a conversa que ficou sem fechar — sem caçar.' },
];

export default function OsiPublicLanding() {
  return (
    <div className="min-h-screen bg-[#0A2540] text-white font-sans">
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">

        {/* Eyebrow + título */}
        <div className="mb-12 text-center">
          <div className="text-xs font-mono uppercase tracking-widest text-[#06B6D4] mb-4">
            Mentoria Tatiana Camargo · DIGIAI Academy
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Ótica Sem Improviso
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-xl mx-auto leading-relaxed">
            O método em <strong>5 movimentos</strong> pra sua equipe parar de atender no improviso
            e começar a vender com clareza no balcão e no WhatsApp.
          </p>
        </div>

        {/* 5 movimentos */}
        <div className="space-y-3 mb-12">
          {MOVIMENTOS.map(m => (
            <div key={m.n} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#06B6D4]/20 border border-[#06B6D4]/40 flex items-center justify-center font-mono text-[#06B6D4] font-bold">
                {m.n}
              </div>
              <div>
                <div className="font-bold text-white mb-1">{m.titulo}</div>
                <div className="text-sm text-slate-400">{m.resumo}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Como você recebe */}
        <div className="grid sm:grid-cols-3 gap-3 mb-12">
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-2 text-[#06B6D4]" />
            <div className="text-xs text-slate-300">PDF pra imprimir<br/>e usar no balcão</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
            <Target className="w-5 h-5 mx-auto mb-2 text-[#06B6D4]" />
            <div className="text-xs text-slate-300">App pra estudar<br/>pelo celular</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-[#06B6D4]" />
            <div className="text-xs text-slate-300">Acesso 90 dias<br/>pra implantar</div>
          </div>
        </div>

        {/* CTA principal */}
        <div className="bg-gradient-to-br from-[#06B6D4]/20 to-transparent border border-[#06B6D4]/40 rounded-lg p-8 text-center mb-6">
          <Wallet className="w-6 h-6 mx-auto mb-3 text-[#06B6D4]" />
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
            Investimento único · acesso 90 dias
          </div>
          <div className="text-4xl font-bold mb-4">
            R$ {PRICE_BRL.toFixed(2).replace('.', ',')}
          </div>
          <a
            href={HOTMART_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#06B6D4] text-[#0A2540] hover:bg-[#0eb8da] font-bold text-sm uppercase tracking-widest rounded-md transition-all"
          >
            Quero o método
            <ArrowRight className="w-4 h-4" />
          </a>
          <div className="text-[10px] text-slate-500 mt-3 font-mono">
            Checkout Hotmart · 7 dias de garantia
          </div>
        </div>

        {/* Captura de lead — quem não compra agora deixa contato */}
        <LeadForm />

        {/* Link pra landing completa */}
        <div className="text-center">
          <a
            href={FULL_LANDING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#06B6D4] hover:underline"
          >
            Quero ver tudo em detalhes →
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 font-mono mt-12 pt-8 border-t border-white/10">
          DIGIAI Academy · Mentoria Tatiana Camargo
        </div>

      </main>
    </div>
  );
}
