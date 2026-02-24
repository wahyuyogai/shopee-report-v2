'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '../../components/DataProvider';
import { SkuAnalysisTable } from '../../components/analisa/SkuAnalysisTable';
import { CustomerAnalysisTable } from '../../components/analisa/CustomerAnalysisTable';
import { DateFilterSection } from '../../components/dashboard/DateFilterSection';
import { DATE_FILTER_COLUMNS } from '../../lib/constants';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// Define the structure for our aggregated data
interface SkuAnalysisData {
  skuFinal: string;
  totalPesanan: number;
  totalKuantitas: number;
  totalBelanja: number;
  estimasiProfit: number;
  rataRataBelanja: number;
  rataRataProfit: number;
}

interface CustomerAnalysisData {
  namaPembeli: string;
  totalPesanan: number;
  totalKuantitas: number;
  totalBelanja: number;
  estimasiProfit: number;
  rataRataBelanja: number;
  rataRataProfit: number;
}

export default function AnalisaPage() {
  const [activeTab, setActiveTab] = useState('analisa-sku');
  const { orderAllReports, skuMasterData, isLoading } = useData();
  const [dateFilter, setDateFilter] = useState({
    column: 'Waktu Pesanan Dibuat',
    start: '',
    end: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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
            totalBelanja: 0,
            estimasiProfit: 0,
            rataRataBelanja: 0,
            rataRataProfit: 0,
          });
        }

        const current = analysisMap.get(skuFinal)!;
        current.totalKuantitas += kuantitas;
        current.estimasiProfit += profit;
        current.totalBelanja += parseFloat(String(row['Total Harga Jual'] || '0').replace(/[^0-9-]/g, '')) || 0;
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
        if (item.totalPesanan > 0) {
            item.rataRataBelanja = item.totalBelanja / item.totalPesanan;
            item.rataRataProfit = item.estimasiProfit / item.totalPesanan;
        }
    });

    return finalData;
  }, [filteredReports, skuMasterData]);

  const searchedSkuAnalysisData = useMemo(() => {
    if (!searchQuery) return skuAnalysisData;
    const query = searchQuery.toLowerCase();
    return skuAnalysisData.filter(item => 
      item.skuFinal.toLowerCase().includes(query)
    );
  }, [skuAnalysisData, searchQuery]);

  const filteredReports = useMemo(() => {
    if (!dateFilter.start && !dateFilter.end) {
      return orderAllReports;
    }
    const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
    const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

    return orderAllReports.map(report => {
      const filteredData = report.data.filter(row => {
        const valToCheck = row[dateFilter.column];
        if (!valToCheck) return false;
        const rowTs = new Date(valToCheck).getTime();
        return rowTs >= startTs && rowTs <= endTs;
      });
      return { ...report, data: filteredData };
    }).filter(report => report.data.length > 0);
  }, [orderAllReports, dateFilter]);

  const customerAnalysisData = useMemo(() => {
    const analysisMap = new Map<string, CustomerAnalysisData>();

    orderAllReports.forEach(report => {
      report.data.forEach(row => {
        const namaPembeli = row['Nama Pembeli'];
        if (!namaPembeli || namaPembeli === '-') return;

        const kuantitas = parseInt(String(row['Jumlah'] || '0'), 10) || 0;
        const totalBelanja = parseFloat(String(row['Total Harga Jual'] || '0').replace(/[^0-9-]/g, '')) || 0;
        const profit = parseFloat(String(row['Estimasi Profit'] || '0').replace(/[^0-9-]/g, '')) || 0;

        if (!analysisMap.has(namaPembeli)) {
          analysisMap.set(namaPembeli, {
            namaPembeli: namaPembeli,
            totalPesanan: 0,
            totalKuantitas: 0,
            totalBelanja: 0,
            estimasiProfit: 0,
            rataRataBelanja: 0,
            rataRataProfit: 0,
          });
        }

        const current = analysisMap.get(namaPembeli)!;
        current.totalKuantitas += kuantitas;
        current.totalBelanja += totalBelanja;
        current.estimasiProfit += profit;
      });
    });

    const uniqueOrderMap = new Map<string, Set<string>>();
    orderAllReports.forEach(report => {
        report.data.forEach(row => {
            const orderId = row['No. Pesanan'];
            const namaPembeli = row['Nama Pembeli'];
            if (orderId && namaPembeli && namaPembeli !== '-') {
                if (!uniqueOrderMap.has(namaPembeli)) {
                    uniqueOrderMap.set(namaPembeli, new Set());
                }
                uniqueOrderMap.get(namaPembeli)!.add(orderId);
            }
        });
    });

    const finalData = Array.from(analysisMap.values());
    finalData.forEach(item => {
        item.totalPesanan = uniqueOrderMap.get(item.namaPembeli)?.size || 0;
        if (item.totalPesanan > 0) {
            item.rataRataBelanja = item.totalBelanja / item.totalPesanan;
            item.rataRataProfit = item.estimasiProfit / item.totalPesanan;
        }
    });

    return finalData;
  }, [filteredReports]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const dataToExport = activeTab === 'analisa-sku' ? searchedSkuAnalysisData : searchedCustomerAnalysisData;
        if (dataToExport.length === 0) {
          // Ideally, you'd show a toast notification here
          console.warn('No data to export.');
          return;
        }
        const fileName = `Analisa-${activeTab}-${new Date().toISOString().split('T')[0]}.xlsx`;
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, fileName);
      } catch (error) {
        console.error("Export failed", error);
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  const searchedCustomerAnalysisData = useMemo(() => {
    if (!searchQuery) return customerAnalysisData;
    const query = searchQuery.toLowerCase();
    return customerAnalysisData.filter(item => 
      item.namaPembeli.toLowerCase().includes(query)
    );
  }, [customerAnalysisData, searchQuery]);

  const tabs = [
      { id: 'analisa-sku', label: 'Analisa SKU' },
      { id: 'analisa-customer', label: 'Analisa Customer' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative pb-10">
      <h1 className="text-3xl font-black text-text-main tracking-tight">Analisa</h1>
      <p className="text-sm text-text-muted mt-1 font-medium">
        Halaman ini untuk menganalisa data penjualan.
      </p>

      <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
        <DateFilterSection 
          dateFilter={dateFilter} 
          setDateFilter={setDateFilter} 
          dateFilterColumns={DATE_FILTER_COLUMNS.filter(c => c.value === 'Waktu Pesanan Dibuat')} 
        />
        <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
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
            <div className="relative w-full max-w-xs group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand transition-colors">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    placeholder={`Cari ${activeTab === 'analisa-sku' ? 'SKU' : 'Customer'}...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand text-brand-content rounded-xl text-sm font-bold transition-all hover:bg-brand/90 disabled:bg-brand/50 disabled:cursor-not-allowed"
            >
                <Download size={16} />
                <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
            </button>
        </div>

        <div className="p-4 md:p-6">
            {activeTab === 'analisa-sku' && (
                <SkuAnalysisTable data={searchedSkuAnalysisData} isLoading={isLoading} />
            )}
            {activeTab === 'analisa-customer' && (
                <CustomerAnalysisTable data={searchedCustomerAnalysisData} isLoading={isLoading} />
            )}
        </div>
      </div>
    </div>
  );
}
