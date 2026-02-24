
'use client';

import React from 'react';
import { LayoutDashboard, Upload, X, Package, Settings, ClipboardList, Tags, TrendingUp, RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useData } from './DataProvider';
import { useAuth } from './AuthProvider';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const pathname = usePathname();
  const { totalLogCount, unreadLogCount } = useData();
  const { role } = useAuth();

  const allMenuItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={20} />,
      roles: ['super_admin', 'guest']
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: <TrendingUp size={20} />,
      roles: ['super_admin', 'guest']
    },
    { 
      path: '/return', 
      label: 'Return', 
      icon: <RotateCcw size={20} />,
      roles: ['super_admin', 'guest']
    },
    { 
      path: '/upload', 
      label: 'Upload Manager', 
      icon: <Upload size={20} />,
      roles: ['super_admin'] // Hidden for Guest
    },
    { 
      path: '/sku-manager', 
      label: 'SKU Manager', 
      icon: <Tags size={20} />,
      roles: ['super_admin'] // Hidden for Guest
    },
    { 
      path: '/logs', 
      label: 'Activity Logs', 
      icon: <ClipboardList size={20} />,
      roles: ['super_admin', 'guest']
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: <Settings size={20} />,
      roles: ['super_admin', 'guest']
    },
  ];

  // Filter menu based on role
  const menuItems = allMenuItems.filter(item => item.roles.includes(role || 'guest'));
  
  // Split into main and bottom items (Settings is usually last)
  const mainItems = menuItems.filter(i => i.path !== '/settings');
  const bottomItems = menuItems.filter(i => i.path === '/settings');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 bg-sidebar border-r border-border transition-all duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block
      `}>
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="flex items-center gap-2 font-bold text-xl text-brand">
            <div className="bg-brand p-1 rounded-lg">
               <Package className="h-5 w-5 text-brand-content" />
            </div>
            <span>Shopee Report</span>
          </div>
          <button 
            className="ml-auto md:hidden text-text-muted"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1 h-[calc(100%-4rem)] flex flex-col">
          <div className="flex-1 space-y-1">
            {mainItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all relative group
                    ${isActive 
                      ? 'bg-brand text-brand-content shadow-lg shadow-brand/20' 
                      : 'text-text-muted hover:bg-brand-muted hover:text-brand'}
                  `}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  
                  {/* Activity Logs Badges */}
                  {item.label === 'Activity Logs' && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* Total Logs (Gray) */}
                      {totalLogCount > 0 && (
                        <span className={`
                           text-xs font-bold px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full
                           ${isActive 
                             ? 'bg-white/20 text-white' 
                             : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}
                        `}>
                          {totalLogCount > 99 ? '99+' : totalLogCount}
                        </span>
                      )}
                      
                      {/* Unread Logs (Blue) */}
                      {unreadLogCount > 0 && (
                        <span className={`
                          text-xs font-bold px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full
                          ${isActive 
                            ? 'bg-white text-brand shadow-sm' 
                            : 'bg-blue-500 text-white shadow-md shadow-blue-500/30'}
                        `}>
                          {unreadLogCount > 99 ? '99+' : unreadLogCount}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          
          <div className="pt-4 mt-4 border-t border-border">
            {bottomItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all
                    ${isActive 
                      ? 'bg-brand text-brand-content shadow-lg shadow-brand/20' 
                      : 'text-text-muted hover:bg-brand-muted hover:text-brand'}
                  `}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
};
