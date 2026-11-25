import { useState } from 'react';
import { Target, CheckCircle2, AlertTriangle, XCircle, CircleDashed, Ban } from 'lucide-react';

// MARKETING — O ALVO (25/11/2026). Mock e ordem de serviço na mesma tela.
//
// De onde vem: o dono, 25/11, depois de olhar a página de Marketing e dizer que "filtros não
// funcionam e nada nos dá respostas". A ordem foi: estudar primeiro o que se precisa saber de uma
// publicação em todas as redes, incluindo o marketing do Clearix, e **só então** desenhar.
//
// POR QUE ESTA TELA EXISTE E NÃO É UM DOCUMENTO: a página de Marketing de hoje cresceu por adição —
// cada aba respondia a um pedido, e ninguém nunca escreveu a LISTA DE PERGUNTAS que o painel deve
// responder. Sem essa lista, "ligar os filtros" era arrumar a casa sem saber onde se quer chegar.
// Aqui a lista vem primeiro, e cada bloco carrega o estado medido: o que já responde, o que não
// responde por falta de dado, e o que **nunca** vai responder porque a rede não entrega.
//
// A ORDEM DAS ABAS É O FUNIL, e é de propósito: saiu → viram → reagiram → vieram → compraram.
// Cada degrau só faz sentido depois do anterior. Hoje a casa enxerga bem os dois primeiros, mal o
// terceiro, e nada do quarto e do quinto — e é por isso que a tela "não dá respostas": ela mede
// com precisão a parte que não decide orçamento.
//
// O QUE O ESTUDO TROUXE DE FORA, e mudou o desenho:
//  · métrica se escolhe por objetivo, não por disponibilidade; alcance é consciência, engajamento é
//    qualidade, conversão é negócio — e misturar os três num "placar" esconde os três;
//  · taxa de engajamento só se compara com DENOMINADOR FIXO (sobre seguidores OU sobre alcance,
//    nunca os dois na mesma tela);
//  · tráfego que vem de rede social chega como "direto" quando não há etiqueta — o chamado dark
//    social. A ficha do Google também: sem UTM, ela some dentro de "direto/orgânico";
//  · loja física não tem conversão observada, tem MODELADA. O que existe de verdade é pedido de
//    rota, ligação, e a pergunta no balcão — "como você nos achou".
//
// Nada aqui está ligado a dado vivo de propósito: é o alvo. Quem for ligar, liga o bloco e apaga a
// linha de estado. Enquanto a linha estiver aqui, o bloco não responde.

type Estado = 'no_ar' | 'parcial' | 'falta_dado' | 'falta_coluna' | 'rede_nao_da' | 'nao_existe';

const ESTADO: Record<Estado, { rotulo: string; cor: string; Icone: typeof CheckCircle2 }> = {
  no_ar:        { rotulo: 'no ar',            cor: 'text-success border-success/40 bg-success/10',   Icone: CheckCircle2 },
  parcial:      { rotulo: 'responde em parte', cor: 'text-warning border-warning/40 bg-warning/10',  Icone: AlertTriangle },
  falta_dado:   { rotulo: 'falta o dado',     cor: 'text-danger border-danger/40 bg-danger/10',      Icone: XCircle },
  falta_coluna: { rotulo: 'falta a coluna',   cor: 'text-warning border-warning/40 bg-warning/10',   Icone: CircleDashed },
  rede_nao_da:  { rotulo: 'a rede não dá',    cor: 'text-muted border-outline/30',                   Icone: Ban },
  nao_existe:   { rotulo: 'não existe ainda', cor: 'text-danger border-danger/40 bg-danger/10',      Icone: XCircle },
};

type Bloco = {
  pergunta: string;
  bloco: string;
  fonte: string;
  estado: Estado;
  dono: string;
  medido?: string;
};

type Aba = { k: string; titulo: string; degrau: string; blocos: Bloco[] };

