
'use client';

import React from 'react';
import { Database, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PreviewTableProps {
  data: any[];
  type: 'new' | 'duplicate';
  category: 'failed' | 'returned';
  onExport: (data: any[], prefix: string) => void;
}

const formatDate = (dateValue: any): string => {
  if (!dateValue) return '-';

  // Handle Excel numeric date format
  if (typeof dateValue === 'number') {
    // Excel's epoch starts on 1900-01-01, but JS's is 1970-01-01.
    // There's also a leap year bug in Excel for 1900.
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  const dateStr = String(dateValue);
  // Handle 'DD/MM/YYYY' or 'D/M/YYYY'
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    const d = new Date(`${year}-${month}-${day}`);
    if (!isNaN(d.getTime())) {
        return `${day}/${month}/${year}`;
    }
  }
  
  // Fallback for other valid date strings
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return dateStr; // Return original if all parsing fails
};

export const PreviewTable: React.FC<PreviewTableProps> = ({ data, type, category, onExport }) => {
  if (data.length === 0) return null;
  
  // Get headers from first row, prioritized
  const firstRow = data[0];
  const headers = Object.keys(firstRow);
  const categoryLabel = category === 'failed' ? 'Pengiriman Gagal' : 'Pengembalian';

  return (
    <div className={`
      border rounded-xl overflow-hidden shadow-sm mt-4
      ${type === 'new' ? 'border-brand/30 bg-surface' : 'border-amber-500/30 bg-amber-500/5'}
    `}>
      <div className={`
        px-4 py-3 border-b flex justify-between items-center
        ${type === 'new' ? 'bg-brand/5 border-brand/20' : 'bg-amber-500/10 border-amber-500/20'}
      `}>
        <div className="flex items-center gap-2">
          {type === 'new' ? <Database size={18} className="text-brand" /> : <AlertTriangle size={18} className="text-amber-600" />}
          <h3 className={`font-bold text-sm ${type === 'new' ? 'text-brand' : 'text-amber-700'}`}>
            [{categoryLabel}] {type === 'new' ? 'Data Baru' : 'Data Duplikat'}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/50 border border-black/5">
            {data.length} Baris
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onExport(data, `${category}-${type}-Preview`)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-border bg-surface hover:bg-app rounded-lg transition-all"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>
      
      <div className="overflow-auto max-h-[300px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr>
              {headers.map(h => (
                <th key={h} className={`
                  px-4 py-2 font-semibold text-text-muted border-b border-border whitespace-nowrap
                  ${type === 'new' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-amber-50 dark:bg-amber-900'}
                `}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-black/5 transition-colors">
                {headers.map(h => (
                  <td key={h} className="px-4 py-2 whitespace-nowrap text-text-main">
                    {h === 'Waktu' ? formatDate(row[h]) : (row[h]?.toString() || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
