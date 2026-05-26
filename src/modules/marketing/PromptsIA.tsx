import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw, Filter, ExternalLink, Loader2 } from 'lucide-react';
import { marketingStore, type AiPromptTemplate, type RenderedPrompt, type ContentIdea } from '../../lib/marketingStore';

const CATEGORY_LABEL: Record<string, string> = {
  text: 'Texto', image: 'Imagem', video: 'Vídeo', audio: 'Áudio', music: 'Música',
};

const TARGET_LABEL: Record<string, string> = {
  chatgpt: 'ChatGPT', claude: 'Claude', midjourney: 'Midjourney', dalle: 'DALL-E', gemini: 'Gemini',
  sora: 'Sora', runway: 'Runway', elevenlabs: 'ElevenLabs', suno: 'Suno', generic: 'Genérico',
};

const TARGET_LINK: Record<string, string> = {
  chatgpt: 'https://chat.openai.com', claude: 'https://claude.ai', midjourney: 'https://www.midjourney.com',
  dalle: 'https://chat.openai.com', gemini: 'https://gemini.google.com', sora: 'https://sora.com',
  runway: 'https://runwayml.com', elevenlabs: 'https://elevenlabs.io', suno: 'https://suno.com', generic: '',
};

const CATEGORY_COLOR: Record<string, string> = {
  text: '#06B6D4', image: '#8B5CF6', video: '#F59E0B', audio: '#10B981', music: '#EC4899',
};

export function PromptsIA() {
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [selected, setSelected] = useState<AiPromptTemplate | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');
  const [rendered, setRendered] = useState<RenderedPrompt | null>(null);
  const [rendering, setRendering] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [t, i] = await Promise.all([
      marketingStore.listPromptTemplates(),
      marketingStore.listIdeas(),
    ]);
    setTemplates(t);
    setIdeas(i);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const targets = useMemo(
    () => Array.from(new Set(templates.map(t => t.ai_target))),
    [templates]
  );

  const filtered = useMemo(
    () => templates.filter(t =>
      (categoryFilter === 'all' || t.category === categoryFilter) &&
      (targetFilter === 'all' || t.ai_target === targetFilter)
    ),
    [templates, categoryFilter, targetFilter]
  );

  const render = async (template: AiPromptTemplate, ideaId: string) => {
    setRendering(true);
    setRendered(null);
    setCopied(false);
    const r = await marketingStore.renderPrompt({
      templateId: template.id,
      ideaId: ideaId || null,
    });
    setRendered(r);
    setRendering(false);
  };

  const handleSelectTemplate = (t: AiPromptTemplate) => {
    setSelected(t);
    if (selectedIdeaId || ideas.length === 0) {
      render(t, selectedIdeaId);
    } else {
      // Sem ideia escolhida ainda — renderiza puro
      render(t, '');
    }
  };

  const handleIdeaChange = (ideaId: string) => {
    setSelectedIdeaId(ideaId);
    if (selected) render(selected, ideaId);
  };

  const handleCopy = () => {
    if (!rendered) return;
    navigator.clipboard.writeText(rendered.rendered_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#06B6D4]" />
          <div className="text-sm text-white/60">{templates.length} templates · prompts travados pela marca</div>
        </div>

        <div className="flex-1" />

        <Filter className="w-4 h-4 text-white/40" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">Todas categorias</option>
          <option value="text">Texto</option>
          <option value="image">Imagem</option>
          <option value="video">Vídeo</option>
          <option value="audio">Áudio</option>
          <option value="music">Música</option>
        </select>
        <select value={targetFilter} onChange={e => setTargetFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">Todas IAs</option>
          {targets.map(t => <option key={t} value={t}>{TARGET_LABEL[t] ?? t}</option>)}
        </select>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/10 rounded-lg hover:bg-white/5">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Aviso de travas */}
      <div className="mb-6 bg-[#06B6D4]/5 border border-[#06B6D4]/20 rounded-lg p-4 text-xs text-white/70">
        <strong className="text-[#06B6D4]">Como funciona:</strong> cada template já contém as travas da marca Ótica Sem Improviso (tom, paleta, restrições — sem hype, sem promessa de cura, sem coach).
        Escolha uma ideia do banco para injetar contexto (hook, brief, pilar) e copie o prompt pronto pra colar na IA escolhida.
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Carregando templates...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Lista */}
          <div className="space-y-2">
            {filtered.map(t => {
              const color = CATEGORY_COLOR[t.category] ?? '#06B6D4';
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left bg-white/5 border rounded-lg p-3 hover:bg-white/[0.08] transition-colors border-l-4 ${selected?.id === t.id ? 'border-white/30 ring-1 ring-[#06B6D4]/40' : 'border-white/10'}`}
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>
                      {CATEGORY_LABEL[t.category] ?? t.category}
                    </span>
                    <span className="text-[10px] text-white/40">{TARGET_LABEL[t.ai_target] ?? t.ai_target}</span>
                  </div>
                  <div className="text-sm font-medium">{t.name}</div>
                  {t.description && <div className="text-[11px] text-white/40 mt-1 line-clamp-2">{t.description}</div>}
                </button>
              );
            })}
          </div>

          {/* Preview/Render */}
          <div>
            {!selected ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center text-white/40">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Escolha um template à esquerda para renderizar.</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 sticky top-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{selected.name}</h3>
                    {selected.description && <p className="text-xs text-white/50 mt-1">{selected.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {TARGET_LINK[selected.ai_target] && (
                      <a href={TARGET_LINK[selected.ai_target]} target="_blank" rel="noreferrer"
                         className="flex items-center gap-1 text-xs text-white/60 hover:text-white border border-white/10 rounded px-2 py-1">
                        Abrir {TARGET_LABEL[selected.ai_target]} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button onClick={handleCopy} disabled={!rendered}
                            className="flex items-center gap-1 text-xs bg-[#06B6D4] text-[#0A0F1E] font-medium px-3 py-1.5 rounded hover:bg-[#06B6D4]/90 disabled:opacity-50">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar prompt'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1">Contexto (ideia do banco — opcional)</label>
                  <select value={selectedIdeaId} onChange={e => handleIdeaChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <option value="">(sem ideia — usar apenas travas da marca)</option>
                    {ideas.map(i => (
                      <option key={i.id} value={i.id}>
                        [{i.pillar_code ?? '?'}] {i.hook.slice(0, 70)}
                      </option>
                    ))}
                  </select>
                </div>

                {selected.output_hint && (
                  <div className="text-[11px] bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded p-2 text-[#06B6D4]">
                    {selected.output_hint}
                  </div>
                )}

                {rendering ? (
                  <div className="flex items-center gap-2 text-sm text-white/60 py-8">
                    <Loader2 className="w-4 h-4 animate-spin" /> Renderizando...
                  </div>
                ) : rendered ? (
                  <>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Prompt renderizado</div>
                      <pre className="text-xs text-white/80 bg-black/40 border border-white/10 rounded p-3 whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">{rendered.rendered_prompt}</pre>
                    </div>

                    <details className="bg-white/[0.02] border border-white/5 rounded p-3">
                      <summary className="text-[10px] uppercase tracking-widest font-bold text-white/40 cursor-pointer">Variáveis injetadas ({Object.keys(rendered.vars_used).length})</summary>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        {Object.entries(rendered.vars_used).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-[#06B6D4] font-mono">{k}:</span>
                            <span className="text-white/60 truncate">{String(v).slice(0, 80) || '(vazio)'}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
