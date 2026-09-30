import { useEffect, useRef, useState } from 'react';
import { Phone, Monitor, Rocket, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Registro de venda em 1 toque (migration 166, plano de vendas de 30 dias).
//
// O gargalo declarado pelo dono é o TEMPO DELE. Então a regra deste componente é: do clique ao registro,
// nada que atrase. Escolhe o tipo, digita ou escolhe a ótica, Enter. A nota é opcional e fica por último —
// campo obrigatório a mais é o que faz o registro morrer na terceira ligação e o placar voltar a ser
// preenchido de memória na sexta.
//
// A lista de óticas vem do funil (v_mkt_funil_leads) mas NÃO obriga: ótica que o dono conhece e não está na
// base se digita livre, e o registro guarda lead_id nulo. Obrigar a existir na base seria perder justamente
// a venda que o plano diz que vai acontecer primeiro — a de quem já o conhece.

interface Opcao { lead_id: string; otica: string; cidade: string | null; uf: string | null }

const TIPOS = [
  { id: 'ligacao', rotulo: 'Ligação', Icone: Phone },
  { id: 'demo', rotulo: 'Demo', Icone: Monitor },
  { id: 'piloto', rotulo: 'Piloto', Icone: Rocket },
] as const;

type Tipo = (typeof TIPOS)[number]['id'];

export default function ToqueVenda({ oticaFixa, leadFixo, aoRegistrar, compacto }: {
  oticaFixa?: string; leadFixo?: string; aoRegistrar?: () => void; compacto?: boolean;
}) {
  const [tipo, setTipo] = useState<Tipo>('ligacao');
  const [otica, setOtica] = useState(oticaFixa ?? '');
  const [leadId, setLeadId] = useState<string | null>(leadFixo ?? null);
  const [nota, setNota] = useState('');
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [sugestoes, setSugestoes] = useState<Opcao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (oticaFixa) return;
    supabase.from('v_mkt_funil_leads').select('lead_id, otica, cidade, uf').then(({ data }) => {
      setOpcoes((data ?? []).filter((o) => (o as Opcao).otica) as Opcao[]);
    });
  }, [oticaFixa]);

  const buscar = (texto: string) => {
    setOtica(texto);
    setLeadId(null);            // digitou de novo: a escolha anterior não vale mais
    const q = texto.trim().toLowerCase();
    setSugestoes(q.length < 2 ? [] : opcoes.filter((o) => o.otica.toLowerCase().includes(q)).slice(0, 6));
  };

  const registrar = async () => {
    if (!otica.trim() || salvando) return;
    setSalvando(true); setErro(null);
    const { error } = await supabase.rpc('fn_registrar_toque', {
      p_tipo: tipo, p_otica: otica.trim(), p_lead_id: leadId, p_nota: nota.trim() || null,
    });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setFeito(`${TIPOS.find((t) => t.id === tipo)!.rotulo} · ${otica.trim()}`);
    if (!oticaFixa) { setOtica(''); setLeadId(null); }
    setNota(''); setSugestoes([]);
    aoRegistrar?.();
    setTimeout(() => setFeito(null), 4000);
    campo.current?.focus();
  };

  return (
    <div className={compacto ? '' : 'border border-outline/15 bg-surface-container p-4'}>
      {!compacto && (
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary mb-3">
          Registrar toque de venda
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 border border-outline/15 p-0.5">
          {TIPOS.map(({ id, rotulo, Icone }) => (
            <button key={id} onClick={() => setTipo(id)}
              className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 transition-colors ${
                tipo === id ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
              <Icone className="w-3 h-3" /> {rotulo}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <input ref={campo} value={otica} onChange={(e) => buscar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') registrar(); }}
            disabled={!!oticaFixa}
            placeholder="Ótica (digite ou escolha)"
            className="w-full bg-surface-lowest border border-outline/20 px-3 py-2 text-sm text-on-surface placeholder:text-muted focus:border-secondary/60 outline-none disabled:opacity-60" />
          {sugestoes.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-0.5 border border-outline/25 bg-surface max-h-52 overflow-y-auto">
              {sugestoes.map((o) => (
                <button key={o.lead_id}
                  onClick={() => { setOtica(o.otica); setLeadId(o.lead_id); setSugestoes([]); }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-high border-b border-outline/10 last:border-b-0">
                  <div className="text-[13px] text-on-surface">{o.otica}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
                    {o.cidade ?? '—'}{o.uf ? `/${o.uf}` : ''} · do funil
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <input value={nota} onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') registrar(); }}
          placeholder="Nota (opcional)"
          className="flex-1 min-w-[140px] bg-surface-lowest border border-outline/20 px-3 py-2 text-sm text-on-surface placeholder:text-muted focus:border-secondary/60 outline-none" />

        <button onClick={registrar} disabled={!otica.trim() || salvando}
          className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-secondary text-on-action disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/90 transition-colors">
          {salvando ? 'gravando…' : 'Registrar'}
        </button>
      </div>

      {feito && (
        <div className="flex items-center gap-1.5 mt-2 font-mono text-[10px] uppercase tracking-wider text-success">
          <Check className="w-3 h-3" /> {feito} registrado
        </div>
      )}
      {erro && <div className="mt-2 text-[12px] text-danger">Não gravou: {erro}</div>}
    </div>
  );
}
