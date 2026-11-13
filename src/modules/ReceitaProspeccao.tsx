import { useEffect, useState } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Aviso, Carregando, quando } from './ReceitaIdeias';
import { Coluna, ComoLer, Quadro, Tile, TituloSecao } from './ReceitaUI';
import ReceitaEmpresas from './ReceitaEmpresas';

// Aba Prospecção da página Receita (migration 228; pedido do dono em 12/11/2026).
//
// O controle da prospecção a empresas do Alto Tietê: uma linha por empresa da leva, com a etapa, o canal de
// quem decide, o próximo passo e cada toque feito. A base (nome, telefone da unidade, site) vem da carga; a
// ETAPA e o TOQUE só entram por pessoa logada, aqui. Agente não diz que alguém ligou.
//
// Nada nesta tela ENVIA nada: registrar um toque é anotar o que já foi feito por telefone, e-mail ou visita.
//
// 12/11, redesenho: as 20 empresas viraram um QUADRO por etapa (onde cada uma está agora). Tocar numa
// empresa abre a ficha dela embaixo, com os dois formulários. A lista de vinte cartões escritos saiu.

type Etapa = 'nao_iniciada' | 'ligada' | 'canal_obtido' | 'em_sequencia' | 'respondeu'
  | 'conversa_marcada' | 'dia_marcado' | 'recusou' | 'nao_contatar';
interface Empresa {
  slug: string; ordem: number; empresa: string; cidade: string | null; telefone: string | null; site: string | null;
  canal_publicado: string | null; observacao: string | null; etapa: Etapa; canal_decisor: string | null;
  proximo_passo: string | null; etapa_nota: string | null; etapa_por: string | null; etapa_em: string | null;
  toques: number; contatos: number; ultimo_toque_em: string | null; ultimo_canal: string | null; ultimo_resultado: string | null;
}
interface Toque { id: number; empresa_slug: string; quando: string; canal: string; resultado: string; nota: string | null; por: string }

// Classe escrita inteira, não montada: o Tailwind só gera o que encontra literal no código.
const ETAPA: Record<Etapa, { rotulo: string; classe: string }> = {
  nao_iniciada:     { rotulo: 'não iniciada',            classe: 'bg-surface-high text-muted border-outline/30' },
  ligada:           { rotulo: 'ligada, sem canal ainda', classe: 'bg-warning-bg text-warning border-warning-bd' },
  canal_obtido:     { rotulo: 'canal de quem decide obtido', classe: 'bg-info-bg text-info border-info-bd' },
  em_sequencia:     { rotulo: 'recebendo os toques',     classe: 'bg-info-bg text-info border-info-bd' },
  respondeu:        { rotulo: 'respondeu',               classe: 'bg-success-bg text-success border-success-bd' },
  conversa_marcada: { rotulo: 'conversa marcada',        classe: 'bg-success-bg text-success border-success-bd' },
  dia_marcado:      { rotulo: 'dia na empresa marcado',  classe: 'bg-action text-on-action border-action' },
  recusou:          { rotulo: 'recusou',                 classe: 'bg-danger-bg text-danger border-danger-bd' },
  nao_contatar:     { rotulo: 'não contatar',            classe: 'bg-danger-bg text-danger border-danger-bd' },
};
const ORDEM_ETAPAS = Object.keys(ETAPA) as Etapa[];
const CANAL: Record<string, string> = { ligacao: 'ligação', email: 'e-mail', whatsapp: 'WhatsApp', visita: 'visita', outro: 'outro' };
const RESULTADO: Record<string, string> = { sem_resposta: 'sem resposta', contato: 'houve contato', recusou: 'recusou' };

const foco = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';
const botao = `min-h-[44px] inline-flex items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50 ${foco}`;
const campo = `min-h-[44px] w-full border border-outline/30 bg-surface px-2 text-[13px] text-on-surface ${foco}`;
const rotulo = 'flex flex-col gap-1 font-mono text-[9px] uppercase tracking-wider text-muted';

// Só vira link de ligar o telefone que é um número só. "(11) 4741-8482 (feira) · (11) 2968-3000 (guia)" fica como texto.
const paraLigar = (t: string) => (/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(t.trim()) ? `+55${t.replace(/\D/g, '')}` : /^0800[\s\d]+$/.test(t.trim()) ? t.replace(/\D/g, '') : null);

