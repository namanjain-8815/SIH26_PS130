'use client';

import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionsApi, governmentApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { formatRole } from '@/lib/terminology';
import type { PlannerInspection, InspectorUser } from '@/types/api';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  User,
  MapPin,
  Building2,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  List,
  CalendarDays,
  Plus,
  ChevronRight,
  Send,
  Eye,
  CheckSquare,
} from 'lucide-react';

export default function CommonInspectionPlannerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-gray-500">Loading Inspection Planner...</div>}>
      <CommonInspectionPlannerContent />
    </Suspense>
  );
}

function CommonInspectionPlannerContent() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [inspectorFilter, setInspectorFilter] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Modals state
  const [selectedInspection, setSelectedInspection] = useState<PlannerInspection | null>(null);

  // Reschedule modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Assign inspector modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedInspectorId, setSelectedInspectorId] = useState('');

  // Record findings modal (Inspector role)
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [findingSeverity, setFindingSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW');
  const [findingDesc, setFindingDesc] = useState('');
  const [findingCorrective, setFindingCorrective] = useState('');
  const [findingStatus, setFindingStatus] = useState('COMPLIANT');

  const isInspector = user?.role === 'INSPECTOR';
  const isOfficer = user?.role === 'OFFICER';
  const isNodal = user?.role === 'NODAL';
  const isAdmin = user?.role === 'ADMIN';

  // Compute effective date filters based on datePreset
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  const now = new Date();
  if (datePreset === 'today') {
    dateFrom = now.toISOString().slice(0, 10);
    dateTo = now.toISOString().slice(0, 10);
  } else if (datePreset === '7days') {
    dateFrom = now.toISOString().slice(0, 10);
    const end = new Date(now.getTime() + 7 * 86_400_000);
    dateTo = end.toISOString().slice(0, 10);
  } else if (datePreset === '30days') {
    dateFrom = now.toISOString().slice(0, 10);
    const end = new Date(now.getTime() + 30 * 86_400_000);
    dateTo = end.toISOString().slice(0, 10);
  }

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => governmentApi.departments(),
  });

  // Fetch registered inspectors
  const { data: inspectors = [] } = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => inspectionsApi.listInspectors(),
  });

  // Fetch planner inspections
  const effectiveDeptId = isOfficer ? (user?.department?.id || undefined) : (departmentFilter || undefined);
  const effectiveInspectorId = isInspector ? user?.id : (inspectorFilter || undefined);

  const {
    data: inspections = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'planner-inspections',
      {
        department_id: effectiveDeptId,
        inspector_id: effectiveInspectorId,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
      },
    ],
    queryFn: () =>
      inspectionsApi.listPlanner({
        department_id: effectiveDeptId,
        inspector_id: effectiveInspectorId,
        status: statusFilter || undefined,
        date_from: dateFrom,
        date_to: dateTo,
      }),
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date, notes }: { id: string; date: string; notes?: string }) =>
      inspectionsApi.update(id, {
        action: 'reschedule',
        scheduled_date: new Date(date),
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowRescheduleModal(false);
      setRescheduleDate('');
      setRescheduleNotes('');
    },
  });

  // Assign inspector mutation
  const assignInspectorMutation = useMutation({
    mutationFn: ({ id, inspector_id }: { id: string; inspector_id: string }) =>
      inspectionsApi.update(id, {
        action: 'assign_inspector',
        inspector_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowAssignModal(false);
      setSelectedInspectorId('');
    },
  });

  // Complete inspection mutation
  const completeInspectionMutation = useMutation({
    mutationFn: (id: string) =>
      inspectionsApi.update(id, {
        status: 'COMPLETED',
        notes: 'Site verification completed satisfactorily.',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
    },
  });

  // Record finding mutation
  const recordFindingMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { severity: string; description: string; corrective_action?: string; status: string };
    }) => inspectionsApi.recordFinding(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowFindingModal(false);
      setFindingDesc('');
      setFindingCorrective('');
      setFindingStatus('COMPLIANT');
    },
  });

  // Metrics summary
  const totalInspections = inspections.length;
  const conflictCount = inspections.filter((i) => i.has_conflict).length;
  const scheduledCount = inspections.filter((i) => i.status === 'SCHEDULED' || i.status === 'RESCHEDULED').length;
  const completedCount = inspections.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold">
                PS 26130 Common Inspection Planner
              </span>
              {isInspector && (
                <span className="badge bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold">
                  Designated Officer Desk
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Joint Inspection & Site Visit Planner</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Single-window joint statutory inspection coordination, multi-officer scheduling, conflict detection, and site findings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Timeline View
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-purple-500">
            <span className="text-xs text-gray-500 font-medium">Total Scheduled Visits</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{scheduledCount}</p>
            <p className="text-[11px] text-purple-700 mt-0.5">Joint & individual inspections</p>
          </div>

          <div
            className={`card p-4 border-l-4 ${
              conflictCount > 0 ? 'border-l-amber-500 bg-amber-50/20' : 'border-l-emerald-500'
            }`}
          >
            <span className="text-xs text-gray-500 font-medium">Scheduling Conflicts</span>
            <p className={`text-2xl font-bold mt-1 ${conflictCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {conflictCount}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {conflictCount > 0 ? 'Concurrent visits flagged' : 'No inspector conflicts'}
            </p>
          </div>

          <div className="card p-4 border-l-4 border-l-emerald-500">
            <span className="text-xs text-gray-500 font-medium">Completed Visits</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Findings recorded</p>
          </div>

          <div className="card p-4 border-l-4 border-l-blue-500">
            <span className="text-xs text-gray-500 font-medium">Registered Inspectors</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{inspectors.length}</p>
            <p className="text-[11px] text-blue-700 mt-0.5">Designated officers on roster</p>
          </div>
        </div>

        {/* Conflict Warning Alert if any */}
        {conflictCount > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-900">
                Joint Inspection Scheduling Conflict Detected ({conflictCount})
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                One or more designated inspection officers have multiple site visits scheduled on the same date.
                Inspect the flagged rows below to reschedule or re-assign designated officers to avoid travel delays.
              </p>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                Filters:
              </span>

              {/* Department filter (NODAL/ADMIN) */}
              {(isNodal || isAdmin) && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="input-base py-1.5 w-auto text-xs"
                >
                  <option value="">All Regulatory Authorities ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Inspector filter */}
              {!isInspector && (
                <select
                  value={inspectorFilter}
                  onChange={(e) => setInspectorFilter(e.target.value)}
                  className="input-base py-1.5 w-auto text-xs font-medium"
                >
                  <option value="">All Designated Inspectors ({inspectors.length})</option>
                  {inspectors.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name} ({ins.email})
                    </option>
                  ))}
                </select>
              )}

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-base py-1.5 w-auto text-xs"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Date Presets */}
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {(
                  [
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: 'Today' },
                    { id: '7days', label: 'Next 7 Days' },
                    { id: '30days', label: 'Next 30 Days' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDatePreset(p.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      datePreset === p.id ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-gray-400 font-medium">
              Showing {inspections.length} inspection{inspections.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* VIEW 1: LIST VIEW */}
        {viewMode === 'list' && (
          <div className="card overflow-hidden">
            {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
            {!isLoading && inspections.length === 0 && (
              <EmptyState
                title="No inspections found"
                description="No site verification visits match the selected department, inspector, or date criteria."
              />
            )}

            {inspections.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Scheduled Date & Time</th>
                      <th className="px-4 py-3">Application & Clearance</th>
                      <th className="px-4 py-3">Department Authority</th>
                      <th className="px-4 py-3">Designated Inspector</th>
                      <th className="px-4 py-3">Site Location & Purpose</th>
                      <th className="px-4 py-3">Status & Conflict</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading && [...Array(4)].map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
                    {inspections.map((insp) => {
                      const app = insp.application;
                      const approvalType = app?.project_approval?.approval_type;
                      const project = app?.project_approval?.project;

                      return (
                        <tr
                          key={insp.id}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            insp.has_conflict ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : ''
                          }`}
                        >
                          {/* Date & Time */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-gray-900">
                              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                              {formatDate(insp.scheduled_date)}
                            </div>
                            <span className="text-[11px] text-gray-400 block mt-0.5">
                              {new Date(insp.scheduled_date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          {/* Application & Clearance */}
                          <td className="px-4 py-3.5">
                            <Link
                              href={`/government/work-queue?application_id=${app?.id}`}
                              className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {app?.application_number}
                              <ArrowUpRight className="w-3 h-3 text-gray-400" />
                            </Link>
                            <p className="font-semibold text-gray-900 mt-0.5 max-w-[200px] truncate">
                              {approvalType?.name || 'Statutory Approval'}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                              {project?.organization?.legal_name || project?.name}
                            </p>
                          </td>

                          {/* Department Authority */}
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-gray-800 block">{insp.department?.name}</span>
                            <span className="text-[10px] text-gray-400">{project?.district} Jurisdiction</span>
                          </td>

                          {/* Designated Inspector */}
                          <td className="px-4 py-3.5">
                            {insp.inspector ? (
                              <div>
                                <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                                  <User className="w-3 h-3 text-purple-600" />
                                  {insp.inspector.name}
                                </span>
                                <span className="text-[10px] text-gray-400 block">{insp.inspector.email}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Site Location & Purpose */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-start gap-1 text-gray-700">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span className="max-w-[200px] truncate">
                                {insp.location || project?.address || `${project?.industrial_area || 'MIDC Area'}, ${project?.district}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 block mt-0.5 max-w-[200px] truncate">
                              {insp.purpose || 'Statutory compliance verification'}
                            </span>
                          </td>

                          {/* Status & Conflict */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <StatusBadge status={insp.status} size="sm" />
                              {insp.has_conflict && (
                                <div
                                  className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-300"
                                  title={insp.conflict_reason || 'Scheduling conflict'}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                  Conflict
                                </div>
                              )}
                              {insp.findings && insp.findings.length > 0 && (
                                <span className="inline-block text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                  {insp.findings.length} finding{insp.findings.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspector actions */}
                              {isInspector && insp.status !== 'COMPLETED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedInspection(insp);
                                      setShowFindingModal(true);
                                    }}
                                    className="btn-secondary text-[11px] py-1 px-2.5"
                                    title="Record Site Findings"
                                  >
                                    <FileText className="w-3 h-3 text-purple-600 mr-1" />
                                    Findings
                                  </button>
                                  <button
                                    onClick={() => completeInspectionMutation.mutate(insp.id)}
                                    disabled={completeInspectionMutation.isPending}
                                    className="btn-primary text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                                    title="Mark Inspection as Completed"
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Complete
                                  </button>
                                </>
                              )}

                              {/* Officer / Nodal actions */}
                              {!isInspector && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedInspection(insp);
                                      setRescheduleDate(insp.scheduled_date ? insp.scheduled_date.slice(0, 16) : '');
                                      setShowRescheduleModal(true);
                                    }}
                                    className="btn-secondary text-[11px] py-1 px-2"
                                    title="Reschedule Visit"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedInspection(insp);
                                      setSelectedInspectorId(insp.inspector_id || '');
                                      setShowAssignModal(true);
                                    }}
                                    className="btn-secondary text-[11px] py-1 px-2"
                                    title="Assign / Reassign Inspector"
                                  >
                                    Assign
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TIMELINE / CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {inspections.length === 0 && (
              <EmptyState
                title="No visits on timeline"
                description="No site inspections match the current filters."
              />
            )}

            {/* Group inspections by scheduled date */}
            {(() => {
              const grouped = new Map<string, PlannerInspection[]>();
              for (const insp of inspections) {
                const dateKey = insp.scheduled_date ? insp.scheduled_date.slice(0, 10) : 'TBD';
                const list = grouped.get(dateKey) ?? [];
                list.push(insp);
                grouped.set(dateKey, list);
              }

              const sortedDates = Array.from(grouped.keys()).sort();

              return sortedDates.map((dateKey) => {
                const visits = grouped.get(dateKey) ?? [];
                const formattedDate = dateKey !== 'TBD' ? formatDate(dateKey) : 'Unscheduled Date';

                return (
                  <div key={dateKey} className="card p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-900">{formattedDate}</h3>
                        <span className="text-[11px] font-semibold text-gray-400">
                          ({visits.length} visit{visits.length === 1 ? '' : 's'})
                        </span>
                      </div>
                      {visits.some((v) => v.has_conflict) && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Conflict on this day
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visits.map((insp) => {
                        const app = insp.application;
                        const approvalType = app?.project_approval?.approval_type;
                        const project = app?.project_approval?.project;

                        return (
                          <div
                            key={insp.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              insp.has_conflict
                                ? 'border-amber-300 bg-amber-50/30'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono font-bold text-xs text-blue-600">
                                  {app?.application_number}
                                </span>
                                <h4 className="text-xs font-bold text-gray-900 mt-0.5">
                                  {approvalType?.name}
                                </h4>
                                <p className="text-[11px] text-gray-500">
                                  {project?.organization?.legal_name || project?.name}
                                </p>
                              </div>
                              <StatusBadge status={insp.status} size="sm" />
                            </div>

                            {/* Details strip */}
                            <div className="mt-3 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-gray-400 block">Authority</span>
                                <span className="font-semibold text-gray-800">{insp.department?.name}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Inspector</span>
                                <span className="font-semibold text-purple-700">
                                  {insp.inspector?.name || 'Unassigned'}
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center gap-1 text-gray-600">
                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate">
                                  {insp.location || project?.address || `${project?.district} Area`}
                                </span>
                              </div>
                            </div>

                            {/* Conflict notice if any */}
                            {insp.has_conflict && (
                              <div className="mt-2.5 p-2 bg-amber-100/70 border border-amber-300 rounded-lg text-[10px] text-amber-900 leading-tight">
                                <p className="font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  Scheduling Feasibility Notice:
                                </p>
                                <p className="mt-0.5">{insp.conflict_reason}</p>
                              </div>
                            )}

                            {/* Action links */}
                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                              <Link
                                href={`/government/work-queue?application_id=${app?.id}`}
                                className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                              >
                                View Application <ArrowUpRight className="w-3 h-3" />
                              </Link>

                              <button
                                onClick={() => {
                                  setSelectedInspection(insp);
                                  setRescheduleDate(insp.scheduled_date ? insp.scheduled_date.slice(0, 16) : '');
                                  setShowRescheduleModal(true);
                                }}
                                className="text-gray-600 hover:text-gray-900 font-medium"
                              >
                                Reschedule
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* MODAL 1: RESCHEDULE MODAL */}
      {showRescheduleModal && selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Reschedule Site Inspection</h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Update the scheduled date and time for application{' '}
              <strong className="text-gray-900">{selectedInspection.application?.application_number}</strong>.
              All concerned parties and the applicant will be updated.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  New Scheduled Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="input-base text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Reason / Coordination Notes:
                </label>
                <textarea
                  rows={3}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="e.g. Rescheduled per joint coordination with Factory Inspectorate."
                  className="input-base text-xs w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="btn-secondary text-xs py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rescheduleDate || rescheduleMutation.isPending}
                onClick={() =>
                  rescheduleMutation.mutate({
                    id: selectedInspection.id,
                    date: rescheduleDate,
                    notes: rescheduleNotes,
                  })
                }
                className="btn-primary text-xs py-1.5"
              >
                {rescheduleMutation.isPending ? 'Updating...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN INSPECTOR MODAL */}
      {showAssignModal && selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Assign Designated Inspection Officer</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select an authorized designated inspection officer to conduct site verification for{' '}
              <strong className="text-gray-900">{selectedInspection.application?.application_number}</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Select Inspector:</label>
              <select
                value={selectedInspectorId}
                onChange={(e) => setSelectedInspectorId(e.target.value)}
                className="input-base text-xs w-full"
              >
                <option value="">-- Choose Inspector --</option>
                {inspectors.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.name} ({ins.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn-secondary text-xs py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedInspectorId || assignInspectorMutation.isPending}
                onClick={() =>
                  assignInspectorMutation.mutate({
                    id: selectedInspection.id,
                    inspector_id: selectedInspectorId,
                  })
                }
                className="btn-primary text-xs py-1.5"
              >
                {assignInspectorMutation.isPending ? 'Assigning...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD SITE FINDINGS MODAL */}
      {showFindingModal && selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Record Site Inspection Finding</h3>
              <button
                onClick={() => setShowFindingModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Finding Severity:</label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value as any)}
                    className="input-base text-xs w-full"
                  >
                    <option value="LOW">Low / Advisory</option>
                    <option value="MEDIUM">Medium / Remedial</option>
                    <option value="HIGH">High / Major Deficiency</option>
                    <option value="CRITICAL">Critical / Statutory Violation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Compliance Status:</label>
                  <select
                    value={findingStatus}
                    onChange={(e) => setFindingStatus(e.target.value)}
                    className="input-base text-xs w-full"
                  >
                    <option value="COMPLIANT">Compliant</option>
                    <option value="PARTIALLY_COMPLIANT">Partially Compliant</option>
                    <option value="NON_COMPLIANT">Non-Compliant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Site Observation & Technical Finding:
                </label>
                <textarea
                  rows={3}
                  value={findingDesc}
                  onChange={(e) => setFindingDesc(e.target.value)}
                  placeholder="Detail observations made during site verification..."
                  className="input-base text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Required Corrective Action (if applicable):
                </label>
                <textarea
                  rows={2}
                  value={findingCorrective}
                  onChange={(e) => setFindingCorrective(e.target.value)}
                  placeholder="Specify remediation or corrective measure expected from applicant..."
                  className="input-base text-xs w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowFindingModal(false)}
                className="btn-secondary text-xs py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!findingDesc || recordFindingMutation.isPending}
                onClick={() =>
                  recordFindingMutation.mutate({
                    id: selectedInspection.id,
                    body: {
                      severity: findingSeverity,
                      description: findingDesc,
                      corrective_action: findingCorrective,
                      status: findingStatus,
                    },
                  })
                }
                className="btn-primary text-xs py-1.5"
              >
                {recordFindingMutation.isPending ? 'Recording...' : 'Record Finding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
