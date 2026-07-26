interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  online: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  connected: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  operational: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  verified: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  processed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  error: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  offline: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  degraded: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = statusStyles[key] || { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' };
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
