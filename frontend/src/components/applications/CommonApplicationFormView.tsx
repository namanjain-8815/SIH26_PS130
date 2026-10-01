'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/lib/api';
import type { ApplicationFormData, DepartmentSupplementalField } from '@/types/api';
import { CardSkeleton, ErrorState } from '@/components/ui/States';
import { PrescribedFormCard } from '@/components/forms/PrescribedFormCard';
import {
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MapPin,
  Briefcase,
  Lock,
  Send,
  Save,
  ChevronRight,
  ChevronLeft,
  FileCheck2,
  Layers,
  Sparkles,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  applicationId: string;
  projectId: string;
  onNavigateToDocuments?: () => void;
  onSubmitSuccess?: () => void;
}

type FormStep =
  | 'applicant_profile'
  | 'project_proposal'
  | 'location_jurisdiction'
  | 'department_details'
  | 'attachments'
  | 'review_submit';

export function CommonApplicationFormView({
  applicationId,
  projectId,
  onNavigateToDocuments,
  onSubmitSuccess,
}: Props) {
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState<FormStep>('applicant_profile');
  const [departmentValues, setDepartmentValues] = useState<Record<string, any>>({});
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  const {
    data: formData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['application-form', applicationId],
    queryFn: () => applicationsApi.getForm(applicationId),
  });

  // Sync initial department values from backend
  useEffect(() => {
    if (formData?.department_specific_fields) {
      const initialMap: Record<string, any> = {};
      for (const field of formData.department_specific_fields) {
        initialMap[field.field_key] = field.value;
      }
      setDepartmentValues(initialMap);
    }
  }, [formData]);

  // Save form mutation
  const saveMutation = useMutation({
    mutationFn: (values: Record<string, any>) =>
      applicationsApi.saveForm(applicationId, {
        department_values: values,
        notes: 'Applicant updated department supplemental parameters in Common Application Form',
      }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['application-form', applicationId] });
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      setSaveSuccessMsg('Department supplemental fields saved successfully as draft.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
  });

  // Submit application mutation
  const submitMutation = useMutation({
    mutationFn: () =>
      applicationsApi.submitForm(applicationId, {
        department_values: departmentValues,
        notes: 'Application officially submitted via Common Application Form.',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-form', applicationId] });
      qc.invalidateQueries({ queryKey: ['application-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['control-centre', projectId] });
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    },
    onError: (err: any) => {
      setSubmitErrorMsg(err?.message || 'Failed to submit application. Please review requirements.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={6} />
      </div>
    );
  }

  if (error || !formData) {
    return (
      <ErrorState
        message={(error as Error)?.message || 'Unable to load common application form data.'}
        onRetry={() => refetch()}
      />
    );
  }

  const isLocked = formData.is_locked;
  const isSubmittable = !isLocked;

  const steps: Array<{ id: FormStep; label: string; number: number; desc: string }> = [
    {
      id: 'applicant_profile',
      label: 'Applicant & Entity',
      number: 1,
      desc: 'Master legal corporate identity',
    },
    {
      id: 'project_proposal',
      label: 'Project Proposal',
      number: 2,
      desc: 'Investment & industrial scope',
    },
    {
      id: 'location_jurisdiction',
      label: 'Location & Site',
      number: 3,
      desc: 'MIDC zone & revenue plot',
    },
    {
      id: 'department_details',
      label: 'Department Details',
      number: 4,
      desc: `${formData.department.name} specific parameters`,
    },
    {
      id: 'attachments',
      label: 'Attachments',
      number: 5,
      desc: 'Mandatory statutory proofs',
    },
    {
      id: 'review_submit',
      label: 'Review & Submit',
      number: 6,
      desc: 'Final verification & declaration',
    },
  ];

  const handleFieldChange = (key: string, val: any) => {
    setDepartmentValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveDraft = () => {
    saveMutation.mutate(departmentValues);
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-6">
      {/* Return Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/app/applications/${applicationId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Application Overview</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/app/approvals"
            className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1"
          >
            <span>Return to Permissions Roadmap →</span>
          </Link>
        </div>
      </div>

      {/* Top Banner: Workflow Header & Lock State */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200/60 uppercase tracking-wider">
                Common Application Form (CAF)
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-mono text-gray-500 font-semibold">{formData.application_number}</span>
              {isLocked ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  <Lock className="w-3 h-3" /> Submitted & Locked
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  <ShieldCheck className="w-3 h-3" /> Pre-Populated from Master Profile
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-gray-900 mt-1">
              {formData.approval_type.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Issuing Authority: <span className="font-semibold text-gray-700">{formData.department.name}</span> ({formData.approval_type.authority})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/app/projects/${projectId}/profile`}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              target="_blank"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              <span>View Master Profile</span>
            </Link>
            {isSubmittable && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saveMutation.isPending}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-primary-700 border-primary-200 hover:bg-primary-50"
              >
                <Save className="w-3.5 h-3.5 text-primary-600" />
                <span>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Read-Only Notice if Locked */}
        {isLocked && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-900">
            <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Application Officially Submitted</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                This application has been transmitted to {formData.department.name} and is undergoing statutory review.
                The common form is preserved in official read-only format.
              </p>
            </div>
          </div>
        )}

        {/* Form Step Progress Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-6 pt-5 border-t border-gray-100">
          {steps.map((s, idx) => {
            const isCurrent = currentStep === s.id;
            const isPast = idx < currentStepIndex;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-primary-600 bg-primary-50/50 shadow-xs ring-1 ring-primary-500'
                    : isPast
                    ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-primary-600 text-white'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isPast ? '✓' : s.number}
                  </span>
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-primary-900' : isPast ? 'text-emerald-950' : 'text-gray-700'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate mt-1 pl-7">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: APPLICANT & ENTITY DETAILS */}
      {currentStep === 'applicant_profile' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" />
                Step 1: Master Applicant & Entity Profile
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pre-populated automatically from verified single-window entity registration.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified Master Data
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.common_applicant_data.map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    {item.source_label}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900 mt-1 font-mono">{item.value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Need to modify legal name, entity type, PAN or registered office address? Updates to master entity
              data should be performed in the{' '}
              <Link href={`/app/projects/${projectId}/profile`} className="underline font-bold text-amber-950">
                Master Business Profile
              </Link>{' '}
              to propagate verified updates across all department clearances.
            </p>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep('project_proposal')}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Next: Project Proposal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROJECT PROPOSAL */}
      {currentStep === 'project_proposal' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary-600" />
                Step 2: Common Project Proposal Details
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Core investment metrics and industrial classification shared across single-window applications.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              From Verified Project Profile
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.common_project_data.map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    {item.source_label}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900 mt-1 font-mono">{item.value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep('applicant_profile')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('location_jurisdiction')}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Next: Location & Site</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION & JURISDICTION */}
      {currentStep === 'location_jurisdiction' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                Step 3: Location & Site Jurisdiction
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Site coordinates, revenue parcel numbers, and MIDC industrial area jurisdiction.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              From Verified Project Profile
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.location_data.map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    {item.source_label}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900 mt-1 font-mono">{item.value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep('project_proposal')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('department_details')}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Next: Department Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DEPARTMENT-SPECIFIC SUPPLEMENTAL DETAILS */}
      {currentStep === 'department_details' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-600" />
                Step 4: Department-Specific Supplemental Details
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Technical parameters required specifically by{' '}
                <span className="font-semibold text-gray-700">{formData.department.name}</span>.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Supplemental Clearance Data
            </span>
          </div>

          <p className="text-xs text-gray-600">
            These fields are specific to this permission and are saved separately from shared master data.
            Values matching known technical attributes are pre-populated automatically.
          </p>

          <div className="space-y-4">
            {formData.department_specific_fields.map((field) => {
              const currentValue =
                departmentValues[field.field_key] !== undefined
                  ? departmentValues[field.field_key]
                  : field.value;

              return (
                <div
                  key={field.id}
                  className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span>{field.label}</span>
                      {field.required && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        field.is_verified_source
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200/60'
                      }`}
                    >
                      {field.source_label}
                    </span>
                  </div>

                  {field.help_text && (
                    <p className="text-[11px] text-gray-500 leading-relaxed">{field.help_text}</p>
                  )}

                  <div className="pt-1">
                    {field.field_type === 'select' ? (
                      <select
                        value={currentValue ?? ''}
                        disabled={isLocked}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        className="input-base text-xs bg-white"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.field_type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={currentValue ?? ''}
                        disabled={isLocked}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        className="input-base text-xs"
                        placeholder={`Enter ${field.label}...`}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type={field.field_type === 'number' ? 'number' : 'text'}
                          value={currentValue ?? ''}
                          disabled={isLocked}
                          onChange={(e) =>
                            handleFieldChange(
                              field.field_key,
                              field.field_type === 'number' ? Number(e.target.value) : e.target.value
                            )
                          }
                          className="input-base text-xs flex-1"
                          placeholder={`Enter ${field.label}...`}
                        />
                        {field.unit && (
                          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                            {field.unit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep('location_jurisdiction')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              {isSubmittable && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saveMutation.isPending}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep('attachments')}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <span>Next: Attachments</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: REQUIRED ATTACHMENTS & FORMS */}
      {currentStep === 'attachments' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                Step 5: Required Attachments & Statutory Form
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Checklist of mandatory and optional supporting documents attached to this application.
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                formData.attachments_summary.all_mandatory_attached
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {formData.attachments_summary.all_mandatory_attached
                ? 'All Mandatory Documents Ready'
                : `${formData.attachments_summary.mandatory_missing_count} Mandatory Missing`}
            </span>
          </div>

          {/* Prescribed Statutory Form Card if Available */}
          {formData.prescribed_form && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Prescribed Statutory Application Template
              </h4>
              <PrescribedFormCard
                form={formData.prescribed_form}
                onUploadCompletedForm={() => {
                  if (onNavigateToDocuments) onNavigateToDocuments();
                }}
              />
            </div>
          )}

          {/* Document Checklist Items */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Document Requirements Checklist
            </h4>
            {formData.attachments_summary.items.map((item) => (
              <div
                key={item.document_type}
                className="p-3.5 rounded-xl border border-gray-200/80 bg-white flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  {item.attached ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-900">{item.document_type}</p>
                    <p className="text-[11px] text-gray-500">
                      {item.mandatory ? (
                        <span className="text-red-600 font-semibold">Mandatory</span>
                      ) : (
                        <span className="text-gray-500">Optional / Conditional</span>
                      )}
                      {item.condition && ` • ${item.condition}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {item.attached ? (
                    <div>
                      <span className="text-xs font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        {item.file_name}
                      </span>
                      <p className="text-[10px] text-emerald-600 mt-0.5 font-semibold">Attached from Vault</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onNavigateToDocuments}
                      className="btn-secondary text-[11px] py-1 px-2.5 text-primary-700 border-primary-200 hover:bg-primary-50"
                    >
                      Attach in Documents Tab
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep('department_details')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('review_submit')}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Next: Review & Submit</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: REVIEW & SUBMIT */}
      {currentStep === 'review_submit' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-600" />
                Step 6: Comprehensive Review & Sign-Off
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Verify all pre-populated master data and department supplemental entries before transmission.
              </p>
            </div>
            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-semibold">
              Final Dossier Check
            </span>
          </div>

          {/* Submission Readiness Diagnostic Box */}
          <div
            className={`p-4 rounded-xl border ${
              formData.attachments_summary.all_mandatory_attached
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/80 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {formData.attachments_summary.all_mandatory_attached ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-xs font-bold text-gray-900">
                  {formData.attachments_summary.all_mandatory_attached
                    ? 'Application Ready for Submission'
                    : 'Action Required Prior to Submission'}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.attachments_summary.all_mandatory_attached
                    ? `All required attachments (${formData.attachments_summary.attached_count} documents) and verified master records are validated.`
                    : `${formData.attachments_summary.mandatory_missing_count} mandatory document(s) are missing. Please attach them before final submission.`}
                </p>
              </div>
            </div>
          </div>

          {/* Review Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity Summary */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                1. Master Entity Profile
              </span>
              <p className="text-xs font-bold text-gray-900">{formData.master_profile.entity.legal_name}</p>
              <div className="text-[11px] text-gray-600 space-y-1">
                <p>Type: <span className="font-semibold text-gray-800">{formData.master_profile.entity.entity_type}</span></p>
                <p>PAN: <span className="font-mono font-semibold text-gray-800">{formData.master_profile.entity.pan}</span></p>
                <p>GSTIN: <span className="font-mono font-semibold text-gray-800">{formData.master_profile.entity.gstin}</span></p>
              </div>
            </div>

            {/* Project Summary */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                2. Project & Site
              </span>
              <p className="text-xs font-bold text-gray-900">{formData.master_profile.proposal.name}</p>
              <div className="text-[11px] text-gray-600 space-y-1">
                <p>Investment: <span className="font-semibold text-gray-800">₹{(formData.master_profile.proposal.investment_amount / 10_000_000).toFixed(2)} Cr</span></p>
                <p>Location: <span className="font-semibold text-gray-800">{formData.master_profile.location.industrial_area}, {formData.master_profile.location.district}</span></p>
                <p>Workforce: <span className="font-semibold text-gray-800">{formData.master_profile.proposal.employee_count} Persons</span></p>
              </div>
            </div>
          </div>

          {/* Department Supplemental Summary */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 space-y-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              3. {formData.department.name} Supplemental Parameters
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.department_specific_fields.map((f) => (
                <div key={f.id} className="text-xs bg-white p-2.5 rounded-lg border border-gray-200/80">
                  <span className="text-[11px] text-gray-500 block">{f.label}</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {departmentValues[f.field_key] !== undefined
                      ? String(departmentValues[f.field_key])
                      : String(f.value || '—')}
                    {f.unit && ` ${f.unit}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Error Banner */}
          {submitErrorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{submitErrorMsg}</span>
            </div>
          )}

          {/* Formal Applicant Undertaking */}
          {isSubmittable && (
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 mt-0.5"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  I hereby solemnly affirm that the information furnished in this Common Application Form and attached
                  statutory exhibits are true, complete, and legally binding. I understand that false statements or
                  wilful suppression of material facts will attract penalties under the relevant statutory Acts.
                </span>
              </label>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep('attachments')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {isSubmittable ? (
              <button
                type="button"
                disabled={
                  !declarationAccepted ||
                  !formData.attachments_summary.all_mandatory_attached ||
                  submitMutation.isPending
                }
                onClick={() => {
                  setSubmitErrorMsg(null);
                  submitMutation.mutate();
                }}
                className={`text-xs py-2.5 px-5 font-bold rounded-lg transition-all flex items-center gap-2 ${
                  declarationAccepted && formData.attachments_summary.all_mandatory_attached
                    ? 'bg-green-700 text-white hover:bg-green-800 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitMutation.isPending
                    ? 'Transmitting Application...'
                    : `Submit Application to ${formData.approval_type.authority}`}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Application Submitted ({formData.status})</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
