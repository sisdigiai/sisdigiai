import { Maximize2 } from 'lucide-react';
import type { CopyAsset, CopyStatus } from '../../lib/copyStore';
import StatusSelector from './StatusSelector';
import CopyButton from './CopyButton';
import ImageUploader from './ImageUploader';

type Props = {
  asset: CopyAsset;
  onStatusChange: (id: string, status: CopyStatus) => void;
  onUpload: (id: string, file: File) => Promise<void>;
  onRemoveImage: (id: string) => Promise<void>;
  onExpand: (asset: CopyAsset) => void;
};

export default function CopyCard({ asset, onStatusChange, onUpload, onRemoveImage, onExpand }: Props) {
  const { content } = asset;
  const mainText = content.headline || content.assunto || content.mensagem || content.corpo || '';
  const bodyText = content.corpo || content.mensagem || '';
  const ctaText = content.cta || '';

  return (
    <div className="bg-[#0A0F1E] border border-white/8 rounded-xl p-4 flex gap-4">
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{asset.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/30 font-mono">{asset.format}</span>
              {asset.angulo && (
                <span className="text-[10px] text-[#06B6D4]/70 bg-[#06B6D4]/10 px-1.5 py-0.5 rounded">
                  {asset.angulo}
                </span>
              )}
            </div>
          </div>
          <StatusSelector status={asset.status} onChange={(s) => onStatusChange(asset.id, s)} />
        </div>

        {/* Copy preview */}
        <div className="space-y-1.5">
          {mainText && mainText !== bodyText && (
            <p className="text-xs font-bold text-white/80 line-clamp-1">{mainText}</p>
          )}
          {bodyText && (
            <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{bodyText}</p>
          )}
          {ctaText && (
            <p className="text-xs text-[#06B6D4] font-medium">CTA: {ctaText}</p>
          )}
          {content.roteiro && (
            <p className="text-xs text-white/40 italic line-clamp-2">
              {content.roteiro.slice(0, 2).join(' | ')}...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <CopyButton content={content} asset={asset} />
          <button
            onClick={() => onExpand(asset)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            <Maximize2 size={12} /> Expandir
          </button>
        </div>
      </div>

      {/* Image */}
      <ImageUploader
        imageUrl={asset.image_url}
        onUpload={(file) => onUpload(asset.id, file)}
        onRemove={() => onRemoveImage(asset.id)}
      />
    </div>
  );
}
