'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { approvalTypesApi, projectsApi } from '@/lib/api';
import type { ApprovalType, Project } from '@/types';
import {
  Compass,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  RotateCcw,
  FileText,
  Building2,
  ArrowRight,
  Layers,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';

export default function ApprovalDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedInspection, setSelectedInspection] = useState<string>('ALL');
  const [selectedRenewal, setSelectedRenewal] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-abc-foods-001');

  // Expanded cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Applicability check modal / drawer state
  const [activeCheckResult, setActiveCheckResult] = useState<{
    approval_type_id: string;
    approval_name: string;
    authority: string;
    project_id: string;
    project_name: string;
    applicable: boolean;
    reason: string;
    matched_rules: string[];
    status_in_project: string | null;
    application_id: string | null;
    application_status: string | null;
    requires_inspection: boolean;
    default_sla_days: number;
    renewal_period_days: number | null;
    document_requirements: any[];
    prerequisites: any[];
  } | null>(null);

  // 1. Fetch all approval types catalogue
  const {
    data: approvals,
    isLoading: approvalsLoading,
    error: approvalsError,
  } = useQuery({
    queryKey: ['approval-types-catalogue'],
    queryFn: () => approvalTypesApi.list(),
  });

  // 2. Fetch projects for the project selector dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // Check Applicability mutation
  const checkApplicabilityMutation = useMutation({
    mutationFn: ({ approvalId, projectId }: { approvalId: string; projectId: string }) =>
      approvalTypesApi.checkApplicability(approvalId, projectId),
    onSuccess: (data) => {
      setActiveCheckResult(data);
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Distinct authorities & categories for filter dropdowns
  const authorities = useMemo(() => {
    if (!approvals) return [];
    return Array.from(new Set(approvals.map((a) => a.authority))).sort();
  }, [approvals]);

  const categories = useMemo(() => {
    if (!approvals) return [];
    return Array.from(new Set(approvals.map((a) => a.category))).sort();
  }, [approvals]);

  // Filtered approvals list
  const filteredApprovals = useMemo(() => {
    if (!approvals) return [];

    return approvals.filter((a) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(term);
        const matchesAuthority = a.authority.toLowerCase().includes(term);
        const matchesCategory = a.category.toLowerCase().includes(term);
        const matchesDesc = (a.description || '').toLowerCase().includes(term);
        const matchesPurpose = (a.purpose || '').toLowerCase().includes(term);
        if (!matchesName && !matchesAuthority && !matchesCategory && !matchesDesc && !matchesPurpose) {
          return false;
        }
      }

      // Authority filter
      if (selectedAuthority !== 'ALL' && a.authority !== selectedAuthority) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && a.category !== selectedCategory) {
        return false;
      }

      // Inspection filter
      if (selectedInspection === 'REQUIRED' && !a.requires_inspection) {
        return false;
      }
      if (selectedInspection === 'NOT_REQUIRED' && a.requires_inspection) {
        return false;
      }

      // Renewal filter
      if (selectedRenewal === 'HAS_RENEWAL' && !a.renewal_period_days) {
        return false;
      }
      if (selectedRenewal === 'PERMANENT' && !!a.renewal_period_days) {
        return false;
      }

      // Stage filter (matches category or applicability rules conditions)
      if (selectedStage !== 'ALL') {
        const isPreEstablishment =
          a.category.toLowerCase().includes('environment') ||
          a.category.toLowerCase().includes('fire') ||
          a.name.toLowerCase().includes('establish') ||
          a.name.toLowerCase().includes('plan');
        const isPreOperation =
          a.category.toLowerCase().includes('operate') ||
          a.name.toLowerCase().includes('operate') ||
          a.name.toLowerCase().includes('license') ||
          a.name.toLowerCase().includes('water') ||
          a.name.toLowerCase().includes('power');

        if (selectedStage === 'PRE_ESTABLISHMENT' && !isPreEstablishment) return false;
        if (selectedStage === 'PRE_OPERATION' && !isPreOperation) return false;
      }

      return true;
    });
  }, [approvals, searchTerm, selectedAuthority, selectedCategory, selectedInspection, selectedRenewal, selectedStage]);

  const activeProject = projects?.find((p) => p.id === selectedProjectId);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedAuthority('ALL');
    setSelectedCategory('ALL');
    setSelectedStage('ALL');
    setSelectedInspection('ALL');
    setSelectedRenewal('ALL');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-700 tracking-wide uppercase">
            <span>Udyog Setu Single Window</span>
            <span>•</span>
            <span>Approval & Permission Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-primary-600" />
            Statutory Clearances & Permissions Directory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Explore all statutory approvals, NOCs, licenses and utility connections administered across Maharashtra State departments.
          </p>
        </div>

        {/* Project Selector for Live Applicability Checking */}
        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-3 self-start md:self-auto">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400">
              Active Project Context:
            </label>
            <select
              className="text-xs font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects && projects.length > 0 ? (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sector})
                  </option>
                ))
              ) : (
                <option value="proj-abc-foods-001">ABC Foods Processing Facility</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Clearances</span>
            <Layers className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{approvals?.length ?? 0}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Active single window approvals</p>
        </div>

        <div className="card p-4 border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Regulating Authorities</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{authorities.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">MPCB, MIDC, DISH, Fire, FSSAI...</p>
        </div>

        <div className="card p-4 border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Site Inspection Regimes</span>
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {approvals?.filter((a) => a.requires_inspection).length ?? 0}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Statutory pre-grant inspections</p>
        </div>

        <div className="card p-4 border border-gray-100 shadow-sm bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Periodic Renewals</span>
            <RotateCcw className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {approvals?.filter((a) => !!a.renewal_period_days).length ?? 0}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Time-bound statutory renewal</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card p-4 bg-white border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              className="input-base pl-9 text-xs"
              placeholder="Search permissions by name, department, category, or legal purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filter: Authority */}
          <select
            className="input-base text-xs md:w-56"
            value={selectedAuthority}
            onChange={(e) => setSelectedAuthority(e.target.value)}
          >
            <option value="ALL">All Competent Authorities</option>
            {authorities.map((auth) => (
              <option key={auth} value={auth}>
                {auth}
              </option>
            ))}
          </select>

          {/* Quick Filter: Category */}
          <select
            className="input-base text-xs md:w-48"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Filters Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filters:
            </span>

            {/* Stage filter */}
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-gray-700"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="ALL">Lifecycle Stage: All</option>
              <option value="PRE_ESTABLISHMENT">Pre-Establishment</option>
              <option value="PRE_OPERATION">Pre-Operation</option>
            </select>

            {/* Inspection filter */}
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-gray-700"
              value={selectedInspection}
              onChange={(e) => setSelectedInspection(e.target.value)}
            >
              <option value="ALL">Inspection: All</option>
              <option value="REQUIRED">Requires Site Inspection</option>
              <option value="NOT_REQUIRED">Desk Review Only</option>
            </select>

            {/* Renewal filter */}
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-gray-700"
              value={selectedRenewal}
              onChange={(e) => setSelectedRenewal(e.target.value)}
            >
              <option value="ALL">Renewal: All</option>
              <option value="HAS_RENEWAL">Periodic Renewal Required</option>
              <option value="PERMANENT">Permanent / One-time</option>
            </select>

            {(searchTerm ||
              selectedAuthority !== 'ALL' ||
              selectedCategory !== 'ALL' ||
              selectedStage !== 'ALL' ||
              selectedInspection !== 'ALL' ||
              selectedRenewal !== 'ALL') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] text-primary-600 hover:text-primary-800 font-semibold underline ml-1"
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="text-gray-500 font-medium text-xs">
            Showing <span className="font-bold text-gray-900">{filteredApprovals.length}</span> permissions
          </div>
        </div>
      </div>

      {/* Directory Grid of Approvals */}
      {approvalsLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : approvalsError ? (
        <ErrorState
          message="Failed to load approval catalogue from statutory registry. Please retry."
        />
      ) : filteredApprovals.length === 0 ? (
        <EmptyState
          title="No Matching Clearances Found"
          description="Try broadening your search query or removing filter parameters."
          action={
            <button onClick={resetFilters} className="btn-primary text-xs">
              Clear Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => {
            const isExpanded = !!expandedCards[approval.id];
            const isChecking =
              checkApplicabilityMutation.isPending &&
              checkApplicabilityMutation.variables?.approvalId === approval.id;

            const docCount = approval.document_requirements?.length ?? 0;
            const prereqList = (approval.dependent_on || [])
              .map((d: any) => d.prerequisite_approval)
              .filter(Boolean);

            return (
              <div
                key={approval.id}
                className="card p-5 bg-white border border-gray-200 hover:border-primary-300 transition-all shadow-sm rounded-xl"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-gray-900">{approval.name}</h2>
                      <span className="badge bg-primary-50 text-primary-700 border border-primary-200 font-medium">
                        {approval.authority}
                      </span>
                      <span className="badge bg-gray-100 text-gray-600 border border-gray-200 uppercase text-[10px]">
                        {approval.category.replace(/_/g, ' ')}
                      </span>
                      {approval.prescribed_form && (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                          Prescribed Form
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">{approval.description}</p>
                  </div>

                  {/* Check Applicability CTA Button */}
                  <div className="flex-shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() =>
                        checkApplicabilityMutation.mutate({
                          approvalId: approval.id,
                          projectId: selectedProjectId,
                        })
                      }
                      disabled={isChecking}
                      className="btn-primary text-xs inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 shadow-sm"
                      title={`Evaluate if this clearance applies to ${activeProject?.name ?? 'current project'}`}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Check Applicability
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Statutory Badges Ribbon */}
                <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-primary-600" />
                    <span className="font-semibold text-gray-900">{approval.default_sla_days}</span>
                    <span>Days Statutory SLA</span>
                  </div>

                  <span className="text-gray-300">•</span>

                  <div className="flex items-center gap-1 text-gray-700">
                    <ClipboardCheck
                      className={`w-3.5 h-3.5 ${
                        approval.requires_inspection ? 'text-amber-600' : 'text-gray-400'
                      }`}
                    />
                    <span>
                      {approval.requires_inspection
                        ? 'Mandatory Site Inspection'
                        : 'Desk Scrutiny Only'}
                    </span>
                  </div>

                  <span className="text-gray-300">•</span>

                  <div className="flex items-center gap-1 text-gray-700">
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        approval.renewal_period_days ? 'text-purple-600' : 'text-gray-400'
                      }`}
                    />
                    <span>
                      {approval.renewal_period_days
                        ? `Valid for ${Math.round(approval.renewal_period_days / 365)} Year(s)`
                        : 'Permanent / One-Time Grant'}
                    </span>
                  </div>

                  <span className="text-gray-300">•</span>

                  <div className="flex items-center gap-1 text-gray-700">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>{docCount} Required Document(s)</span>
                  </div>

                  {prereqList.length > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Chained: {prereqList.length} Prerequisite(s)</span>
                      </div>
                    </>
                  )}

                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={() => toggleExpand(approval.id)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          Hide Details <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          View Requirements & Rules <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in bg-gray-50/60 p-4 rounded-xl">
                    {/* Purpose */}
                    {approval.purpose && (
                      <div>
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Statutory Purpose & Legal Basis:
                        </p>
                        <p className="text-xs text-gray-700 mt-1">{approval.purpose}</p>
                      </div>
                    )}

                    {/* Prerequisites */}
                    {prereqList.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Mandatory Upstream Prerequisites:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {prereqList.map((prereq: any) => (
                            <span
                              key={prereq.id}
                              className="badge bg-amber-50 text-amber-800 border border-amber-200 text-xs flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              {prereq.name} ({prereq.authority})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document Requirements */}
                    {approval.document_requirements && approval.document_requirements.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Required Filing Documents:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5">
                          {approval.document_requirements.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs flex items-start gap-2"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {doc.document_type.replace(/_/g, ' ')}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                  <span
                                    className={
                                      doc.mandatory
                                        ? 'text-red-600 font-semibold'
                                        : 'text-gray-400'
                                    }
                                  >
                                    {doc.mandatory ? 'Mandatory' : 'Optional'}
                                  </span>
                                  {doc.condition && <span>• {doc.condition}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Applicability Rules Summary */}
                    {approval.applicability_rules && approval.applicability_rules.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Regulatory Engine Matching Conditions:
                        </p>
                        <div className="space-y-1.5 mt-1.5">
                          {approval.applicability_rules.map((rule: any) => (
                            <div
                              key={rule.id}
                              className="text-xs text-gray-700 bg-white p-2.5 border border-gray-200 rounded-lg"
                            >
                              <span className="font-semibold text-gray-900">{rule.rule_name}</span>
                              <span className="text-gray-400 mx-1.5">|</span>
                              <span className="text-primary-700 font-medium">
                                Jurisdiction: {rule.jurisdiction}
                              </span>
                              {rule.sector && (
                                <>
                                  <span className="text-gray-400 mx-1.5">|</span>
                                  <span>Sector: {rule.sector}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Dialog for Check Applicability Result */}
      {activeCheckResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activeCheckResult.applicable
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {activeCheckResult.applicable ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {activeCheckResult.applicable
                      ? 'Clearance Applicable to Proposal'
                      : 'Clearance Not Currently Required'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Evaluation against proposal:{' '}
                    <span className="font-bold text-gray-800">
                      {activeCheckResult.project_name}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveCheckResult(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Approval Overview Box */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">
                  {activeCheckResult.approval_name}
                </span>
                <span className="badge bg-primary-50 text-primary-700 border border-primary-200 text-xs">
                  {activeCheckResult.authority}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Timeline: {activeCheckResult.default_sla_days} Days SLA</span>
                <span>•</span>
                <span>
                  {activeCheckResult.requires_inspection
                    ? 'Inspection Required'
                    : 'Desk Review'}
                </span>
                <span>•</span>
                <span>
                  {activeCheckResult.renewal_period_days
                    ? `Renew Every ${Math.round(activeCheckResult.renewal_period_days / 365)} Year`
                    : 'Permanent'}
                </span>
              </div>
            </div>

            {/* Applicability Explanation */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wide">
                Regulatory Decision Basis:
              </h3>
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                  activeCheckResult.applicable
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Sparkles
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      activeCheckResult.applicable ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <p className="font-semibold mb-1">
                      {activeCheckResult.applicable
                        ? 'Why this permission applies:'
                        : 'Applicability assessment:'}
                    </p>
                    <p>{activeCheckResult.reason}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Status */}
            {activeCheckResult.status_in_project && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>
                    Status in this project proposal:{' '}
                    <span className="font-bold">{activeCheckResult.status_in_project}</span>
                  </span>
                </div>
                {activeCheckResult.application_id && (
                  <Link
                    href={`/app/applications/${activeCheckResult.application_id}`}
                    className="text-xs font-bold text-primary-700 hover:underline inline-flex items-center gap-1"
                  >
                    Open Application <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Prerequisites Checklist */}
            {activeCheckResult.prerequisites && activeCheckResult.prerequisites.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-gray-700">Required Prerequisites:</h4>
                <div className="space-y-1">
                  {activeCheckResult.prerequisites.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="text-[11px] text-gray-500 font-semibold">{p.authority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveCheckResult(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              {activeCheckResult.applicable && (
                <Link
                  href={`/app/projects/${activeCheckResult.project_id}`}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  Go to Project Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
