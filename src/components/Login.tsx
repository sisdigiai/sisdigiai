import { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('junior@oticastatymello.com.br');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo variant="horizontal" iconClassName="w-10 h-10" textClassName="text-3xl" className="justify-center" />
          <div className="mt-3 text-[11px] text-secondary font-mono tracking-[0.25em] uppercase">Painel Operacional</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container border border-outline/10 p-8 space-y-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary-container border border-secondary/40 flex items-center justify-center">
              <Lock size={18} className="text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-on-surface">Acesso restrito</h1>
              <p className="text-xs text-on-surface-variant">Apenas usuários cadastrados</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-lowest border border-outline/30 px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-lowest border border-outline/30 px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-secondary text-surface hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? 'Entrando...' : (<><LogIn size={16} /> Entrar</>)}
          </button>
        </form>

        <p className="text-center text-[10px] font-mono uppercase tracking-widest text-muted mt-6">
          DIGIAI · Fase 0–1 de 8 · Zero aos Milhões
        </p>
      </div>
    </div>
  );
}
