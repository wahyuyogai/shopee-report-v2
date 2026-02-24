
import React, { useState, useRef, useEffect } from 'react';
import { GitMerge, AlertOctagon, RotateCcw, Search, X, FilterX, Filter, ChevronDown, XCircle, LayoutList } from 'lucide-react';
import { DashboardTab } from '../../types';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  failedCount: number;
  returnCount: number;
  cancelledCount?: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  isFiltersOpen: boolean;
  onToggleFilters: () => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab,
  setActiveTab,
  failedCount,
  returnCount,
  cancelledCount = 0,
  searchQuery,
  setSearchQuery,
  hasActiveFilters,
  onResetFilters,
  isFiltersOpen,
  onToggleFilters
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'merger' as DashboardTab, label: 'Merger View', icon: <GitMerge size={16} />, count: 0, color: 'text-brand' },
    { id: 'failed' as DashboardTab, label: 'Pengiriman Gagal', icon: <AlertOctagon size={16} />, count: failedCount, color: 'text-red-500' },
    { id: 'return' as DashboardTab, label: 'Pengembalian', icon: <RotateCcw size={16} />, count: returnCount, color: 'text-blue-500' },
    { id: 'cancelled' as DashboardTab, label: 'Pembatalan', icon: <XCircle size={16} />, count: cancelledCount, color: 'text-orange-500' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-app/40 border-b border-border sticky top-0 z-30 backdrop-blur-md">
      
      {/* DROPDOWN TAB SELECTOR (LEFT) */}
      <div className="relative w-full md:w-64" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-surface border border-border rounded-xl shadow-sm hover:border-brand/50 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-app group-hover:bg-brand/10 transition-colors ${currentTab.color}`}>
              {currentTab.icon}
            </div>
            <div className="flex flex-col items-start">
               <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tampilan Data</span>
               <span className="text-sm font-bold text-text-main">{currentTab.label}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentTab.count > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white px-1.5 shadow-sm">
                  {currentTab.count}
                </span>
            )}
            <ChevronDown size={16} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top-left">
            <div className="p-1.5 space-y-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-brand/5 text-brand' 
                        : 'text-text-main hover:bg-app'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-brand' : 'text-text-muted'}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    
                    {tab.count > 0 && (
                      <span className={`
                        text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${isActive 
                          ? 'bg-brand text-white' 
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}
                      `}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SEARCH & TOOLS (RIGHT) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 justify-end">
        
        {/* Filter Toggle Button */}
        <button
          onClick={onToggleFilters}
          className={`
            flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border h-[52px] sm:h-auto
            ${isFiltersOpen 
              ? 'bg-brand text-brand-content border-brand shadow-lg shadow-brand/20' 
              : 'bg-surface hover:bg-surface/80 text-text-muted hover:text-text-main border-border hover:border-brand/30'}
          `}
        >
          <Filter size={16} />
          <span className="whitespace-nowrap">Filter</span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-300 ${isFiltersOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {hasActiveFilters && (
            <button
                onClick={onResetFilters}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-colors whitespace-nowrap h-[52px] sm:h-auto"
            >
                <FilterX size={16} />
            </button>
        )}

        <div className="relative w-full sm:max-w-xs group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand transition-colors">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Cari Pesanan / Resi..."
              className="w-full pl-10 pr-10 py-3 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-red-500 cursor-pointer"
                >
                    <X size={16} />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
