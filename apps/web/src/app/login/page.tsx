'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';
import { setUser } from '@/lib/auth';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, Users, Briefcase, User, Settings, ArrowRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

const demoAccounts = [
  { label: 'Sarah Chen',    email: 'hr.admin@acme.com',       role: 'HR_ADMIN',      icon: ShieldCheck, desc: 'Full admin access, policy oversight',      color: 'from-emerald-500 to-teal-600' },
  { label: 'David Miller',  email: 'mgr.ops@acme.com',        role: 'MANAGER',       icon: Briefcase,   desc: 'Operations team approvals',                color: 'from-indigo-500 to-violet-600' },
  { label: 'Lisa Park',     email: 'mgr.tech@acme.com',       role: 'MANAGER',       icon: Users,       desc: 'Technology team approvals',                color: 'from-blue-500 to-indigo-600' },
  { label: 'Alice Johnson', email: 'alice.johnson@acme.com',   role: 'EMPLOYEE',      icon: User,        desc: 'Self-service employee view',               color: 'from-slate-500 to-slate-600' },
  { label: 'System Admin',  email: 'sysadmin@acme.com',        role: 'SYSTEM_ADMIN',  icon: Settings,    desc: 'Infrastructure & system traces',           color: 'from-purple-500 to-pink-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading]   = useState(false);
  const [loggingInAs, setLoggingInAs] = useState('');
  const [error, setError]       = useState('');
  const [showManual, setShowManual] = useState(false);

  async function doLogin(emailVal: string, passwordVal: string, label?: string) {
    setLoading(true); setError(''); setLoggingInAs(label || '');
    try {
      const { token, user } = await api.login(emailVal, passwordVal);
      setToken(token);
      setUser(user);
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.warn('Backend login call failed, activating instant demo persona session:', err);
      // If logging in as one of the pre-configured demo personas, provide instant fallback
      const demoAccount = demoAccounts.find((d) => d.email === emailVal);
      if (demoAccount && (passwordVal === 'demo1234' || !passwordVal)) {
        const fallbackUser = {
          id: `user-${demoAccount.role.toLowerCase().replace(/_/g, '-')}`,
          tenantId: 'tenant-acme-corp',
          email: demoAccount.email,
          displayName: demoAccount.label,
          role: demoAccount.role as any,
        };
        const fallbackToken = typeof window !== 'undefined' ? btoa(JSON.stringify(fallbackUser)) : 'demo-token';
        setToken(fallbackToken);
        setUser(fallbackUser);
        window.location.href = '/dashboard';
        return;
      }

      setError(err.message || 'Login failed. Please check your credentials or backend status.');
      setLoading(false);
      setLoggingInAs('');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    doLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-gentle" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-gentle" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mb-5 text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
            AW
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AttendWise AI</h1>
          <p className="text-slate-400 text-sm mt-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Agentic Time & Attendance Exception Platform
          </p>
        </div>

        {/* Quick Login Cards */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-4">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4 text-center">
            Select a Demo Persona
          </div>
          <div className="space-y-2">
            {demoAccounts.map((acc) => {
              const Icon = acc.icon;
              const isLogging = loggingInAs === acc.label;
              return (
                <button
                  key={acc.email}
                  onClick={() => doLogin(acc.email, 'demo1234', acc.label)}
                  disabled={loading}
                  className={clsx(
                    'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group text-left',
                    isLogging
                      ? 'bg-indigo-600/30 border border-indigo-400/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20',
                    loading && !isLogging && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${acc.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{acc.label}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {acc.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{acc.desc}</p>
                  </div>
                  {isLogging ? (
                    <Spinner size="sm" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Login Toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            {showManual ? 'Hide manual login' : 'Or sign in with email & password'}
          </button>
        </div>

        {showManual && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl mt-4 animate-slide-up">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Enter email…"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <><Spinner size="sm" /> Signing in…</> : 'Sign in'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-300 text-sm px-4 py-3 rounded-xl border border-red-500/20 mt-4 animate-fade-in">
            {error}
          </div>
        )}

        <p className="text-center text-xs text-slate-500 mt-6">
          Demo prototype · Synthetic data only · Not connected to any real HR system
        </p>
      </div>
    </div>
  );
}
