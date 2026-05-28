import { useState, useRef, useEffect } from 'react';
import { Check, Copy, ChevronDown } from 'lucide-react';
import type { CopyContent, CopyAsset } from '../../lib/copyStore';

type CopyMode = 'text' | 'json' | 'json_en';

type Props = {
  content: CopyContent;
  asset?: CopyAsset;
  compact?: boolean;
};

/* ─── PT text (current behavior) ─── */
function contentToText(content: CopyContent): string {
  const parts: string[] = [];

  if (content.assunto) parts.push(`Assunto: ${content.assunto}`);
  if (content.headline) parts.push(content.headline);
  if (content.corpo) parts.push(content.corpo);
  if (content.mensagem) parts.push(content.mensagem);
  if (content.texto_imagem) parts.push(`[Texto imagem]\n${content.texto_imagem}`);
  if (content.cta) parts.push(`CTA: ${content.cta}`);
  if (content.roteiro) parts.push(content.roteiro.join('\n'));
  if (content.nota_visual) parts.push(`[Nota visual] ${content.nota_visual}`);

  return parts.join('\n\n');
}

/* ─── JSON (PT) — structured for agents ─── */
function contentToJSON(content: CopyContent, asset?: CopyAsset): string {
  const obj: Record<string, unknown> = {};

  if (asset) {
    obj.titulo = asset.title;
    obj.formato = asset.format;
    if (asset.angulo) obj.angulo = asset.angulo;
    obj.categoria = asset.category;
  }

  if (content.headline) obj.headline = content.headline;
  if (content.corpo) obj.corpo = content.corpo;
  if (content.cta) obj.cta = content.cta;
  if (content.texto_imagem) obj.texto_imagem = content.texto_imagem;
  if (content.nota_visual) obj.nota_visual = content.nota_visual;
  if (content.assunto) obj.assunto = content.assunto;
  if (content.preview) obj.preview = content.preview;
  if (content.mensagem) obj.mensagem = content.mensagem;
  if (content.roteiro) obj.roteiro = content.roteiro;
  if (content.slides) obj.slides = content.slides;

  return JSON.stringify(obj, null, 2);
}

/* ─── Format dimensions map ─── */
const FORMAT_DIMENSIONS: Record<string, string> = {
  'Feed (1:1)': '1080x1080px',
  'Feed (4:5)': '1080x1350px',
  'Stories (9:16)': '1080x1920px',
  'stories_9x16': '1080x1920px',
  'carrossel': '1080x1080px (multi-slide)',
  'reels_9x16': '1080x1920px (video)',
  'email': '600px max-width',
  'landing_section': 'Full-width responsive',
  'pagina': 'Full-width responsive',
};

