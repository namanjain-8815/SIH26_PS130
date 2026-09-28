'use client';

import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionsApi, governmentApi, projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { formatRole } from '@/lib/terminology';
import type {
  PlannerInspection,
  InspectorUser,
  JointInspectionPlan,
  ProjectJointInspectionsResponse,
} from '@/types/api';
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
  ChevronDown,
  Send,
  Eye,
  CheckSquare,
  Users,
  Sparkles,
  ShieldCheck,
  Layers,
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

  // Navigation tab: 'joint' for coordinated multi-department visits, 'individual' for single clearances
  const [plannerTab, setPlannerTab] = useState<'joint' | 'individual'>('joint');

  // Sub-view mode for individual tab: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Common filters
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [inspectorFilter, setInspectorFilter] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Individual Modals state
  const [selectedInspection, setSelectedInspection] = useState<PlannerInspection | null>(null);

  // Reschedule single inspection modal
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

  // Joint Inspection Modals State
  const [showScheduleJointModal, setShowScheduleJointModal] = useState(false);
  const [jointProjectId, setJointProjectId] = useState('');
  const [jointScheduledDate, setJointScheduledDate] = useState('');
  const [jointLocation, setJointLocation] = useState('');
  const [jointPurpose, setJointPurpose] = useState('');
  const [selectedClearanceIds, setSelectedClearanceIds] = useState<string[]>([]);
  const [assignedInspectorsMap, setAssignedInspectorsMap] = useState<Record<string, string>>({});
  const [jointScheduleError, setJointScheduleError] = useState<string | null>(null);

  // Reschedule Joint Modal State
  const [showRescheduleJointModal, setShowRescheduleJointModal] = useState(false);
  const [selectedJointPlan, setSelectedJointPlan] = useState<JointInspectionPlan | null>(null);
  const [jointRescheduleDate, setJointRescheduleDate] = useState('');
  const [jointRescheduleLocation, setJointRescheduleLocation] = useState('');
  const [jointRescheduleReason, setJointRescheduleReason] = useState('');
  const [expandedFindingsMap, setExpandedFindingsMap] = useState<Record<string, boolean>>({});

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

  // Fetch individual planner inspections
  const effectiveDeptId = isOfficer ? (user?.department?.id || undefined) : (departmentFilter || undefined);
  const effectiveInspectorId = isInspector ? user?.id : (inspectorFilter || undefined);

  const {
    data: inspections = [],
    isLoading: isLoadingIndividual,
    error: individualError,
    refetch: refetchIndividual,
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

  // Fetch coordinated joint plans
  const {
    data: jointPlans = [],
    isLoading: isLoadingJoint,
    error: jointError,
    refetch: refetchJoint,
  } = useQuery({
    queryKey: [
      'joint-plans',
      {
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
      },
    ],
    queryFn: () =>
      inspectionsApi.listJointPlans({
        status: statusFilter || undefined,
        date_from: dateFrom,
        date_to: dateTo,
      }),
  });

  // Fetch projects list for scheduling joint visit modal
  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list(),
    enabled: showScheduleJointModal,
  });

  // Fetch project-specific joint data when a project is selected in the modal
  const { data: projectJointDetails, isLoading: isLoadingProjectJoint } = useQuery({
    queryKey: ['project-joint-details', jointProjectId],
    queryFn: () => inspectionsApi.getProjectJoint(jointProjectId),
    enabled: Boolean(jointProjectId && showScheduleJointModal),
  });

  // Individual Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date, notes }: { id: string; date: string; notes?: string }) =>
      inspectionsApi.update(id, {
        action: 'reschedule',
        scheduled_date: new Date(date),
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['joint-plans'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowRescheduleModal(false);
      setRescheduleDate('');
      setRescheduleNotes('');
    },
  });

  // Individual Assign inspector mutation
  const assignInspectorMutation = useMutation({
    mutationFn: ({ id, inspector_id }: { id: string; inspector_id: string }) =>
      inspectionsApi.update(id, {
        action: 'assign_inspector',
        inspector_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['joint-plans'] });
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
      qc.invalidateQueries({ queryKey: ['joint-plans'] });
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
      qc.invalidateQueries({ queryKey: ['joint-plans'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowFindingModal(false);
      setFindingDesc('');
      setFindingCorrective('');
      setFindingStatus('COMPLIANT');
    },
  });

  // Schedule Joint Inspection mutation
  const scheduleJointMutation = useMutation({
    mutationFn: (data: {
      project_id: string;
      scheduled_date: string;
      location?: string;
      purpose?: string;
      departments: Array<{ application_id: string; department_id: string; inspector_id?: string }>;
    }) => inspectionsApi.scheduleJoint(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['joint-plans'] });
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowScheduleJointModal(false);
      setJointProjectId('');
      setJointScheduledDate('');
      setJointLocation('');
      setJointPurpose('');
      setSelectedClearanceIds([]);
      setAssignedInspectorsMap({});
      setJointScheduleError(null);
    },
    onError: (err: Error) => {
      setJointScheduleError(err.message || 'Failed to schedule joint visit.');
    },
  });

  // Reschedule Joint Inspection mutation
  const rescheduleJointMutation = useMutation({
    mutationFn: (data: {
      project_id: string;
      inspection_ids: string[];
      new_date: string;
      location?: string;
      reason?: string;
    }) => inspectionsApi.rescheduleJoint(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['joint-plans'] });
      qc.invalidateQueries({ queryKey: ['planner-inspections'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setShowRescheduleJointModal(false);
      setSelectedJointPlan(null);
      setJointRescheduleDate('');
      setJointRescheduleLocation('');
      setJointRescheduleReason('');
    },
  });

  // Joint metrics
  const totalJointPlans = jointPlans.length;
  const jointConflictCount = jointPlans.filter((p) => p.has_conflicts).length;
  const jointTotalParticipatingDepts = jointPlans.reduce((sum, p) => sum + p.total_departments, 0);
  const jointCompletedCount = jointPlans.filter((p) => p.status === 'COMPLETED').length;

  // Individual metrics
  const totalIndividualInspections = inspections.length;
  const individualConflictCount = inspections.filter((i) => i.has_conflict).length;
  const individualScheduledCount = inspections.filter((i) => i.status === 'SCHEDULED' || i.status === 'RESCHEDULED').length;
  const individualCompletedCount = inspections.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold">
                PS 26130 Joint Inspection Planner
              </span>
              {isInspector && (
                <span className="badge bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold">
                  Designated Officer Desk
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Joint Inspection & Site Visit Coordination</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Single-window multi-department statutory inspections, shared calendars, conflict resolution, and synchronized findings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action: Schedule Joint Visit */}
            {(isOfficer || isNodal || isAdmin) && (
              <button
                type="button"
                onClick={() => {
                  setJointScheduleError(null);
                  setShowScheduleJointModal(true);
                }}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Joint Visit
              </button>
            )}

            {/* Main Tab Toggle: Joint Plans vs Individual Inspections */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setPlannerTab('joint')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  plannerTab === 'joint'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Coordinated Joint Plans ({jointPlans.length})
              </button>
              <button
                type="button"
                onClick={() => setPlannerTab('individual')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  plannerTab === 'individual'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Individual Clearance Visits ({inspections.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Strip */}
        {plannerTab === 'joint' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 border-l-4 border-l-purple-500">
              <span className="text-xs text-gray-500 font-medium">Coordinated Joint Visits</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalJointPlans}</p>
              <p className="text-[11px] text-purple-700 mt-0.5">Multi-department visits synchronized</p>
            </div>

            <div className="card p-4 border-l-4 border-l-blue-500">
              <span className="text-xs text-gray-500 font-medium">Participating Clearances</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{jointTotalParticipatingDepts}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">Clearances inspected jointly</p>
            </div>

            <div
              className={`card p-4 border-l-4 ${
                jointConflictCount > 0 ? 'border-l-amber-500 bg-amber-50/20' : 'border-l-emerald-500'
              }`}
            >
              <span className="text-xs text-gray-500 font-medium">Scheduling Conflicts</span>
              <p className={`text-2xl font-bold mt-1 ${jointConflictCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {jointConflictCount}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {jointConflictCount > 0 ? 'Officer or date conflicts flagged' : 'Zero scheduling conflicts'}
              </p>
            </div>

            <div className="card p-4 border-l-4 border-l-emerald-500">
              <span className="text-xs text-gray-500 font-medium">Completed Joint Visits</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{jointCompletedCount}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Site verification completed</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 border-l-4 border-l-blue-500">
              <span className="text-xs text-gray-500 font-medium">Total Scheduled Visits</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{individualScheduledCount}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">Individual department visits</p>
            </div>

            <div
              className={`card p-4 border-l-4 ${
                individualConflictCount > 0 ? 'border-l-amber-500 bg-amber-50/20' : 'border-l-emerald-500'
              }`}
            >
              <span className="text-xs text-gray-500 font-medium">Officer Conflicts</span>
              <p className={`text-2xl font-bold mt-1 ${individualConflictCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {individualConflictCount}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {individualConflictCount > 0 ? 'Concurrent visits flagged' : 'No inspector conflicts'}
              </p>
            </div>

            <div className="card p-4 border-l-4 border-l-emerald-500">
              <span className="text-xs text-gray-500 font-medium">Completed Clearances</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{individualCompletedCount}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Findings recorded</p>
            </div>

            <div className="card p-4 border-l-4 border-l-purple-500">
              <span className="text-xs text-gray-500 font-medium">Designated Inspectors</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{inspectors.length}</p>
              <p className="text-[11px] text-purple-700 mt-0.5">Officers on roster</p>
            </div>
          </div>
        )}

        {/* Global Conflict Warning Alert if any */}
        {(plannerTab === 'joint' ? jointConflictCount > 0 : individualConflictCount > 0) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-900">
                Joint Inspection Scheduling Conflict Detected ({plannerTab === 'joint' ? jointConflictCount : individualConflictCount})
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                One or more designated inspection officers have concurrent site visits on the same date or unassigned roles.
                Inspect the flagged cards below to synchronize dates or re-assign officers to minimize applicant disruption.
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

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-base py-1.5 w-auto text-xs font-medium"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Department filter (Individual tab only) */}
              {plannerTab === 'individual' && (isNodal || isAdmin) && (
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

              {/* Inspector filter (Individual tab only) */}
              {plannerTab === 'individual' && !isInspector && (
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

            {/* Right Sub-view Switcher if on Individual Tab */}
            {plannerTab === 'individual' ? (
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md ${
                    viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Timeline
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 font-medium">
                Showing {jointPlans.length} coordinated plan{jointPlans.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: COORDINATED JOINT PLANS VIEW                                     */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {plannerTab === 'joint' && (
          <div className="space-y-4">
            {jointError && <ErrorState message={(jointError as Error).message} onRetry={() => refetchJoint()} />}

            {!isLoadingJoint && jointPlans.length === 0 && (
              <EmptyState
                title="No coordinated joint inspection plans found"
                description="No multi-department visits have been scheduled matching the selected filters. Use 'Schedule Joint Visit' to coordinate participating departments."
              />
            )}

            {isLoadingJoint && (
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="card p-6 animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                    <div className="h-20 bg-gray-50 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {jointPlans.map((plan) => {
              const isExpanded = Boolean(expandedFindingsMap[plan.id]);

              return (
                <div
                  key={plan.id}
                  className={`card p-5 space-y-4 border transition-all ${
                    plan.has_conflicts ? 'border-amber-300 bg-white shadow-xs' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge bg-purple-100 text-purple-800 text-[11px] font-bold">
                          {plan.total_departments} Departments Joint Visit
                        </span>
                        <StatusBadge status={plan.status} size="sm" />
                        {plan.has_conflicts && (
                          <span className="badge bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Scheduling Conflict
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mt-1">{plan.project_name}</h3>
                      <p className="text-xs text-gray-500">
                        {plan.organization_name} &bull; <span className="font-medium text-gray-700">{plan.district} Jurisdiction</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs sm:text-sm">
                          <CalendarIcon className="w-4 h-4 text-blue-600" />
                          {formatDate(plan.scheduled_date)}
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {new Date(plan.scheduled_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Reschedule Button */}
                      {(isOfficer || isNodal || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJointPlan(plan);
                            setJointRescheduleDate(plan.scheduled_date ? plan.scheduled_date.slice(0, 16) : '');
                            setJointRescheduleLocation(plan.location || '');
                            setJointRescheduleReason('');
                            setShowRescheduleJointModal(true);
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 ml-2"
                        >
                          Reschedule Joint Visit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location & Site Information */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800">Site Location:</span>
                    <span className="truncate">{plan.location || 'Site location defined in project dossier'}</span>
                  </div>

                  {/* Conflict Warnings if any */}
                  {plan.has_conflicts && plan.conflict_warnings.length > 0 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-lg space-y-1">
                      <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        Scheduling Coordination Flags:
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 ml-1">
                        {plan.conflict_warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Participating Regulatory Departments Table */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Participating Department Clearances & Designated Officers
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold text-[11px]">
                          <tr>
                            <th className="px-3 py-2">Regulatory Authority</th>
                            <th className="px-3 py-2">Approval Clearance</th>
                            <th className="px-3 py-2">Application No.</th>
                            <th className="px-3 py-2">Designated Inspector</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {plan.departments.map((dept) => (
                            <tr key={dept.inspection_id} className="hover:bg-gray-50/60">
                              <td className="px-3 py-2.5 font-semibold text-gray-900">
                                {dept.department_name}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 font-medium">
                                {dept.approval_name}
                              </td>
                              <td className="px-3 py-2.5">
                                <Link
                                  href={`/government/work-queue?application_id=${dept.application_id}`}
                                  className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  {dept.application_number}
                                  <ArrowUpRight className="w-2.5 h-2.5 text-gray-400" />
                                </Link>
                              </td>
                              <td className="px-3 py-2.5">
                                {dept.inspector_name ? (
                                  <div>
                                    <span className="font-semibold text-gray-900 flex items-center gap-1">
                                      <User className="w-3 h-3 text-purple-600" />
                                      {dept.inspector_name}
                                    </span>
                                    <span className="text-[10px] text-gray-400 block">{dept.inspector_email}</span>
                                  </div>
                                ) : (
                                  <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                    Unassigned Officer
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <StatusBadge status={dept.status} size="sm" />
                              </td>
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                <Link
                                  href={`/government/work-queue?application_id=${dept.application_id}`}
                                  className="text-xs text-blue-600 font-semibold hover:underline"
                                >
                                  View Dossier &rarr;
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Consolidated Findings Strip */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-gray-800">
                          Consolidated Joint Findings ({plan.findings_summary.total})
                        </span>
                        {plan.findings_summary.critical > 0 && (
                          <span className="badge bg-red-100 text-red-800 text-[10px] font-bold">
                            {plan.findings_summary.critical} Critical
                          </span>
                        )}
                        {plan.findings_summary.high > 0 && (
                          <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {plan.findings_summary.high} High
                          </span>
                        )}
                        {plan.findings_summary.medium > 0 && (
                          <span className="badge bg-blue-100 text-blue-800 text-[10px] font-bold">
                            {plan.findings_summary.medium} Medium
                          </span>
                        )}
                        {plan.findings_summary.low > 0 && (
                          <span className="badge bg-gray-100 text-gray-700 text-[10px] font-bold">
                            {plan.findings_summary.low} Low
                          </span>
                        )}
                      </div>

                      {plan.consolidated_findings.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedFindingsMap((prev) => ({
                              ...prev,
                              [plan.id]: !prev[plan.id],
                            }))
                          }
                          className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                        >
                          {isExpanded ? 'Hide Findings' : 'View All Observations'}
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Expanded Findings Details */}
                    {isExpanded && plan.consolidated_findings.length > 0 && (
                      <div className="mt-3 space-y-2 pt-2">
                        {plan.consolidated_findings.map((f) => (
                          <div key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">
                                {f.department_name} &bull; {f.approval_name}
                              </span>
                              <span
                                className={`badge text-[10px] font-bold ${
                                  f.severity === 'CRITICAL'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : f.severity === 'HIGH'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {f.severity}
                              </span>
                            </div>
                            <p className="text-gray-700">{f.description}</p>
                            {f.corrective_action && (
                              <p className="text-[11px] text-gray-500">
                                <strong className="text-gray-700">Corrective Action Required:</strong> {f.corrective_action}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: INDIVIDUAL CLEARANCE INSPECTIONS VIEW                            */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {plannerTab === 'individual' && viewMode === 'list' && (
          <div className="card overflow-hidden">
            {individualError && <ErrorState message={(individualError as Error).message} onRetry={() => refetchIndividual()} />}
            {!isLoadingIndividual && inspections.length === 0 && (
              <EmptyState
                title="No individual inspections found"
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
                    {isLoadingIndividual && [...Array(4)].map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
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

        {/* Individual Timeline View */}
        {plannerTab === 'individual' && viewMode === 'calendar' && (
          <div className="space-y-4">
            {inspections.length === 0 && (
              <EmptyState
                title="No visits on timeline"
                description="No site inspections match the current filters."
              />
            )}

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

                            {insp.has_conflict && (
                              <div className="mt-2.5 p-2 bg-amber-100/70 border border-amber-300 rounded-lg text-[10px] text-amber-900 leading-tight">
                                <p className="font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  Scheduling Feasibility Notice:
                                </p>
                                <p className="mt-0.5">{insp.conflict_reason}</p>
                              </div>
                            )}

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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: SCHEDULE JOINT VISIT                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showScheduleJointModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">Schedule Coordinated Joint Inspection</h3>
              </div>
              <button
                onClick={() => setShowScheduleJointModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {jointScheduleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{jointScheduleError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Step 1: Select Project */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  1. Select Investment Project:
                </label>
                <select
                  value={jointProjectId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setJointProjectId(pid);
                    setSelectedClearanceIds([]);
                    setAssignedInspectorsMap({});
                    setJointScheduleError(null);
                  }}
                  className="input-base text-xs w-full font-medium"
                >
                  <option value="">-- Choose Project --</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.district}) &bull; {p.organization?.legal_name || 'Enterprise'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Clearances needing inspection */}
              {jointProjectId && (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 block">
                      2. Select Participating Clearances (Minimum 2 recommended for Joint Visit):
                    </label>
                    <span className="text-[11px] text-purple-700 font-semibold">
                      {selectedClearanceIds.length} selected
                    </span>
                  </div>

                  {isLoadingProjectJoint ? (
                    <div className="p-4 text-center text-xs text-gray-500">Loading project clearances...</div>
                  ) : (() => {
                    const eligibleClearances = (projectJointDetails?.clearances_requiring_inspection || []).filter(
                      (c): c is typeof c & { application_id: string; department_id: string } =>
                        Boolean(c.application_id && c.department_id)
                    );

                    if (eligibleClearances.length === 0) {
                      return (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                          No clearances requiring inspection were found for this project. Clearances must be in review or scheduled.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 border border-gray-200 rounded-lg p-2.5 max-h-56 overflow-y-auto bg-gray-50/50">
                        {eligibleClearances.map((c) => {
                          const isChecked = selectedClearanceIds.includes(c.application_id);

                          return (
                            <div
                              key={c.application_id}
                              className={`p-2.5 rounded-lg border text-xs transition-colors ${
                                isChecked ? 'bg-purple-50/70 border-purple-300' : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  id={`clr-${c.application_id}`}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedClearanceIds((prev) => [...prev, c.application_id]);
                                    } else {
                                      setSelectedClearanceIds((prev) => prev.filter((id) => id !== c.application_id));
                                    }
                                  }}
                                  className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <div className="flex-1">
                                  <label htmlFor={`clr-${c.application_id}`} className="font-bold text-gray-900 cursor-pointer">
                                    {c.approval_name}
                                  </label>
                                  <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-2">
                                    <span>Authority: <strong>{c.department_name}</strong></span>
                                    <span>&bull;</span>
                                    <span>App: <span className="font-mono">{c.application_number}</span></span>
                                    <span>&bull;</span>
                                    <span>Status: <StatusBadge status={c.application_status || 'UNDER_REVIEW'} size="sm" /></span>
                                  </div>

                                  {/* Inspector Selection for this clearance if selected */}
                                  {isChecked && (
                                    <div className="mt-2 pt-2 border-t border-purple-200/60 flex items-center gap-2">
                                      <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                                        Assign Inspector:
                                      </span>
                                      <select
                                        value={assignedInspectorsMap[c.application_id] || ''}
                                        onChange={(e) => {
                                          const insId = e.target.value;
                                          setAssignedInspectorsMap((prev) => ({
                                            ...prev,
                                            [c.application_id]: insId,
                                          }));
                                        }}
                                        className="input-base text-[11px] py-1 w-full"
                                      >
                                        <option value="">-- Assign Designated Inspector (Optional) --</option>
                                        {inspectors
                                          .filter((ins) => !ins.department_id || ins.department_id === c.department_id)
                                          .map((ins) => (
                                            <option key={ins.id} value={ins.id}>
                                              {ins.name} ({ins.email})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Step 3: Date, Location, Purpose */}
              {jointProjectId && selectedClearanceIds.length > 0 && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        3. Coordinated Date & Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={jointScheduledDate}
                        onChange={(e) => setJointScheduledDate(e.target.value)}
                        className="input-base text-xs w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Site Location:
                      </label>
                      <input
                        type="text"
                        value={jointLocation}
                        onChange={(e) => setJointLocation(e.target.value)}
                        placeholder="e.g. Plot No 42, MIDC Chakan Phase II, Pune"
                        className="input-base text-xs w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Joint Visit Objective & Coordination Protocol:
                    </label>
                    <textarea
                      rows={2}
                      value={jointPurpose}
                      onChange={(e) => setJointPurpose(e.target.value)}
                      placeholder="e.g. Joint technical inspection by DISH, MPCB, and MIDC Planning authority."
                      className="input-base text-xs w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowScheduleJointModal(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !jointProjectId ||
                  selectedClearanceIds.length === 0 ||
                  !jointScheduledDate ||
                  scheduleJointMutation.isPending
                }
                onClick={() => {
                  if (!projectJointDetails) return;
                  const departmentsPayload = selectedClearanceIds.map((appId) => {
                    const match = projectJointDetails.clearances_requiring_inspection.find(
                      (c) => c.application_id === appId
                    );
                    return {
                      application_id: appId,
                      department_id: match?.department_id || '',
                      inspector_id: assignedInspectorsMap[appId] || undefined,
                    };
                  });

                  scheduleJointMutation.mutate({
                    project_id: jointProjectId,
                    scheduled_date: jointScheduledDate,
                    location: jointLocation || undefined,
                    purpose: jointPurpose || undefined,
                    departments: departmentsPayload,
                  });
                }}
                className="btn-primary text-xs py-1.5 px-4 bg-blue-600 hover:bg-blue-700"
              >
                {scheduleJointMutation.isPending ? 'Scheduling Joint Visit...' : 'Confirm Coordinated Joint Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RESCHEDULE JOINT VISIT                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showRescheduleJointModal && selectedJointPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">Reschedule Coordinated Joint Visit</h3>
              </div>
              <button
                onClick={() => setShowRescheduleJointModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Synchronize the new date and site location for all <strong>{selectedJointPlan.total_departments}</strong> participating
              regulatory authorities of <strong>{selectedJointPlan.project_name}</strong> in a single atomic transaction.
            </p>

            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 text-xs space-y-1">
              <span className="font-bold text-purple-900 block">Participating Department Clearances:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedJointPlan.departments.map((d) => (
                  <span key={d.inspection_id} className="badge bg-white text-gray-800 border border-purple-200 text-[10px]">
                    {d.department_name} ({d.application_number})
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  New Coordinated Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={jointRescheduleDate}
                  onChange={(e) => setJointRescheduleDate(e.target.value)}
                  className="input-base text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Updated Location (Optional):
                </label>
                <input
                  type="text"
                  value={jointRescheduleLocation}
                  onChange={(e) => setJointRescheduleLocation(e.target.value)}
                  className="input-base text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Rescheduling Justification & Coordination Notes:
                </label>
                <textarea
                  rows={3}
                  value={jointRescheduleReason}
                  onChange={(e) => setJointRescheduleReason(e.target.value)}
                  placeholder="e.g. Joint date coordinated per applicant readiness and inter-departmental consensus."
                  className="input-base text-xs w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRescheduleJointModal(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!jointRescheduleDate || rescheduleJointMutation.isPending}
                onClick={() => {
                  rescheduleJointMutation.mutate({
                    project_id: selectedJointPlan.project_id,
                    inspection_ids: selectedJointPlan.departments.map((d) => d.inspection_id),
                    new_date: jointRescheduleDate,
                    location: jointRescheduleLocation || undefined,
                    reason: jointRescheduleReason || undefined,
                  });
                }}
                className="btn-primary text-xs py-1.5 px-4 bg-purple-600 hover:bg-purple-700"
              >
                {rescheduleJointMutation.isPending ? 'Synchronizing Dates...' : 'Confirm Synchronized Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RESCHEDULE SINGLE INSPECTION                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ASSIGN INSPECTOR                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RECORD FINDINGS                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
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
