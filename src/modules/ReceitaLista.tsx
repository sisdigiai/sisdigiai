import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Phone, PhoneMissed, PhoneOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ToqueVenda from '../components/ToqueVenda';
import { Aviso, Carregando, quando } from './ReceitaIdeias';

// Aba Lista do dia da página Receita (migration 227; pedido do dono em 12/11/2026).
//
// As dez óticas para o dono ligar hoje, montadas sozinhas pelo banco às 08h, de segunda a sábado. A regra de
// quem entra mora na migration (`receita.fn_montar_lista_do_dia`); aqui só se lê e se marca o resultado.
//
// Três resultados, e só três: FALEI (registra o toque de venda pela porta que já existe e marca a linha),
// NÃO ATENDEU (a ótica volta depois de dois dias, no máximo três vezes) e NÃO LIGAR MAIS (nunca mais entra).
// "Falei" passa pelo componente de toque de propósito: é o que faz a ligação contar no funil, e é onde fica
// escrito o que o dono da ótica disse.

type Resultado = 'falou' | 'nao_atendeu' | 'nao_ligar';
interface Item {
  dia: string; ordem: number; lead_id: string; faixa: string; motivo: string;
  resultado: Resultado | null; resultado_nota: string | null; resultado_por: string | null; resultado_em: string | null;
  otica: string | null; contato: string | null; telefone: string | null;
  cidade: string | null; uf: string | null; porte: string | null; etapa: string | null;
  produto: string | null;
}

// Classe escrita inteira, não montada: o Tailwind só gera o que encontra literal no código.
const FAIXA: Record<string, { rotulo: string; classe: string }> = {
  interesse: { rotulo: 'mostrou interesse', classe: 'bg-success-bg text-success border-success-bd' },
  respondeu: { rotulo: 'respondeu',         classe: 'bg-info-bg text-info border-info-bd' },
  abordada:  { rotulo: 'recebeu WhatsApp',  classe: 'bg-surface-high text-on-surface-variant border-outline/30' },
  captada:   { rotulo: 'nunca tocada',      classe: 'bg-surface-high text-muted border-outline/30' },
};
// Em qual produto foi o toque do marketing (dono, 12/11: "temos 2 produtos sendo oferecidos; em qual se
// interessou?"). A esteira oferece UM produto a cada ótica. Quem liga precisa saber qual antes de discar:
// quem mostrou interesse na OSI não ouviu falar do sistema, e o contrário.
// `em` e `sobre` vêm escritos por produto: "na OSI" e "no Clearix" não saem de uma regra só.
const PRODUTO: Record<string, { rotulo: string; em: string; sobre: string; classe: string }> = {
  osi:     { rotulo: 'OSI',     em: 'na OSI (Ótica Sem Improviso)', sobre: 'sobre a OSI (Ótica Sem Improviso)', classe: 'bg-info-bg text-info border-info-bd' },
  clearix: { rotulo: 'Clearix', em: 'no Clearix (o sistema)',       sobre: 'sobre o Clearix (o sistema)',       classe: 'bg-warning-bg text-warning border-warning-bd' },
  digiai:  { rotulo: 'DIGIAI',  em: 'na DIGIAI',                    sobre: 'sobre a DIGIAI',                    classe: 'bg-surface-high text-on-surface-variant border-outline/30' },
};
function oQueFoi(faixa: string, produto: string) {
  const p = PRODUTO[produto];
  if (faixa === 'interesse') return `Mostrou interesse ${p?.em ?? `em ${produto}`}.`;
  if (faixa === 'respondeu') return `Respondeu a mensagem ${p?.sobre ?? `sobre ${produto}`}.`;
  return `Recebeu mensagem ${p?.sobre ?? `sobre ${produto}`}.`;
}

const RESULTADO: Record<Resultado, string> = {
  falou: 'falei com a ótica', nao_atendeu: 'não atendeu', nao_ligar: 'pediu para não ligar mais',
};

const foco = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';
const botao = `min-h-[44px] inline-flex items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50 ${foco}`;

// O dia do negócio é o de Brasília. `toISOString()` viraria o dia às 21h e a lista de hoje sumiria da tela.
const hojeBrt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const diaEscrito = (d: string) => { const [a, m, j] = d.split('-'); return `${j}/${m}/${a}`; };
const ehDomingo = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 0;

