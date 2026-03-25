
'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Search, Filter, TrendingDown } from 'lucide-react';
import { useData } from '../components/DataProvider';
import { DashboardTable } from '../components/DashboardTable';
import { FilterSection } from '../components/dashboard/FilterSection';
import { DateFilterSection } from '../components/dashboard/DateFilterSection';
import { DailyProfitSummary } from '../components/dashboard/DailyProfitSummary';
import { DATE_FILTER_COLUMNS, CLAIM_STATUS_OPTIONS } from '../lib/constants';

const normalizeToGlobalDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  
  // Try to match YYYY-MM-DD HH:MM or YYYY-MM-DD
  const yyyyMmDdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyyMmDdMatch) {
    return `${yyyyMmDdMatch[3]}/${yyyyMmDdMatch[2]}/${yyyyMmDdMatch[1]}`;
  }

  // Try to match DD/MM/YYYY
  const ddMmYyyyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddMmYyyyMatch) {
    return `${ddMmYyyyMatch[1]}/${ddMmYyyyMatch[2]}/${ddMmYyyyMatch[3]}`;
  }

  // Try to match DD-MM-YYYY
  const ddMmYyyyDashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (ddMmYyyyDashMatch) {
    return `${ddMmYyyyDashMatch[1]}/${ddMmYyyyDashMatch[2]}/${ddMmYyyyDashMatch[3]}`;
  }

  return str.split(' ')[0]; // Fallback
};

const matchesMonthFilter = (dateStr: string, selectedMonths: string[]) => {
  if (!selectedMonths || selectedMonths.length === 0) return true;
  
  const monthNamesId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  
  const mId = monthNamesId[m - 1].toLowerCase();
  const mEn = monthNamesEn[m - 1].toLowerCase();
  const mIdShort = mId.substring(0, 3);
  const mEnShort = mEn.substring(0, 3);
  const mNum = String(m).padStart(2, '0');

  return selectedMonths.some(f => {
    const fl = f.toLowerCase();
    const monthMatch = fl.includes(mId) || fl.includes(mEn) || fl.includes(mIdShort) || fl.includes(mEnShort) || fl.includes(mNum);
    const yearMatch = fl.includes(y);
    return monthMatch && yearMatch;
  });
};

