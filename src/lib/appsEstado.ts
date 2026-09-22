import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Estado de cada app vindo do banco (public.v_ops_apps_estado, migration 140): a parte declarada vem da ficha
// (Cockpit/Apps/<app>/ficha.md, pelo runner) e a medida vem da máquina (deploy pelo cron, repo pelo runner).
// Sem fallback: se a view falhar, a tela diz que falhou — não volta a mostrar constante velha como se fosse verdade.

export interface AppEstado {
  slug: string; nome: string; tier: string | null; tagline: string | null; funcao: string | null;
  proximo: string | null; bloqueio: string | null; maturidade: string | null;
  urls: Record<string, string> | string[] | null; ficha_fonte: string;
  declarado_em: string; declaracao_valida_ate: string; declaracao_vencida: boolean;
  deploy_ok: boolean | null; deploy_build: string | null; deploy_medido_em: string | null; deploy_sem_sinal_recente: boolean;
  repo_commit: string | null; repo_push_em_dia: boolean | null; repo_medido_em: string | null;
  eventos_30d: number; vendas_mercado: number; degrau: number; degrau_por: string;
}

export type EstadoApps = { porSlug: Map<string, AppEstado>; linhas: AppEstado[]; carregando: boolean; erro: string | null };

export function useAppsEstado(): EstadoApps {
  const [s, setS] = useState<EstadoApps>({ porSlug: new Map(), linhas: [], carregando: true, erro: null });
  useEffect(() => {
    let vivo = true;
    supabase.from('v_ops_apps_estado').select('*').then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setS({ porSlug: new Map(), linhas: [], carregando: false, erro: error.message }); return; }
      const linhas = (data ?? []) as AppEstado[];
      setS({ porSlug: new Map(linhas.map((l) => [l.slug, l])), linhas, carregando: false, erro: null });
    });
    return () => { vivo = false; };
  }, []);
  return s;
}

export function haQuanto(iso: string | null): string {
  if (!iso) return 'nunca';
  const min = Math.floor((Date.now() - new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).getTime()) / 60000);
  if (min < 60) return `há ${Math.max(min, 0)} min`;
  if (min < 48 * 60) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} dias`;
}

export function urlsDaFicha(urls: AppEstado['urls']): { label: string; url: string }[] {
  if (!urls) return [];
  const pares = Array.isArray(urls) ? urls.map((u) => ['link', u] as const) : Object.entries(urls);
  return pares.filter(([, u]) => typeof u === 'string' && /^https?:\/\//.test(u)).map(([label, url]) => ({ label, url }));
}
