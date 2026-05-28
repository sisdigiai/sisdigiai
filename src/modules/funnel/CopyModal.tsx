import { useEffect } from 'react';
import { X, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { CopyAsset, CopyImage, CopyStatus } from '../../lib/copyStore';
import { supportsMultipleImages } from '../../lib/copyStore';
import StatusSelector from './StatusSelector';
import ImageUploader from './ImageUploader';
import ImageGallery from './ImageGallery';
import CopyButton, { copyFieldToClipboard } from './CopyButton';

type Props = {
  asset: CopyAsset;
  onClose: () => void;
  onStatusChange: (id: string, status: CopyStatus) => void;
  onUpload: (id: string, file: File) => Promise<void>;
  onRemoveImage: (id: string, index: number) => Promise<void>;
  onReorderImages: (id: string, next: CopyImage[]) => Promise<void>;
};

function FieldRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    await copyFieldToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-outline/10 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted hover:text-on-surface-variant transition-colors cursor-pointer"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

export default function CopyModal({
  asset,
  onClose,
  onStatusChange,
  onUpload,
  onRemoveImage,
  onReorderImages,
}: Props) {
  const { content } = asset;
  const isMulti = supportsMultipleImages(asset.category);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface border border-outline/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-outline/10 p-5 flex items-start justify-between gap-4 z-10">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{asset.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted font-mono">{asset.format}</span>
              {asset.angulo && (
                <span className="text-xs text-secondary/70 bg-secondary/15 px-2 py-0.5 rounded">
                  {asset.angulo}
                </span>
              )}
              <span className="text-xs text-muted">{asset.source_file}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CopyButton content={asset.content} asset={asset} />
            <StatusSelector status={asset.status} onChange={(s) => onStatusChange(asset.id, s)} />
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex gap-6">
          {/* Content fields */}
          <div className="flex-1 min-w-0">
            {content.assunto && <FieldRow label="Assunto" value={content.assunto} />}
            {content.preview && <FieldRow label="Preview" value={content.preview} />}
            {content.headline && <FieldRow label="Headline" value={content.headline} />}
            {content.corpo && <FieldRow label="Corpo" value={content.corpo} />}
            {content.mensagem && <FieldRow label="Mensagem" value={content.mensagem} />}
            {content.texto_imagem && <FieldRow label="Texto da imagem" value={content.texto_imagem} />}
            {content.cta && <FieldRow label="CTA" value={content.cta} />}
            {content.nota_visual && <FieldRow label="Nota visual" value={content.nota_visual} />}
            {content.roteiro && (
              <FieldRow label="Roteiro" value={content.roteiro.join('\n')} />
            )}
            {content.slides && (
              <div className="border-b border-outline/10 pb-3 mb-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Slides</span>
                <div className="space-y-2">
                  {(content.slides as Array<Record<string, unknown>>).map((slide, i) => (
                    <div key={i} className="bg-surface-low border border-outline/10 p-3">
                      <span className="text-[10px] font-bold text-secondary">
                        Slide {(slide.slide as number) || i + 1}
                        {slide.tipo && ` — ${slide.tipo}`}
                      </span>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {(slide.texto_principal as string) || (slide.texto as string) || JSON.stringify(slide)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Image side */}
          <div className={`shrink-0 ${isMulti ? 'w-72' : 'w-40'}`}>
            {isMulti ? (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Galeria · carrossel
                </div>
                <ImageGallery
                  images={asset.images}
                  onUpload={(file) => onUpload(asset.id, file)}
                  onRemove={(index) => onRemoveImage(asset.id, index)}
                  onReorder={(next) => onReorderImages(asset.id, next)}
                />
              </div>
            ) : asset.image_url ? (
              <div className="space-y-2">
                <img
                  src={asset.image_url}
                  alt="Criativo final"
                  className="w-full border border-outline/10 object-cover"
                />
                <ImageUploader
                  imageUrl={asset.image_url}
                  onUpload={(file) => onUpload(asset.id, file)}
                  onRemove={() => onRemoveImage(asset.id, 0)}
                />
              </div>
            ) : (
              <ImageUploader
                imageUrl={null}
                onUpload={(file) => onUpload(asset.id, file)}
                onRemove={() => onRemoveImage(asset.id, 0)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
