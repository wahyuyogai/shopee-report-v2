
'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Loader2, CheckCircle2, FileArchive, PackageCheck, Save, AlertTriangle, AlertOctagon, RotateCcw, Lock, ChevronDown, Settings2, Info, XCircle, FileText, TrendingUp, Wallet, Megaphone } from 'lucide-react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { useData } from '../../components/DataProvider';
import { useUI } from '../../components/UIProvider';
import { PreviewData } from '../../types';
import { generateUniqueKey } from './constants';
import { processFileBuffer, extractMonth } from './logic';
import { CLAIM_STATUS_OPTIONS } from '../../lib/constants'; // Imported constant
import { PreviewTable } from '../../components/PreviewTable';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const { failedDeliveryReports, returnRefundReports, cancelledReports, orderAllReports, incomeReports, myBalanceReports, adwordsBillReports, addFailedDeliveryReport, addReturnRefundReport, addCancelledReport, addOrderAllReport, addIncomeReport, addMyBalanceReport, addAdwordsBillReport, addLog } = useData();
  const { showToast } = useUI();
  const { role } = useAuth();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('Pending');
  const [isStatusLocked, setIsStatusLocked] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasShownLockToast = useRef(false);

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
              <p className="text-text-muted mt-2">Guest user tidak memiliki izin untuk mengupload data.</p>
              <p className="text-xs text-text-muted mt-1">Mengalihkan ke dashboard...</p>
           </div>
        </div>
    );
  }

  // Pre-calculate existing keys for fast lookup
  const existingKeys = useMemo(() => {
    const failed = new Set<string>();
    const returned = new Set<string>();
    const cancelled = new Set<string>();
    const orderAll = new Set<string>();
    const income = new Set<string>();
    const myBalance = new Set<string>();
    const adwordsBill = new Set<string>();

    failedDeliveryReports.forEach(r => r.data.forEach(row => failed.add(generateUniqueKey(row, 'failed'))));
    returnRefundReports.forEach(r => r.data.forEach(row => returned.add(generateUniqueKey(row, 'return'))));
    cancelledReports.forEach(r => r.data.forEach(row => cancelled.add(generateUniqueKey(row, 'cancelled'))));
    orderAllReports.forEach(r => r.data.forEach(row => orderAll.add(generateUniqueKey(row, 'order-all'))));
    incomeReports.forEach(r => r.data.forEach(row => income.add(generateUniqueKey(row, 'income'))));
    myBalanceReports.forEach(r => r.data.forEach(row => myBalance.add(generateUniqueKey(row, 'my-balance'))));
    adwordsBillReports.forEach(r => r.data.forEach(row => adwordsBill.add(generateUniqueKey(row, 'adwords-bill'))));

    return { failed, returned, cancelled, orderAll, income, myBalance, adwordsBill };
  }, [failedDeliveryReports, returnRefundReports, cancelledReports, orderAllReports, incomeReports, myBalanceReports, adwordsBillReports]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setStatus({ type: 'idle', message: 'Menganalisa file...' });
    setIsProcessing(true);
    setPreviewData(null);
    setTargetStatus('Pending');
    
    setIsStatusLocked(false);
    hasShownLockToast.current = false;

    const tempResults: PreviewData = {
      failed: { newRows: [], duplicateRows: [] },
      returned: { newRows: [], duplicateRows: [] },
      cancelled: { newRows: [], duplicateRows: [] },
      orderAll: { newRows: [], duplicateRows: [] },
      income: { newRows: [], duplicateRows: [] },
      myBalance: { newRows: [], duplicateRows: [] },
      adwordsBill: { newRows: [], duplicateRows: [] },
      reportsToSave: []
    };

    let filesProcessed = 0;
    let globalStatusLocked = false;

    try {
      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i] as File;
        setStatus({ type: 'idle', message: `Memproses ${i + 1}/${fileArray.length}: ${file.name}` });

        const parentMetadata: { namaToko?: string, bulan?: string } = {};
        const parentName = file.name;
        
        if (parentName.includes(' - ')) {
          parentMetadata.namaToko = parentName.split(' - ')[0].trim();
        }
        const parentMonth = extractMonth(parentName);
        if (parentMonth !== 'Unknown') parentMetadata.bulan = parentMonth;

        let fileHasStatus = false;

        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          
          for (const fileName in contents.files) {
            const zipEntry = contents.files[fileName];
            if (!zipEntry.dir && !fileName.startsWith('__MACOSX') && !fileName.startsWith('._')) {
               const lowerFileName = fileName.toLowerCase();
               if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls')) {
                 const buffer = await zipEntry.async('arraybuffer');
                 const hasStatus = processFileBuffer(buffer, fileName, tempResults, existingKeys, parentMetadata);
                 if (hasStatus) fileHasStatus = true;
               }
            }
          }
        } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
           const buffer = await file.arrayBuffer();
           const hasStatus = processFileBuffer(buffer, file.name, tempResults, existingKeys, parentMetadata);
           if (hasStatus) fileHasStatus = true;
        } else {
           console.warn(`Skipping unsupported file: ${file.name}`);
        }
        
        if (fileHasStatus) globalStatusLocked = true;
        filesProcessed++;
      }

      const totalNew = tempResults.failed.newRows.length + tempResults.returned.newRows.length + tempResults.cancelled.newRows.length + tempResults.orderAll.newRows.length + tempResults.income.newRows.length + tempResults.myBalance.newRows.length + tempResults.adwordsBill.newRows.length;
      const totalDup = tempResults.failed.duplicateRows.length + tempResults.returned.duplicateRows.length + tempResults.cancelled.duplicateRows.length + tempResults.orderAll.duplicateRows.length + tempResults.income.duplicateRows.length + tempResults.myBalance.duplicateRows.length + tempResults.adwordsBill.duplicateRows.length;

      if (totalNew === 0 && totalDup === 0) {
        throw new Error('Tidak ditemukan data valid. Pastikan format kolom sesuai Template Shopee atau File Export Dashboard.');
      }

      if (globalStatusLocked) {
        setIsStatusLocked(true);
        if (!hasShownLockToast.current) {
            hasShownLockToast.current = true;
            showToast('info', 'Status Terdeteksi', 'File berisi data status. Pilihan status manual dinonaktifkan.');
        }
      }

      setPreviewData(tempResults);
      setStatus({ type: 'success', message: 'Analisa Selesai' });

    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Gagal memproses file.' });
      showToast('error', 'Gagal Memproses', err.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!previewData) return;

    setIsProcessing(true);
    try {
      let failedCount = 0;
      let returnCount = 0;
      let cancelledCount = 0;
      let orderAllCount = 0;
      let incomeCount = 0;
      let myBalanceCount = 0;
      let adwordsBillCount = 0;

      for (const report of previewData.reportsToSave) {
        const updatedData = report.data.map(row => {
            let finalStatus = targetStatus;
            
            if (isStatusLocked) {
                const existing = row['Claim Status'];
                finalStatus = (existing && existing !== '' && existing !== '-') ? existing : 'Pending';
            }

            return { ...row, 'Claim Status': finalStatus };
        });
        
        const reportToSave = { ...report, data: updatedData };

        if (reportToSave.jenisLaporan === 'Pengiriman Gagal') {
          await addFailedDeliveryReport(reportToSave);
          failedCount++;
        } else if (reportToSave.jenisLaporan === 'Pengembalian') {
          await addReturnRefundReport(reportToSave);
          returnCount++;
        } else if (reportToSave.jenisLaporan === 'Pembatalan') {
          await addCancelledReport(reportToSave);
          cancelledCount++;
        } else if (reportToSave.jenisLaporan === 'Order All') {
          await addOrderAllReport(reportToSave);
          orderAllCount++;
        } else if (reportToSave.jenisLaporan === 'Income') {
          await addIncomeReport(reportToSave);
          incomeCount++;
        } else if (reportToSave.jenisLaporan === 'MyBalance') {
          await addMyBalanceReport(reportToSave);
          myBalanceCount++;
        } else if (reportToSave.jenisLaporan === 'Adwords Bill') {
          await addAdwordsBillReport(reportToSave);
          adwordsBillCount++;
        }
      }

      const statusMsg = isStatusLocked ? 'Status dari File' : targetStatus;
      const total = failedCount + returnCount + cancelledCount + orderAllCount + incomeCount + myBalanceCount + adwordsBillCount;
      const msg = `Berhasil menyimpan ${total} laporan baru ke database (Status: ${statusMsg}).`;
      showToast('success', 'Data Tersimpan', msg);
      addLog('success', 'Data Saved', msg);
      handleCancel();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan ke database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setPreviewData(null);
    setStatus({ type: 'idle', message: '' });
    setTargetStatus('Pending');
    setIsStatusLocked(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = (data: any[], filenamePrefix: string) => {
    if (data.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filenamePrefix}-${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('success', 'Export Berhasil', 'File Excel telah diunduh.');
  };

  const totalNewRows = previewData ? previewData.failed.newRows.length + previewData.returned.newRows.length + previewData.cancelled.newRows.length + previewData.orderAll.newRows.length + previewData.income.newRows.length + previewData.myBalance.newRows.length + previewData.adwordsBill.newRows.length : 0;
  const totalDuplicateRows = previewData ? previewData.failed.duplicateRows.length + previewData.returned.duplicateRows.length + previewData.cancelled.duplicateRows.length + previewData.orderAll.duplicateRows.length + previewData.income.duplicateRows.length + previewData.myBalance.duplicateRows.length + previewData.adwordsBill.duplicateRows.length : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-text-main tracking-tight">Upload Manager</h1>
        <p className="text-text-muted">Proses otomatis laporan Shopee & File Export dengan deteksi duplikat cerdas.</p>
      </div>

      {!previewData && (
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
          <div className="bg-surface rounded-2xl shadow-xl border border-border p-8 transition-all hover:shadow-2xl">
            <label 
              className={`
                relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-2xl transition-all cursor-pointer
                ${isProcessing ? 'bg-app/50 border-brand/30 cursor-wait' : 'bg-app/20 border-border hover:border-brand hover:bg-brand-muted'}
              `}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                multiple
                accept=".zip,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                {isProcessing ? (
                  <>
                    <Loader2 size={48} className="text-brand animate-spin" />
                    <div className="space-y-1">
                      <p className="font-bold text-text-main text-lg">{status.message}</p>
                      <p className="text-sm text-text-muted">Mohon tunggu sebentar...</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-20 w-20 bg-brand-muted rounded-full flex items-center justify-center text-brand mb-2">
                      <FileArchive size={36} />
                    </div>
                    <div className="space-y-2 px-4">
                      <p className="text-xl font-bold text-text-main">
                        Upload File Laporan
                      </p>
                      <div className="text-xs text-text-muted space-y-1 max-w-xs mx-auto text-left">
                         <p className="flex items-center gap-2">
                            <span className="w-20 font-bold text-brand text-right">Return File:</span> 
                            <span className="font-mono bg-app px-1 rounded">NAMA_TOKO - ...xlsx</span>
                         </p>
                         <p className="flex items-center gap-2">
                            <span className="w-20 font-bold text-brand text-right">Order All:</span> 
                            <span className="font-mono bg-app px-1 rounded">Order.all...xlsx</span>
                         </p>
                         <p className="flex items-center gap-2">
                            <span className="w-20 font-bold text-brand text-right">Income:</span> 
                            <span className="font-mono bg-app px-1 rounded">Income...xlsx</span>
                         </p>
                         <p className="flex items-center gap-2">
                            <span className="w-20 font-bold text-brand text-right">MyBalance:</span> 
                            <span className="font-mono bg-app px-1 rounded">my_balance...xlsx</span>
                         </p>
                         <p className="flex items-center gap-2">
                            <span className="w-20 font-bold text-brand text-right">Adwords:</span> 
                            <span className="font-mono bg-app px-1 rounded">adwords_bill...xlsx</span>
                         </p>
                         <p className="text-[10px] text-emerald-600 italic mt-1 pt-1 border-t border-border/50 text-center font-medium">
                            *Mendukung re-upload file hasil export dashboard.
                         </p>
                      </div>
                    </div>
                    <div className="px-6 py-2.5 bg-brand text-brand-content rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
                      Pilih File(s) (.zip / .xlsx / .xls)
                    </div>
                  </>
                )}
              </div>
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-6 bg-surface rounded-xl border border-border space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-brand font-bold">
                   <CheckCircle2 size={18} />
                   <h3>Smart Detection</h3>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                   Otomatis mengenali file Raw Shopee, Order.all, Income, MyBalance, Adwords Bill atau file <b>Export Dashboard</b>. File Merger yang berisi campuran data akan otomatis dipisahkan.
                </p>
             </div>
             <div className="p-6 bg-surface rounded-xl border border-border space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-brand font-bold">
                   <PackageCheck size={18} />
                   <h3>Duplicate Checker</h3>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                   Sistem membandingkan data upload dengan database. Data yang sudah ada (berdasarkan Order ID & Waktu) akan ditandai sebagai Duplikat.
                </p>
             </div>
          </div>
        </div>
      )}

      {previewData && (
        <div className="bg-surface rounded-2xl shadow-xl border border-border p-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-6 border-b border-border gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-main">Hasil Analisa Data</h2>
              <p className="text-xs text-text-muted">Tinjau data baru dan duplikat sebelum menyimpan.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Dropdown Claim Status */}
              {totalNewRows > 0 && (
                <div className={`flex items-center gap-2 bg-app px-2 py-1.5 rounded-lg border ${isStatusLocked ? 'border-amber-500/50 bg-amber-500/10' : 'border-border'}`}>
                  <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isStatusLocked ? 'text-amber-600' : 'text-text-muted'}`}>
                    {isStatusLocked ? <Lock size={10} /> : <Settings2 size={10} />}
                    {isStatusLocked ? 'Status File:' : 'Set Status:'}
                  </span>
                  <div className="relative">
                    {isStatusLocked ? (
                        <div className="text-xs font-bold text-amber-700 px-2 flex items-center gap-2 cursor-help" title="Status diambil dari data file yang diupload.">
                            Asli
                            <Info size={12} />
                        </div>
                    ) : (
                        <>
                            <select
                            value={targetStatus}
                            onChange={(e) => setTargetStatus(e.target.value)}
                            className="appearance-none bg-transparent text-xs font-bold text-brand pr-6 focus:outline-none cursor-pointer"
                            >
                            {CLAIM_STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="bg-surface text-text-main">{opt}</option>
                            ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </>
                    )}
                  </div>
                </div>
              )}

              <button 
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-bold text-text-muted hover:bg-app rounded-lg transition-colors border border-transparent hover:border-border"
              >
                Batal & Reset
              </button>
              
              {totalNewRows > 0 && (
                <button 
                  onClick={handleSaveToDatabase}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-bold bg-brand text-brand-content rounded-lg shadow-lg hover:brightness-110 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan Semua Data Baru
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 flex items-center gap-4">
               <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center text-brand">
                 <CheckCircle2 size={24} />
               </div>
               <div>
                 <p className="text-xs text-text-muted font-bold uppercase">Total Data Baru</p>
                 <p className="text-2xl font-black text-brand">{totalNewRows}</p>
               </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-4">
               <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600">
                 <AlertTriangle size={24} />
               </div>
               <div>
                 <p className="text-xs text-text-muted font-bold uppercase">Total Duplikat</p>
                 <p className="text-2xl font-black text-amber-600">{totalDuplicateRows}</p>
               </div>
            </div>
          </div>

          <div className="space-y-8">
            {totalNewRows === 0 && totalDuplicateRows === 0 ? (
               <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                 <CheckCircle2 size={32} className="mx-auto text-text-muted mb-2" />
                 <p className="text-text-muted font-medium">Tidak ada data ditemukan.</p>
               </div>
            ) : null}

            {/* FAILED DELIVERY SECTION */}
            {(previewData.failed.newRows.length > 0 || previewData.failed.duplicateRows.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <AlertOctagon className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan Pengiriman Gagal</h3>
                </div>
                <PreviewTable 
                  data={previewData.failed.newRows} 
                  type="new" 
                  category="failed" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.failed.duplicateRows} 
                  type="duplicate" 
                  category="failed" 
                  onExport={handleExport} 
                />
              </div>
            )}

            {/* RETURN REFUND SECTION */}
            {(previewData.returned.newRows.length > 0 || previewData.returned.duplicateRows.length > 0) && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <RotateCcw className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan Pengembalian</h3>
                </div>
                <PreviewTable 
                  data={previewData.returned.newRows} 
                  type="new" 
                  category="returned" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.returned.duplicateRows} 
                  type="duplicate" 
                  category="returned" 
                  onExport={handleExport} 
                />
              </div>
            )}

            {/* CANCELLED SECTION */}
            {(previewData.cancelled.newRows.length > 0 || previewData.cancelled.duplicateRows.length > 0) && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <XCircle className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan Pembatalan</h3>
                </div>
                <PreviewTable 
                  data={previewData.cancelled.newRows} 
                  type="new" 
                  category="failed" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.cancelled.duplicateRows} 
                  type="duplicate" 
                  category="failed"
                  onExport={handleExport} 
                />
              </div>
            )}

            {/* ORDER ALL SECTION */}
            {(previewData.orderAll.newRows.length > 0 || previewData.orderAll.duplicateRows.length > 0) && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <FileText className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan Order All</h3>
                </div>
                <PreviewTable 
                  data={previewData.orderAll.newRows} 
                  type="new" 
                  category="failed" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.orderAll.duplicateRows} 
                  type="duplicate" 
                  category="failed"
                  onExport={handleExport} 
                />
              </div>
            )}

            {/* INCOME SECTION */}
            {(previewData.income.newRows.length > 0 || previewData.income.duplicateRows.length > 0) && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <TrendingUp className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan Income</h3>
                </div>
                <PreviewTable 
                  data={previewData.income.newRows} 
                  type="new" 
                  category="failed" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.income.duplicateRows} 
                  type="duplicate" 
                  category="failed"
                  onExport={handleExport} 
                />
              </div>
            )}

            {/* MY BALANCE SECTION */}
            {(previewData.myBalance.newRows.length > 0 || previewData.myBalance.duplicateRows.length > 0) && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <Wallet className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan MyBalance</h3>
                </div>
                <PreviewTable 
                  data={previewData.myBalance.newRows} 
                  type="new" 
                  category="failed" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.myBalance.duplicateRows} 
                  type="duplicate" 
                  category="failed"
                  onExport={handleExport} 
                />
              </div>
            )}

            {/* ADWORDS BILL SECTION */}
            {(previewData.adwordsBill.newRows.length > 0 || previewData.adwordsBill.duplicateRows.length > 0) && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 py-2 border-b border-border">
                  <Megaphone className="text-brand" size={20} />
                  <h3 className="text-lg font-bold text-text-main">Laporan Adwords Bill</h3>
                </div>
                <PreviewTable 
                  data={previewData.adwordsBill.newRows} 
                  type="new" 
                  category="failed" 
                  onExport={handleExport} 
                />
                <PreviewTable 
                  data={previewData.adwordsBill.duplicateRows} 
                  type="duplicate" 
                  category="failed"
                  onExport={handleExport} 
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
