import { X } from 'lucide-react';

export const ActiveFilters = ({ filters, setFilters, dateFilter, setDateFilter }) => {
  const activeFilterList = [];

  if (filters.toko) {
    activeFilterList.push({ 
      key: 'toko', 
      label: 'Toko', 
      value: filters.toko, 
      clear: () => setFilters(prev => ({ ...prev, toko: '' })) 
    });
  }

  if (dateFilter.column && (dateFilter.start || dateFilter.end)) {
    const dateLabel = dateFilter.start && dateFilter.end 
      ? `${dateFilter.start} - ${dateFilter.end}`
      : dateFilter.start || dateFilter.end;
    activeFilterList.push({ 
      key: 'date', 
      label: dateFilter.column, 
      value: dateLabel, 
      clear: () => setDateFilter({ column: '', start: '', end: '' }) 
    });
  }

  if (activeFilterList.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-6 pb-4 text-sm animate-in fade-in duration-300">
      <span className="font-semibold text-text-muted">Filter Aktif:</span>
      <div className="flex flex-wrap items-center gap-2">
        {activeFilterList.map(filter => (
          <div key={filter.key} className="flex items-center gap-1.5 bg-brand/10 text-brand font-bold px-2.5 py-1 rounded-full">
            <span>{filter.label}:</span>
            <span className="font-medium">{filter.value}</span>
            <button onClick={filter.clear} className="ml-1 p-0.5 rounded-full hover:bg-brand/20">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
