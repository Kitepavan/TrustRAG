import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
    <header className="sticky top-0 z-40 -mx-5 -mt-5 mb-6 flex h-[58px] w-auto items-center justify-between border-b border-outline-variant/70 bg-background/95 px-5 backdrop-blur-sm sm:-mx-7 sm:-mt-7 sm:px-7 xl:-mx-8 xl:-mt-8 xl:px-8">
      <div className="flex items-center space-x-4 min-w-0">
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open navigation"
          className="material-symbols-outlined text-on-surface-variant hover:text-on-surface lg:hidden shrink-0"
        >
          menu
        </button>
        <Link to="/" aria-label="TrustRAG dashboard" className="mr-1 flex shrink-0 items-center gap-2 lg:hidden">
          <img src="/trustrag-mark.png" alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
          <span className="text-[14px] font-semibold tracking-[-0.03em] text-on-surface">Trust<span className="text-primary">RAG</span></span>
        </Link>
        <span className="hidden truncate text-[13px] leading-5 text-on-surface-variant sm:block">
          {breadcrumb}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {online && (
          <div className="hidden items-center gap-2 text-[12px] text-secondary sm:flex">
            <span className="h-2 w-2 rounded-full bg-secondary"></span>
            <span>Online</span>
          </div>
        )}
        <div className={`${actions ? 'border-l border-outline-variant/70 pl-4' : ''}`}>
          {actions}
        </div>
      </div>
    </header>
  );
}
