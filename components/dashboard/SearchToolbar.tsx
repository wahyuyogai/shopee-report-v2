import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const SearchToolbar: React.FC<SearchToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  hasActiveFilters,
  onResetFilters
}) => {
  return (
    <div className="p-4 border-b border-border bg-surface flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-0 z-20 shadow-sm">
        {/* Left: Global Search */}
        <div className="relative w-full sm:max-w-md group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand transition-colors">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Cari Pesanan, Resi, Produk..."
              className="w-full pl-9 pr-10 py-2.5 bg-app/50 border-2 border-border rounded-xl text-sm font-medium focus:border-brand focus:bg-surface focus:outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-red-500 cursor-pointer"
                >
                    <X size={14} />
                </button>
            )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {hasActiveFilters && (
                <button
                    onClick={onResetFilters}
                    className="px-4 py-2 text-xs font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                >
                    <X size={14} />
                    Reset Filter
                </button>
            )}
        </div>
    </div>
  );
};