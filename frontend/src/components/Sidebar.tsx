import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/documents', label: 'Documents', icon: '📄' },
  { to: '/chat', label: 'RAG Chat', icon: '💬' },
  { to: '/knowledge', label: 'Knowledge Base', icon: '📚' },
  { to: '/status', label: 'System Status', icon: '🔧' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-[#0f172a] text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-blue-400">Trust</span>RAG
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Secure RAG Framework</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">Baseline RAG v0.1.0</p>
        <p className="text-xs text-slate-600 mt-1">Stages 1–6 Complete</p>
      </div>
    </aside>
  );
}
