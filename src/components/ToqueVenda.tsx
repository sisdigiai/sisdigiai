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
//
// 06/10 (migration 191): entraram ABERTURA e FRASE DO DONO. O motivo está medido: 67 pessoas clicaram no
// WhatsApp do Clearix, 1 demo foi pedida, e a dor não estava escrita em lugar nenhum do banco. A `nota` que
// já existia é o que QUEM REGISTRA achou; a frase é o que O DONO DA ÓTICA disse. Guardar só a nota perde o
// dado que a pauta das dores precisa, e nota antiga ninguém reescreve depois.
//
// As duas continuam OPCIONAIS de propósito, e a frase vem antes da nota na tela. Obrigar mataria o registro
// na terceira ligação — foi assim que a versão sem elas chegou a 0 toques em 6 dias. A ordem é o que ensina
// qual dos dois campos importa, sem travar quem está com o telefone na mão.

interface Opcao { lead_id: string; otica: string; cidade: string | null; uf: string | null }

const TIPOS = [
  { id: 'ligacao', rotulo: 'Ligação', Icone: Phone },
  { id: 'demo', rotulo: 'Demo', Icone: Monitor },
  { id: 'piloto', rotulo: 'Piloto', Icone: Rocket },
] as const;

// Lista FECHADA, igual à do banco (check em ops.toque_venda). Fechada porque a pergunta é "qual abertura faz
// responder", e isso só tem resposta se o valor for comparável — texto livre daria 20 grafias da mesma coisa.
const ABERTURAS = [
  { id: 'dinheiro_parado', rotulo: 'Dinheiro parado' },
  { id: 'cliente_nao_volta', rotulo: 'Cliente não volta' },
  { id: 'lente_cara', rotulo: 'Lente cara' },
  { id: 'outra', rotulo: 'Outra' },
] as const;

type Tipo = (typeof TIPOS)[number]['id'];
type Abertura = (typeof ABERTURAS)[number]['id'];

export default function ToqueVenda({ oticaFixa, leadFixo, aoRegistrar, compacto }: {
  oticaFixa?: string; leadFixo?: string; aoRegistrar?: () => void; compacto?: boolean;
}) {
  const [tipo, setTipo] = useState<Tipo>('ligacao');
  const [otica, setOtica] = useState(oticaFixa ?? '');
  const [leadId, setLeadId] = useState<string | null>(leadFixo ?? null);
  const [nota, setNota] = useState('');
  const [abertura, setAbertura] = useState<Abertura | null>(null);
  const [frase, setFrase] = useState('');
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
      p_abertura: abertura, p_frase_do_dono: frase.trim() || null,
    });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setFeito(`${TIPOS.find((t) => t.id === tipo)!.rotulo} · ${otica.trim()}`);
    if (!oticaFixa) { setOtica(''); setLeadId(null); }
    setNota(''); setFrase(''); setAbertura(null); setSugestoes([]);
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

        <button onClick={registrar} disabled={!otica.trim() || salvando}
          className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-secondary text-on-action disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/90 transition-colors">
          {salvando ? 'gravando…' : 'Registrar'}
        </button>
      </div>

      {/* Abertura: clicar de novo no mesmo limpa. Sem valor padrão — "nenhuma" é resposta honesta e um
          padrão viraria o valor mais contado da base sem ninguém ter escolhido. */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted mr-0.5">abertura</span>
        {ABERTURAS.map(({ id, rotulo }) => (
          <button key={id} onClick={() => setAbertura(abertura === id ? null : id)}
            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
              abertura === id
                ? 'border-secondary bg-secondary/15 text-on-surface'
                : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40'}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {/* A frase vem antes da nota e ocupa o dobro do espaço: é o dado bruto, e a nota é a minha leitura.
          Quem olha a tela tem de saber qual é qual sem ler documentação. */}
      <div className="flex flex-wrap items-stretch gap-2 mt-2">
        <input value={frase} onChange={(e) => setFrase(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') registrar(); }}
          maxLength={500}
          placeholder="O que ELE disse, nas palavras dele"
          className="flex-[2] min-w-[200px] bg-surface-lowest border border-outline/20 px-3 py-2 text-sm text-on-surface placeholder:text-muted focus:border-secondary/60 outline-none" />

        <input value={nota} onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') registrar(); }}
          placeholder="Nota minha (opcional)"
          className="flex-1 min-w-[140px] bg-surface-lowest border border-outline/20 px-3 py-2 text-[13px] text-on-surface placeholder:text-muted focus:border-secondary/60 outline-none" />
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
