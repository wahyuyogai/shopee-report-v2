
'use client';

import React, { useMemo } from 'react';
import { 
  Package, 
  Coins, 
  Layers, 
  AlertOctagon, 
  RotateCcw, 
  Truck,
  ArrowRightLeft,
  XCircle
} from 'lucide-react';

interface SummaryCardsProps {
  data: any[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const stats = useMemo(() => {
    const uniqueOrders = new Set<string>();
    const uniqueOrdersFailed = new Set<string>();
    const uniqueOrdersReturn = new Set<string>();
    const uniqueOrdersCancelled = new Set<string>();
    
    const uniqueResiGagal = new Set<string>();
    const uniqueResiTerusan = new Set<string>();
    
    let totalPcs = 0;
    let totalAmount = 0;

    data.forEach(row => {
      // 1. Unique Order IDs
      const orderId = String(row['No. Pesanan'] || '').trim();
      const isValidOrder = orderId && orderId !== '-' && orderId !== '';
      
      if (isValidOrder) {
        uniqueOrders.add(orderId);
        
        const type = row['Type Laporan'];
        if (type === 'Pengiriman Gagal') {
          uniqueOrdersFailed.add(orderId);
        } else if (type === 'Pengembalian') {
          uniqueOrdersReturn.add(orderId);
        } else if (type === 'Pembatalan') {
          uniqueOrdersCancelled.add(orderId);
        }
      }

      // 2. Resi Counts
      // Resi Gagal (Only from Failed Report type)
      if (row['Type Laporan'] === 'Pengiriman Gagal') {
        const resi = String(row['No. Resi'] || '').trim();
        if (resi && resi !== '-' && resi !== '') {
          uniqueResiGagal.add(resi);
        }
      }

      // Resi Terusan (Only from Return Report type)
      // Note: In Merger view, we look for the specific column
      const resiTerusan = String(row['No. Resi Pengiriman Terusan'] || '').trim();
      if (resiTerusan && resiTerusan !== '-' && resiTerusan !== '') {
        uniqueResiTerusan.add(resiTerusan);
      }

      // 3. Totals (Pcs & Amount)
      // Parse Jumlah
      const qtyStr = String(row['Jumlah'] || '0').replace(/[^0-9.-]/g, '');
      const qty = parseFloat(qtyStr);
      if (!isNaN(qty)) {
        totalPcs += qty;
      }

      // Parse Total (Rp)
      const totalStr = String(row['Total'] || '0').replace(/[^0-9]/g, '');
      const amount = parseFloat(totalStr);
      if (!isNaN(amount)) {
        totalAmount += amount;
      }
    });

    return {
      totalOrders: uniqueOrders.size,
      ordersFailed: uniqueOrdersFailed.size,
      ordersReturn: uniqueOrdersReturn.size,
      ordersCancelled: uniqueOrdersCancelled.size,
      totalPcs,
      totalAmount,
      totalResiGagal: uniqueResiGagal.size,
      totalResiTerusan: uniqueResiTerusan.size
    };
  }, [data]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const Card = ({ 
    title, 
    value, 
    subValue, 
    icon, 
    colorClass,
    bgClass 
  }: { 
    title: string, 
    value: string | number, 
    subValue?: React.ReactNode, 
    icon: React.ReactNode, 
    colorClass: string,
    bgClass: string 
  }) => (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-start justify-between gap-4 transition-transform hover:scale-[1.02]">
      <div className="space-y-1 overflow-hidden">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider truncate" title={title}>
          {title}
        </p>
        <h3 className="text-2xl font-black text-text-main truncate" title={String(value)}>
          {value}
        </h3>
        {subValue && (
          <div className="text-xs font-medium text-text-muted mt-1">
            {subValue}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl flex-shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Total No. Pesanan */}
      <Card 
        title="Total Pesanan"
        value={stats.totalOrders}
        subValue="Unique Order IDs"
        icon={<Package size={24} />}
        colorClass="text-brand"
        bgClass="bg-brand/10"
      />

      {/* 2. Total Type Report Breakdown */}
      <Card 
        title="Report Breakdown"
        value={stats.ordersFailed + stats.ordersReturn + stats.ordersCancelled}
        subValue={
          <div className="flex gap-3">
             <span className="flex items-center gap-1 text-red-500" title="Gagal Kirim">
               <AlertOctagon size={10} /> {stats.ordersFailed}
             </span>
             <span className="flex items-center gap-1 text-blue-500" title="Pengembalian">
               <RotateCcw size={10} /> {stats.ordersReturn}
             </span>
             <span className="flex items-center gap-1 text-orange-500" title="Pembatalan">
               <XCircle size={10} /> {stats.ordersCancelled}
             </span>
          </div>
        }
        icon={<Layers size={24} />}
        colorClass="text-purple-600"
        bgClass="bg-purple-500/10"
      />

      {/* 3. Total Pcs */}
      <Card 
        title="Total Produk (Pcs)"
        value={stats.totalPcs}
        subValue="Total Qty Item"
        icon={<ArrowRightLeft size={24} />}
        colorClass="text-orange-600"
        bgClass="bg-orange-500/10"
      />

      {/* 4. Total Amount */}
      <Card 
        title="Total Amount"
        value={formatCurrency(stats.totalAmount)}
        subValue="Est. Total Value"
        icon={<Coins size={24} />}
        colorClass="text-emerald-600"
        bgClass="bg-emerald-500/10"
      />

       {/* 5. Total Pengiriman Gagal (Resi) */}
       <Card 
        title="Resi Gagal"
        value={stats.totalResiGagal}
        subValue="Unique AWB (Failed)"
        icon={<Truck size={24} />}
        colorClass="text-red-600"
        bgClass="bg-red-500/10"
      />

      {/* 6. Total Pengembalian (Resi Terusan) */}
      <Card 
        title="Resi Terusan"
        value={stats.totalResiTerusan}
        subValue="Unique AWB (Return)"
        icon={<RotateCcw size={24} />}
        colorClass="text-blue-600"
        bgClass="bg-blue-500/10"
      />
    </div>
  );
};