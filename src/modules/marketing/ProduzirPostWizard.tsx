import { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Check, Copy, ExternalLink, Loader2, Upload, ArrowRight, ArrowLeft, ImagePlus, Mic, Music, Film, FileText } from 'lucide-react';
import { marketingStore, type AiPromptTemplate, type CalendarPost } from '../../lib/marketingStore';

type Output = Awaited<ReturnType<typeof marketingStore.listPostOutputs>>[number];

interface Props {
  post: CalendarPost;
  onClose: () => void;
  onChanged: () => void;
}

const STEPS = [
  { id: 1, category: 'text',  label: 'Roteiro / Copy',  icon: FileText, color: '#06B6D4',
    templates: ['chatgpt-reel-roteiro','chatgpt-instagram-feed','chatgpt-carrossel-10-slides','chatgpt-email-lista','chatgpt-whatsapp-1msg'] },
  { id: 2, category: 'image', label: 'Capa / Arte',     icon: ImagePlus, color: '#8B5CF6',
    templates: ['midjourney-capa-quadrada','midjourney-story-vertical','midjourney-infografico','dalle-capa-quadrada'] },
  { id: 3, category: 'audio', label: 'Voz / Narração',  icon: Mic, color: '#F59E0B',
    templates: ['elevenlabs-voiceover-reel'] },
  { id: 4, category: 'video', label: 'Vídeo / Trilha',  icon: Film, color: '#EC4899',
    templates: ['sora-reel-balcao-30s','suno-trilha-reel'] },
] as const;

const AI_LINKS: Record<string,string> = {
  chatgpt: 'https://chatgpt.com', claude: 'https://claude.ai',
  midjourney: 'https://www.midjourney.com', dalle: 'https://chatgpt.com',
  sora: 'https://sora.com', elevenlabs: 'https://elevenlabs.io',
  suno: 'https://suno.com', gemini: 'https://gemini.google.com',
};