export default function ReceitaProspeccao() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [toques, setToques] = useState<Toque[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = async () => {
    const [e, t] = await Promise.all([
      supabase.from('v_receita_prospeccao').select('*').order('ordem'),
      supabase.from('v_receita_prospeccao_toques').select('*').order('quando', { ascending: false }).limit(300),
    ]);
    if (e.error) { setErro(e.error.message); return; }
    setErro(t.error ? `histórico de toques: ${t.error.message}` : null);
    setEmpresas((e.data ?? []) as Empresa[]);
    setToques((t.data ?? []) as Toque[]);
  };
  useEffect(() => { void carregar(); }, []);

  if (erro && !empresas) {
    const semBanco = /v_receita_prospeccao|does not exist|schema cache/i.test(erro);
    return (
      <Aviso tom="danger">
        {semBanco
          ? 'A aba Prospecção ainda não está ligada ao banco: falta aplicar a migration 228 e rodar a carga do controle.'
          : 'A prospecção não carregou.'}{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!empresas) return <Carregando />;
  if (empresas.length === 0) {
    return (
      <Aviso tom="warning">
        Nenhuma empresa no banco. Isto não quer dizer que não há fila: quer dizer que a carga de{' '}
        <code className="text-[11px]">Cockpit/receita/pacotes/prospeccao-b2b/fila.md</code> ainda não rodou.
      </Aviso>
    );
  }

  const conta = (f: (e: Empresa) => boolean) => empresas.filter(f).length;
  const total = empresas.length;
  const escolhida = empresas.find((e) => e.slug === aberta) ?? null;
  // Onde cada empresa está AGORA. Uma empresa vive em uma coluna só.
  const colunas: { titulo: string; etapas: Etapa[]; tom?: 'bom' | 'ruim' | 'atencao' }[] = [
    { titulo: 'Não iniciada', etapas: ['nao_iniciada'] },
    { titulo: 'Ligada, sem canal', etapas: ['ligada'], tom: 'atencao' },
    { titulo: 'Canal de quem decide', etapas: ['canal_obtido'] },
    { titulo: 'Recebendo os toques', etapas: ['em_sequencia'] },
    { titulo: 'Respondeu', etapas: ['respondeu'], tom: 'bom' },
    { titulo: 'Conversa ou dia marcado', etapas: ['conversa_marcada', 'dia_marcado'], tom: 'bom' },
    { titulo: 'Fora', etapas: ['recusou', 'nao_contatar'], tom: 'ruim' },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile rotulo="Empresas tocadas" valor={`${conta((e) => e.toques > 0)} de ${total}`} de={{ feito: conta((e) => e.toques > 0), total }} />
        <Tile rotulo="Com canal de quem decide" valor={`${conta((e) => !!e.canal_decisor)} de ${total}`} de={{ feito: conta((e) => !!e.canal_decisor), total }} />
        <Tile rotulo="Houve contato" valor={`${conta((e) => e.contatos > 0)} de ${total}`} de={{ feito: conta((e) => e.contatos > 0), total }} />
        <Tile rotulo="Conversa ou dia marcado" valor={String(conta((e) => e.etapa === 'conversa_marcada' || e.etapa === 'dia_marcado'))}
              tom={conta((e) => e.etapa === 'conversa_marcada' || e.etapa === 'dia_marcado') > 0 ? 'bom' : 'neutro'}
              nota="é o que vira venda" />
      </dl>

      {erro && <Aviso tom="danger">Parte da tela não carregou ({erro}).</Aviso>}

      <div>
        <TituloSecao>Onde cada empresa está</TituloSecao>
        <Quadro rotulo="Empresas da prospecção, por etapa">
          {colunas.map((c) => {
            const lista = empresas.filter((e) => c.etapas.includes(e.etapa));
            return (
              <Coluna key={c.titulo} titulo={c.titulo} n={lista.length} tom={c.tom ?? 'neutro'} vazio="nenhuma" largura="w-[210px] min-w-[210px]">
                {lista.map((e) => (
                  <li key={e.slug}>
                    <button type="button" aria-pressed={aberta === e.slug} onClick={() => setAberta(aberta === e.slug ? null : e.slug)}
                            className={`min-h-[44px] w-full px-3 py-2 text-left hover:bg-surface-high ${foco} ${aberta === e.slug ? 'bg-surface-high' : ''}`}>
                      <span className="block text-[13px] leading-snug text-on-surface">{e.empresa}</span>
                      <span className="block font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
                        {e.cidade ?? '—'} · {e.toques} {e.toques === 1 ? 'toque' : 'toques'}
                      </span>
                    </button>
                  </li>
                ))}
              </Coluna>
            );
          })}
        </Quadro>
      </div>

      {escolhida
        ? <Linha key={escolhida.slug} empresa={escolhida} toques={toques.filter((t) => t.empresa_slug === escolhida.slug)} aoMudar={carregar} aoFechar={() => setAberta(null)} />
        : <p className="border border-dashed border-outline/30 p-4 text-[13px] text-muted">Toca numa empresa do quadro para ver o telefone, anotar um toque ou mudar a etapa.</p>}

      <div className="flex flex-wrap gap-2">
        <a href="#/receita/pacotes/prospeccao-b2b" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>O pacote</a>
        <a href="#/receita/pacotes/prospeccao-b2b/toques.md" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Os textos dos toques</a>
      </div>

      <ComoLer>
        <p>Aqui se anota o que já foi feito por telefone, e-mail ou visita. <strong className="font-semibold text-on-surface">Nada é enviado por esta tela.</strong></p>
        <p>Nenhuma destas empresas publica e-mail de RH, benefícios ou segurança: o primeiro toque de cada uma é uma ligação para perguntar quem cuida disso e qual é o e-mail.</p>
        <p>O e-mail e o WhatsApp automáticos ainda não estão ligados. Quando estiverem, os envios de e-mail ficam em outro banco e não aparecem aqui.</p>
        <p>Ecolab, Kimberly-Clark e Suzano S/A pediram para sair e não entram em leva nenhuma: o banco recusa as três.</p>
      </ComoLer>

      <ReceitaEmpresas />
    </div>
  );
}

function Linha({ empresa: e, toques, aoMudar, aoFechar }: { empresa: Empresa; toques: Toque[]; aoMudar: () => Promise<void>; aoFechar: () => void }) {
  // A ficha já nasce aberta: quem tocou no quadro quer agir.
  const aberta = true;
  const [etapa, setEtapa] = useState<Etapa>(e.etapa);
  const [canalDecisor, setCanalDecisor] = useState(e.canal_decisor ?? '');
  const [proximo, setProximo] = useState(e.proximo_passo ?? '');
  const [nota, setNota] = useState(e.etapa_nota ?? '');
  const [canal, setCanal] = useState('ligacao');
  const [resultado, setResultado] = useState('sem_resposta');
  const [notaToque, setNotaToque] = useState('');
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A linha foi regravada (por mim ou por outro): os campos voltam ao que está no banco.
  useEffect(() => {
    setEtapa(e.etapa); setCanalDecisor(e.canal_decisor ?? ''); setProximo(e.proximo_passo ?? ''); setNota(e.etapa_nota ?? '');
  }, [e.etapa, e.canal_decisor, e.proximo_passo, e.etapa_nota]);

  const grava = async (chamada: PromiseLike<{ error: { message: string } | null }>) => {
    setGravando(true); setErro(null);
    const { error } = await chamada;
    if (error) setErro(error.message); else await aoMudar();
    setGravando(false);
    return !error;
  };
  const salvarEtapa = () => grava(supabase.rpc('rpc_receita_prospeccao_etapa',
    { p_slug: e.slug, p_etapa: etapa, p_canal_decisor: canalDecisor, p_proximo_passo: proximo, p_nota: nota }));
  const registrarToque = async () => {
    const ok = await grava(supabase.rpc('rpc_receita_prospeccao_toque',
      { p_slug: e.slug, p_canal: canal, p_resultado: resultado, p_nota: notaToque }));
    if (ok) setNotaToque('');
  };

  const tel = e.telefone ? paraLigar(e.telefone) : null;
  const bloqueada = e.etapa === 'nao_contatar';

  return (
    <section aria-label={`Ficha de ${e.empresa}`} className="border border-action/40 bg-surface-container p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">{String(e.ordem).padStart(2, '0')}</span>
        <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${ETAPA[e.etapa]?.classe ?? 'border-outline/30 text-muted'}`}>
          {ETAPA[e.etapa]?.rotulo ?? e.etapa}
        </span>
        {e.cidade && <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{e.cidade}</span>}
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
          {e.toques} {e.toques === 1 ? 'toque' : 'toques'}
          {e.ultimo_toque_em && <> · último {quando(e.ultimo_toque_em)} ({CANAL[e.ultimo_canal ?? ''] ?? e.ultimo_canal}, {RESULTADO[e.ultimo_resultado ?? ''] ?? e.ultimo_resultado})</>}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-base font-semibold text-on-surface">{e.empresa}</h3>
        {e.telefone && (tel
          ? (
            <a href={`tel:${tel}`} className={`inline-flex min-h-[44px] items-center gap-2 font-serif text-lg text-on-surface tabular-nums underline ${foco}`}>
              <Phone className="w-4 h-4" aria-hidden="true" /> {e.telefone}
            </a>
          )
          : <span className="max-w-md text-right text-[13px] text-on-surface-variant">{e.telefone}</span>)}
      </div>

      <dl className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
        <Par r="Canal publicado pela empresa">{e.canal_publicado ?? 'não levantado'}</Par>
        <Par r="Canal de quem decide">{e.canal_decisor ?? 'ainda não se sabe'}</Par>
        <Par r="Próximo passo">{e.proximo_passo ?? 'ligar para achar o canal'}</Par>
        <Par r="Site">{e.site ?? 'não levantado'}</Par>
        {e.observacao && <Par r="Observação da pesquisa">{e.observacao}</Par>}
        {e.etapa_em && <Par r="Etapa marcada por">{e.etapa_por} em {quando(e.etapa_em)}{e.etapa_nota ? ` · “${e.etapa_nota}”` : ''}</Par>}
      </dl>

      <button type="button" onClick={aoFechar} className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>
        Fechar a ficha
      </button>

      {aberta && (
        <div className="space-y-4 border-t border-outline/10 pt-3">
          <fieldset disabled={gravando || bloqueada} className="space-y-2">
            <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Anotar um toque já feito</legend>
            {bloqueada && <p className="text-[12px] text-danger">Esta empresa está marcada como “não contatar”: nenhum toque é registrado.</p>}
            <div className="grid md:grid-cols-4 gap-2">
              <label className={rotulo}>Canal
                <select value={canal} onChange={(ev) => setCanal(ev.target.value)} className={campo}>
                  {Object.entries(CANAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className={rotulo}>O que aconteceu
                <select value={resultado} onChange={(ev) => setResultado(ev.target.value)} className={campo}>
                  {Object.entries(RESULTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className={`${rotulo} md:col-span-2`}>Nota (opcional)
                <input value={notaToque} onChange={(ev) => setNotaToque(ev.target.value)} maxLength={500} className={`${campo} font-sans normal-case tracking-normal`} />
              </label>
            </div>
            <button type="button" onClick={registrarToque} className={`${botao} border-action bg-action text-on-action`}>Registrar o toque</button>
          </fieldset>

          <fieldset disabled={gravando} className="space-y-2">
            <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Em que pé está</legend>
            <div className="grid md:grid-cols-2 gap-2">
              <label className={rotulo}>Etapa
                <select value={etapa} onChange={(ev) => setEtapa(ev.target.value as Etapa)} className={campo}>
                  {ORDEM_ETAPAS.map((k) => <option key={k} value={k}>{ETAPA[k].rotulo}</option>)}
                </select>
              </label>
              <label className={rotulo}>Canal de quem decide (e-mail ou ramal do setor)
                <input value={canalDecisor} onChange={(ev) => setCanalDecisor(ev.target.value)} maxLength={200} className={`${campo} font-sans normal-case tracking-normal`} />
              </label>
              <label className={rotulo}>Próximo passo
                <input value={proximo} onChange={(ev) => setProximo(ev.target.value)} maxLength={300} className={`${campo} font-sans normal-case tracking-normal`} />
              </label>
              <label className={rotulo}>Nota (opcional)
                <input value={nota} onChange={(ev) => setNota(ev.target.value)} maxLength={500} className={`${campo} font-sans normal-case tracking-normal`} />
              </label>
            </div>
            <button type="button" onClick={salvarEtapa} className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Salvar a etapa</button>
          </fieldset>

          {gravando && <p className="font-mono text-[10px] uppercase tracking-wider text-muted" role="status">gravando…</p>}
          {erro && (
            <p className="flex items-start gap-2 text-[13px] text-danger" role="alert">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Não gravou: {erro}. O que aparece acima é o que está no banco.</span>
            </p>
          )}

          {toques.length > 0 && (
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Toques registrados</h4>
              <ul className="mt-1 divide-y divide-outline/10 text-[13px]">
                {toques.map((t) => (
                  <li key={t.id} className="py-1.5">
                    <span className="tabular-nums text-on-surface">{quando(t.quando)}</span>{' · '}
                    {CANAL[t.canal] ?? t.canal}{' · '}{RESULTADO[t.resultado] ?? t.resultado}
                    {t.nota && <> · “{t.nota}”</>}
                    <span className="text-muted"> · {t.por}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Par({ r, children }: { r: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted">{r}</dt>
      <dd className="text-on-surface break-words">{children}</dd>
    </div>
  );
}
