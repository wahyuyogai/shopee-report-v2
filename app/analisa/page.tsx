'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '../../components/DataProvider';
import { SkuAnalysisTable } from '../../components/analisa/SkuAnalysisTable';

// Define the structure for our aggregated data
interface SkuAnalysisData {
  skuFinal: string;
  totalPesanan: number;
  totalKuantitas: number;
  estimasiProfit: number;
}

export default function AnalisaPage() {
  const [activeTab, setActiveTab] = useState('analisa-sku');
  const { orderAllReports, skuMasterData, isLoading } = useData();

  // Data processing logic
  const skuAnalysisData = useMemo(() => {
    const skuMap = new Map<string, any>();
    skuMasterData.forEach(item => {
      if (item.sku1) skuMap.set(item.sku1.toLowerCase().trim(), item);
      if (item.sku2) skuMap.set(item.sku2.toLowerCase().trim(), item);
    });

    const orderCounts = new Map<string, number>();
    orderAllReports.forEach(r => {
        r.data.forEach((row: any) => {
            const orderId = row['No. Pesanan'];
            if (orderId) {
                orderCounts.set(orderId, (orderCounts.get(orderId) || 0) + 1);
            }
        });
    });

    const analysisMap = new Map<string, SkuAnalysisData>();

    orderAllReports.forEach(report => {
      report.data.forEach(row => {
        const sourceColumns = ['Nomor Referensi SKU', 'SKU Induk', 'Variasi', 'Kode Variasi'];
        let skuFinal = row['SKU Final'] || '';
        let masterItem: any = undefined;
        if (!skuFinal) {
            for (const col of sourceColumns) {
                const val = String(row[col] || '').trim();
                if (val && val !== '-' && val !== '0' && val.toLowerCase() !== 'nan') {
                    const found = skuMap.get(val.toLowerCase());
                    if (found) {
                        skuFinal = found.idProduk;
                        masterItem = found;
                        break;
                    }
                }
            }
        }
        
        if (!skuFinal || skuFinal === '-') return;

        const kuantitas = parseInt(String(row['Jumlah'] || '0'), 10) || 0;

        let profit = 0;
        const harga = masterItem ? masterItem.harga : (row['Harga'] || '0');
        const priceClean = String(harga).replace(/[^0-9]/g, '');
        const priceNumeric = parseFloat(priceClean) || 0;
        
        const hargaSetelahDiskonStr = row['Harga Setelah Diskon'] || '0';
        const hargaSetelahDiskonClean = String(hargaSetelahDiskonStr).replace(/\./g, '').replace(/,/g, '.'); 
        const hargaSetelahDiskon = parseFloat(hargaSetelahDiskonClean) || 0;

        if (!isNaN(hargaSetelahDiskon) && !isNaN(priceNumeric) && !isNaN(kuantitas)) {
            const grossProfit = (hargaSetelahDiskon - priceNumeric) * kuantitas;
            const orderId = row['No. Pesanan'];
            const rowCount = orderCounts.get(orderId) || 1;
            const voucherStr = row['Voucher Ditanggung Penjual'] || '0';
            const voucherClean = String(voucherStr).replace(/\./g, '').replace(/,/g, '.');
            const voucherTotal = parseFloat(voucherClean) || 0;
            const voucherRow = voucherTotal / rowCount;
            const txFeeTotal = 1250;
            const txFeeRow = txFeeTotal / rowCount;
            const revenueBase = (hargaSetelahDiskon * kuantitas) - voucherRow;
            const adminFee = Math.round(revenueBase * 0.0825);
            const freeShipFee = Math.round(revenueBase * 0.05);
            const promoFee = Math.round(revenueBase * 0.045);
            const premiFee = Math.round(revenueBase * 0.005);
            const totalFees = adminFee + freeShipFee + promoFee + premiFee + txFeeRow;
            profit = grossProfit - totalFees;
        }

        if (!analysisMap.has(skuFinal)) {
          analysisMap.set(skuFinal, {
            skuFinal: skuFinal,
            totalPesanan: 0,
            totalKuantitas: 0,
            estimasiProfit: 0,
          });
        }

        const current = analysisMap.get(skuFinal)!;
        current.totalKuantitas += kuantitas;
        current.estimasiProfit += profit;
      });
    });

    const uniqueOrderMap = new Map<string, Set<string>>();
    orderAllReports.forEach(report => {
        report.data.forEach(row => {
            const orderId = row['No. Pesanan'];
            if (!orderId) return;
            const sourceColumns = ['Nomor Referensi SKU', 'SKU Induk', 'Variasi', 'Kode Variasi'];
            let skuFinal = row['SKU Final'] || '';
            if (!skuFinal) {
                 for (const col of sourceColumns) {
                    const val = String(row[col] || '').trim();
                    if (val && val !== '-' && val !== '0' && val.toLowerCase() !== 'nan') {
                        const found = skuMap.get(val.toLowerCase());
                        if (found) {
                            skuFinal = found.idProduk;
                            break;
                        }
                    }
                }
            }
            if (skuFinal && skuFinal !== '-') {
                if (!uniqueOrderMap.has(skuFinal)) {
                    uniqueOrderMap.set(skuFinal, new Set());
                }
                uniqueOrderMap.get(skuFinal)!.add(orderId);
            }
        });
    });

    const finalData = Array.from(analysisMap.values());
    finalData.forEach(item => {
        item.totalPesanan = uniqueOrderMap.get(item.skuFinal)?.size || 0;
    });

    return finalData;
  }, [orderAllReports, skuMasterData]);

  const tabs = [
      { id: 'analisa-sku', label: 'Analisa SKU' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative pb-10">
      <h1 className="text-3xl font-black text-text-main tracking-tight">Analisa</h1>
      <p className="text-sm text-text-muted mt-1 font-medium">
        Halaman ini untuk menganalisa data penjualan.
      </p>

      <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
        <div className="border-b border-border p-3">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-brand text-brand-content shadow-lg shadow-brand/20' : 'text-text-muted hover:bg-app'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="p-4 md:p-6">
            {activeTab === 'analisa-sku' && (
                <SkuAnalysisTable data={skuAnalysisData} isLoading={isLoading} />
            )}
        </div>
      </div>
    </div>
  );
}
