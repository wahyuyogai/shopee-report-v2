
import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateFilterSectionProps {
  dateFilter: {
    column: string;
    start: string;
    end: string;
  };
  setDateFilter: React.Dispatch<React.SetStateAction<{
    column: string;
    start: string;
    end: string;
  }>>;
  dateFilterColumns: string[];
}

export const DateFilterSection: React.FC<DateFilterSectionProps> = ({
  dateFilter,
  setDateFilter,
  dateFilterColumns
}) => {
  return (
    <div className="px-5 py-4 border-b border-border bg-surface/30">
         {/* Header moved to top to match FilterSection */}
         <div className="flex items-center gap-2 mb-3 text-brand">
            <Calendar size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Periode</h3>
         </div>

         <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
             {/* Column Selector */}
             <div className="w-full">
                <label className="text-xs uppercase font-bold text-text-muted tracking-wider block mb-1">Acuan Tanggal</label>
                <div className="relative">
                  <select
                    value={dateFilter.column}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, column: e.target.value, start: '', end: '' }))}
                    className={`
                      w-full appearance-none pl-3 pr-8 py-2 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer outline-none
                      ${dateFilter.column
                        ? 'bg-brand/5 border-brand text-brand'
                        : 'bg-surface border-border text-text-main hover:border-brand/30'}
                    `}
                  >
                    <option value="">-- Pilih Kolom Tanggal --</option>
                    {dateFilterColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-text-muted">
                    <ChevronDown size={14} />
                  </div>
                </div>
             </div>

             {/* Date Inputs */}
             {dateFilter.column ? (
               <>
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
               </>
             ) : (
               <div className="hidden md:flex col-span-2 items-center text-text-muted/50 text-xs italic h-[36px]">
                  Pilih kolom acuan tanggal untuk mengaktifkan filter periode.
               </div>
             )}
         </div>
    </div>
  );
};
