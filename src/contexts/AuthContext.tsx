import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: string | null;
  /** Papel ainda não resolvido pela RPC. Distingue "carregando" de "sem papel" —
   *  sem isso o portão não sabe se nega por falta de direito ou por falta de resposta. */
  papelCarregando: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [papelCarregando, setPapelCarregando] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Papel do usuário logado (RBAC). Fonte: RPC current_role_code() em iam.users.
  //
  // `role = null` significava TRÊS coisas ao mesmo tempo — ainda carregando, RPC
  // falhou, e usuário sem papel — e o portão tratava as três como "libera"
  // (fail-open). Portão que abre no erro não é portão (R-037).
  //
  // Agora o carregamento tem estado próprio: enquanto `papelCarregando` for true
  // ninguém decide; quando a RPC responde, `null` passa a significar SEM ACESSO,
  // inclusive quando a resposta foi erro. Fechar não tranca o dono: ele é
  // super_admin ativo em `iam.users` e a RPC o resolve — conferido em 06/09.
  // A RPC roda UMA vez por usuário, não uma por sessão. (21/11/2026)
  //
  // Dependia de `session`, e `onAuthStateChange` entrega um objeto NOVO a cada evento
  // (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED) — referência nova, efeito de novo. Medido no ar
  // hoje: **3 a 4 chamadas idênticas** a cada abertura do painel, e num dos carregamentos elas
  // levaram **5,4 s cada**, antes de qualquer tela começar a ler. O papel é do USUÁRIO e não muda
  // quando o token se renova; então a chave do efeito é o id dele.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    let active = true;
    if (!userId) { setRole(null); setPapelCarregando(false); return; }
    setPapelCarregando(true);
    supabase.rpc('current_role_code').then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('[auth] current_role_code falhou', error);
      setRole(error ? null : ((data as string | null) ?? null));
      setPapelCarregando(false);
    });
    return () => { active = false; };
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        papelCarregando,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