const ALVO: Aba[] = [
  {
    k: 'saiu', titulo: '1 · Saiu?', degrau: 'A casa publicou o que se propôs, na hora combinada, e tem fôlego para continuar?',
    blocos: [
      { pergunta: 'Quantas peças saíram no recorte, por marca e por rede?', bloco: 'Produção no recorte',
        fonte: 'v_mkt_peca_consolidada', estado: 'no_ar', dono: '—',
        medido: '876 peças em 90 dias' },
      { pergunta: 'Saíram na hora marcada?', bloco: 'Pontualidade',
        fonte: 'v_pontualidade', estado: 'no_ar', dono: '—' },
      { pergunta: 'Até quando continua saindo se ninguém fizer nada?', bloco: 'Fôlego',
        fonte: 'v_mkt_estoque_marca', estado: 'no_ar', dono: '—',
        medido: 'é estado de agora, não obedece a janela — e isso é correto' },
      { pergunta: 'O que falhou ao publicar, e por quê?', bloco: 'Falhas da fila',
        fonte: 'mkt.publish_jobs.erro', estado: 'parcial', dono: 'MKT',
        medido: 'o erro gravado é "ver resultado por canal" — não diz a causa. Visto hoje na Black Friday: 2 peças em erro, uma delas a contagem regressiva' },
    ],
  },
  {
    k: 'viram', titulo: '2 · Viram?', degrau: 'Quanta gente alcançou, e esse número é comparável entre redes e marcas?',
    blocos: [
      { pergunta: 'Quantas views no recorte, por marca e rede?', bloco: 'Leitura das peças',
        fonte: 'v_mkt_analytics_peca_dia', estado: 'no_ar', dono: '—',
        medido: '30d = 301.074 · 12m = 304.102 — quase iguais, porque a leitura só começa em 16/07/2026' },
      { pergunta: 'Qual o alcance (gente distinta), não só as views?', bloco: 'Alcance por conta',
        fonte: 'v_mkt_conta_dia', estado: 'parcial', dono: 'rede',
        medido: 'Instagram 720/728 dias e Facebook 672/728 entregam; YouTube e TikTok: zero' },
      { pergunta: 'A comparação entre redes é justa?', bloco: 'Idade da coleta por rede',
        fonte: 'mínimo de data por rede, lido a cada carga', estado: 'no_ar', dono: '—',
        medido: 'Instagram 09/09 · Facebook 31/10 · TikTok e YouTube 14/11. Num corte de 90 dias o Instagram tem 77 dias de leitura e o TikTok 11' },
      { pergunta: 'Quantos seguidores, e crescendo quanto?', bloco: 'Censo de audiência',
        fonte: 'mkt.audiencia_diaria', estado: 'no_ar', dono: '—',
        medido: 'é estoque: o censo de hoje é o mesmo em "hoje" e em "6m" — por isso não muda com a janela' },
    ],
  },
  {
    k: 'reagiram', titulo: '3 · Reagiram?', degrau: 'Quem viu, reagiu? E isso se compara entre redes?',
    blocos: [
      { pergunta: 'Curtida, comentário e compartilhamento por peça', bloco: 'Engajamento por peça',
        fonte: 'v_mkt_analytics_peca_dia', estado: 'falta_coluna', dono: 'MKT',
        medido: 'em 90 dias: TikTok 3.961 interações, Instagram 35 em 881 leituras, Facebook nulo. Os números do IG e do FB JÁ ESTÃO em content_performance (222 e 101 posts em 30 dias) — só não chegam à view' },
      { pergunta: 'Taxa de engajamento, com denominador fixo', bloco: 'Taxa de engajamento',
        fonte: 'engajamento ÷ alcance (uma régua só)', estado: 'nao_existe', dono: 'app digiai',
        medido: 'não existe na tela. Depende do bloco acima; sem denominador fixo, comparar marcas é comparar réguas' },
      { pergunta: 'Prendeu até o fim?', bloco: 'Retenção de vídeo',
        fonte: 'v_mkt_resultado_peca.retencao_pct', estado: 'rede_nao_da', dono: '—',
        medido: 'só o YouTube entrega (247 leituras em 90 dias). A API do TikTok não dá tempo assistido — só o app do criador' },
    ],
  },
  {
    k: 'vieram', titulo: '4 · Vieram?', degrau: 'Quem reagiu saiu da rede e veio para a casa — site, landing, ficha, WhatsApp?',
    blocos: [
      { pergunta: 'Quantos cliques saíram de cada peça para a casa?', bloco: 'Tráfego por peça',
        fonte: 'UTM com utm_content = peca_ref', estado: 'nao_existe', dono: 'MKT (começa 30/11)',
        medido: 'nenhuma peça sai hoje com etiqueta. E, mesmo com ela, só funciona onde o link é clicável: Facebook, YouTube longo, LinkedIn, X, WhatsApp, Google Meu Negócio e Pinterest — 229 das 876 peças e 22% das views' },
      { pergunta: 'E nos 78% onde não dá etiqueta?', bloco: 'Tráfego sem etiqueta (dark social)',
        fonte: 'pico de "direto" após publicar + pergunta no balcão', estado: 'nao_existe', dono: 'dono + loja',
        medido: 'é a parte maior da audiência: feed e Reels do Instagram, TikTok e Shorts. Não tem solução técnica — tem estimativa e tem pergunta ao cliente' },
      { pergunta: 'A ficha do Google traz gente, e de que peça?', bloco: 'Ficha do Google com etiqueta',
        fonte: 'links da ficha com UTM', estado: 'nao_existe', dono: 'MKT',
        medido: 'sem UTM, a ficha some dentro de "direto/orgânico" no analytics. A casa já publica 268 posts na ficha — eles aceitam link com etiqueta' },
      { pergunta: 'Quanta gente o site e as landings receberam, por origem?', bloco: 'Analytics de site',
        fonte: 'a definir (GA4 / Cloudflare Web Analytics)', estado: 'nao_existe', dono: 'dono decide a ferramenta',
        medido: 'não há analytics de site ligado ao painel. Sem isso, o degrau 4 não fecha nem onde a etiqueta funciona' },
    ],
  },
  {
    k: 'compraram', titulo: '5 · Compraram?', degrau: 'Virou lead, virou venda, virou dinheiro — e de qual peça?',
    blocos: [
      { pergunta: 'Quantos leads, e de qual peça?', bloco: 'Lead por peça',
        fonte: 'v_marketing_landing_leads.utm_content', estado: 'falta_dado', dono: 'MKT (carimbo) + app digiai (tela)',
        medido: 'a estrutura existe: utm_content, utm_source, utm_campaign e source_url estão na tabela. Só não vêm preenchidos — 4 leads no total, o mais recente (06/11) chegou com tudo nulo' },
      { pergunta: 'Quantas vendas, e de qual peça?', bloco: 'Venda por peça',
        fonte: 'v_marketing_community.attributed_post_id', estado: 'falta_dado', dono: 'MKT',
        medido: 'a coluna de atribuição JÁ EXISTE. 1 linha, 0 vendas — o funil OSI está pré-lançamento, então o zero é real, não painel cego' },
      { pergunta: 'Quanto a loja vendeu, e o que o marketing teve a ver?', bloco: 'Venda da loja por origem',
        fonte: 'banco do Clearix (crm_erp) — isolado deste app', estado: 'nao_existe', dono: 'eco do Clearix',
        medido: 'inventário pedido ao eco em 25/11. Sem view de contrato, a venda da loja não chega a esta tela' },
      { pergunta: 'Qual o custo por lead e por venda?', bloco: 'Custo por resultado',
        fonte: 'custo de IA + mídia paga ÷ resultado', estado: 'nao_existe', dono: 'app digiai',
        medido: 'o custo de IA existe (v_mkt_ai_custo). Falta o denominador — que é o degrau 5 inteiro' },
    ],
  },
  {
    k: 'investir', titulo: '6 · Onde investir?', degrau: 'Com o recorte escolhido, qual rede e qual marca merecem mais esforço na semana que vem?',
    blocos: [
      { pergunta: 'Qual rede rende mais por peça publicada?', bloco: 'Rendimento por rede',
        fonte: 'views ÷ peças, por rede, no recorte', estado: 'parcial', dono: 'app digiai',
        medido: 'existe em "O que rendeu no recorte", mas em views — e view não se compara entre redes sem descontar a idade da coleta' },
      { pergunta: 'Qual marca cresce e qual está parada?', bloco: 'Marca × rede',
        fonte: 'v_mkt_conta_dia + audiencia_diaria', estado: 'no_ar', dono: '—' },
      { pergunta: 'Quanto cada marca pode postar sem cansar a audiência?', bloco: 'Régua de crescimento',
        fonte: 'v_mkt_nivel_crescimento', estado: 'no_ar', dono: '—',
        medido: 'esta aba ficou EM BRANCO desde sempre até hoje (25/11): o rodopio de carregamento nunca desligava nela' },
      { pergunta: 'A decisão da semana passada deu certo?', bloco: 'Placar da decisão anterior',
        fonte: 'a definir', estado: 'nao_existe', dono: 'app digiai',
        medido: 'nada na tela hoje fecha o ciclo: decide-se e nunca se volta para conferir' },
    ],
  },
  {
    k: 'repetir', titulo: '7 · O que repetir?', degrau: 'Que formato, que gatilho e que hora produzem mais — para a próxima peça nascer melhor.',
    blocos: [
      { pergunta: 'Que formato rende mais?', bloco: 'Mediana por formato',
        fonte: 'fn_mkt_resultado_recorte', estado: 'parcial', dono: 'MKT',
        medido: 'só tem base em Instagram (102 linhas) e Facebook (68). TikTok e YouTube: zero' },
      { pergunta: 'Que GATILHO (ideia) rende mais?', bloco: 'Mediana por gatilho',
        fonte: 'v_mkt_resultado_peca.tema', estado: 'parcial', dono: 'MKT (produção)',
        medido: '852 das 1.364 peças estão SEM rótulo de gatilho. Sem ele, a tela responde sobre formato de arquivo (jpg, mp4, story), não sobre ideia' },
      { pergunta: 'Que hora e que dia funcionam?', bloco: 'Hora e dia da semana',
        fonte: 'fn_mkt_resultado_recorte', estado: 'parcial', dono: 'MKT',
        medido: 'mesma limitação de rede do bloco de formato' },
    ],
  },
  {
    k: 'loja', titulo: '8 · A loja sentiu?', degrau: 'O movimento na loja mudou — e o marketing teve a ver com isso?',
    blocos: [
      { pergunta: 'Quantos pediram rota, ligaram, viram a ficha?', bloco: 'Ficha do Google',
        fonte: 'v_mkt_negocio_semana', estado: 'no_ar', dono: '—',
        medido: '60 fichas, 41 ligações, 588 rotas e 11 cliques, em 9 semanas e 3 marcas. É o sinal mais próximo de dinheiro que a casa tem hoje' },
      { pergunta: 'Esse movimento veio de qual peça?', bloco: 'Ligação peça → ficha',
        fonte: 'UTM nos links da ficha', estado: 'nao_existe', dono: 'MKT',
        medido: 'hoje a ficha é um número solto: sobe e desce sem causa escrita' },
      { pergunta: 'O que o cliente diz no balcão?', bloco: '"Como você nos achou"',
        fonte: 'campo no atendimento (Clearix)', estado: 'nao_existe', dono: 'dono + eco',
        medido: 'é a única resposta possível para os 78% de audiência sem etiqueta. Não depende de tecnologia nova — depende de perguntar e registrar' },
    ],
  },
  {
    k: 'clearix', titulo: '9 · Clearix', degrau: 'O funil do produto: quem viu virou demonstração, piloto, cliente pagante?',
    blocos: [
      { pergunta: 'Quantas visitas na landing, por origem?', bloco: 'Landing do Clearix',
        fonte: 'banco do Clearix — isolado deste app', estado: 'nao_existe', dono: 'eco do Clearix',
        medido: 'inventário pedido em 25/11' },
      { pergunta: 'Quantos pediram demonstração?', bloco: 'Demonstrações',
        fonte: 'a confirmar no inventário do eco', estado: 'nao_existe', dono: 'eco do Clearix' },
      { pergunta: 'Quantos viraram piloto e quantos pagam?', bloco: 'Piloto e cliente pagante',
        fonte: 'a confirmar no inventário do eco', estado: 'nao_existe', dono: 'eco do Clearix',
        medido: 'a folha única diz: ainda sem cliente externo pagante. O número é zero e é verdadeiro' },
      { pergunta: 'O conteúdo da casa ajudou a vender o Clearix?', bloco: 'Conteúdo → pipeline',
        fonte: 'UTM + CRM do eco', estado: 'nao_existe', dono: 'MKT + eco' },
    ],
  },
  {
    k: 'confianca', titulo: '10 · Dá para confiar?', degrau: 'De onde veio cada número, desde quando, e o que ele não diz.',
    blocos: [
      { pergunta: 'Quantas peças a casa consegue ler?', bloco: 'Cobertura da leitura',
        fonte: 'v_mkt_cobertura_leitura', estado: 'no_ar', dono: '—' },
      { pergunta: 'Desde quando existe leitura, por rede?', bloco: 'Idade da coleta',
        fonte: 'mínimo de data no recorte', estado: 'no_ar', dono: '—' },
      { pergunta: 'Que número a IA pode citar?', bloco: 'Fatos publicáveis',
        fonte: 'v_mkt_fatos', estado: 'no_ar', dono: '—',
        medido: '14 citáveis hoje de 34 ativos' },
      { pergunta: 'Que bloco não obedece ao recorte, e por quê?', bloco: 'Selo "não separa por…"',
        fonte: 'declarado em cada bloco', estado: 'no_ar', dono: '—',
        medido: 'regra da casa: filtro que não chega é pior que filtro que não existe' },
    ],
  },
];

