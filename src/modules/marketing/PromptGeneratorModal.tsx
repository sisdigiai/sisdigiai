import { useEffect, useMemo, useState } from 'react';
import { X, Copy, Check, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { marketingStore, type AiPromptTemplate, type RenderedPrompt, type CalendarPost, type ContentIdea } from '../../lib/marketingStore';

type Source =
  | { kind: 'post'; post: CalendarPost }
  | { kind: 'idea'; idea: ContentIdea }
  | { kind: 'blank' };

interface Props {
  source: Source;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  text: 'Texto', image: 'Imagem', video: 'Vídeo', audio: 'Áudio', music: 'Música',
};

const TARGET_LABEL: Record<string, string> = {
  chatgpt: 'ChatGPT', claude: 'Claude', midjourney: 'Midjourney', dalle: 'DALL-E', gemini: 'Gemini',
  sora: 'Sora', runway: 'Runway', elevenlabs: 'ElevenLabs', suno: 'Suno', generic: 'Genérico',
};

const TARGET_LINK: Record<string, string> = {
  chatgpt: 'https://chat.openai.com',
  claude: 'https://claude.ai',
  midjourney: 'https://www.midjourney.com',
  dalle: 'https://chat.openai.com',
  gemini: 'https://gemini.google.com',
  sora: 'https://sora.com',
  runway: 'https://runwayml.com',
  elevenlabs: 'https://elevenlabs.io',
  suno: 'https://suno.com',
  generic: '',
};

export function PromptGeneratorModal({ source, onClose }: Props) {
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AiPromptTemplate | null>(null);
  const [rendered, setRendered] = useState<RenderedPrompt | null>(null);
  const [rendering, setRendering] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await marketingStore.listPromptTemplates();
      setTemplates(list);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => templates.filter(t => categoryFilter === 'all' || t.category === categoryFilter),
    [templates, categoryFilter]
  );

  const handleSelect = async (t: AiPromptTemplate) => {
    setSelected(t);
    setRendered(null);
    setCopied(false);
    setRendering(true);
    const postId = source.kind === 'post' ? source.post.id : null;
    const ideaId = source.kind === 'idea' ? source.idea.id : null;
    const r = await marketingStore.renderPrompt({ templateId: t.id, postId, ideaId });
    setRendered(r);
    setRendering(false);
  };

  const handleCopy = () => {
    if (!rendered) return;
    navigator.clipboard.writeText(rendered.rendered_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sourceLabel =
    source.kind === 'post' ? `Post: ${source.post.hook ?? '(sem hook)'}`
    : source.kind === 'idea' ? `Ideia: ${source.idea.hook}`
    : 'Sem fonte (template puro)';

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-lowest" />
      <div className="relative m-auto w-full max-w-5xl h-[85vh] bg-surface-container border border-outline/10 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        <div className="border-b border-outline/10 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              <h2 className="text-lg font-semibold">Gerar prompts para IA</h2>
            </div>
            <p className="text-xs text-muted mt-1">{sourceLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 grid grid-cols-[280px_1fr] overflow-hidden">
          {/* Lista de templates */}
          <div className="border-r border-outline/10 overflow-y-auto">
            <div className="p-3 border-b border-outline/10">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-surface-low border border-outline/10 px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">Todas categorias</option>
                <option value="text">Texto</option>
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="music">Música</option>
              </select>
            </div>
            {loading ? (
              <div className="p-4 text-xs text-muted">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-xs text-muted">Nenhum template.</div>
            ) : (
              <div className="divide-y divide-outline/10">
                {filtered.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={`w-full text-left px-3 py-3 hover:bg-surface-highest transition-colors ${selected?.id === t.id ? 'bg-secondary/15 border-l-2 border-secondary' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-muted">{CATEGORY_LABEL[t.category] ?? t.category}</span>
                      <span className="text-[10px] text-secondary">{TARGET_LABEL[t.ai_target] ?? t.ai_target}</span>
                    </div>
                    <div className="text-sm font-medium text-on-surface mt-1">{t.name}</div>
                    {t.description && <div className="text-[11px] text-muted mt-1 line-clamp-2">{t.description}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Render */}
          <div className="overflow-y-auto p-6">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted">
                <Sparkles className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Escolha um template à esquerda.</p>
                <p className="text-xs mt-2 text-muted max-w-md">
                  O prompt é renderizado com os dados do post/ideia + travas da marca (tom, paleta, restrições). Cole o resultado direto na IA escolhida.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{selected.name}</h3>
                    <p className="text-xs text-muted mt-1">{selected.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {TARGET_LINK[selected.ai_target] && (
                      <a
                        href={TARGET_LINK[selected.ai_target]}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface border border-outline/10 px-2 py-1"
                      >
                        Abrir {TARGET_LABEL[selected.ai_target]} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={handleCopy}
                      disabled={!rendered}
                      className="flex items-center gap-1 text-xs bg-secondary text-surface font-medium px-3 py-1.5 hover:bg-secondary/90 disabled:opacity-50"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar prompt'}
                    </button>
                  </div>
                </div>

                {selected.output_hint && (
                  <div className="text-[11px] bg-secondary/15 border border-secondary/40 p-2 text-secondary">
                    {selected.output_hint}
                  </div>
                )}

                {rendering ? (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant py-8">
                    <Loader2 className="w-4 h-4 animate-spin" /> Renderizando...
                  </div>
                ) : rendered ? (
                  <>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">Prompt renderizado</div>
                      <pre className="text-xs text-on-surface bg-surface-lowest border border-outline/10 p-3 whitespace-pre-wrap font-mono max-h-[40vh] overflow-y-auto">{rendered.rendered_prompt}</pre>
                    </div>

                    {Object.keys(rendered.vars_used).length > 0 && (
                      <details className="bg-surface-low border border-outline/10 p-3">
                        <summary className="text-[10px] uppercase tracking-widest font-bold text-muted cursor-pointer">Variáveis usadas ({Object.keys(rendered.vars_used).length})</summary>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          {Object.entries(rendered.vars_used).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-secondary font-mono">{k}:</span>
                              <span className="text-on-surface-variant truncate">{String(v).slice(0, 80)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted py-8">Falha ao renderizar — veja console.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
