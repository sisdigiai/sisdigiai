import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Network, LogOut, ShieldAlert } from 'lucide-react';
import {
  clearixSupabase,
  clearixConfigured,
  decodeClearixJwt,
} from '../../lib/clearixSupabase';

type ClearixAuthState = {
  session: Session | null;
  loading: boolean;
  roleCode: string | null;
  email: string | null;
};

function useClearixAuth(): ClearixAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearixSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = clearixSupabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const payload = decodeClearixJwt(session?.access_token ?? null);
  return {
    session,
    loading,
    roleCode: payload?.role_code ?? null,
    email: session?.user?.email ?? payload?.email ?? null,
  };
}

export default function ClearixAuthGate({ children }: { children: ReactNode }) {
  const { session, loading, roleCode, email } = useClearixAuth();
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!clearixConfigured) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-2 text-amber-300">
            <ShieldAlert size={18} />
            <div className="font-medium">Clearix não configurado</div>
          </div>
          <div className="text-sm text-on-surface-variant leading-relaxed">
            Defina <code className="font-mono text-xs bg-surface-lowest px-1.5 py-0.5">VITE_CLEARIX_SUPABASE_URL</code> e{' '}
            <code className="font-mono text-xs bg-surface-lowest px-1.5 py-0.5">VITE_CLEARIX_SUPABASE_ANON_KEY</code>{' '}
            em <code className="font-mono text-xs bg-surface-lowest px-1.5 py-0.5">.env</code> e reinicie o dev server.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted">Verificando sessão Clearix…</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError(null);
    const { error: err } = await clearixSupabase.auth.signInWithPassword({
      email: formEmail.trim(),
      password: formPassword,
    });
    setSigningIn(false);
    if (err) setError(err.message);
  };

  const handleSignOut = async () => {
    await clearixSupabase.auth.signOut();
  };

  if (!session) {
    return (
      <div className="p-8 max-w-md">
        <div className="border border-outline/10 bg-surface-container p-6">
          <div className="flex items-center gap-2 mb-4">
            <Network size={18} className="text-secondary" />
            <div className="text-sm font-medium text-on-surface">Acesso Clearix</div>
          </div>
          <div className="text-xs text-on-surface-variant mb-4 leading-relaxed">
            Login super_admin no banco Clearix (separado do login DigiAI).
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="email@digiai.com.br"
              autoComplete="email"
              required
              className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40"
            />
            <input
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="senha"
              autoComplete="current-password"
              required
              className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40"
            />
            {error && <div className="text-xs text-rose-400">{error}</div>}
            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-secondary text-surface text-sm py-2 hover:bg-secondary/90 disabled:opacity-50"
            >
              {signingIn ? 'Entrando…' : 'Entrar no Clearix'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (roleCode !== 'super_admin') {
    return (
      <div className="p-8 max-w-2xl">
        <div className="border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="flex items-center gap-2 mb-2 text-rose-300">
            <ShieldAlert size={18} />
            <div className="font-medium">Acesso negado</div>
          </div>
          <div className="text-sm text-on-surface-variant leading-relaxed mb-3">
            Conta <span className="font-mono">{email}</span> está autenticada no Clearix,
            mas não tem <code className="font-mono text-xs bg-surface-lowest px-1.5 py-0.5">role_code=super_admin</code>.
            {roleCode ? (
              <> Role atual: <code className="font-mono text-xs bg-surface-lowest px-1.5 py-0.5">{roleCode}</code>.</>
            ) : (
              <> Role não injetada no JWT — verifique o Access Token Hook do Supabase.</>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs border border-outline/10 bg-surface-lowest px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:border-outline/30"
          >
            <LogOut size={12} /> Sair e trocar de conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-2 border-b border-outline/10 text-[11px] text-on-surface-variant">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Clearix: <span className="text-on-surface-variant font-mono">{email}</span></span>
          <span className="text-muted">·</span>
          <span>super_admin</span>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1 text-muted hover:text-on-surface"
        >
          <LogOut size={11} /> Sair do Clearix
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
