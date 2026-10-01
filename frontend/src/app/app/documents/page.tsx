'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, documentsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import type { DocumentItem, DocumentPreValidationResult } from '@/types/api';
import { DocumentPreValidationCard } from '@/components/documents/DocumentPreValidationCard';
import { CrossDocumentConsistencyCard } from '@/components/documents/CrossDocumentConsistencyCard';
import { ClearanceDocumentGuidanceView } from '@/components/documents/ClearanceDocumentGuidanceView';
import { DigiLockerVerificationCard } from '@/components/documents/DigiLockerVerificationCard';
import { DocumentDetailCentreView } from '@/components/documents/DocumentDetailCentreView';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Eye,
  FilePlus,
  Layers,
  ShieldCheck,
  X,
  Trash2,
  Sparkles,
  Database,
  ExternalLink,
  Download,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<'vault' | 'detail-centre' | 'guidance'>('vault');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'ORGANIZATION_COMMON' | 'SITE_SPECIFIC'>('ALL');
  const [showMissing, setShowMissing] = useState(false);
  const [showConsistency, setShowConsistency] = useState(false);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [replaceDocId, setReplaceDocId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceExpiryDate, setReplaceExpiryDate] = useState('');

  const [viewDocDetailId, setViewDocDetailId] = useState<string | null>(null);
  const [showInlinePdf, setShowInlinePdf] = useState(false);

  // Safe Deletion Modal (B0.4)
  const [deleteDocModal, setDeleteDocModal] = useState<{ id: string; docType: string; fileName: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  // Re-extraction State
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Pre-validation state
  const [uploadValidation, setUploadValidation] = useState<DocumentPreValidationResult | null>(null);
  const [isUploadValidating, setIsUploadValidating] = useState(false);

  const [replaceValidation, setReplaceValidation] = useState<DocumentPreValidationResult | null>(null);
  const [isReplaceValidating, setIsReplaceValidating] = useState(false);

  const handleUploadFileSelected = async (file: File | null) => {
    setUploadFile(file);
    setUploadValidation(null);
    if (!file || !uploadDocType) return;

    setIsUploadValidating(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await documentsApi.preValidate({
        document_type: uploadDocType,
        file_name: file.name,
        file_base64: base64,
        size_bytes: file.size,
        expiry_date: uploadExpiryDate || undefined,
        project_id: DEMO_PROJECT_ID,
      });
      setUploadValidation(res);
    } catch {
      // Non-blocking
    } finally {
      setIsUploadValidating(false);
    }
  };

  const handleReplaceFileSelected = async (file: File | null, docType: string) => {
    setReplaceFile(file);
    setReplaceValidation(null);
    if (!file) return;

    setIsReplaceValidating(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await documentsApi.preValidate({
        document_type: docType,
        file_name: file.name,
        file_base64: base64,
        size_bytes: file.size,
        expiry_date: replaceExpiryDate || undefined,
        project_id: DEMO_PROJECT_ID,
      });
      setReplaceValidation(res);
    } catch {
      // Non-blocking
    } finally {
      setIsReplaceValidating(false);
    }
  };

  const {
    data: docs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getDocuments(DEMO_PROJECT_ID),
  });

  const { data: missing } = useQuery({
    queryKey: ['missing-docs', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getMissingDocuments(DEMO_PROJECT_ID),
    enabled: showMissing,
  });

  const { data: docDetail } = useQuery({
    queryKey: ['document-detail', viewDocDetailId],
    queryFn: () => documentsApi.get(viewDocDetailId!),
    enabled: !!viewDocDetailId,
  });

  const { data: docExtraction } = useQuery({
    queryKey: ['document-extraction', viewDocDetailId],
    queryFn: () => documentsApi.getExtractedFields(viewDocDetailId!),
    enabled: !!viewDocDetailId,
  });

  const {
    data: consistencyData,
    isLoading: isConsistencyLoading,
    refetch: refetchConsistency,
  } = useQuery({
    queryKey: ['project-document-consistency', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getDocumentConsistency(DEMO_PROJECT_ID),
    enabled: showConsistency,
  });

  const {
    data: projectChecklist,
    isLoading: isProjectChecklistLoading,
    refetch: refetchProjectChecklist,
  } = useQuery({
    queryKey: ['project-document-checklist', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getDocumentChecklist(DEMO_PROJECT_ID),
  });

  // Upload mutation
  const uploadDoc = useMutation({
    mutationFn: async ({ docType, file, expiry }: { docType: string; file: File; expiry?: string }) => {
      const base64 = await fileToBase64(file);
      return documentsApi.upload(DEMO_PROJECT_ID, {
        document_type: docType,
        file_name: file.name,
        file_base64: base64,
        expiry_date: expiry || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['missing-docs', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-document-consistency', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-document-checklist', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['document-detail-centre', DEMO_PROJECT_ID] });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDocType('');
      setUploadExpiryDate('');
      setActionToast('Document uploaded and structured fields extracted.');
      setTimeout(() => setActionToast(null), 5000);
    },
  });

  // Replace mutation
  const replaceDoc = useMutation({
    mutationFn: async ({ docId, file, expiry }: { docId: string; file: File; expiry?: string }) => {
      const base64 = await fileToBase64(file);
      return documentsApi.replace(docId, {
        file_name: file.name,
        file_base64: base64,
        expiry_date: expiry || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-document-consistency', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-document-checklist', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['document-detail-centre', DEMO_PROJECT_ID] });
      setReplaceDocId(null);
      setReplaceFile(null);
      setReplaceExpiryDate('');
      setActionToast('Document replaced and re-extracted successfully.');
      setTimeout(() => setActionToast(null), 5000);
    },
  });

  // Re-extract mutation
  const reExtractDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.reExtract(docId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['documents', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-document-consistency', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['document-detail-centre', DEMO_PROJECT_ID] });
      setReExtractingId(null);
      const count = data?.extraction?.fields ? Object.keys(data.extraction.fields).length : 0;
      setActionToast(`PDF extraction complete: ${count} structured fields detected.`);
      setTimeout(() => setActionToast(null), 5000);
    },
    onError: (err: any) => {
      setReExtractingId(null);
      setActionToast(`Re-extraction failed: ${err.message}`);
      setTimeout(() => setActionToast(null), 5000);
    },
  });

  // Safe delete mutation (B0.4)
  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['missing-docs', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['project-document-consistency', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['document-detail-centre', DEMO_PROJECT_ID] });
      setDeleteDocModal(null);
      setDeleteError('');
      setActionToast('Document safely deleted from vault.');
      setTimeout(() => setActionToast(null), 5000);
    },
    onError: (err: any) => {
      setDeleteError(err.message || 'Cannot delete document.');
    },
  });

  const allDocuments = docs ?? [];
  const documents = allDocuments.filter((d: any) => {
    if (scopeFilter === 'ALL') return true;
    if (scopeFilter === 'ORGANIZATION_COMMON') return d.scope === 'ORGANIZATION_COMMON';
    return d.scope !== 'ORGANIZATION_COMMON';
  });

  const stats = {
    total: allDocuments.length,
    verified: allDocuments.filter((d) => d.verification_status === 'VERIFIED').length,
    pending: allDocuments.filter((d) => d.verification_status === 'PENDING').length,
    expiring: allDocuments.filter((d) => d.is_expiring_soon).length,
    expired: allDocuments.filter((d) => d.is_expired).length,
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-7xl mx-auto">
      {/* Sticky Action Header */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm pb-3 pt-1 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Document Vault & Extraction Centre</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Single repository for all industrial undertaking documents — uploaded once, verified, and reused across applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConsistency(!showConsistency)}
            className={`btn-secondary text-xs py-1.5 transition-colors ${
              showConsistency ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : ''
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            {showConsistency ? 'Hide Consistency' : 'Consistency Audit'}
          </button>
          <button
            onClick={() => setShowMissing(!showMissing)}
            className="btn-secondary text-xs py-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            {showMissing ? 'Hide Missing' : 'Missing Docs'}
          </button>
          <button
            onClick={() => {
              setUploadDocType('');
              setShowUploadModal(true);
            }}
            className="btn-primary text-xs py-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>
      </div>

      {actionToast && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="text-blue-500 hover:text-blue-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DigiLocker Verification — Prototype Simulation */}
      <DigiLockerVerificationCard projectId={DEMO_PROJECT_ID} />

      {/* Primary Vault View Switcher (B0.2) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setViewMode('vault')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            viewMode === 'vault'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Uploaded Vault Documents ({documents.length})
        </button>

        <button
          onClick={() => setViewMode('detail-centre')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            viewMode === 'detail-centre'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          Document Detail Centre & Reuse
        </button>

        <button
          onClick={() => setViewMode('guidance')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            viewMode === 'guidance'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Statutory Guidance by Clearance ({projectChecklist?.clearances.length || 0})
        </button>
      </div>

      {viewMode === 'detail-centre' ? (
        <DocumentDetailCentreView projectId={DEMO_PROJECT_ID} />
      ) : viewMode === 'guidance' ? (
        <ClearanceDocumentGuidanceView
          data={projectChecklist}
          isLoading={isProjectChecklistLoading}
          onUpload={(docType) => {
            setUploadDocType(docType);
            setShowUploadModal(true);
          }}
          onRefresh={() => refetchProjectChecklist()}
        />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', val: stats.total, color: 'text-gray-700 bg-gray-50', border: 'border-gray-200' },
              { label: 'Verified', val: stats.verified, color: 'text-green-700 bg-green-50', border: 'border-green-200' },
              { label: 'Pending', val: stats.pending, color: 'text-amber-700 bg-amber-50', border: 'border-amber-200' },
              { label: 'Expiring Soon', val: stats.expiring, color: 'text-orange-700 bg-orange-50', border: 'border-orange-200' },
              { label: 'Expired', val: stats.expired, color: 'text-red-700 bg-red-50', border: 'border-red-200' },
            ].map(({ label, val, color, border }) => (
              <div key={label} className={`card p-3 border ${border} text-center`}>
                <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Cross-Document Consistency Audit Panel */}
          {showConsistency && (
            <div className="space-y-2">
              <CrossDocumentConsistencyCard
                result={consistencyData}
                isLoading={isConsistencyLoading}
                onRecheck={() => refetchConsistency()}
                title="Project Document Vault — Cross-Document Consistency Audit"
              />
            </div>
          )}

          {/* Missing documents panel */}
          {showMissing && missing && (
            <div className="card p-4 border-l-4 border-amber-400 bg-amber-50 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  {(missing as Array<{ document_type: string; mandatory: boolean; for_approvals: string[] }>).length} documents missing from vault
                </p>
              </div>
              {(missing as Array<{ document_type: string; mandatory: boolean; for_approvals: string[] }>).map((m) => (
                <div key={m.document_type} className="flex items-start gap-3 bg-white rounded-lg p-3">
                  <FilePlus className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.document_type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Required by: {m.for_approvals.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadDocType(m.document_type);
                      setShowUploadModal(true);
                    }}
                    className="btn-primary text-xs py-1 px-2.5"
                  >
                    Upload
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Scope Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scopeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Documents ({allDocuments.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('ORGANIZATION_COMMON')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  scopeFilter === 'ORGANIZATION_COMMON'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>Enterprise Common</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200/50">
                  {allDocuments.filter((d: any) => d.scope === 'ORGANIZATION_COMMON').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('SITE_SPECIFIC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  scopeFilter === 'SITE_SPECIFIC'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span>Site Specific Exhibits</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-200/50">
                  {allDocuments.filter((d: any) => d.scope !== 'ORGANIZATION_COMMON').length}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              {scopeFilter === 'ORGANIZATION_COMMON'
                ? 'Shared across all enterprise investment proposals'
                : scopeFilter === 'SITE_SPECIFIC'
                ? 'Site-specific exhibits for this facility'
                : 'All documents in vault'}
            </p>
          </div>

          {/* Documents table */}
          <div className="card overflow-hidden">
            {isLoading && (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            )}
            {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
            {!isLoading && documents.length === 0 && (
              <EmptyState
                icon={<FileText className="w-10 h-10" />}
                title="No documents uploaded yet"
                description="Upload your business documents here — PAN, incorporation certificate, land documents, etc."
                action={
                  <button
                    onClick={() => {
                      setUploadDocType('');
                      setShowUploadModal(true);
                    }}
                    className="btn-primary text-xs py-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload your first document
                  </button>
                }
              />
            )}
            {documents.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Document & File</th>
                    <th className="text-left px-4 py-3">Status & Extraction</th>
                    <th className="text-left px-4 py-3">Expiry</th>
                    <th className="text-left px-4 py-3">Reused by</th>
                    <th className="text-left px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onView={() => setViewDocDetailId(doc.id)}
                      onReplace={() => setReplaceDocId(doc.id)}
                      onReExtract={() => {
                        setReExtractingId(doc.id);
                        reExtractDoc.mutate(doc.id);
                      }}
                      onDelete={() => {
                        setDeleteError('');
                        setDeleteDocModal({
                          id: doc.id,
                          docType: doc.document_type,
                          fileName: doc.file_name,
                        });
                      }}
                      isReExtracting={reExtractingId === doc.id}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* MODAL: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Upload to Document Vault</h3>
                <p className="text-xs text-gray-400">Statutory multi-tier pre-validation & field extraction will be executed.</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadValidation(null);
                  setUploadFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Document Type / Name</label>
                <input
                  type="text"
                  value={uploadDocType}
                  onChange={(e) => {
                    setUploadDocType(e.target.value);
                    if (uploadFile) {
                      handleUploadFileSelected(uploadFile);
                    }
                  }}
                  placeholder="e.g. Company PAN Card, Lease Agreement / Land Title"
                  className="input-base text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Select File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleUploadFileSelected(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="input-base text-xs mt-1"
                />
              </div>

              {/* Pre-validation feedback card */}
              <DocumentPreValidationCard
                result={uploadValidation}
                isValidating={isUploadValidating}
                onResetFile={() => {
                  setUploadFile(null);
                  setUploadValidation(null);
                }}
              />
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadValidation(null);
                  setUploadFile(null);
                }}
                className="btn-secondary text-xs py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (uploadFile && uploadDocType) {
                    uploadDoc.mutate({
                      docType: uploadDocType,
                      file: uploadFile,
                      expiry: uploadExpiryDate || undefined,
                    });
                  }
                }}
                disabled={
                  !uploadFile ||
                  !uploadDocType ||
                  uploadDoc.isPending ||
                  isUploadValidating ||
                  (uploadValidation !== null && !uploadValidation.accepted)
                }
                className="btn-primary text-xs py-1.5"
              >
                {uploadDoc.isPending ? 'Uploading & Extracting...' : 'Upload & Extract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Replace Document */}
      {replaceDocId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Upload Document Replacement</h3>
                <p className="text-xs text-gray-400">Replaces the file and triggers automatic re-extraction</p>
              </div>
              <button
                onClick={() => {
                  setReplaceDocId(null);
                  setReplaceValidation(null);
                  setReplaceFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Select New File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const doc = documents.find((d) => d.id === replaceDocId);
                    handleReplaceFileSelected(e.target.files?.[0] || null, doc?.document_type || 'Statutory Document');
                  }}
                  className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700">Updated Expiry Date (optional)</label>
                <input
                  type="date"
                  value={replaceExpiryDate}
                  onChange={(e) => setReplaceExpiryDate(e.target.value)}
                  className="input-base text-xs mt-1"
                />
              </div>

              {/* Pre-validation feedback card */}
              <DocumentPreValidationCard
                result={replaceValidation}
                isValidating={isReplaceValidating}
                onResetFile={() => {
                  setReplaceFile(null);
                  setReplaceValidation(null);
                }}
              />
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setReplaceDocId(null);
                  setReplaceValidation(null);
                  setReplaceFile(null);
                }}
                className="btn-secondary text-xs py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (replaceFile && replaceDocId) {
                    replaceDoc.mutate({
                      docId: replaceDocId,
                      file: replaceFile,
                      expiry: replaceExpiryDate || undefined,
                    });
                  }
                }}
                disabled={
                  !replaceFile ||
                  replaceDoc.isPending ||
                  isReplaceValidating ||
                  (replaceValidation !== null && !replaceValidation.accepted)
                }
                className="btn-primary text-xs py-1.5"
              >
                {replaceDoc.isPending ? 'Updating...' : 'Upload Replacement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Safe Deletion Confirmation (B0.4) */}
      {deleteDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Vault Document</h3>
                <p className="text-xs text-gray-500">{deleteDocModal.docType}</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-2">
              <p>
                Are you sure you want to permanently delete <span className="font-semibold text-gray-900 font-mono">{deleteDocModal.fileName}</span>?
              </p>
              <p className="text-gray-500">
                This action will delete the physical file from storage and erase any extracted fields.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>Statutory Protection Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">{deleteError}</p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteDocModal(null);
                  setDeleteError('');
                }}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteDoc.isPending}
                onClick={() => deleteDoc.mutate(deleteDocModal.id)}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                {deleteDoc.isPending ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Document Details & Reuse View */}
      {viewDocDetailId && docDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-scale-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">{docDetail.document_type}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{docDetail.file_name}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {docDetail.is_file_available !== false ? (
                  <>
                    <a
                      href={documentsApi.getFileUrl(docDetail.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Uploaded PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowInlinePdf(!showInlinePdf)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      {showInlinePdf ? 'Hide Preview' : 'Preview Document'}
                    </button>
                    <a
                      href={documentsApi.getFileUrl(docDetail.id)}
                      download={docDetail.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                      title="Download File in New Tab"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-600" />
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceDocId(docDetail.id);
                      setViewDocDetailId(null);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload / Replace Document
                  </button>
                )}
                <button
                  onClick={() => {
                    setViewDocDetailId(null);
                    setShowInlinePdf(false);
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Unavailable File Warning Banner */}
            {docDetail.is_file_available === false && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>Physical Document File Unavailable</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This document record exists in your project vault, but the physical PDF file is not present in storage.
                  Please upload or replace the document file to enable previews, downloads, and structured re-extraction.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceDocId(docDetail.id);
                      setViewDocDetailId(null);
                    }}
                    className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Document File Now
                  </button>
                </div>
              </div>
            )}

            {/* Inline PDF / File Viewer */}
            {docDetail.is_file_available !== false && showInlinePdf && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-900 shadow-inner animate-fade-in">
                <div className="bg-gray-800 px-3 py-1.5 flex items-center justify-between text-xs text-gray-300 border-b border-gray-700">
                  <span className="font-mono text-[11px] truncate">{docDetail.file_name}</span>
                  <span className="text-[10px] text-gray-400">PDF & Document Exhibit Viewer</span>
                </div>
                <iframe
                  src={documentsApi.getFileUrl(docDetail.id)}
                  className="w-full h-96 bg-white"
                  title={`Preview of ${docDetail.file_name}`}
                />
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Status</span>
                <div className="mt-0.5"><StatusBadge status={docDetail.verification_status} size="sm" /></div>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Expiry</span>
                <p className="font-semibold text-gray-800 mt-0.5">{formatDate(docDetail.expiry_date)}</p>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Version</span>
                <p className="font-mono font-semibold text-gray-800 mt-0.5">v{(docDetail as any).version || 1}</p>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Vault Total Reuse</span>
                <p className="font-bold text-primary-600 mt-0.5">{docDetail.reuse_count} applications</p>
              </div>
            </div>

            {/* Extracted Fields from this Exhibit */}
            {docExtraction && docExtraction.fields && Object.keys(docExtraction.fields).length > 0 && (
              <div className="space-y-2 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Extracted Structured Attributes ({Object.keys(docExtraction.fields).length})
                  </h4>
                  <span className="text-[10px] text-blue-700 font-medium">Synced with Document Detail Centre</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Object.entries(docExtraction.fields).map(([k, f]: [string, any]) => (
                    <div key={k} className="p-2 rounded-lg bg-white border border-gray-200/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-700 text-[11px]">{k}</span>
                        <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          {f.status || 'PARSED'}
                        </span>
                      </div>
                      <p className="font-mono font-bold text-gray-900 mt-0.5 text-xs truncate">
                        {String(f.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applications Reusing This Document */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Applications Reusing This Document</h4>
              {(docDetail as any).reused_by?.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Not currently attached to any active applications.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(docDetail as any).reused_by?.map((app: any) => (
                    <div key={app.application_id} className="p-2.5 rounded-lg border border-gray-100 bg-white flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-gray-900">{app.approval_name}</p>
                        <p className="text-[11px] font-mono text-gray-400">{app.application_number}</p>
                      </div>
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {app.validation_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <a
                href={documentsApi.getFileUrl(docDetail.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open PDF in New Window
              </a>
              <button
                onClick={() => {
                  setViewDocDetailId(null);
                  setShowInlinePdf(false);
                }}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Trigger for Upload (stays visible at any scroll depth) */}
      <button
        type="button"
        onClick={() => {
          setUploadDocType('');
          setShowUploadModal(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-2xl hover:shadow-blue-500/40 transition-all duration-200 border border-blue-400/40 group active:scale-95"
        title="Upload Document to Vault (Always available at any scroll depth)"
      >
        <Upload className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
        <span>Upload Document</span>
      </button>
    </div>
  );
}

function DocumentRow({
  doc,
  onView,
  onReplace,
  onReExtract,
  onDelete,
  isReExtracting,
}: {
  doc: DocumentItem;
  onView: () => void;
  onReplace: () => void;
  onReExtract: () => void;
  onDelete: () => void;
  isReExtracting: boolean;
}) {
  const isOrgCommon = (doc as any).scope === 'ORGANIZATION_COMMON';

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-gray-900 truncate">{doc.document_type}</p>
              {isOrgCommon && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="Organization-wide common document">
                  Common
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono truncate">{doc.file_name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={doc.verification_status} size="sm" />
          {(doc as any).is_file_available === false && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300" title="Physical file is unavailable in storage. Upload or replace document to enable PDF preview & re-extraction.">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              FILE UNAVAILABLE
            </span>
          )}
          {(doc as any).extracted_field_count > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200" title="Structured attributes parsed from PDF">
              <Sparkles className="w-3 h-3 text-blue-600" />
              EXTRACTED ({(doc as any).extracted_field_count})
            </span>
          )}
          {(doc as any).extraction_status === 'MANUAL_VERIFICATION_REQUIRED' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300" title="Scanned/unparsed PDF requires manual verification">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              MANUAL VERIFY
            </span>
          )}
          {['Company PAN Card', 'Land Ownership / Lease Agreement', 'Memorandum of Association (MoA)'].includes(doc.document_type) && doc.verification_status === 'VERIFIED' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title="Retrieved & verified via DigiLocker simulation">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              DigiLocker
            </span>
          )}
        </div>
        {doc.is_expiring_soon && (
          <p className="text-[10px] text-orange-600 mt-1 font-medium">Expiring soon</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p
          className={`text-sm ${
            doc.is_expired
              ? 'text-red-600 font-medium'
              : doc.is_expiring_soon
              ? 'text-orange-600 font-medium'
              : 'text-gray-700'
          }`}
        >
          {formatDate(doc.expiry_date)}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          {doc.reuse_count} application{doc.reuse_count !== 1 ? 's' : ''}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button onClick={onView} className="btn-ghost p-1.5 rounded-lg text-gray-500 hover:text-gray-900" title="View Details & Reuse">
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onReExtract}
            disabled={isReExtracting || (doc as any).is_file_available === false}
            className={`btn-ghost p-1.5 rounded-lg ${(doc as any).is_file_available === false ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'}`}
            title={(doc as any).is_file_available === false ? 'Physical file unavailable. Upload or replace document first.' : 'Re-extract Structured Fields'}
          >
            <Sparkles className={`w-4 h-4 ${isReExtracting ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button onClick={onReplace} className="btn-ghost p-1.5 rounded-lg text-gray-500 hover:text-primary-600" title="Upload Replacement">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Delete Document from Vault"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
