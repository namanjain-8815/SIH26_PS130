'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Building2, CheckCircle2, Zap, Shield } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Applicant / Investor', email: 'entrepreneur@demo.local', role: 'ENTREPRENEUR' },
  { label: 'Authorized Representative', email: 'manager@demo.local', role: 'MANAGER' },
  { label: 'Competent Authority Officer · MIDC', email: 'officer@demo.local', role: 'OFFICER' },
  { label: 'Competent Authority Officer · MPCB', email: 'pcb.officer@demo.local', role: 'OFFICER' },
  { label: 'MAITRI Nodal Officer', email: 'nodal@demo.local', role: 'NODAL' },
  { label: 'Designated Inspection Officer', email: 'inspector@demo.local', role: 'INSPECTOR' },
  { label: 'System Administrator', email: 'admin@demo.local', role: 'ADMIN' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Redirect handled by root page
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Demo@123');
    setError('');
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm leading-none">Maharashtra Industrial Approvals</p>
              <span className="text-[10px] bg-primary-500/20 text-primary-300 font-semibold px-1.5 py-0.5 rounded border border-primary-500/30">
                PROTOTYPE
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">Single Window System Demonstration (SIH PS 26130)</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-white text-4xl font-bold leading-tight">
              One platform for all<br />
              <span className="text-primary-400">permissions & approvals</span>
            </h1>
            <p className="text-gray-400 mt-4 text-base leading-relaxed max-w-md">
              Streamline permissions, approvals, clearances and statutory compliances across concerned
              departments — built on the Maharashtra Single Window framework.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CheckCircle2, title: 'Single Window', desc: 'Unified scrutiny across authorities' },
              { icon: Zap,          title: 'Lifecycle Scrutiny', desc: 'Real-time tracking of decisions & queries' },
              { icon: Shield,       title: 'Compliance & Renewals', desc: 'Statutory deadline notifications' },
              { icon: Building2,    title: 'Specified Timelines', desc: 'MAITRI specified time limit monitoring' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-sidebar-active rounded-xl p-4 border border-sidebar-border/50">
                <Icon className="w-5 h-5 text-primary-400 mb-2" />
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-sidebar-active/60 border border-sidebar-border/40 text-[11px] text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300">Prototype / Demonstration Notice</p>
          <p>
            Developed for Smart India Hackathon (Problem Statement 26130). This prototype demonstrates
            single-window industrial approval orchestration and is not the official Government of Maharashtra portal.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Industrial Approvals Platform</span>
          </div>

          <div className="card p-8 animate-fade-in">
            <h2 className="text-gray-900 text-2xl font-bold">Welcome back 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Log in to continue to the platform</p>

            {/* Demo quick-fill */}
            <div className="mt-5 mb-5">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Quick demo login</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      email === acc.email
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email / Mobile Number
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="input-base"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button type="button" className="text-xs text-primary-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">!</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Demo password for all accounts:{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">Demo@123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
