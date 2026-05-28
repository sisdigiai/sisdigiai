import { useRef, useState } from 'react';
import { Upload, X, Loader2, GripVertical } from 'lucide-react';
import type { CopyImage } from '../../lib/copyStore';

type Props = {
  images: CopyImage[];
  onUpload: (file: File) => Promise<void>;
  onRemove: (index: number) => Promise<void>;
  onReorder: (next: CopyImage[]) => Promise<void>;
};

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageGallery({ images, onUpload, onRemove, onReorder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) return 'Formato invalido. Use PNG, JPG ou WebP.';
    if (file.size > MAX_SIZE) return 'Arquivo muito grande (max 5MB).';
    return null;
  };

  const handleFile = async (file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      setError('Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (draggingIdx !== null) return; // reorder interno, ignora upload
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleRemove = async (i: number) => {
    setRemovingIdx(i);
    try {
      await onRemove(i);
    } finally {
      setRemovingIdx(null);
    }
  };

  // ── Drag and drop reorder ──
  const onItemDragStart = (i: number) => (e: React.DragEvent) => {
    setDraggingIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i)); // necessário em FF
  };

  const onItemDragOver = (i: number) => (e: React.DragEvent) => {
    if (draggingIdx === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(i);
  };

  const onItemDrop = (target: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const source = draggingIdx;
    setDraggingIdx(null);
    setOverIdx(null);
    if (source === null || source === target) return;
    const next = [...images];
    const [moved] = next.splice(source, 1);
    next.splice(target, 0, moved);
    await onReorder(next);
  };

  const onItemDragEnd = () => {
    setDraggingIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => {
          const isDragging = draggingIdx === i;
          const isOver = overIdx === i && draggingIdx !== null && draggingIdx !== i;
          const removing = removingIdx === i;
          return (
            <div
              key={img.path || `${img.url}-${i}`}
              draggable={!removing}
              onDragStart={onItemDragStart(i)}
              onDragOver={onItemDragOver(i)}
              onDrop={onItemDrop(i)}
              onDragEnd={onItemDragEnd}
              className={`relative w-20 h-20 overflow-hidden border group shrink-0 transition-all ${
                isDragging ? 'opacity-40 scale-95' : ''
              } ${isOver ? 'border-secondary ring-2 ring-secondary/40' : 'border-outline/10'}`}
              title={`Imagem ${i + 1} — arraste para reordenar`}
            >
              <img src={img.url} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" />
              {/* Numeração */}
              <div className="absolute bottom-1 left-1 bg-black/70 text-on-surface text-[10px] font-mono px-1 rounded">
                {i + 1}
              </div>
              {/* Drag handle */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded p-0.5 cursor-grab active:cursor-grabbing">
                <GripVertical size={10} className="text-on-surface" />
              </div>
              {/* Remover */}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={removing}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                title="Remover imagem"
              >
                {removing ? <Loader2 size={10} className="animate-spin text-on-surface" /> : <X size={10} className="text-on-surface" />}
              </button>
            </div>
          );
        })}

        {/* Slot de upload (sempre visível) */}
        <div className="shrink-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (draggingIdx === null) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropFile}
            onClick={() => inputRef.current?.click()}
            className={`w-20 h-20 border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              dragOver
                ? 'border-secondary bg-secondary/15'
                : 'border-outline/30 hover:border-outline/30 bg-surface-low'
            }`}
            title="Adicionar imagem"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin text-on-surface-variant" />
            ) : (
              <>
                <Upload size={14} className="text-muted" />
                <span className="text-[9px] text-muted text-center leading-tight">
                  + adicionar
                </span>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      </div>

      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {images.length > 1 && (
        <p className="text-[10px] text-muted">
          {images.length} imagens · arraste para reordenar
        </p>
      )}
    </div>
  );
}
