import { Clock, Search, ShieldQuestion, CheckSquare, KeyRound, Send } from 'lucide-react';
import type { Playbook } from '../../lib/playbookStore';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-secondary">{icon}</span>
        <h4 className="text-[11px] font-mono uppercase tracking-widest text-muted">{title}</h4>
      </div>
      {children}
    </div>
  );
}

const fmtMin = (m: number) => `${m}min`;

export default function PlaybookView({ playbook }: { playbook: Playbook }) {
  const agenda = playbook.agenda ?? [];
  const objections = playbook.objections ?? [];
  const checklist = playbook.checklist ?? [];
  const access = playbook.access_info ?? {};
  const followup = playbook.followup ?? {};
  const discovery = playbook.discovery ?? {};

  return (
    <div className="space-y-5">
      {playbook.objective && (
        <p className="text-sm text-on-surface-variant leading-relaxed border-l-2 border-secondary/40 pl-3">{playbook.objective}</p>
      )}

      {agenda.length > 0 && (
        <Section icon={<Clock className="w-3.5 h-3.5" />} title="Roteiro cronometrado">
          <div className="space-y-1">
            {agenda.map((b, i) => (
              <div key={i} className="flex gap-3 items-baseline border border-outline/10 bg-surface-low px-3 py-2">
                <span className="text-[10px] font-mono tabular-nums text-secondary whitespace-nowrap w-20">
                  {fmtMin(b.from_min)}–{fmtMin(b.to_min)}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-on-surface">{b.bloco}</span>
                  <span className="text-xs text-muted"> — {b.foco}</span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-surface-high text-muted whitespace-nowrap">{b.quem}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!!(discovery.dono?.length || discovery.assessoria?.length) && (
        <Section icon={<Search className="w-3.5 h-3.5" />} title="Descoberta (ouça antes de apresentar)">
          <div className="grid md:grid-cols-2 gap-3">
            {(['dono', 'assessoria'] as const).map((k) =>
              discovery[k]?.length ? (
                <div key={k} className="border border-outline/10 bg-surface-low p-3">
                  <div className="text-[10px] font-mono uppercase text-muted mb-1.5 capitalize">{k}</div>
                  <ul className="space-y-1">
                    {discovery[k]!.map((q, i) => (
                      <li key={i} className="text-xs text-on-surface-variant leading-snug flex gap-1.5">
                        <span className="text-secondary">·</span>{q}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </Section>
      )}

      {objections.length > 0 && (
        <Section icon={<ShieldQuestion className="w-3.5 h-3.5" />} title="Objeções → respostas">
          <div className="space-y-1.5">
            {objections.map((o, i) => (
              <div key={i} className="border border-outline/10 bg-surface-low px-3 py-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-on-surface flex-1">“{o.objecao}”</span>
                  {o.para && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-surface-high text-muted">{o.para}</span>}
                </div>
                <div className="text-xs text-on-surface-variant mt-1 leading-snug">{o.resposta}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {checklist.length > 0 && (
        <Section icon={<CheckSquare className="w-3.5 h-3.5" />} title="Checklist pré-call">
          <ul className="grid md:grid-cols-2 gap-1">
            {checklist.map((c, i) => (
              <li key={i} className="text-xs text-on-surface-variant flex gap-1.5 leading-snug">
                <span className="text-secondary">▢</span>{c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!!(access.sandboxes?.length || access.url) && (
        <Section icon={<KeyRound className="w-3.5 h-3.5" />} title="Acessos de demonstração">
          <div className="border border-outline/10 bg-surface-low p-3 space-y-2">
            {access.entrada && <div className="text-xs text-on-surface-variant">{access.entrada}</div>}
            {access.sandboxes?.length ? (
              <div className="space-y-1">
                {access.sandboxes.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-on-surface w-24">{s.tier}</span>
                    <span className="font-mono text-muted">{s.login}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {access.perfis?.length ? (
              <div className="text-[11px] text-muted">{access.perfis.join(' · ')}</div>
            ) : null}
            {access.senha_nota && <div className="text-[11px] text-warning/90 italic">{access.senha_nota}</div>}
          </div>
        </Section>
      )}

      {(followup.dono || followup.assessoria) && (
        <Section icon={<Send className="w-3.5 h-3.5" />} title="Follow-up (templates)">
          <div className="grid md:grid-cols-2 gap-3">
            {(['dono', 'assessoria'] as const).map((k) =>
              followup[k] ? (
                <div key={k} className="border border-outline/10 bg-surface-low p-3">
                  <div className="text-[10px] font-mono uppercase text-muted mb-1.5 capitalize">{k}</div>
                  <p className="text-xs text-on-surface-variant leading-snug whitespace-pre-wrap">{followup[k]}</p>
                </div>
              ) : null
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
