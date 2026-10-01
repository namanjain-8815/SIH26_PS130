'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Zap,
  Shield,
  Briefcase,
  Landmark,
  ShieldAlert,
  ClipboardCheck,
  UserPlus,
  Sparkles,
  X,
  Lock,
  Mail,
  User,
  Factory,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

const QUICK_DEMO_ACCOUNTS = [
  {
    roleKey: 'APPLICANT',
    email: 'entrepreneur@demo.local',
    label: 'Applicant / Investor',
    title: 'Rajesh Mehta · ABC Foods Pvt Ltd',
    sub: 'Principal Business Owner / Promoter',
    dest: '/app/dashboard',
    icon: Briefcase,
    color: 'from-emerald-600 to-teal-700',
    badge: 'Investor Desk',
  },
  {
    roleKey: 'REPRESENTATIVE',
    email: 'manager@demo.local',
    label: 'Authorized Representative',
    title: 'Amit Deshmukh · ABC Foods Pvt Ltd',
    sub: 'Designated Agent under Board Resolution',
    dest: '/app/dashboard',
    icon: UserCheck,
    color: 'from-amber-600 to-orange-700',
    badge: 'Representative',
  },
  {
    roleKey: 'MIDC_OFFICER',
    email: 'officer@demo.local',
    label: 'Competent Authority — MIDC',
    title: 'Sunil Patil · Land Allotment',
    sub: 'Plot Allotment & Infrastructure Scrutiny Desk',
    dest: '/government/work-queue',
    icon: Landmark,
    color: 'from-blue-600 to-indigo-700',
    badge: 'Authority Desk',
  },
  {
    roleKey: 'MPCB_OFFICER',
    email: 'pcb.officer@demo.local',
    label: 'Competent Authority — MPCB',
    title: 'Dr. Vivek Sharma · Pollution Control',
    sub: 'Consent to Establish (CTE) & Operate (CTO)',
    dest: '/government/work-queue',
    icon: Landmark,
    color: 'from-cyan-600 to-blue-700',
    badge: 'Pollution Desk',
  },
  {
    roleKey: 'NODAL',
    email: 'nodal@demo.local',
    label: 'MAITRI Nodal Officer',
    title: 'Anjali Rane · Nodal Facilitation',
    sub: 'Inter-Departmental Coordination & RTS Oversight',
    dest: '/government/work-queue',
    icon: Building2,
    color: 'from-purple-600 to-indigo-800',
    badge: 'Single Window',
  },
  {
    roleKey: 'INSPECTOR',
    email: 'inspector@demo.local',
    label: 'Designated Joint Inspector',
    title: 'Kavita Joshi · Inspection Desk',
    sub: 'Physical Site Verification & Geo-Tagged Findings',
    dest: '/government/inspections',
    icon: ClipboardCheck,
    color: 'from-violet-600 to-purple-800',
    badge: 'Inspector Desk',
  },
  {
    roleKey: 'ADMIN',
    email: 'admin@demo.local',
    label: 'System Administrator',
    title: 'Admin Console · Governance',
    sub: 'Catalogues, Applicability Rules & SLA Policies',
    dest: '/admin/approval-types',
    icon: ShieldAlert,
    color: 'from-slate-700 to-gray-900',
    badge: 'Super Admin',
  },
];

const ENTITY_TYPES = [
  'Private Limited Company',
  'Public Limited Company',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
];

