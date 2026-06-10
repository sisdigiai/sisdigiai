import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Globe, Plus, RefreshCw } from 'lucide-react';
import { marketingStore, type SocialUpdate, type SocialUpdateType } from '../../lib/marketingStore';

// Cadastro TRAVADO de contas — espelho do doc canônico
// Cockpit/social/redes-sociais.md (travas T-1 a T-8, decididas 2026-06-10).
// Mudou conta/navegador/cadência → atualizar o doc e este arquivo no mesmo turno.

type Camada = 'pessoal' | 'digiai' | 'osi';

interface ContaSocial {
  code: string;
  rede: string;
  handle: string;
  url: string | null;
  camada: Camada;
  navegador: string | null; // null = a validar (trava T-2: um navegador por rede)
  cadencia: string;
  papel: string;
}

export const CONTAS_SOCIAIS: ContaSocial[] = [
  { code: 'pessoal_linkedin', rede: 'LinkedIn', handle: 'Gilberto (pessoal)', url: null, camada: 'pessoal', navegador: null, cadencia: '3–5 posts/semana (rascunho diário)', papel: 'Build in public · autoridade B2B · rosto da DIGIAI/Clearix' },
  { code: 'digiai_instagram', rede: 'Instagram', handle: '@_digiai', url: 'https://instagram.com/_digiai', camada: 'digiai', navegador: null, cadencia: '1 carrossel/semana', papel: 'Institucional / ecossistema' },
  { code: 'digiai_linkedin', rede: 'LinkedIn', handle: 'company/digiai-app-br', url: 'https://www.linkedin.com/company/digiai-app-br/', camada: 'digiai', navegador: null, cadencia: '1 post/semana (consolidado)', papel: 'Institucional B2B' },
  { code: 'digiai_facebook', rede: 'Facebook', handle: 'Página DIGIAI', url: 'https://facebook.com/61586695274933', camada: 'digiai', navegador: null, cadencia: 'repost do IG', papel: 'Presença / verificação Meta' },
  { code: 'digiai_youtube', rede: 'YouTube', handle: '@SisDigiai', url: 'https://youtube.com/@SisDigiai', camada: 'digiai', navegador: null, cadencia: 'quando houver vídeo', papel: 'Conteúdo longo futuro' },
  { code: 'digiai_tiktok', rede: 'TikTok', handle: '@sisdigiai', url: 'https://tiktok.com/@sisdigiai', camada: 'digiai', navegador: null, cadencia: 'quando houver vídeo', papel: 'Reserva de handle / repost' },
  { code: 'osi_instagram', rede: 'Instagram', handle: '@oticasemimproviso', url: 'https://instagram.com/oticasemimproviso/', camada: 'osi', navegador: null, cadencia: 'calendário editorial OSI', papel: 'Funil OSI primário (rosto = Taty)' },
  { code: 'osi_tiktok', rede: 'TikTok', handle: '@oticasemimproviso', url: 'https://tiktok.com/@oticasemimproviso', camada: 'osi', navegador: null, cadencia: 'repost dos Reels', papel: 'Funil OSI primário' },
  { code: 'osi_facebook', rede: 'Facebook', handle: 'Página Óticas Sem Improviso', url: 'https://facebook.com/profile.php?id=61590241545549', camada: 'osi', navegador: null, cadencia: 'repost', papel: 'Suporte BM / ads' },
];

const CAMADAS: { id: Camada; titulo: string; regra: string }[] = [
  { id: 'pessoal', titulo: 'Pessoal — Gilberto', regra: 'Devlog diário mora aqui (T-6). OSI só como menção natural.' },
  { id: 'digiai', titulo: 'DIGIAI institucional', regra: 'Baixa frequência — consolidado semanal. Nunca devlog cru, nunca OSI (T-5).' },
  { id: 'osi', titulo: 'Ótica Sem Improviso', regra: 'Rosto = Taty. Calendário próprio (Calendário Editorial). Nunca no LinkedIn (T-5).' },
];

const STACK_CRIATIVOS = [
  { tipo: 'Card / carrossel estático', ferramenta: 'Templates HTML (marketing-kit) · GPT imagem · Canva' },
  { tipo: 'Imagem conceitual / cena', ferramenta: 'Higgsfield (GPT Image 2) · GPT' },
  { tipo: 'Vídeo curto (Reel/TikTok)', ferramenta: 'Higgsfield (Seedance / Marketing Studio) · gravação própria' },
  { tipo: 'Áudio / locução', ferramenta: 'ElevenLabs' },
];

const UPDATE_TYPES: { value: SocialUpdateType; label: string }[] = [
  { value: 'post', label: 'Post publicado' },
  { value: 'perfil', label: 'Perfil (avatar/dados)' },
  { value: 'bio', label: 'Bio' },
  { value: 'capa', label: 'Capa' },
  { value: 'config', label: 'Configuração' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'outro', label: 'Outro' },
];

const EMPTY_FORM = { account_code: CONTAS_SOCIAIS[0].code, update_type: 'post' as SocialUpdateType, title: '', url: '', notes: '', happened_on: '' };