// Helper to enrich data (copied from FinancePage for consistency)
const getEnrichedData = (reports: any[], skuMap: Map<string, any>, feeToggles: any) => {
  if (!reports) return [];
  // First pass: Count rows per Order ID to distribute fixed costs
  const orderCounts = new Map<string, number>();
  reports.forEach(r => {
    r.data.forEach((row: any) => {
      const orderId = row['No. Pesanan'];
      if (orderId) {
        orderCounts.set(orderId, (orderCounts.get(orderId) || 0) + 1);
      }
    });
  });

  return reports.flatMap(r => {
    const uploadTime = new Date(r.timestamp).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    return r.data.map((row: any, index: number) => {
      const {
        'Nama Toko': namaToko,
        'Jenis Laporan': jenisLaporan,
        'Type Laporan': typeLaporan,
        'Bulan Laporan': bulanLaporan,
        'HARGA SETELAH DISCOUNT (PCS)': _hsdp,
        'PROFIT (PCS)': _pp,
        'Harga Setelah Discount (Pcs)': _hsdp2,
        'Profit (Pcs)': _pp2,
        ...rest
      } = row;

      // SKU Logic
      const sourceColumns = ['Nomor Referensi SKU', 'SKU Induk', 'Variasi', 'Kode Variasi'];
      let masterItem: any = undefined;

      for (const col of sourceColumns) {
        const val = String(row[col] || '').trim();
        if (val && val !== '-' && val !== '0' && val.toLowerCase() !== 'nan') {
           const found = skuMap.get(val.toLowerCase());
           if (found) {
             masterItem = found;
             break;
           }
        }
      }

      let skuFinal = row['SKU Final'] || '';
      let harga = row['Harga'] || '';
      let idProduk = row['ID Produk'] || '';
      let total = row['Total'] || '';

      if (masterItem) {
         skuFinal = masterItem.idProduk;
         harga = masterItem.harga;
         idProduk = masterItem.idProduk;
      }

      let estimasiProfitStr = '0';
      let biayaLainnyaStr = '0';
      let revenueBaseStr = '0';
      let adminFeeStr = '0';
      let freeShipFeeStr = '0';
      let promoFeeStr = '0';
      let premiFeeStr = '0';
      let txFeeRowStr = '0';

      if (harga) {
        const priceClean = String(harga).replace(/[^0-9]/g, '');
        const priceNumeric = parseFloat(priceClean);
        const qtyStr = row['Jumlah'] || row['JUMLAH'] || '0';
        const qty = parseFloat(String(qtyStr));

        if (!isNaN(priceNumeric) && !isNaN(qty) && qty > 0) {
           total = (priceNumeric * qty).toLocaleString('id-ID');
        }

        // Calculate Estimasi Profit
        // Formula: (Harga Setelah Diskon - Harga) * Jumlah
        // Normalize "Harga Setelah Diskon": "82.500" (string with dot as thousand separator) -> 82500 (number)
        const hargaSetelahDiskonStr = row['Harga Setelah Diskon'] || row['HARGA SETELAH DISCOUNT'] || '0';
        const hargaSetelahDiskonClean = String(hargaSetelahDiskonStr).replace(/\./g, '').replace(/,/g, '.'); 
        const hargaSetelahDiskon = parseFloat(hargaSetelahDiskonClean) || 0;

        if (!isNaN(hargaSetelahDiskon) && !isNaN(priceNumeric) && !isNaN(qty)) {
            // Calculate Biaya Lainnya
            const orderId = row['No. Pesanan'];
            const rowCount = orderCounts.get(orderId) || 1;
            
            const voucherStr = row['Voucher Ditanggung Penjual'] || '0';
            const voucherClean = String(voucherStr).replace(/\./g, '').replace(/,/g, '.');
            const voucherTotal = Math.abs(parseFloat(voucherClean) || 0);
            const voucherRow = voucherTotal / rowCount;

            // Gross Profit calculation: (Revenue - Voucher) - COGS
            // Treating hargaSetelahDiskon as TOTAL revenue for the row based on user logic
            const grossProfit = (hargaSetelahDiskon - voucherRow) - (priceNumeric * qty);

            const txFeeTotal = 1250;
            const txFeeRow = txFeeTotal / rowCount;

            const revenueBase = hargaSetelahDiskon - voucherRow;
            revenueBaseStr = revenueBase.toLocaleString('id-ID', { maximumFractionDigits: 0 });
            
            // Calculate components with rounding or read from columns
            // If fees are present in the row, we assume they might be repeated per row (like vouchers) and divide by rowCount
            let adminFee = row['Admin Shopee 8.25%'] !== undefined 
              ? Math.abs(parseFloat(String(row['Admin Shopee 8.25%']).replace(/\./g, '').replace(/,/g, '.')) || 0) / rowCount 
              : Math.round(revenueBase * 0.0825);
            
            let freeShipFee = row['Gratis Ongkir Xtra 5%'] !== undefined 
              ? Math.abs(parseFloat(String(row['Gratis Ongkir Xtra 5%']).replace(/\./g, '').replace(/,/g, '.')) || 0) / rowCount 
              : Math.round(revenueBase * 0.05);
            
            let promoFee = row['Promo Xtra 4.5%'] !== undefined 
              ? Math.abs(parseFloat(String(row['Promo Xtra 4.5%']).replace(/\./g, '').replace(/,/g, '.')) || 0) / rowCount 
              : Math.round(revenueBase * 0.045);
            
            let premiFee = row['Biaya Premi 0.5%'] !== undefined 
              ? Math.abs(parseFloat(String(row['Biaya Premi 0.5%']).replace(/\./g, '').replace(/,/g, '.')) || 0) / rowCount 
              : Math.round(revenueBase * 0.005);
            
            let txFeeRowCalc = row['Biaya Per Transaksi Rp. 1,250'] !== undefined 
              ? Math.abs(parseFloat(String(row['Biaya Per Transaksi Rp. 1,250']).replace(/\./g, '').replace(/,/g, '.')) || 0) / rowCount 
              : txFeeRow;

            if (feeToggles) {
              if (!feeToggles.admin) adminFee = 0;
              if (!feeToggles.freeShip) freeShipFee = 0;
              if (!feeToggles.promo) promoFee = 0;
              if (!feeToggles.premi) premiFee = 0;
              if (!feeToggles.tx) txFeeRowCalc = 0;
            }
            
            adminFeeStr = adminFee.toLocaleString('id-ID');
            freeShipFeeStr = freeShipFee.toLocaleString('id-ID');
            promoFeeStr = promoFee.toLocaleString('id-ID');
            premiFeeStr = premiFee.toLocaleString('id-ID');
            txFeeRowStr = txFeeRowCalc.toLocaleString('id-ID', { maximumFractionDigits: 0 });

            const totalFees = adminFee + freeShipFee + promoFee + premiFee + txFeeRowCalc;

            biayaLainnyaStr = totalFees.toLocaleString('id-ID', { maximumFractionDigits: 0 });

            // New Estimasi Profit calculation: Gross Profit - Total Fees
            const netProfit = grossProfit - totalFees;
            estimasiProfitStr = netProfit.toLocaleString('id-ID', { maximumFractionDigits: 0 });
        }
      }

      // Robust Total Penghasilan calculation:
      // 1. If [Income] Total Penghasilan exists and is non-zero, use it.
      // 2. Otherwise, sum all columns starting with [Income] (excluding Total Penghasilan itself).
      let totalPenghasilan = 0;
      const rawTotalPenghasilan = row['[Income] Total Penghasilan'];
      let hasDirectTotal = false;

      if (rawTotalPenghasilan !== undefined && rawTotalPenghasilan !== null && rawTotalPenghasilan !== '') {
        const cleanVal = String(rawTotalPenghasilan).replace(/\./g, '').replace(/,/g, '.');
        const num = parseFloat(cleanVal);
        if (!isNaN(num) && num !== 0) {
          totalPenghasilan = num;
          hasDirectTotal = true;
        }
      }

      if (!hasDirectTotal) {
        Object.keys(row).forEach(key => {
          if (key.startsWith('[Income]') && key !== '[Income] Total Penghasilan') {
            const val = row[key];
            if (val !== undefined && val !== null && val !== '') {
              const strVal = String(val).trim();
              // Skip date-like strings (e.g. [Income] Tanggal Dana Dilepaskan)
              if ((strVal.includes('-') || strVal.includes('/')) && isNaN(Number(strVal.replace(/[-/]/g, '')))) {
                return;
              }
              const cleanVal = strVal.replace(/\./g, '').replace(/,/g, '.');
              const num = parseFloat(cleanVal);
              if (!isNaN(num)) {
                totalPenghasilan += num;
              }
            }
          }
        });
      }

      return {
        ...rest,
        'Global Date': normalizeToGlobalDate(row['Waktu Pesanan Dibuat']),
        'Nama Toko': String(namaToko || r.namaToko).toUpperCase(),
        'Total Penghasilan': totalPenghasilan.toLocaleString('id-ID'),
        '[Income] Total Penghasilan': totalPenghasilan,
        'Estimasi Profit': estimasiProfitStr,
        'Revenue Base': revenueBaseStr,
        'Admin Shopee 8.25%': adminFeeStr,
        'Gratis Ongkir Xtra 5%': freeShipFeeStr,
        'Promo Xtra 4.5%': promoFeeStr,
        'Biaya Premi 0.5%': premiFeeStr,
        'Biaya Per Transaksi Rp. 1,250': txFeeRowStr,
        'Biaya Lainnya': biayaLainnyaStr,
        'Type Laporan': typeLaporan || jenisLaporan || r.jenisLaporan,
        'Bulan Laporan': bulanLaporan || r.bulanLaporan,
        'Waktu Upload': uploadTime,
        'Nama File': r.fileName,
        'SKU Final': skuFinal,
        'Harga': harga,
        'Total': total,
        'ID Produk': idProduk,
        '_reportId': r.id,
        '_rowIndex': index,
        '_raw_timestamp': r.timestamp
      };
    });
  });
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('estimasi-profit');
  const [searchQuery, setSearchQuery] = useState('');
  const { orderAllReports, incomeReports, myBalanceReports, adwordsBillReports, skuMasterData, isLoading, updateReportRowStatus, updateBulkStatus } = useData();
  const [showFilters, setShowFilters] = useState(false);

  const [activeAdTab, setActiveAdTab] = useState('top-up-iklan');
  const [adSpendMode, setAdSpendMode] = useState<'top-up' | 'gmv-max'>('top-up');
  const [includeEstimasiLoss, setIncludeEstimasiLoss] = useState(true);
  const [includeBiayaIklan, setIncludeBiayaIklan] = useState(true);

  // -- FILTER STATES --
  const [filters, setFilters] = useState({
    status: [] as string[],
    toko: [] as string[],
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[],
    showCancelled: false,
  });

  const [hasInitializedOrderStatus, setHasInitializedOrderStatus] = useState(false);

  // -- DATE FILTER STATE --
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });

  const [feeToggles, setFeeToggles] = useState({
    admin: true,
    freeShip: true,
    promo: true,
    premi: false,
    tx: true,
  });

  const tabs = [
    { id: 'estimasi-profit', label: 'Estimasi Profit', icon: <BarChart3 size={16} />, color: 'text-brand' },
    { id: 'estimasi-loss', label: 'Estimasi Loss', icon: <TrendingDown size={16} />, color: 'text-red-500' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  // Process Data
  const skuMap = useMemo(() => {
    const map = new Map();
    skuMasterData.forEach(item => {
      if (item.sku1) map.set(item.sku1.toLowerCase().trim(), item);
      if (item.sku2) map.set(item.sku2.toLowerCase().trim(), item);
    });
    return map;
  }, [skuMasterData]);

  const enrichedOrderData = useMemo(() => {
    return getEnrichedData(orderAllReports, skuMap, feeToggles);
  }, [orderAllReports, skuMap, feeToggles]);

  const isiUlangSaldoData = useMemo(() => {
    if (!myBalanceReports) return [];
    let filtered = myBalanceReports.flatMap((report: any) => 
      report.data.map((row: any, index: number) => {
        if (!row) return null;
        return {
          'Tanggal Transaksi': row['Tanggal Transaksi'],
          'No. Pesanan': row['No. Pesanan'] || '-',
          'Nama Toko': String(row['Nama Toko'] || report.namaToko).toUpperCase(),
          'Type Laporan': row['Type Laporan'] || row['Jenis Laporan'] || report.typeLaporan || report.jenisLaporan || 'MyBalance',
          'Bulan Laporan': row['Bulan Laporan'] || report.bulanLaporan || '-',
          'Harga': row['Harga'] || '-',
          'Jumlah': row['Jumlah'],
          'Deskripsi': row['Deskripsi'],
          '_Global Date': normalizeToGlobalDate(row['Tanggal Transaksi']),
          '_reportId': report.id,
          '_rowIndex': index,
          '_raw_timestamp': report.timestamp
        };
      }).filter(Boolean)
    ).filter((row: any) => row && String(row['Deskripsi'] || '').includes('Isi Ulang Saldo Iklan/Koin Penjual'));

    if (filters.toko && filters.toko.length > 0) {
      filtered = filtered.filter((row: any) => filters.toko.includes(row['Nama Toko']));
    }

    if (filters.bulan && filters.bulan.length > 0) {
      filtered = filtered.filter((row: any) => filters.bulan.includes(row['Bulan Laporan']));
    }

    if (dateFilter.start || dateFilter.end) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      filtered = filtered.filter((item: any) => {
        let valToCheck = item['_Global Date'];
        if (!valToCheck) return false;
        
        const parts = String(valToCheck).split('/');
        if (parts.length !== 3) return false;
        
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        return Object.entries(item).some(([key, val]) =>
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    // Sort by 'Tanggal Transaksi' ascending (older first)
    return filtered.sort((a: any, b: any) => {
      const dateA = new Date(a['Tanggal Transaksi']);
      const dateB = new Date(b['Tanggal Transaksi']);
      return dateA.getTime() - dateB.getTime();
    });
  }, [myBalanceReports, filters.toko, filters.bulan, dateFilter, searchQuery]);

  const gmvMaxBudgetData = useMemo(() => {
    if (!adwordsBillReports) return [];
    let filtered = adwordsBillReports.flatMap((report: any) => 
      report.data.map((row: any, index: number) => {
        if (!row) return null;
        return {
          ...row,
          'Nama Toko': String(row['Nama Toko'] || report.namaToko).toUpperCase(),
          'Type Laporan': row['Type Laporan'] || row['Jenis Laporan'] || report.typeLaporan || report.jenisLaporan || 'Adwords',
          'Bulan Laporan': row['Bulan Laporan'] || report.bulanLaporan || '-',
          '_Global Date': normalizeToGlobalDate(row['Waktu']),
          '_reportId': report.id,
          '_rowIndex': index,
          '_raw_timestamp': report.timestamp
        };
      }).filter(Boolean)
    ).filter((row: any) => {
      if (!row) return false;
      const desc = String(row['Deskripsi'] || '');
      return desc === 'Deduction for Product Ad (Auto Bidding - GMV Max)' || 
             desc === 'ROAS Protection Free Ads Credit Rebate';
    });

    if (filters.toko && filters.toko.length > 0) {
      filtered = filtered.filter((row: any) => filters.toko.includes(row['Nama Toko']));
    }

    if (filters.bulan && filters.bulan.length > 0) {
      filtered = filtered.filter((row: any) => filters.bulan.includes(row['Bulan Laporan']));
    }

    if (dateFilter.start || dateFilter.end) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      filtered = filtered.filter((item: any) => {
        let valToCheck = item['_Global Date'];
        if (!valToCheck) return false;
        
        const parts = String(valToCheck).split('/');
        if (parts.length !== 3) return false;
        
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        return Object.entries(item).some(([key, val]) =>
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    // Sort by 'Waktu' ascending (older first)
    return filtered.sort((a: any, b: any) => {
      const dateA = new Date(a['Waktu']);
      const dateB = new Date(b['Waktu']);
      return dateA.getTime() - dateB.getTime();
    });
  }, [adwordsBillReports, filters.toko, filters.bulan, dateFilter, searchQuery]);

  const estimasiLossData = useMemo(() => {
    if (!myBalanceReports) return [];
    let filtered = myBalanceReports.flatMap((report: any) => 
      report.data.map((row: any, index: number) => {
        if (!row) return null;
        return {
          ...row,
          'Nama Toko': String(row['Nama Toko'] || report.namaToko).toUpperCase(),
          'Type Laporan': row['Type Laporan'] || row['Jenis Laporan'] || report.typeLaporan || report.jenisLaporan || 'MyBalance',
          'Bulan Laporan': row['Bulan Laporan'] || report.bulanLaporan || '-',
          '_reportId': report.id,
          '_rowIndex': index,
          '_raw_timestamp': report.timestamp
        };
      }).filter(Boolean)
    );

    if (filters.toko && filters.toko.length > 0) {
      filtered = filtered.filter((row: any) => filters.toko.includes(row['Nama Toko']));
    }

    if (filters.bulan && filters.bulan.length > 0) {
      filtered = filtered.filter((row: any) => filters.bulan.includes(row['Bulan Laporan']));
    }

    filtered = filtered.filter((row: any) => {
      // 1. Jumlah must be negative
      const jumlahStr = String(row['Jumlah'] || '0').replace(/\./g, '').replace(/,/g, '.');
      const jumlah = parseFloat(jumlahStr);
      if (isNaN(jumlah) || jumlah >= 0) return false;

      // 2. Deskripsi must not contain "Isi Ulang Saldo Iklan/Koin Penjual" or "Penarikan Dana"
      const deskripsi = String(row['Deskripsi'] || '');
      if (deskripsi.includes('Isi Ulang Saldo Iklan/Koin Penjual')) return false;
      if (deskripsi.includes('Penarikan Dana')) return false;

      return true;
    });

    let finalData = filtered.map((row: any) => {
      let noPesanan = String(row['No. Pesanan'] || '').trim();
      const deskripsi = String(row['Deskripsi'] || '');

      // 3. Logic for No. Pesanan
      if (noPesanan === '-') {
        const match = deskripsi.match(/Penyesuaian Saldo Penjual untuk biaya premi Pesanan yang Gagal Terkirim:\s*([A-Z0-9]+)/i);
        if (match && match[1]) {
          noPesanan = match[1];
        }
      }

      const tanggalTransaksi = row['Tanggal Transaksi'] || '';
      let formattedTanggal = tanggalTransaksi;
      
      // Format Tanggal Transaksi to DD MMM YYYY if it's YYYY-MM-DD HH:MM:SS
      const dateMatch = tanggalTransaksi.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const dateObj = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
        if (!isNaN(dateObj.getTime())) {
          formattedTanggal = dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }
      }

      return {
        'Tanggal Transaksi': formattedTanggal,
        'Nama Toko': row['Nama Toko'],
        'Type Laporan': row['Type Laporan'],
        'Tipe Transaksi': row['Tipe Transaksi'],
        'Deskripsi': deskripsi,
        'No. Pesanan': noPesanan,
        'Jenis Transaksi': row['Jenis Transaksi'],
        'Jumlah': row['Jumlah'],
        'Status': row['Status'],
        'Global Date': normalizeToGlobalDate(tanggalTransaksi),
        '_reportId': row._reportId,
        '_rowIndex': row._rowIndex,
        '_raw_timestamp': row._raw_timestamp
      };
    });

    if (dateFilter.start || dateFilter.end) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      finalData = finalData.filter((item: any) => {
        let valToCheck = item['Global Date'];
        if (!valToCheck) return false;
        
        const parts = String(valToCheck).split('/');
        if (parts.length !== 3) return false;
        
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      finalData = finalData.filter(item => {
        return Object.entries(item).some(([key, val]) =>
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    // Sort by 'Global Date' descending (newer first)
    return finalData.sort((a: any, b: any) => {
      const getTs = (item: any) => {
        const parts = String(item['Global Date']).split('/');
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        }
        return 0;
      };
      return getTs(b) - getTs(a);
    });
  }, [myBalanceReports, filters.toko, filters.bulan, dateFilter, searchQuery]);

  // Apply Filters
  const filteredData = useMemo(() => {
    let data = enrichedOrderData;

    // Standard Filters
    if (filters.toko && filters.toko.length > 0) data = data.filter(item => filters.toko.includes(item['Nama Toko']));
    if (filters.bulan && filters.bulan.length > 0) data = data.filter(item => filters.bulan.includes(item['Bulan Laporan']));

    // Status Filter
    if (filters.status && filters.status.length > 0) data = data.filter(item => filters.status.includes(item['Claim Status']));

    // Cancelled/Returned Filter
    if (!filters.showCancelled) {
      data = data.filter(item => !item['Status Pembatalan/ Pengembalian']);
    }

    // Order Status Filter
    if (filters.orderStatus && filters.orderStatus.length > 0) {
      data = data.filter(item => {
        let statusPesanan = item['Status Pesanan'];
        if (statusPesanan && statusPesanan.startsWith('Pesanan diterima, namun Pembeli masih dapat mengajukan pengembalian')) {
          statusPesanan = 'Pesanan diterima...';
        }
        return filters.orderStatus.includes(statusPesanan);
      });
    }

    // Date Filter
    if (dateFilter.start || dateFilter.end) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item['Global Date'];

        if (!valToCheck) return false;

        let d = new Date(NaN);
        if (typeof valToCheck === 'number') {
          d = new Date(valToCheck);
        } else {
          const dateStr = String(valToCheck).trim();
          const ddMmYyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (ddMmYyyyMatch) {
            const day = ddMmYyyyMatch[1].padStart(2, '0');
            const month = ddMmYyyyMatch[2].padStart(2, '0');
            const year = ddMmYyyyMatch[3];
            d = new Date(`${year}-${month}-${day}T00:00:00`);
          } else {
            d = new Date(dateStr);
          }
        }

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        if (!item) return false;
        return Object.entries(item).some(([key, val]) =>
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    return data;
  }, [enrichedOrderData, filters, dateFilter, searchQuery]);

  const dailyProfitData = useMemo(() => {
    const profitByDate = new Map<string, number>();
    const adSpendByDate = new Map<string, { deduction: number, rebate: number }>();
    const lossByDate = new Map<string, number>();

    // 1. Process Order All data (from filteredData to respect all filters)
    filteredData.forEach(row => {
      if (!row) return;
      const globalDate = row['Global Date'];
      if (globalDate) {
        const parts = globalDate.split('/');
        if (parts.length === 3) {
          const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          
          const profitStr = row['Estimasi Profit'] || '0';
          const profit = parseFloat(profitStr.replace(/[^0-9-]/g, '')) || 0;
          profitByDate.set(dateStr, (profitByDate.get(dateStr) || 0) + profit);
        }
      }
    });

    // 2. Process Biaya Iklan data (using already filtered data)
    const adSourceData = adSpendMode === 'top-up' ? isiUlangSaldoData : gmvMaxBudgetData;
    
    adSourceData.forEach((row: any) => {
      const waktu = row['Waktu'] || row['Tanggal Transaksi'];
      if (!waktu) return;

      const globalDate = normalizeToGlobalDate(waktu);
      const parts = globalDate.split('/');
      if (parts.length === 3) {
        const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        
        const spendStr = String(row['Jumlah'] || row['Biaya'] || row['Pengeluaran'] || '0');
        const spendVal = parseFloat(spendStr.replace(/[^0-9-]/g, '')) || 0;
        const currentAdSpend = adSpendByDate.get(dateStr) || { deduction: 0, rebate: 0 };

        if (adSpendMode === 'gmv-max') {
          const desc = String(row['Deskripsi'] || row['_Deskripsi'] || '');
          if (desc.includes('Deduction for Product Ad')) {
            currentAdSpend.deduction += Math.abs(spendVal);
          } else if (desc.includes('ROAS Protection Free Ads Credit Rebate')) {
            currentAdSpend.rebate += Math.abs(spendVal);
          }
        } else {
          // For top-up mode, only include "Isi Ulang Saldo Iklan"
          const desc = String(row['Deskripsi'] || row['_Deskripsi'] || '');
          if (desc.includes('Isi Ulang Saldo Iklan')) {
            currentAdSpend.deduction += Math.abs(spendVal);
          }
        }
        adSpendByDate.set(dateStr, currentAdSpend);
      }
    });

    // 3. Process Estimasi Loss data (using already filtered data)
    estimasiLossData.forEach(row => {
      const globalDate = row['Global Date'];
      if (globalDate) {
        const parts = globalDate.split('/');
        if (parts.length === 3) {
          const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          
          const jumlahStr = String(row['Jumlah'] || '0').replace(/\./g, '').replace(/,/g, '.');
          const jumlah = Math.abs(parseFloat(jumlahStr)) || 0;
          lossByDate.set(dateStr, (lossByDate.get(dateStr) || 0) + jumlah);
        }
      }
    });

    const allDates = new Set([...profitByDate.keys(), ...Array.from(adSpendByDate.keys()), ...Array.from(lossByDate.keys())]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Apply Date Filter if present (though filteredData already respects it, we do it for adSpend and loss)
    let finalDates = sortedDates;
    if (dateFilter.start || dateFilter.end) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;
      finalDates = finalDates.filter(d => {
        const ts = new Date(d).getTime();
        return ts >= startTs && ts <= endTs;
      });
    }

    return finalDates.map(date => {
      const estimasiProfit = profitByDate.get(date) || 0;
      const adSpend = adSpendByDate.get(date) || { deduction: 0, rebate: 0 };
      const estimasiLoss = lossByDate.get(date) || 0;
      
      const ppn = adSpendMode === 'gmv-max' ? adSpend.deduction * 0.11 : 0;
      const jumlahBiayaIklan = adSpendMode === 'gmv-max' 
        ? (adSpend.deduction + ppn) - adSpend.rebate 
        : adSpend.deduction;
        
      const estProfitBersih = estimasiProfit - (includeBiayaIklan ? jumlahBiayaIklan : 0) - (includeEstimasiLoss ? estimasiLoss : 0);
      return {
        tanggal: date,
        estimasiProfit,
        deduction: adSpend.deduction,
        rebate: adSpend.rebate,
        ppn,
        jumlahBiayaIklan,
        estimasiLoss,
        estProfitBersih
      };
    });

  }, [filteredData, isiUlangSaldoData, gmvMaxBudgetData, estimasiLossData, dateFilter, adSpendMode, includeEstimasiLoss, includeBiayaIklan]);

  // Extract Filter Options
  const filterOptions = useMemo(() => {
    const tokos = new Set<string>();
    const types = new Set<string>();
    const bulans = new Set<string>();
    const orderStatuses = new Set<string>();

    enrichedOrderData.forEach(row => {
      if (row['Nama Toko']) tokos.add(row['Nama Toko']);
      if (row['Type Laporan']) types.add(row['Type Laporan']);
      if (row['Bulan Laporan']) bulans.add(row['Bulan Laporan']);
      
      let statusPesanan = row['Status Pesanan'];
      if (statusPesanan) {
        if (statusPesanan.startsWith('Pesanan diterima, namun Pembeli masih dapat mengajukan pengembalian')) {
          statusPesanan = 'Pesanan diterima...';
        }
        orderStatuses.add(statusPesanan);
      }
    });

    // Also extract Nama Toko from other reports used in Dashboard
    if (myBalanceReports) {
      myBalanceReports.forEach((report: any) => {
        if (report.namaToko) tokos.add(report.namaToko);
        if (report.bulanLaporan) bulans.add(report.bulanLaporan);
        report.data.forEach((row: any) => {
          if (row['Nama Toko']) tokos.add(row['Nama Toko']);
          if (row['Bulan Laporan']) bulans.add(row['Bulan Laporan']);
        });
      });
    }

    if (adwordsBillReports) {
      adwordsBillReports.forEach((report: any) => {
        if (report.namaToko) tokos.add(report.namaToko);
        if (report.bulanLaporan) bulans.add(report.bulanLaporan);
        report.data.forEach((row: any) => {
          if (row['Nama Toko']) tokos.add(row['Nama Toko']);
          if (row['Bulan Laporan']) bulans.add(row['Bulan Laporan']);
        });
      });
    }

    return {
      toko: Array.from(tokos).sort(),
      type: Array.from(types).sort(),
      bulan: Array.from(bulans).sort(),
      orderStatus: Array.from(orderStatuses).sort(),
    };
  }, [enrichedOrderData, myBalanceReports, adwordsBillReports]);

  React.useEffect(() => {
    if (!hasInitializedOrderStatus && filterOptions.orderStatus.length > 0) {
      setFilters(prev => ({
        ...prev,
        orderStatus: filterOptions.orderStatus.filter(status => status !== 'Batal' && status !== 'Belum Bayar')
      }));
      setHasInitializedOrderStatus(true);
    }
  }, [filterOptions.orderStatus, hasInitializedOrderStatus]);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">DASHBOARD</h1>
          <p className="text-sm text-text-muted mt-1 font-medium flex items-center gap-2">
            <BarChart3 size={14} className="text-brand" />
            Ringkasan performa dan estimasi profit.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">

        {/* Tab Navigation */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-app/40 border-b border-border sticky top-0 z-30 backdrop-blur-md">

          {/* Tab Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-brand text-brand-content shadow-lg shadow-brand/20'
                      : 'bg-surface border border-border text-text-muted hover:border-brand/30 hover:text-text-main'}
                  `}
                >
                  <span className={isActive ? 'text-white' : tab.color}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
             <button
               onClick={() => setShowFilters(!showFilters)}
               className={`
                 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border h-[46px]
                 ${showFilters
                   ? 'bg-brand text-brand-content border-brand shadow-lg shadow-brand/20'
                   : 'bg-surface hover:bg-surface/80 text-text-muted hover:text-text-main border-border hover:border-brand/30'}
               `}
             >
               <Filter size={16} />
               <span className="hidden sm:inline">Filter</span>
             </button>

            {/* Search Bar */}
            <div className="relative w-full sm:max-w-xs group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand transition-colors">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder={`Cari data di ${currentTab.label}...`}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
             <FilterSection
               filters={filters}
               setFilters={setFilters}
               filterOptions={filterOptions}
               claimStatusOptions={CLAIM_STATUS_OPTIONS}
               feeToggles={feeToggles}
               setFeeToggles={setFeeToggles}
             />
             <DateFilterSection
               dateFilter={dateFilter}
               setDateFilter={setDateFilter}
             />
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-6 min-h-[500px]">
          {activeTab === 'estimasi-profit' ? (
            <>
              <h2 className="text-xl font-bold text-text-main tracking-tight mb-4">Order All</h2>
              <DashboardTable
                data={filteredData}
                isLoading={isLoading}
                searchQuery={searchQuery}
                isExporting={false}
                onExport={() => {}}
                onUpdateStatus={updateReportRowStatus}
                onBulkUpdateStatus={updateBulkStatus}
                tableId={activeTab}
              />
            </>
          ) : activeTab === 'estimasi-loss' ? (
            <>
              <h2 className="text-xl font-bold text-text-main tracking-tight mb-4">Estimasi Loss</h2>
              <DashboardTable
                data={estimasiLossData}
                isLoading={isLoading}
                searchQuery={searchQuery}
                isExporting={false}
                onExport={() => {}}
                onUpdateStatus={() => {}}
                onBulkUpdateStatus={() => {}}
                tableId={activeTab}
              />
            </>
          ) : null}
        </div>

      </section>

      {/* Biaya Iklan Section */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-bold text-text-main tracking-tight mb-4">Biaya Iklan</h2>
          
          <div className="flex gap-2 mb-4 border-b border-border">
            <button
              onClick={() => setActiveAdTab('top-up-iklan')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                activeAdTab === 'top-up-iklan' ? 'text-brand' : 'text-text-muted hover:text-text-main'
              }`}
            >
              Top Up Iklan
              {activeAdTab === 'top-up-iklan' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveAdTab('gmv-max-budget')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                activeAdTab === 'gmv-max-budget' ? 'text-brand' : 'text-text-muted hover:text-text-main'
              }`}
            >
              GMV Max Budget
              {activeAdTab === 'gmv-max-budget' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full" />
              )}
            </button>
          </div>

          <DashboardTable
            data={activeAdTab === 'top-up-iklan' ? isiUlangSaldoData : gmvMaxBudgetData}
            isLoading={isLoading}
            searchQuery={''}
            isExporting={false}
            onExport={() => {}}
            onUpdateStatus={() => {}}
            onBulkUpdateStatus={() => {}}
            tableId={activeAdTab === 'top-up-iklan' ? "isi-ulang-saldo" : "gmv-max-budget"}
          />
        </div>
      </section>

      {/* Daily Profit Summary */}
      {activeTab === 'estimasi-profit' && (
        <DailyProfitSummary 
          data={dailyProfitData} 
          isLoading={isLoading} 
          adSpendMode={adSpendMode}
          setAdSpendMode={setAdSpendMode}
          includeEstimasiLoss={includeEstimasiLoss}
          setIncludeEstimasiLoss={setIncludeEstimasiLoss}
          includeBiayaIklan={includeBiayaIklan}
          setIncludeBiayaIklan={setIncludeBiayaIklan}
        />
      )}
    </div>
  );
}