/* ─── JSON (EN) — FULL prompt for visual agents ─── */
function contentToJSONEn(content: CopyContent, asset?: CopyAsset): string {
  const obj: Record<string, unknown> = {};

  // Role & task
  obj.role = 'You are a visual designer specializing in editorial marketing for optical retail.';
  obj.task = 'Create the final visual piece below. Follow the design system strictly. Keep ALL text in Portuguese exactly as provided — do not translate or rephrase the copy.';

  // Piece metadata
  const piece: Record<string, unknown> = {};
  if (asset) {
    piece.title = asset.title;
    piece.format = asset.format;
    piece.dimensions = FORMAT_DIMENSIONS[asset.format] || '1080x1080px';
    if (asset.angulo) piece.angle = asset.angulo;
    piece.category = asset.category;
  }
  obj.piece = piece;

  // Copy content (keep in PT)
  const copyContent: Record<string, unknown> = {};
  if (content.headline) copyContent.headline = content.headline;
  if (content.corpo) copyContent.body_text = content.corpo;
  if (content.cta) copyContent.cta_button = content.cta;
  if (content.texto_imagem) copyContent.text_on_image = content.texto_imagem;
  if (content.nota_visual) copyContent.visual_direction = content.nota_visual;
  if (content.assunto) copyContent.email_subject = content.assunto;
  if (content.preview) copyContent.email_preview = content.preview;
  if (content.mensagem) copyContent.message = content.mensagem;
  if (content.roteiro) copyContent.video_script = content.roteiro;
  if (content.slides) copyContent.slides = content.slides;
  obj.copy = copyContent;

  // Full design system
  obj.design_system = {
    brand: {
      product: 'Ótica Sem Improviso',
      methodology: 'Os 5 Movimentos',
      tagline: 'Pare de atender no improviso na ótica.',
    },
    colors: {
      primary: {
        accent: '#406863',
        accent_dark: '#2D4A47',
        warm_50: '#FDFBF7 (main background)',
        warm_100: '#F7F3ED (highlight background)',
        warm_200: '#E8E2D9 (borders, subtle lines)',
        warm_800: '#1A1814 (dark sections, offer block)',
      },
      modules: {
        '1_sair_automatico': '#9E8632',
        '2_ler_cliente': '#3A7D5C',
        '3_indicar_seguranca': '#C86D58',
        '4_sustentar_valor': '#2C5A7E',
        '5_whatsapp_converte': '#128C7E',
      },
      usage: {
        cta_background: '#406863 (accent)',
        cta_text: 'white',
        headings: '#1A1814 (warm_800)',
        body: 'warm_600',
        subtle: 'warm_400',
      },
    },
    typography: {
      display: 'Caladea (Serif) — headlines, section titles, module names',
      body: 'Lato (Sans-serif) — body text, descriptions, CTAs',
      hierarchy: {
        h1: 'Caladea Bold, 60-72px, leading 1.05',
        h2: 'Caladea Bold, 36-40px, leading tight',
        h3: 'Caladea Bold, 24-28px',
        eyebrow: 'Lato Bold, 12px, uppercase, tracking 0.2em, accent color',
        body: 'Lato Light, 18px, leading relaxed',
        cta: 'Lato Bold, 14px, uppercase, widest tracking',
      },
    },
    components: {
      cards: 'border: 1px solid warm_200, radius: 12-16px, padding: 24-40px, shadow-sm',
      badges: 'background: warm_100, border: warm_200, radius: full (pill)',
      cta_button: 'background: accent, text: white, radius: 6px, padding: 16px 32px, uppercase bold',
      module_card: 'top bar 4px height in module color, badge with module number',
    },
    creative_direction: {
      style: 'Editorial, clean, professional. Like a magazine, not a flyer.',
      spacing: 'Generous whitespace. Sections with py-16 (mobile) to py-24 (desktop).',
      photography: 'If using photos, prefer real optical store context. Avoid generic stock.',
      prefer: [
        'Typography as visual element',
        'White space / breathing room',
        'Clear visual hierarchy',
        'Module colors for differentiation',
        'Subtle borders on cards',
        'Editorial tone (magazine-like)',
      ],
      never_use: [
        'Generic stock photos',
        'Flashy gradients',
        'Emojis in main text',
        'Fake urgency (countdown timers, "last spots")',
        'Coach/guru language',
        'Neon or highly saturated colors',
        'Cluttered layouts',
      ],
    },
  };

  // Output instructions
  obj.output = {
    deliver: 'Final production-ready image/design',
    text_language: 'Portuguese (PT-BR) — DO NOT translate copy text',
    instructions_language: 'English',
    notes: [
      'Place headline text prominently using Caladea Bold',
      'CTA button must use accent color (#406863) with white text',
      'If visual_direction field is provided, follow it as layout guidance',
      'If text_on_image is provided, that is the exact text to render on the visual',
      'Maintain editorial feel — no clutter, no visual noise',
    ],
  };

  return JSON.stringify(obj, null, 2);
}

export function copyFieldToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

const MODE_LABELS: Record<CopyMode, string> = {
  text: 'Texto (PT)',
  json: 'JSON (PT)',
  json_en: 'Prompt Completo (EN)',
};

export default function CopyButton({ content, asset, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleCopy = async (mode: CopyMode) => {
    let text: string;
    switch (mode) {
      case 'json':
        text = contentToJSON(content, asset);
        break;
      case 'json_en':
        text = contentToJSONEn(content, asset);
        break;
      default:
        text = contentToText(content);
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        onClick={() => handleCopy('text')}
        className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
          copied ? 'text-emerald-300' : 'text-muted hover:text-on-surface-variant'
        }`}
        title="Copiar texto"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center">
        <button
          onClick={() => handleCopy('json_en')}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer px-2 py-1 rounded-l-md hover:bg-surface-highest ${
            copied ? 'text-emerald-300' : 'text-muted hover:text-on-surface-variant'
          }`}
          title="Copiar JSON (EN) — prompt para agent visual"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-1 py-1 text-muted hover:text-on-surface-variant hover:bg-surface-highest rounded-r-md transition-colors cursor-pointer border-l border-outline/10"
          title="Opções de cópia"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {showMenu && (
        <div className="absolute bottom-full left-0 mb-1 bg-[#141B2D] border border-outline/10 shadow-xl py-1 z-50 min-w-[140px]">
          {(Object.keys(MODE_LABELS) as CopyMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleCopy(mode)}
              className="w-full text-left px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-highest transition-colors cursor-pointer"
            >
              {MODE_LABELS[mode]}
              {mode === 'json_en' && (
                <span className="text-[10px] text-secondary/60 ml-1">agent</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