export default function MarketingAlvo() {
  const [aba, setAba] = useState(ALVO[0].k);
  const atual = ALVO.find((a) => a.k === aba) ?? ALVO[0];

  const todos = ALVO.flatMap((a) => a.blocos);
  const conta = (e: Estado) => todos.filter((b) => b.estado === e).length;

  return (
    <div className="space-y-5">
      <div className="border border-outline/15 bg-surface-container">
        <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
          <Target className="w-4 h-4 text-secondary" />
          <span className="text-sm font-semibold text-on-surface">Marketing — o alvo</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-warning border border-warning/40 bg-warning/10 px-1.5 py-px">
            mock · nada aqui é dado vivo
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted">25/11/2026 · ordem do dono</span>
        </div>

        <div className="px-4 py-3 text-sm text-on-surface-variant leading-relaxed border-b border-outline/10">
          A página de Marketing cresceu por adição: cada aba respondeu a um pedido, e ninguém nunca
          escreveu <strong className="text-on-surface">a lista de perguntas</strong> que o painel deve
          responder. Esta tela é essa lista, na ordem do funil — <strong className="text-on-surface">saiu
          → viram → reagiram → vieram → compraram</strong> — com o estado medido de cada bloco.
          <br /><br />
          O diagnóstico em uma frase: <strong className="text-on-surface">a casa enxerga bem os dois
          primeiros degraus, mal o terceiro, e nada do quarto e do quinto.</strong> É por isso que a
          tela "não dá respostas" — ela mede com precisão justamente a parte que não decide orçamento.
        </div>

        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {(['no_ar', 'parcial', 'falta_coluna', 'falta_dado', 'nao_existe'] as Estado[]).map((e) => (
            <div key={e}>
              <div className="text-xl font-bold tabular-nums text-on-surface">{conta(e)}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{ESTADO[e].rotulo}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {ALVO.map((a) => {
          const faltam = a.blocos.filter((b) => b.estado !== 'no_ar' && b.estado !== 'rede_nao_da').length;
          return (
            <button key={a.k} onClick={() => setAba(a.k)}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border ${
                aba === a.k ? 'bg-surface-highest text-on-surface border-outline/30' : 'text-muted border-outline/15 hover:text-on-surface-variant'}`}>
              {a.titulo}
              {faltam > 0 && <span className="ml-1.5 text-warning">{faltam}</span>}
            </button>
          );
        })}
      </div>

      <div className="border border-outline/15 bg-surface-container">
        <div className="px-4 py-2.5 border-b border-outline/10">
          <div className="text-sm font-semibold text-on-surface">{atual.titulo}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{atual.degrau}</div>
        </div>

        <div className="divide-y divide-outline/10">
          {atual.blocos.map((b) => {
            const est = ESTADO[b.estado];
            const Icone = est.Icone;
            return (
              <div key={b.bloco} className="px-4 py-3">
                <div className="flex items-start gap-2 flex-wrap">
                  <Icone className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${est.cor.split(' ')[0]}`} />
                  <span className="text-sm text-on-surface flex-1 min-w-[16rem]">{b.pergunta}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider border px-1.5 py-px ${est.cor}`}>
                    {est.rotulo}
                  </span>
                </div>
                <div className="pl-6 mt-1 font-mono text-[10px] text-muted">
                  bloco: {b.bloco} · fonte: {b.fonte}
                  {b.dono !== '—' && <> · <span className="text-secondary">de quem é: {b.dono}</span></>}
                </div>
                {b.medido && (
                  <div className="pl-6 mt-1 text-xs text-on-surface-variant">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted">medido</span>{' '}
                    {b.medido}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-outline/15 bg-surface-container px-4 py-3 text-xs text-on-surface-variant leading-relaxed">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">o que o estudo trouxe de fora</span>
        <ul className="mt-1.5 space-y-1 list-disc pl-4">
          <li>Métrica se escolhe por <strong className="text-on-surface">objetivo</strong>, não por disponibilidade. Alcance é consciência, engajamento é qualidade, conversão é negócio — juntar os três num placar só esconde os três.</li>
          <li>Taxa de engajamento só se compara com <strong className="text-on-surface">denominador fixo</strong>: sobre seguidores <em>ou</em> sobre alcance, nunca os dois na mesma tela.</li>
          <li>Tráfego de rede social chega como "direto" quando não há etiqueta — e a ficha do Google também some aí dentro. É o <strong className="text-on-surface">dark social</strong>, e para ele existe estimativa, não medição.</li>
          <li>Loja física não tem conversão observada, tem <strong className="text-on-surface">modelada</strong>. O que existe de verdade é pedido de rota, ligação, e a pergunta no balcão.</li>
        </ul>
      </div>
    </div>
  );
}
