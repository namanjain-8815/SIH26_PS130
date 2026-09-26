'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { inspectionsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ClipboardCheck,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function InspectionsPage() {
  const qc = useQueryClient();
  const [rescheduleInspId, setRescheduleInspId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inspections', DEMO_PROJECT_ID],
    queryFn: () => inspectionsApi.listProject(DEMO_PROJECT_ID),
  });

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
      setRescheduleInspId(null);
      setRescheduleDate('');
      setRescheduleReason('');
    },
  });

  const acknowledgeFinding = useMutation({
    mutationFn: (findingId: string) =>
      inspectionsApi.updateFinding(findingId, { status: 'acknowledged' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections', DEMO_PROJECT_ID] });
    },
  });

  const inspections = (data ?? []) as Array<{
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

  const upcoming = inspections.filter((i) => i.status === 'SCHEDULED');
  const past = inspections.filter((i) => i.status !== 'SCHEDULED');

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Site Inspections</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Scheduled and completed site visits, Designated Inspection Officer assignments, and compliance findings.
        </p>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Visits ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">No upcoming inspections</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((insp) => (
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
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Completed & Rescheduled ({past.length})</h2>
          <div className="space-y-3">
            {past.map((insp) => (
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
  const isUpcoming = insp.status === 'SCHEDULED';
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
              {appId && (
                <Link
                  href={`/app/applications/${appId}?tab=inspections`}
                  className="text-[11px] text-primary-600 hover:underline flex items-center gap-0.5"
                >
                  Workspace <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateTime(insp.scheduled_date)}
              </span>
              {insp.location && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {insp.location}
                </span>
              )}
              {insp.inspector && (
                <span className="flex items-center gap-1 text-xs text-gray-500" title="Designated Inspection Officer">
                  <User className="w-3.5 h-3.5" />
                  Officer: {insp.inspector.name}
                </span>
              )}
            </div>

            {insp.purpose && (
              <p className="text-xs text-gray-600 mt-2 bg-gray-50 px-2.5 py-1 rounded">{insp.purpose}</p>
            )}
          </div>
        </div>
        <StatusBadge status={insp.status} />
      </div>

      {/* Applicant Interactive Controls */}
      {isUpcoming && onConfirmReadiness && onRequestReschedule && (
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
          <button onClick={onRequestReschedule} className="btn-secondary text-xs py-1.5">
            Request Reschedule
          </button>
          <button
            onClick={onConfirmReadiness}
            disabled={isPending}
            className="btn-primary text-xs py-1.5 bg-green-700 hover:bg-green-800"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirm Site Readiness
          </button>
        </div>
      )}

      {/* Findings */}
      {insp.findings?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Findings & Observations ({insp.findings.length})</p>
          {insp.findings.map((f) => (
            <div
              key={f.id}
              className={`text-xs p-3 rounded-lg border ${
                f.severity === 'CRITICAL'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : f.severity === 'HIGH'
                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[10px] uppercase">{f.severity}</span>
                <span className="text-[10px] font-medium text-gray-500">Status: {f.status || 'open'}</span>
              </div>
              <p>{f.description}</p>
              {f.corrective_action && (
                <p className="mt-1 text-gray-600">
                  <span className="font-medium">Action:</span> {f.corrective_action}
                </p>
              )}
              {f.status !== 'acknowledged' && onAcknowledgeFinding && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onAcknowledgeFinding(f.id)}
                    className="text-primary-700 font-semibold hover:underline text-[11px]"
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
  );
}