const SECTOR_OPTIONS = [
  'Food Processing',
  'Chemicals & Petrochemicals',
  'Textiles & Garments',
  'Engineering & Fabrication',
  'Information Technology & Electronics',
  'Pharmaceuticals',
  'General Manufacturing',
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Custom login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quickLoginRole, setQuickLoginRole] = useState<string | null>(null);

  // Register modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    entity_name: '',
    entity_type: 'Private Limited Company',
    sector: 'Food Processing',
  });

  async function handleQuickLogin(account: typeof QUICK_DEMO_ACCOUNTS[0]) {
    setError('');
    setQuickLoginRole(account.roleKey);
    try {
      qc.clear();
      await login(account.email, 'Demo@123');
      router.push(account.dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed');
      setQuickLoginRole(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      qc.clear();
      await login(email.trim(), password);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      qc.clear();
      await register({
        name: regForm.name.trim(),
        email: regForm.email.trim(),
        password: regForm.password,
        entity_name: regForm.entity_name.trim(),
        entity_type: regForm.entity_type,
        sector: regForm.sector,
      });
      setShowRegisterModal(false);
      router.push('/app/dashboard');
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 font-sans text-gray-100">
      {/* Left panel — Hero & Single Window Value Showcase */}
      <div className="lg:w-[48%] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding Bar */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-extrabold text-lg tracking-tight">Udyog Setu</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Govt of Maharashtra
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Maharashtra Industrial Single Window Clearances System
              </p>
            </div>
          </div>
        </div>

        {/* Core Value Proposition */}
        <div className="my-8 space-y-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart India Hackathon · PS 26130</span>
            </div>
            <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              One Unified Gateway for all <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
                Statutory Permissions & Clearances
              </span>
            </h1>
            <p className="text-slate-400 mt-4 text-xs sm:text-sm leading-relaxed max-w-lg">
              Next-generation Single Window System for Maharashtra. Eliminates inter-departmental runaround
              via automated cross-document audits, joint inspection coordination, and RTS statutory SLA enforcement.
            </p>
          </div>

          {/* 4 Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              {
                icon: CheckCircle2,
                title: 'Single Window Scrutiny',
                desc: 'Unified CAF across MIDC, MPCB, DISH & Fire Services',
              },
              {
                icon: Zap,
                title: 'Parallel Clearances',
                desc: 'Concurrently unlocks independent statutory workflows',
              },
              {
                icon: Shield,
                title: 'Cross-Document Audit',
                desc: 'Deterministic consistency check prevents rejections',
              },
              {
                icon: Building2,
                title: 'Right to Services SLA',
                desc: 'Live deemed approval countdowns and escalation',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
              >
                <Icon className="w-4 h-4 text-emerald-400 mb-1.5" />
                <p className="text-white text-xs font-semibold">{title}</p>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Notice */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between relative z-10">
          <span>Grounded in Maharashtra Facilitation Act, 2023</span>
          <span className="text-emerald-400 font-semibold">100% Deterministic</span>
        </div>
      </div>

      {/* Right panel — Instant 1-Click Judge Demo Switcher & Login Form */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-12 bg-slate-950 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                Sign In to Single Window 🏛️
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Use 1-Click Judge Demo buttons or enter credentials
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>

          {/* 🌟 1-CLICK JUDGE QUICK DEMO ACCESS */}
          <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                1-Click Judge Demonstration Logins
              </span>
              <span className="text-[10px] text-slate-400 font-mono">No typing required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isLoggingIn = quickLoginRole === acc.roleKey;
                return (
                  <button
                    key={acc.roleKey}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={loading || quickLoginRole !== null}
                    className="p-3 text-left rounded-xl bg-slate-800/90 hover:bg-slate-850 border border-slate-750 hover:border-slate-650 transition-all flex items-start gap-2.5 group active:scale-98 disabled:opacity-50"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${acc.color} flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-emerald-300 transition-colors">
                          {acc.label}
                        </p>
                        <span className="text-[9px] bg-slate-700/80 text-slate-300 px-1 py-0.2 rounded font-medium flex-shrink-0">
                          {acc.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 truncate font-medium">{acc.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{acc.sub}</p>
                    </div>
                    {isLoggingIn && (
                      <span className="w-3.5 h-3.5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin flex-shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Credentials Form */}
          <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Or Sign In with Registered Account
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Demo Password: Demo@123</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address / Registered Identifier
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="entrepreneur@demo.local"
                    required
                    className="w-full px-3.5 py-2.5 pl-10 text-xs bg-slate-950 border border-slate-750 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Account Password</label>
                  <span className="text-[10px] text-slate-500">Encrypted JWT Session</span>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 text-xs bg-slate-950 border border-slate-750 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-xs text-red-300 rounded-xl flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-red-800 text-white text-[10px] flex items-center justify-center flex-shrink-0 font-bold">
                    !
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || quickLoginRole !== null}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal: Public Registration for Applicant */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-800 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Register Enterprise Account</h3>
                  <p className="text-[11px] text-slate-400">
                    Single-Window clearance access for industrial promoters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name of Promoter *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kulkarni"
                    className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-lg text-white outline-none"
                  />
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Official Email Address *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="ramesh@myenterprise.in"
                    className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-lg text-white outline-none"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-lg text-white outline-none"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Legal Entity / Undertaking Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regForm.entity_name}
                    onChange={(e) => setRegForm({ ...regForm, entity_name: e.target.value })}
                    placeholder="e.g. Sahyadri Bio-Tech Industries Pvt Ltd"
                    className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-lg text-white outline-none"
                  />
                  <Factory className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Constitution</label>
                  <select
                    value={regForm.entity_type}
                    onChange={(e) => setRegForm({ ...regForm, entity_type: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-750 rounded-lg text-white outline-none text-xs"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Industry Sector</label>
                  <select
                    value={regForm.sector}
                    onChange={(e) => setRegForm({ ...regForm, sector: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-750 rounded-lg text-white outline-none text-xs"
                  >
                    {SECTOR_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {regError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300">
                  {regError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-colors"
                >
                  {regLoading ? 'Registering…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
