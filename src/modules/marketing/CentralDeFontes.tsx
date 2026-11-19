import { useEffect, useState } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Central de fontes — o índice de comando do marketing. Pedido do dono em 25/08: "este espelho tem que
// trazer tudo que temos de opções"; refeita em 19/11 por ordem dele: "fontes eu padronizaria também".
//
// O QUE ESTAVA ERRADO, e era mais do que gosto: doze azulejos com gramática diferente cada um. Um dizia
// "4 cliques · 773 impressões · 3 sites", outro "usos, sessoes e leads" (uma promessa, não um número),
// outro só um traço. Metade dos títulos sem acento — "publicaveis", "prospeccao", "sessoes", "ha 3d".
// Lado a lado, nada se compara: o olho não sabe onde pousar, e uma parede de texto vira uma parede.
//
// A REGRA DESTA ABA, agora: **um número por azulejo**. Nome em cima, um número grande, a unidade
// embaixo, o frescor como etiqueta e o destino à direita. Agrupados por família, porque índice sem
// seção é lista.
//
// DUAS RECUSAS:
//  · **fonte sem medição mostra traço, nunca zero.** Zero é uma medição ("mediu e deu zero"); traço é a
//    falta dela. Trocar um pelo outro faz a casa parecer parada quando o que falta é coleta — foi o
//    erro que eu mesmo cometi na primeira leitura do resultado, em 18/11.
//  · **o número do azulejo é o que decide, não o maior disponível.** Em fatos, o que importa não é
//    quantos existem nem quantos estão frescos: é quantos a IA pode citar HOJE (fresco E público).
//    Medido em 19/11: 34 existem, 12 estão frescos, e só 6 são citáveis.

type Cadeia = {
  seguidores: number; ultimo_censo: string | null;
  leads_30d: number; disparos_30d: number; ultimo_disparo: string | null;
  vendas_30d: number; ultima_venda: string | null;
};
type Seo = { cliques: number; impressoes: number; sites: number; medido_em: string | null };
type Fila = { atrasados: number; com_erro: number; ultima_publicacao: string | null };
type Fato = { fresco: boolean; publico: boolean };
type Espelho = { views_total?: number | null; publicacoes?: number; episodios?: number; ultima_leitura?: string | null; ultima_publicacao?: string | null };

type Props = {
  cadeia: Cadeia | null;
  seo: Seo | null;
  fila: Fila | null;
  fatos: Fato[];
  pulso: Espelho | null;
  limelight: Espelho | null;
  blogs: { posts_no_ar: number; leituras_total: number; ultima_leitura: string | null } | null;
};

