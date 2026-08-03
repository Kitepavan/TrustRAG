import type { ReactNode } from 'react';
import { useSidebar } from '../sidebar-context';

interface PageHeaderProps {
  breadcrumb: ReactNode;
  online?: boolean;
  actions?: ReactNode;
}

/**
 * Shared page header used across all dashboard pages.
 * The negative margins intentionally offset the Layout's p-6 container so the
 * header spans the full content width and sticks to the top. This pattern is
 * defined once here — do not inline it per-page.
 */
export default function PageHeader({ breadcrumb, online = true, actions }: PageHeaderProps) {
  const { openSidebar } = useSidebar();

  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-surface-dim border-b border-outline-variant sticky top-0 z-40 -ml-6 -mt-6 mb-6">
      <div className="flex items-center space-x-4 min-w-0">
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open navigation"
          className="material-symbols-outlined text-on-surface-variant hover:text-on-surface lg:hidden shrink-0"
        >
          menu
        </button>
        <span className="text-[14px] leading-[20px] text-on-surface-variant truncate">
          {breadcrumb}
        </span>
      </div>
      <div className="flex items-center space-x-6 shrink-0">
        {online && (
          <div className="hidden sm:flex items-center text-secondary text-[12px] space-x-2">
            <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(103,223,112,0.6)]"></span>
            <span>Online</span>
          </div>
        )}
        <div className="flex items-center space-x-4 border-l border-outline-variant pl-6">
          <button
            type="button"
            aria-label="Network settings"
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
          >
            dns
          </button>
          <button
            type="button"
            aria-label="Hardware status"
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
          >
            memory
          </button>
          <button
            type="button"
            aria-label="User profile"
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
          >
            person
          </button>
          {actions}
        </div>
      </div>
    </header>
  );
}
