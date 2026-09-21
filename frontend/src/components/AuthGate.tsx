import { useEffect, useState, type ReactNode } from 'react';
import { api, logout } from '../services/api';
import type { Persona } from '../types';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const expired = () => { setUser(null); setLoading(false); };
    window.addEventListener('trustrag-logout', expired);
    api.getCurrentUser().then(value => { if (active) setUser(value); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener('trustrag-logout', expired); };
  }, []);

  if (loading) return <p className="p-8 text-on-surface">Checking session...</p>;
  if (user) return <div key={user.username}>{children}<button className="fixed bottom-3 right-3 px-3 py-2 bg-surface-container text-on-surface border border-outline-variant rounded z-50" onClick={logout}>Sign out ({user.role})</button></div>;
  const demoPersonas = [
    { name: 'Admin', user: 'admin', pass: 'admin123', role: 'Clearance 4 (All access)', icon: 'shield_person' },
    { name: 'IT Security', user: 'sec_admin', pass: 'sec123', role: 'Clearance 3 (Audit/IT)', icon: 'security' },
    { name: 'HR Specialist', user: 'hr_user', pass: 'hr123', role: 'Clearance 2 (HR docs)', icon: 'badge' },
    { name: 'Employee', user: 'emp_user', pass: 'emp123', role: 'Clearance 1 (Internal)', icon: 'person' },
  ];

  const handleQuickLogin = async (u: string, p: string) => {
    setError('');
    setUsername(u);
    setPassword(p);
    setLoading(true);
    try {
      const result = await api.login(u, p);
      setUser(result.user);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface p-4">
      <div className="w-full max-w-md bg-surface-container border border-outline-variant rounded-xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold tracking-wider uppercase mb-2">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>SECURE RAG GATEWAY</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">TrustRAG Sign In</h1>
          <p className="text-[13px] text-on-surface-variant">
            Zero-Trust Retrieval with OpenRouter LLM Intelligence
          </p>
        </div>

        {/* Quick Demo Personas */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
            1-Click Demo Personas:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {demoPersonas.map((p) => (
              <button
                key={p.user}
                type="button"
                onClick={() => void handleQuickLogin(p.user, p.pass)}
                className="p-2.5 bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/60 hover:border-primary/50 rounded-lg text-left transition-all group"
              >
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">
                    {p.icon}
                  </span>
                  <span className="text-[13px] font-semibold text-on-surface">{p.name}</span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">{p.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-on-surface-variant/40">
          <div className="flex-1 h-px bg-outline-variant"></div>
          <span className="text-[11px] font-mono uppercase">or manual credentials</span>
          <div className="flex-1 h-px bg-outline-variant"></div>
        </div>

        {/* Manual Login Form */}
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
              const result = await api.login(username, password);
              setUser(result.user);
              setPassword('');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Login failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Username
            </label>
            <input
              className="w-full px-3 py-2 bg-surface-variant text-on-surface border border-outline-variant rounded-lg text-[14px] focus:outline-none focus:border-primary transition-colors"
              autoComplete="username"
              required
              placeholder="e.g. admin, emp_user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Password
            </label>
            <input
              className="w-full px-3 py-2 bg-surface-variant text-on-surface border border-outline-variant rounded-lg text-[14px] focus:outline-none focus:border-primary transition-colors"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div role="alert" className="p-3 bg-error-container/20 border border-error/50 rounded-lg text-error text-[13px] flex items-center space-x-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <button
            className="w-full py-2.5 bg-primary hover:brightness-110 text-on-primary font-bold text-[13px] tracking-wide uppercase rounded-lg shadow transition-all disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
