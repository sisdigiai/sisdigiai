import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Fonte única das URLs do ecossistema: company.digital_assets (categoria='site').
// Mapa key-da-sidebar → rotulo exato no banco. As constantes na Sidebar continuam
// como fallback (offline / RLS / rotulo renomeado), então isto nunca quebra a nav.
const ASSET_ROTULO: Record<string, string> = {
  'clearix-hub': 'Clearix Hub (gateway SSO + launcher)',
  'atlas': 'Clearix Atlas (meta-visualização)',
  'osi': 'App leitor OSI',
  'nexus': 'Nexus',
  'pulsocontrol': 'Pulso Control',
  'polapetit': 'Polapetit (landing)',
  'lumina': 'Lumina',
  'qualafoto': 'Qual a Foto',
  'easyidiomas': 'Easy Aula+ (ex-Easy Idiomas — gestão de escola)',
  'niposchool': 'Nipo School',
};

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

export function useEcosystemUrls(): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isSupabaseReady()) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .schema('company')
          .from('digital_assets')
          .select('rotulo, valor, status')
          .eq('categoria', 'site')
          .in('rotulo', Object.values(ASSET_ROTULO));
        if (!alive || !data) return;
        const byRotulo: Record<string, string> = {};
        for (const row of data as { rotulo: string; valor: string; status: string }[]) {
          if (row.status === 'ativo' && row.valor) byRotulo[row.rotulo] = row.valor;
        }
        const next: Record<string, string> = {};
        for (const [key, rotulo] of Object.entries(ASSET_ROTULO)) {
          if (byRotulo[rotulo]) next[key] = byRotulo[rotulo];
        }
        setUrls(next);
      } catch {
        /* mantém o fallback das constantes da Sidebar */
      }
    })();
    return () => { alive = false; };
  }, []);

  return urls;
}
