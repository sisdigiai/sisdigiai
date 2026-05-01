import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';

type Props = {
  imageUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUploader({ imageUrl, onUpload, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    try {
      await onUpload(file);
    } catch {
      setError('Falha no upload.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  if (imageUrl) {
    return (
      <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10 group shrink-0">
        <img src={imageUrl} alt="Criativo" className="w-full h-full object-cover" />
        <button
          onClick={async () => {
            setLoading(true);
            await onRemove();
            setLoading(false);
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Remover imagem"
        >
          {loading ? <Loader2 size={12} className="animate-spin text-white" /> : <X size={12} className="text-white" />}
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#06B6D4] bg-[#06B6D4]/10'
            : 'border-white/15 hover:border-white/30 bg-white/3'
        }`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin text-white/50" />
        ) : (
          <>
            <Upload size={16} className="text-white/30" />
            <span className="text-[10px] text-white/30 text-center leading-tight">Arraste ou<br />clique</span>
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
      {error && <p className="text-[10px] text-red-400 mt-1 max-w-[112px]">{error}</p>}
    </div>
  );
}
