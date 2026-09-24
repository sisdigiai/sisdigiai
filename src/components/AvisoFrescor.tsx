import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { haQuanto } from '../lib/appsEstado';

// Idade da tela declarada (public.v_ops_frescor, migration 151). Tela sem fonte automática não pode
// parecer viva: aqui ela diz de quando é o dado e quando venceu. Some quando está dentro da validade.

interface Frescor { tela: string; nome: string; fonte: string; ultimo: string; validade_dias: number; onde: string }

export default function AvisoFrescor({ tela, oQueFazer }: { tela: string; oQueFazer: string }) {
  const [f, setF] = useState<Frescor | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase.from('v_ops_frescor').select('*').eq('tela', tela).maybeSingle()
      .then(({ data }) => { if (vivo) setF((data ?? null) as Frescor | null); });
    return () => { vivo = false; };
  }, [tela]);

  if (!f) return null;
  const dias = Math.floor((Date.now() - new Date(f.ultimo).getTime()) / 864e5);
  if (dias <= f.validade_dias) return null;

  return (
    <div className="border border-warning/40 bg-warning/[0.06] px-4 py-3 mb-5 flex items-start gap-2.5">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <div className="text-[13px] text-on-surface-variant">
        <b className="text-on-surface">Esta tela mostra dado de {haQuanto(f.ultimo)}.</b>{' '}
        A fonte (<span className="font-mono text-[11px]">{f.fonte}</span>) não é alimentada desde então, e a validade é de {f.validade_dias} dias.
        {' '}{oQueFazer}
      </div>
    </div>
  );
}
