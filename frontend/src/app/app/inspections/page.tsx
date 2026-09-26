'use client';

import { useQuery } from '@tanstack/react-query';
import { inspectionsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ClipboardCheck, MapPin, Calendar, User } from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function InspectionsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inspections', DEMO_PROJECT_ID],
    queryFn: () => inspectionsApi.listProject(DEMO_PROJECT_ID),
  });

  const inspections = (data ?? []) as Array<{
    id: string;
    scheduled_date: string;
    status: string;
    location: string | null;
    purpose: string | null;
    department: { name: string };
    inspector: { name: string; email: string } | null;
    application: { application_number: string; project_approval: { approval_type: { name: string } } };
    findings: Array<{ id: string; severity: string; description: string; corrective_action: string | null }>;
  }>;

  const upcoming = inspections.filter(i => i.status === 'SCHEDULED');
  const past = inspections.filter(i => i.status !== 'SCHEDULED');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Site Inspections</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Scheduled and completed site inspections for your project
        </p>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">No upcoming inspections</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((insp) => (
              <InspectionCard key={insp.id} insp={insp} />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Completed & Cancelled ({past.length})</h2>
          <div className="space-y-3">
            {past.map((insp) => (
              <InspectionCard key={insp.id} insp={insp} />
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
  );
}

function InspectionCard({ insp }: { insp: {
  id: string; scheduled_date: string; status: string; location: string | null;
  purpose: string | null; department: { name: string }; inspector: { name: string } | null;
  application: { application_number: string; project_approval: { approval_type: { name: string } } };
  findings: Array<{ id: string; severity: string; description: string }>;
} }) {
  const isUpcoming = insp.status === 'SCHEDULED';

  return (
    <div className={`card p-4 border-l-4 ${isUpcoming ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUpcoming ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <ClipboardCheck className={`w-5 h-5 ${isUpcoming ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {insp.application.project_approval.approval_type.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">App #{insp.application.application_number}</p>

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
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3.5 h-3.5" />
                  {insp.inspector.name}
                </span>
              )}
            </div>

            {insp.purpose && (
              <p className="text-xs text-gray-600 mt-2 bg-gray-50 px-2 py-1 rounded">{insp.purpose}</p>
            )}
          </div>
        </div>
        <StatusBadge status={insp.status} />
      </div>

      {/* Findings */}
      {insp.findings?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-1.5">Findings ({insp.findings.length})</p>
          {insp.findings.map((f) => (
            <div key={f.id} className={`text-xs p-2 rounded mb-1 ${
              f.severity === 'CRITICAL' ? 'bg-red-50 text-red-700' :
              f.severity === 'HIGH' ? 'bg-orange-50 text-orange-700' :
              'bg-gray-50 text-gray-600'
            }`}>
              <span className="font-medium">{f.severity}:</span> {f.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