type Azulejo = {
  nome: string; numero: string; unidade: string;
  quando: string | null; href: string; destino: string; alerta?: boolean;
};

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR'));
const mil = (v: number | null | undefined) => (v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

function Etiqueta({ quando }: { quando: string | null }) {
  // Fonte que não tem leitura datada não ganha etiqueta nenhuma. A primeira versão pendurava
  // "sem data" em cinco azulejos (placar da semana, Calc, uso vivo, fatos, cobertura) — rótulo
  // repetido que não informa nada vira ruído, e ruído é o que esta aba veio consertar.
  if (!quando) return null;
  const dias = Math.floor((Date.now() - new Date(quando.length > 10 ? quando : quando + 'T12:00:00').getTime()) / 864e5);
  const txt = dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias}d`;
  const tom = dias <= 1 ? 'text-success border-success/40 bg-success/10'
    : dias <= 3 ? 'text-secondary border-secondary/30'
    : 'text-warning border-warning/40 bg-warning/10';
  return <span className={`font-mono text-[9px] uppercase tracking-wider border px-1 py-px ${tom}`}>{txt}</span>;
}

function Grupo({ titulo, itens }: { titulo: string; itens: Azulejo[] }) {
  return (
    <>
      <div className="flex items-center gap-3 mt-5 mb-2 first:mt-0">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-secondary">{titulo}</span>
        <span className="h-px flex-1 bg-outline/15" />
      </div>
      <div className="grid gap-px bg-outline/10 border border-outline/15"
           style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {itens.map((a) => (
          <a key={a.nome} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
             className="bg-surface-container p-3.5 hover:bg-surface-highest/50 transition-colors block">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12.5px] text-on-surface leading-snug">{a.nome}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted shrink-0 flex items-center gap-1">
                {a.destino}{a.href.startsWith('http') && <ExternalLink className="w-2.5 h-2.5" />}
              </span>
            </div>
            <div className={`font-serif text-2xl font-semibold tabular-nums mt-1.5 ${a.alerta ? 'text-danger' : 'text-on-surface'}`}>
              {a.numero}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="font-mono text-[9.5px] text-muted">{a.unidade}</span>
              <Etiqueta quando={a.quando} />
            </div>
          </a>
        ))}
      </div>
    </>
  );
}

export default function CentralDeFontes({ cadeia, seo, fila, fatos, pulso, limelight, blogs }: Props) {
  const [cobertura, setCobertura] = useState<{ pecas: number; lidas: number } | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_cobertura_leitura').select('pecas, lidas').limit(500)
      .then(({ data }) => {
        const l = (data ?? []) as { pecas: number; lidas: number }[];
        if (l.length) setCobertura({
          pecas: l.reduce((a, x) => a + Number(x.pecas ?? 0), 0),
          lidas: l.reduce((a, x) => a + Number(x.lidas ?? 0), 0),
        });
      });
  }, []);

  const citaveis = fatos.filter((f) => f.fresco && f.publico).length;

  return (
    <div className="border border-outline/15 bg-surface-container">
      <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2 flex-wrap">
        <Info className="w-3.5 h-3.5 text-secondary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Central de fontes · tudo ligado</span>
        <span className="ml-auto font-mono text-[10px] text-muted">um número por fonte · traço = não medido, nunca zero</span>
      </div>

      <div className="p-4">
        <Grupo titulo="Alcance e audiência" itens={[
          { nome: 'Redes sociais · censo diário', numero: n(cadeia?.seguidores), unidade: 'seguidores',
            quando: cadeia?.ultimo_censo ?? null, href: '#/mkt-crescimento', destino: 'Crescimento' },
          { nome: 'SEO · Search Console', numero: n(seo?.cliques),
            unidade: seo ? `cliques em 90d · ${n(seo.impressoes)} impressões · ${seo.sites} sites` : 'leitura não chegou',
            quando: seo?.medido_em ?? null, href: '#/seo', destino: 'SEO' },
          { nome: 'Blogs regionais', numero: blogs ? n(blogs.leituras_total) : '—',
            unidade: blogs ? `leituras · ${n(blogs.posts_no_ar)} posts no ar` : 'leitura não chegou ao espelho',
            quando: blogs?.ultima_leitura ?? null, href: '#/marketing', destino: 'Audiência' },
        ]} />

        <Grupo titulo="Motores de conteúdo" itens={[
          { nome: 'Fila do motor MKT', numero: n(fila?.atrasados), unidade: `atrasados · ${n(fila?.com_erro)} com erro`,
            quando: null, href: 'https://mkt.digiai.app.br', destino: 'DIGIAI MKT',
            alerta: (fila?.atrasados ?? 0) > 50 || (fila?.com_erro ?? 0) > 0 },
          { nome: 'Pulso · canais faceless', numero: mil(pulso?.views_total), unidade: `views · ${n(pulso?.publicacoes)} peças`,
            quando: pulso?.ultima_publicacao ?? null, href: '#/marketing', destino: 'Motores' },
          { nome: 'Limelight · fábrica da Mello', numero: mil(limelight?.views_total), unidade: `views · ${n(limelight?.episodios)} episódios`,
            quando: limelight?.ultima_leitura ?? null, href: '#/marketing', destino: 'Motores' },
        ]} />

        <Grupo titulo="Dinheiro e funil" itens={[
          { nome: 'Vendas · Hotmart, Kiwify, Mercado Pago', numero: n(cadeia?.vendas_30d), unidade: 'vendas em 30 dias',
            quando: cadeia?.ultima_venda?.slice(0, 10) ?? null, href: '#/vendas', destino: 'Vendas',
            alerta: (cadeia?.vendas_30d ?? 0) === 0 },
          { nome: 'OSI · funil e prospecção', numero: n(cadeia?.disparos_30d), unidade: `disparos em 30 dias · ${n(cadeia?.leads_30d)} leads`,
            quando: cadeia?.ultimo_disparo?.slice(0, 10) ?? null, href: '#/fluxo-osi', destino: 'OSI',
            alerta: cadeia ? (Date.now() - new Date(cadeia.ultimo_disparo ?? 0).getTime()) / 864e5 > 7 : false },
          { nome: 'Clearix Calc · isca', numero: '—', unidade: 'usos, sessões e leads — não medido aqui',
            quando: null, href: '#/mkt-calc', destino: 'Calc' },
        ]} />

        <Grupo titulo="Travas e placar" itens={[
          { nome: 'Fatos publicáveis · trava por marca', numero: `${citaveis}`,
            unidade: `citáveis hoje, de ${fatos.length} · fresco E público`,
            quando: null, href: '#/marketing', destino: 'Fatos', alerta: citaveis === 0 },
          { nome: 'Cobertura da leitura', numero: cobertura ? n(cobertura.lidas) : '—',
            unidade: cobertura ? `peças lidas de ${n(cobertura.pecas)}` : 'carregando',
            quando: null, href: '#/marketing', destino: 'Audiência' },
          { nome: 'Scorecard da semana', numero: '—', unidade: 'metas e preenchimento — não medido aqui',
            quando: null, href: '#/semana', destino: 'Semana' },
          { nome: 'Uso vivo do Clearix · prova interna', numero: '↗', unidade: 'lido na Central Clearix, com o login dela',
            quando: null, href: '#/clearix', destino: 'Central Clearix' },
        ]} />
      </div>
    </div>
  );
}
