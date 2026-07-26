interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  status?: 'online' | 'offline' | 'warning';
}

export default function Card({ title, value, subtitle, icon, status }: CardProps) {
  const statusColor = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    warning: 'bg-amber-500',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <span className="text-2xl opacity-60">{icon}</span>
        )}
        {status && (
          <span className={`w-2.5 h-2.5 rounded-full ${statusColor[status]} mt-1.5`} />
        )}
      </div>
    </div>
  );
}
