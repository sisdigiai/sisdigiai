import { useState } from 'react';
import { Send, CheckCircle2, Loader2, Heart } from 'lucide-react';
import { marketingStore } from '../lib/marketingStore';

export default function TestimonialPublicForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    optica_name: '',
    city: '',
    state: '',
    whatsapp: '',
    whatsapp_consent: false,
    hook_applied: '',
    story: '',
    sale_value: '',  // string em reais; converte pra cents na hora de enviar
    photo_url: '',
    rating: 5,
    hotmart_transaction: '',
  });

  const update = (k: keyof typeof form, v: any) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.full_name.trim().length < 2) { setError('Coloca seu nome completo, por favor.'); return; }
    if (form.story.trim().length < 20) { setError('Conta um pouco mais sobre a sua história — pelo menos 20 caracteres.'); return; }

    setSending(true);
    const saleCents = form.sale_value
      ? Math.round(parseFloat(form.sale_value.replace(',', '.')) * 100)
      : undefined;

    const id = await marketingStore.submitTestimonial({
      full_name: form.full_name.trim(),
      optica_name: form.optica_name.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      whatsapp_consent: form.whatsapp_consent,
      hook_applied: form.hook_applied.trim() || undefined,
      story: form.story.trim(),
      sale_value_cents: saleCents,
      photo_url: form.photo_url.trim() || undefined,
      rating: form.rating,
      hotmart_transaction: form.hotmart_transaction.trim() || undefined,
      user_agent: navigator.userAgent,
    });
    setSending(false);

    if (id) { setSent(true); }
    else { setError('Não rolou enviar. Tenta de novo em alguns segundos.'); }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-[#10B981] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-3">Recebemos, valeu demais!</h1>
          <p className="text-sm text-on-surface-variant mb-2">
            A Taty lê pessoalmente todos os depoimentos. Se a gente decidir usar o seu como conteúdo, te avisa antes pelo WhatsApp.
          </p>
          <p className="text-xs text-muted mt-6 flex items-center gap-1 justify-center">
            <Heart className="w-3 h-3 text-[#EC4899]" /> Ótica Sem Improviso
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="border-b border-outline/10 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-[10px] uppercase tracking-widest font-bold text-secondary mb-1">
            Ótica Sem Improviso
          </div>
          <h1 className="text-2xl font-semibold">Conta sua história, vendedor</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Aplicou alguma coisa do método e deu certo no balcão? Manda pra Taty.
            Se o seu caso virar conteúdo, a gente te marca antes de publicar.
          </p>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-5">
        <Field label="Seu nome *" required>
          <input value={form.full_name} onChange={e => update('full_name', e.target.value)}
            placeholder="Como você se chama" className={inputCls} required minLength={2} maxLength={120} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome da ótica onde você trabalha">
            <input value={form.optica_name} onChange={e => update('optica_name', e.target.value)} placeholder="Ex: Ótica Visão" className={inputCls} />
          </Field>
          <Field label="Cidade / UF">
            <div className="flex gap-2">
              <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Cidade" className={inputCls + ' flex-1'} />
              <input value={form.state} onChange={e => update('state', e.target.value.toUpperCase())} placeholder="UF" maxLength={2} className={inputCls + ' w-16'} />
            </div>
          </Field>
        </div>

        <Field label="Qual hook/aula você aplicou? (opcional)">
          <input value={form.hook_applied} onChange={e => update('hook_applied', e.target.value)}
            placeholder='Ex: "Quando o cliente entra perguntando quanto custa"' className={inputCls} />
        </Field>

        <Field label="Conta a história * (o que aconteceu no balcão, como você aplicou, o que mudou)" required>
          <textarea value={form.story} onChange={e => update('story', e.target.value)} rows={6}
            placeholder="Pode ser direto. Cliente entrou, eu fiz X, conversamos Y, fechamos Z. Sem precisar caprichar — a gente edita depois se publicar."
            className={inputCls + ' resize-none'} required minLength={20} maxLength={4000} />
          <div className="text-[10px] text-muted mt-1 text-right">{form.story.length} / 4000</div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quanto foi a venda? (opcional, em R$)">
            <input value={form.sale_value} onChange={e => update('sale_value', e.target.value)}
              placeholder="Ex: 850,00" inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="Quantas estrelas pro método?">
            <div className="flex gap-1 mt-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => update('rating', n)}
                  className={`text-2xl ${n <= form.rating ? 'text-[#F59E0B]' : 'text-muted hover:text-muted'}`}>★</button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="WhatsApp pra gente te avisar se publicar (opcional)">
          <input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)}
            placeholder="Ex: 11 99999-0000" className={inputCls} />
          <label className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
            <input type="checkbox" checked={form.whatsapp_consent}
              onChange={e => update('whatsapp_consent', e.target.checked)}
              className="accent-secondary" />
            Pode me chamar no WhatsApp se decidirem usar meu depoimento
          </label>
        </Field>

        <Field label="Link da sua foto (opcional — Google Drive, Instagram, qualquer link público)">
          <input value={form.photo_url} onChange={e => update('photo_url', e.target.value)}
            placeholder="https://..." className={inputCls} />
        </Field>

        <Field label="Código da compra Hotmart (opcional — pra gente confirmar que você é comprador)">
          <input value={form.hotmart_transaction} onChange={e => update('hotmart_transaction', e.target.value)}
            placeholder="HP-..." className={inputCls} />
        </Field>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">{error}</div>
        )}

        <button type="submit" disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-secondary text-surface font-semibold py-3 hover:bg-secondary/90 disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Enviando...' : 'Enviar depoimento'}
        </button>

        <p className="text-[11px] text-muted text-center">
          Seus dados ficam só com a gente. Sem cadastro, sem spam.
        </p>
      </form>
    </div>
  );
}

const inputCls = 'w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-secondary text-on-surface placeholder:text-muted';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-on-surface-variant block mb-1.5">
        {label}{required && <span className="text-secondary"> *</span>}
      </label>
      {children}
    </div>
  );
}
