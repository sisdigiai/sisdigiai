import { useEffect, useState } from 'react';
import { lendoAgora, observarLeitura, ultimaLeitura } from './supabase';

// Estado de leitura da tela: está lendo agora, e que horas chegou a última resposta.
//
// Vem do `fetch` do cliente Supabase (ver `supabase.ts`), e não de cada componente, porque metade
// dos blocos de uma página lê sozinha: a página de cima não sabe quando a filha terminou. Contando
// no único lugar por onde todas passam, a hora mostrada é a hora de verdade.
export function useLeitura(): { carregando: boolean; ultima: number | null } {
  const [estado, setEstado] = useState(() => ({ carregando: lendoAgora(), ultima: ultimaLeitura() }));
  useEffect(() => observarLeitura(() => setEstado({ carregando: lendoAgora(), ultima: ultimaLeitura() })), []);
  return estado;
}

export function horaCurta(ms: number | null): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}
