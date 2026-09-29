'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Zap,
  Shield,
  UserCheck,
  Briefcase,
  Landmark,
  ShieldAlert,
  UserPlus,
  Sparkles,
  X,
  Lock,
  Mail,
  User,
  Factory,
} from 'lucide-react';

type RoleCategory = 'APPLICANT' | 'REPRESENTATIVE' | 'GOVERNMENT' | 'ADMIN';

const CATEGORIES: Array<{
  id: RoleCategory;
  label: string;
  icon: typeof UserCheck;
  subtitle: string;
}> = [
  {
    id: 'APPLICANT',
    label: 'Applicant / Investor',
    icon: Briefcase,
    subtitle: 'Principal business owner or investor',
  },
  {
    id: 'REPRESENTATIVE',
    label: 'Authorized Representative',
    icon: UserCheck,
    subtitle: 'Duly authorized agent / consultant',
  },
  {
    id: 'GOVERNMENT',
    label: 'Government Official',
    icon: Landmark,
    subtitle: 'Competent Authority, Nodal & Inspector',
  },
  {
    id: 'ADMIN',
    label: 'System Admin',
    icon: ShieldAlert,
    subtitle: 'Platform configuration & security',
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

  // Selected Category
  const [category, setCategory] = useState<RoleCategory>('APPLICANT');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
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

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
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
    <div className="min-h-screen flex bg-surface">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[50%] bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-base leading-none">Maharashtra Industrial Approvals</p>
                <span className="text-[10px] bg-primary-500/20 text-primary-300 font-semibold px-2 py-0.5 rounded-full border border-primary-500/30">
                  PROTOTYPE
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">Single Window System Demonstration (SIH PS 26130)</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
              One platform for all<br />
              <span className="text-primary-400">permissions & approvals</span>
            </h1>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed max-w-md">
              Streamline permissions, clearances, land allotments, and statutory compliances across concerned
              government departments — built on the Maharashtra Single Window framework.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CheckCircle2, title: 'Single Window Scrutiny', desc: 'Unified scrutiny across MIDC, MPCB & DISH' },
              { icon: Zap,          title: 'Direct Lifecycle Tracking', desc: 'Real-time tracking of decisions & queries' },
              { icon: Shield,       title: 'Compliance & Renewals', desc: 'Statutory deadline tracking & auto-reminders' },
              { icon: Building2,    title: 'Specified Time Limits', desc: 'Strict MAITRI deemed approval compliance' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-sidebar-active/80 backdrop-blur-sm rounded-xl p-3.5 border border-sidebar-border/50 shadow-xs">
                <Icon className="w-4 h-4 text-primary-400 mb-1.5" />
                <p className="text-white text-xs font-semibold">{title}</p>
                <p className="text-gray-400 text-[11px] mt-0.5 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-sidebar-active/60 border border-sidebar-border/40 text-[11px] text-gray-400 space-y-1 relative z-10">
          <p className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            Smart India Hackathon Prototype Notice
          </p>
          <p>
            Problem Statement 26130: Demonstrates single-window industrial approval orchestration, cross-document verification,
            and role-specific government scrutiny.
          </p>
        </div>
      </div>

      {/* Right panel — login form & role-first selector */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-surface overflow-y-auto">
        <div className="w-full max-w-lg space-y-5">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Industrial Approvals Single Window</span>
          </div>

          <div className="card p-6 sm:p-8 animate-fade-in shadow-sm border border-gray-200">
            <div>
              <h2 className="text-gray-900 text-xl font-bold">Sign In to Single Window Portal 👋</h2>
              <p className="text-gray-500 text-xs mt-1">Select your role category to quickly populate demo credentials or enter custom login</p>
            </div>

            {/* Role-First Category Selector (B0.6) */}
            <div className="mt-5 space-y-2.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Who are you logging in as?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id);
                        setError('');
                      }}
                      className={`p-2.5 text-left rounded-xl border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/70 text-primary-950 shadow-xs ring-1 ring-primary-500/30'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">{cat.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{cat.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Revealed Demo Accounts & Role Actions */}
            <div className="mt-4 p-3 bg-gray-50/90 rounded-xl border border-gray-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                  {category === 'APPLICANT' && 'Applicant / Investor Profile'}
                  {category === 'REPRESENTATIVE' && 'Representative Delegation Profile'}
                  {category === 'GOVERNMENT' && 'Concerned Department Authorities'}
                  {category === 'ADMIN' && 'System Administrator Access'}
                </span>
                <span className="text-[10px] text-gray-400">Click to autofill credentials</span>
              </div>

              {category === 'APPLICANT' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemo('entrepreneur@demo.local')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        email === 'entrepreneur@demo.local'
                          ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
                      }`}
                    >
                      Demo Applicant · entrepreneur@demo.local
                    </button>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">First time applicant or new enterprise?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRegError('');
                        setShowRegisterModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 bg-primary-100 hover:bg-primary-200/80 px-2.5 py-1 rounded-lg transition-colors border border-primary-300"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-primary-700" />
                      Create Applicant Account
                    </button>
                  </div>
                </div>
              )}

              {category === 'REPRESENTATIVE' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemo('manager@demo.local')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        email === 'manager@demo.local'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400'
                      }`}
                    >
                      Authorized Representative · manager@demo.local
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-snug">
                    <span className="font-bold">Representing: ABC Foods Pvt Ltd.</span> You will access the shared company workspace under a designated Board Resolution & Letter of Authorization.
                  </div>
                </div>
              )}

              {category === 'GOVERNMENT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    { label: 'MIDC Officer', email: 'officer@demo.local', sub: 'Land Allotment & Infrastructure' },
                    { label: 'MPCB Officer', email: 'pcb.officer@demo.local', sub: 'Consent to Establish / Operate' },
                    { label: 'MAITRI Nodal', email: 'nodal@demo.local', sub: 'Single Window Coordination' },
                    { label: 'Joint Inspector', email: 'inspector@demo.local', sub: 'Designated Site Inspection' },
                  ].map((officer) => (
                    <button
                      key={officer.email}
                      type="button"
                      onClick={() => fillDemo(officer.email)}
                      className={`p-2 text-left rounded-lg border text-xs font-medium transition-all ${
                        email === officer.email
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      <p className="font-bold truncate">{officer.label}</p>
                      <p className={`text-[10px] truncate ${email === officer.email ? 'text-blue-100' : 'text-gray-400'}`}>
                        {officer.email}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {category === 'ADMIN' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('admin@demo.local')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      email === 'admin@demo.local'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-400'
                    }`}
                  >
                    System Administrator · admin@demo.local
                  </button>
                </div>
              )}
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address / Registered Identifier
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="input-base text-xs pl-8"
                  />
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Password</label>
                  <span className="text-[11px] text-gray-400 font-mono">Demo: Demo@123</span>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="input-base text-xs pl-8 pr-9"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center flex-shrink-0 font-bold">!</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating Session…
                  </span>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Smart Single Window Auth</span>
              <span>Session-Scoped (B0.10)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Public Registration for Applicant / Entrepreneur (B0.7) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Create Applicant / Entrepreneur Account</h3>
                  <p className="text-[11px] text-gray-500">Register your business entity for Maharashtra single-window approvals</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name of Authorized Person *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kulkarni"
                    className="input-base text-xs pl-8"
                  />
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Official Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="ramesh@myenterprise.in"
                    className="input-base text-xs pl-8"
                  />
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Choose a secure password"
                    className="input-base text-xs pl-8"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Legal Entity / Undertaking Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regForm.entity_name}
                    onChange={(e) => setRegForm({ ...regForm, entity_name: e.target.value })}
                    placeholder="e.g. Sahyadri Bio-Tech Industries Pvt Ltd"
                    className="input-base text-xs pl-8"
                  />
                  <Factory className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Entity Constitution</label>
                  <select
                    value={regForm.entity_type}
                    onChange={(e) => setRegForm({ ...regForm, entity_type: e.target.value })}
                    className="input-base text-xs py-1.5"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Industry Sector</label>
                  <select
                    value={regForm.sector}
                    onChange={(e) => setRegForm({ ...regForm, sector: e.target.value })}
                    className="input-base text-xs py-1.5"
                  >
                    {SECTOR_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {regError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {regError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="btn-primary text-xs py-2 px-4 shadow-sm"
                >
                  {regLoading ? 'Registering...' : 'Create Account & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
