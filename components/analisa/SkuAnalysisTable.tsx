'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Loader2 } from 'lucide-react';

type SortDirection = 'asc' | 'desc';

interface SkuAnalysisData {
  skuFinal: string;
  totalPesanan: number;
  totalKuantitas: number;
  estimasiProfit: number;
}

interface SkuAnalysisTableProps {
  data: SkuAnalysisData[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};

export const SkuAnalysisTable: React.FC<SkuAnalysisTableProps> = ({ data, isLoading }) => {
    const [sortColumn, setSortColumn] = useState<keyof SkuAnalysisData>('estimasiProfit');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const sortedData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (aValue < bValue) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [data, sortColumn, sortDirection]);

    const handleSort = (column: keyof SkuAnalysisData) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const SortableHeader = ({ column, label }: { column: keyof SkuAnalysisData; label: string }) => (
        <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-app" onClick={() => handleSort(column)}>
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown size={14} />
            </div>
        </th>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-brand" size={32} />
            </div>
        );
    }

    if (data.length === 0) {
        return <div className="text-center py-8 text-text-muted">Tidak ada data untuk ditampilkan.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-muted uppercase bg-app/40">
                    <tr>
                        <SortableHeader column="skuFinal" label="SKU Final" />
                        <SortableHeader column="totalPesanan" label="Total Pesanan" />
                        <SortableHeader column="totalKuantitas" label="Total Kuantitas" />
                        <SortableHeader column="estimasiProfit" label="Estimasi Profit" />
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item) => (
                        <tr key={item.skuFinal} className="border-b border-border hover:bg-surface/80">
                            <td className="px-4 py-3 font-medium text-text-main whitespace-nowrap">{item.skuFinal}</td>
                            <td className="px-4 py-3 text-center">{item.totalPesanan}</td>
                            <td className="px-4 py-3 text-center">{item.totalKuantitas}</td>
                            <td className={`px-4 py-3 font-bold text-right ${item.estimasiProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(item.estimasiProfit)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
