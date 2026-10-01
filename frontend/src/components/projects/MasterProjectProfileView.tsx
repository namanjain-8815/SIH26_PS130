'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Building2,
  Briefcase,
  MapPin,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Edit3,
  Database,
  Save,
  X,
  Layers,
  FileCheck2,
  ExternalLink,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import { CardSkeleton, ErrorState } from '@/components/ui/States';
import { DigiLockerVerificationCard } from '@/components/documents/DigiLockerVerificationCard';

export default function MasterProjectProfileView({ params }: { params?: { id?: string } } = {}) {
  const routeParams = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const projectId = (params?.id || routeParams?.id || 'proj-abc-foods-001') as string;

  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Profile data query
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project-profile', projectId],
    queryFn: () => projectsApi.getProfile(projectId),
    enabled: !!projectId,
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string;
    investment_amount: number;
    employee_count: number;
    stage: string;
    district: string;
    industrial_area: string;
    address: string;
    legal_name: string;
    entity_type: string;
    pan: string;
    gstin: string;
    cin: string;
    registered_address: string;
    water_usage_kld: string;
    power_requirement_kva: string;
    pollution_category: string;
    representative_name: string;
    representative_designation: string;
    representative_email: string;
    representative_phone: string;
    representative_auth_letter: string;
  } | null>(null);

  const initEditForm = () => {
    if (!profile) return;
    setEditForm({
      name: profile.proposal.name,
      investment_amount: profile.proposal.investment_amount,
      employee_count: profile.proposal.employee_count,
      stage: profile.proposal.stage,
      district: profile.location.district,
      industrial_area: profile.location.industrial_area || 'MIDC',
      address: profile.location.address || '',
      legal_name: profile.entity.legal_name,
      entity_type: profile.entity.entity_type,
      pan: profile.entity.pan,
      gstin: profile.entity.gstin,
      cin: profile.entity.cin,
      registered_address: profile.entity.registered_address,
      water_usage_kld: profile.technical_attributes.water_usage_kld || '50',
      power_requirement_kva: profile.technical_attributes.power_requirement_kva || '500',
      pollution_category: profile.technical_attributes.pollution_category || 'red',
      representative_name: profile.technical_attributes.representative_name || 'Rajesh Sharma',
      representative_designation: profile.technical_attributes.representative_designation || 'Director & Authorized Signatory',
      representative_email: profile.technical_attributes.representative_email || 'rajesh.sharma@sahyadriagro.in',
      representative_phone: profile.technical_attributes.representative_phone || '+91 98201 12345',
      representative_auth_letter: profile.technical_attributes.representative_auth_letter || 'Board Resolution BR-2026-44',
    });
    setIsEditing(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  const updateMutation = useMutation({
    mutationFn: (body: any) => projectsApi.updateProfile(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-profile', projectId] });
      qc.invalidateQueries({ queryKey: ['control-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setIsEditing(false);
      setSaveSuccessMsg('Master profile & verified attributes updated successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setSaveErrorMsg(err.message || 'Failed to update profile. Please verify your entries.');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    updateMutation.mutate({
      name: editForm.name,
      investment_amount: Number(editForm.investment_amount),
      employee_count: Number(editForm.employee_count),
      stage: editForm.stage,
      district: editForm.district,
      industrial_area: editForm.industrial_area,
      address: editForm.address,
      legal_name: editForm.legal_name,
      entity_type: editForm.entity_type,
      pan: editForm.pan,
      gstin: editForm.gstin,
      cin: editForm.cin,
      registered_address: editForm.registered_address,
      attributes: {
        water_usage_kld: editForm.water_usage_kld,
        power_requirement_kva: editForm.power_requirement_kva,
        pollution_category: editForm.pollution_category,
        representative_name: editForm.representative_name,
        representative_designation: editForm.representative_designation,
        representative_email: editForm.representative_email,
        representative_phone: editForm.representative_phone,
        representative_auth_letter: editForm.representative_auth_letter,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorState
          message="Failed to load master project profile. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-700 tracking-wide uppercase">
            <Link href="/app/projects" className="hover:underline">
              Investment Proposals
            </Link>
            <span>•</span>
            <Link href={`/app/projects/${projectId}`} className="hover:underline">
              Control Centre
            </Link>
            <span>•</span>
            <span>Master Profile & Verified Data</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Master Business & Project Profile
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Certified baseline data repository automatically reused across all department single-window applications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href={`/app/projects/${projectId}`}
            className="btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Project Control Centre
          </Link>
          <button
            type="button"
            onClick={initEditForm}
            className="btn-primary text-xs inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Master Profile
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="flex-1 font-medium">{saveSuccessMsg}</p>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="flex-1">{saveErrorMsg}</p>
        </div>
      )}

      {/* Verified Single Window Dossier Ribbon Banner */}
      <div className="card p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="badge bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Single Window Data Reuse Standard
              </span>
              <span className="text-xs font-semibold text-emerald-700">100% Certified Data Match</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              Zero Redundant Data Entry Across Maharashtra Single-Window Departments
            </p>
            <p className="text-xs text-gray-600 max-w-3xl">
              Information shown below is verified against corporate incorporation certificates, GSTIN records, and MIDC land records. Department clearance applications (MPCB, DISH, MIDC, Fire, FSSAI) automatically pull these verified attributes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-white/80 px-3.5 py-2 rounded-xl border border-emerald-200 flex-shrink-0">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>{profile.reusable_fields.length} Reusable Master Fields</span>
          </div>
        </div>
      </div>

      {/* DigiLocker Verification — Prototype Simulation (P1.X) */}
      <DigiLockerVerificationCard projectId={projectId} />

      {/* Authority Representative & Statutory Signatory Card */}
      <div className="card p-6 bg-white border border-gray-200/90 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Authority Representative & Statutory Signatory</h2>
              <p className="text-[11px] text-gray-400">Section 7, Maharashtra Single Window Act 2023 · Empowered Officer</p>
            </div>
          </div>
          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
            Designated Representative Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 block">Representative Full Name</span>
            <p className="font-bold text-gray-900">
              {profile.technical_attributes?.representative_name || 'Rajesh Sharma'}
            </p>
          </div>

          <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 block">Designation / Role</span>
            <p className="font-semibold text-gray-800">
              {profile.technical_attributes?.representative_designation || 'Director & Authorized Signatory'}
            </p>
          </div>

          <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 block">Contact Mobile</span>
            <p className="font-semibold text-gray-800">
              {profile.technical_attributes?.representative_phone || '+91 98201 12345'}
            </p>
          </div>

          <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 block">Official Email</span>
            <p className="font-semibold text-gray-800 truncate">
              {profile.technical_attributes?.representative_email || 'rajesh.sharma@sahyadriagro.in'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>
              Authority Instrument:{' '}
              <strong className="font-mono text-emerald-950">
                {profile.technical_attributes?.representative_auth_letter || 'Board Resolution BR-2026-44 (Under Companies Act 2013)'}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={initEditForm}
            className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
          >
            Edit Representative Details
          </button>
        </div>
      </div>

      {/* 4 Pillars of Master Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Legal Entity Profile */}
        <div className="card p-6 bg-white border border-gray-200/90 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Legal Entity Profile</h2>
                <p className="text-[11px] text-gray-400">Corporate & tax identity</p>
              </div>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
              Verified Source
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span>Legal Entity Name</span>
                <span className="text-[10px] text-gray-400">MCA Corporate Master</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{profile.entity.legal_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Entity Structure</span>
                  <span className="text-[10px] text-gray-400">RoC</span>
                </div>
                <p className="font-semibold text-gray-900">{profile.entity.entity_type}</p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>CIN</span>
                  <span className="text-[10px] text-gray-400">MCA</span>
                </div>
                <p className="font-semibold text-gray-900 font-mono">{profile.entity.cin}</p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>PAN</span>
                  <span className="text-[10px] text-gray-400">CBDT</span>
                </div>
                <p className="font-semibold text-gray-900 font-mono">{profile.entity.pan}</p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>GSTIN</span>
                  <span className="text-[10px] text-gray-400">GST Portal</span>
                </div>
                <p className="font-semibold text-gray-900 font-mono">{profile.entity.gstin}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span>Registered Corporate Address</span>
                <span className="text-[10px] text-gray-400">Form INC-22</span>
              </div>
              <p className="font-medium text-gray-800 leading-relaxed">
                {profile.entity.registered_address}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Investment Proposal Profile */}
        <div className="card p-6 bg-white border border-gray-200/90 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Investment Proposal Scope</h2>
                <p className="text-[11px] text-gray-400">Scope, capital & employment</p>
              </div>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
              Verified Source
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span>Proposal / Facility Name</span>
                <span className="text-[10px] text-gray-400">Single Window Proposal</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{profile.proposal.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Industry Sector</span>
                  <span className="text-[10px] text-gray-400">NIC-2008</span>
                </div>
                <p className="font-semibold text-gray-900">{profile.proposal.sector}</p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Lifecycle Stage</span>
                  <span className="text-[10px] text-gray-400">Clearance Status</span>
                </div>
                <p className="font-semibold text-primary-700 capitalize">
                  {profile.proposal.stage.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Gross Capital Outlay</span>
                  <span className="text-[10px] text-gray-400">CA Certificate</span>
                </div>
                <p className="text-sm font-bold text-emerald-700">
                  {formatCurrency(profile.proposal.investment_amount)}
                </p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Workforce Headcount</span>
                  <span className="text-[10px] text-gray-400">Staffing Plan</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {profile.proposal.employee_count} Direct Personnel
                </p>
              </div>
            </div>

            {profile.proposal.target_start_date && (
              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Target Commercial Operation Date</span>
                  <span className="text-[10px] text-gray-400">Scheduled Milestone</span>
                </div>
                <p className="font-medium text-gray-800">
                  {formatDate(profile.proposal.target_start_date)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Location & Spatial Details */}
        <div className="card p-6 bg-white border border-gray-200/90 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Location & Jurisdiction Context</h2>
                <p className="text-[11px] text-gray-400">Revenue district & MIDC allotment</p>
              </div>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
              Verified Source
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-500 block">State Jurisdiction</span>
                <p className="font-semibold text-gray-900">Maharashtra</p>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-500 block">Revenue District</span>
                <p className="font-semibold text-gray-900">{profile.location.district}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span>Industrial Zone / Estate</span>
                <span className="text-[10px] text-gray-400">MIDC Notification</span>
              </div>
              <p className="font-semibold text-gray-900">
                {profile.location.industrial_area ?? 'MIDC Industrial Area'}
              </p>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span>Site Plot & Survey Address</span>
                <span className="text-[10px] text-gray-400">Lease Deed / Allotment</span>
              </div>
              <p className="font-medium text-gray-800 leading-relaxed">
                {profile.location.address ?? 'Plot No. 42, MIDC Bhosari, Pune'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Technical & Regulatory Attributes */}
        <div className="card p-6 bg-white border border-gray-200/90 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Regulatory & Technical Baseline</h2>
                <p className="text-[11px] text-gray-400">Power, water & environmental parameters</p>
              </div>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
              Engine Input
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <span className="text-gray-500 block">Pollution Category</span>
              <span
                className={`inline-block font-bold text-xs uppercase px-2 py-0.5 rounded ${
                  profile.technical_attributes.pollution_category === 'red'
                    ? 'bg-red-100 text-red-800'
                    : profile.technical_attributes.pollution_category === 'orange'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {profile.technical_attributes.pollution_category ?? 'Red'} Category
              </span>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <span className="text-gray-500 block">Water Requirement</span>
              <p className="font-bold text-gray-900">
                {profile.technical_attributes.water_usage_kld ?? '50'} KLD
              </p>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <span className="text-gray-500 block">Power Demand</span>
              <p className="font-bold text-gray-900">
                {profile.technical_attributes.power_requirement_kva ?? '500'} kVA
              </p>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <span className="text-gray-500 block">Built-up Land Area</span>
              <p className="font-bold text-gray-900">
                {profile.technical_attributes.land_area_sqm ?? '5000'} sq.m
              </p>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <span className="text-gray-500 block">Waste / Effluent Type</span>
              <p className="font-semibold text-gray-900 capitalize">
                {profile.technical_attributes.waste_type ?? 'Industrial Effluent'}
              </p>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
              <span className="text-gray-500 block">Contract Labour (≥20)</span>
              <p className="font-semibold text-gray-900 capitalize">
                {profile.technical_attributes.contract_labour === 'yes' ? 'Applicable' : 'Exempt'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Fields Source Registry Table */}
      <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Verified Data Reuse Ledger ({profile.reusable_fields.length} Fields)
              </h3>
              <p className="text-xs text-gray-500">
                Every verified attribute and its statutory authority source across single-window clearances.
              </p>
            </div>
          </div>
          <span className="badge bg-primary-50 text-primary-700 border border-primary-200 text-xs">
            Single-Source of Truth
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/70">
                <th className="py-2.5 px-3">Field Name</th>
                <th className="py-2.5 px-3">Master Value</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Authoritative Government Source</th>
                <th className="py-2.5 px-3 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profile.reusable_fields.map((field) => (
                <tr key={field.key} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{field.label}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-800">
                    {typeof field.value === 'number'
                      ? field.key.includes('investment')
                        ? formatCurrency(field.value)
                        : field.value
                      : String(field.value)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="badge bg-gray-100 text-gray-600 border border-gray-200 text-[10px] uppercase">
                      {field.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span>{field.source}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled Edit Profile Modal */}
      {isEditing && editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary-600" />
                <h3 className="text-base font-bold text-gray-900">Edit Master Business Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900">
                <p className="font-semibold">Controlled Single-Source Editing</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Updates made here immediately propagate to all clearance forms, pre-fill values, and regulatory evaluations.
                </p>
              </div>

              {/* Entity Fields */}
              <div>
                <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">Legal Entity Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Legal Entity Name</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.legal_name}
                      onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Entity Type</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.entity_type}
                      onChange={(e) => setEditForm({ ...editForm, entity_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Corporate CIN</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.cin}
                      onChange={(e) => setEditForm({ ...editForm, cin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Entity PAN</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.pan}
                      onChange={(e) => setEditForm({ ...editForm, pan: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Proposal Fields */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">Proposal Parameters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Proposed Capital Investment (₹)</label>
                    <input
                      type="number"
                      className="input-base"
                      value={editForm.investment_amount}
                      onChange={(e) => setEditForm({ ...editForm, investment_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Direct Headcount</label>
                    <input
                      type="number"
                      className="input-base"
                      value={editForm.employee_count}
                      onChange={(e) => setEditForm({ ...editForm, employee_count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Revenue District</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.district}
                      onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Industrial Area</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.industrial_area}
                      onChange={(e) => setEditForm({ ...editForm, industrial_area: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Site Plot Address</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Attributes */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">Technical Attributes</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Pollution Category</label>
                    <select
                      className="input-base"
                      value={editForm.pollution_category}
                      onChange={(e) => setEditForm({ ...editForm, pollution_category: e.target.value })}
                    >
                      <option value="red">Red</option>
                      <option value="orange">Orange</option>
                      <option value="green">Green</option>
                      <option value="white">White</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Water Demand (KLD)</label>
                    <input
                      type="number"
                      className="input-base"
                      value={editForm.water_usage_kld}
                      onChange={(e) => setEditForm({ ...editForm, water_usage_kld: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Power Load (kVA)</label>
                    <input
                      type="number"
                      className="input-base"
                      value={editForm.power_requirement_kva}
                      onChange={(e) => setEditForm({ ...editForm, power_requirement_kva: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Authority Representative */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">Authority Representative & Signatory</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Representative Full Name</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.representative_name}
                      onChange={(e) => setEditForm({ ...editForm, representative_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Designation</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.representative_designation}
                      onChange={(e) => setEditForm({ ...editForm, representative_designation: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Contact Mobile</label>
                    <input
                      type="tel"
                      className="input-base"
                      value={editForm.representative_phone}
                      onChange={(e) => setEditForm({ ...editForm, representative_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      className="input-base"
                      value={editForm.representative_email}
                      onChange={(e) => setEditForm({ ...editForm, representative_email: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Authorization Instrument Reference</label>
                    <input
                      type="text"
                      className="input-base"
                      value={editForm.representative_auth_letter}
                      onChange={(e) => setEditForm({ ...editForm, representative_auth_letter: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Master Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
