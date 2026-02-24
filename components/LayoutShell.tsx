
'use client';

import React, { useState, useEffect } from 'react';
import { Menu, ChevronRight, Clock, LogOut, ShieldCheck, User } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

export interface LayoutShellProps {
  children?: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const pathname = usePathname();
  const { role, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard';
    if (path === '/return') return 'Return';
    if (path === '/finance') return 'Finance';
    if (path === '/analisa') return 'Analisa';
    if (path === '/upload') return 'Upload Manager';
    if (path === '/sku-manager') return 'SKU Manager';
    if (path === '/logs') return 'Activity Logs';
    if (path === '/settings') return 'Settings';
    return 'Unknown';
  };

  const formattedTime = now ? now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) : '--:--:--';

  const formattedDate = now ? now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Loading...';

  return (
    <div className="flex h-screen overflow-hidden bg-app text-text-main transition-colors duration-500">
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Component */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 transition-colors duration-500 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-text-muted hover:bg-app rounded-lg"
            >
              <Menu size={24} />
            </button>
            <nav className="hidden md:flex items-center text-sm font-medium text-text-muted">
              <span>App</span>
              <ChevronRight size={16} className="mx-2 opacity-50" />
              <span className="text-brand">
                {getPageTitle(pathname)}
              </span>
            </nav>
          </div>
          
          <div className="flex items-center gap-6">
             {/* Role Badge */}
             <div className={`
               flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
               ${role === 'super_admin' ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-gray-200 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}
             `}>
               {role === 'super_admin' ? <ShieldCheck size={14} /> : <User size={14} />}
               {role === 'super_admin' ? 'Super User' : 'Guest Mode'}
             </div>

            {mounted && (
              <div className="hidden sm:flex flex-col items-end text-right animate-in fade-in duration-500">
                <div className="flex items-center gap-2 text-sm font-bold text-text-main tabular-nums">
                  <Clock size={14} className="text-brand" />
                  {formattedTime}
                </div>
                <div className="text-xs uppercase tracking-wider font-semibold text-text-muted">
                  {formattedDate}
                </div>
              </div>
            )}

            <div className="h-6 w-px bg-border hidden sm:block"></div>

            <button 
              onClick={logout}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
