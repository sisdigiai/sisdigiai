import React, { useState } from 'react';
import { FileText, BookOpen, ChevronRight } from 'lucide-react';

type Categoria = 'fundacao' | 'empresa' | 'portfolio' | 'produtos' | 'comercial' | 'marketing' | 'financeiro' | 'operacao' | 'roadmap' | 'governanca';

interface DocEntry {
  titulo: string;
  path: string;
  categoria: Categoria;
  descricao: string;
  status: 'validado' | 'canonico-inicial' | 'rascunho' | 'em-revisao';
  revisao: string;
}

const DOCS: DocEntry[] = [
  { titulo: 'Entrada para a Verdade Canônica', path: 'docs/00-fundacao/entrada-para-a-verdade-canonica.md', categoria: 'fundacao', descricao: 'Porta de entrada obrigatória. Regras de ouro, ordem de leitura, verdades que não podem ser alteradas.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Zero aos Milhões DIGIAI', path: 'docs/08-roadmap/zero-aos-milhoes-digiai.md', categoria: 'roadmap', descricao: 'FONTE MÁXIMA DE VERDADE. Linha-mestra de implantação da empresa. 8 fases. Regras de prioridade.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Identidade e Posicionamento', path: 'docs/01-empresa/identidade-e-posicionamento-digiai.md', categoria: 'empresa', descricao: 'Como a DIGIAI se apresenta ao mercado. Narrativa, marca-mãe, o que vende.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Plano de Negócio Mestre', path: 'docs/01-empresa/plano-de-negocio-mestre.md', categoria: 'empresa', descricao: 'Lógica de negócio, monetização, entrada no mercado. Primeiro milhão.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Arquitetura do Ecossistema', path: 'docs/02-portfolio/arquitetura-do-ecossistema.md', categoria: 'portfolio', descricao: 'Papel de cada frente. Hierarquia canônica dos produtos.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Matriz de Prioridades e Foco', path: 'docs/02-portfolio/matriz-de-prioridades-e-foco.md', categoria: 'portfolio', descricao: 'O que tem prioridade máxima, alta, média e incubação.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Matriz Status × Zero aos Milhões', path: 'docs/02-portfolio/matriz-status-zero-aos-milhoes.md', categoria: 'portfolio', descricao: 'Onde cada produto está hoje nas 8 fases. Bloqueios e próximos passos.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Clearix', path: 'docs/03-produtos-fichas/clearix.md', categoria: 'produtos', descricao: 'Ficha completa do produto-âncora. 22 seções. Baseada em análise do repositório real.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Nexus', path: 'docs/03-produtos-fichas/nexus.md', categoria: 'produtos', descricao: 'Plataforma de aprendizado AI-first. 3 verticais. 126 tabelas. Clearix University.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Lumina', path: 'docs/03-produtos-fichas/lumina.md', categoria: 'produtos', descricao: 'Digital signage SaaS. Player, playlists, agendamento, múltiplas telas.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Pulso', path: 'docs/03-produtos-fichas/pulso.md', categoria: 'produtos', descricao: 'Sistema operacional editorial faceless. Next.js + n8n + 6 workflows.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Polapetit', path: 'docs/03-produtos-fichas/polapetit.md', categoria: 'produtos', descricao: 'Sistema de eventos/festas infantis. Polá Petit. Single-tenant por design.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Qual a Foto', path: 'docs/03-produtos-fichas/qual-a-foto.md', categoria: 'produtos', descricao: 'Plataforma de aprovação de fotos. SvelteKit + magic link. MVP em construção.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — Nipo School', path: 'docs/03-produtos-fichas/nipo-school.md', categoria: 'produtos', descricao: 'Plataforma educacional musical. ADNIPO Suzano. Piloto robusto.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Ficha — DIGIAI App', path: 'docs/03-produtos-fichas/digiai-app.md', categoria: 'produtos', descricao: 'Painel interno. MVP de 10 módulos. Designer system pronto. App a construir.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Arquitetura Comercial Clearix', path: 'docs/04-comercial/arquitetura-comercial-clearix.md', categoria: 'comercial', descricao: 'ICP, 3 planos, pitch, posicionamento comercial.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Proposta Comercial Base Clearix', path: 'docs/04-comercial/proposta-comercial-base-clearix.md', categoria: 'comercial', descricao: 'Proposta pronta para envio a clientes.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Roteiro de Demo Clearix', path: 'docs/04-comercial/roteiro-de-demo-clearix.md', categoria: 'comercial', descricao: 'Passo a passo para demonstrar o Clearix a clientes.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Oferta Piloto Clearix', path: 'docs/04-comercial/oferta-piloto-clearix.md', categoria: 'comercial', descricao: 'Condições especiais para primeiros clientes.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Pricing Clearix', path: 'docs/04-comercial/pricing-clearix.md', categoria: 'comercial', descricao: '3 planos (Starter R$397, Growth R$797, Ecossistema R$1.497) + add-ons + política de desconto + margem.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Onboarding Cliente Clearix', path: 'docs/04-comercial/onboarding-cliente-clearix.md', categoria: 'comercial', descricao: 'Playbook D+0 a D+30: ativação, configuração, go-live, success check.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Suporte ao Cliente Clearix', path: 'docs/04-comercial/suporte-ao-cliente-clearix.md', categoria: 'comercial', descricao: 'Canais, matriz de severidade S1-S5, SLA por plano, escalação, LGPD.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Roteiro de Entrevista Mom Test', path: 'docs/04-comercial/template-roteiro-entrevista-mom-test.md', categoria: 'comercial', descricao: 'Roteiro 30min estruturado para validar problema do Clearix com donos de ótica. Base da Fase 0.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Script de Abordagem para Óticas', path: 'docs/04-comercial/script-abordagem-otica.md', categoria: 'comercial', descricao: 'Templates de cold outreach (WhatsApp/ligação/presencial) para agendar entrevistas.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Template de Registro de Entrevista', path: 'docs/04-comercial/template-registro-entrevista.md', categoria: 'comercial', descricao: 'Estrutura canônica para documentar cada entrevista (perfil, dores, citações, classificação).', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Plano Clearix Academy', path: 'docs/05-marketing/plano-clearix-academy.md', categoria: 'marketing', descricao: 'Funil, temas, operação editorial, low tickets, CTA para o ecossistema.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'OSI - Arquitetura do Ecossistema de Apps', path: 'docs_sync/05-marketing/produtos/otica-sem-improviso/01-estrategia/arquitetura-ecossistema-apps-oticas.md', categoria: 'marketing', descricao: 'Tese dos guias como iscas pagas e ascensao para o ecossistema de apps para oticas.', status: 'canonico-inicial', revisao: '2026-04-30' },
  { titulo: 'OSI - Plano de Funil e Kiwify', path: 'docs_sync/05-marketing/produtos/otica-sem-improviso/04-operacao-e-venda/plano-configuracao-funil-osi.md', categoria: 'marketing', descricao: 'Configuracao do low ticket, bumps, upsell, trafego ABO, KPIs e easter eggs do produto principal.', status: 'canonico-inicial', revisao: '2026-04-30' },
  { titulo: 'OSI - Regua de Recuperacao', path: 'docs_sync/05-marketing/produtos/otica-sem-improviso/04-operacao-e-venda/regua-recuperacao-carrinho-osi.md', categoria: 'marketing', descricao: 'Fluxo de e-mail e WhatsApp para carrinho abandonado com qualificacao de dor para o ecossistema.', status: 'canonico-inicial', revisao: '2026-04-30' },
  { titulo: 'Plano Editorial 90 dias', path: 'docs/05-marketing/plano-editorial-90-dias-clearix-academy.md', categoria: 'marketing', descricao: 'Calendário editorial de 90 dias para o Academy.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Estratégia Academy como Lead Gen', path: 'docs/05-marketing/estrategia-academy-como-lead-gen.md', categoria: 'marketing', descricao: 'Resumo estratégico do Academy no nível holding. Detalhes táticos vivem em nexus/docs/academy/.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Identidade Legal DIGIAI', path: 'docs/01-empresa/identidade-legal-digiai.md', categoria: 'empresa', descricao: 'Registro único: CNPJ, forma jurídica, sócios, CNAEs, regime tributário, obrigações. (esqueleto)', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Financeiro Inicial e Alocação', path: 'docs/06-financeiro/financeiro-inicial-e-alocacao.md', categoria: 'financeiro', descricao: 'Capital investido, custos, runway, metas financeiras.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Métricas Financeiras Atuais', path: 'docs/06-financeiro/metricas-financeiras-atuais.md', categoria: 'financeiro', descricao: 'Snapshot mensal: MRR, custos, runway, contagens regressivas. Preenchido via Cadastro Empresa do app.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Trilha Completa de Implantação', path: 'docs/07-operacao/trilha-completa-de-implantacao-digiai.md', categoria: 'operacao', descricao: '8 fases com checklists e critérios de conclusão.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Backlog Executivo Inicial', path: 'docs/07-operacao/backlog-executivo-inicial.md', categoria: 'operacao', descricao: 'Itens prioritários de execução da fundação.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'DIGIAI App — Plano Central da Empresa', path: 'docs/07-operacao/digiai-app-plano-central-empresa.md', categoria: 'operacao', descricao: 'Plano estratégico do app como sistema nervoso central. 10 módulos, BI, segurança.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'DIGIAI App — Banco e Segurança Blueprint', path: 'docs/07-operacao/digiai-app-banco-seguranca-blueprint.md', categoria: 'operacao', descricao: 'Padrão de schemas privados, RLS, helper functions, auditoria. Herdado do crm_erp.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'DIGIAI App — Runbook do Banco', path: 'docs/07-operacao/digiai-app-banco-runbook.md', categoria: 'operacao', descricao: 'Operações: aplicar migration, criar user, rotacionar PAT, backup, troubleshooting.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Workflow Form → DB → Markdown', path: 'docs/07-operacao/workflow-form-db-markdown.md', categoria: 'operacao', descricao: 'Padrão canônico: forms do app escrevem no Supabase, export gera snapshots markdown para agentes.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'DIGIAI App — Visão Futuro (Cérebro da Empresa)', path: 'docs/07-operacao/visao-futuro-digiai-app-cerebro-empresa.md', categoria: 'operacao', descricao: 'Visão 24 meses: 3 estágios (build/run/intelligence), 5 camadas empilhadas, referências externas, filosofia.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'DIGIAI App — Control Plane Arquitetura', path: 'docs/07-operacao/digiai-app-control-plane-arquitetura.md', categoria: 'operacao', descricao: 'Arquitetura de control plane: federação JWT, billing centralizado, entitlements pull/push, régua de inadimplência D+3 a D+30, SLA 99,9%.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Stack Operacional e Ferramentas', path: 'docs/07-operacao/stack-operacional-ferramentas.md', categoria: 'operacao', descricao: 'Inventário de todas as ferramentas pagas da empresa. Preenchido via Cadastro Empresa.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Roadmap 30-90-365', path: 'docs/08-roadmap/roadmap-30-90-365.md', categoria: 'roadmap', descricao: 'Marcos dos próximos 30, 90 e 365 dias.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Roadmap Executivo (Playbook Unicórnio)', path: 'docs/08-roadmap/roadmap-executivo-unicornio.md', categoria: 'roadmap', descricao: 'PASSO A PASSO TÁTICO. 9 fases (0 a 8), 3 tracks paralelos, métrica única, decision gates, playbooks SV. Base do módulo Trilha.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Governança Documental', path: 'docs/09-governanca/governanca-documental.md', categoria: 'governanca', descricao: 'Como documentação é criada, validada e atualizada. Estados dos docs.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Divergências Apps vs Docs', path: 'docs/09-governanca/divergencias-apps-vs-docs.md', categoria: 'governanca', descricao: 'Registro de divergências entre código real e documentação canônica.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Registro de Decisões Estratégicas', path: 'docs/09-governanca/registro-de-decisoes-estrategicas.md', categoria: 'governanca', descricao: 'Decisões tomadas com data, motivo e impacto.', status: 'canonico-inicial', revisao: '2026-04-16' },
  { titulo: 'Jurídico e Contratos Legais', path: 'docs/09-governanca/juridico-contratos-legais.md', categoria: 'governanca', descricao: '4 documentos obrigatórios (MSA, ToS, Privacidade, DPA), CNAEs recomendados, checklist LGPD.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Hierarquia de Roles do App', path: 'docs/09-governanca/hierarquia-de-roles-digiai-app.md', categoria: 'governanca', descricao: 'super_admin > admin > founder > staff > viewer. Matriz de permissões + helpers SQL.', status: 'canonico-inicial', revisao: '2026-04-17' },
  { titulo: 'Changelog Executivo DIGIAI', path: 'docs/09-governanca/changelog-executivo-digiai.md', categoria: 'governanca', descricao: 'Histórico datado das mudanças estruturais da empresa. Substitui memória humana.', status: 'canonico-inicial', revisao: '2026-04-17' },
];

