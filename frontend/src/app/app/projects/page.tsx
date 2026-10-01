'use client';

import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/utils';
import type { Project } from '@/types';
import { FolderKanban, ArrowRight, MapPin, Briefcase, Users, Plus, Network, LayoutDashboard } from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const projects = (data ?? []) as Project[];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Project / Investment Proposals</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            All industrial undertakings & investment proposals registered under your applicant entity
          </p>
        </div>
        <Link href="/app/projects/new" className="btn-primary text-xs inline-flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" /> Register New Investment Proposal
        </Link>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <CardSkeleton key={i} lines={4} />)}
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="w-10 h-10" />}
          title="No investment proposals yet"
          description="Register your industrial undertaking to get a personalised permissions and approvals roadmap."
          action={
            <Link href="/app/projects/new" className="btn-primary text-xs mt-3 inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Start New Project Wizard
            </Link>
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="card p-5 hover:shadow-card-hover transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-primary-600" />
                </div>
                <StatusBadge status={project.stage ?? 'NOT_STARTED'} />
              </div>

              <Link href={`/app/projects/${project.id}`}>
                <h2 className="text-base font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                  {project.name}
                </h2>
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">{project.sector}</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {project.district}
                  {project.industrial_area ? ` · ${project.industrial_area}` : ''}
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  {project.employee_count} employees
                </div>
                <div className="text-gray-600">
                  <span className="text-gray-400">Investment: </span>
                  {formatCurrency(project.investment_amount)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-xs">
              <Link
                href={`/app/projects/${project.id}/dependency-graph`}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 font-medium"
              >
                <Network className="w-3.5 h-3.5 text-gray-400" /> Dependency Map
              </Link>
              <Link
                href={`/app/projects/${project.id}`}
                className="inline-flex items-center gap-1 text-primary-600 font-semibold hover:underline"
              >
                Control Centre <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