// +5511912345678 → (11) 91234-5678. Número fora desse molde aparece como está no cadastro.
function telefoneEscrito(t: string) {
  const m = t.match(/^\+?55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : t;
}

export default function ReceitaLista() {
  const [dia] = useState(hojeBrt);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [montando, setMontando] = useState(false);

  const carregar = () =>
    supabase.from('v_receita_lista_dia').select('*').eq('dia', dia).order('ordem').then(({ data, error }) => {
      if (error) { setErro(error.message); return; }
      setErro(null);
      setItens((data ?? []) as Item[]);
    });

  useEffect(() => { carregar(); }, [dia]);

  const montar = async () => {
    setMontando(true);
    const { error } = await supabase.rpc('rpc_receita_montar_lista_do_dia');
    if (error) setErro(error.message); else await carregar();
    setMontando(false);
  };

  if (erro) {
    const semBanco = /v_receita_lista_dia|rpc_receita_montar|does not exist|schema cache/i.test(erro);
    return (
      <Aviso tom="danger">
        {semBanco
          ? 'A aba Lista do dia ainda não está ligada ao banco: falta aplicar a migration 227.'
          : 'A lista não carregou.'}{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!itens) return <Carregando />;

  const faladas = itens.filter((i) => i.resultado === 'falou').length;
  const semResposta = itens.filter((i) => i.resultado === 'nao_atendeu').length;
  const faltam = itens.filter((i) => i.resultado === null).length;
  const porProduto = (p: string) => itens.filter((i) => i.produto === p).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-muted max-w-3xl">
          As óticas para ligares hoje, das 9h às 11h. A lista sai sozinha às 08h, de segunda a sábado: primeiro
          quem mostrou interesse, depois quem respondeu, depois quem recebeu WhatsApp e não respondeu. Quem
          a esteira do marketing vai tocar hoje fica de fora.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant tabular-nums">
          {diaEscrito(dia)} · {itens.length} na lista · {faladas} faladas · {semResposta} não atenderam · {faltam} por ligar
        </p>
        {itens.length > 0 && (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant tabular-nums">
            produto oferecido pelo marketing: {porProduto('osi')} OSI · {porProduto('clearix')} Clearix
            {itens.some((i) => !i.produto) && ` · ${itens.filter((i) => !i.produto).length} nunca abordadas`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a href="#/receita/pacotes/aula-paga/pecas.md" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>
          Roteiro da ligação
        </a>
      </div>

      <Aviso tom="warning">
        Cada ótica recebeu a oferta de UM produto, e está escrito em qual. O roteiro abaixo é o do convite
        para a aula, que é um terceiro assunto: quem atender vai lembrar da OSI ou do Clearix, não da aula.
        O telefone é o que a loja publica no Google: quem atende pode não ser o dono. Se pedirem para não
        ligar mais, clica em “Não ligar mais” e a ótica nunca volta para a lista.
      </Aviso>

      {itens.length === 0 ? (
        <div className="space-y-3">
          <Aviso tom="warning">
            {ehDomingo(dia)
              ? 'Domingo não tem lista: nada da casa sai no domingo.'
              : 'A lista de hoje ainda não foi montada. Ela sai sozinha às 08h; se já passou da hora, a rotina não rodou e isso aparece na aba Placar, em Rotinas.'}
          </Aviso>
          {!ehDomingo(dia) && (
            <button type="button" onClick={montar} disabled={montando}
                    className={`${botao} border-action bg-action text-on-action`}>
              {montando ? 'montando…' : 'Montar a lista de hoje agora'}
            </button>
          )}
        </div>
      ) : (
        <ol className="space-y-3">
          {itens.map((i) => <Linha key={i.lead_id} item={i} aoMudar={carregar} />)}
        </ol>
      )}
    </div>
  );
}

function Linha({ item: i, aoMudar }: { item: Item; aoMudar: () => PromiseLike<unknown> }) {
  const [abrirToque, setAbrirToque] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nome = i.otica ?? 'ótica sem nome no cadastro';

  const marcar = async (valor: Resultado | null) => {
    setGravando(true);
    setErro(null);
    const { error } = await supabase.rpc('rpc_receita_lista_resultado',
      { p_dia: i.dia, p_lead_id: i.lead_id, p_resultado: valor, p_nota: null });
    if (error) setErro(error.message); else { setAbrirToque(false); await aoMudar(); }
    setGravando(false);
  };

  return (
    <li className="border border-outline/15 bg-surface-container p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">{String(i.ordem).padStart(2, '0')}</span>
        <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${FAIXA[i.faixa]?.classe ?? 'border-outline/30 text-muted'}`}>
          {FAIXA[i.faixa]?.rotulo ?? i.faixa}
        </span>
        {i.produto && (
          <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${PRODUTO[i.produto]?.classe ?? 'border-outline/30 text-muted'}`}>
            produto: {PRODUTO[i.produto]?.rotulo ?? i.produto}
          </span>
        )}
        {i.porte && <span className="font-mono text-[9px] uppercase tracking-wider text-muted">porte {i.porte}</span>}
        {(i.cidade || i.uf) && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{i.cidade ?? '—'}{i.uf ? `/${i.uf}` : ''}</span>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-base font-semibold text-on-surface">{nome}</h3>
        {i.telefone
          ? (
            <a href={`tel:${i.telefone}`} className={`inline-flex min-h-[44px] items-center gap-2 font-serif text-lg text-on-surface tabular-nums underline ${foco}`}>
              <Phone className="w-4 h-4" aria-hidden="true" /> {telefoneEscrito(i.telefone)}
            </a>
          )
          : <span className="text-[13px] text-warning">sem telefone visível para o teu login</span>}
      </div>

      <p className="text-[13px] text-on-surface-variant">
        {i.produto
          ? <><strong className="font-semibold text-on-surface">{oQueFoi(i.faixa, i.produto)}</strong>{' '}</>
          : <><strong className="font-semibold text-on-surface">Nunca recebeu oferta de produto nenhum.</strong>{' '}</>}
        {i.motivo}{i.contato ? ` · contato no cadastro: ${i.contato}` : ''}
      </p>

      {i.resultado && i.resultado_em ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-[13px] text-on-surface" role="status">
            <Check className="w-4 h-4 text-success" aria-hidden="true" />
            <span>
              Marcada: <strong className="font-semibold">{RESULTADO[i.resultado]}</strong>, por {i.resultado_por} em{' '}
              <span className="tabular-nums">{quando(i.resultado_em)}</span>.
            </span>
          </p>
          <button type="button" disabled={gravando} onClick={() => marcar(null)}
                  className={`${botao} border-transparent text-muted underline hover:text-on-surface`}>
            Desfazer
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={gravando} aria-expanded={abrirToque} onClick={() => setAbrirToque((v) => !v)}
                  className={`${botao} ${abrirToque ? 'border-action bg-action text-on-action' : 'border-outline/30 text-on-surface hover:bg-surface-highest'}`}>
            <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Falei com a ótica
          </button>
          <button type="button" disabled={gravando} onClick={() => marcar('nao_atendeu')}
                  className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>
            <PhoneMissed className="w-3.5 h-3.5" aria-hidden="true" /> Não atendeu
          </button>
          <button type="button" disabled={gravando} onClick={() => marcar('nao_ligar')}
                  className={`${botao} border-danger-bd text-danger hover:bg-danger-bg`}>
            <PhoneOff className="w-3.5 h-3.5" aria-hidden="true" /> Não ligar mais
          </button>
        </div>
      )}

      {abrirToque && !i.resultado && (
        <div className="border-t border-outline/10 pt-3 space-y-2">
          <p className="text-[12px] text-muted">
            Escreve o que ele disse e clica em Registrar: a ligação entra no funil e esta linha fica marcada como falada.
          </p>
          <ToqueVenda oticaFixa={nome} leadFixo={i.lead_id} compacto aoRegistrar={() => { void marcar('falou'); }} />
        </div>
      )}

      {gravando && <p className="font-mono text-[10px] uppercase tracking-wider text-muted" role="status">gravando…</p>}
      {erro && (
        <p className="flex items-start gap-2 text-[13px] text-danger" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>Não gravou: {erro}. O que aparece acima é o que está no banco.</span>
        </p>
      )}
    </li>
  );
}
