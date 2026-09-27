'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  applicationsApi,
  queriesApi,
  documentsApi,
  inspectionsApi,
  projectsApi,
} from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import type {
  ApplicationDetail,
  DocumentItem,
  QueryItem,
  ReadinessCheckResult,
} from '@/types/api';
import {
  ArrowLeft,
  FileCheck2,
  FileQuestion,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  RefreshCw,
  Send,
  Building2,
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  FilePlus,
  HelpCircle,
} from 'lucide-react';

type Tab = 'overview' | 'documents' | 'readiness' | 'queries' | 'inspections' | 'timeline';

export default function ApplicationWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const applicationId = params.id as string;
  const initialTab = (searchParams.get('tab') as Tab) || 'overview';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Modals state
  const [showAttachVaultModal, setShowAttachVaultModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('');
  const [showReplaceModal, setShowReplaceModal] = useState<string | null>(null);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [rescheduleInspectionModal, setRescheduleInspectionModal] = useState<string | null>(null);
  const [confirmingReadinessId, setConfirmingReadinessId] = useState<string | null>(null);

  // Form states
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  // Fetch application detail
  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['application-detail', applicationId],
    queryFn: () => applicationsApi.get(applicationId),
    enabled: !!applicationId,
  });

  const projectId = application?.project_approval?.project_id || 'proj-abc-foods-001';

  // Fetch project vault documents for reuse modal
  const { data: vaultDocs } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => projectsApi.getDocuments(projectId),
    enabled: showAttachVaultModal,
  });

  // Readiness check query/mutation
  const readinessCheck = useMutation({
    mutationFn: () => applicationsApi.runReadinessCheck(applicationId),
  });

  // Status transition mutation
  const updateStatus = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      applicationsApi.updateStatus(applicationId, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['project-approvals'] });
      setShowSubmitConfirmModal(false);
    },
  });

  // Attach document mutation
  const attachDoc = useMutation({
    mutationFn: (docId: string) => applicationsApi.attachDocument(applicationId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      setShowAttachVaultModal(false);
    },
  });

  // Detach document mutation
  const detachDoc = useMutation({
    mutationFn: (docId: string) => applicationsApi.detachDocument(applicationId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    },
  });

  // Upload document mutation
  const uploadDoc = useMutation({
    mutationFn: async ({
      docType,
      file,
      expiry,
    }: {
      docType: string;
      file: File;
      expiry?: string;
    }) => {
      const base64 = await fileToBase64(file);
      return documentsApi.upload(projectId, {
        document_type: docType,
        file_name: file.name,
        file_base64: base64,
        expiry_date: expiry || undefined,
        application_id: applicationId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDocType('');
      setUploadExpiryDate('');
    },
  });

  // Replace document mutation
  const replaceDoc = useMutation({
    mutationFn: async ({
      docId,
      file,
      expiry,
    }: {
      docId: string;
      file: File;
      expiry?: string;
    }) => {
      const base64 = await fileToBase64(file);
      return documentsApi.replace(docId, {
        file_name: file.name,
        file_base64: base64,
        expiry_date: expiry || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      setShowReplaceModal(null);
      setUploadFile(null);
    },
  });

  // Query response mutation
  const submitQueryResponse = useMutation({
    mutationFn: ({ queryId, text }: { queryId: string; text: string }) =>
      queriesApi.respond(queryId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      setReplyText({});
    },
  });

  // Inspection action mutation
  const updateInspection = useMutation({
    mutationFn: ({
      inspId,
      action,
      scheduledDate,
      notes,
    }: {
      inspId: string;
      action?: 'confirm_readiness' | 'reschedule';
      scheduledDate?: string;
      notes?: string;
    }) =>
      inspectionsApi.update(inspId, {
        action,
        status: action === 'reschedule' ? 'RESCHEDULED' : undefined,
        scheduled_date: scheduledDate ? new Date(scheduledDate) : undefined,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      setRescheduleInspectionModal(null);
      setConfirmingReadinessId(null);
      setRescheduleDate('');
      setRescheduleReason('');
    },
  });

  // Finding acknowledge mutation
  const acknowledgeFinding = useMutation({
    mutationFn: ({ findingId }: { findingId: string }) =>
      inspectionsApi.updateFinding(findingId, { status: 'acknowledged' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={6} />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ErrorState
          message={(error as Error)?.message || 'Could not load application'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const app = application;
  const approval = app.project_approval;
  const approvalType = approval.approval_type;
  const project = approval.project;
  const attachedDocs = app.application_documents || [];
  const queries = app.queries || [];
  const inspections = app.inspections || [];
  const timelineEvents = app.events || [];
  const openQueriesCount = queries.filter((q) => q.status === 'OPEN').length;

  const isSubmittableState =
    app.status === 'IN_PREPARATION' ||
    app.status === 'NOT_STARTED' ||
    app.status === 'READY_TO_START' ||
    app.status === 'AWAITING_APPLICANT';

  return (
    <div className="min-h-full flex flex-col bg-gray-50/50">
      {/* Top Header / Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app/approvals')}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Back to Permissions & Approvals"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-500 font-semibold">{app.application_number}</span>
                <span className="text-gray-300">•</span>
                <StatusBadge status={app.status} size="sm" />
                {approval.approval_type?.category && (
                  <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                    {approval.approval_type.category}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-gray-900 mt-0.5">{approvalType.name}</h1>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('readiness');
                readinessCheck.mutate();
              }}
              className="btn-secondary text-xs py-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Check Readiness
            </button>

            {isSubmittableState && (
              <button
                onClick={() => setShowSubmitConfirmModal(true)}
                className="btn-primary text-xs py-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Application
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-5 border-b border-gray-100 -mb-4">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'documents', label: `Documents (${attachedDocs.length})`, icon: FileText },
            { id: 'readiness', label: 'Readiness Check', icon: ShieldCheck },
            {
              id: 'queries',
              label: `Queries (${queries.length})`,
              icon: FileQuestion,
              badge: openQueriesCount > 0 ? openQueriesCount : undefined,
            },
            { id: 'inspections', label: `Inspection (${inspections.length})`, icon: Calendar },
            { id: 'timeline', label: `Timeline (${timelineEvents.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-700 bg-primary-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Stepper Card */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Application Lifecycle Stage</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  {
                    step: 1,
                    title: 'Preparation',
                    desc: 'Upload documents & pre-validate',
                    active: app.status === 'IN_PREPARATION' || app.status === 'NOT_STARTED',
                    completed: app.status !== 'IN_PREPARATION' && app.status !== 'NOT_STARTED',
                  },
                  {
                    step: 2,
                    title: 'Submitted',
                    desc: app.submitted_at ? formatDate(app.submitted_at) : 'Awaiting submission',
                    active: app.status === 'SUBMITTED',
                    completed: ['UNDER_REVIEW', 'QUERY_RAISED', 'INSPECTION_SCHEDULED', 'APPROVED'].includes(app.status),
                  },
                  {
                    step: 3,
                    title: 'Under Review',
                    desc: app.department?.name || 'Department review',
                    active: app.status === 'UNDER_REVIEW',
                    completed: ['APPROVED'].includes(app.status),
                  },
                  {
                    step: 4,
                    title: 'Query / Inspection',
                    desc: openQueriesCount > 0 ? `${openQueriesCount} open query` : inspections.length > 0 ? 'Inspection scheduled' : 'If applicable',
                    active: app.status === 'QUERY_RAISED' || app.status === 'INSPECTION_SCHEDULED',
                    completed: app.status === 'APPROVED',
                  },
                  {
                    step: 5,
                    title: 'Approval Decision',
                    desc: app.status === 'APPROVED' ? 'Approved & Issued' : 'Final clearance',
                    active: app.status === 'APPROVED',
                    completed: app.status === 'APPROVED',
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`p-3 rounded-xl border transition-all ${
                      s.active
                        ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                        : s.completed
                        ? 'border-green-300 bg-green-50/30 text-green-950'
                        : 'border-gray-100 bg-white text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          s.active
                            ? 'bg-primary-600 text-white'
                            : s.completed
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {s.completed ? '✓' : s.step}
                      </span>
                      <p className={`text-xs font-bold ${s.active ? 'text-primary-900' : s.completed ? 'text-green-900' : 'text-gray-500'}`}>
                        {s.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Key Metadata */}
              <div className="card p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Application Metadata</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Department Authority:</span>
                    <span className="font-semibold text-gray-900">{app.department?.name || approvalType.authority}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Project Name:</span>
                    <span className="font-semibold text-gray-900">{project.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">District / Location:</span>
                    <span className="font-medium text-gray-800">{project.district}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Submitted Date:</span>
                    <span className="font-medium text-gray-800">{formatDate(app.submitted_at)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Target Due Date:</span>
                    <span className="font-medium text-gray-800">{formatDate(app.due_date)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: SLA & Timeline status */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configured SLA</h3>
                  {app.sla_instance && <StatusBadge status={app.sla_instance.status} size="sm" />}
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-gray-600 leading-relaxed">
                    Standard service timeline configured for this clearance type:
                  </p>
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 space-y-1">
                    <p className="text-sm font-bold text-blue-900">{approvalType.default_sla_days ?? 30} Calendar Days</p>
                    <p className="text-[11px] text-blue-700">
                      Calculated from formal submission verification under state regulatory framework.
                    </p>
                  </div>
                  {app.due_date && (
                    <p className="text-[11px] text-gray-500">
                      Target resolution date: <span className="font-semibold">{formatDate(app.due_date)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Card 3: Quick Action Gateway */}
              <div className="card p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Action Center</h3>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    {app.status === 'QUERY_RAISED'
                      ? 'Officer raised clarification queries. Please review and respond to avoid SLA delay.'
                      : app.status === 'INSPECTION_SCHEDULED'
                      ? 'A site inspection is scheduled. Confirm readiness or request adjustment.'
                      : isSubmittableState
                      ? 'Pre-validate your documents against platform readiness rules before submitting.'
                      : 'Application is undergoing administrative review.'}
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  {openQueriesCount > 0 ? (
                    <button
                      onClick={() => setActiveTab('queries')}
                      className="w-full btn-primary text-xs py-2 bg-orange-600 hover:bg-orange-700"
                    >
                      <FileQuestion className="w-3.5 h-3.5" />
                      Respond to Queries ({openQueriesCount})
                    </button>
                  ) : isSubmittableState ? (
                    <button
                      onClick={() => {
                        setActiveTab('readiness');
                        readinessCheck.mutate();
                      }}
                      className="w-full btn-primary text-xs py-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Run Readiness Check
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className="w-full btn-secondary text-xs py-2"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      View Application History
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Application Documents</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Attached documents are pre-screened and reused from your organization vault.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAttachVaultModal(true)}
                  className="btn-secondary text-xs py-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5 text-primary-600" />
                  Attach from Vault
                </button>
                <button
                  onClick={() => {
                    setUploadDocType('');
                    setShowUploadModal(true);
                  }}
                  className="btn-primary text-xs py-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </button>
              </div>
            </div>

            {/* Document Requirements Checklist vs Attached */}
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Mandatory & Optional Checklist for {approvalType.name}
              </h3>
              <div className="space-y-2">
                {approvalType.document_requirements?.map((req) => {
                  const attached = attachedDocs.find((ad) => ad.document.document_type === req.document_type);
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {attached ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{req.document_type}</p>
                          <p className="text-[11px] text-gray-500">
                            {req.mandatory ? (
                              <span className="text-red-600 font-medium">Mandatory</span>
                            ) : (
                              'Optional / Conditional'
                            )}
                            {req.condition && ` • ${req.condition}`}
                          </p>
                        </div>
                      </div>

                      <div>
                        {attached ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 font-mono">{attached.document.file_name}</span>
                            <StatusBadge status={attached.document.verification_status} size="sm" />
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setUploadDocType(req.document_type);
                              setShowUploadModal(true);
                            }}
                            className="text-xs text-primary-600 font-semibold hover:underline"
                          >
                            + Attach Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attached Documents Table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Attached to This Application ({attachedDocs.length})
                </h3>
              </div>
              {attachedDocs.length === 0 ? (
                <EmptyState
                  title="No documents attached"
                  description="Attach mandatory documents from your vault or upload new files."
                  action={
                    <button onClick={() => setShowAttachVaultModal(true)} className="btn-primary text-xs py-1.5">
                      <FilePlus className="w-3.5 h-3.5" /> Attach from Vault
                    </button>
                  }
                />
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Document Type</th>
                      <th className="px-4 py-3 text-left">File Name</th>
                      <th className="px-4 py-3 text-left">Verification</th>
                      <th className="px-4 py-3 text-left">Expiry</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attachedDocs.map((ad) => {
                      const doc = ad.document;
                      return (
                        <tr key={ad.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{doc.document_type}</td>
                          <td className="px-4 py-3 font-mono text-gray-500">{doc.file_name}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={doc.verification_status} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            {doc.expiry_date ? (
                              <span className={doc.is_expired ? 'text-red-600 font-bold' : 'text-gray-700'}>
                                {formatDate(doc.expiry_date)}
                              </span>
                            ) : (
                              <span className="text-gray-400">Non-expiring</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setShowReplaceModal(doc.id)}
                                className="text-primary-600 hover:text-primary-800 font-medium text-[11px]"
                                title="Replace with new version"
                              >
                                Replace
                              </button>
                              <span className="text-gray-200">|</span>
                              <button
                                onClick={() => detachDoc.mutate(doc.id)}
                                className="text-red-500 hover:text-red-700 font-medium text-[11px]"
                                title="Detach from this application"
                              >
                                Detach
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: READINESS CHECK */}
        {activeTab === 'readiness' && (
          <div className="space-y-5 animate-fade-in">
            <div className="card p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-300" />
                    <h2 className="text-base font-bold">Platform Pre-Submission Readiness Check</h2>
                  </div>
                  <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                    Automated completeness and verification check. This prevents rejection cycles due to missing,
                    unverified, or expired documentation prior to official departmental submission.
                  </p>
                </div>
                <button
                  onClick={() => readinessCheck.mutate()}
                  disabled={readinessCheck.isPending}
                  className="px-4 py-2 bg-white text-blue-900 rounded-lg text-xs font-bold hover:bg-blue-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${readinessCheck.isPending ? 'animate-spin' : ''}`} />
                  {readinessCheck.isPending ? 'Evaluating...' : 'Re-check Readiness'}
                </button>
              </div>
            </div>

            {/* Results display */}
            {readinessCheck.data ? (
              <div className="space-y-4">
                {/* Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    readinessCheck.data.ready
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {readinessCheck.data.ready ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {readinessCheck.data.ready
                        ? 'Ready for Submission'
                        : 'Action Required: Resolve Issues Before Submitting'}
                    </p>
                    <p className="text-xs mt-1 text-gray-700">{readinessCheck.data.label}</p>
                  </div>
                  {readinessCheck.data.ready && isSubmittableState && (
                    <button
                      onClick={() => setShowSubmitConfirmModal(true)}
                      className="btn-primary text-xs py-1.5 bg-green-700 hover:bg-green-800"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Proceed to Submit
                    </button>
                  )}
                </div>

                {/* Issues if any */}
                {readinessCheck.data.issues.length > 0 && (
                  <div className="card p-4 border-l-4 border-l-red-500 bg-red-50/20">
                    <h3 className="text-xs font-bold text-red-900 uppercase tracking-wide mb-2">
                      Blocking Issues ({readinessCheck.data.issues.length})
                    </h3>
                    <ul className="space-y-1.5">
                      {readinessCheck.data.issues.map((issue, idx) => (
                        <li key={idx} className="text-xs text-red-700 flex items-start gap-2">
                          <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings if any */}
                {readinessCheck.data.warnings.length > 0 && (
                  <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/20">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">
                      Advisory Warnings ({readinessCheck.data.warnings.length})
                    </h3>
                    <ul className="space-y-1.5">
                      {readinessCheck.data.warnings.map((warn, idx) => (
                        <li key={idx} className="text-xs text-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{warn}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Checklist Table */}
                <div className="card p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Evaluation Matrix
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {readinessCheck.data.checks.map((chk, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-xs">
                        <span className="text-gray-800">{chk.description}</span>
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                            chk.status === 'pass'
                              ? 'bg-green-100 text-green-800'
                              : chk.status === 'warn'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {chk.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center space-y-3">
                <FileCheck2 className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-sm font-semibold text-gray-800">No Readiness Evaluation Performed Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Click the button below to validate all document requirements, verification statuses, and department
                  readiness rules.
                </p>
                <button
                  onClick={() => readinessCheck.mutate()}
                  disabled={readinessCheck.isPending}
                  className="btn-primary text-xs py-2 px-4 mx-auto"
                >
                  Evaluate Readiness Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: QUERIES */}
        {activeTab === 'queries' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Query Management Lifecycle</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review and respond to official inquiries raised by department officers.
                </p>
              </div>
            </div>

            {queries.length === 0 ? (
              <EmptyState
                title="No queries raised"
                description="There are currently no active clarification requests on this application."
              />
            ) : (
              <div className="space-y-4">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    className={`card p-5 border-l-4 ${
                      q.status === 'OPEN'
                        ? 'border-l-orange-500 bg-orange-50/20'
                        : q.status === 'RESOLVED'
                        ? 'border-l-green-500 bg-white'
                        : 'border-l-blue-500 bg-white'
                    }`}
                  >
                    {/* Query Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={q.status} size="sm" />
                          <PriorityBadge priority={q.priority} />
                          {q.deadline && (
                            <span className="text-[11px] text-gray-500 font-medium">
                              Deadline: {formatDate(q.deadline)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mt-2">{q.subject}</h3>
                      </div>
                      <span className="text-[11px] text-gray-400">{formatDate(q.created_at)}</span>
                    </div>

                    {/* Query description */}
                    <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-100 leading-relaxed">
                      {q.description}
                    </p>

                    {/* Response Thread */}
                    {q.responses && q.responses.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Responses & Clarifications ({q.responses.length})
                        </p>
                        {q.responses.map((resp) => (
                          <div key={resp.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                              <span className="font-semibold text-gray-700">Applicant Response</span>
                              <span>{formatDateTime(resp.created_at)}</span>
                            </div>
                            <p className="text-gray-800 leading-relaxed">{resp.response_text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Applicant Response Form */}
                    {q.status === 'OPEN' && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        <label className="text-xs font-semibold text-gray-700">Submit Your Official Response</label>
                        <textarea
                          rows={3}
                          value={replyText[q.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [q.id]: e.target.value })}
                          placeholder="Type your clarification or note the attached revised documents..."
                          className="input-base text-xs"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              const text = replyText[q.id]?.trim();
                              if (text) {
                                submitQueryResponse.mutate({ queryId: q.id, text });
                              }
                            }}
                            disabled={!replyText[q.id]?.trim() || submitQueryResponse.isPending}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {submitQueryResponse.isPending ? 'Sending...' : 'Send Response'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SITE INSPECTIONS */}
        {activeTab === 'inspections' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Site Inspections</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Department site visits, inspector assignments, and findings reports.
                </p>
              </div>
            </div>

            {inspections.length === 0 ? (
              <EmptyState
                title="No inspections scheduled"
                description="No site visits have been designated for this application."
              />
            ) : (
              <div className="space-y-4">
                {inspections.map((insp) => (
                  <div key={insp.id} className="card p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {formatDateTime(insp.scheduled_date)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Location: {insp.location || project.district} • {insp.purpose || 'Site compliance visit'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={insp.status} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg">
                      <div>
                        <span className="text-gray-400">Designated Inspector:</span>{' '}
                        <span className="font-semibold text-gray-800">{insp.inspector?.name || 'Assigned Officer'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Inspector Contact:</span>{' '}
                        <span className="font-mono text-gray-800">{insp.inspector?.email || 'officer@demo.local'}</span>
                      </div>
                    </div>

                    {/* Applicant Interactive Controls */}
                    {insp.status === 'SCHEDULED' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setRescheduleInspectionModal(insp.id)}
                          className="btn-secondary text-xs py-1.5"
                        >
                          Request Reschedule
                        </button>
                        <button
                          onClick={() =>
                            updateInspection.mutate({
                              inspId: insp.id,
                              action: 'confirm_readiness',
                              notes: 'Site access and personnel readiness confirmed.',
                            })
                          }
                          disabled={updateInspection.isPending}
                          className="btn-primary text-xs py-1.5 bg-green-700 hover:bg-green-800"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm Site Readiness
                        </button>
                      </div>
                    )}

                    {/* Findings if any */}
                    {insp.findings && insp.findings.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Inspection Findings & Observations ({insp.findings.length})
                        </h4>
                        {insp.findings.map((f) => (
                          <div
                            key={f.id}
                            className={`p-3 rounded-lg text-xs space-y-1.5 ${
                              f.severity === 'CRITICAL' || f.severity === 'HIGH'
                                ? 'bg-red-50/70 border border-red-200'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  f.severity === 'CRITICAL'
                                    ? 'bg-red-600 text-white'
                                    : f.severity === 'HIGH'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {f.severity}
                              </span>
                              <span className="text-[11px] font-medium text-gray-500">Status: {f.status}</span>
                            </div>
                            <p className="text-gray-900 font-medium">{f.description}</p>
                            {f.corrective_action && (
                              <p className="text-gray-600">
                                <span className="font-semibold text-gray-700">Corrective Recommendation:</span>{' '}
                                {f.corrective_action}
                              </p>
                            )}
                            {f.status !== 'acknowledged' && (
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => acknowledgeFinding.mutate({ findingId: f.id })}
                                  className="text-primary-600 hover:underline font-semibold text-[11px]"
                                >
                                  Acknowledge & Mark Addressing →
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Application Audit Timeline</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete immutable audit trail of state transitions, submissions, queries, and site visits.
                </p>
              </div>
            </div>

            <div className="card p-6">
              {timelineEvents.length === 0 ? (
                <EmptyState
                  title="No timeline events"
                  description="Events will be recorded as actions are taken on this application."
                />
              ) : (
                <div className="relative border-l-2 border-primary-200 ml-4 pl-6 space-y-6">
                  {timelineEvents.map((ev) => (
                    <div key={ev.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-primary-600 ring-4 ring-white" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                            {ev.event_type}
                          </span>
                          <span className="text-[11px] text-gray-400">{formatDateTime(ev.timestamp)}</span>
                        </div>
                        {ev.notes && <p className="text-xs text-gray-700 font-medium">{ev.notes}</p>}
                        {ev.actor && (
                          <p className="text-[11px] text-gray-400">
                            By {ev.actor.name} ({formatRole(ev.actor.role)})
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Attach from Vault */}
      {showAttachVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Attach Document from Project Vault</h3>
              <button
                onClick={() => setShowAttachVaultModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Select existing documents from your vault to link to this application without re-uploading.
            </p>
            <div className="flex-1 overflow-y-auto space-y-2">
              {vaultDocs?.map((doc) => {
                const isAttached = attachedDocs.some((ad) => ad.document_id === doc.id);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{doc.document_type}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{doc.file_name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Reused in {doc.reuse_count} application{doc.reuse_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div>
                      {isAttached ? (
                        <span className="text-[11px] text-green-700 bg-green-50 px-2 py-1 rounded font-semibold">
                          Attached
                        </span>
                      ) : (
                        <button
                          onClick={() => attachDoc.mutate(doc.id)}
                          disabled={attachDoc.isPending}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Attach
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowAttachVaultModal(false)} className="btn-secondary text-xs py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Upload New Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Upload & Attach Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Document Type</label>
                <input
                  type="text"
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  placeholder="e.g. Fire Safety Layout Drawing"
                  className="input-base text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Expiry Date (if applicable)</label>
                <input
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (uploadDocType && uploadFile) {
                    uploadDoc.mutate({
                      docType: uploadDocType,
                      file: uploadFile,
                      expiry: uploadExpiryDate || undefined,
                    });
                  }
                }}
                disabled={!uploadDocType || !uploadFile || uploadDoc.isPending}
                className="btn-primary text-xs py-1.5"
              >
                {uploadDoc.isPending ? 'Uploading...' : 'Upload & Attach'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Replace Document */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Upload Replacement Document</h3>
              <button onClick={() => setShowReplaceModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Uploading a replacement will increment the document version and reset verification status to PENDING for
              officer review.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Replacement File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">New Expiry Date (optional)</label>
                <input
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowReplaceModal(null)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (uploadFile) {
                    replaceDoc.mutate({
                      docId: showReplaceModal,
                      file: uploadFile,
                      expiry: uploadExpiryDate || undefined,
                    });
                  }
                }}
                disabled={!uploadFile || replaceDoc.isPending}
                className="btn-primary text-xs py-1.5"
              >
                {replaceDoc.isPending ? 'Replacing...' : 'Confirm Replacement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reschedule Inspection */}
      {rescheduleInspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Request Inspection Reschedule</h3>
              <button
                onClick={() => setRescheduleInspectionModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Proposed New Date & Time</label>
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="input-base text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Reason for Request</label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Civil construction team requires 3 additional days for safety barrier placement..."
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setRescheduleInspectionModal(null)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rescheduleInspectionModal) {
                    updateInspection.mutate({
                      inspId: rescheduleInspectionModal,
                      action: 'reschedule',
                      scheduledDate: rescheduleDate || undefined,
                      notes: rescheduleReason || 'Applicant proposed alternative date',
                    });
                  }
                }}
                disabled={updateInspection.isPending}
                className="btn-primary text-xs py-1.5"
              >
                {updateInspection.isPending ? 'Sending...' : 'Send Reschedule Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Submit Application Confirmation */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-primary-600">
              <Send className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Submit Application</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              You are about to officially submit application{' '}
              <span className="font-mono font-bold text-gray-900">{app.application_number}</span> to{' '}
              <span className="font-bold text-gray-900">{app.department?.name || approvalType.authority}</span>.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
              Note: Upon submission, your application status transitions to <strong>SUBMITTED</strong>, the department
              review clock begins under configured SLA policies, and an immutable audit event will be recorded.
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Submission Notes (Optional)</label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. All structural drawings and NOC requirements attached."
                className="input-base text-xs mt-1"
              />
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowSubmitConfirmModal(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() =>
                  updateStatus.mutate({
                    status: 'SUBMITTED',
                    notes: actionNotes || 'Application submitted by applicant.',
                  })
                }
                disabled={updateStatus.isPending}
                className="btn-primary text-xs py-1.5 bg-green-700 hover:bg-green-800"
              >
                {updateStatus.isPending ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
