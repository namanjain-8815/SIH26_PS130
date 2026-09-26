'use client';

import { useQuery } from '@tanstack/react-query';
import { governmentApi } from '@/lib/api';
import { ErrorState } from '@/components/ui/States';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import type { AnalyticsSummary } from '@/types/api';

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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => governmentApi.analytics(),
  });

  const { data: bottlenecks } = useQuery({
    queryKey: ['bottlenecks'],
    queryFn: () => governmentApi.bottlenecks(),
  });

  if (isLoading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}
    </div>
  );
  if (error) return <div className="p-6"><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></div>;
  if (!data) return null;

  const analytics = data as AnalyticsSummary;

  const statusChartData = Object.entries(analytics.applications_by_status).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    value: count,
    color: STATUS_COLORS[status] ?? '#9ca3af',
  })).sort((a, b) => b.value - a.value);

  const districtData = Object.entries(analytics.applications_by_district).map(([district, count]) => ({
    name: district,
    count,
  })).sort((a, b) => b.count - a.count);

  const slaData = [
    { name: 'On Track', value: analytics.sla.on_track, color: '#16a34a' },
    { name: 'At Risk', value: analytics.sla.at_risk, color: '#ea580c' },
    { name: 'Breached', value: analytics.sla.breached, color: '#dc2626' },
    { name: 'Completed', value: analytics.sla.completed, color: '#2563eb' },
  ].filter(d => d.value > 0);

  const bn = bottlenecks as { bottlenecks: Array<{ category: string; count: number; description: string }> };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Scrutiny & Performance Analytics</h1>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Computed from stored application events and scrutiny transitions · Demonstration Data
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: analytics.total_applications, sub: 'All registered proposals', color: 'text-blue-600 bg-blue-50' },
          { label: 'Avg Scrutiny Duration', value: analytics.average_processing_days != null ? `${analytics.average_processing_days}d` : 'N/A', sub: 'Submitted → Scrutinized', color: 'text-amber-600 bg-amber-50' },
          { label: 'Time Limit Breaches', value: analytics.sla.breached, sub: analytics.sla.label, color: 'text-red-600 bg-red-50' },
          { label: 'Within Specified Limit', value: analytics.sla.on_track, sub: 'Compliant with timeline', color: 'text-green-600 bg-green-50' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card p-4">
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Applications by status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Applications by Scrutiny Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA breakdown */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Specified Time Limit Status</h2>
          <p className="text-xs text-gray-400 mb-4">{analytics.sla.label}</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={slaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine>
                {slaData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Applications by district */}
        {districtData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Applications by District</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={districtData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bottlenecks */}
        {bn?.bottlenecks?.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Process Bottlenecks</h2>
            <p className="text-xs text-gray-400 mb-3">Derived from stored application events and status records</p>
            <div className="space-y-3">
              {bn.bottlenecks.map((b) => (
                <div key={b.category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-800">{b.category}</p>
                      <span className="text-xs font-bold text-gray-900">{b.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${Math.min((b.count / analytics.total_applications) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
