import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarContextProvider } from '../sidebar-context';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContextProvider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <div className="flex min-h-screen bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 ml-0 lg:ml-[260px] overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarContextProvider>
  );
}