export function Redes() {
  const [updates, setUpdates] = useState<SocialUpdate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    setUpdates(await marketingStore.listSocialUpdates());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const contaPorCode = useMemo(() => new Map(CONTAS_SOCIAIS.map(c => [c.code, c])), []);

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Título é obrigatório.'); return; }
    setSaving(true);
    const id = await marketingStore.logSocialUpdate({
      account_code: form.account_code,
      update_type: form.update_type,
      title: form.title.trim(),
      url: form.url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      happened_on: form.happened_on || undefined,
    });
    setSaving(false);
    if (id) {
      setSavedAt(Date.now());
      setForm(EMPTY_FORM);
      setShowForm(false);
      await refresh();
    } else {
      alert('Erro ao registrar — provável migration 041 pendente (ver banner). Veja o console.');
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Cadastro travado por camada */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-base flex items-center gap-2"><Globe className="w-4 h-4 text-secondary" /> Contas travadas</h3>
          <span className="text-[11px] text-muted font-mono">fonte: Cockpit/social/redes-sociais.md</span>
        </div>
        <p className="text-xs text-muted mb-4">
          Inventário fechado (T-1). Um navegador por rede (T-2) — badge âmbar = navegador ainda a validar.
          AI produz, humano publica (R-011/T-3).
        </p>

        <div className="space-y-6">
          {CAMADAS.map(camada => (
            <div key={camada.id}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface">{camada.titulo}</span>
                <span className="text-[11px] text-muted">{camada.regra}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {CONTAS_SOCIAIS.filter(c => c.camada === camada.id).map(conta => (
                  <div key={conta.code} className="bg-surface-low border border-outline/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{conta.rede}</div>
                      {conta.navegador ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-300 border border-green-500/30 uppercase tracking-wider">{conta.navegador}</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider">navegador a validar</span>
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      {conta.handle}
                      {conta.url && (
                        <a href={conta.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-on-surface">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-muted">{conta.papel}</div>
                    <div className="text-[11px] border-t border-outline/10 pt-2">
                      <span className="font-mono uppercase tracking-wider text-muted">Cadência:</span>{' '}
                      <span className="text-on-surface-variant">{conta.cadencia}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack de criativos */}
      <div>
        <h3 className="font-semibold text-base mb-2">Stack de criativos (T-4)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {STACK_CRIATIVOS.map(s => (
            <div key={s.tipo} className="bg-surface-low border border-outline/10 px-4 py-2.5 flex items-baseline justify-between gap-3">
              <span className="text-sm">{s.tipo}</span>
              <span className="text-[11px] text-muted text-right">{s.ferramenta}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-2">
          Ferramenta é meio — a identidade visual é que é travada: DIGIAI House (empresa/pessoal) · kit OSI (OSI). R-014/ADR-0034.
        </p>
      </div>

      {/* Log de atualizações */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">Log de atualizações (T-7 — registro eterno)</h3>
          <div className="flex gap-2">
            <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-surface font-medium hover:bg-secondary/90">
              <Plus className="w-4 h-4" /> Registrar atualização
            </button>
          </div>
        </div>

        {savedAt && (
          <div className="mb-3 px-4 py-2 bg-green-500/10 border border-green-500/30 text-sm text-green-300">
            Atualização registrada ✓
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-muted text-sm">Carregando log...</div>
        ) : updates === null ? (
          <div className="border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-sm text-on-surface-variant">
              <b className="text-on-surface">Log indisponível — migration 041 pendente.</b>{' '}
              Renovar o <span className="font-mono">SUPABASE_TOKEN</span> (Management API, 401 desde ~05/06) e aplicar{' '}
              <span className="font-mono">supabase/migrations/041_social_updates.sql</span>. O cadastro acima funciona normalmente.
            </div>
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">Nenhuma atualização registrada ainda.</div>
        ) : (
          <div className="border border-outline/10 divide-y divide-outline/10">
            {updates.map(u => {
              const conta = contaPorCode.get(u.account_code);
              return (
                <div key={u.id} className="px-4 py-3 flex items-start gap-4 bg-surface-low">
                  <div className="font-mono text-[11px] text-muted shrink-0 pt-0.5 w-20">{u.happened_on}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{u.title}</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {conta ? `${conta.rede} · ${conta.handle}` : u.account_code}
                      {u.notes && <span> — {u.notes}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-secondary shrink-0 pt-0.5">
                    {UPDATE_TYPES.find(t => t.value === u.update_type)?.label ?? u.update_type}
                  </span>
                  {u.url && (
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-on-surface shrink-0 pt-0.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal registrar */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-lowest flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface-container border border-outline/10 p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Registrar atualização de rede</h3>

            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Conta</label>
              <select value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })}
                className="w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none">
                {CONTAS_SOCIAIS.map(c => <option key={c.code} value={c.code}>{c.rede} · {c.handle}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Tipo</label>
                <select value={form.update_type} onChange={e => setForm({ ...form, update_type: e.target.value as SocialUpdateType })}
                  className="w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none">
                  {UPDATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Data (vazio = hoje)</label>
                <input type="date" value={form.happened_on} onChange={e => setForm({ ...form, happened_on: e.target.value })}
                  className="w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-secondary/40" />
              </div>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Título *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Post build in public — migração crm_erp"
                className="w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-secondary/40" />
            </div>

            <div>
              <label className="text-xs text-on-surface-variant block mb-1">URL (opcional)</label>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="Link do post publicado"
                className="w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-secondary/40" />
            </div>

            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Notas (opcional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-secondary/40" />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-secondary text-surface font-medium hover:bg-secondary/90 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
