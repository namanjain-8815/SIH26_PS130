'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { inspectionsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { JointInspectionPlan, ProjectJointInspectionsResponse } from '@/types/api';
import {
  ClipboardCheck,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  AlertTriangle,
  Building2,
  CheckSquare,
  ShieldCheck,
  Send,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function InspectionsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'joint' | 'individual'>('joint');
  const [rescheduleInspId, setRescheduleInspId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Joint inspection overview query
  const {
    data: jointData,
    isLoading: isLoadingJoint,
    error: jointError,
    refetch: refetchJoint,
  } = useQuery({
    queryKey: ['project-joint-inspections', DEMO_PROJECT_ID],
    queryFn: () => inspectionsApi.getProjectJoint(DEMO_PROJECT_ID),
  });

  // Individual inspections query (existing)
  const {
    data: individualData,
    isLoading: isLoadingIndividual,
    error: individualError,
    refetch: refetchIndividual,
  } = useQuery({
    queryKey: ['inspections', DEMO_PROJECT_ID],
    queryFn: () => inspectionsApi.listProject(DEMO_PROJECT_ID),
  });

  // Update inspection mutation
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
      qc.invalidateQueries({ queryKey: ['inspections', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-joint-inspections', DEMO_PROJECT_ID] });
      setRescheduleInspId(null);
      setRescheduleDate('');
      setRescheduleReason('');
    },
  });

  // Confirm joint readiness across all participating clearances simultaneously
  const confirmJointReadinessMutation = useMutation({
    mutationFn: (inspectionIds: string[]) =>
      inspectionsApi.confirmJointReadiness({
        project_id: DEMO_PROJECT_ID,
        inspection_ids: inspectionIds,
        notes: 'Applicant confirmed site readiness for joint multi-department inspection.',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-joint-inspections', DEMO_PROJECT_ID] });
    },
  });

  const acknowledgeFinding = useMutation({
    mutationFn: (findingId: string) =>
      inspectionsApi.updateFinding(findingId, { status: 'acknowledged' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-joint-inspections', DEMO_PROJECT_ID] });
    },
  });

  const jointPlans = (jointData?.joint_plans ?? []) as JointInspectionPlan[];
  const coordinationOpportunities = jointData?.coordination_opportunities ?? [];
  const clearancesRequiring = jointData?.clearances_requiring_inspection ?? [];

  const inspections = (individualData ?? []) as Array<{
    id: string;
    application_id: string;
    scheduled_date: string;
    status: string;
    location: string | null;
    purpose: string | null;
    department: { name: string };
    inspector: { name: string; email: string } | null;
    application: { id?: string; application_number: string; project_approval: { approval_type: { name: string } } };
    findings: Array<{ id: string; severity: string; description: string; corrective_action: string | null; status: string }>;
  }>;

  const upcomingIndividual = inspections.filter((i) => i.status === 'SCHEDULED' || i.status === 'RESCHEDULED');
  const pastIndividual = inspections.filter((i) => i.status !== 'SCHEDULED' && i.status !== 'RESCHEDULED');

  const error = jointError || individualError;
  const isLoading = isLoadingJoint || isLoadingIndividual;

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold">
              PS 26130 Joint Inspection System
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Site Inspections & Joint Visits</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Coordinated joint department site visits, Designated Inspection Officer assignments, and compliance findings.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('joint')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'joint'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            Coordinated Joint Visits ({jointPlans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'individual'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
            Individual Clearances ({inspections.length})
          </button>
        </div>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => { refetchJoint(); refetchIndividual(); }} />}

      {/* Coordination Opportunities Banner */}
      {coordinationOpportunities.length > 0 && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-purple-900">Joint Inspection Coordination Opportunity</h4>
            <p className="text-purple-800 mt-0.5">{coordinationOpportunities[0]}</p>
          </div>
        </div>
      )}

      {/* TAB 1: Coordinated Joint Visits */}
      {activeTab === 'joint' && (
        <div className="space-y-4">
          {jointPlans.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10 text-purple-500" />}
              title="No coordinated joint visits scheduled yet"
              description="When multiple regulatory authorities coordinate a shared site visit for this project, the joint itinerary and assigned officers will appear here."
            />
          ) : (
            jointPlans.map((plan) => {
              const allInspIds = plan.departments.map((d) => d.inspection_id);
              const isConfirmed = plan.status === 'COMPLETED';

              return (
                <div
                  key={plan.id}
                  className="card p-6 border-l-4 border-l-purple-600 bg-white shadow-sm space-y-5"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
                          Joint Multi-Department Visit
                        </span>
                        <StatusBadge status={plan.status} />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mt-1 flex items-center gap-2">
                        <span>{plan.project_name}</span>
                        <span className="text-xs font-normal text-gray-500">({plan.district} District)</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <strong>Coordinated Date:</strong> {formatDateTime(plan.scheduled_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {plan.location}
                        </span>
                      </div>
                    </div>

                    {/* Joint Readiness & Reschedule Actions */}
                    {plan.status !== 'COMPLETED' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => confirmJointReadinessMutation.mutate(allInspIds)}
                          disabled={confirmJointReadinessMutation.isPending}
                          className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckSquare className="w-4 h-4" />
                          {confirmJointReadinessMutation.isPending
                            ? 'Confirming...'
                            : 'Confirm Site Readiness for All Departments'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conflict Notice if any */}
                  {plan.has_conflicts && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Officer Assignment Alert:</span>{' '}
                        {plan.conflict_warnings.join(' • ')}
                      </div>
                    </div>
                  )}

                  {/* Participating Regulatory Departments */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Participating Regulatory Authorities ({plan.departments.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {plan.departments.map((dept) => (
                        <div
                          key={dept.inspection_id}
                          className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{dept.department_name}</span>
                              <StatusBadge status={dept.status} />
                            </div>
                            <p className="text-gray-600 font-medium">{dept.approval_name}</p>
                            <p className="text-[11px] text-gray-500">App #{dept.application_number}</p>
                            <div className="flex items-center gap-1.5 text-gray-700 pt-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span>
                                {dept.inspector_name ? (
                                  <>
                                    <strong>{dept.inspector_name}</strong>
                                    {dept.inspector_email && (
                                      <span className="text-gray-400 ml-1">({dept.inspector_email})</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-amber-700 font-semibold italic">
                                    Designated Officer Pending Assignment
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {dept.findings.length > 0 && (
                              <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
                                {dept.findings.length} Finding(s)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setRescheduleInspId(dept.inspection_id)}
                              className="text-[11px] text-blue-600 hover:text-blue-800 underline"
                            >
                              Request Reschedule
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consolidated Joint Findings */}
                  {plan.consolidated_findings.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Consolidated Site Verification Findings ({plan.consolidated_findings.length})</span>
                        <span className="text-[11px] font-normal text-gray-500">
                          {plan.findings_summary.critical} Critical • {plan.findings_summary.high} High •{' '}
                          {plan.findings_summary.medium} Medium • {plan.findings_summary.low} Low
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {plan.consolidated_findings.map((f) => (
                          <div
                            key={f.id}
                            className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                              f.severity === 'CRITICAL'
                                ? 'bg-red-50/50 border-red-200'
                                : f.severity === 'HIGH'
                                ? 'bg-amber-50/50 border-amber-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`badge text-[10px] font-bold ${
                                    f.severity === 'CRITICAL'
                                      ? 'bg-red-100 text-red-800'
                                      : f.severity === 'HIGH'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {f.severity}
                                </span>
                                <span className="font-semibold text-gray-900">{f.department_name}</span>
                                <span className="text-gray-500">({f.approval_name})</span>
                                <StatusBadge status={f.status} />
                              </div>
                              <p className="text-gray-800">{f.description}</p>
                              {f.corrective_action && (
                                <p className="text-[11px] text-gray-600">
                                  <strong>Corrective Action Required:</strong> {f.corrective_action}
                                </p>
                              )}
                            </div>

                            {f.status !== 'acknowledged' && f.status !== 'COMPLIANT' && (
                              <button
                                type="button"
                                onClick={() => acknowledgeFinding.mutate(f.id)}
                                className="btn-secondary text-[11px] py-1 px-2.5 shrink-0"
                              >
                                Acknowledge Finding
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Individual Clearances */}
      {activeTab === 'individual' && (
        <div className="space-y-5">
          {/* Upcoming */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Clearances ({upcomingIndividual.length})</h2>
            {upcomingIndividual.length === 0 ? (
              <div className="card p-6 text-center text-sm text-gray-400">No upcoming inspections</div>
            ) : (
              <div className="space-y-3">
                {upcomingIndividual.map((insp) => (
                  <InspectionCard
                    key={insp.id}
                    insp={insp}
                    onConfirmReadiness={() =>
                      updateInspection.mutate({
                        inspId: insp.id,
                        action: 'confirm_readiness',
                        notes: 'Site access confirmed by applicant',
                      })
                    }
                    onRequestReschedule={() => setRescheduleInspId(insp.id)}
                    onAcknowledgeFinding={(findingId) => acknowledgeFinding.mutate(findingId)}
                    isPending={updateInspection.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          {pastIndividual.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Completed & Rescheduled ({pastIndividual.length})</h2>
              <div className="space-y-3">
                {pastIndividual.map((insp) => (
                  <InspectionCard
                    key={insp.id}
                    insp={insp}
                    onAcknowledgeFinding={(findingId) => acknowledgeFinding.mutate(findingId)}
                  />
                ))}
              </div>
            </div>
          )}

          {!isLoading && inspections.length === 0 && (
            <EmptyState
              icon={<ClipboardCheck className="w-10 h-10" />}
              title="No inspections scheduled"
              description="Inspections will appear here once a department schedules a site visit for your applications."
            />
          )}
        </div>
      )}

      {/* MODAL: Reschedule Inspection */}
      {rescheduleInspId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Request Inspection Reschedule</h3>
              <button
                onClick={() => setRescheduleInspId(null)}
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
                  placeholder="e.g. Concrete curing inspection requires 3 additional days..."
                  className="input-base text-xs mt-1"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setRescheduleInspId(null)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rescheduleInspId) {
                    updateInspection.mutate({
                      inspId: rescheduleInspId,
                      action: 'reschedule',
                      scheduledDate: rescheduleDate || undefined,
                      notes: rescheduleReason || 'Applicant proposed new date',
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
    </div>
  );
}

function InspectionCard({
  insp,
  onConfirmReadiness,
  onRequestReschedule,
  onAcknowledgeFinding,
  isPending,
}: {
  insp: {
    id: string;
    application_id: string;
    scheduled_date: string;
    status: string;
    location: string | null;
    purpose: string | null;
    department: { name: string };
    inspector: { name: string } | null;
    application: { id?: string; application_number: string; project_approval: { approval_type: { name: string } } };
    findings: Array<{ id: string; severity: string; description: string; corrective_action?: string | null; status?: string }>;
  };
  onConfirmReadiness?: () => void;
  onRequestReschedule?: () => void;
  onAcknowledgeFinding?: (findingId: string) => void;
  isPending?: boolean;
}) {
  const isUpcoming = insp.status === 'SCHEDULED' || insp.status === 'RESCHEDULED';
  const appId = insp.application_id || insp.application?.id;

  return (
    <div className={`card p-5 border-l-4 ${isUpcoming ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isUpcoming ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            <ClipboardCheck className={`w-5 h-5 ${isUpcoming ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {insp.application.project_approval.approval_type.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">App #{insp.application.application_number}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{insp.department.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-2">
              <span className="flex items-center gap-1 font-medium text-gray-900">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {formatDateTime(insp.scheduled_date)}
              </span>
              {insp.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {insp.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                {insp.inspector?.name ?? 'Designated Officer Pending'}
              </span>
            </div>
            {insp.purpose && <p className="text-xs text-gray-500 mt-1 italic">{insp.purpose}</p>}
          </div>
        </div>
        <StatusBadge status={insp.status} />
      </div>

      {/* Findings */}
      {insp.findings && insp.findings.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Findings ({insp.findings.length})</p>
          <div className="space-y-2">
            {insp.findings.map((f) => (
              <div key={f.id} className="p-3 bg-gray-50 rounded-lg text-xs flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge text-[10px] ${
                        f.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : f.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-gray-700">{f.description}</span>
                  </div>
                  {f.corrective_action && (
                    <p className="text-gray-500 text-[11px]">Action: {f.corrective_action}</p>
                  )}
                </div>
                {f.status !== 'acknowledged' && onAcknowledgeFinding && (
                  <button
                    onClick={() => onAcknowledgeFinding(f.id)}
                    className="btn-secondary text-xs py-1 px-2.5 flex-shrink-0"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        {appId ? (
          <Link
            href={`/app/applications/${appId}`}
            className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 font-medium"
          >
            Open Application Workspace
            <ExternalLink className="w-3 h-3" />
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {isUpcoming && onConfirmReadiness && (
            <button
              onClick={onConfirmReadiness}
              disabled={isPending}
              className="btn-primary text-xs py-1.5 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isPending ? 'Confirming...' : 'Confirm Readiness'}
            </button>
          )}
          {isUpcoming && onRequestReschedule && (
            <button onClick={onRequestReschedule} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Request Reschedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