export function ProduzirPostWizard({ post, onClose, onChanged }: Props) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AiPromptTemplate | null>(null);
  const [renderedPrompt, setRenderedPrompt] = useState<string>('');
  const [outputText, setOutputText] = useState('');
  const [outputUrl, setOutputUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, o] = await Promise.all([
        marketingStore.listPromptTemplates(),
        marketingStore.listPostOutputs(post.id),
      ]);
      setTemplates(t);
      setOutputs(o);
    })();
  }, [post.id]);

  const currentStep = STEPS.find(s => s.id === step)!;
  const stepTemplates = useMemo(
    () => templates.filter(t => (currentStep.templates as readonly string[]).includes(t.code)),
    [templates, step]
  );
  const stepOutputs = useMemo(
    () => outputs.filter(o => o.category === currentStep.category),
    [outputs, step]
  );

  const handlePick = async (t: AiPromptTemplate) => {
    setSelectedTemplate(t);
    setRenderedPrompt('Renderizando...');
    setOutputText('');
    setOutputUrl('');
    const r = await marketingStore.renderPrompt({ templateId: t.id, postId: post.id });
    if (r) setRenderedPrompt(r.rendered_prompt);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await marketingStore.uploadAsset(post.id, file);
    setUploading(false);
    if (r) setOutputUrl(r.url);
    else alert('Erro no upload.');
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    if (!outputText.trim() && !outputUrl.trim()) {
      alert('Cola a resposta da IA OU faça upload da arte (pelo menos um).');
      return;
    }
    setSaving(true);
    const id = await marketingStore.savePostOutput({
      post_id: post.id,
      template_id: selectedTemplate.id,
      ai_provider: selectedTemplate.ai_target,
      prompt_rendered: renderedPrompt,
      output_text: outputText || undefined,
      output_url: outputUrl || undefined,
    });
    setSaving(false);
    if (id) {
      // Recarrega outputs
      const o = await marketingStore.listPostOutputs(post.id);
      setOutputs(o);
      setSelectedTemplate(null);
      setRenderedPrompt('');
      setOutputText('');
      setOutputUrl('');
      onChanged();
      // Avança step se este já tem ao menos 1 output
      if (stepOutputs.length === 0 && step < 4) setStep(step + 1);
    } else alert('Erro ao salvar.');
  };

  const stepDoneCount = (s: typeof STEPS[number]) =>
    outputs.filter(o => o.category === s.category).length;

  return (
    <div className="fixed inset-0 z-[60] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative ml-auto w-full max-w-4xl h-full bg-[#0F1729] border-l border-white/10 overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1729] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <h2 className="text-lg font-semibold">Produzir post</h2>
            </div>
            <p className="text-xs text-white/40 mt-1 truncate max-w-xl">{post.hook ?? '(sem hook)'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = stepDoneCount(s) > 0;
              const isCurrent = s.id === step;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => { setStep(s.id); setSelectedTemplate(null); }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      isCurrent ? 'border-white/40 bg-white/5' : 'border-white/10 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? '' : 'bg-white/10 text-white/40'}`}
                      style={done ? { background: s.color, color: '#0A0F1E' } : {}}>
                      {done ? <Check className="w-3.5 h-3.5" /> : s.id}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-semibold truncate">{s.label}</div>
                      <div className="text-[10px] text-white/40">{stepDoneCount(s)} outputs</div>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Lista templates do step */}
          {!selectedTemplate && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                  Escolha o template ({currentStep.label})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stepTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handlePick(t)}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 text-left hover:bg-white/[0.08] border-l-4"
                      style={{ borderLeftColor: currentStep.color }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: currentStep.color }}>{t.ai_target}</span>
                      </div>
                      <div className="text-sm font-medium">{t.name}</div>
                      {t.description && <div className="text-[11px] text-white/40 mt-1 line-clamp-2">{t.description}</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outputs já feitos nesse step */}
              {stepOutputs.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                    Já produzido ({stepOutputs.length})
                  </div>
                  <div className="space-y-2">
                    {stepOutputs.map(o => (
                      <div key={o.id} className="bg-white/5 border border-white/10 rounded p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-white/60">
                            {o.template_name ?? o.template_code} · {o.ai_provider}
                          </span>
                          <span className="text-[10px] text-white/30">{new Date(o.generated_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {o.output_text && <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-sans mt-1 max-h-32 overflow-y-auto">{o.output_text.slice(0, 400)}{o.output_text.length > 400 ? '…' : ''}</pre>}
                        {o.output_url && (
                          <a href={o.output_url} target="_blank" rel="noreferrer" className="text-xs text-[#06B6D4] flex items-center gap-1 mt-2">
                            <ExternalLink className="w-3 h-3" /> Abrir arte
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tela do template escolhido */}
          {selectedTemplate && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{selectedTemplate.name}</h3>
                <button onClick={() => setSelectedTemplate(null)} className="text-xs text-white/40 hover:text-white">
                  ← Voltar
                </button>
              </div>

              {/* Prompt + copiar */}
              <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                    Prompt pronto pra colar em {selectedTemplate.ai_target}
                  </span>
                  <div className="flex items-center gap-2">
                    {AI_LINKS[selectedTemplate.ai_target] && (
                      <a href={AI_LINKS[selectedTemplate.ai_target]} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white border border-white/10 rounded px-2 py-1">
                        Abrir {selectedTemplate.ai_target} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button onClick={handleCopy}
                      className="flex items-center gap-1 text-[11px] bg-[#06B6D4] text-[#0A0F1E] font-medium px-3 py-1.5 rounded hover:bg-[#06B6D4]/90">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{renderedPrompt}</pre>
              </div>

              {/* Área de resposta */}
              {currentStep.category === 'text' && (
                <div>
                  <label className="text-xs text-white/70 block mb-1">Cole aqui a resposta da {selectedTemplate.ai_target}:</label>
                  <textarea value={outputText} onChange={e => setOutputText(e.target.value)} rows={10}
                    placeholder='Ctrl+V depois de copiar a resposta no ChatGPT/Claude'
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#06B6D4]/50 text-white font-mono" />
                </div>
              )}

              {(currentStep.category === 'image' || currentStep.category === 'video' || currentStep.category === 'audio') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">URL da arte / vídeo / áudio gerado:</label>
                    <input value={outputUrl} onChange={e => setOutputUrl(e.target.value)}
                      placeholder='https://i.imgur.com/... ou Canva/Drive'
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">OU upload direto (até 50MB):</label>
                    <label className="flex items-center justify-center gap-2 w-full bg-white/5 border border-dashed border-white/20 rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/[0.08] cursor-pointer">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? 'Subindo...' : 'Escolher arquivo'}
                      <input type="file" className="hidden" onChange={handleUpload}
                        accept={currentStep.category === 'image' ? 'image/*' : currentStep.category === 'video' ? 'video/*' : 'audio/*'} />
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-white/70 block mb-1">Notas (opcional):</label>
                    <textarea value={outputText} onChange={e => setOutputText(e.target.value)} rows={2}
                      placeholder='Ex: usei a 3ª variação do Midjourney'
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                </div>
              )}

              {/* Salvar */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button onClick={handleSave} disabled={saving || (!outputText.trim() && !outputUrl.trim())}
                  className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#10B981]/90 text-sm disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar output
                </button>
                <span className="text-[11px] text-white/40">
                  Vai pra "Já produzido" desse step e dispara pipeline auto.
                </span>
              </div>
            </>
          )}

          {/* Navegação steps */}
          {!selectedTemplate && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white px-3 py-1.5 disabled:opacity-30">
                <ArrowLeft className="w-3 h-3" /> Anterior
              </button>
              <span className="text-xs text-white/40">Step {step} de {STEPS.length}</span>
              <button onClick={() => setStep(Math.min(STEPS.length, step + 1))} disabled={step === STEPS.length}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white px-3 py-1.5 disabled:opacity-30">
                Próximo <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
