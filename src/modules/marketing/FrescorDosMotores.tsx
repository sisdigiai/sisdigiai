import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { espelhoMotoresEstado, type EstadoEspelho } from '../../lib/espelhoMotores';
import { hojeBrasilia } from '../../lib/datas';

// FRESCOR DOS MOTORES — de quando é o número que a tela está mostrando.
//
// De onde vem: o dono, 27/11/2026 — *"não sei se o pulso é atualizado, o limelight, e o polapetit"*
// e, logo depois, *"clico em cada app para atualizar, não é nada automático"*. As duas frases juntas
// dizem o problema inteiro: a coleta dos motores é manual, e o painel não dizia de QUANDO era o dado.
// Número velho e número novo têm exatamente a mesma cara.
//
// Medido em 27/11, às 14h33, para provar que a faixa precisa existir: Pulso, Limelight e Polá com
// dado de 27/11; **blogs parados em 24/11, três dias**. Nada na tela dizia isso.
//
// POR QUE A DATA VEM DO ESPELHO E NÃO DE UM CAMPO "ÚLTIMA COLETA": campo de coleta diz quando o robô
// RODOU; o dia mais novo do espelho diz até quando ele TROUXE dado. Rodada que roda e não traz nada
// marcaria o campo e deixaria a tela verde — que é o oposto do que esta faixa serve para evitar.
//
// A faixa não dispara coleta: pedido de coleta mora em cada motor, e a chave que o painel tem é a
// pública de leitura (R-042 — segredo só no app que o usa). O botão único pedido pelo dono depende de
// cada motor expor um endereço próprio para isso; pedido mandado aos quatro em 27/11.

// FONTE DE COLETA E FONTE DE EVENTO NÃO SE LEEM IGUAL (27/11/2026, arbitragem do Geral com o estado
// dos Blogs). Num motor que COLETA, dia sem linha é robô que não rodou — e a faixa está certa em
// acender. Nos blogs a leitura chega por EVENTO, de quem abre a página: dia sem linha quer dizer
// **ninguém leu**, não medidor parado. Pintar isso de amarelo manda consertar o que não está
// quebrado, que é o erro que esta casa já pagou. Então a frase muda com o tipo da fonte, e os blogs
// só sairão do "não sei dizer" quando tiverem um sinal de medidor vivo — pedido feito a eles hoje.
type Motor = {
  nome: string; dia: string | null; estado: EstadoEspelho | 'vazio'; detalhe?: string;
  /** 'coleta' = robô vai buscar; 'evento' = o dado chega quando alguém lê. */
  tipo: 'coleta' | 'evento';
};

const diasEntre = (a: string, b: string) =>
  Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);

/** Quantos dias de atraso ainda são normais para cada motor. Não é palpite: é a cadência que cada um
 *  tem hoje. Blog publica e mede devagar; rede social muda todo dia. */
const TOLERANCIA: Record<string, number> = { Pulso: 1, Limelight: 1, 'Polá Petit': 2, Blogs: 2 };

export default function FrescorDosMotores({ recarga = 0 }: { recarga?: number }) {
  const [motores, setMotores] = useState<Motor[] | null>(null);

  useEffect(() => {
    const maisNovo = <T extends { dia: string }>(r: { linhas: T[]; estado: EstadoEspelho; detalhe?: string }): Omit<Motor, 'nome' | 'tipo'> => {
      if (r.estado !== 'ok') return { dia: null, estado: r.estado, detalhe: r.detalhe };
      if (r.linhas.length === 0) return { dia: null, estado: 'vazio' };
      return { dia: r.linhas.reduce((a, l) => (l.dia > a ? l.dia : a), r.linhas[0].dia), estado: 'ok' };
    };
    Promise.all([
      espelhoMotoresEstado.pulsoLeiturasDias().then((r) => ({ nome: 'Pulso', tipo: 'coleta' as const, ...maisNovo(r) })),
      espelhoMotoresEstado.limelightPubDias().then((r) => ({ nome: 'Limelight', tipo: 'coleta' as const, ...maisNovo(r) })),
      espelhoMotoresEstado.polaPetitDias().then((r) => ({ nome: 'Polá Petit', tipo: 'coleta' as const, ...maisNovo(r) })),
      espelhoMotoresEstado.blogsDias().then((r) => ({ nome: 'Blogs', tipo: 'evento' as const, ...maisNovo(r) })),
    ]).then(setMotores).catch(() => setMotores([]));
  }, [recarga]);

  const hoje = hojeBrasilia();

  return (
    <section className="border border-outline/15 bg-surface-container px-4 py-2.5 mb-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Radio className="w-3.5 h-3.5 text-secondary shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">de quando é o dado</span>
        {motores == null ? (
          <span className="text-xs text-muted animate-pulse">medindo…</span>
        ) : motores.length === 0 ? (
          <span className="text-xs text-muted">não consegui ler os espelhos</span>
        ) : motores.map((m) => {
          const atraso = m.dia ? diasEntre(m.dia, hoje) : null;
          const evento = m.tipo === 'evento';
          const tarde = !evento && atraso != null && atraso > (TOLERANCIA[m.nome] ?? 1);
          const dm = m.dia ? `${m.dia.slice(8, 10)}/${m.dia.slice(5, 7)}` : '';
          return (
            <span key={m.nome} className="text-xs text-on-surface-variant">
              <span className="inline-block w-2 h-2 mr-1.5 align-[0px] rounded-full"
                style={{ background: m.dia == null ? 'var(--color-error)' : tarde ? 'var(--color-warning)' : evento && (atraso ?? 0) > 1 ? 'var(--color-muted)' : 'var(--color-success)' }} />
              <b className="text-on-surface font-medium">{m.nome}</b>{' '}
              {m.dia == null
                ? <span className="text-error">{m.estado === 'vazio' ? 'sem dado nenhum' : `não consegui ler${m.detalhe ? `: ${m.detalhe}` : ''}`}</span>
                : evento
                ? <span title="a leitura de blog chega por evento: dia sem linha é dia sem leitor, não medidor parado">
                    {atraso === 0 ? 'leitura hoje' : atraso === 1 ? 'leitura ontem' : `sem leitura desde ${dm}`}
                  </span>
                : atraso === 0 ? 'hoje'
                : atraso === 1 ? 'ontem'
                : <span className="text-warning">há {atraso} dias ({dm})</span>}
            </span>
          );
        })}
      </div>
      <div className="font-mono text-[9px] text-muted mt-1.5 leading-relaxed">
        a data é o dia mais novo que cada espelho tem, não a hora em que o robô rodou — rodada que roda e
        não traz nada deixaria a luz verde. Nos <b>Blogs</b> a leitura chega por evento, de quem abre a
        página: dia sem linha é dia sem leitor, não medidor parado, e por isso ali não acende aviso —
        falta um sinal de medidor vivo, pedido a eles em 27/11. Quanto da coleta dos motores é agendada
        e quanto depende de alguém clicar, cada motor vai escrever; o painel só lê. Pedido de um comando
        único mandado aos quatro em 27/11. <b>Cadência declarada pelos motores:</b> Pulso às 3h, 6h45 e
        16h30; Limelight às 10h, uma vez ao dia — entre uma rodada e a outra o número dele não se move,
        então "hoje" à tarde quer dizer "o que havia de manhã". Passe o mouse em cada um para ver.
      </div>
    </section>
  );
}
