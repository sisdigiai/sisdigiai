import { supabase } from './supabase';
import { seedCopyAssets } from './copySeedData';

/* ─── Types ─── */

export type CopyCategory =
  | 'landing'
  | 'ads'
  | 'stories_carrossel'
  | 'video'
  | 'email'
  | 'whatsapp'
  | 'pagina_obrigado';

export type CopyStatus = 'pendente' | 'criado' | 'aprovado';

export type CopyContent = {
  headline?: string;
  corpo?: string;
  cta?: string;
  texto_imagem?: string;
  nota_visual?: string;
  roteiro?: string[];
  slides?: Array<{ slide: number; tipo?: string; texto_principal?: string; texto?: string }>;
  assunto?: string;
  preview?: string;
  mensagem?: string;
  [key: string]: unknown;
};

export type CopyImage = {
  url: string;
  path: string;
};

export type CopyAsset = {
  id: string;
  category: CopyCategory;
  title: string;
  format: string;
  angulo?: string;
  content: CopyContent;
  status: CopyStatus;
  images: CopyImage[];
  image_url: string | null;
  image_path: string | null;
  source_file: string;
  source_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const MULTI_IMAGE_CATEGORIES: ReadonlySet<CopyCategory> = new Set([
  'stories_carrossel',
  'ads',
]);

export function supportsMultipleImages(category: CopyCategory): boolean {
  return MULTI_IMAGE_CATEGORIES.has(category);
}

export type CopyWorkspace = {
  version: 1;
  updated_at: string;
  assets: CopyAsset[];
  seeded: boolean;
};

/* ─── Constants ─── */

const LS_KEY = 'digiai_copy_osi_workspace';
const STORAGE_BUCKET = 'osi-criativos';

export const CATEGORY_LABELS: Record<CopyCategory, string> = {
  landing: 'Landing Page',
  ads: 'Criativos & Ads',
  stories_carrossel: 'Stories & Carrosséis',
  video: 'Vídeos & Reels',
  email: 'E-mail Marketing',
  whatsapp: 'WhatsApp & Bio',
  pagina_obrigado: 'Página de Obrigado',
};

export const STATUS_LABELS: Record<CopyStatus, string> = {
  pendente: 'Pendente',
  criado: 'Criado',
  aprovado: 'Aprovado',
};

/* ─── Helpers ─── */

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function now(): string {
  return new Date().toISOString();
}

function readLocal(): CopyWorkspace {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return createEmpty();
    const parsed = JSON.parse(raw) as CopyWorkspace;
    if (!parsed.assets) return createEmpty();
    // Migra assets que não têm images[] (workspaces antigos do localStorage)
    let mutated = false;
    for (const a of parsed.assets) {
      if (!Array.isArray(a.images)) {
        a.images = a.image_url && a.image_path
          ? [{ url: a.image_url, path: a.image_path }]
          : [];
        mutated = true;
      }
    }
    if (mutated) writeLocal(parsed);
    return parsed;
  } catch {
    return createEmpty();
  }
}

function writeLocal(data: CopyWorkspace): void {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...data, updated_at: now() }));
}

function createEmpty(): CopyWorkspace {
  return { version: 1, updated_at: now(), assets: [], seeded: false };
}

async function syncAssetImagesToRemote(asset: CopyAsset): Promise<void> {
  if (!isSupabaseReady()) return;
  const { error } = await supabase
    .from('v_copy_assets')
    .update({ images: asset.images, updated_at: asset.updated_at })
    .eq('source_id', asset.id);
  if (error) console.warn('[copyStore] sync images failed:', error.message);
}

/* ─── Store ─── */

