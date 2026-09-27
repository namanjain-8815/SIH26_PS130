'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facilitationApi, projectsApi, applicationsApi } from '@/lib/api';
import type {
  FacilitationRequest,
  FacilitationCategory,
  FacilitationStatus,
} from '@/types/api';
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Send,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  HelpCircle,
  FileText,
  UserCheck,
  X,
  History,
  AlertTriangle,
} from 'lucide-react';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';

const CATEGORIES: FacilitationCategory[] = [
  'Approval Guidance',
  'Documentation Help',
  'Application Processing Help',
  'Incentive / Scheme Guidance',
  'Compliance & Renewal Help',
  'General Facilitation',
];

const STATUS_CONFIG: Record<
  FacilitationStatus,
  { label: string; bg: string; text: string; icon: any }
> = {
  OPEN: { label: 'Open · Awaiting Desk', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: AlertCircle },
  ASSIGNED: { label: 'Assigned to Nodal Officer', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', icon: UserCheck },
  IN_PROGRESS: { label: 'Active Coordination', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', icon: Clock },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', bg: 'bg-gray-50 text-gray-600 border-gray-200', text: 'text-gray-600', icon: CheckCircle2 },
};

const PRIORITY_BADGES: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-800 font-semibold',
  URGENT: 'bg-red-100 text-red-800 font-bold animate-pulse',
};

