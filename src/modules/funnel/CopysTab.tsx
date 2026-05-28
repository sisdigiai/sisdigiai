import { useMemo, useState } from 'react';
import { ChevronDown, FileText, RefreshCw } from 'lucide-react';
import {
  copyStore,
  CATEGORY_LABELS,
  type CopyAsset,
  type CopyCategory,
  type CopyImage,
  type CopyStatus,
  type CopyWorkspace,
} from '../../lib/copyStore';
import CopyCard from './CopyCard';
import CopyModal from './CopyModal';

const CATEGORY_ORDER: CopyCategory[] = [
  'ads',
  'stories_carrossel',
  'video',
  'email',
  'whatsapp',
  'landing',
  'pagina_obrigado',
];

export default function CopysTab() {
  const [workspace, setWorkspace] = useState<CopyWorkspace>(() => copyStore.getWorkspace());
  const [expandedModal, setExpandedModal] = useState<CopyAsset | null>(null);
  const [collapsed, setCollapsed] = useState<Set<CopyCategory>>(new Set());

  const stats = useMemo(() => {
    const total = workspace.assets.length;
    const pendente = workspace.assets.filter((a) => a.status === 'pendente').length;
    const criado = workspace.assets.filter((a) => a.status === 'criado').length;
    const aprovado = workspace.assets.filter((a) => a.status === 'aprovado').length;
    const comImagem = workspace.assets.filter((a) => a.image_url).length;
    return { total, pendente, criado, aprovado, comImagem };
  }, [workspace]);

  const grouped = useMemo(() => {
    const map = new Map<CopyCategory, CopyAsset[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const asset of workspace.assets) {
      const list = map.get(asset.category);
      if (list) list.push(asset);
    }
    return map;
  }, [workspace]);

  const handleStatusChange = async (id: string, status: CopyStatus) => {
    const next = await copyStore.updateStatus(id, status);
    setWorkspace({ ...next });
  };

  const handleUpload = async (id: string, file: File) => {
    const next = await copyStore.attachImage(id, file);
    setWorkspace({ ...next });
  };

  const handleRemoveImage = async (id: string, index: number) => {
    const next = await copyStore.removeImage(id, index);
    setWorkspace({ ...next });
  };

  const handleReorderImages = async (id: string, images: CopyImage[]) => {
    const next = await copyStore.reorderImages(id, images);
    setWorkspace({ ...next });
  };

  const handleReset = () => {
    if (!confirm('Resetar todas as copys para o estado inicial? Status e imagens serao perdidos.')) return;
    const next = copyStore.reset();
    setWorkspace(next);
  };

  const toggleCategory = (cat: CopyCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-semibold">Central de Copys OSI</h2>
          </div>
          <p className="text-sm text-muted mt-1">
            {stats.total} peças · {stats.comImagem} com imagem
          </p>
        </div>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-surface-highest text-muted hover:text-on-surface-variant transition-colors"
          title="Resetar workspace"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-low border border-outline/10 p-4 text-center">
          <div className="text-2xl font-bold text-on-surface-variant">{stats.pendente}</div>
          <div className="text-xs text-muted mt-1">Pendentes</div>
        </div>
        <div className="bg-secondary/15 border border-secondary/40 p-4 text-center">
          <div className="text-2xl font-bold text-secondary">{stats.criado}</div>
          <div className="text-xs text-secondary/60 mt-1">Criados</div>
        </div>
        <div className="bg-emerald-400/5 border border-emerald-400/20 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-300">{stats.aprovado}</div>
          <div className="text-xs text-emerald-300/60 mt-1">Aprovados</div>
        </div>
      </div>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const assets = grouped.get(cat) || [];
        if (assets.length === 0) return null;
        const isCollapsed = collapsed.has(cat);
        const catAprovados = assets.filter((a) => a.status === 'aprovado').length;

        return (
          <section key={cat} className="bg-surface-low border border-outline/10 overflow-hidden">
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-surface-highest transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-on-surface">{CATEGORY_LABELS[cat]}</h3>
                <span className="text-xs text-muted">
                  {catAprovados}/{assets.length}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`text-muted transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              />
            </button>

            {!isCollapsed && (
              <div className="px-5 pb-5 space-y-3">
                {assets.map((asset) => (
                  <CopyCard
                    key={asset.id}
                    asset={asset}
                    onStatusChange={handleStatusChange}
                    onUpload={handleUpload}
                    onRemoveImage={handleRemoveImage}
                    onReorderImages={handleReorderImages}
                    onExpand={setExpandedModal}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Modal */}
      {expandedModal && (
        <CopyModal
          asset={
            // mantém o modal sincronizado com o workspace após cada mutação
            workspace.assets.find((a) => a.id === expandedModal.id) ?? expandedModal
          }
          onClose={() => setExpandedModal(null)}
          onStatusChange={(id, status) => {
            handleStatusChange(id, status);
            const updated = workspace.assets.find((a) => a.id === id);
            if (updated) setExpandedModal({ ...updated, status });
          }}
          onUpload={handleUpload}
          onRemoveImage={handleRemoveImage}
          onReorderImages={handleReorderImages}
        />
      )}
    </div>
  );
}
