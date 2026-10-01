'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facilitationApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  FacilitationRequest,
  FacilitationCategory,
  FacilitationStatus,
} from '@/types/api';
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Send,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  X,
  History,
  Lock,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import Link from 'next/link';

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
  OPEN: { label: 'Unassigned · Awaiting Desk', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: AlertCircle },
  ASSIGNED: { label: 'Assigned to Officer', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', icon: UserCheck },
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

export default function GovernmentFacilitationQueuePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Coordination note state
  const [noteText, setNoteText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const detailPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId && detailPaneRef.current) {
      detailPaneRef.current.scrollTop = 0;
    }
  }, [selectedId]);

  // Resolution modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Custom desk state for claiming
  const [customDesk, setCustomDesk] = useState('MAITRI Single Window Coordination Desk');

  // Fetch Requests
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ['gov-facilitation-requests', statusFilter, categoryFilter, priorityFilter],
    queryFn: () =>
      facilitationApi.list({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
      }),
  });

  // Selected request details
  const { data: activeRequest } = useQuery({
    queryKey: ['facilitation-request', selectedId],
    queryFn: () => facilitationApi.get(selectedId!),
    enabled: !!selectedId,
  });

  // Claim Mutation
  const claimMutation = useMutation({
    mutationFn: () => facilitationApi.claim(selectedId!, customDesk),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilitation-request', selectedId] });
      qc.invalidateQueries({ queryKey: ['gov-facilitation-requests'] });
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: () => facilitationApi.addNote(selectedId!, noteText, isInternal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilitation-request', selectedId] });
      qc.invalidateQueries({ queryKey: ['gov-facilitation-requests'] });
      setNoteText('');
      setIsInternal(false);
    },
  });

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: () => facilitationApi.resolve(selectedId!, resolutionNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilitation-request', selectedId] });
      qc.invalidateQueries({ queryKey: ['gov-facilitation-requests'] });
      setIsResolveModalOpen(false);
      setResolutionNotes('');
    },
  });

  const selected = activeRequest || requests?.find((r) => r.id === selectedId);

  // Counts
  const totalCount = requests?.length || 0;
  const openCount = requests?.filter((r) => r.status === 'OPEN').length || 0;
  const inProgressCount = requests?.filter((r) => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length || 0;
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
              <h1 className="text-xl font-bold text-gray-900">MAITRI Nodal Agency · Investor Facilitation Queue</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Single Window Facilitation Desk
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active intake for investor queries, clearance roadblocks, documentation pre-screening, and inter-departmental statutory coordination.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Logged in as:</span>
            <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
              {user?.name || 'Sunita Rao (MAITRI Nodal Officer)'}
            </span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 font-medium">Total Inquiries</span>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-700 font-medium">Unassigned (Open)</span>
            <p className="text-lg font-bold text-amber-800 mt-0.5">{openCount}</p>
          </div>
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
            <span className="text-xs text-blue-700 font-medium">In Active Coordination</span>
            <p className="text-lg font-bold text-blue-800 mt-0.5">{inProgressCount}</p>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
            <span className="text-xs text-emerald-700 font-medium">Resolved & Closed</span>
            <p className="text-lg font-bold text-emerald-800 mt-0.5">{resolvedCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                statusFilter === st
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st === 'ALL' ? 'All Requests' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Dropdown filters */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 bg-white"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 bg-white"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List */}
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
              title="No facilitation requests in queue"
              description="No investor assistance requests match the selected filters."
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

                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-medium text-gray-700">
                    {req.applicant_name}
                  </span>
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {req.category}
                  </span>
                </div>

                {req.assigned_to_name && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-blue-700 font-medium">
                    <UserCheck className="w-3 h-3" />
                    <span>Assigned: {req.assigned_to_name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        {selectedId && selected ? (
          <div ref={detailPaneRef} className="hidden md:flex flex-1 flex-col overflow-y-auto bg-white p-6 sticky top-2 max-h-[calc(100vh-8rem)] self-start rounded-xl border border-gray-200 shadow-md">
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
                  Applicant:{' '}
                  <strong className="text-gray-800">{selected.applicant_name}</strong> ({selected.applicant_email}) · Registered{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && (
                  <button
                    onClick={() => setIsResolveModalOpen(true)}
                    className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve Request</span>
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

            {/* Desk and Claim Card */}
            <div className="my-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-gray-500 font-medium">Assigned Officer / Desk:</span>
                  <p className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    {selected.assigned_to_name
                      ? `${selected.assigned_to_name} (${selected.responsible_desk})`
                      : 'Unassigned · Open in General Nodal Intake'}
                  </p>
                </div>

                {!selected.assigned_to && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => claimMutation.mutate()}
                      disabled={claimMutation.isPending}
                      className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{claimMutation.isPending ? 'Claiming…' : 'Claim Request (Assign to Me)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Linked entity references */}
              {(selected.project_name || selected.application_number) && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {selected.project_id && (
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      Proposal: <strong>{selected.project_name}</strong>
                    </span>
                  )}
                  {selected.application_id && (
                    <Link
                      href={`/app/applications/${selected.application_id}`}
                      className="text-primary-700 hover:underline flex items-center gap-1 font-mono font-semibold"
                    >
                      <span>App #{selected.application_number}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Inquiry Content */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Inquiry / Problem Statement
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selected.description}
              </div>
            </div>

            {/* Resolution Banner */}
            {selected.resolution_notes && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Statutory Resolution Summary</span>
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
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Nodal Coordination Notes & Applicant Thread ({selected.notes?.length || 0})</span>
              </h4>

              <div className="space-y-3">
                {selected.notes?.length === 0 && (
                  <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-lg text-center">
                    No notes recorded yet. Add an internal coordination note or post guidance for the investor.
                  </p>
                )}

                {selected.notes?.map((n) => {
                  const isOfficer = n.author_role === 'NODAL' || n.author_role === 'OFFICER';
                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        n.is_internal
                          ? 'bg-amber-50/40 border-amber-200'
                          : isOfficer
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {n.is_internal ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Internal Desk Only
                            </span>
                          ) : isOfficer ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              MAITRI Nodal Response
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-bold">
                              Applicant
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

              {/* Note Composer */}
              <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50/60 p-3 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Record Coordination Note / Guidance:
                </label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record inter-departmental action, statutory advice, or liaison updates..."
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="flex items-center gap-1 font-medium">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Internal Desk Note (hidden from applicant)
                    </span>
                  </label>

                  <button
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!noteText.trim() || addNoteMutation.isPending}
                    className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{addNoteMutation.isPending ? 'Saving…' : 'Record Note'}</span>
                  </button>
                </div>
              </div>
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

      {/* Modal: Resolve Request */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Resolve Facilitation Request</h3>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-600">
                Provide a clear resolution summary for applicant <strong>{selected?.applicant_name}</strong> regarding reference{' '}
                <strong className="font-mono">{selected?.reference}</strong>.
              </p>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Resolution Summary & Statutory Advice <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Summarize the action taken, departmental liaison result, or statutory advice provided to resolve this inquiry..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-800">
                <strong>Notification:</strong> The applicant will be notified immediately upon resolution with this guidance summary.
              </div>
            </div>

            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => resolveMutation.mutate()}
                disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                className="btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700"
              >
                {resolveMutation.isPending ? 'Resolving…' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
