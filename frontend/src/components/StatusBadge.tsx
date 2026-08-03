interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  online: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  ready: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  connected: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  operational: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  verified: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  processed: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  indexed: { bg: 'bg-secondary-container/20', text: 'text-secondary', dot: 'bg-secondary' },
  error: { bg: 'bg-error-container/20', text: 'text-error', dot: 'bg-error' },
  offline: { bg: 'bg-error-container/20', text: 'text-error', dot: 'bg-error' },
  failed: { bg: 'bg-error-container/20', text: 'text-error', dot: 'bg-error' },
  degraded: { bg: 'bg-tertiary-container/20', text: 'text-tertiary', dot: 'bg-tertiary' },
  warning: { bg: 'bg-tertiary-container/20', text: 'text-tertiary', dot: 'bg-tertiary' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = statusStyles[key] || { bg: 'bg-surface-variant', text: 'text-on-surface-variant', dot: 'bg-outline' };
  const sizeClasses = size === 'sm' ? 'text-[12px] leading-[16px] px-2 py-0.5' : 'text-[14px] leading-[20px] px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded font-medium ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
