import { cn } from '@/lib/utils';

type StatusVariant =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'NOT_STARTED'
  | 'BLOCKED'
  | 'APPROVED'
  | 'REJECTED'
  | 'UNDER_REVIEW'
  | 'QUERY_RAISED'
  | 'INSPECTION_SCHEDULED'
  | 'SUBMITTED'
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'BREACHED'
  | 'VERIFIED'
  | 'PENDING'
  | 'EXPIRED'
  | 'POTENTIALLY_ELIGIBLE'
  | 'IN_PREPARATION'
  | string;

const CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  COMPLETED:             { label: 'Completed',            cls: 'bg-green-50 text-green-700 ring-green-600/20',   dot: 'bg-green-500' },
  APPROVED:              { label: 'Approved',             cls: 'bg-green-50 text-green-700 ring-green-600/20',   dot: 'bg-green-500' },
  ON_TRACK:              { label: 'On Track',             cls: 'bg-green-50 text-green-700 ring-green-600/20',   dot: 'bg-green-500' },
  VERIFIED:              { label: 'Verified',             cls: 'bg-green-50 text-green-700 ring-green-600/20',   dot: 'bg-green-500' },
  IN_PROGRESS:           { label: 'In Progress',          cls: 'bg-amber-50 text-amber-700 ring-amber-600/20',   dot: 'bg-amber-500' },
  UNDER_REVIEW:          { label: 'Under Review',         cls: 'bg-amber-50 text-amber-700 ring-amber-600/20',   dot: 'bg-amber-500' },
  QUERY_RAISED:          { label: 'Query Raised',         cls: 'bg-orange-50 text-orange-700 ring-orange-600/20',dot: 'bg-orange-500' },
  AT_RISK:               { label: 'At Risk',              cls: 'bg-orange-50 text-orange-700 ring-orange-600/20',dot: 'bg-orange-500' },
  INSPECTION_SCHEDULED:  { label: 'Inspection Scheduled', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20',     dot: 'bg-blue-500' },
  SUBMITTED:             { label: 'Submitted',            cls: 'bg-blue-50 text-blue-700 ring-blue-600/20',     dot: 'bg-blue-500' },
  PENDING:               { label: 'Pending',              cls: 'bg-gray-50 text-gray-600 ring-gray-500/20',     dot: 'bg-gray-400' },
  NOT_STARTED:           { label: 'Not Started',          cls: 'bg-gray-50 text-gray-600 ring-gray-500/20',     dot: 'bg-gray-400' },
  IN_PREPARATION:        { label: 'In Preparation',       cls: 'bg-gray-50 text-gray-600 ring-gray-500/20',     dot: 'bg-gray-400' },
  BLOCKED:               { label: 'Blocked',              cls: 'bg-red-50 text-red-700 ring-red-600/20',        dot: 'bg-red-500' },
  REJECTED:              { label: 'Rejected',             cls: 'bg-red-50 text-red-700 ring-red-600/20',        dot: 'bg-red-500' },
  BREACHED:              { label: 'SLA Breached',         cls: 'bg-red-50 text-red-700 ring-red-600/20',        dot: 'bg-red-500' },
  EXPIRED:               { label: 'Expired',              cls: 'bg-red-50 text-red-700 ring-red-600/20',        dot: 'bg-red-500' },
  POTENTIALLY_ELIGIBLE:  { label: 'Potentially Eligible', cls: 'bg-purple-50 text-purple-700 ring-purple-600/20',dot: 'bg-purple-500' },
};

function toLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: StatusVariant;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, showDot = true, size = 'md', className }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? { label: toLabel(status), cls: 'bg-gray-50 text-gray-600 ring-gray-500/20', dot: 'bg-gray-400' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs rounded-md' : 'px-2.5 py-1 text-xs rounded-full',
        cfg.cls,
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />}
      {cfg.label}
    </span>
  );
}

interface PriorityBadgeProps { priority: string; }
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md', map[priority] ?? 'bg-gray-100 text-gray-600')}>
      {priority}
    </span>
  );
}