export default function InvestorAssistancePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form states
  const [category, setCategory] = useState<FacilitationCategory>('Approval Guidance');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [applicationId, setApplicationId] = useState<string>('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [replyText, setReplyText] = useState('');

  // Fetch Requests
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ['facilitation-requests', statusFilter, categoryFilter],
    queryFn: () => facilitationApi.list({ status: statusFilter, category: categoryFilter }),
  });

  // Fetch Projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // Fetch Applications if project selected
  const { data: applications } = useQuery({
    queryKey: ['project-applications', projectId],
    queryFn: () => projectsApi.getApplications(projectId) as Promise<any[]>,
    enabled: !!projectId,
  });

  // Selected request details
  const { data: activeRequest, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['facilitation-request', selectedId],
    queryFn: () => facilitationApi.get(selectedId!),
    enabled: !!selectedId,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      facilitationApi.create({
        category,
        subject,
        description,
        project_id: projectId || undefined,
        application_id: applicationId || undefined,
        priority,
      }),
    onSuccess: (newReq) => {
      qc.invalidateQueries({ queryKey: ['facilitation-requests'] });
      setIsModalOpen(false);
      setSelectedId(newReq.id);
      // Reset form
      setSubject('');
      setDescription('');
      setProjectId('');
      setApplicationId('');
      setPriority('MEDIUM');
    },
  });

  // Add Reply Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: () => facilitationApi.addNote(selectedId!, replyText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilitation-request', selectedId] });
      qc.invalidateQueries({ queryKey: ['facilitation-requests'] });
      setReplyText('');
    },
  });

  // Close Request Mutation
  const closeMutation = useMutation({
    mutationFn: () => facilitationApi.close(selectedId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilitation-request', selectedId] });
      qc.invalidateQueries({ queryKey: ['facilitation-requests'] });
    },
  });

  const selected = activeRequest || requests?.find((r) => r.id === selectedId);

  // Quick stats
  const totalCount = requests?.length || 0;
  const activeCount = requests?.filter((r) => r.status === 'OPEN' || r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length || 0;
  const resolvedCount = requests?.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length || 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <LifeBuoy className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-gray-900">Investor Assistance & Facilitation</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                MAITRI Single Window Nodal Cell
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dedicated statutory desk assistance for permissions roadmap, documentation pre-checks, query resolution, and inter-departmental facilitation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Facilitation Request</span>
            </button>
          </div>
        </div>

        {/* Top metric highlights */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
              {totalCount}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Inquiries</p>
              <p className="text-xs font-semibold text-gray-900">Registered Requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
              {activeCount}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Under Action</p>
              <p className="text-xs font-semibold text-amber-700">Active Facilitation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
              {resolvedCount}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Completed</p>
              <p className="text-xs font-semibold text-emerald-700">Resolved Guidance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                statusFilter === st
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-md px-2.5 py-1 text-xs text-gray-700 bg-white"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Master - Detail Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List Pane */}
        <div
          className={`${
            selectedId ? 'w-full md:w-5/12 lg:w-4/12' : 'w-full'
          } border-r border-gray-200 overflow-y-auto p-4 space-y-3 transition-all`}
        >
          {isLoading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <CardSkeleton key={i} lines={3} />
              ))}
            </div>
          )}

          {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

          {!isLoading && requests?.length === 0 && (
            <EmptyState
              title="No facilitation requests found"
              description="Need guidance on statutory approvals, clearances, or documentation pre-checks? Submit a request to the MAITRI Single Window Nodal Officer."
              action={
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Raise First Request
                </button>
              }
            />
          )}

          {requests?.map((req) => {
            const isSelected = selectedId === req.id;
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.OPEN;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50/30 shadow-sm ring-1 ring-primary-500'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-800">
                      {req.reference}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${statusCfg.bg}`}
                    >
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusCfg.label}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      PRIORITY_BADGES[req.priority] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {req.priority}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-gray-900 line-clamp-1">{req.subject}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{req.description}</p>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {req.category}
                  </span>
                  <div className="flex items-center gap-2 text-gray-400">
                    {req.notes?.length > 0 && (
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <MessageSquare className="w-3 h-3" />
                        {req.notes.length}
                      </span>
                    )}
                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        {selectedId && selected ? (
          <div className="hidden md:flex flex-1 flex-col overflow-y-auto bg-white p-6">
            {/* Header info */}
            <div className="pb-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200">
                    {selected.reference}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
                      STATUS_CONFIG[selected.status]?.bg
                    }`}
                  >
                    {STATUS_CONFIG[selected.status]?.label}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      PRIORITY_BADGES[selected.priority]
                    }`}
                  >
                    {selected.priority} Priority
                  </span>
                </div>
                <h2 className="text-base font-bold text-gray-900">{selected.subject}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Category: <span className="font-medium text-gray-700">{selected.category}</span> · Raised on{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selected.status !== 'CLOSED' && (
                  <button
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending}
                    className="btn-secondary text-xs py-1.5 px-3"
                    title="Mark facilitation request as closed"
                  >
                    Close Request
                  </button>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Context desk & Assignment card */}
            <div className="grid grid-cols-2 gap-3 my-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Concerned Nodal Desk:</span>
                <p className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {selected.responsible_desk || 'MAITRI Single Window Nodal Cell'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Facilitation Officer:</span>
                <p className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  {selected.assigned_to_name
                    ? `${selected.assigned_to_name} (MAITRI Nodal Officer)`
                    : 'Pending Assignment to Nodal Desk'}
                </p>
              </div>
              {selected.project_name && (
                <div className="col-span-2 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <span className="text-gray-500">
                    Linked Proposal:{' '}
                    <strong className="text-gray-800">{selected.project_name}</strong>
                  </span>
                  {selected.application_number && (
                    <span className="text-gray-500">
                      Application Ref:{' '}
                      <strong className="text-primary-700 font-mono">
                        {selected.application_number}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Inquirer Description */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Inquiry / Problem Statement
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selected.description}
              </div>
            </div>

            {/* Resolution Banner if resolved */}
            {selected.resolution_notes && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>MAITRI Nodal Officer Resolution Summary</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap">
                  {selected.resolution_notes}
                </p>
                {selected.resolved_at && (
                  <p className="text-[11px] text-emerald-700/80 mt-2 font-medium">
                    Resolved at: {new Date(selected.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Coordination Notes & Communication Thread */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Coordination Messages & Guidance ({selected.notes?.length || 0})</span>
                </h4>
              </div>

              <div className="space-y-3">
                {selected.notes?.length === 0 && (
                  <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-lg text-center">
                    No coordination notes recorded yet. The assigned Nodal Officer will post guidance updates here.
                  </p>
                )}

                {selected.notes?.map((n) => {
                  const isNodal = n.author_role === 'NODAL' || n.author_role === 'OFFICER';
                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        isNodal
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {isNodal && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              MAITRI Nodal Desk
                            </span>
                          )}
                          {n.author_name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply composer */}
              {selected.status !== 'CLOSED' && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Post Reply or Provide Clarification:
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the MAITRI Nodal Officer..."
                      className="flex-1 text-xs border border-gray-200 rounded-lg p-2.5 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    />
                    <button
                      onClick={() => addNoteMutation.mutate()}
                      disabled={!replyText.trim() || addNoteMutation.isPending}
                      className="btn-primary text-xs px-3.5 self-end flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{addNoteMutation.isPending ? 'Sending…' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Stream */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Facilitation Audit Trail</span>
              </h4>
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-4 py-1">
                {selected.timeline?.map((item, idx) => (
                  <div key={idx} className="ml-4 relative">
                    <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-gray-900">
                        {item.event.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {item.notes && <p className="text-xs text-gray-600 mt-0.5">{item.notes}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">By {item.actor_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal: New Facilitation Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Raise Investor Facilitation Request</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Assistance Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FacilitationCategory)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Select the domain where you need specialized facilitation or statutory guidance.
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Urgency / Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                        priority === p
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Picker (Optional) */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Linked Investment Proposal (Optional)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setApplicationId('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                >
                  <option value="">-- No specific proposal / General Inquiry --</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sector} · {p.district})
                    </option>
                  ))}
                </select>
              </div>

              {/* Application Picker (Optional) */}
              {projectId && applications && applications.length > 0 && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Specific Application Workspace (Optional)
                  </label>
                  <select
                    value={applicationId}
                    onChange={(e) => setApplicationId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white font-mono"
                  >
                    <option value="">-- Entire Project / All Clearances --</option>
                    {applications.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.application_number} · {a.department?.name || 'Authority'} ({a.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Subject / Summary <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Guidance on water connection pipeline permissions for Chakan Phase II"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Detailed Query / Required Assistance <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue, specific department query, or document requirements where you need single window assistance..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800">
                <strong>Statutory Note:</strong> Facilitation requests are routed directly to the MAITRI Single Window Nodal Officer queue for expedited coordination with competent authorities.
              </div>
            </div>

            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!subject.trim() || !description.trim() || createMutation.isPending}
                className="btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700"
              >
                {createMutation.isPending ? 'Submitting…' : 'Submit Facilitation Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
