import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface MissingSkuAlertProps {
  count: number;
}

export const MissingSkuAlert: React.FC<MissingSkuAlertProps> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <div className="fixed top-20 right-8 z-[80] w-auto animate-in slide-in-from-top-4 duration-500 pointer-events-auto">
      <div className="bg-red-500 dark:bg-red-600 text-white shadow-xl shadow-red-500/20 rounded-xl p-3 pr-4 flex items-center gap-3 border border-red-400">
         <div className="p-2 bg-white/20 rounded-lg animate-pulse">
            <AlertTriangle size={20} className="text-white" />
         </div>
         <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">Data Tidak Lengkap</h3>
            <p className="text-sm font-bold">
               {count} Baris kehilangan SKU/Total
            </p>
         </div>
         <Link href="/sku-manager" className="ml-2 px-3 py-1.5 bg-white text-red-600 text-xs font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-1">
            Fix <ArrowRight size={12} />
         </Link>
      </div>
    </div>
  );
};