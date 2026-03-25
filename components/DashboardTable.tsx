
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Download, Loader2, ArrowRight, ChevronDown, CheckSquare, Square, Minus, X, Check, 
  Settings2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';
import { useData } from './DataProvider';
import { ColumnCustomizer } from './ColumnCustomizer';
import { useUI } from './UIProvider';
import { useAuth } from './AuthProvider';
import { CLAIM_STATUS_OPTIONS, getStatusColor } from '../lib/constants'; // Imported shared logic

interface DashboardTableProps {
  data: any[]; // Ini menerima FULL DATA (misal 5000 baris)
  isLoading: boolean;
  searchQuery: string;
  isExporting: boolean;
  onExport: () => void;
  onUpdateStatus: (reportId: string, rowIndex: number, newStatus: string) => void;
  onBulkUpdateStatus: (selections: { reportId: string, rowIndex: number }[], newStatus: string) => void;
  tableId: string;
}

export const DashboardTable: React.FC<DashboardTableProps> = ({
  data,
  isLoading,
  searchQuery,
  isExporting,
  onExport,
  onUpdateStatus,
  onBulkUpdateStatus,
  tableId
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('Pending');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  
  // -- PAGINATION STATE --
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // Default 5 baris per halaman

  const { columnSettings, saveColumnConfig, resetColumnConfig, deleteRows } = useData();
  const { confirm, showToast } = useUI();
  const { role } = useAuth();
  
  const isGuest = role === 'guest';

  // Reset page ke 1 jika filter/search berubah, tapi seleksi dipertahankan jika memungkinkan
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, tableId, searchQuery]); 

  // Reset selection jika Table ID berubah (pindah tab)
  useEffect(() => {
    setSelectedItems(new Set());
    setBulkStatus('Pending');
  }, [tableId]);

  const getUniqueKey = (row: any) => `${row._reportId}|${row._rowIndex}`;

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  
  // Ini data yang HANYA dirender ke HTML (Ringan)
  const visibleData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // --- SELECTION LOGIC (Tetap select GLOBAL data) ---
  const toggleSelectAll = () => {
    if (isGuest) return; 
    if (selectedItems.size === data.length) { // Cek terhadap FULL data
      setSelectedItems(new Set());
    } else {
      // Select ALL data (Global), not just visible page
      const allKeys = new Set(data.map(row => getUniqueKey(row)));
      setSelectedItems(allKeys);
    }
  };

  const toggleItem = (key: string) => {
    if (isGuest) {
      showToast('info', 'Read Only', 'Guest mode tidak dapat memilih item.');
      return;
    }

    const targetRow = data.find(r => getUniqueKey(r) === key);
    
    if (!targetRow) {
         const newSet = new Set(selectedItems);
         if (newSet.has(key)) newSet.delete(key);
         else newSet.add(key);
         setSelectedItems(newSet);
         return;
    }

    const orderId = String(targetRow['No. Pesanan'] || '').trim();
    const isValidOrder = orderId && orderId !== '-' && orderId !== '';
    
    const newSet = new Set(selectedItems);
    const willSelect = !newSet.has(key); 

    if (isValidOrder) {
        // Cari duplikat di SELURUH data, bukan cuma halaman ini
        data.forEach(row => {
            if (String(row['No. Pesanan'] || '').trim() === orderId) {
                const rowKey = getUniqueKey(row);
                if (willSelect) newSet.add(rowKey);
                else newSet.delete(rowKey);
            }
        });
    } else {
        if (willSelect) newSet.add(key);
        else newSet.delete(key);
    }
    setSelectedItems(newSet);
  };

  const handleBulkApply = async () => {
    if (isGuest) return;
    if (selectedItems.size === 0) return;

    const isConfirmed = await confirm({
      title: 'Konfirmasi Bulk Update',
      message: `Anda akan mengubah status ${selectedItems.size} item terpilih menjadi "${bulkStatus}". Lanjutkan?`,
      confirmText: 'Ya, Terapkan',
      cancelText: 'Batal',
      variant: 'warning'
    });

    if (!isConfirmed) return;

    setIsBulkUpdating(true);
    
    const selections = Array.from(selectedItems).map((key) => {
      const [reportId, rowIndex] = (key as string).split('|');
      return { reportId, rowIndex: parseInt(rowIndex) };
    });

    await onBulkUpdateStatus(selections, bulkStatus);
    setIsBulkUpdating(false);
    setSelectedItems(new Set()); 
  };

  const handleBulkDelete = async () => {
    if (isGuest) return;
    if (selectedItems.size === 0) return;

    const isConfirmed = await confirm({
      title: 'Hapus Item Terpilih?',
      message: `PERINGATAN: ${selectedItems.size} item akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Data',
      cancelText: 'Batal',
      variant: 'danger'
    });

    if (!isConfirmed) return;

    setIsDeleting(true);

    const selections = Array.from(selectedItems).map((key) => {
      const [reportId, rowIndex] = (key as string).split('|');
      return { reportId, rowIndex: parseInt(rowIndex) };
    });

    try {
      await deleteRows(selections);
      showToast('success', 'Dihapus', `${selectedItems.size} item berhasil dihapus.`);
      setSelectedItems(new Set());
    } catch (error) {
      showToast('error', 'Gagal', 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (reportId: string, rowIndex: number) => {
    if (isGuest) return;
    const isConfirmed = await confirm({
      title: 'Hapus Baris Ini?',
      message: 'Data ini akan dihapus permanen dari database.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger'
    });

    if (isConfirmed) {
      await deleteRows([{ reportId, rowIndex }]);
      showToast('success', 'Dihapus', 'Data berhasil dihapus.');
    }
  };

  // --- COLUMN LOGIC ---
  const allHeaders = useMemo(() => {
    if (!data || data.length === 0) return [];
    const headersSet = new Set<string>();
    // Scan up to 500 items for headers to be safe, scanning all 5000 is fast in JS
    data.slice(0, 500).forEach(row => {
      Object.keys(row).forEach(key => {
        if (!key.startsWith('_')) headersSet.add(key);
      });
    });
    return Array.from(headersSet);
  }, [data]);

  const priorityHeaders = [
    'No', 'Claim Status', 'Tanggal Transaksi', 'Waktu', 'Nama Toko', 'Profit', 'Estimasi Profit', 
    'Revenue Base', 'Admin Shopee 8.25%', 'Gratis Ongkir Xtra 5%', 'Promo Xtra 4.5%', 'Biaya Premi 0.5%', 'Biaya Per Transaksi Rp. 1,250',
    'Biaya Lainnya', 'Type Laporan', 'No. Pesanan', 'No. Resi', 
    'No. Resi Pengembalian Barang', 'Waktu Pesanan Dibuat', 'Status Pesanan', 'Status pengiriman gagal', 
    'Nama Variasi', 'Nomor Referensi SKU', 'SKU Final', 'Harga', 'Jumlah', 'Total', 'ID Produk', 
    'Alasan Pengembalian', 'Total Pembayaran', 'Total Pengembalian Dana'
  ];

  const displayHeaders = useMemo(() => {
    if (columnSettings[tableId] && columnSettings[tableId].length > 0) {
      const config = columnSettings[tableId];
      const savedKeys = new Set(config.map(c => c.key));
      const headers = config.filter(c => c.visible).sort((a, b) => a.order - b.order).map(c => c.key);
      
      // Append any new columns that are not in the saved config
      allHeaders.forEach(col => {
        if (!savedKeys.has(col)) {
          headers.push(col);
        }
      });
      return headers;
    }
    const headers = [...allHeaders].sort((a, b) => {
      const idxA = priorityHeaders.indexOf(a);
      const idxB = priorityHeaders.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    if (!headers.includes('No')) headers.unshift('No');
    if (!headers.includes('Claim Status')) headers.splice(1, 0, 'Claim Status');
    return headers;
  }, [allHeaders, columnSettings, tableId]);

  // --- SUBTOTAL LOGIC ---
  const subtotals = useMemo(() => {
    if (!data || data.length === 0) return {};
    const totals: Record<string, number> = {};
    const numericColumns = new Set([
      'Profit', 'Estimasi Profit', 'Revenue Base', 'Admin Shopee 8.25%', 'Gratis Ongkir Xtra 5%', 
      'Promo Xtra 4.5%', 'Biaya Premi 0.5%', 'Biaya Per Transaksi Rp. 1,250', 
      'Biaya Lainnya', 'Total Pembayaran', 'Total Pengembalian Dana', 'Harga', 'Jumlah', 'Total'
    ]);

    displayHeaders.forEach(h => {
      if (h === 'No' || h === 'Claim Status') return;
      
      const hLower = h.toLowerCase();
      // If column name contains certain keywords, it's likely numeric
      const isLikelyNumeric = numericColumns.has(h) || 
                             hLower.includes('biaya') || 
                             hLower.includes('profit') || 
                             hLower.includes('revenue') || 
                             hLower.includes('total') || 
                             hLower.includes('jumlah') || 
                             hLower.includes('harga');
      
      if (!isLikelyNumeric) return;

      // Exclude IDs and non-sumable number-like strings
      if (hLower.includes('no.') || hLower.includes('id') || hLower.includes('resi') || hLower.includes('telepon') || hLower.includes('rekening')) {
        // Exception for columns that are actually numeric despite having "No" or "ID"
        if (!hLower.includes('jumlah') && !hLower.includes('total') && !hLower.includes('harga') && !hLower.includes('profit')) {
          return;
        }
      }

      let sum = 0;
      let hasValue = false;
      
      data.forEach(row => {
        const val = row[h];
        if (val === undefined || val === null || val === '-' || val === '') return;
        
        let num = 0;
        if (typeof val === 'number') {
          num = val;
          hasValue = true;
        } else {
          // Clean string: remove dots (thousands), replace comma with dot (decimal)
          const cleanVal = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleanVal);
          if (!isNaN(parsed)) {
            num = parsed;
            hasValue = true;
          }
        }
        sum += num;
      });
      
      if (hasValue) {
        totals[h] = sum;
      }
    });
    return totals;
  }, [data, displayHeaders]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 animate-pulse">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-text-main">Memuat Dashboard</h3>
          <p className="text-sm text-text-muted">Sedang mengambil data terbaru...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="h-20 w-20 bg-app rounded-full flex items-center justify-center text-text-muted/30">
          <Search size={40} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-text-main">Belum Ada Data</h3>
          <p className="text-sm text-text-muted max-w-xs mx-auto">
            {searchQuery ? `Tidak ditemukan hasil untuk "${searchQuery}"` : 'Upload data terlebih dahulu untuk melihat hasil.'}
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER ---
  const seenOrderIds = new Set<string>();
  const numberedOrderIds = new Set<string>();
  let uniqueOrderCounter = (currentPage - 1) * pageSize; // Offset counter for NO

  const isAllSelected = data.length > 0 && selectedItems.size === data.length;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < data.length;

  return (
    <>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 relative pb-20">
        {/* Top Bar Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center px-2">
          <div className="flex items-center gap-4">
             <p className="text-sm font-medium text-text-muted">
               Total <span className="text-brand font-bold">{data.length.toLocaleString()}</span> Data
             </p>
             <div className="h-4 w-px bg-border"></div>
             <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-text-muted">Tampilkan</span>
               <select 
                 value={pageSize}
                 onChange={handlePageSizeChange}
                 className="bg-surface border border-border rounded-lg text-xs font-bold px-2 py-1 outline-none focus:border-brand"
               >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
               </select>
             </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-border rounded-lg bg-surface hover:bg-app text-text-muted hover:text-brand transition-colors"
            >
              <Settings2 size={14} />
              Atur Kolom
            </button>
            <button 
              onClick={onExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-border rounded-lg bg-surface hover:bg-app transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export Excel
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className={`relative w-full overflow-auto border border-border rounded-xl bg-surface shadow-sm ${['estimasi-profit', 'isi-ulang-saldo', 'my-balance', 'order-all', 'income', 'adwords-bill'].includes(tableId) ? 'max-h-[600px]' : ''}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface text-text-muted font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                {/* Checkbox Header */}
                <th className="px-4 py-3 border-b border-border w-10 bg-surface">
                  <button 
                    onClick={toggleSelectAll}
                    disabled={isGuest}
                    className={`flex items-center justify-center transition-colors ${isGuest ? 'opacity-30 cursor-not-allowed' : 'text-brand hover:text-brand/80'}`}
                    title="Pilih Semua Data (Termasuk di halaman lain)"
                  >
                    {isAllSelected ? <CheckSquare size={16} /> : isIndeterminate ? <Minus size={16} /> : <Square size={16} />}
                  </button>
                </th>
                {displayHeaders.map(h => (
                  <th key={h} className={`px-4 py-3 border-b border-border whitespace-nowrap bg-surface ${h === 'No' ? 'w-12 text-center' : 'min-w-[150px]'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* RENDER HANYA VISIBLE DATA */}
            <tbody className="divide-y divide-border">
              {visibleData.map((row, idx) => {
                const updatedCols = row['_updatedCols'] || [];
                const orderId = String(row['No. Pesanan'] || '').trim();
                const uniqueKey = getUniqueKey(row);
                const isSelected = selectedItems.has(uniqueKey);
                
                let isDuplicateVisual = false;
                if (orderId && orderId !== '-' && orderId !== '') {
                  if (seenOrderIds.has(orderId)) {
                    isDuplicateVisual = true; 
                  } else {
                    seenOrderIds.add(orderId); 
                  }
                }

                let displayNo = '';
                if (orderId && orderId !== '-' && orderId !== '') {
                  if (!numberedOrderIds.has(orderId)) {
                    uniqueOrderCounter++;
                    displayNo = String(uniqueOrderCounter);
                    numberedOrderIds.add(orderId);
                  } else {
                    displayNo = '';
                  }
                }

                let rowClass = 'hover:bg-brand-muted/30';
                if (isSelected) {
                  rowClass = 'bg-brand/5 border-l-2 border-brand';
                } else if (isDuplicateVisual) {
                  rowClass = 'bg-amber-100/60 dark:bg-amber-900/20 hover:bg-amber-200/50 dark:hover:bg-amber-900/40';
                }
                
                return (
                  <tr 
                    key={idx} 
                    className={`transition-colors group ${rowClass} ${isSelected ? 'selected-row' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== 'SELECT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                        toggleItem(uniqueKey);
                      }
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(uniqueKey);
                        }}
                        disabled={isGuest}
                        className={`flex items-center justify-center transition-colors ${isSelected ? 'text-brand' : 'text-text-muted hover:text-text-main'} ${isGuest ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>

                    {displayHeaders.map(h => {
                      if (h === 'No') {
                        return (
                          <td key={h} className="px-4 py-3 whitespace-nowrap text-text-main font-bold text-center text-text-muted">
                            {displayNo}
                          </td>
                        );
                      }

                      if (h === 'Claim Status') {
                        const currentStatus = row['Claim Status'] || 'Pending';
                        return (
                          <td key={h} className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="relative w-fit" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={currentStatus}
                                  disabled={isGuest}
                                  onChange={async (e) => {
                                    if (isGuest) return;
                                    if (row._reportId && row._rowIndex !== undefined) {
                                      const newStatus = e.target.value;
                                      
                                      const isConfirmed = await confirm({
                                        title: 'Ubah Status Klaim?',
                                        message: `Ubah status dari "${currentStatus}" menjadi "${newStatus}"?`,
                                        confirmText: 'Ya, Ubah',
                                        cancelText: 'Batal',
                                        variant: 'warning'
                                      });

                                      if (isConfirmed) {
                                        onUpdateStatus(row._reportId, row._rowIndex, newStatus);
                                      } else {
                                        e.target.value = currentStatus;
                                      }
                                    }
                                  }}
                                  className={`
                                    appearance-none 
                                    text-[11px] pl-3 pr-8 py-1.5 rounded-lg border-2 transition-all 
                                    focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white
                                    ${getStatusColor(currentStatus)}
                                    ${isGuest ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                                  `}
                                >
                                  {CLAIM_STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt} className="bg-surface text-text-main font-medium">
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-white opacity-90">
                                  <ChevronDown size={12} strokeWidth={3} />
                                </div>
                              </div>
                              
                              {!isGuest && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingle(row._reportId, row._rowIndex);
                                  }}
                                  className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const isCellUpdated = updatedCols.includes(h);
                      const isSourceCell = (h === 'No. Resi Pengiriman Terusan') && row[h] && row[h] !== '-' && row[h] !== '';
                      
                      const isMissingData = (h === 'SKU Final' || h === 'Total') && (!row[h] || String(row[h]).trim() === '');

                      return (
                        <td key={h} className={`px-4 py-3 whitespace-nowrap text-text-main font-medium group-hover:text-brand 
                          ${isCellUpdated ? 'text-emerald-600 font-extrabold' : ''}
                          ${isSourceCell ? 'text-brand/70' : ''}
                          ${isMissingData ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold border-l-4 border-red-500' : ''}
                        `}>
                          {row[h]?.toString() || (isMissingData ? 'MISSING' : '-')}
                          {isCellUpdated && <ArrowRight size={12} className="inline ml-1 mb-0.5" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* STICKY SUBTOTAL FOOTER */}
            <tfoot className="bg-surface text-text-main font-black border-t-2 border-border sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
              <tr>
                {(!isGuest && !isExporting) && <td className="px-4 py-3 bg-surface border-t border-border"></td>}
                {displayHeaders.map(h => {
                  if (h === 'No') {
                    return (
                      <td key={h} className="px-4 py-3 text-center bg-surface border-t border-border">
                        TOTAL
                      </td>
                    );
                  }
                  
                  const total = subtotals[h];
                  const isNumeric = total !== undefined;
                  
                  return (
                    <td key={h} className={`px-4 py-3 whitespace-nowrap bg-surface border-t border-border ${isNumeric ? 'text-brand' : ''}`}>
                      {isNumeric ? (
                        h === 'Jumlah' ? total.toLocaleString('id-ID') : total.toLocaleString('id-ID', { maximumFractionDigits: 0 })
                      ) : ''}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-surface/50 rounded-xl border border-border mt-2">
            <div className="text-xs text-text-muted">
                Menampilkan <span className="font-bold text-text-main">{startIndex + 1}</span> - <span className="font-bold text-text-main">{endIndex}</span> dari <span className="font-bold text-text-main">{data.length}</span> data
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-brand hover:bg-app disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-brand hover:bg-app disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1 mx-2">
                    <span className="text-xs font-bold text-text-muted">Hal.</span>
                    <input 
                        type="number" 
                        value={currentPage}
                        min={1}
                        max={totalPages}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) handlePageChange(val);
                        }}
                        className="w-12 text-center text-xs font-bold border border-border rounded-md py-1 bg-surface focus:border-brand focus:outline-none"
                    />
                    <span className="text-xs font-bold text-text-muted">/ {totalPages}</span>
                </div>

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-brand hover:bg-app disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-brand hover:bg-app disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>

        {/* Floating Bulk Action Bar - HIDDEN FOR GUEST */}
        {!isGuest && (
          <div 
            className={`
              fixed bottom-8 left-1/2 -translate-x-1/2 z-50 
              bg-surface border border-brand/20 shadow-2xl rounded-full px-6 py-3
              flex items-center gap-4 transition-all duration-300
              ${selectedItems.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
            `}
          >
            <div className="flex items-center gap-2 border-r border-border pr-4 mr-2">
              <div className="bg-brand text-brand-content rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                {selectedItems.size}
              </div>
              <span className="text-sm font-bold text-text-main whitespace-nowrap hidden sm:block">Item Terpilih</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="appearance-none cursor-pointer bg-app border border-border text-text-main text-xs font-bold pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 min-w-[140px]"
                  >
                    {CLAIM_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>

              <button
                onClick={handleBulkApply}
                disabled={isBulkUpdating || isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-content text-xs font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isBulkUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Terapkan
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={isBulkUpdating || isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 ml-2"
                title="Hapus Item Terpilih"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Hapus
              </button>
              
              <button
                onClick={() => setSelectedItems(new Set())}
                className="p-2 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-full transition-colors ml-1"
                title="Batal Seleksi"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ColumnCustomizer 
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        allColumns={allHeaders}
        currentConfig={columnSettings[tableId]}
        onSave={(config) => saveColumnConfig(tableId, config)}
        onReset={() => resetColumnConfig(tableId)}
        defaultPriority={priorityHeaders}
      />
    </>
  );
};
