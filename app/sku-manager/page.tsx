
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tags, Upload, Search, FileSpreadsheet, Loader2, Database, AlertCircle, Trash2, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../components/DataProvider';
import { useUI } from '../../components/UIProvider';
import { SkuMasterItem } from '../../types';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function SkuManagerPage() {
  const { skuMasterData, uploadSkuMaster, clearSkuData } = useData();
  const { showToast, confirm } = useUI();
  const { role } = useAuth();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role === 'guest') {
       const timer = setTimeout(() => router.push('/'), 2000);
       return () => clearTimeout(timer);
    }
  }, [role, router]);

  if (role === 'guest') {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
           <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
              <Lock size={32} />
           </div>
           <div>
              <h1 className="text-xl font-bold text-text-main">Akses Ditolak</h1>
              <p className="text-text-muted mt-2">Guest user tidak memiliki izin untuk mengelola SKU.</p>
           </div>
        </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    const isConfirmed = await confirm({
      title: 'Upload SKU Master?',
      message: 'PERINGATAN: Upload file baru akan MENGHAPUS seluruh data SKU Master yang lama dan menggantinya dengan data baru. Lanjutkan?',
      confirmText: 'Ya, Replace Data',
      cancelText: 'Batal',
      variant: 'warning'
    });

    if (!isConfirmed) return;

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          throw new Error('File kosong atau format salah.');
        }

        const validItems: SkuMasterItem[] = [];
        const timestamp = Date.now();

        // Mapping logic (Flexible column names)
        json.forEach((row: any) => {
          // Try to find columns regardless of casing
          const getCol = (names: string[]) => {
            const key = Object.keys(row).find(k => names.includes(k.toLowerCase().replace(/\s/g, '')));
            return key ? row[key] : '';
          };

          const sku1 = getCol(['sku1', 'sku']);
          const sku2 = getCol(['sku2', 'namavariasi', 'variasi']);
          const harga = getCol(['harga', 'price']);
          const idProduk = getCol(['idproduk', 'productid', 'id']);

          if (sku1) {
            validItems.push({
              sku1: String(sku1).trim(),
              sku2: String(sku2 || '').trim(),
              harga: String(harga || '').trim(),
              idProduk: String(idProduk || '').trim(),
              updatedAt: timestamp
            });
          }
        });

        if (validItems.length === 0) {
           throw new Error('Tidak ditemukan kolom SKU1 yang valid.');
        }

        await uploadSkuMaster(validItems);
        showToast('success', 'Upload Berhasil', `Berhasil menyimpan ${validItems.length} data SKU.`);

      } catch (error: any) {
        console.error(error);
        showToast('error', 'Gagal Upload', error.message || 'Terjadi kesalahan saat memproses file.');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const handleClearSku = async () => {
    if (skuMasterData.length === 0) return;

    const isConfirmed = await confirm({
      title: 'Hapus Semua SKU?',
      message: 'PERINGATAN: Tindakan ini akan menghapus seluruh database SKU Master secara permanen. Data tidak bisa dikembalikan.',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      variant: 'danger'
    });

    if (isConfirmed) {
      setIsClearing(true);
      try {
        await clearSkuData();
        showToast('success', 'Berhasil', 'Database SKU telah dibersihkan.');
      } catch (e) {
        showToast('error', 'Gagal', 'Terjadi kesalahan saat menghapus data.');
      } finally {
        setIsClearing(false);
      }
    }
  };

  const filteredData = skuMasterData.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.sku1.toLowerCase().includes(q) ||
      item.sku2.toLowerCase().includes(q) ||
      item.idProduk.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <Tags size={32} className="text-brand" />
            SKU Manager
          </h1>
          <p className="text-text-muted mt-2">
            Kelola Master Data SKU untuk referensi harga dan ID Produk.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-surface rounded-2xl shadow-lg border border-border p-6 flex flex-col">
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <Upload size={20} className="text-brand" />
              Upload Master File
            </h3>
            
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 bg-app/30 hover:bg-brand/5 hover:border-brand/30 transition-all text-center space-y-4 min-h-[200px]">
               <FileSpreadsheet size={40} className="text-text-muted" />
               <div className="space-y-1">
                 <p className="text-sm font-bold text-text-main">Excel (.xlsx)</p>
                 <p className="text-xs text-text-muted">Pastikan ada header: <br/><span className="font-mono font-bold text-brand">SKU1, SKU2, Harga, IDPRODUK</span></p>
               </div>
               
               <input 
                 type="file" 
                 accept=".xlsx,.xls,.csv" 
                 ref={fileInputRef}
                 className="hidden"
                 onChange={handleFileUpload}
               />
               
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isProcessing}
                 className="px-6 py-2 bg-brand text-brand-content rounded-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all w-full flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                 {isProcessing ? 'Memproses...' : 'Pilih File'}
               </button>
            </div>
            
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
               <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
               <p className="text-[10px] text-amber-700 leading-relaxed">
                 <b>Perhatian:</b> Upload file baru akan menimpa seluruh data master yang sudah ada sebelumnya.
               </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
             <div className="flex items-center justify-between gap-2">
                <div>
                   <h4 className="text-sm font-bold text-red-600">Hapus Database</h4>
                   <p className="text-[10px] text-red-500/80">Kosongkan seluruh data master SKU.</p>
                </div>
                <button 
                   onClick={handleClearSku}
                   disabled={isClearing || skuMasterData.length === 0}
                   className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                   title="Hapus Semua Data SKU"
                >
                   {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
             </div>
          </div>
        </div>

        {/* Data View Section */}
        <div className="md:col-span-2 flex flex-col gap-4">
           {/* Search Bar */}
           <div className="flex justify-between items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-2 text-brand font-bold">
                 <Database size={20} />
                 <span>Database SKU</span>
                 <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full text-xs">
                   {skuMasterData.length}
                 </span>
              </div>
              <div className="relative w-full max-w-xs">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                 <input 
                   type="text" 
                   placeholder="Cari SKU / ID Produk..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-app border border-border rounded-lg text-sm focus:outline-none focus:border-brand transition-all"
                 />
              </div>
           </div>

           {/* Table */}
           <div className="bg-surface rounded-2xl shadow-lg border border-border overflow-hidden flex-1 min-h-[400px] flex flex-col">
              <div className="overflow-auto flex-1 max-h-[600px]">
                 <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-surface shadow-sm">
                       <tr>
                          <th className="px-6 py-3 border-b border-border font-bold text-text-muted bg-surface">SKU1</th>
                          <th className="px-6 py-3 border-b border-border font-bold text-text-muted bg-surface">SKU2</th>
                          <th className="px-6 py-3 border-b border-border font-bold text-text-muted bg-surface">Harga</th>
                          <th className="px-6 py-3 border-b border-border font-bold text-text-muted bg-surface">IDPRODUK</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                       {filteredData.length > 0 ? (
                         filteredData.slice(0, 100).map((item, idx) => (
                           <tr key={idx} className="hover:bg-app/50 transition-colors">
                              <td className="px-6 py-3 font-medium text-text-main">{item.sku1}</td>
                              <td className="px-6 py-3 text-text-muted">{item.sku2}</td>
                              <td className="px-6 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{item.harga}</td>
                              <td className="px-6 py-3 font-mono text-xs text-text-muted">{item.idProduk}</td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan={4} className="px-6 py-12 text-center text-text-muted">
                             {searchQuery ? 'Tidak ditemukan data yang cocok.' : 'Belum ada data Master SKU.'}
                           </td>
                         </tr>
                       )}
                       {filteredData.length > 100 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-3 text-center text-xs text-text-muted bg-app/30 font-medium">
                               Menampilkan 100 dari {filteredData.length} data. Gunakan pencarian untuk hasil spesifik.
                            </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
