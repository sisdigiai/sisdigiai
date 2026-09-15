import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { prospeccaoStore, type PlacarProspeccao, type Braco, type LinhaBraco } from '../../lib/prospeccaoStore';

const INTERVALO_MS = 60_000;

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—';

type Metrica = { chave: keyof LinhaBraco; rotulo: string; semFonte?: boolean };

const METRICAS: Metrica[] = [
  { chave: 'agendadas', rotulo: 'Na fila' },
  { chave: 'enviadas', rotulo: 'Enviadas' },
  { chave: 'entregues', rotulo: 'Entregues' },
  { chave: 'lidas', rotulo: 'Lidas' },
  { chave: 'responderam', rotulo: 'Responderam' },
  { chave: 'interessados', rotulo: 'Interessados' },
  { chave: 'link_enviado', rotulo: 'Link enviado' },
  { chave: 'clicaram', rotulo: 'Clicaram', semFonte: true },
  { chave: 'vendas', rotulo: 'Vendas', semFonte: true },
  { chave: 'sair', rotulo: 'Pediram para sair' },
  { chave: 'sem_whatsapp', rotulo: 'Sem WhatsApp' },
  { chave: 'falhas', rotulo: 'Falhas' },
];

const BRACOS: { id: Braco; rotulo: string }[] = [
  { id: 'osi', rotulo: 'OSI' },
  { id: 'clearix', rotulo: 'Clearix' },
];

/** Placar da prospecção por WhatsApp (contrato do MKT). Só é montado para quem a RLS deixa ler. */
export default function ProspeccaoHoje() {
  const [placar, setPlacar] = useState<PlacarProspeccao | null>(null);

  const ler = useCallback(() => { prospeccaoStore.placar().then(setPlacar); }, []);

  useEffect(() => {
    ler();
    // Aba escondida não consulta: 60 s por minuto de TV desligada é custo sem leitor.
    const id = window.setInterval(() => { if (!document.hidden) ler(); }, INTERVALO_MS);
    const aoVoltar = () => { if (!document.hidden) ler(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [ler]);

  if (!placar) {
    return <div className="border border-outline/15 bg-surface-container p-4 mb-5 text-sm text-muted">Carregando a prospecção…</div>;
  }

  const { estado, hoje, erro } = placar;
  const medidoEm = estado?.medido_em ?? hoje.osi?.medido_em ?? hoje.clearix?.medido_em ?? null;

  const celula = (b: Braco, m: Metrica) => {
    const linha = hoje[b];
    if (!linha) return { txt: '—', motivo: 'sem agenda deste braço hoje' };
    const v = linha[m.chave] as number | null;
    if (v == null) return { txt: '—', motivo: m.semFonte ? 'não medido: a fonte deste número ainda não existe' : 'o placar não trouxe este número' };
    return { txt: String(v), motivo: null };
  };

  const situacao = !estado
    ? null
    : estado.pausada
      ? { rot: `Pausada${estado.pausa_motivo ? ` — ${estado.pausa_motivo}` : ''}`, cls: 'text-warning border-warning/40 bg-warning/10' }
      : estado.ligada
        ? { rot: 'Ligada', cls: 'text-success border-success/40 bg-success/10' }
        : { rot: 'Desligada', cls: 'text-muted border-outline/30' };

  return (
    <section className="border border-outline/15 bg-surface-container mb-5">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <MessageCircle className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Prospecção hoje</span>
        {situacao && (
          <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${situacao.cls}`}>{situacao.rot}</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-muted tabular-nums">
          {medidoEm ? `medido às ${hora(medidoEm)}` : 'sem medição'}
        </span>
      </div>

      {erro && (
        <div className="px-4 py-2.5 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler o placar: {erro}. Os números abaixo não são zero — não foram lidos.</span>
        </div>
      )}
      {!erro && !estado && (
        <div className="px-4 py-2.5 text-sm text-warning flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>O estado da prospecção não veio: o seu acesso não lê o placar do MKT (exige staff, admin, founder ou vendas). Não é "nada acontecendo".</span>
        </div>
      )}

      {estado && (
        <div className="px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-on-surface-variant border-b border-outline/10">
          <span>Meta do dia: <strong className="text-on-surface tabular-nums">{estado.meta_dia ?? '—'}</strong></span>
          {estado.rampa && estado.passo_rampa != null && (
            <span>Rampa: passo <strong className="text-on-surface tabular-nums">{estado.passo_rampa}</strong> de {estado.rampa.length} ({estado.rampa.join(' → ')})</span>
          )}
          <span>Próximo envio: <strong className="text-on-surface tabular-nums">{hora(estado.proximo_envio)}</strong>
            {estado.dentro_da_janela === false && <span className="text-muted"> · fora da janela de envio agora</span>}
          </span>
          <span>Robô rodou às <strong className="text-on-surface tabular-nums">{hora(estado.robo_rodou_em)}</strong>
            {estado.robo_status && <span className={estado.robo_status === 'ok' ? 'text-muted' : 'text-danger'}> · {estado.robo_status}</span>}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline/10">
              <th className="text-left font-mono text-[9px] uppercase tracking-widest text-muted px-4 py-2">Hoje</th>
              {BRACOS.map((b) => (
                <th key={b.id} className="text-right font-mono text-[9px] uppercase tracking-widest text-muted px-4 py-2">{b.rotulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICAS.map((m) => (
              <tr key={m.chave} className="border-b border-outline/5 last:border-b-0">
                <td className="px-4 py-1.5 text-on-surface-variant">{m.rotulo}</td>
                {BRACOS.map((b) => {
                  const c = celula(b.id, m);
                  return (
                    <td key={b.id} title={c.motivo ?? undefined}
                      className={`px-4 py-1.5 text-right tabular-nums ${c.motivo ? 'text-muted' : 'text-on-surface font-medium'}`}>
                      {c.txt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[11px] text-muted border-t border-outline/10">
        "—" nunca é zero: passe o mouse para ver o porquê. Clicaram e vendas ficam em "—" até as fontes existirem.
      </p>
    </section>
  );
}
