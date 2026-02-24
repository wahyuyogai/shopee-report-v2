
'use client';

import React, { useState, useEffect } from 'react';
import { X, ClipboardPaste, Check, AlertCircle, ArrowRight, Search, AlertTriangle, ChevronRight } from 'lucide-react';

interface PreviewItem {
  orderId: string;
  currentStatus: string;
  reportId: string;
  rowIndex: number;
  type: string;
}

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (orderIds: string[]) => { found: PreviewItem[]; notFound: string[] };
  onConfirm: (items: PreviewItem[], status: string) => Promise<void>;
  isProcessing: boolean;
  statusOptions: string[];
}

export const BulkPasteModal: React.FC<BulkPasteModalProps> = ({
  isOpen,
  onClose,
  onPreview,
  onConfirm,
  isProcessing,
  statusOptions
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [textInput, setTextInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(statusOptions[0] || 'Pending');
  const [detectedCount, setDetectedCount] = useState(0);
  
  // Preview Data State
  const [previewData, setPreviewData] = useState<{ found: PreviewItem[]; notFound: string[] }>({ found: [], notFound: [] });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
        setStep('input');
        setTextInput('');
        setPreviewData({ found: [], notFound: [] });
    }
  }, [isOpen]);

  // Parse text input to count valid IDs in real-time
  useEffect(() => {
    const ids = textInput
      .split(/[\n,]+/) 
      .map(id => id.trim())
      .filter(id => id.length > 0);
    setDetectedCount(ids.length);
  }, [textInput]);

  const handleCheckData = () => {
    const ids = textInput
      .split(/[\n,]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);
    
    if (ids.length === 0) return;

    const result = onPreview(ids);
    setPreviewData(result);
    setStep('preview');
  };

  const handleExecuteUpdate = () => {
    onConfirm(previewData.found, selectedStatus);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-brand/5 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand text-brand-content rounded-lg">
                <ClipboardPaste size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-text-main">Bulk Update via ID</h2>
                <p className="text-xs text-text-muted">
                    {step === 'input' ? 'Paste daftar No. Pesanan untuk diproses.' : 'Review data sebelum disimpan.'}
                </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="p-2 hover:bg-black/5 rounded-lg text-text-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- STEP 1: INPUT --- */}
        {step === 'input' && (
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-text-main">Daftar No. Pesanan</label>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${detectedCount > 0 ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'}`}>
                            {detectedCount} Baris
                        </span>
                    </div>
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        disabled={isProcessing}
                        placeholder={`Contoh:\n230810ABCDE123\n230810FGHIJ456\n230810KLMNO789`}
                        className="w-full h-60 p-3 text-xs font-mono bg-surface border-2 border-border rounded-xl focus:border-brand focus:outline-none resize-none transition-all placeholder:text-text-muted/40"
                    />
                    <p className="text-[10px] text-text-muted flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        Pisahkan dengan <b>Baris Baru (Enter)</b> atau <b>Koma (,)</b>.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-text-main">Set Status Menjadi</label>
                    <div className="relative">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            disabled={isProcessing}
                            className="w-full appearance-none bg-surface border-2 border-border text-text-main text-sm font-bold pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:border-brand cursor-pointer"
                        >
                            {statusOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-muted">
                            <ArrowRight size={16} className="rotate-90" />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- STEP 2: PREVIEW --- */}
        {step === 'preview' && (
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 p-6 pb-2">
                     <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <div className="bg-emerald-500 text-white p-1.5 rounded-full"><Check size={16} /></div>
                        <div>
                            <p className="text-xs text-text-muted font-bold">Ditemukan</p>
                            <p className="text-xl font-black text-emerald-600">{previewData.found.length}</p>
                        </div>
                     </div>
                     <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                        <div className="bg-red-500 text-white p-1.5 rounded-full"><X size={16} /></div>
                        <div>
                            <p className="text-xs text-text-muted font-bold">Tidak Ditemukan</p>
                            <p className="text-xl font-black text-red-600">{previewData.notFound.length}</p>
                        </div>
                     </div>
                </div>

                {/* Table Found */}
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                     {previewData.found.length > 0 && (
                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-app/50 text-text-muted font-bold sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">No. Pesanan</th>
                                        <th className="px-4 py-2">Status Lama</th>
                                        <th className="px-4 py-2 text-center"></th>
                                        <th className="px-4 py-2 text-brand">Status Baru</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-surface">
                                    {previewData.found.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 font-mono text-text-main">{item.orderId}</td>
                                            <td className="px-4 py-2 text-text-muted">{item.currentStatus}</td>
                                            <td className="px-4 py-2 text-center text-text-muted"><ArrowRight size={12} /></td>
                                            <td className="px-4 py-2 font-bold text-brand">{selectedStatus}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     )}

                     {/* Not Found List */}
                     {previewData.notFound.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-2">
                                <AlertTriangle size={14} /> ID Berikut Tidak Ditemukan:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {previewData.notFound.map(id => (
                                    <span key={id} className="px-2 py-1 bg-white border border-red-200 text-[10px] font-mono rounded text-red-500">
                                        {id}
                                    </span>
                                ))}
                            </div>
                        </div>
                     )}
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-surface/50 rounded-b-2xl flex-shrink-0">
          <button 
            onClick={() => {
                if (step === 'preview') setStep('input');
                else onClose();
            }}
            disabled={isProcessing}
            className="px-5 py-2.5 text-sm font-bold text-text-muted hover:text-text-main hover:bg-app rounded-xl transition-colors"
          >
            {step === 'preview' ? 'Kembali Edit' : 'Batal'}
          </button>
          
          {step === 'input' ? (
              <button 
                onClick={handleCheckData}
                disabled={detectedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-brand text-brand-content rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                 <Search size={16} />
                 Cek Data
              </button>
          ) : (
              <button 
                onClick={handleExecuteUpdate}
                disabled={previewData.found.length === 0 || isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-brand text-brand-content rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                 {isProcessing ? 'Menyimpan...' : (
                    <>
                       <Check size={18} />
                       Eksekusi Update
                    </>
                 )}
              </button>
          )}
        </div>
      </div>
    </div>
  );
};
