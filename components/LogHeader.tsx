
'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LogHeaderProps {
  hasLogs: boolean;
  onClear: () => void;
}

export const LogHeader = ({ hasLogs, onClear }: LogHeaderProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const { role } = useAuth();
  
  const isGuest = role === 'guest';

  // Handle countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isConfirmOpen && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isConfirmOpen, countdown]);

  const handleOpenConfirm = () => {
    if (!hasLogs || isGuest) return;
    setCountdown(10); // Reset timer to 10s
    setIsConfirmOpen(true);
  };

  const handleConfirmClear = async () => {
    setIsDeleting(true);
    // Simulate short processing delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    onClear();
    setIsDeleting(false);
    setIsConfirmOpen(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <ClipboardList size={32} className="text-brand" />
            Activity Logs
          </h1>
          <p className="text-text-muted mt-2">
            Rekaman aktivitas sistem, termasuk status pemrosesan laporan yang berhasil maupun gagal.
          </p>
        </div>
        <button 
          onClick={handleOpenConfirm}
          disabled={!hasLogs || isGuest}
          title={isGuest ? "Guest tidak diizinkan menghapus log" : "Hapus semua log"}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-bold border rounded-xl transition-all active:scale-95
            ${isGuest 
              ? 'border-border text-text-muted bg-app/50 opacity-50 cursor-not-allowed' 
              : 'border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed'}
          `}
        >
          <Trash2 size={18} />
          Hapus Log
        </button>
      </div>

      {/* SECURE CONFIRMATION DIALOG */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-red-500/10 text-red-500 animate-pulse">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Hapus Semua Log?</h3>
                <p className="text-sm text-text-muted mt-1">
                  Tindakan ini tidak dapat dibatalkan. Riwayat aktivitas akan hilang permanen.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl mb-6">
              <p className="text-xs text-red-600 font-bold text-center">
                Fitur keamanan aktif. Mohon tunggu sebelum konfirmasi.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirmClear}
                disabled={countdown > 0 || isDeleting}
                className={`
                  w-full py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
                  ${countdown > 0 
                    ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-red-500 hover:bg-red-600 hover:scale-[1.02] active:scale-95'}
                `}
              >
                {isDeleting ? (
                   <Loader2 size={18} className="animate-spin" />
                ) : countdown > 0 ? (
                   `Tunggu (${countdown}s)`
                ) : (
                   <>
                     <Trash2 size={18} />
                     Ya, Hapus Sekarang
                   </>
                )}
              </button>
              
              <button 
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
                className="w-full py-3 text-sm font-bold text-text-muted hover:text-text-main hover:bg-app rounded-xl transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
