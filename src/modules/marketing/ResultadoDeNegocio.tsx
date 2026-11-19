import { Fragment, useEffect, useState } from 'react';
import { Navigation, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// O resultado de NEGÓCIO: o que a ficha do Google registra de gente indo à loja.
//
// POR QUE ISTO VALE MAIS QUE VIEW, no tamanho em que estamos: a mediana de views por peça vai de 2 a 29
// (medido em 18/11). Nessa faixa, a diferença entre uma peça boa e uma ruim é ruído. Já **pedido de rota é
// alguém pedindo o caminho da loja** e **ligação é alguém ligando** — 530 rotas e 40 ligações desde 22/09.
// É o número mais perto de dinheiro que esta página tem hoje, e não estava na tela.
//
// O QUE ESTE BLOCO NÃO FAZ, e precisa dizer na cara: **não atribui rota a peça nenhuma.** O Google mede por
// FICHA e por DIA, não por post. Quem olhar isto e concluir "o post de terça trouxe 3 rotas" está inventando.
// Serve para ver se o movimento da loja acompanha o esforço de publicação — e, com 8 semanas de base, nem
// isso é tendência: é as duas séries lado a lado, honestamente.

type Semana = {
  marca: string; marca_nome: string; accent_hex: string | null; semana: string;
  fichas: number; dias_medidos: number;
  aparicoes: number | null; ligacoes: number | null; cliques_site: number | null; rotas: number | null;
  publicacoes: number; semana_completa: boolean;
};

const num = (n: number | null) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const dia = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function ResultadoDeNegocio() {
  const [linhas, setLinhas] = useState<Semana[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_negocio_semana')
      .select('marca, marca_nome, accent_hex, semana, fichas, dias_medidos, aparicoes, ligacoes, cliques_site, rotas, publicacoes, semana_completa')
      .order('semana', { ascending: false }).limit(400)
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setLinhas([]); return; }
        setLinhas((data ?? []) as Semana[]);
      });
  }, []);

  const semanas = [...new Set((linhas ?? []).map((l) => l.semana))].sort().reverse().slice(0, 8);
  const marcas = [...new Set((linhas ?? []).map((l) => l.marca))];
  // Os totais saíram daqui em 19/11: eles agora abrem a aba, no placar de decisão. Tinha-os nos dois
  // lugares e o mesmo número em dois lugares com nomes diferentes faz desconfiar dos dois.
  const porSemana = semanas.map((s) => ({
    semana: s,
    rotas: (linhas ?? []).filter((l) => l.semana === s).reduce((a, l) => a + (l.rotas ?? 0), 0),
    completa: !(linhas ?? []).some((l) => l.semana === s && !l.semana_completa),
  })).reverse();
  const pico = Math.max(1, ...porSemana.map((p) => p.rotas));

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Navigation className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Resultado de negócio (ficha do Google)</span>
        <span className="font-mono text-[10px] text-muted">
          pedido de rota e ligação — o que há de mais perto de dinheiro nesta página
        </span>
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>Não consegui ler a ficha do Google: {erro}.</span>
        </div>
      ) : linhas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : linhas.length === 0 ? (
        <div className="px-4 py-3 text-sm text-on-surface-variant">
          Nenhuma leitura da ficha do Google chegou ainda. Não é movimento zero na loja: é medição que não chegou.
        </div>
      ) : (
        <>
          {/* Rotas por semana, da mais antiga à atual. A barra da semana em curso é amarela: ela está
              baixa porque ainda está acontecendo, não porque o movimento caiu. */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-end gap-1 h-14">
              {porSemana.map((p) => (
                <div key={p.semana} className="flex-1 relative group" title={`${dia(p.semana)} · ${p.rotas} rotas${p.completa ? '' : ' (semana incompleta)'}`}>
                  <div className={`w-full ${p.completa ? 'bg-secondary/75' : 'bg-warning/80'}`}
                       style={{ height: `${Math.max(3, (p.rotas / pico) * 56)}px` }} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-muted mt-1">
              <span>{porSemana[0] ? dia(porSemana[0].semana) : ''}</span>
              <span>pedidos de rota por semana · amarelo = semana em curso</span>
              <span>{porSemana[porSemana.length - 1] ? dia(porSemana[porSemana.length - 1].semana) : ''}</span>
            </div>
          </div>

          <div className="px-4 py-2 border-y border-outline/10 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <span className="text-xs text-on-surface-variant">
              O Google mede por <span className="font-semibold">ficha e por dia</span>, não por post.
              Isto <span className="font-semibold">não atribui</span> rota nem ligação a peça nenhuma — as duas séries
              estão lado a lado para se ver se o movimento acompanha o esforço, e nada mais que isso.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10 text-left">
                  <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">semana</th>
                  {marcas.map((m) => (
                    <th key={m} colSpan={2} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted text-right">
                      {(linhas ?? []).find((l) => l.marca === m)?.marca_nome ?? m}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-outline/10 text-left">
                  <th />
                  {marcas.map((m) => (
                    <Fragment key={m}>
                      <th className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-muted text-right">rotas</th>
                      <th className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-muted text-right">publicou</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanas.map((s) => (
                  <tr key={s} className="border-b border-outline/5">
                    <td className="px-4 py-2 font-mono text-xs text-on-surface-variant tabular-nums">
                      {dia(s)}
                      {(linhas ?? []).some((l) => l.semana === s && !l.semana_completa) && (
                        <span className="text-warning ml-1" title="semana sem todos os dias de todas as fichas">·incompleta</span>
                      )}
                    </td>
                    {marcas.map((m) => {
                      const l = (linhas ?? []).find((x) => x.semana === s && x.marca === m);
                      return (
                        <Fragment key={`${s}-${m}`}>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-on-surface">{num(l?.rotas ?? null)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">{l ? l.publicacoes : '—'}</td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 border-t border-outline/10">
            <span className="font-mono text-[10px] text-muted">
              ligação, aparição e clique no site estão no placar que abre a aba: no detalhe por semana ainda são
              pequenos demais para linha própria · "incompleta" = faltou dia de alguma ficha
            </span>
          </div>
        </>
      )}
    </section>
  );
}
