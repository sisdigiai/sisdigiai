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
    <div className="min-h-screen bg-[#0A0F1E] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo variant="horizontal" iconClassName="w-10 h-10" textClassName="text-3xl" className="justify-center" />
          <div className="mt-3 text-sm text-white/40 font-mono tracking-wider uppercase">Painel Operacional</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/20 flex items-center justify-center">
              <Lock size={18} className="text-[#06B6D4]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Acesso restrito</h1>
              <p className="text-xs text-white/50">Apenas usuários cadastrados</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2.5 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? 'Entrando...' : (<><LogIn size={16} /> Entrar</>)}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-6">
          DIGIAI · Fase 0–1 de 8 · Zero aos Milhões
        </p>
      </div>
    </div>
  );
}
