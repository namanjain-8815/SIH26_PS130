'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatRole } from '@/lib/terminology';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Building2,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Lock,
  User,
  RefreshCw,
} from 'lucide-react';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OFFICER',
    department_id: '',
  });
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Queries
  const { data: users = [], isLoading: isUsersLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users.list(),
  });

  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => adminApi.departments.list(),
  });

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      adminApi.users.create({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role,
        department_id: ['OFFICER', 'INSPECTOR'].includes(data.role) ? data.department_id || null : null,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreateModal(false);
      setSuccessMsg(`Officer account for ${data.name} (${data.email}) created successfully.`);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'OFFICER',
        department_id: '',
      });
      setFormError('');
      setTimeout(() => setSuccessMsg(''), 6000);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create officer account');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (['OFFICER', 'INSPECTOR'].includes(form.role) && !form.department_id) {
      setFormError('Department assignment is mandatory for Competent Authority and Inspection Officers.');
      return;
    }
    createMutation.mutate(form);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department?.name && u.department.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Officer & User Management</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Create, provision and manage government official accounts, competent authorities, and platform users
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowCreateModal(true);
            }}
            className="btn-primary text-xs py-2 px-3.5 shadow-sm flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Create Officer Account
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by officer name, email or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base text-xs pl-9 py-1.5"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-base text-xs py-1.5 w-auto"
          >
            <option value="ALL">All Roles</option>
            <option value="OFFICER">Competent Authority Officer</option>
            <option value="INSPECTOR">Designated Inspector</option>
            <option value="NODAL">MAITRI Nodal</option>
            <option value="ENTREPRENEUR">Applicant / Investor</option>
            <option value="MANAGER">Authorized Representative</option>
            <option value="ADMIN">System Administrator</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden border border-gray-200 shadow-2xs">
        {isUsersLoading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading user accounts...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No matching user accounts found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">User & Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department / Authority</th>
                <th className="px-4 py-3">Associated Entity</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{u.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'OFFICER'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'NODAL'
                          ? 'bg-indigo-100 text-indigo-800'
                          : u.role === 'INSPECTOR'
                          ? 'bg-cyan-100 text-cyan-800'
                          : u.role === 'MANAGER'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {formatRole(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {u.department ? (
                      <span className="flex items-center gap-1.5 font-medium text-gray-900">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        {u.department.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">None (Cross-department)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.organization?.legal_name ? (
                      <span className="font-medium text-gray-800">{u.organization.legal_name}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Create Officer Account */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Create Official Account</h3>
                  <p className="text-[11px] text-gray-500">Provision a new government officer or nodal official</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Officer Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Deshmukh"
                    className="input-base text-xs pl-8"
                  />
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Official Email Address *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. rajesh.deshmukh@midcindia.org"
                    className="input-base text-xs pl-8"
                  />
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Temporary Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Choose a temporary password"
                    className="input-base text-xs pl-8"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role Type *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input-base text-xs py-1.5"
                  >
                    <option value="OFFICER">Competent Authority Officer (OFFICER)</option>
                    <option value="INSPECTOR">Designated Inspection Officer (INSPECTOR)</option>
                    <option value="NODAL">MAITRI Nodal Officer (NODAL)</option>
                    <option value="ADMIN">System Administrator (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department Authority
                    {['OFFICER', 'INSPECTOR'].includes(form.role) && (
                      <span className="text-red-500 font-bold ml-1">*</span>
                    )}
                  </label>
                  <select
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    disabled={!['OFFICER', 'INSPECTOR'].includes(form.role)}
                    className="input-base text-xs py-1.5 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {['OFFICER', 'INSPECTOR'].includes(form.role) && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      Mandatory for department-bound officers per single-window regulations.
                    </p>
                  )}
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary text-xs py-2 px-4 shadow-sm"
                >
                  {createMutation.isPending ? 'Provisioning Account...' : 'Create Official Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
