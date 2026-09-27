'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, documentsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import type { DocumentItem, DocumentPreValidationResult } from '@/types/api';
import { DocumentPreValidationCard } from '@/components/documents/DocumentPreValidationCard';
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
  X,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [showMissing, setShowMissing] = useState(false);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [replaceDocId, setReplaceDocId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceExpiryDate, setReplaceExpiryDate] = useState('');

  const [viewDocDetailId, setViewDocDetailId] = useState<string | null>(null);

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
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDocType('');
      setUploadExpiryDate('');
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
      setReplaceDocId(null);
      setReplaceFile(null);
      setReplaceExpiryDate('');
    },
  });

  const documents = docs ?? [];

  const stats = {
    total: documents.length,
    verified: documents.filter((d) => d.verification_status === 'VERIFIED').length,
    pending: documents.filter((d) => d.verification_status === 'PENDING').length,
    expiring: documents.filter((d) => d.is_expiring_soon).length,
    expired: documents.filter((d) => d.is_expired).length,
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Sticky Action Header */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm pb-3 pt-1 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Document Vault</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            All industrial undertaking documents — uploaded once, reused across multiple permission applications
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              {m.mandatory && (
                <span className="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex-shrink-0">
                  Mandatory
                </span>
              )}
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
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Document
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Expiry
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Reused by
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onView={() => setViewDocDetailId(doc.id)}
                  onReplace={() => setReplaceDocId(doc.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Upload to Document Vault</h3>
                <p className="text-xs text-gray-400">Statutory multi-tier pre-validation will be executed before attachment.</p>
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
                <label className="font-semibold text-gray-700">File (PDF, JPG, PNG)</label>
                <input
                  type="file"
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
                  if (uploadDocType && uploadFile) {
                    uploadDoc.mutate({
                      docType: uploadDocType,
                      file: uploadFile,
                      expiry: uploadExpiryDate || undefined,
                    });
                  }
                }}
                disabled={
                  !uploadDocType ||
                  !uploadFile ||
                  uploadDoc.isPending ||
                  isUploadValidating ||
                  (uploadValidation !== null && !uploadValidation.accepted)
                }
                className="btn-primary text-xs py-1.5"
              >
                {uploadDoc.isPending ? 'Uploading...' : 'Save to Vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Replace Document */}
      {replaceDocId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Replace Document Version</h3>
                <p className="text-xs text-gray-400">
                  Target:{' '}
                  <span className="font-semibold text-gray-700">
                    {documents.find((d) => d.id === replaceDocId)?.document_type}
                  </span>
                </p>
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
            <p className="text-xs text-gray-500">
              Replacing will create a new version of this document. It will automatically update in all applications that
              reuse it and reset verification status to PENDING for re-screening.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">New File</label>
                <input
                  type="file"
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

      {/* MODAL: Document Details & Reuse View */}
      {viewDocDetailId && docDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{docDetail.document_type}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{docDetail.file_name}</p>
              </div>
              <button onClick={() => setViewDocDetailId(null)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-gray-400">Status:</span> <StatusBadge status={docDetail.verification_status} size="sm" />
              </div>
              <div>
                <span className="text-gray-400">Expiry:</span>{' '}
                <span className="font-semibold text-gray-700">{formatDate(docDetail.expiry_date)}</span>
              </div>
              <div>
                <span className="text-gray-400">Version:</span>{' '}
                <span className="font-mono font-semibold">v{(docDetail as any).version || 1}</span>
              </div>
              <div>
                <span className="text-gray-400">Total Reuse:</span>{' '}
                <span className="font-bold text-primary-600">{docDetail.reuse_count} applications</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Applications Reusing This Document</h4>
              {(docDetail as any).reused_by?.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Not currently attached to any active applications.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
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

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setViewDocDetailId(null)} className="btn-secondary text-xs py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  onView,
  onReplace,
}: {
  doc: DocumentItem;
  onView: () => void;
  onReplace: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.document_type}</p>
            <p className="text-xs text-gray-400 font-mono truncate">{doc.file_name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={doc.verification_status} size="sm" />
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
          <button onClick={onReplace} className="btn-ghost p-1.5 rounded-lg text-gray-500 hover:text-primary-600" title="Upload Replacement">
            <RefreshCw className="w-4 h-4" />
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
