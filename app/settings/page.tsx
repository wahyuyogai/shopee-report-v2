
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, Moon, Palette, ShieldCheck, Check, Square, Circle, 
  Maximize2, MoveVertical, Layers, Sparkles, Box, 
  SunMedium, Wind, Ghost, Trash2, AlertTriangle, Loader2, Database, Upload, Download, ClipboardPaste,
  PencilRuler, Facebook, ShoppingBag, Clapperboard, Smartphone, ShoppingCart, Camera, MonitorPlay,
  FileJson, Lock
} from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';
import { useData } from '../../components/DataProvider';
import { useUI } from '../../components/UIProvider';
import { Theme, BorderStyle, BorderWeight, UIMode, ShadowStyle, ProcessedReport, OutlineStyle } from '../../types';
import { fetchFullBackupAction, restoreFullBackupAction } from '../actions';
import { BulkPasteModal } from '../../components/BulkPasteModal';
import { useAuth } from '../../components/AuthProvider';
import { CLAIM_STATUS_OPTIONS } from '../../lib/constants'; // Imported shared logic

// Define the type here for local usage since it's not exported from modal
interface PreviewItem {
  orderId: string;
  currentStatus: string;
  reportId: string;
  rowIndex: number;
  type: string;
}

type SecurityActionType = 'clear' | 'restore' | null;

