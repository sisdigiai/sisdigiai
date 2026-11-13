import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Aviso } from './ReceitaIdeias';
import { ComoLer, Tile, TituloSecao, botao } from './ReceitaUI';

// Bloco "Empresas da região" da aba Prospecção (migration 231; pedido do dono em 13/11/2026).
//
// O retrato das empresas do Alto Tietê pela base oficial do CNPJ: quantas são, de que tamanho, em que
// cidade e de que ramo. Lê só o RESUMO (`v_receita_empresas_resumo`): a tela não baixa as 65 mil linhas.
//
// Estar no cadastro NÃO autoriza contato, e o cadastro não guarda telefone nem e-mail: o contato de quem
// decide entra pela ligação, no quadro acima.

type Tamanho = 'micro' | 'pequena' | 'media_ou_grande' | 'entidade';
interface Linha { municipio: string; tamanho: Tamanho; ramo: string; estabelecimentos: number; matrizes: number; edicao: string }

const RECORTES: { chave: string; rotulo: string; tamanhos: Tamanho[] }[] = [
  { chave: 'pm', rotulo: 'Pequenas e médias ou grandes', tamanhos: ['pequena', 'media_ou_grande'] },
  { chave: 'p', rotulo: 'Só pequenas', tamanhos: ['pequena'] },
  { chave: 'm', rotulo: 'Só médias ou grandes', tamanhos: ['media_ou_grande'] },
  { chave: 'micro', rotulo: 'Só micro', tamanhos: ['micro'] },
];
const n = (v: number) => v.toLocaleString('pt-BR');

export default function ReceitaEmpresas() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recorte, setRecorte] = useState('pm');

  useEffect(() => {
    void supabase.from('v_receita_empresas_resumo').select('*').limit(1000).then(({ data, error }) => {
      if (error) setErro(error.message); else setLinhas((data ?? []) as Linha[]);
    });
  }, []);

  const soma = (ls: Linha[]) => ls.reduce((s, l) => s + l.estabelecimentos, 0);
  const escolhido = RECORTES.find((r) => r.chave === recorte) ?? RECORTES[0];
  const noRecorte = useMemo(() => (linhas ?? []).filter((l) => escolhido.tamanhos.includes(l.tamanho)), [linhas, escolhido]);
  const agrupa = (campo: 'municipio' | 'ramo') => {
    const m = new Map<string, number>();
    for (const l of noRecorte) m.set(l[campo], (m.get(l[campo]) ?? 0) + l.estabelecimentos);
    return [...m.entries()].map(([rotulo, q]) => ({ rotulo, q })).sort((a, b) => b.q - a.q);
  };

  if (erro) {
    return (
      <Aviso tom="warning">
        O cadastro das empresas da região não carregou.{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!linhas) return null;
  if (linhas.length === 0) {
    return <Aviso tom="warning">O cadastro das empresas da região está vazio: a carga ainda não rodou.</Aviso>;
  }
  if (linhas.length >= 1000) {
    return <Aviso tom="danger">O resumo das empresas passou do limite de leitura; os números abaixo estariam incompletos. Avisar o Agente de Receita.</Aviso>;
  }

  const por = (t: Tamanho) => soma(linhas.filter((l) => l.tamanho === t));
  const total = soma(linhas);
  const edicao = linhas.reduce((e, l) => (l.edicao > e ? l.edicao : e), '');
  const [ano, mes] = edicao.split('-');

  return (
    <section className="space-y-3" aria-label="Empresas da região">
      <TituloSecao icone={<Building2 className="w-3.5 h-3.5" aria-hidden="true" />}>
        Empresas da região · cadastro oficial de {mes}/{ano}
      </TituloSecao>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile rotulo="No cadastro" valor={n(total)} nota="estabelecimentos ativos, dez cidades" />
        <Tile rotulo="Pequenas" valor={n(por('pequena'))} nota="declaradas de pequeno porte" />
        <Tile rotulo="Médias ou grandes" valor={n(por('media_ou_grande'))} nota="não se declararam micro nem pequena" />
        <Tile rotulo="Micro" valor={n(por('micro'))} nota={`e ${n(por('entidade'))} entidades (associação, igreja, condomínio)`} />
      </dl>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Recorte por tamanho">
        {RECORTES.map((r) => (
          <button key={r.chave} type="button" aria-pressed={recorte === r.chave} onClick={() => setRecorte(r.chave)}
                  className={`${botao} ${recorte === r.chave ? 'border-action text-on-surface' : 'border-outline/20 text-muted hover:text-on-surface'}`}>
            {recorte === r.chave ? '● ' : ''}{r.rotulo}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Barras titulo={`Por cidade · ${n(soma(noRecorte))} no recorte`} itens={agrupa('municipio')} />
        <Barras titulo="Por ramo" itens={agrupa('ramo').slice(0, 12)} />
      </div>

      <ComoLer titulo="Como ler o cadastro">
        <p>
          A fonte são os dados abertos do CNPJ, da Receita Federal. Entram os estabelecimentos ativos de Arujá, Biritiba
          Mirim, Ferraz de Vasconcelos, Guararema, Itaquaquecetuba, Mogi das Cruzes, Poá, Salesópolis, Santa Isabel e Suzano.
        </p>
        <p>
          Ficam fora empresário individual, MEI e sociedade de um advogado só: nesses casos o nome da empresa é o nome de
          uma pessoa.
        </p>
        <p>
          A base não diz quantos funcionários cada empresa tem. "Média ou grande" quer dizer que a empresa não se declarou
          micro nem pequena; isso inclui clínica, holding e filial de rede. É ponto de partida para conferir.
        </p>
        <p>
          O cadastro não guarda telefone nem e-mail: os da Receita Federal costumam ser do contador. E estar aqui não
          autoriza contato; as três empresas que pediram para sair em agosto de 2026 estão marcadas.
        </p>
      </ComoLer>
    </section>
  );
}

// Barras horizontais proporcionais à maior, com o número escrito ao lado.
function Barras({ titulo, itens }: { titulo: string; itens: { rotulo: string; q: number }[] }) {
  const topo = Math.max(1, itens[0]?.q ?? 1);
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{titulo}</div>
      <ol className="space-y-1.5">
        {itens.map((i) => (
          <li key={i.rotulo} className="grid grid-cols-[minmax(7rem,12rem)_1fr_auto] items-center gap-2 text-[12px]">
            <span className="text-on-surface-variant">{i.rotulo}</span>
            <span className="h-3 bg-surface-highest" aria-hidden="true">
              <span className="block h-full bg-action" style={{ width: `${Math.max(i.q > 0 ? 1.5 : 0, (i.q / topo) * 100)}%` }} />
            </span>
            <span className="w-14 text-right font-serif text-sm tabular-nums text-on-surface">{n(i.q)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
