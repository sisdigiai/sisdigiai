// Cliente Supabase secundário pra leitura cross-DB do Nexus.
// Banco: tkbhhbzhlqsgcwljeesg (anon key, only read).
// M4.2 (RECONCILIACAO_marketing_2026-05-31.md): mostra ativação Nexus dos
// compradores OSI durante 90 dias pós-compra.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_NEXUS_SUPABASE_URL;
const key = import.meta.env.VITE_NEXUS_SUPABASE_ANON_KEY;

export const nexusReady = !!url && !!key;

export const nexus: SupabaseClient | null = nexusReady
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface OsiOnboardingSummary {
  total_buyers: number;
  active_last_7d: number;
  active_last_30d: number;
  with_progress_50_plus: number;
  certificates_issued: number;
  avg_progress_pct: number | null;
}

// Tenta ler view canônica v_osi_onboarding_summary; retorna null se não existe.
// Pra criar essa view, ver migration plan em Cockpit/sessoes/RECONCILIACAO_marketing_2026-05-31.md M4.2.
export async function fetchOsiOnboardingSummary(): Promise<{
  data: OsiOnboardingSummary | null;
  error: string | null;
}> {
  if (!nexus) return { data: null, error: 'nexus_client_not_configured' };
  try {
    const { data, error } = await nexus
      .from('v_osi_onboarding_summary')
      .select('*')
      .maybeSingle();
    if (error) {
      // PGRST205 = view não existe — caminho esperado até view ser criada no Nexus
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return { data: null, error: 'view_not_created_in_nexus' };
      }
      return { data: null, error: error.message };
    }
    return { data: (data as OsiOnboardingSummary | null) ?? null, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}
