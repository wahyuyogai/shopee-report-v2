'use client';

import React, { useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Copy, Download, FileSpreadsheet, ToggleLeft, ToggleRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { useUI } from '../UIProvider';

interface DailyProfitData {
  tanggal: string;
  estimasiProfit: number;
  deduction: number;
  rebate: number;
  ppn: number;
  jumlahBiayaIklan: number;
  estimasiLoss: number;
  estProfitBersih: number;
}

interface DailyProfitSummaryProps {
  data: DailyProfitData[];
  isLoading: boolean;
  adSpendMode: 'top-up' | 'gmv-max';
  setAdSpendMode: (mode: 'top-up' | 'gmv-max') => void;
  includeEstimasiLoss: boolean;
  setIncludeEstimasiLoss: (include: boolean) => void;
  includeBiayaIklan: boolean;
  setIncludeBiayaIklan: (include: boolean) => void;
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

export const DailyProfitSummary: React.FC<DailyProfitSummaryProps> = ({ 
  data, isLoading, adSpendMode, setAdSpendMode, 
  includeEstimasiLoss, setIncludeEstimasiLoss,
  includeBiayaIklan, setIncludeBiayaIklan 
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const { showToast } = useUI();

  const handleExportXLSX = () => {
    if (!data || data.length === 0) return;

    const exportData = data.map(item => {
      const row: any = {
        'Tanggal': formatDate(item.tanggal),
        'Estimasi Profit': item.estimasiProfit,
      };

      if (adSpendMode === 'gmv-max') {
        row['Deduction'] = item.deduction;
        row['Rebate'] = item.rebate;
        row['PPN 11%'] = item.ppn;
      }

      row['Jumlah Biaya Iklan'] = item.jumlahBiayaIklan;
      row['Estimasi Loss'] = item.estimasiLoss;
      row['Est. Profit Bersih'] = item.estProfitBersih;

      return row;
    });

    // Add Total Row
    const totalRow: any = {
      'Tanggal': 'Total',
      'Estimasi Profit': data.reduce((sum, item) => sum + item.estimasiProfit, 0),
    };

    if (adSpendMode === 'gmv-max') {
      totalRow['Deduction'] = data.reduce((sum, item) => sum + (item.deduction || 0), 0);
      totalRow['Rebate'] = data.reduce((sum, item) => sum + (item.rebate || 0), 0);
      totalRow['PPN 11%'] = data.reduce((sum, item) => sum + (item.ppn || 0), 0);
    }

    totalRow['Jumlah Biaya Iklan'] = data.reduce((sum, item) => sum + item.jumlahBiayaIklan, 0);
    totalRow['Estimasi Loss'] = data.reduce((sum, item) => sum + item.estimasiLoss, 0);
    totalRow['Est. Profit Bersih'] = data.reduce((sum, item) => sum + item.estProfitBersih, 0);

    exportData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Profit');
    XLSX.writeFile(wb, `Daily_Profit_Summary_${adSpendMode}.xlsx`);
    showToast('success', 'Export Berhasil', 'Data berhasil diekspor ke XLSX');
  };

  const captureTable = async () => {
    if (!tableRef.current) return null;
    
    // Save original styles
    const originalMaxHeight = tableRef.current.style.maxHeight;
    const originalOverflow = tableRef.current.style.overflow;
    const originalWidth = tableRef.current.style.width;
    
    // Temporarily expand to full height and width
    tableRef.current.style.maxHeight = 'none';
    tableRef.current.style.overflow = 'visible';
    tableRef.current.style.width = `${tableRef.current.scrollWidth}px`;
    
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#1a1b1e', // Match dark theme background
        scale: 2, // Higher resolution
        windowWidth: tableRef.current.scrollWidth,
        windowHeight: tableRef.current.scrollHeight,
      });
      return canvas;
    } finally {
      // Restore original styles
      tableRef.current.style.maxHeight = originalMaxHeight;
      tableRef.current.style.overflow = originalOverflow;
      tableRef.current.style.width = originalWidth;
    }
  };

  const handleCopyPNG = async () => {
    try {
      showToast('info', 'Menyalin...', 'Sedang menyiapkan gambar untuk disalin');
      const canvas = await captureTable();
      if (!canvas) return;
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showToast('success', 'Berhasil Disalin', 'Gambar tabel berhasil disalin ke clipboard');
        }
      });
    } catch (err) {
      console.error('Failed to copy image:', err);
      showToast('error', 'Gagal', 'Terjadi kesalahan saat menyalin gambar');
    }
  };

  const handleSavePNG = async () => {
    try {
      showToast('info', 'Menyimpan...', 'Sedang menyiapkan gambar untuk diunduh');
      const canvas = await captureTable();
      if (!canvas) return;
      
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Daily_Profit_Summary_${adSpendMode}.png`;
      link.href = url;
      link.click();
      showToast('success', 'Berhasil Disimpan', 'Gambar tabel berhasil diunduh');
    } catch (err) {
      console.error('Failed to save image:', err);
      showToast('error', 'Gagal', 'Terjadi kesalahan saat menyimpan gambar');
    }
  };

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
  const totalEstimasiLoss = data.reduce((sum, item) => sum + item.estimasiLoss, 0);
  const totalEstProfitBersih = data.reduce((sum, item) => {
    const biayaIklan = includeBiayaIklan ? item.jumlahBiayaIklan : 0;
    const estimasiLoss = includeEstimasiLoss ? item.estimasiLoss : 0;
    return sum + (item.estimasiProfit - biayaIklan - estimasiLoss);
  }, 0);

  return (
    <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden mb-6">
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-xl font-bold text-text-main tracking-tight">Daily Profit (Est.)</h2>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Export Buttons */}
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={handleCopyPNG}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border bg-surface hover:bg-app rounded-lg transition-all text-text-muted hover:text-text-main"
                    title="Copy as PNG"
                  >
                    <Copy size={14} />
                    <span className="hidden sm:inline">Copy PNG</span>
                  </button>
                  <button
                    onClick={handleSavePNG}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border bg-surface hover:bg-app rounded-lg transition-all text-text-muted hover:text-text-main"
                    title="Save as PNG"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Save PNG</span>
                  </button>
                  <button
                    onClick={handleExportXLSX}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border bg-surface hover:bg-app rounded-lg transition-all text-text-muted hover:text-text-main"
                    title="Export to XLSX"
                  >
                    <FileSpreadsheet size={14} />
                    <span className="hidden sm:inline">Export XLSX</span>
                  </button>
                </div>

                {/* Mode Toggle */}
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
            </div>
            <div className="overflow-x-auto max-h-96" ref={tableRef}>
                <table className="w-full text-sm text-left bg-surface">
                    <thead className="text-xs text-text-muted uppercase bg-surface sticky top-0 border-b border-border z-10">
                        <tr>
                            <th scope="col" className="px-4 py-3 bg-surface">Tanggal</th>
                            <th scope="col" className="px-4 py-3 text-right bg-surface">Estimasi Profit</th>
                            {adSpendMode === 'gmv-max' && (
                                <>
                                    <th scope="col" className="px-4 py-3 text-right bg-surface">Deduction</th>
                                    <th scope="col" className="px-4 py-3 text-right bg-surface">Rebate</th>
                                    <th scope="col" className="px-4 py-3 text-right bg-surface">PPN 11%</th>
                                </>
                            )}
                            <th scope="col" className="px-4 py-3 text-right bg-surface">
                                <button 
                                  onClick={() => setIncludeBiayaIklan(!includeBiayaIklan)}
                                  className={`flex items-center justify-end gap-1 w-full hover:text-text-main transition-colors ${!includeBiayaIklan ? 'opacity-50' : ''}`}
                                  title={includeBiayaIklan ? "Klik untuk mengabaikan Biaya Iklan" : "Klik untuk memasukkan Biaya Iklan"}
                                >
                                  Jumlah Biaya Iklan
                                  {includeBiayaIklan ? <ToggleRight size={16} className="text-brand" /> : <ToggleLeft size={16} />}
                                </button>
                            </th>
                            <th scope="col" className="px-4 py-3 text-right bg-surface">
                                <button 
                                  onClick={() => setIncludeEstimasiLoss(!includeEstimasiLoss)}
                                  className={`flex items-center justify-end gap-1 w-full hover:text-text-main transition-colors ${!includeEstimasiLoss ? 'opacity-50' : ''}`}
                                  title={includeEstimasiLoss ? "Klik untuk mengabaikan Estimasi Loss" : "Klik untuk memasukkan Estimasi Loss"}
                                >
                                  Estimasi Loss
                                  {includeEstimasiLoss ? <ToggleRight size={16} className="text-brand" /> : <ToggleLeft size={16} />}
                                </button>
                            </th>
                            <th scope="col" className="px-4 py-3 text-right bg-surface">Est. Profit Bersih</th>
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
                                <td className={`px-4 py-3 text-right text-red-500 ${!includeBiayaIklan ? 'opacity-50 line-through' : ''}`}>{formatCurrency(item.jumlahBiayaIklan)}</td>
                                <td className={`px-4 py-3 text-right text-red-500 ${!includeEstimasiLoss ? 'opacity-50 line-through' : ''}`}>{formatCurrency(item.estimasiLoss)}</td>
                                <td className={`px-4 py-3 text-right font-bold ${ (item.estimasiProfit - (includeBiayaIklan ? item.jumlahBiayaIklan : 0) - (includeEstimasiLoss ? item.estimasiLoss : 0)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {(item.estimasiProfit - (includeBiayaIklan ? item.jumlahBiayaIklan : 0) - (includeEstimasiLoss ? item.estimasiLoss : 0)) > 0 && <TrendingUp size={14} />}
                                        {(item.estimasiProfit - (includeBiayaIklan ? item.jumlahBiayaIklan : 0) - (includeEstimasiLoss ? item.estimasiLoss : 0)) < 0 && <TrendingDown size={14} />}
                                        {(item.estimasiProfit - (includeBiayaIklan ? item.jumlahBiayaIklan : 0) - (includeEstimasiLoss ? item.estimasiLoss : 0)) === 0 && <Minus size={14} />}
                                        <span>{formatCurrency(item.estimasiProfit - (includeBiayaIklan ? item.jumlahBiayaIklan : 0) - (includeEstimasiLoss ? item.estimasiLoss : 0))}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-800 sticky bottom-0 border-t-2 border-border font-bold text-text-main z-10">
                        <tr>
                            <td className="px-4 py-3 bg-gray-100 dark:bg-gray-800">Total</td>
                            <td className="px-4 py-3 text-right bg-gray-100 dark:bg-gray-800">{formatCurrency(totalEstimasiProfit)}</td>
                            {adSpendMode === 'gmv-max' && (
                                <>
                                    <td className="px-4 py-3 text-right text-amber-500 bg-gray-100 dark:bg-gray-800">{formatCurrency(totalDeduction)}</td>
                                    <td className="px-4 py-3 text-right text-cyan-500 bg-gray-100 dark:bg-gray-800">{formatCurrency(totalRebate)}</td>
                                    <td className="px-4 py-3 text-right text-orange-500 bg-gray-100 dark:bg-gray-800">{formatCurrency(totalPpn)}</td>
                                </>
                            )}
                            <td className={`px-4 py-3 text-right text-red-500 bg-gray-100 dark:bg-gray-800 ${!includeBiayaIklan ? 'opacity-50 line-through' : ''}`}>{formatCurrency(totalJumlahBiayaIklan)}</td>
                            <td className={`px-4 py-3 text-right text-red-500 bg-gray-100 dark:bg-gray-800 ${!includeEstimasiLoss ? 'opacity-50 line-through' : ''}`}>{formatCurrency(totalEstimasiLoss)}</td>
                            <td className={`px-4 py-3 text-right bg-gray-100 dark:bg-gray-800 ${totalEstProfitBersih >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
