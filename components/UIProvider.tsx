
'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

// --- Types ---

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info' | 'warning';
}

interface UIContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// --- Context ---

const UIContext = createContext<UIContextType | undefined>(undefined);

// --- Components ---

const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
    info: 'bg-brand/10 border-brand/20 text-brand',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  };

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-brand" />,
    warning: <AlertTriangle size={20} className="text-amber-500" />,
  };

  return (
    <div 
      className={`
        pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-right-full duration-500
        ${styles[toast.type]}
      `}
      role="alert"
    >
      <div className="p-4 flex items-start gap-3 bg-surface/80">
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 w-0">
          <p className="text-sm font-bold text-text-main">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs text-text-muted leading-relaxed">{toast.message}</p>}
        </div>
        <div className="flex-shrink-0 ml-4 flex">
          <button
            className="inline-flex text-text-muted hover:text-text-main focus:outline-none"
            onClick={() => onClose(toast.id)}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ 
  isOpen, 
  options, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  options: ConfirmOptions | null; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) => {
  if (!isOpen || !options) return null;

  const isDanger = options.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-full ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-brand/10 text-brand'}`}>
            {isDanger ? <AlertTriangle size={28} /> : <Info size={28} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main">{options.title}</h3>
            <p className="text-sm text-text-muted mt-1">{options.message}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main hover:bg-app rounded-lg transition-colors"
          >
            {options.cancelText || 'Batal'}
          </button>
          <button 
            onClick={onConfirm}
            className={`
              px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all
              ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand hover:brightness-110'}
            `}
          >
            {options.confirmText || 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Provider ---

export function UIProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({ isOpen: false, options: null, resolve: null });

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmConfig({ isOpen: true, options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmConfig.resolve) confirmConfig.resolve(true);
    setConfirmConfig({ ...confirmConfig, isOpen: false });
  };

  const handleCancel = () => {
    if (confirmConfig.resolve) confirmConfig.resolve(false);
    setConfirmConfig({ ...confirmConfig, isOpen: false });
  };

  return (
    <UIContext.Provider value={{ showToast, confirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[90] flex flex-col gap-3 w-full max-w-sm pointer-events-none p-4 sm:p-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={confirmConfig.isOpen} 
        options={confirmConfig.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
