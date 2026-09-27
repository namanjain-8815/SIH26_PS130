import { cn } from '@/lib/utils';
import { ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Skeleton loaders for consistent loading states
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5 space-y-3" role="status" aria-label="Loading content">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr role="status" aria-label="Loading table rows">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Empty state
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="region" aria-label={title}>
      {icon && <div className="mb-4 text-gray-300" aria-hidden="true">{icon}</div>}
      <p className="text-gray-800 font-semibold text-sm">{title}</p>
      {description && <p className="text-gray-500 text-xs mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Error state
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="alert">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
      </div>
      <p className="text-gray-800 font-medium text-sm">{message ?? 'Something went wrong'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}

// Permission Denied State (403 Forbidden)
export function PermissionDeniedState({
  title = 'Access Restricted · Unauthorized Portal',
  description = 'You do not have administrative or departmental authorization to view this section under the Single Window System role policy.',
  returnHref = '/login',
  returnLabel = 'Return to Login / Switch Role',
}: {
  title?: string;
  description?: string;
  returnHref?: string;
  returnLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4 text-center" role="alert" aria-live="assertive">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
        <ShieldAlert className="w-7 h-7" aria-hidden="true" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 border border-amber-200 px-2.5 py-0.5 rounded-full mb-2">
        Statutory Authorization Required
      </span>
      <h2 className="text-gray-900 font-bold text-lg">{title}</h2>
      <p className="text-gray-600 text-xs mt-2 max-w-md leading-relaxed">{description}</p>
      {returnHref && (
        <Link
          href={returnHref}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow transition-colors"
        >
          {returnLabel}
        </Link>
      )}
    </div>
  );
}

// Auth Loading State
export function AuthLoadingState({ message = 'Verifying Single Window credentials...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center" role="status" aria-live="polite">
      <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-700 text-xs font-medium animate-pulse">{message}</p>
    </div>
  );
}

