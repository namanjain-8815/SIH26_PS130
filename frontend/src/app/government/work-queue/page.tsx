'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governmentApi, applicationsApi, queriesApi, inspectionsApi, documentsApi } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { formatRole } from '@/lib/terminology';
import { useState } from 'react';
import type { WorkQueueItem } from '@/types/api';
import {
  Clock,
  AlertCircle,
  Filter,
  CheckCircle2,
  XCircle,
  Send,
  Calendar,
  FileQuestion,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Building2,
  MapPin,
  User,
  Plus,
  ArrowUpRight,
  Lock,
} from 'lucide-react';

const STATUS_OPTIONS = ['', 'SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'INSPECTION_SCHEDULED', 'AWAITING_APPLICANT'];
const PRIORITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function WorkQueuePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selected, setSelected] = useState<WorkQueueItem | null>(null);

  // Modals state
  const [showRaiseQueryModal, setShowRaiseQueryModal] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryDescription, setQueryDescription] = useState('');
  const [queryPriority, setQueryPriority] = useState('HIGH');
  const [queryDeadline, setQueryDeadline] = useState('');

  const [showScheduleInspectionModal, setShowScheduleInspectionModal] = useState(false);
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionLocation, setInspectionLocation] = useState('');
  const [inspectionPurpose, setInspectionPurpose] = useState('');

  // Decision Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalRef, setApprovalRef] = useState('');
  const [approvalConditions, setApprovalConditions] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Nodal Facilitation & Escalation Modals
  const [showNodalCoordinationModal, setShowNodalCoordinationModal] = useState(false);
  const [coordinationNote, setCoordinationNote] = useState('');

  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  // Query departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => governmentApi.departments(),
  });

  // Competent Authority Officer is bound to their department; NODAL and ADMIN can view cross-department
  const effectiveDeptId =
    user?.role === 'OFFICER' ? (user.department?.id || undefined) : (departmentFilter || undefined);

  // Fetch work queue list
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['work-queue', { status, priority, department_id: effectiveDeptId }],
    queryFn: () =>
      governmentApi.workQueue({
        status: status || undefined,
        priority: priority || undefined,
        department_id: effectiveDeptId,
      }),
  });

  // Fetch full details of selected application (documents, queries, timeline)
  const { data: selectedAppDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['application-detail', selected?.id],
    queryFn: () => applicationsApi.get(selected!.id),
    enabled: !!selected?.id,
  });

  // Status transition mutation
  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus, notes }: { id: string; newStatus: string; notes?: string }) =>
      applicationsApi.updateStatus(id, newStatus, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
      setShowApproveModal(false);
      setShowRejectModal(false);
      setApprovalRef('');
      setApprovalConditions('');
      setRejectionReason('');
    },
  });

  // Raise query mutation
  const raiseQueryMutation = useMutation({
    mutationFn: (body: { subject: string; description: string; priority: string; deadline?: string }) =>
      queriesApi.raise(selected!.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
      setShowRaiseQueryModal(false);
      setQuerySubject('');
      setQueryDescription('');
      setQueryDeadline('');
    },
  });

  // Resolve query mutation
  const resolveQueryMutation = useMutation({
    mutationFn: (queryId: string) => queriesApi.updateStatus(queryId, 'RESOLVED'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
    },
  });

  // Escalate query mutation
  const escalateQueryMutation = useMutation({
    mutationFn: (queryId: string) => queriesApi.escalate(queryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
    },
  });

  // Record coordination note mutation
  const recordCoordinationMutation = useMutation({
    mutationFn: (body: { note: string; event_type?: string }) =>
      applicationsApi.recordCoordinationNote(selected!.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
      setShowNodalCoordinationModal(false);
      setShowEscalationModal(false);
      setCoordinationNote('');
      setEscalationReason('');
    },
  });

  // Schedule inspection mutation
  const scheduleInspectionMutation = useMutation({
    mutationFn: (body: { scheduled_date: string; location: string; purpose: string }) =>
      inspectionsApi.schedule({
        application_id: selected!.id,
        department_id: selectedAppDetail?.department_id,
        scheduled_date: new Date(body.scheduled_date),
        location: body.location,
        purpose: body.purpose,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
      setShowScheduleInspectionModal(false);
      setInspectionDate('');
      setInspectionLocation('');
      setInspectionPurpose('');
    },
  });

  // Verify / Reject document mutation
  const verifyDocMutation = useMutation({
    mutationFn: ({ docId, status }: { docId: string; status: 'VERIFIED' | 'REJECTED' }) =>
      documentsApi.update(docId, { verification_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', selected?.id] });
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const items = data ?? [];

  // Authority role checks
  const isOfficer = user?.role === 'OFFICER';
  const isNodal = user?.role === 'NODAL';
  const isAdmin = user?.role === 'ADMIN';
  const isInspector = user?.role === 'INSPECTOR';

  const isOwnDepartment =
    isAdmin ||
    !isOfficer ||
    !user?.department?.id ||
    !selected?.department_id ||
    user.department.id === selected.department_id;

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className={`flex flex-col ${selected ? 'w-[52%]' : 'flex-1'} border-r border-gray-100`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Competent Authority Work Queue</h1>
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                PROTOTYPE
              </span>
            </div>
            <span className="text-sm text-gray-500">{items.length} applications</span>
          </div>

          {/* Department Context & Scope Badge */}
          {user?.role === 'OFFICER' && user?.department?.name ? (
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Concerned Authority: {user.department.name}</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-200/60 text-blue-800 px-1.5 py-0.2 rounded font-bold ml-1">
                  <Lock className="w-2.5 h-2.5" /> Jurisdiction Scoped
                </span>
              </div>
            </div>
          ) : user?.role === 'NODAL' ? (
            <p className="text-xs text-purple-700 font-medium mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              MAITRI Single Window Nodal Oversight · Cross-Department Monitoring
            </p>
          ) : null}

          {/* Filters */}
          <div className="flex items-center flex-wrap gap-2">
            <Filter className="w-4 h-4 text-gray-400" />

            {/* Department dropdown for NODAL / ADMIN */}
            {(user?.role === 'NODAL' || user?.role === 'ADMIN') && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="input-base py-1.5 w-auto text-xs font-medium border-purple-200 text-purple-900 bg-purple-50/50"
              >
                <option value="">All Concerned Authorities ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-base py-1.5 w-auto text-xs"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input-base py-1.5 w-auto text-xs"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
          {!isLoading && items.length === 0 && (
            <EmptyState
              title="Competent Authority work queue is empty"
              description="No applications match the current jurisdiction and filters."
            />
          )}
          <table className="w-full">
            {items.length > 0 && (
              <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                <tr>
                  {['Application Ref', 'Permission / Authority', 'Applicant Entity', 'Status', 'Specified Time Limit', 'Queries'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-50">
              {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    selected?.id === item.id ? 'bg-blue-50/70 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-medium text-gray-900">{item.application_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.district}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-900 max-w-[150px] truncate">{item.approval_name}</p>
                    <p className="text-[11px] text-blue-800 font-medium max-w-[150px] truncate">
                      {item.department_name}
                    </p>
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700 max-w-[120px] truncate">{item.org_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    {item.sla_status ? (
                      <StatusBadge status={item.sla_status} size="sm" />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {item.sla_due_date && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(item.sla_due_date)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.open_queries > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full font-bold">
                        <AlertCircle className="w-3 h-3" /> {item.open_queries}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action panel */}
      {selected && (
        <div className="flex-1 p-5 overflow-y-auto animate-fade-in bg-gray-50/30">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selected.approval_name}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selected.application_number}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Metadata */}
            <div className="card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Applicant Entity', value: selected.org_name },
                  { label: 'Project / Investment Proposal', value: selected.project_name },
                  { label: 'District / Jurisdiction', value: selected.district },
                  { label: 'Concerned Department / Authority', value: selected.department_name },
                  { label: 'Priority', value: <PriorityBadge priority={selected.priority} /> },
                  { label: 'Scrutiny Status', value: <StatusBadge status={selected.status} /> },
                  { label: 'Submitted Date', value: formatDate(selected.submitted_at) },
                  {
                    label: 'Specified Time Limit Status',
                    value: selected.sla_status ? <StatusBadge status={selected.sla_status} /> : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-400 mb-0.5">{label}</p>
                    <div className="text-gray-800 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jurisdiction Warning for Cross-Department Officer */}
            {isOfficer && !isOwnDepartment && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cross-Department Scrutiny Scope</p>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    This application is under the statutory jurisdiction of{' '}
                    <span className="font-semibold">{selected.department_name}</span>. You have read-only scrutiny
                    access. Formal approval or rejection decisions must be recorded by the Concerned Competent Authority.
                  </p>
                </div>
              </div>
            )}

            {/* Primary Action Controls based on Role */}
            {isNodal ? (
              /* MAITRI Nodal Officer Panel */
              <div className="card p-4 space-y-3 border-purple-200 bg-purple-50/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-purple-950">MAITRI Nodal Agency — Coordination & Oversight</p>
                    <p className="text-[11px] text-purple-700">Inter-departmental facilitation and bottleneck resolution</p>
                  </div>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                    Nodal Role
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-purple-100 text-[11px] text-gray-600 leading-relaxed">
                  <span className="font-semibold text-purple-900">Single Window Mandate: </span>
                  MAITRI facilitates inter-departmental processing and investor assistance. Statutory approval decisions
                  are legally reserved for the Concerned Department (
                  <span className="font-semibold text-gray-800">{selected.department_name}</span>).
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowNodalCoordinationModal(true)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 transition-all text-left flex items-center justify-between"
                  >
                    <span>Coordination Note</span>
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setQuerySubject(`[MAITRI Facilitation] Clarification regarding ${selected.approval_name}`);
                      setShowRaiseQueryModal(true);
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 transition-all text-left flex items-center justify-between"
                  >
                    <span>Facilitate Query</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setShowEscalationModal(true)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 transition-all text-left flex items-center justify-between"
                  >
                    <span>Escalate to Committee</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setInspectionLocation(`${selected.project_name}, ${selected.district}`);
                      setShowScheduleInspectionModal(true);
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 transition-all text-left flex items-center justify-between"
                  >
                    <span>Coordinate Inspection</span>
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Approval & Rejection Decisions:</span>
                  <span className="font-semibold text-gray-500 italic">
                    Restricted to {selected.department_name}
                  </span>
                </div>
              </div>
            ) : (
              /* Competent Authority Officer / Admin Panel */
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Application Scrutiny & Decisions</p>
                    <p className="text-[11px] text-gray-500">Concerned Authority: {selected.department_name}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">Competent Authority</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={selected.status === 'UNDER_REVIEW' || updateStatus.isPending || !isOwnDepartment}
                    onClick={() => updateStatus.mutate({ id: selected.id, newStatus: 'UNDER_REVIEW' })}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 disabled:opacity-40 transition-all text-left"
                  >
                    Start / Resume Scrutiny
                  </button>
                  <button
                    disabled={!isOwnDepartment}
                    onClick={() => setShowRaiseQueryModal(true)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 disabled:opacity-40 transition-all text-left flex items-center justify-between"
                  >
                    <span>Raise Query / Seek Info</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={!isOwnDepartment}
                    onClick={() => {
                      setInspectionLocation(`${selected.project_name}, ${selected.district}`);
                      setShowScheduleInspectionModal(true);
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-all text-left flex items-center justify-between"
                  >
                    <span>Schedule Site Inspection</span>
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={selected.status === 'APPROVED' || updateStatus.isPending || !isOwnDepartment}
                    onClick={() => setShowApproveModal(true)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-green-50 text-green-800 border-green-200 hover:bg-green-100 disabled:opacity-40 transition-all text-left"
                  >
                    Approve Permission
                  </button>
                  <button
                    disabled={selected.status === 'REJECTED' || updateStatus.isPending || !isOwnDepartment}
                    onClick={() => setShowRejectModal(true)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-red-50 text-red-800 border-red-200 hover:bg-red-100 disabled:opacity-40 transition-all text-left"
                  >
                    Reject Application (Record Decision)
                  </button>
                  <button
                    disabled={selected.status === 'AWAITING_APPLICANT' || updateStatus.isPending || !isOwnDepartment}
                    onClick={() => updateStatus.mutate({ id: selected.id, newStatus: 'AWAITING_APPLICANT' })}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-all text-left"
                  >
                    Seek Additional Information
                  </button>
                </div>
              </div>
            )}

            {/* Document Verification Section */}
            {selectedAppDetail && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Attached Documents ({selectedAppDetail.application_documents?.length ?? 0})
                  </h3>
                  <span className="text-[11px] text-gray-400">Review & verify files</span>
                </div>

                {selectedAppDetail.application_documents?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No documents attached yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAppDetail.application_documents?.map((ad) => {
                      const doc = ad.document;
                      return (
                        <div
                          key={ad.id}
                          className="p-3 bg-white rounded-lg border border-gray-100 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{doc.document_type}</p>
                            <p className="text-[11px] text-gray-400 font-mono truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge status={doc.verification_status} size="sm" />
                              {doc.expiry_date && (
                                <span className="text-[10px] text-gray-400">Exp: {formatDate(doc.expiry_date)}</span>
                              )}
                            </div>
                          </div>

                          {isOwnDepartment && (
                            <div className="flex items-center gap-1.5">
                              {doc.verification_status !== 'VERIFIED' && (
                                <button
                                  onClick={() => verifyDocMutation.mutate({ docId: doc.id, status: 'VERIFIED' })}
                                  disabled={verifyDocMutation.isPending}
                                  className="px-2 py-1 text-[11px] font-bold rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                >
                                  ✓ Verify
                                </button>
                              )}
                              {doc.verification_status !== 'REJECTED' && (
                                <button
                                  onClick={() => verifyDocMutation.mutate({ docId: doc.id, status: 'REJECTED' })}
                                  disabled={verifyDocMutation.isPending}
                                  className="px-2 py-1 text-[11px] font-bold rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                >
                                  ✕ Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Queries & Responses Lifecycle Section */}
            {selectedAppDetail && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Clarification Queries ({selectedAppDetail.queries?.length ?? 0})
                  </h3>
                  <button
                    onClick={() => setShowRaiseQueryModal(true)}
                    className="text-primary-600 text-xs font-semibold hover:underline"
                  >
                    + Raise New
                  </button>
                </div>

                {selectedAppDetail.queries?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No queries have been raised on this application.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedAppDetail.queries?.map((q) => (
                      <div key={q.id} className="p-3 bg-white rounded-lg border border-gray-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{q.subject}</span>
                          <StatusBadge status={q.status} size="sm" />
                        </div>
                        <p className="text-gray-600 leading-relaxed bg-gray-50/50 p-2 rounded">{q.description}</p>

                        {/* Responses */}
                        {q.responses && q.responses.length > 0 && (
                          <div className="space-y-1.5 pl-2 border-l-2 border-blue-200 mt-2">
                            <span className="text-[10px] uppercase font-bold text-blue-800">
                              Applicant Response ({q.responses.length}):
                            </span>
                            {q.responses.map((r) => (
                              <p key={r.id} className="text-gray-800 bg-blue-50/40 p-2 rounded leading-relaxed">
                                {r.response_text}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Close & Escalate Query Controls */}
                        {q.status !== 'RESOLVED' && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            {q.status !== 'ESCALATED' && (
                              <button
                                onClick={() => escalateQueryMutation.mutate(q.id)}
                                disabled={escalateQueryMutation.isPending}
                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px] hover:bg-rose-100"
                              >
                                Escalate to Committee
                              </button>
                            )}
                            <button
                              onClick={() => resolveQueryMutation.mutate(q.id)}
                              disabled={resolveQueryMutation.isPending}
                              className="px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-200 font-semibold text-[11px] hover:bg-green-100"
                            >
                              Resolve & Close Query
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Record Competent Authority Decision — Grant Permission */}
      {showApproveModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Record Competent Authority Decision</h3>
                <p className="text-xs text-green-700 font-semibold">Grant Statutory Permission / Approval</p>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>

            <div className="p-3 bg-green-50/60 border border-green-200 rounded-lg text-xs space-y-1 text-green-950">
              <p>
                <span className="font-semibold">Concerned Authority:</span> {selected.department_name}
              </p>
              <p>
                <span className="font-semibold">Permission:</span> {selected.approval_name}
              </p>
              <p>
                <span className="font-semibold">Applicant Entity:</span> {selected.org_name}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Clearance / Order Reference Number</label>
                <input
                  type="text"
                  value={approvalRef}
                  onChange={(e) => setApprovalRef(e.target.value)}
                  placeholder="e.g. MPCB/RO-PUNE/CTE/2026/089"
                  className="input-base text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Conditions of Approval & Statutory Reasons</label>
                <textarea
                  rows={3}
                  value={approvalConditions}
                  onChange={(e) => setApprovalConditions(e.target.value)}
                  placeholder="Specify statutory conditions, validity period, and compliance milestones..."
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowApproveModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  const notes = `Approval Order: ${approvalRef || 'STANDARD'}. Conditions: ${approvalConditions || 'Granted per standard statutory provisions.'}`;
                  updateStatus.mutate({ id: selected.id, newStatus: 'APPROVED', notes });
                }}
                disabled={updateStatus.isPending}
                className="btn-primary text-xs py-1.5 bg-green-700 hover:bg-green-800"
              >
                {updateStatus.isPending ? 'Recording Decision...' : 'Confirm & Grant Permission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Competent Authority Decision — Rejection */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Record Competent Authority Decision</h3>
                <p className="text-xs text-red-700 font-semibold">Refusal / Rejection of Permission</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>

            <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg text-xs space-y-1 text-red-950">
              <p>
                <span className="font-semibold">Concerned Authority:</span> {selected.department_name}
              </p>
              <p>
                <span className="font-semibold">Permission:</span> {selected.approval_name}
              </p>
              <p>
                <span className="font-semibold">Applicant Entity:</span> {selected.org_name}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Statutory Grounds & Reasons for Rejection *</label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Mandatory: Record the statutory grounds, non-compliances, or regulatory violations resulting in refusal..."
                  className="input-base text-xs mt-1"
                />
              </div>
              <p className="text-[11px] text-gray-500 italic">
                Under the Maharashtra Single Window Act & Rules, grounds for refusal must be explicitly recorded and
                will be communicated to the applicant entity.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectionReason.trim()) {
                    updateStatus.mutate({ id: selected.id, newStatus: 'REJECTED', notes: rejectionReason });
                  }
                }}
                disabled={!rejectionReason.trim() || updateStatus.isPending}
                className="btn-primary text-xs py-1.5 bg-red-700 hover:bg-red-800"
              >
                {updateStatus.isPending ? 'Recording Decision...' : 'Confirm & Record Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MAITRI Nodal Coordination Note */}
      {showNodalCoordinationModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Inter-Department Coordination Note</h3>
                <p className="text-xs text-purple-700">MAITRI Nodal Single Window Agency</p>
              </div>
              <button
                onClick={() => setShowNodalCoordinationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Record a coordination note between MAITRI and {selected.department_name} to expedite application
              scrutiny.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Facilitation / Coordination Summary</label>
                <textarea
                  rows={4}
                  value={coordinationNote}
                  onChange={(e) => setCoordinationNote(e.target.value)}
                  placeholder="e.g. Discussed with MPCB Sub-Regional Officer Pune; applicant advised on pending acoustic enclosure drawing..."
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowNodalCoordinationModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (coordinationNote.trim()) {
                    recordCoordinationMutation.mutate({
                      note: coordinationNote,
                      event_type: 'nodal_coordination_note',
                    });
                  }
                }}
                disabled={!coordinationNote.trim() || recordCoordinationMutation.isPending}
                className="btn-primary text-xs py-1.5 bg-purple-700 hover:bg-purple-800"
              >
                {recordCoordinationMutation.isPending ? 'Saving...' : 'Record Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Escalate to Empowered Committee */}
      {showEscalationModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Escalate to Empowered Committee</h3>
                <p className="text-xs text-rose-700">Statutory Delay & Escalation Protocol</p>
              </div>
              <button onClick={() => setShowEscalationModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Under the Maharashtra Single Window clearance framework, applications exceeding the Specified Time
              Limit or delayed due to unresolved inter-department queries may be escalated to the Empowered Committee.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Escalation Reason & Delay Justification *</label>
                <textarea
                  rows={4}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Detail the timeline breach, pending inter-department dependencies, or reason for Empowered Committee review..."
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowEscalationModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (escalationReason.trim()) {
                    recordCoordinationMutation.mutate({
                      note: escalationReason,
                      event_type: 'escalated_to_empowered_committee',
                    });
                  }
                }}
                disabled={!escalationReason.trim() || recordCoordinationMutation.isPending}
                className="btn-primary text-xs py-1.5 bg-rose-700 hover:bg-rose-800"
              >
                {recordCoordinationMutation.isPending ? 'Escalating...' : 'Confirm Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Raise Query */}
      {showRaiseQueryModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Raise Query / Seek Additional Information</h3>
              <button onClick={() => setShowRaiseQueryModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Raising a query pauses scrutiny, sends an official request for clarification to the applicant entity under
              MAITRI Rules, and records an official audit entry.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Query Subject</label>
                <input
                  type="text"
                  value={querySubject}
                  onChange={(e) => setQuerySubject(e.target.value)}
                  placeholder="e.g. Inadequate emergency exit door dimensions"
                  className="input-base text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Detailed Description / Instructions</label>
                <textarea
                  rows={3}
                  value={queryDescription}
                  onChange={(e) => setQueryDescription(e.target.value)}
                  placeholder="Specify what clarification or revised documentation is required per statutory regulations..."
                  className="input-base text-xs mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Priority</label>
                  <select
                    value={queryPriority}
                    onChange={(e) => setQueryPriority(e.target.value)}
                    className="input-base text-xs mt-1"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Response Deadline</label>
                  <input
                    type="date"
                    value={queryDeadline}
                    onChange={(e) => setQueryDeadline(e.target.value)}
                    className="input-base text-xs mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowRaiseQueryModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (querySubject && queryDescription) {
                    raiseQueryMutation.mutate({
                      subject: querySubject,
                      description: queryDescription,
                      priority: queryPriority,
                      deadline: queryDeadline || undefined,
                    });
                  }
                }}
                disabled={!querySubject || !queryDescription || raiseQueryMutation.isPending}
                className="btn-primary text-xs py-1.5 bg-orange-600 hover:bg-orange-700"
              >
                {raiseQueryMutation.isPending ? 'Submitting...' : 'Raise Query'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Inspection */}
      {showScheduleInspectionModal && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Schedule Department Site Inspection</h3>
              <button
                onClick={() => setShowScheduleInspectionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Schedule an on-site physical inspection. The applicant will be notified to ensure site access readiness.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="input-base text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Inspection Location</label>
                <input
                  type="text"
                  value={inspectionLocation}
                  onChange={(e) => setInspectionLocation(e.target.value)}
                  placeholder="e.g. Plot 42, Baramati MIDC, Pune"
                  className="input-base text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Inspection Purpose / Scope</label>
                <textarea
                  rows={2}
                  value={inspectionPurpose}
                  onChange={(e) => setInspectionPurpose(e.target.value)}
                  placeholder="e.g. Verification of effluent treatment plant baseline setup and fire suppression access"
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowScheduleInspectionModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (inspectionDate) {
                    scheduleInspectionMutation.mutate({
                      scheduled_date: inspectionDate,
                      location: inspectionLocation,
                      purpose: inspectionPurpose,
                    });
                  }
                }}
                disabled={!inspectionDate || scheduleInspectionMutation.isPending}
                className="btn-primary text-xs py-1.5 bg-blue-700 hover:bg-blue-800"
              >
                {scheduleInspectionMutation.isPending ? 'Scheduling...' : 'Schedule Inspection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
