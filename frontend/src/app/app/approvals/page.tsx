'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, projectApprovalsApi, applicationsApi } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import {
  ChevronRight,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import type { ProjectApproval as BaseProjectApproval } from '@/types';

type ProjectApproval = BaseProjectApproval & { priority?: string };
import type { ProjectApprovalDetail } from '@/types/api';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

type StatusFilter = 'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: approvals, isLoading, error, refetch } = useQuery({
    queryKey: ['project-approvals', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getApprovals(DEMO_PROJECT_ID),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['project-approval-detail', selectedId],
    queryFn: () => projectApprovalsApi.get(selectedId!),
    enabled: !!selectedId,
  });

  const runAnalysis = useMutation({
    mutationFn: () => projectsApi.runRegulatoryAnalysis(DEMO_PROJECT_ID),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-approvals'] }),
  });

  const filtered = approvals?.filter((a) => filter === 'ALL' || a.status === filter) ?? [];

  const counts = {
    ALL: approvals?.length ?? 0,
    NOT_STARTED: approvals?.filter((a) => a.status === 'NOT_STARTED').length ?? 0,
    IN_PROGRESS: approvals?.filter((a) => a.status === 'IN_PROGRESS').length ?? 0,
    BLOCKED: approvals?.filter((a) => a.status === 'BLOCKED').length ?? 0,
    COMPLETED: approvals?.filter((a) => a.status === 'COMPLETED').length ?? 0,
  };

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className={`flex flex-col ${selectedId ? 'w-[420px]' : 'flex-1'} border-r border-gray-100 h-full overflow-hidden`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Approvals & Licences</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => runAnalysis.mutate()}
                disabled={runAnalysis.isPending}
                className="btn-secondary text-xs py-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runAnalysis.isPending ? 'animate-spin' : ''}`} />
                {runAnalysis.isPending ? 'Analysing…' : 'Re-analyse'}
              </button>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.replace('_', ' ')} ({counts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* Approval list */}
        <div className="flex-1 overflow-y-auto">
          {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
          {isLoading && (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <CardSkeleton key={i} lines={2} />)}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <EmptyState
              title="No approvals"
              description="Run regulatory analysis to identify applicable approvals for this project."
              action={
                <button onClick={() => runAnalysis.mutate()} className="btn-primary text-xs py-1.5">
                  <Play className="w-3.5 h-3.5" /> Run Analysis
                </button>
              }
            />
          )}
          {filtered.map((a) => (
            <ApprovalRow
              key={a.id}
              approval={a}
              selected={selectedId === a.id}
              onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <div className="flex-1 overflow-y-auto p-5 animate-fade-in">
          {detailLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <CardSkeleton key={i} lines={3} />)}
            </div>
          ) : detail ? (
            <ApprovalDetail detail={detail} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ApprovalRow({ approval, selected, onClick }: { approval: ProjectApproval; selected: boolean; onClick: () => void }) {
  const statusIcon = {
    COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    IN_PROGRESS: <Clock className="w-4 h-4 text-amber-500" />,
    BLOCKED: <AlertCircle className="w-4 h-4 text-red-500" />,
    NOT_STARTED: <Circle className="w-4 h-4 text-gray-400" />,
  }[approval.status] ?? <Circle className="w-4 h-4 text-gray-400" />;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        selected ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{approval.approval_type?.name ?? 'Approval'}</p>
            <StatusBadge status={approval.status} size="sm" />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{approval.approval_type?.authority}</p>
          {approval.blocked_reason && (
            <p className="text-xs text-red-600 mt-1 truncate">⚠ {approval.blocked_reason}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <PriorityBadge priority={(approval as ProjectApproval & { priority?: string }).priority ?? 'MEDIUM'} />
            {approval.due_date && (
              <span className="text-xs text-gray-400">Due {formatDate(approval.due_date)}</span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0 ${selected ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );
}

function ApprovalDetail({ detail }: { detail: ProjectApprovalDetail }) {
  const router = useRouter();
  const qc = useQueryClient();

  const startApp = useMutation({
    mutationFn: (projectApprovalId: string) => applicationsApi.create(projectApprovalId),
    onSuccess: (newApp) => {
      qc.invalidateQueries({ queryKey: ['project-approvals'] });
      qc.invalidateQueries({ queryKey: ['project-approval-detail', detail.id] });
      router.push(`/app/applications/${newApp.id}`);
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">{detail.approval_type.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{detail.authority}</p>
          </div>
          <StatusBadge status={detail.status} />
        </div>
        <p className="text-xs text-gray-600 mt-3 leading-relaxed">{detail.approval_type.description}</p>

        {/* Why required */}
        <div className="mt-3 p-3 bg-amber-50 rounded-lg">
          <p className="text-xs font-medium text-amber-700">Why required for your project:</p>
          <p className="text-xs text-amber-600 mt-1">{detail.applicability_reason}</p>
        </div>
      </div>

      {/* Next action */}
      <div className="card p-4 bg-primary-600 text-white">
        <p className="text-xs text-primary-100 font-medium uppercase tracking-wide mb-1">Recommended Next Action</p>
        <p className="text-sm">{detail.next_action}</p>
      </div>

      {/* Application Workspace */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Application Workspace</p>
          {detail.application ? (
            <StatusBadge status={detail.application.status} />
          ) : (
            <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">Not Started</span>
          )}
        </div>

        {detail.application ? (
          <div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <p className="text-gray-400">App Number</p>
                <p className="font-mono font-medium text-gray-800">{detail.application.application_number}</p>
              </div>
              <div>
                <p className="text-gray-400">Department</p>
                <p className="font-medium text-gray-800">{detail.application.department?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-400">Submitted</p>
                <p className="font-medium text-gray-800">{formatDate(detail.application.submitted_at)}</p>
              </div>
              <div>
                <p className="text-gray-400">Open Queries</p>
                <p className={`font-medium ${detail.application.open_queries > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                  {detail.application.open_queries}
                </p>
              </div>
            </div>
            <Link
              href={`/app/applications/${detail.application.id}`}
              className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
            >
              Open Application Workspace <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Open a dedicated workspace to assemble required documentation, pre-validate readiness, submit to the department, and track status.
            </p>
            <button
              onClick={() => startApp.mutate(detail.id)}
              disabled={startApp.isPending}
              className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {startApp.isPending ? 'Initiating Workspace...' : 'Start Application Workspace'}
            </button>
          </div>
        )}
      </div>

      {/* SLA */}
      {detail.sla && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">Configured Service Timeline</p>
            {detail.sla.instance_status && <StatusBadge status={detail.sla.instance_status} />}
          </div>
          <p className="text-xs text-gray-500 mb-2">{detail.sla.label}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400">Duration</p>
              <p className="font-medium text-gray-800">{detail.sla.configured_duration_days} days</p>
            </div>
            <div>
              <p className="text-gray-400">Starts from</p>
              <p className="font-medium text-gray-800">{detail.sla.start_event?.replace(/_/g, ' ')}</p>
            </div>
            {detail.sla.due_date && (
              <div>
                <p className="text-gray-400">Configured due</p>
                <p className="font-medium text-gray-800">{formatDate(detail.sla.due_date)}</p>
              </div>
            )}
            {detail.sla.time_remaining && (
              <div>
                <p className="text-gray-400">Remaining</p>
                <p className="font-medium text-gray-800">{detail.sla.time_remaining}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Required documents */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">Required Documents ({detail.required_documents.length})</p>
        <div className="space-y-2">
          {detail.required_documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700 flex-1">{doc.document_type}</span>
              {doc.mandatory && (
                <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prerequisites */}
      {detail.prerequisites.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Prerequisites ({detail.prerequisites.length})</p>
          <div className="space-y-2">
            {detail.prerequisites.map((p) => (
              <div key={p.approval_type_id} className="flex items-center gap-2">
                {p.status === 'COMPLETED'
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                <span className={`text-xs flex-1 ${p.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {p.name}
                </span>
                <StatusBadge status={p.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downstream */}
      {detail.downstream.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">Unlocks ({detail.downstream.length})</p>
          <p className="text-xs text-gray-400 mb-3">Completing this approval unlocks the following:</p>
          <div className="space-y-1.5">
            {detail.downstream.map((d) => (
              <div key={d.approval_type_id} className="flex items-center gap-2 text-xs text-gray-600">
                <ChevronRight className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