export const copyStore = {
  isOnline: isSupabaseReady,

  getWorkspace(): CopyWorkspace {
    const ws = readLocal();
    if (!ws.seeded) {
      const seeded = { ...ws, assets: seedCopyAssets(), seeded: true, updated_at: now() };
      writeLocal(seeded);
      return seeded;
    }
    return ws;
  },

  getAssetsByCategory(category: CopyCategory): CopyAsset[] {
    const ws = this.getWorkspace();
    return ws.assets
      .filter((a) => a.category === category)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async updateStatus(assetId: string, status: CopyStatus): Promise<CopyWorkspace> {
    const ws = readLocal();
    const asset = ws.assets.find((a) => a.id === assetId);
    if (!asset) return ws;

    asset.status = status;
    asset.updated_at = now();
    ws.updated_at = now();
    writeLocal(ws);

    if (isSupabaseReady()) {
      await supabase
        .from('v_copy_assets')
        .update({ status, updated_at: asset.updated_at })
        .eq('source_id', assetId)
        .then(({ error }) => {
          if (error) console.warn('[copyStore] sync status failed:', error.message);
        });
    }

    return ws;
  },

  async attachImage(assetId: string, file: File): Promise<CopyWorkspace> {
    const ws = readLocal();
    const asset = ws.assets.find((a) => a.id === assetId);
    if (!asset) return ws;

    if (!isSupabaseReady()) {
      console.warn('[copyStore] Supabase not ready — cannot upload image');
      return ws;
    }

    const ext = file.name.split('.').pop() || 'webp';
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${asset.category}/${assetId}-${Date.now()}-${rand}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      console.error('[copyStore] upload failed:', uploadError.message);
      return ws;
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const newImage: CopyImage = { url: urlData.publicUrl, path };

    if (supportsMultipleImages(asset.category)) {
      // Carrosséis e ads: append no array
      asset.images = [...asset.images, newImage];
    } else {
      // Single-image: substitui (limpa anteriores do storage)
      const oldPaths = asset.images.map((img) => img.path).filter(Boolean);
      if (oldPaths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(oldPaths);
      }
      asset.images = [newImage];
    }

    asset.image_url = asset.images[0]?.url ?? null;
    asset.image_path = asset.images[0]?.path ?? null;
    asset.updated_at = now();
    ws.updated_at = now();
    writeLocal(ws);

    await syncAssetImagesToRemote(asset);

    return ws;
  },

  async removeImage(assetId: string, index = 0): Promise<CopyWorkspace> {
    const ws = readLocal();
    const asset = ws.assets.find((a) => a.id === assetId);
    if (!asset || index < 0 || index >= asset.images.length) return ws;

    const removed = asset.images[index];

    if (isSupabaseReady() && removed.path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([removed.path]);
    }

    asset.images = asset.images.filter((_, i) => i !== index);
    asset.image_url = asset.images[0]?.url ?? null;
    asset.image_path = asset.images[0]?.path ?? null;
    asset.updated_at = now();
    ws.updated_at = now();
    writeLocal(ws);

    await syncAssetImagesToRemote(asset);

    return ws;
  },

  async reorderImages(assetId: string, newOrder: CopyImage[]): Promise<CopyWorkspace> {
    const ws = readLocal();
    const asset = ws.assets.find((a) => a.id === assetId);
    if (!asset) return ws;

    // Validação: novo array deve conter exatamente os mesmos paths
    const oldPaths = new Set(asset.images.map((i) => i.path));
    const newPaths = new Set(newOrder.map((i) => i.path));
    if (oldPaths.size !== newPaths.size || ![...oldPaths].every((p) => newPaths.has(p))) {
      console.warn('[copyStore] reorderImages rejected: path set mismatch');
      return ws;
    }

    asset.images = [...newOrder];
    asset.image_url = asset.images[0]?.url ?? null;
    asset.image_path = asset.images[0]?.path ?? null;
    asset.updated_at = now();
    ws.updated_at = now();
    writeLocal(ws);

    await syncAssetImagesToRemote(asset);

    return ws;
  },

  async syncToRemote(): Promise<CopyWorkspace> {
    const ws = readLocal();
    if (!isSupabaseReady()) return ws;

    for (const asset of ws.assets) {
      await supabase
        .from('v_copy_assets')
        .upsert(
          {
            source_id: asset.id,
            category: asset.category,
            title: asset.title,
            format: asset.format,
            angulo: asset.angulo || null,
            content: asset.content,
            status: asset.status,
            images: asset.images,
            source_file: asset.source_file,
            sort_order: asset.sort_order,
          },
          { onConflict: 'source_id' },
        )
        .then(({ error }) => {
          if (error) console.warn('[copyStore] sync failed for', asset.id, error.message);
        });
    }

    return ws;
  },

  reset(): CopyWorkspace {
    localStorage.removeItem(LS_KEY);
    return this.getWorkspace();
  },
};
