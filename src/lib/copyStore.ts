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

export type CopyAsset = {
  id: string;
  category: CopyCategory;
  title: string;
  format: string;
  angulo?: string;
  content: CopyContent;
  status: CopyStatus;
  image_url: string | null;
  image_path: string | null;
  source_file: string;
  source_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

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
    const path = `${asset.category}/${assetId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error('[copyStore] upload failed:', uploadError.message);
      return ws;
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    asset.image_url = urlData.publicUrl;
    asset.image_path = path;
    asset.updated_at = now();
    ws.updated_at = now();
    writeLocal(ws);

    if (isSupabaseReady()) {
      await supabase
        .from('v_copy_assets')
        .update({ image_url: asset.image_url, image_path: asset.image_path, updated_at: asset.updated_at })
        .eq('source_id', assetId);
    }

    return ws;
  },

  async removeImage(assetId: string): Promise<CopyWorkspace> {
    const ws = readLocal();
    const asset = ws.assets.find((a) => a.id === assetId);
    if (!asset || !asset.image_path) return ws;

    if (isSupabaseReady()) {
      await supabase.storage.from(STORAGE_BUCKET).remove([asset.image_path]);
    }

    asset.image_url = null;
    asset.image_path = null;
    asset.updated_at = now();
    ws.updated_at = now();
    writeLocal(ws);

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
            image_url: asset.image_url,
            image_path: asset.image_path,
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
