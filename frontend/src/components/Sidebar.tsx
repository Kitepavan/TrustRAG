import { NavLink } from 'react-router-dom';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

const navItems = [
  { to: '/', label: 'DASHBOARD', icon: 'dashboard' },
  { to: '/documents', label: 'DOCUMENTS', icon: 'description' },
  { to: '/chat', label: 'RAG CHAT', icon: 'chat_bubble' },
  { to: '/knowledge', label: 'KNOWLEDGE BASE', icon: 'database' },
  { to: '/status', label: 'SYSTEM STATUS', icon: 'analytics' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { data: health } = useApi(() => api.getHealth(), []);
  const isHealthy = health?.status === 'healthy';

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
        className={`fixed left-0 top-0 h-full w-[260px] bg-surface-container border-r border-outline-variant flex flex-col py-4 z-50 transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-6 mb-10">
          <div className="flex items-center justify-between">
            <h1 className="text-[24px] leading-[32px] font-bold text-primary">
              TrustRAG
            </h1>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="material-symbols-outlined text-on-surface-variant hover:text-on-surface lg:hidden"
            >
              close
            </button>
          </div>
          <p className="text-[12px] leading-[16px] text-on-surface-variant opacity-70 mt-0.5">
            Enterprise AI v1.2.0
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 transition-all duration-150 ease-in-out ${
                  isActive
                    ? 'bg-surface-variant text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant font-medium hover:bg-surface-variant hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined mr-3" aria-hidden="true">{item.icon}</span>
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold uppercase">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 pt-4 border-t border-outline-variant space-y-3">
          <div className="flex items-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">history</span>
            <span className="text-[12px] leading-[16px]">Versioning</span>
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
