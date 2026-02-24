
'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Tags, Calculator, Download, Copy, FileSpreadsheet, Image as ImageIcon, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { useUI } from '../UIProvider';

interface SkuSummaryCardProps {
  data: any[];
}

interface SkuSummaryItem {
  sku: string;
  qty: number;
  price: number;
  total: number;
}

export const SkuSummaryCard: React.FC<SkuSummaryCardProps> = ({ data }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { showToast } = useUI();
  const [isCapturing, setIsCapturing] = useState(false);
  
  const summary = useMemo(() => {
    const map = new Map<string, SkuSummaryItem>();
    
    data.forEach(row => {
      const sku = String(row['SKU Final'] || '').trim();
      
      // Skip jika SKU Final kosong (artinya data belum match dengan Master SKU)
      if (!sku || sku === '-' || sku === 'MISSING') return;

      // Parse Jumlah
      const qtyStr = String(row['Jumlah'] || '0').replace(/[^0-9.-]/g, '');
      const qty = parseFloat(qtyStr) || 0;

      // Parse Harga (ambil dari row, asumsi sudah populated by Master SKU)
      const priceStr = String(row['Harga'] || '0').replace(/[^0-9]/g, '');
      const price = parseFloat(priceStr) || 0;

      if (!map.has(sku)) {
        map.set(sku, {
          sku,
          qty: 0,
          price: price, // Simpan harga satuan
          total: 0
        });
      }

      const item = map.get(sku)!;
      item.qty += qty;
      item.total += (qty * price);
    });

    // Convert to array and sort by Total Amount Descending
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const grandTotal = useMemo(() => {
    return summary.reduce((acc, curr) => ({
      qty: acc.qty + curr.qty,
      total: acc.total + curr.total
    }), { qty: 0, total: 0 });
  }, [summary]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // --- ACTIONS ---

  const handleExportExcel = () => {
    if (summary.length === 0) return;
    
    const exportData = summary.map(item => ({
      'SKU Final': item.sku,
      'Jumlah': item.qty,
      'Harga Satuan': item.price,
      'Total Amount': item.total
    }));

    // Add Subtotal Row
    exportData.push({
      'SKU Final': 'SUBTOTAL',
      'Jumlah': grandTotal.qty,
      'Harga Satuan': 0,
      'Total Amount': grandTotal.total
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SKU Summary");
    XLSX.writeFile(workbook, `SummarySKU-${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('success', 'Export Excel', 'File Excel berhasil diunduh.');
  };

  const handleCapture = async (action: 'save' | 'copy') => {
    if (!cardRef.current) return;
    setIsCapturing(true);

    try {
      // Small delay to ensure UI render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, // Transparent base, but element usually has bg
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false
      });

      if (action === 'save') {
        const link = document.createElement('a');
        link.download = `SKU-Summary-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('success', 'Save PNG', 'Gambar berhasil disimpan.');
      } else {
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              showToast('success', 'Copy PNG', 'Gambar disalin ke clipboard.');
            } catch (err) {
              console.error(err);
              showToast('error', 'Gagal Copy', 'Browser tidak mengizinkan akses clipboard.');
            }
          }
        });
      }
    } catch (err) {
      console.error('Capture failed', err);
      showToast('error', 'Gagal Capture', 'Terjadi kesalahan saat mengambil gambar.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (summary.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-[700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Container utama yang akan di-screenshot */}
      <div 
        ref={cardRef}
        className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col w-full"
      >
        <div className="p-5 border-b border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand/10 text-brand rounded-lg">
              <Tags size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Summary SKU</h3>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs text-text-muted">Agregasi berdasarkan SKU Final</p>
                 <span className="px-2 py-0.5 bg-brand/5 rounded text-xs font-bold text-brand border border-brand/10">
                    {summary.length} SKU
                 </span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Excluded from screenshot via data-html2canvas-ignore) */}
          <div className="flex items-center gap-2" data-html2canvas-ignore="true">
             <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Download Excel"
             >
                <FileSpreadsheet size={16} />
                <span className="hidden sm:inline">Excel</span>
             </button>
             
             <div className="h-5 w-px bg-border mx-1"></div>

             <button 
                onClick={() => handleCapture('save')}
                disabled={isCapturing}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-border bg-surface hover:bg-app text-text-main rounded-lg transition-colors disabled:opacity-50"
                title="Save Image"
             >
                {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">PNG</span>
             </button>

             <button 
                onClick={() => handleCapture('copy')}
                disabled={isCapturing}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-brand text-brand-content rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                title="Copy to Clipboard"
             >
                {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                <span className="hidden sm:inline">Copy</span>
             </button>
          </div>
        </div>

        {/* Tabel dengan font yang lebih besar (text-sm) dan HAPUS font-mono agar konsisten Montserrat */}
        <div className="w-full bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/95 text-text-muted font-bold uppercase tracking-wider shadow-sm">
              <tr>
                <th className="px-6 py-4 border-b border-border w-1/3">SKU</th>
                <th className="px-6 py-4 border-b border-border text-center">Jumlah</th>
                <th className="px-6 py-4 border-b border-border text-right">Harga</th>
                <th className="px-6 py-4 border-b border-border text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.map((item) => (
                <tr key={item.sku} className="hover:bg-app/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-text-main">{item.sku}</td>
                  <td className="px-6 py-4 text-center text-text-muted">{item.qty}</td>
                  <td className="px-6 py-4 text-right text-text-muted">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-text-main">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer dengan font yang lebih besar */}
        <div className="p-5 bg-brand/5 border-t border-border mt-auto">
          <div className="flex items-center justify-between text-base font-bold px-2">
            <div className="flex items-center gap-2 text-text-main uppercase tracking-wider">
              <Calculator size={20} className="text-brand" />
              Subtotal
            </div>
            <div className="flex items-center gap-8">
              <span className="text-text-muted text-base">{grandTotal.qty} Pcs</span>
              <span className="text-brand text-2xl">{formatCurrency(grandTotal.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
