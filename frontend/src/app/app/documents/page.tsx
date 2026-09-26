'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, documentsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import type { DocumentItem } from '@/types/api';
import {
  FileText, Upload, AlertTriangle, CheckCircle2,
  Clock, XCircle, RefreshCw, Eye, MoreVertical, FilePlus,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [showMissing, setShowMissing] = useState(false);

  const { data: docs, isLoading, error, refetch } = useQuery({
    queryKey: ['documents', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getDocuments(DEMO_PROJECT_ID),
  });

  const { data: missing } = useQuery({
    queryKey: ['missing-docs', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getMissingDocuments(DEMO_PROJECT_ID),
    enabled: showMissing,
  });

  const documents = docs ?? [];

  const stats = {
    total: documents.length,
    verified: documents.filter(d => d.verification_status === 'VERIFIED').length,
    pending: documents.filter(d => d.verification_status === 'PENDING').length,
    expiring: documents.filter(d => d.is_expiring_soon).length,
    expired: documents.filter(d => d.is_expired).length,
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Document Vault</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            All project documents — uploaded once, reused across multiple applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMissing(!showMissing)}
            className="btn-secondary text-xs py-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Missing Docs
          </button>
          <button className="btn-primary text-xs py-1.5">
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
              {(missing as Array<{ document_type: string; mandatory: boolean; for_approvals: string[] }>).length} documents missing
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
                <span className="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex-shrink-0">Mandatory</span>
              )}
              <button className="btn-primary text-xs py-1 px-2">Upload</button>
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
            action={<button className="btn-primary text-xs py-1.5"><Upload className="w-3.5 h-3.5" /> Upload your first document</button>}
          />
        )}
        {documents.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reused by</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DocumentRow({ doc }: { doc: DocumentItem }) {
  const icon = {
    VERIFIED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    PENDING:  <Clock className="w-4 h-4 text-amber-500" />,
    REJECTED: <XCircle className="w-4 h-4 text-red-500" />,
    EXPIRED:  <AlertTriangle className="w-4 h-4 text-red-400" />,
  }[doc.verification_status] ?? <FileText className="w-4 h-4 text-gray-400" />;

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
        <StatusBadge status={doc.verification_status} />
        {doc.is_expiring_soon && (
          <p className="text-[10px] text-orange-600 mt-1 font-medium">Expiring soon</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm ${doc.is_expired ? 'text-red-600 font-medium' : doc.is_expiring_soon ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
          {formatDate(doc.expiry_date)}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">
          {doc.reuse_count} application{doc.reuse_count !== 1 ? 's' : ''}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="btn-ghost p-1.5 rounded-lg" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1.5 rounded-lg" title="Replace">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
