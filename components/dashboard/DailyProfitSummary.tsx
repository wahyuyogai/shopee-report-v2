'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DailyProfitData {
  tanggal: string;
  estimasiProfit: number;
  deduction: number;
  rebate: number;
  ppn: number;
  jumlahBiayaIklan: number;
  estProfitBersih: number;
}

interface DailyProfitSummaryProps {
  data: DailyProfitData[];
  isLoading: boolean;
  adSpendMode: 'top-up' | 'gmv-max';
  setAdSpendMode: (mode: 'top-up' | 'gmv-max') => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export const DailyProfitSummary: React.FC<DailyProfitSummaryProps> = ({ data, isLoading, adSpendMode, setAdSpendMode }) => {
  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl shadow-xl border border-border p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold text-text-main tracking-tight mb-4">Daily Profit (Est.)</h2>
        <div className="text-center py-8 text-text-muted">Memuat data...</div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
      return (
        <div className="bg-surface rounded-2xl shadow-xl border border-border p-4 md:p-6 mb-6">
            <h2 className="text-xl font-bold text-text-main tracking-tight mb-4">Daily Profit (Est.)</h2>
            <div className="text-center py-8 text-text-muted">Tidak ada data untuk ditampilkan.</div>
        </div>
      )
  }

  const totalEstimasiProfit = data.reduce((sum, item) => sum + item.estimasiProfit, 0);
  const totalDeduction = data.reduce((sum, item) => sum + (item.deduction || 0), 0);
  const totalRebate = data.reduce((sum, item) => sum + (item.rebate || 0), 0);
  const totalPpn = data.reduce((sum, item) => sum + (item.ppn || 0), 0);
  const totalJumlahBiayaIklan = data.reduce((sum, item) => sum + item.jumlahBiayaIklan, 0);
  const totalEstProfitBersih = data.reduce((sum, item) => sum + item.estProfitBersih, 0);

  return (
    <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden mb-6">
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-main tracking-tight">Daily Profit (Est.)</h2>
              <div className="flex items-center gap-2 p-1 rounded-full bg-background border border-border text-sm font-medium">
                <button 
                  onClick={() => setAdSpendMode('top-up')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    adSpendMode === 'top-up' ? 'bg-brand text-white shadow' : 'text-text-muted hover:bg-surface'
                  }`}>
                    Top Up Iklan
                </button>
                <button 
                  onClick={() => setAdSpendMode('gmv-max')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    adSpendMode === 'gmv-max' ? 'bg-brand text-white shadow' : 'text-text-muted hover:bg-surface'
                  }`}>
                    GMV Max Budget
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-muted uppercase bg-surface sticky top-0 border-b border-border">
                        <tr>
                            <th scope="col" className="px-4 py-3">Tanggal</th>
                            <th scope="col" className="px-4 py-3 text-right">Estimasi Profit</th>
                            {adSpendMode === 'gmv-max' && (
                                <>
                                    <th scope="col" className="px-4 py-3 text-right">Deduction</th>
                                    <th scope="col" className="px-4 py-3 text-right">Rebate</th>
                                    <th scope="col" className="px-4 py-3 text-right">PPN 11%</th>
                                </>
                            )}
                            <th scope="col" className="px-4 py-3 text-right">Jumlah Biaya Iklan</th>
                            <th scope="col" className="px-4 py-3 text-right">Est. Profit Bersih</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.tanggal} className="border-b border-border hover:bg-surface/80">
                                <td className="px-4 py-3 font-medium text-text-main whitespace-nowrap">{formatDate(item.tanggal)}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(item.estimasiProfit)}</td>
                                {adSpendMode === 'gmv-max' && (
                                    <>
                                        <td className="px-4 py-3 text-right text-amber-500">{formatCurrency(item.deduction)}</td>
                                        <td className="px-4 py-3 text-right text-cyan-500">{formatCurrency(item.rebate)}</td>
                                        <td className="px-4 py-3 text-right text-orange-500">{formatCurrency(item.ppn)}</td>
                                    </>
                                )}
                                <td className="px-4 py-3 text-right text-red-500">{formatCurrency(item.jumlahBiayaIklan)}</td>
                                <td className={`px-4 py-3 text-right font-bold ${item.estProfitBersih >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {item.estProfitBersih > 0 && <TrendingUp size={14} />}
                                        {item.estProfitBersih < 0 && <TrendingDown size={14} />}
                                        {item.estProfitBersih === 0 && <Minus size={14} />}
                                        <span>{formatCurrency(item.estProfitBersih)}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-surface sticky bottom-0 border-t-2 border-border font-bold text-text-main">
                        <tr>
                            <td className="px-4 py-3">Total</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(totalEstimasiProfit)}</td>
                            {adSpendMode === 'gmv-max' && (
                                <>
                                    <td className="px-4 py-3 text-right text-amber-500">{formatCurrency(totalDeduction)}</td>
                                    <td className="px-4 py-3 text-right text-cyan-500">{formatCurrency(totalRebate)}</td>
                                    <td className="px-4 py-3 text-right text-orange-500">{formatCurrency(totalPpn)}</td>
                                </>
                            )}
                            <td className="px-4 py-3 text-right text-red-500">{formatCurrency(totalJumlahBiayaIklan)}</td>
                            <td className={`px-4 py-3 text-right ${totalEstProfitBersih >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                <div className="flex items-center justify-end gap-1">
                                    {totalEstProfitBersih > 0 && <TrendingUp size={14} />}
                                    {totalEstProfitBersih < 0 && <TrendingDown size={14} />}
                                    {totalEstProfitBersih === 0 && <Minus size={14} />}
                                    <span>{formatCurrency(totalEstProfitBersih)}</span>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
  );
};
