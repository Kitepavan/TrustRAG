import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarContextProvider } from '../sidebar-context';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContextProvider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <div className="min-h-screen bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-h-screen min-w-0 overflow-auto lg:ml-[232px]">
          <div className="p-5 sm:p-7 xl:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarContextProvider>
  );
}
