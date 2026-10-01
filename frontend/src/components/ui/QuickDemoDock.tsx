'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ChevronDown,
  Building2,
  CheckCircle2,
  Landmark,
  ShieldAlert,
  ClipboardCheck,
  UserCheck,
  Briefcase,
  Sparkles,
} from 'lucide-react';

const DEMO_ROLES = [
  {
    role: 'APPLICANT',
    email: 'entrepreneur@demo.local',
    name: 'Rajesh Mehta',
    label: 'Applicant / Investor',
    sub: 'ABC Foods Pvt Ltd',
    dest: '/app/dashboard',
    icon: Briefcase,
    color: 'bg-emerald-600 text-white',
  },
  {
    role: 'REPRESENTATIVE',
    email: 'manager@demo.local',
    name: 'Amit Deshmukh',
    label: 'Authorized Representative',
    sub: 'Board Authorized Agent',
    dest: '/app/dashboard',
    icon: UserCheck,
    color: 'bg-amber-600 text-white',
  },
  {
    role: 'OFFICER_MIDC',
    email: 'officer@demo.local',
    name: 'Sunil Patil',
    label: 'Competent Authority — MIDC',
    sub: 'Land & Infrastructure',
    dest: '/government/work-queue',
    icon: Landmark,
    color: 'bg-blue-600 text-white',
  },
  {
    role: 'OFFICER_MPCB',
    email: 'pcb.officer@demo.local',
    name: 'Dr. Vivek Sharma',
    label: 'Competent Authority — MPCB',
    sub: 'Pollution Control & Consent',
    dest: '/government/work-queue',
    icon: Landmark,
    color: 'bg-cyan-600 text-white',
  },
  {
    role: 'NODAL',
    email: 'nodal@demo.local',
    name: 'Anjali Rane',
    label: 'MAITRI Nodal Officer',
    sub: 'Single Window Coordination',
    dest: '/government/work-queue',
    icon: Building2,
    color: 'bg-indigo-600 text-white',
  },
  {
    role: 'INSPECTOR',
    email: 'inspector@demo.local',
    name: 'Kavita Joshi',
    label: 'Designated Inspection Officer',
    sub: 'Joint Site Verification',
    dest: '/government/inspections',
    icon: ClipboardCheck,
    color: 'bg-purple-600 text-white',
  },
  {
    role: 'ADMIN',
    email: 'admin@demo.local',
    name: 'System Admin',
    label: 'System Administrator',
    sub: 'Rules, SLA & Governance',
    dest: '/admin/approval-types',
    icon: ShieldAlert,
    color: 'bg-slate-800 text-white',
  },
];

export function QuickDemoDock() {
  const { user, login } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const currentRoleMatch = DEMO_ROLES.find((r) => r.email === user?.email);

  const handleRoleSwitch = async (roleObj: typeof DEMO_ROLES[0]) => {
    if (user?.email === roleObj.email) {
      setIsOpen(false);
      return;
    }
    setSwitching(true);
    try {
      // Clear all react-query cache so department/role context never leaks
      qc.clear();
      await login(roleObj.email, 'Demo@123');
      setIsOpen(false);
      router.push(roleObj.dest);
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/80 hover:to-indigo-100/80 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
        title="Prototype Role Switcher (SIH Evaluation Tool Only — Not present in Production)"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
          Demo
        </span>
        <span className="text-blue-900 font-bold max-w-[105px] truncate">
          {currentRoleMatch ? currentRoleMatch.label.split('—')[0].trim() : user?.role || 'Switch Role'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-blue-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-50 animate-scale-in">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Demo Role Switcher
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
              Prototype Only
            </span>
          </div>

          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl my-2 text-[11px] text-amber-900 leading-snug">
            <span className="font-bold">⚠️ Evaluator Note:</span> This Role Switcher is strictly provided for hackathon presentation and judging. It will <strong>not</strong> be present in the live production portal, where users authenticate solely via government SSO / DigiLocker.
          </div>

          <div className="space-y-1 mt-1.5 max-h-96 overflow-y-auto">
            {DEMO_ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = user?.email === r.email;
              return (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => handleRoleSwitch(r)}
                  disabled={switching}
                  className={`w-full p-2 text-left rounded-xl transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-200 text-blue-950 font-semibold'
                      : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${r.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate leading-tight">{r.label}</p>
                    <p className="text-[10px] text-gray-500 truncate">{r.sub}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 px-2 flex items-center justify-between text-[10px] text-gray-400">
            <span>Password auto-handled</span>
            <span className="font-semibold text-gray-600">Smart Demo Mode</span>
          </div>
        </div>
      )}
    </div>
  );
}
