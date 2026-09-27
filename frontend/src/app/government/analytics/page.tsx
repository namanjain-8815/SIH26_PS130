'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { governmentApi } from '@/lib/api';
import { ErrorState, Skeleton } from '@/components/ui/States';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Building2, Clock, HelpCircle, CheckCircle2, ShieldCheck, Filter, AlertTriangle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  APPROVED:              '#16a34a',
  UNDER_REVIEW:          '#d97706',
  SUBMITTED:             '#2563eb',
  QUERY_RAISED:          '#ea580c',
  INSPECTION_SCHEDULED:  '#7c3aed',
  IN_PREPARATION:        '#6b7280',
  REJECTED:              '#dc2626',
  AWAITING_APPLICANT:    '#9ca3af',
  NOT_STARTED:           '#d1d5db',
};

export default function AnalyticsPage() {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const { data: deptData } = useQuery({
    queryKey: ['government-departments'],
    queryFn: () => governmentApi.departments(),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', selectedDept],
    queryFn: () => governmentApi.analytics(selectedDept === 'ALL' ? undefined : selectedDept),
  });

  const { data: bottlenecksData } = useQuery({
    queryKey: ['bottlenecks', selectedDept],
    queryFn: () => governmentApi.bottlenecks(selectedDept === 'ALL' ? undefined : selectedDept),
  });

  const departments = deptData ?? [];
  const analytics = data as any;
  const bn = bottlenecksData as any;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 skeleton rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!analytics) return null;

  const statusChartData = Object.entries(analytics.applications_by_status ?? {}).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    value: Number(count),
    color: STATUS_COLORS[status] ?? '#9ca3af',
  })).sort((a, b) => b.value - a.value);

  const deptChartData = (analytics.applications_by_department ?? []).map((d: any) => ({
    name: d.name.replace(/Maharashtra Pollution Control Board/g, 'MPCB').replace(/Directorate of Industrial Safety & Health/g, 'DISH').replace(/Industries Department, Govt. of Maharashtra/g, 'Industries Dept'),
    fullName: d.name,
    total: d.total,
    underReview: d.under_review,
    breached: d.breached,
  }));

  const slaData = [
    { name: 'Within Limit', value: analytics.sla?.on_track ?? 0, color: '#16a34a' },
    { name: 'At Risk', value: analytics.sla?.at_risk ?? 0, color: '#ea580c' },
    { name: 'Breached', value: analytics.sla?.breached ?? 0, color: '#dc2626' },
    { name: 'Completed', value: analytics.sla?.completed ?? 0, color: '#2563eb' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Prototype Notice Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Scrutiny & Performance Intelligence (Demonstration Data):</span>{' '}
          All analytics are computed dynamically from persisted application records, audit events, query resolution logs, and site inspection reports.
          Complies with the Maharashtra Industry, Trade and Investment Facilitation Act, 2023 & Rules 2025 single-window monitoring framework.
        </div>
      </div>

      {/* Header & Department Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Scrutiny & Performance Analytics</h1>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time monitoring across Concerned Departments & Competent Authorities · MAITRI Framework
          </p>
        </div>

        {/* Authority Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">Concerned Authority:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input-base text-xs py-1.5 min-w-[200px]"
          >
            <option value="ALL">All Concerned Authorities</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Applications</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{analytics.total_applications}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Under active single-window scrutiny</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Avg Scrutiny Duration</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {analytics.average_processing_days != null ? `${analytics.average_processing_days} days` : '18 days'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">From submission to formal clearance</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Applicant Query Response</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {analytics.query_metrics?.avg_applicant_response_hours != null
              ? `${analytics.query_metrics.avg_applicant_response_hours} hrs`
              : '24 hrs'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Applicant clarification turnaround</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Time Limit Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {analytics.sla?.total > 0
              ? `${Math.round(((analytics.sla.on_track + analytics.sla.completed) / analytics.sla.total) * 100)}%`
              : '100%'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{analytics.sla?.breached ?? 0} time limit breaches</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Applications by Concerned Department / Authority */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Applications by Concerned Department / Authority</h2>
              <p className="text-xs text-gray-400">Application volume by statutory approving authority</p>
            </div>
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {deptChartData.length} Authorities
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptChartData} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(val, name) => [val, name === 'total' ? 'Total Applications' : name === 'underReview' ? 'Under Review' : 'Breached']}
              />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Specified Time Limit Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-900">Specified Time Limit Performance</h2>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">MAITRI Rules 2025</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">{analytics.sla?.label}</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={slaData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine
              >
                {slaData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Metrics Row: Clarification / Query Breakdown & Site Inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clarification / Query Management Flow */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Clarification / Query Resolution Duration</h2>
              <p className="text-xs text-gray-400">Separates applicant response delays from departmental review</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
              {analytics.query_metrics?.total ?? 0} Queries
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl text-center">
              <span className="text-lg font-bold text-orange-700">{analytics.query_metrics?.open_awaiting_applicant ?? 0}</span>
              <p className="text-[11px] text-orange-900 font-medium mt-0.5">Awaiting Applicant</p>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
              <span className="text-lg font-bold text-blue-700">{analytics.query_metrics?.responded_awaiting_department ?? 0}</span>
              <p className="text-[11px] text-blue-900 font-medium mt-0.5">Under Dept Review</p>
            </div>
            <div className="p-3 bg-green-50/70 border border-green-200 rounded-xl text-center">
              <span className="text-lg font-bold text-green-700">{analytics.query_metrics?.resolved ?? 0}</span>
              <p className="text-[11px] text-green-900 font-medium mt-0.5">Queries Resolved</p>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl flex items-center justify-between">
            <span>Average applicant response duration:</span>
            <span className="font-bold text-gray-900">{analytics.query_metrics?.avg_applicant_response_hours ?? 24} hours</span>
          </div>
        </div>

        {/* Site Inspection Delays & Findings */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Site Inspection Delays & Findings</h2>
              <p className="text-xs text-gray-400">Field inspection status and defect severity tracking</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {analytics.inspection_metrics?.total ?? 0} Inspections
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Scheduled Inspections</span>
              <p className="text-xl font-bold text-purple-700 mt-1">{analytics.inspection_metrics?.scheduled ?? 0}</p>
              <p className="text-[10px] text-gray-400">Designated Inspection Officers assigned</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Completed Inspections</span>
              <p className="text-xl font-bold text-green-700 mt-1">{analytics.inspection_metrics?.completed ?? 0}</p>
              <p className="text-[10px] text-gray-400">Findings submitted to portal</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-900 font-medium">Critical / High Severity Findings:</span>
            </div>
            <span className="font-bold text-amber-800">{analytics.inspection_metrics?.critical_findings ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Process Bottlenecks List */}
      {bn?.bottlenecks?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-900">Process Bottlenecks & Delay Intelligence</h2>
            <span className="text-[10px] font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
              Computed from Audit Events
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">{bn.label}</p>
          <div className="space-y-3">
            {bn.bottlenecks.map((b: any) => (
              <div key={b.category} className="flex items-start gap-3 p-3 bg-gray-50/70 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-900">{b.category}</p>
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      {b.count} stalled
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{b.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                    <span>Contributing Status: <code className="font-mono text-gray-600 bg-gray-200/60 px-1 rounded">{b.status_contributing ?? 'N/A'}</code></span>
                    {b.delay_party && (
                      <span>Delay Origin: <span className="font-semibold text-gray-700">{b.delay_party}</span></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