const categoriaLabel: Record<Categoria, string> = {
  fundacao: '00 Fundação', empresa: '01 Empresa', portfolio: '02 Portfólio',
  produtos: '03 Produtos', comercial: '04 Comercial', marketing: '05 Marketing',
  financeiro: '06 Financeiro', operacao: '07 Operação', roadmap: '08 Roadmap', governanca: '09 Governança',
};

const statusBadge: Record<string, string> = {
  validado: 'text-emerald-400 bg-emerald-400/10',
  'canonico-inicial': 'text-[#06B6D4] bg-[#06B6D4]/10',
  rascunho: 'text-amber-400 bg-amber-400/10',
  'em-revisao': 'text-white/40 bg-white/5',
};

const CATS_FILTRO: Array<Categoria | 'todos'> = ['todos', 'fundacao', 'empresa', 'portfolio', 'produtos', 'comercial', 'marketing', 'operacao', 'roadmap', 'governanca'];

export default function Biblioteca() {
  const [filtro, setFiltro] = useState<Categoria | 'todos'>('todos');

  const docs = filtro === 'todos' ? DOCS : DOCS.filter(d => d.categoria === filtro);

  const grupos = [...new Set(docs.map(d => d.categoria))];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Biblioteca Central</h1>
        <p className="text-white/50 mt-1">{DOCS.length} documentos · repositório canônico: <span className="font-mono text-white/40">D:\projetos\docs\digiai\docs\</span></p>
      </div>

      <div className="bg-[#2563EB]/8 border border-[#2563EB]/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <BookOpen className="w-4 h-4 text-[#2563EB] mt-0.5 shrink-0" />
        <div className="text-sm text-white/70">
          <span className="font-semibold text-white">Regra de ouro:</span> se houver conflito entre documentos, vale o que estiver em <span className="font-mono text-[#06B6D4]">docs/</span>. Fonte máxima: <span className="font-mono">zero-aos-milhoes-digiai.md</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {CATS_FILTRO.map(c => (
          <button
            key={c}
            onClick={() => setFiltro(c)}
            className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-all
              ${filtro === c ? 'bg-[#2563EB] text-white' : 'bg-white/5 text-white/40 hover:text-white/70'}`}
          >
            {c === 'todos' ? 'Todos' : categoriaLabel[c as Categoria]}
          </button>
        ))}
      </div>

      {/* Grupos */}
      <div className="space-y-6">
        {grupos.map(cat => {
          const catDocs = docs.filter(d => d.categoria === cat);
          return (
            <div key={cat}>
              <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3 px-1">
                {categoriaLabel[cat]}
              </div>
              <div className="space-y-2">
                {catDocs.map((doc) => (
                  <div
                    key={doc.path}
                    className="bg-white/2 border border-white/6 rounded-xl px-4 py-3 flex items-start gap-3 hover:border-white/12 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-white/25 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-white/90">{doc.titulo}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusBadge[doc.status]}`}>
                          {doc.status === 'canonico-inicial' ? 'canônico' : doc.status}
                        </span>
                      </div>
                      <div className="text-xs text-white/50">{doc.descricao}</div>
                      <div className="text-[10px] font-mono text-white/20 mt-1">{doc.path}</div>
                    </div>
                    <div className="text-[10px] font-mono text-white/20 shrink-0 mt-0.5">{doc.revisao}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
