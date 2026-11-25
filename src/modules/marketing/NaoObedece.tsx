import type { Recorte } from '../../lib/recorte';

// O SELO DE QUEM NÃO PODE OBEDECER À BARRA (25/11/2026).
//
// A quarta coisa que o dono pediu: "aba que não puder obedecer diz por quê, na própria aba". Isto
// existe porque filtro que não chega é PIOR do que filtro que não existe — a barra acesa é uma
// promessa, e quem vê o chip da Lancaster aceso acredita que o número é da Lancaster.
//
// Dois usos, e a diferença importa:
//   · a view não TEM a coluna  → o número é de tudo, e o selo diz isso;
//   · a pergunta não é de janela (fôlego é estado de agora, agenda é de hoje) → não é defeito, e o
//     selo explica em vez de acusar.
export default function NaoObedece(
  { recorte, data, marca, rede, porque, className = '' }:
  { recorte: Recorte; data?: boolean; marca?: boolean; rede?: boolean; porque?: string; className?: string },
) {
  const faltas = [
    data && (recorte.de != null) ? 'data' : null,
    marca && recorte.marcas ? 'marca' : null,
    rede && recorte.rede ? 'rede' : null,
  ].filter(Boolean) as string[];
  if (faltas.length === 0) return null;

  const lista = faltas.length === 1 ? faltas[0]
    : `${faltas.slice(0, -1).join(', ')} nem ${faltas[faltas.length - 1]}`;

  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-wider text-warning border border-warning/40 bg-warning/10 px-1.5 py-px ${className}`}
      title={porque ?? 'a fonte deste bloco não traz essa coluna'}
    >
      não separa por {lista}
    </span>
  );
}
