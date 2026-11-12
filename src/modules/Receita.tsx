import { CalendarClock, Building2, Gauge, Lightbulb, Package, Phone } from 'lucide-react';
import ReceitaIdeias, { useSubRotaReceita } from './ReceitaIdeias';
import ReceitaPacotes from './ReceitaPacotes';
import ReceitaLista from './ReceitaLista';
import ReceitaProspeccao from './ReceitaProspeccao';
import ReceitaAula from './ReceitaAula';
import ReceitaPlacar from './ReceitaPlacar';

// Página Receita (R-051): o lugar único do Agente de Receita e da meta de dinheiro novo.
//
// A página tem seis abas e a aba mora no endereço (`#/receita`, `#/receita/aula`, `#/receita/lista`,
// `#/receita/prospeccao`, `#/receita/ideias[/<slug>]` e `#/receita/pacotes[/<pacote>[/<arquivo>]]`): o dono
// manda o link de uma tela a um agente e o link abre na tela, não no placar.
//
// A ORDEM das abas é a do uso: o número (Placar), o que tem data (Aula), o que se faz todo dia (Lista do dia),
// a frente longa (Prospecção) e, por último, o que é para consultar (Ideias e Pacotes).
export default function Receita() {
  const sub = useSubRotaReceita();
  const abas = [
    { id: 'placar', href: '#/receita', rotulo: 'Placar', Icone: Gauge },
    { id: 'aula', href: '#/receita/aula', rotulo: 'Aula', Icone: CalendarClock },
    { id: 'lista', href: '#/receita/lista', rotulo: 'Lista do dia', Icone: Phone },
    { id: 'prospeccao', href: '#/receita/prospeccao', rotulo: 'Prospecção', Icone: Building2 },
    { id: 'ideias', href: '#/receita/ideias', rotulo: 'Ideias', Icone: Lightbulb },
    { id: 'pacotes', href: '#/receita/pacotes', rotulo: 'Pacotes', Icone: Package },
  ] as const;
  return (
    <div className="space-y-6">
      <nav aria-label="Seções da Receita" className="flex flex-wrap gap-1 border-b border-outline/15">
        {abas.map(({ id, href, rotulo, Icone }) => (
          <a key={id} href={href} aria-current={sub.aba === id ? 'page' : undefined}
             className={'min-h-[44px] inline-flex items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] border-b-2 '
               + 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action '
               + (sub.aba === id ? 'border-action text-on-surface' : 'border-transparent text-muted hover:text-on-surface')}>
            <Icone className="w-3.5 h-3.5" aria-hidden="true" /> {rotulo}
          </a>
        ))}
      </nav>
      {sub.aba === 'ideias' ? <ReceitaIdeias slug={sub.slug} />
        : sub.aba === 'pacotes' ? <ReceitaPacotes slug={sub.slug} doc={sub.doc} />
        : sub.aba === 'lista' ? <ReceitaLista />
        : sub.aba === 'prospeccao' ? <ReceitaProspeccao />
        : sub.aba === 'aula' ? <ReceitaAula />
        : <ReceitaPlacar />}
    </div>
  );
}
