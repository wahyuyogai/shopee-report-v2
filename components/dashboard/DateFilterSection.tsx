
import React from 'react';
import { Calendar } from 'lucide-react';

interface DateFilterSectionProps {
  dateFilter: {
    start: string;
    end: string;
  };
  setDateFilter: React.Dispatch<React.SetStateAction<{
    start: string;
    end: string;
  }>>;
}

export const DateFilterSection: React.FC<DateFilterSectionProps> = ({
  dateFilter,
  setDateFilter,
}) => {
  return (
    <div className="px-5 py-4 border-b border-border bg-surface/30">
         <div className="flex items-center gap-2 mb-3 text-brand">
            <Calendar size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Periode (Global Date)</h3>
         </div>

         <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
             <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="text-xs uppercase font-bold text-text-muted tracking-wider">Mulai</label>
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-border bg-surface focus:border-brand focus:outline-none h-[36px]"
                />
             </div>
             <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="text-xs uppercase font-bold text-text-muted tracking-wider">Sampai</label>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-border bg-surface focus:border-brand focus:outline-none h-[36px]"
                />
             </div>
         </div>
    </div>
  );
};
