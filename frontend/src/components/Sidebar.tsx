import { Link, NavLink } from 'react-router-dom';
import { api, logout } from '../services/api';
import { useApi } from '../hooks/useApi';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/documents', label: 'Documents', icon: 'description' },
  { to: '/chat', label: 'RAG chat', icon: 'chat_bubble' },
  { to: '/evaluation', label: 'Security benchmark', icon: 'verified_user' },
  { to: '/audit', label: 'Audit log', icon: 'receipt_long' },
  { to: '/knowledge', label: 'Knowledge base', icon: 'database' },
  { to: '/status', label: 'System status', icon: 'analytics' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { data: health } = useApi(() => api.getHealth(), []);
  const isHealthy = health?.status === 'healthy';

  const { data: currentUser } = useApi(() => api.getCurrentUser(), []);
  const canViewAudit = currentUser?.role === 'Admin' || currentUser?.role === 'IT_Security';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[232px] flex-col border-r border-outline-variant/70 bg-background py-4 transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="mb-6 px-5">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="TrustRAG dashboard" className="flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <img src="/trustrag-mark.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              <span className="text-[19px] font-semibold tracking-[-0.035em] text-on-surface">Trust<span className="text-primary">RAG</span></span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="material-symbols-outlined text-on-surface-variant hover:text-on-surface lg:hidden"
            >
              close
            </button>
          </div>
          <p className="ml-[42px] mt-1 text-[11px] leading-4 text-on-surface-variant">
            Secure knowledge workspace
          </p>
        </div>

        <div className="mb-5 border-b border-outline-variant/70 px-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="truncate text-[12px] font-medium text-on-surface">{currentUser?.full_name ?? 'User'}</p>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">{currentUser?.role ?? 'Role'}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center justify-center rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
          {navItems
            .filter((item) => item.to !== '/audit' || canViewAudit)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-[13px] transition-colors duration-150 ease-out ${
                    isActive
                      ? 'border-primary bg-surface-container text-on-surface'
                      : 'border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
        </nav>

        {/* Footer */}
        <div className="space-y-3 border-t border-outline-variant/70 px-5 pt-4">
          <div className="flex items-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">verified_user</span>
            <span className="text-[12px] leading-[16px]">Security Engine Active</span>
          </div>
          <div className={`flex items-center ${isHealthy ? 'text-secondary' : 'text-error'}`}>
            <span className="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">
              {isHealthy ? 'check_circle' : 'error'}
            </span>
            <span className="text-[12px] leading-[16px]">
              {isHealthy ? 'Status: Healthy' : 'Status: Offline'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