export default function SettingsPage() {
  const { 
    theme, setTheme, 
    borderStyle, setBorderStyle, 
    borderWeight, setBorderWeight,
    outlineStyle, setOutlineStyle,
    uiMode, setUiMode,
    shadowStyle, setShadowStyle
  } = useTheme();

  const { 
    clearData, 
    refreshData, 
    failedDeliveryReports, 
    returnRefundReports, 
    updateBulkStatus 
  } = useData();
  
  const { showToast, confirm } = useUI();
  const { role } = useAuth();
  
  // Existing states
  const [isClearing, setIsClearing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // --- SECURITY & AUTO BACKUP STATES ---
  const [securityAction, setSecurityAction] = useState<SecurityActionType>(null);
  const [securityCountdown, setSecurityCountdown] = useState(0);
  const [autoBackupStatus, setAutoBackupStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null); // Store parsed JSON before restore
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGuest = role === 'guest';

  // --- THEME OPTIONS ---
  const themeOptions: { id: Theme; label: string; icon: React.ReactNode; colors: string[] }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={18} />, colors: ['bg-white', 'bg-gray-200', 'bg-indigo-600'] },
    { id: 'dark', label: 'Dark', icon: <Moon size={18} />, colors: ['bg-gray-950', 'bg-gray-800', 'bg-indigo-500'] },
    { id: 'indigo', label: 'Night', icon: <Palette size={18} />, colors: ['bg-slate-950', 'bg-slate-800', 'bg-indigo-400'] },
    { id: 'emerald', label: 'Forest', icon: <Palette size={18} />, colors: ['bg-emerald-950', 'bg-emerald-900', 'bg-emerald-400'] },
    { id: 'facebook', label: 'Facebook', icon: <Facebook size={18} />, colors: ['bg-[#F0F2F5]', 'bg-white', 'bg-[#1877F2]'] },
    { id: 'shopee', label: 'Shopee', icon: <ShoppingBag size={18} />, colors: ['bg-[#f5f5f5]', 'bg-white', 'bg-[#EE4D2D]'] },
    { id: 'tiktok', label: 'TikTok', icon: <Smartphone size={18} />, colors: ['bg-[#121212]', 'bg-[#1e1e1e]', 'bg-[#FE2C55]'] },
    { id: 'netflix', label: 'Netflix', icon: <Clapperboard size={18} />, colors: ['bg-black', 'bg-[#141414]', 'bg-[#E50914]'] },
    { id: 'instagram', label: 'Insta', icon: <Camera size={18} />, colors: ['bg-white', 'bg-gray-50', 'bg-[#d62976]'] },
    { id: 'indomaret', label: 'Indomart', icon: <ShoppingCart size={18} />, colors: ['bg-[#f1f5f9]', 'bg-white', 'bg-[#005DA6]'] },
    { id: 'alfamart', label: 'Alfamart', icon: <ShoppingCart size={18} />, colors: ['bg-[#fff1f2]', 'bg-white', 'bg-[#D71116]'] },
    { id: 'gradient', label: 'Gradient', icon: <MonitorPlay size={18} />, colors: ['bg-[#0f0c29]', 'bg-[#302b63]', 'bg-[#7b4397]'] },
  ];

  const uiModeOptions: { id: UIMode; label: string; description: string; icon: React.ReactNode }[] = [
    { id: 'standard', label: 'Standard', description: 'Clean & professional look.', icon: <Box size={22} /> },
    { id: 'glass', label: 'Glassmorphic', description: 'Translucent frosted surfaces.', icon: <Sparkles size={22} /> },
    { id: 'neo', label: 'Neo-Brutalist', description: 'Bold borders & hard shadows.', icon: <Layers size={22} /> },
  ];

  const shadowOptions: { id: ShadowStyle; label: string; description: string; icon: React.ReactNode }[] = [
    { id: 'none', label: 'Flat', description: 'No shadows, maximum focus.', icon: <Square size={20} /> },
    { id: 'subtle', label: 'Subtle', description: 'Grounded and clean.', icon: <SunMedium size={20} /> },
    { id: 'elevated', label: 'Elevated', description: 'Noticeable depth.', icon: <Wind size={20} /> },
    { id: 'floating', label: 'Floating', description: 'Deep ethereal shadows.', icon: <Ghost size={20} /> },
  ];

  const borderOptions: { id: BorderStyle; label: string; icon: React.ReactNode }[] = [
    { id: 'sharp', label: 'Sharp', icon: <Square size={18} /> },
    { id: 'modern', label: 'Modern', icon: <Maximize2 size={18} /> },
    { id: 'soft', label: 'Soft', icon: <Circle size={18} /> },
  ];

  const weightOptions: { id: BorderWeight; label: string; icon: React.ReactNode }[] = [
    { id: 'thin', label: 'Thin', icon: <MoveVertical size={16} strokeWidth={1} /> },
    { id: 'regular', label: 'Regular', icon: <MoveVertical size={16} strokeWidth={2} /> },
    { id: 'bold', label: 'Bold', icon: <MoveVertical size={16} strokeWidth={3} /> },
  ];

  const outlineOptions: { id: OutlineStyle; label: string; visual: string }[] = [
    { id: 'solid', label: 'Solid', visual: 'border-solid' },
    { id: 'dashed', label: 'Dashed', visual: 'border-dashed' },
    { id: 'dotted', label: 'Dotted', visual: 'border-dotted' },
    { id: 'double', label: 'Double', visual: 'border-double' },
    { id: 'shadow-wrapper', label: 'Shadow Wrapper', visual: 'border-groove' },
    { id: 'transparent', label: 'Transparent', visual: 'border-none' },
  ];

  // --- SECURITY TIMER & AUTO BACKUP EFFECT ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    // Only run if modal is open and countdown > 0
    if (securityAction && securityCountdown > 0) {
      timer = setTimeout(() => {
        setSecurityCountdown((prev) => prev - 1);
      }, 1000);
    }
    
    return () => clearTimeout(timer);
  }, [securityAction, securityCountdown]);

  // Effect to trigger Auto Backup when Security Modal Opens
  useEffect(() => {
    if (securityAction && autoBackupStatus === 'idle') {
        generateBackup(true); // 'true' for silent/auto mode
    }
  }, [securityAction]);

  // --- REUSABLE BACKUP LOGIC ---
  const generateBackup = async (isAuto = false) => {
    if (isAuto) setAutoBackupStatus('processing');
    else setIsBackingUp(true);

    try {
      const data = await fetchFullBackupAction();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Distinguish filename if it's an auto-backup
      link.download = `ReturnApp-${isAuto ? 'AutoBackup' : 'Backup'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (isAuto) {
        // Delay slighty to show the success state in modal
        setTimeout(() => setAutoBackupStatus('success'), 800);
      } else {
        showToast('success', 'Backup Selesai', 'File backup telah diunduh.');
      }
    } catch (e) {
      console.error(e);
      if (isAuto) setAutoBackupStatus('error');
      else showToast('error', 'Backup Gagal', 'Gagal mengambil data dari server.');
    } finally {
      if (!isAuto) setIsBackingUp(false);
    }
  };

  // --- TRIGGER SECURITY FLOW ---

  const handleClearDataClick = () => {
    if (isGuest) return;
    setSecurityAction('clear');
    setSecurityCountdown(15);
    setAutoBackupStatus('idle');
  };

  const handleRestoreClick = () => {
    if (isGuest) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const backupData = JSON.parse(jsonContent);

        if (!backupData.reports && !backupData.logs && !backupData.settings) {
          throw new Error('Format file backup tidak valid.');
        }

        // Simpan data di state sementara, jangan restore dulu!
        setPendingRestoreData(backupData);
        
        // Buka modal keamanan
        setSecurityAction('restore');
        setSecurityCountdown(15);
        setAutoBackupStatus('idle');

      } catch (err: any) {
        console.error(err);
        showToast('error', 'File Error', err.message || 'File korup.');
      }
    };
    reader.readAsText(file);
  };

  // --- EXECUTE FINAL ACTION ---

  const executeSecurityAction = async () => {
    if (!securityAction) return;
    
    // Ensure safety: user must wait and backup must finish (success or error)
    if (securityCountdown > 0 || autoBackupStatus === 'processing') return;

    if (securityAction === 'clear') {
        setIsClearing(true);
        try {
            await clearData();
            showToast('success', 'Data Dihapus', 'Database berhasil dibersihkan.');
        } catch (e) {
            showToast('error', 'Gagal', 'Terjadi kesalahan saat menghapus data.');
        } finally {
            setIsClearing(false);
        }
    } else if (securityAction === 'restore' && pendingRestoreData) {
        setIsRestoring(true);
        try {
            await restoreFullBackupAction(pendingRestoreData);
            await refreshData();
            showToast('success', 'Restore Berhasil', 'Database telah dipulihkan.');
        } catch (err: any) {
            showToast('error', 'Restore Gagal', err.message || 'Gagal restore.');
        } finally {
            setIsRestoring(false);
            setPendingRestoreData(null);
        }
    }

    // Close Modal
    setSecurityAction(null);
    setSecurityCountdown(0);
    setAutoBackupStatus('idle');
  };

  const cancelSecurityAction = () => {
    setSecurityAction(null);
    setSecurityCountdown(0);
    setAutoBackupStatus('idle');
    setPendingRestoreData(null);
  };


  // --- BULK PREVIEW LOGIC (Unchanged) ---
  const handlePreviewBulk = (inputOrderIds: string[]) => {
    const found: PreviewItem[] = [];
    const foundSet = new Set<string>();
    const inputSet = new Set(inputOrderIds.map(id => id.trim()));

    const searchInReports = (reports: ProcessedReport[], type: string) => {
        reports.forEach(report => {
            report.data.forEach((row, index) => {
                const orderId = String(row['No. Pesanan'] || '').trim();
                if (orderId && inputSet.has(orderId)) {
                    found.push({
                        orderId,
                        currentStatus: row['Claim Status'] || 'Pending',
                        reportId: report.id,
                        rowIndex: index,
                        type
                    });
                    foundSet.add(orderId);
                }
            });
        });
    };

    searchInReports(failedDeliveryReports, 'Failed');
    searchInReports(returnRefundReports, 'Return');

    const notFound = Array.from(inputSet).filter(id => !foundSet.has(id));

    return { found, notFound };
  };

  const handleConfirmUpdate = async (items: PreviewItem[], status: string) => {
    setIsProcessingBulk(true);
    try {
      const selections = items.map(item => ({
        reportId: item.reportId,
        rowIndex: item.rowIndex
      }));

      await updateBulkStatus(selections, status);

      showToast('success', 'Update Berhasil', `Berhasil mengubah status ${items.length} pesanan.`);
      setIsBulkModalOpen(false);

    } catch (error) {
      console.error(error);
      showToast('error', 'Gagal', 'Terjadi kesalahan saat melakukan update massal.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-5xl relative">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-text-main">Settings</h1>
        <p className="text-text-muted mt-2">
          Customize the interface to match your workflow and personal style.
        </p>
      </div>

      {/* UI Style Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-xl font-bold text-text-main">
          <Sparkles size={22} className="text-brand" />
          <h2>UI Personality</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {uiModeOptions.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setUiMode(mode.id);
                showToast('info', 'UI Updated', `Mode switched to ${mode.label}`);
              }}
              className={`
                relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 text-center transition-all group
                ${uiMode === mode.id 
                  ? 'border-brand bg-brand-muted text-brand shadow-lg' 
                  : 'border-border bg-surface hover:border-brand/50'}
              `}
            >
              <div className={`
                p-3 rounded-full transition-transform group-hover:scale-110
                ${uiMode === mode.id ? 'bg-brand text-brand-content' : 'bg-app text-text-muted'}
              `}>
                {mode.icon}
              </div>
              <div>
                <h3 className="font-bold text-text-main">{mode.label}</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{mode.description}</p>
              </div>
              {uiMode === mode.id && (
                <div className="absolute top-2 right-2 h-5 w-5 bg-brand rounded-full flex items-center justify-center text-brand-content">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Shadow Style Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-xl font-bold text-text-main">
          <Ghost size={22} className="text-brand" />
          <h2>Depth & Shadows</h2>
        </div>
        <div className={`
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 
          ${uiMode === 'neo' ? 'opacity-50 pointer-events-none' : ''}
        `}>
          {shadowOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setShadowStyle(option.id)}
              className={`
                relative flex flex-col items-center p-5 rounded-xl border transition-all text-center
                ${shadowStyle === option.id 
                  ? 'border-brand bg-brand-muted ring-2 ring-brand/10' 
                  : 'border-border bg-surface hover:border-brand/30'}
              `}
              style={{ boxShadow: shadowStyle === option.id ? 'none' : 'var(--app-shadow)' }}
            >
              <div className={`
                mb-3 p-2 rounded-lg 
                ${shadowStyle === option.id ? 'text-brand' : 'text-text-muted'}
              `}>
                {option.icon}
              </div>
              <h3 className="font-bold text-text-main text-sm">{option.label}</h3>
              <p className="text-[10px] text-text-muted mt-1">{option.description}</p>
              {shadowStyle === option.id && (
                <div className="absolute top-2 right-2 text-brand">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Theme Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-xl font-bold text-text-main">
          <Palette size={22} className="text-brand" />
          <h2>Color Themes</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {themeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              className={`
                relative p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]
                ${theme === option.id ? 'border-brand bg-surface shadow-lg ring-2 ring-brand/10' : 'border-border bg-surface/50'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme === option.id ? 'bg-brand text-brand-content' : 'bg-app text-text-muted'}`}>
                  {option.icon}
                </div>
                <h3 className="font-medium text-text-main text-sm">{option.label}</h3>
              </div>
              <div className="flex gap-1 mt-3">
                {option.colors.map((c, i) => (
                  <div key={i} className={`h-2 flex-1 rounded-full ${c} border border-border/10`} 
                    style={option.id === 'facebook' || option.id === 'shopee' || option.id === 'tiktok' || option.id === 'netflix' || option.id === 'instagram' || option.id === 'indomaret' || option.id === 'alfamart' || option.id === 'gradient' ? { backgroundColor: c.startsWith('bg-[') ? c.slice(4, -1) : '' } : {}}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Borders & Layout Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-xl font-bold text-text-main">
          <Maximize2 size={22} className="text-brand" />
          <h2>Shapes & Structure</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Border Radius */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Corner Rounding</label>
            <div className="grid grid-cols-1 gap-2">
              {borderOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setBorderStyle(opt.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                    ${borderStyle === opt.id ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-surface text-text-muted hover:border-brand/30'}
                  `}
                >
                  <div className="p-1.5 rounded-lg bg-app/50">{opt.icon}</div>
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Border Weight */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Line Thickness</label>
            <div className="grid grid-cols-1 gap-2">
              {weightOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setBorderWeight(opt.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                    ${borderWeight === opt.id ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-surface text-text-muted hover:border-brand/30'}
                  `}
                >
                  <div className="p-1.5 rounded-lg bg-app/50">{opt.icon}</div>
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Outline Style */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Outline Style</label>
            <div className="grid grid-cols-1 gap-2">
              {outlineOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setOutlineStyle(opt.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                    ${outlineStyle === opt.id ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-surface text-text-muted hover:border-brand/30'}
                  `}
                >
                  <div className={`w-8 h-8 rounded-lg bg-app/50 flex items-center justify-center border-2 border-current ${opt.visual}`}>
                    <PencilRuler size={14} />
                  </div>
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data Management Section - HIDDEN FOR GUEST */}
      {!isGuest && (
        <section className="space-y-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-xl font-bold text-text-main">
            <Database size={22} className="text-brand" />
            <h2>Data Management</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Bulk Update */}
              <div className="p-6 border border-brand/20 bg-brand/5 rounded-xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-brand font-bold">
                          <ClipboardPaste size={20} />
                          <h3>Bulk Update Status</h3>
                      </div>
                      <p className="text-sm text-text-muted">
                          Update status klaim banyak pesanan sekaligus menggunakan daftar No. Pesanan (Paste ID).
                      </p>
                  </div>
                  <button
                      onClick={() => setIsBulkModalOpen(true)}
                      className="w-full px-4 py-2 bg-brand text-brand-content font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      <ClipboardPaste size={16} />
                      Buka Tools
                  </button>
              </div>

              {/* Manual Backup */}
              <div className="p-6 border border-border bg-surface rounded-xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-text-main font-bold">
                          <Download size={20} />
                          <h3>Backup Data</h3>
                      </div>
                      <p className="text-sm text-text-muted">
                          Unduh seluruh data laporan, logs, dan pengaturan ke dalam file JSON untuk arsip.
                      </p>
                  </div>
                  <button
                      onClick={() => generateBackup(false)}
                      disabled={isBackingUp}
                      className="w-full px-4 py-2 bg-surface border-2 border-border text-text-main font-bold rounded-lg hover:bg-app active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {isBackingUp ? 'Memproses...' : 'Download Backup'}
                  </button>
              </div>

              {/* Restore (With Security) */}
              <div className="p-6 border border-amber-500/20 bg-amber-500/5 rounded-xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 font-bold">
                          <Upload size={20} />
                          <h3>Restore Data</h3>
                      </div>
                      <p className="text-sm text-text-muted">
                          Pulihkan database dari file backup. Data saat ini akan ditimpa sepenuhnya setelah validasi keamanan.
                      </p>
                  </div>
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json" 
                      onChange={handleFileChange}
                  />
                  <button
                      onClick={handleRestoreClick}
                      disabled={isRestoring}
                      className="w-full px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {isRestoring ? 'Memulihkan...' : 'Upload File Restore'}
                  </button>
              </div>
          </div>

          {/* Delete All (With Security) */}
          <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 mt-4">
            <div className="space-y-1">
              <h3 className="font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Hapus Semua Data
              </h3>
              <p className="text-sm text-text-muted">
                Tindakan ini akan menghapus seluruh laporan dari Database secara permanen setelah validasi keamanan.
              </p>
            </div>
            <button 
              onClick={handleClearDataClick}
              disabled={isClearing}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 whitespace-nowrap active:scale-95"
            >
              {isClearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              {isClearing ? 'Menghapus...' : 'Hapus Data'}
            </button>
          </div>
        </section>
      )}

      {/* Guest Mode Message */}
      {isGuest && (
        <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3">
           <AlertTriangle size={24} className="text-amber-600" />
           <div>
              <h4 className="font-bold text-text-main text-sm">Akses Terbatas</h4>
              <p className="text-xs text-text-muted mt-0.5">
                Fitur Data Management dinonaktifkan untuk mode Guest.
              </p>
           </div>
        </div>
      )}

      {/* Footer System Message */}
      <div className="p-6 bg-brand/5 border border-dashed border-brand/20 rounded-xl flex items-center gap-4">
        <div className="h-10 w-10 bg-brand/10 rounded-full flex items-center justify-center text-brand flex-shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-text-main text-sm">Appearance Saved</h4>
          <p className="text-xs text-text-muted mt-0.5">Your design preferences are synced to your browser storage and will be applied instantly across all pages.</p>
        </div>
      </div>

      <BulkPasteModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onPreview={handlePreviewBulk}
        onConfirm={handleConfirmUpdate}
        isProcessing={isProcessingBulk}
        statusOptions={CLAIM_STATUS_OPTIONS}
      />

      {/* --- SECURITY & BACKUP MODAL OVERLAY --- */}
      {securityAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            
            {/* Header with Pulse Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                 <div className="p-3 rounded-full bg-red-500/10 text-red-600 relative z-10">
                   <Lock size={32} />
                 </div>
                 <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-75"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main">
                   {securityAction === 'clear' ? 'Hapus Data Permanen' : 'Restore Database'}
                </h3>
                <p className="text-xs text-text-muted mt-1 font-medium uppercase tracking-wider text-red-500">
                   Tindakan Destruktif
                </p>
              </div>
            </div>
            
            {/* Steps Visualization */}
            <div className="space-y-4 mb-8">
               {/* Step 1: Backup */}
               <div className="flex items-center gap-3 p-3 rounded-xl bg-app/50 border border-border">
                  <div className={`
                     h-8 w-8 rounded-full flex items-center justify-center transition-all
                     ${autoBackupStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-brand/20 text-brand'}
                  `}>
                     {autoBackupStatus === 'processing' ? (
                        <Loader2 size={16} className="animate-spin" />
                     ) : autoBackupStatus === 'success' ? (
                        <Check size={16} />
                     ) : autoBackupStatus === 'error' ? (
                        <AlertTriangle size={16} />
                     ) : (
                        <Download size={16} />
                     )}
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-bold text-text-main">1. Auto-Backup Data</p>
                     <p className="text-xs text-text-muted">
                        {autoBackupStatus === 'processing' ? 'Sedang mengunduh file backup...' : 
                         autoBackupStatus === 'success' ? 'Backup berhasil disimpan.' : 
                         'Menunggu proses backup...'}
                     </p>
                  </div>
               </div>

               {/* Step 2: Timer */}
               <div className="flex items-center gap-3 p-3 rounded-xl bg-app/50 border border-border">
                  <div className={`
                     h-8 w-8 rounded-full flex items-center justify-center transition-all font-mono font-bold
                     ${securityCountdown > 0 ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500 text-white'}
                  `}>
                     {securityCountdown > 0 ? securityCountdown : <Check size={16} />}
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-bold text-text-main">2. Keamanan (15 Detik)</p>
                     <p className="text-xs text-text-muted">
                        {securityCountdown > 0 ? 'Mohon tunggu verifikasi...' : 'Verifikasi selesai.'}
                     </p>
                  </div>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeSecurityAction}
                disabled={securityCountdown > 0 || autoBackupStatus === 'processing'}
                className={`
                  w-full py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
                  ${securityCountdown > 0 || autoBackupStatus === 'processing'
                    ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-red-500 hover:bg-red-600 hover:scale-[1.02] active:scale-95'}
                `}
              >
                 {(securityCountdown > 0 || autoBackupStatus === 'processing') ? (
                    <span className="flex items-center gap-2">
                       <Lock size={16} />
                       Terkunci ({securityCountdown}s)
                    </span>
                 ) : (
                    <>
                       {securityAction === 'clear' ? <Trash2 size={18} /> : <Upload size={18} />}
                       {securityAction === 'clear' ? 'Ya, Hapus Data Sekarang' : 'Ya, Timpa Database'}
                    </>
                 )}
              </button>
              
              <button 
                onClick={cancelSecurityAction}
                className="w-full py-3 text-sm font-bold text-text-muted hover:text-text-main hover:bg-app rounded-xl transition-colors"
              >
                Batal
              </button>
            </div>

            {/* Warning Text */}
            <p className="text-[10px] text-center text-text-muted mt-4 opacity-70">
               Sistem mewajibkan backup sebelum penghapusan untuk mencegah kehilangan data yang tidak disengaja.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
