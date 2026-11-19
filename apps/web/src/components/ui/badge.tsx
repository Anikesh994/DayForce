import { clsx } from 'clsx';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variants: Record<Variant, string> = {
  default:  'bg-slate-100 text-slate-700',
  success:  'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  info:     'bg-blue-100 text-blue-700',
  muted:    'bg-slate-50 text-slate-500',
};

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function severityBadge(severity: string) {
  const map: Record<string, Variant> = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' };
  return <Badge variant={map[severity] || 'muted'}>{severity}</Badge>;
}

export function statusBadge(status: string) {
  const map: Record<string, Variant> = {
    DETECTED:             'warning',
    INVESTIGATING:        'info',
    WAITING_FOR_APPROVAL: 'warning',
    APPROVED:             'success',
    RESOLVED:             'success',
    REJECTED:             'danger',
    CANCELLED:            'muted',
    ESCALATED:            'danger',
    NEEDS_MORE_INFO:      'warning',
    FAILED:               'danger',
    PENDING:              'warning',
    CONSUMED:             'success',
    EXPIRED:              'muted',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}
