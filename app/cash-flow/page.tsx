
'use client';

import React, { useState, useMemo } from 'react';
import { Banknote, Search, Filter, DollarSign, FileText, TrendingUp, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useData } from '../../components/DataProvider';
import { DashboardTable } from '../../components/DashboardTable';
import { FilterSection } from '../../components/dashboard/FilterSection';
import { DateFilterSection } from '../../components/dashboard/DateFilterSection';
import { DATE_FILTER_COLUMNS, CLAIM_STATUS_OPTIONS } from '../../lib/constants';

// Helper to flatten reports (copied from finance/page.tsx)
const getEnrichedData = (reports: any[], skuMap: Map<string, any>) => {
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

      // SKU Logic (Similar to useDashboardData)
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
      
      // Extract Order ID from Description if missing (Specific for MyBalance premiums)
      let noPesanan = row['No. Pesanan'] || '';
      if (!noPesanan || noPesanan === '-') {
        const deskripsi = String(row['Deskripsi'] || '');
        // Pattern: "Penyesuaian Saldo Penjual untuk biaya premi Pesanan yang Gagal Terkirim: 260310R1GF4N2F"
        const match = deskripsi.match(/Penyesuaian Saldo Penjual untuk biaya premi Pesanan yang Gagal Terkirim:\s*([A-Z0-9]+)/i);
        if (match && match[1]) {
          noPesanan = match[1];
        }
      }
      
      if (harga) {
        const priceClean = String(harga).replace(/[^0-9]/g, '');
        const priceNumeric = parseFloat(priceClean);
        const qtyStr = row['Jumlah'] || row['JUMLAH'] || '0';
        const qty = parseFloat(String(qtyStr)) || 1;

        if (!isNaN(priceNumeric) && !isNaN(qty) && qty > 0) {
           total = (priceNumeric * qty).toLocaleString('id-ID');
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
        'No. Pesanan': noPesanan,
        'Nama Toko': String(namaToko || r.namaToko).toUpperCase(),
        'Total Penghasilan': totalPenghasilan.toLocaleString('id-ID'),
        '[Income] Total Penghasilan': totalPenghasilan,
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

export default function CashFlowPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryOrderAll, setSearchQueryOrderAll] = useState('');
  const [searchQueryIncome, setSearchQueryIncome] = useState('');
  const [searchQueryReturn, setSearchQueryReturn] = useState('');
  const { orderAllReports, incomeReports, failedDeliveryReports, returnRefundReports, cancelledReports, myBalanceReports, skuMasterData, isLoading, updateReportRowStatus, updateBulkStatus } = useData();
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltersOrderAll, setShowFiltersOrderAll] = useState(false);
  const [showFiltersIncome, setShowFiltersIncome] = useState(false);
  const [showFiltersReturn, setShowFiltersReturn] = useState(false);
  
  // -- FILTER STATES --
  const [filters, setFilters] = useState({
    status: [] as string[], 
    toko: [] as string[],
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[],
    showCancelled: false,
    showIsiUlang: false,
    showPenarikan: false
  });

  const [filtersOrderAll, setFiltersOrderAll] = useState({
    status: [] as string[], 
    toko: [] as string[],
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[],
    showCancelled: true,
    showIsiUlang: false,
    showPenarikan: false,
    resiFilter: 'dengan',
    showInMyBalance: true,
    showInIncome: true,
    showInReturn: false,
    showInNone: false
  });

  const [filtersIncome, setFiltersIncome] = useState({
    status: [] as string[], 
    toko: [] as string[],
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[],
    showCancelled: false,
    showIsiUlang: false,
    showPenarikan: false
  });

  const [filtersReturn, setFiltersReturn] = useState({
    status: [] as string[], 
    toko: [] as string[],
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[],
    showCancelled: true,
    showIsiUlang: false,
    showPenarikan: false
  });

  // -- DATE FILTER STATE --
  const [dateFilter, setDateFilter] = useState({
    column: '',
    start: '',
    end: ''
  });

  const [dateFilterOrderAll, setDateFilterOrderAll] = useState({
    column: '',
    start: '',
    end: ''
  });

  const [dateFilterIncome, setDateFilterIncome] = useState({
    column: '',
    start: '',
    end: ''
  });

  const [dateFilterReturn, setDateFilterReturn] = useState({
    column: '',
    start: '',
    end: ''
  });

  // -- COLLAPSE STATES (Default: Closed) --
  const [isExpandedMyBalance, setIsExpandedMyBalance] = useState(false);
  const [isExpandedOrderAll, setIsExpandedOrderAll] = useState(true);
  const [isExpandedIncome, setIsExpandedIncome] = useState(false);
  const [isExpandedReturn, setIsExpandedReturn] = useState(false);

  // Process Data
  const skuMap = useMemo(() => {
    const map = new Map();
    skuMasterData.forEach(item => {
      if (item.sku1) map.set(item.sku1.toLowerCase().trim(), item);
      if (item.sku2) map.set(item.sku2.toLowerCase().trim(), item);
    });
    return map;
  }, [skuMasterData]);

  const rawData = useMemo(() => {
    return getEnrichedData(myBalanceReports, skuMap);
  }, [myBalanceReports, skuMap]);

  const rawDataIncome = useMemo(() => {
    return getEnrichedData(incomeReports, skuMap);
  }, [incomeReports, skuMap]);

  const rawDataOrderAll = useMemo(() => {
    const orderAll = getEnrichedData(orderAllReports, skuMap);
    
    // Calculate Total COGS per Order ID
    const totalCogsMap = new Map<string, number>();
    orderAll.forEach(row => {
      const orderId = String(row['No. Pesanan'] || '').trim();
      if (orderId && orderId !== '-') {
        const hargaStr = String(row['Harga'] || '0').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const harga = parseFloat(hargaStr) || 0;
        const qtyStr = String(row['Jumlah'] || '0').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const qty = parseFloat(qtyStr) || 0;
        const rowCogs = harga * qty;
        totalCogsMap.set(orderId, (totalCogsMap.get(orderId) || 0) + rowCogs);
      }
    });

    // Build Income Map for quick lookup
    const incomeMap = new Map();
    rawDataIncome.forEach(row => {
      const orderId = String(row['No. Pesanan'] || '').trim();
      if (orderId && orderId !== '-') {
        incomeMap.set(orderId, row);
      }
    });

    // Merge Income Data into Order All (Option A: Repeat for all rows)
    return orderAll.map(row => {
      const orderId = String(row['No. Pesanan'] || '').trim();
      const incomeRow = incomeMap.get(orderId);
      
      if (incomeRow) {
        const totalPenghasilanStr = String(incomeRow['Total Penghasilan'] || '0').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const totalPenghasilan = parseFloat(totalPenghasilanStr) || 0;
        const totalCogs = totalCogsMap.get(orderId) || 0;
        const profit = totalPenghasilan - totalCogs;

        return {
          ...row,
          'Profit': profit.toLocaleString('id-ID', { maximumFractionDigits: 0 }),
          '[Income] Total Penghasilan': incomeRow['Total Penghasilan'],
          '[Income] Biaya Administrasi': incomeRow['Biaya Administrasi'],
          '[Income] Biaya Layanan': incomeRow['Biaya Layanan'],
          '[Income] Biaya Transaksi': incomeRow['Biaya Transaksi'],
          '[Income] Biaya Kampanye': incomeRow['Biaya Kampanye'],
          '[Income] Ongkir Diteruskan': incomeRow['Ongkir yang Diteruskan oleh Shopee ke Jasa Kirim'],
          '[Income] Biaya Komisi AMS': incomeRow['Biaya Komisi AMS'],
          '[Income] Biaya Proses Pesanan': incomeRow['Biaya Proses Pesanan'],
          '[Income] Premi': incomeRow['Premi'],
          '[Income] Biaya Hemat Kirim': incomeRow['Biaya Program Hemat Biaya Kirim'],
          '[Income] Bea Masuk/PPN/PPh': incomeRow['Bea Masuk, PPN & PPh'],
          '[Income] Isi Saldo Otomatis': incomeRow['Biaya Isi Saldo Otomatis (dari Penghasilan)'],
          '[Income] Total Diskon Produk': incomeRow['Total Diskon Produk'],
          '[Income] Harga Asli Produk': incomeRow['Harga Asli Produk'],
          '[Income] Pengembalian Dana': incomeRow['Jumlah Pengembalian Dana ke Pembeli'],
          '[Income] Voucher Penjual': incomeRow['Voucher disponsor oleh Penjual'],
          '[Income] Cashback Koin Penjual': incomeRow['Cashback Koin disponsori Penjual'],
          '[Income] Ongkir Dibayar Pembeli': incomeRow['Ongkir Dibayar Pembeli'],
          '[Income] Diskon Ongkir Jasa Kirim': incomeRow['Diskon Ongkir Ditanggung Jasa Kirim'],
          '[Income] Gratis Ongkir Shopee': incomeRow['Gratis Ongkir dari Shopee'],
          '[Income] Promo Gratis Ongkir Penjual': incomeRow['Promo Gratis Ongkir dari Penjual'],
          '[Income] Tanggal Dana Dilepaskan': incomeRow['Tanggal Dana Dilepaskan']
        };
      }
      return row;
    });
  }, [orderAllReports, skuMap, rawDataIncome]);

  const rawDataReturn = useMemo(() => {
    const failedRows = getEnrichedData(failedDeliveryReports, skuMap);
    const returnRows = getEnrichedData(returnRefundReports, skuMap);
    const cancelledRows = getEnrichedData(cancelledReports || [], skuMap);
    const allRows = [...failedRows, ...returnRows, ...cancelledRows];

    return allRows.map(row => {
      let newRow = { ...row };
      const updatedCols: string[] = [];
      const isValid = (val: any) => val && typeof val === 'string' && val.trim() !== '-' && val.trim() !== '';

      const resiTerusan = row['No. Resi Pengiriman Terusan'];
      if (isValid(resiTerusan)) {
        newRow['No. Resi'] = resiTerusan;
        updatedCols.push('No. Resi');
      }

      const tanggalPesanan = row['Tanggal Pesanan Dibuat'];
      if (isValid(tanggalPesanan)) {
        newRow['Waktu Pesanan Dibuat'] = tanggalPesanan; 
        updatedCols.push('Waktu Pesanan Dibuat');
      }

      const variasi = row['Variasi'];
      if (isValid(variasi)) {
        newRow['Nama Variasi'] = variasi;
        updatedCols.push('Nama Variasi');
      }

      const qtyReturn = row['Jumlah Produk Dikembalikan'];
      if (qtyReturn !== undefined && qtyReturn !== null && String(qtyReturn).trim() !== '-' && String(qtyReturn).trim() !== '') {
        newRow['Jumlah'] = qtyReturn;
        updatedCols.push('Jumlah');
        
        const harga = newRow['Harga'];
        if (harga) {
          const priceClean = String(harga).replace(/[^0-9]/g, '');
          const priceNumeric = parseFloat(priceClean);
          const newQty = parseFloat(String(qtyReturn));
          
          if (!isNaN(priceNumeric) && !isNaN(newQty) && newQty > 0) {
             newRow['Total'] = (priceNumeric * newQty).toLocaleString('id-ID');
          }
        }
      }

      const kodeVariasi = row['Kode Variasi'];
      if (isValid(kodeVariasi)) {
        newRow['Nomor Referensi SKU'] = kodeVariasi;
        updatedCols.push('Nomor Referensi SKU');
      }

      newRow['_updatedCols'] = updatedCols;
      return newRow;
    });
  }, [failedDeliveryReports, returnRefundReports, cancelledReports, skuMap]);

  const orderIdSets = useMemo(() => {
    return {
      myBalance: new Set(rawData.map(item => String(item['No. Pesanan'] || '').trim()).filter(id => id && id !== '-')),
      income: new Set(rawDataIncome.map(item => String(item['No. Pesanan'] || '').trim()).filter(id => id && id !== '-')),
      return: new Set(rawDataReturn.map(item => String(item['No. Pesanan'] || '').trim()).filter(id => id && id !== '-'))
    };
  }, [rawData, rawDataIncome, rawDataReturn]);

  // Apply Filters
  const filteredData = useMemo(() => {
    let data = rawData;

    // Standard Filters
    if (filters.toko && filters.toko.length > 0) data = data.filter(item => filters.toko.includes(item['Nama Toko']));
    if (filters.bulan && filters.bulan.length > 0) data = data.filter(item => filters.bulan.includes(item['Bulan Laporan']));
    
    // Status Filter
    if (filters.status && filters.status.length > 0) data = data.filter(item => filters.status.includes(item['Claim Status']));

    // Show Cancelled Filter
    if (!filters.showCancelled) {
      data = data.filter(item => {
        const status = String(item['Status Pesanan'] || '').toLowerCase();
        return !status.includes('batal') && !status.includes('pengembalian');
      });
    }

    // Show specific descriptions (Default is OFF, so if false we hide them)
    if (!filters.showIsiUlang) {
      data = data.filter(item => !String(item['Deskripsi'] || '').includes('Isi Ulang Saldo Iklan/Koin Penjual'));
    }
    if (!filters.showPenarikan) {
      data = data.filter(item => !String(item['Deskripsi'] || '').includes('Penarikan Dana'));
    }

    // Date Filter
    if (dateFilter.column && (dateFilter.start || dateFilter.end)) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item[dateFilter.column];
        if (dateFilter.column === 'Waktu Upload') valToCheck = item['_raw_timestamp'];
        
        if (!valToCheck) return false;
        
        let d = new Date(NaN);
        if (typeof valToCheck === 'number') {
          d = new Date(valToCheck);
        } else {
          const dateStr = String(valToCheck).trim();
          
          // Try DD/MM/YYYY or D/M/YYYY
          const ddMmYyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (ddMmYyyyMatch) {
            const day = ddMmYyyyMatch[1].padStart(2, '0');
            const month = ddMmYyyyMatch[2].padStart(2, '0');
            const year = ddMmYyyyMatch[3];
            d = new Date(`${year}-${month}-${day}T00:00:00`);
          } else {
            // Try DD-MM-YYYY
            const ddMmYyyyDashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
            if (ddMmYyyyDashMatch) {
              const day = ddMmYyyyDashMatch[1].padStart(2, '0');
              const month = ddMmYyyyDashMatch[2].padStart(2, '0');
              const year = ddMmYyyyDashMatch[3];
              d = new Date(`${year}-${month}-${day}T00:00:00`);
            } else {
              // Fallback to standard parsing
              d = new Date(dateStr);
            }
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
        return Object.entries(item).some(([key, val]) => 
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    return data;
  }, [rawData, filters, dateFilter, searchQuery]);

  const filteredDataOrderAll = useMemo(() => {
    let data = rawDataOrderAll;

    // Standard Filters
    if (filtersOrderAll.toko && filtersOrderAll.toko.length > 0) data = data.filter(item => filtersOrderAll.toko.includes(item['Nama Toko']));
    if (filtersOrderAll.bulan && filtersOrderAll.bulan.length > 0) data = data.filter(item => filtersOrderAll.bulan.includes(item['Bulan Laporan']));
    
    // Status Filter
    if (filtersOrderAll.status && filtersOrderAll.status.length > 0) data = data.filter(item => filtersOrderAll.status.includes(item['Claim Status']));

    // No. Resi Filter
    if (filtersOrderAll.resiFilter === 'dengan') {
      data = data.filter(item => {
        const resi = String(item['No. Resi'] || '').trim();
        return resi !== '' && resi !== '-';
      });
    } else if (filtersOrderAll.resiFilter === 'tanpa') {
      data = data.filter(item => {
        const resi = String(item['No. Resi'] || '').trim();
        return resi === '' || resi === '-';
      });
    }

    // Cross-check Filters (Intersection/AND Logic)
    data = data.filter(item => {
      const orderId = String(item['No. Pesanan'] || '').trim();
      const inMyBalance = orderIdSets.myBalance.has(orderId);
      const inIncome = orderIdSets.income.has(orderId);
      const inReturn = orderIdSets.return.has(orderId);
      const inNone = !inMyBalance && !inIncome && !inReturn;

      // If a filter is ON, the row MUST satisfy that condition
      if (filtersOrderAll.showInMyBalance && !inMyBalance) return false;
      if (filtersOrderAll.showInIncome && !inIncome) return false;
      if (filtersOrderAll.showInReturn && !inReturn) return false;
      if (filtersOrderAll.showInNone && !inNone) return false;
      
      return true;
    });

    // Show Cancelled Filter
    if (!filtersOrderAll.showCancelled) {
      data = data.filter(item => {
        const status = String(item['Status Pesanan'] || '').toLowerCase();
        return !status.includes('batal') && !status.includes('pengembalian');
      });
    }

    // Date Filter
    if (dateFilterOrderAll.column && (dateFilterOrderAll.start || dateFilterOrderAll.end)) {
      const startTs = dateFilterOrderAll.start ? new Date(dateFilterOrderAll.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilterOrderAll.end ? new Date(dateFilterOrderAll.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item[dateFilterOrderAll.column];
        if (dateFilterOrderAll.column === 'Waktu Upload') valToCheck = item['_raw_timestamp'];
        
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
            const ddMmYyyyDashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
            if (ddMmYyyyDashMatch) {
              const day = ddMmYyyyDashMatch[1].padStart(2, '0');
              const month = ddMmYyyyDashMatch[2].padStart(2, '0');
              const year = ddMmYyyyDashMatch[3];
              d = new Date(`${year}-${month}-${day}T00:00:00`);
            } else {
              d = new Date(dateStr);
            }
          }
        }

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQueryOrderAll) {
      const query = searchQueryOrderAll.toLowerCase();
      data = data.filter(item => {
        return Object.entries(item).some(([key, val]) => 
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    return data;
  }, [rawDataOrderAll, filtersOrderAll, dateFilterOrderAll, searchQueryOrderAll]);

  const filteredDataIncome = useMemo(() => {
    let data = rawDataIncome;

    // Standard Filters
    if (filtersIncome.toko && filtersIncome.toko.length > 0) data = data.filter(item => filtersIncome.toko.includes(item['Nama Toko']));
    if (filtersIncome.bulan && filtersIncome.bulan.length > 0) data = data.filter(item => filtersIncome.bulan.includes(item['Bulan Laporan']));
    
    // Status Filter
    if (filtersIncome.status && filtersIncome.status.length > 0) data = data.filter(item => filtersIncome.status.includes(item['Claim Status']));

    // Show Cancelled Filter
    if (!filtersIncome.showCancelled) {
      data = data.filter(item => {
        const status = String(item['Status Pesanan'] || '').toLowerCase();
        return !status.includes('batal') && !status.includes('pengembalian');
      });
    }

    // Date Filter
    if (dateFilterIncome.column && (dateFilterIncome.start || dateFilterIncome.end)) {
      const startTs = dateFilterIncome.start ? new Date(dateFilterIncome.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilterIncome.end ? new Date(dateFilterIncome.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item[dateFilterIncome.column];
        if (dateFilterIncome.column === 'Waktu Upload') valToCheck = item['_raw_timestamp'];
        
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
            const ddMmYyyyDashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
            if (ddMmYyyyDashMatch) {
              const day = ddMmYyyyDashMatch[1].padStart(2, '0');
              const month = ddMmYyyyDashMatch[2].padStart(2, '0');
              const year = ddMmYyyyDashMatch[3];
              d = new Date(`${year}-${month}-${day}T00:00:00`);
            } else {
              d = new Date(dateStr);
            }
          }
        }

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQueryIncome) {
      const query = searchQueryIncome.toLowerCase();
      data = data.filter(item => {
        return Object.entries(item).some(([key, val]) => 
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    return data;
  }, [rawDataIncome, filtersIncome, dateFilterIncome, searchQueryIncome]);

  const filteredDataReturn = useMemo(() => {
    let data = rawDataReturn;

    // Standard Filters
    if (filtersReturn.toko && filtersReturn.toko.length > 0) data = data.filter(item => filtersReturn.toko.includes(item['Nama Toko']));
    if (filtersReturn.bulan && filtersReturn.bulan.length > 0) data = data.filter(item => filtersReturn.bulan.includes(item['Bulan Laporan']));
    
    // Status Filter
    if (filtersReturn.status && filtersReturn.status.length > 0) data = data.filter(item => filtersReturn.status.includes(item['Claim Status']));

    // Date Filter
    if (dateFilterReturn.column && (dateFilterReturn.start || dateFilterReturn.end)) {
      const startTs = dateFilterReturn.start ? new Date(dateFilterReturn.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilterReturn.end ? new Date(dateFilterReturn.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item[dateFilterReturn.column];
        if (dateFilterReturn.column === 'Waktu Upload') valToCheck = item['_raw_timestamp'];
        
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
            const ddMmYyyyDashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
            if (ddMmYyyyDashMatch) {
              const day = ddMmYyyyDashMatch[1].padStart(2, '0');
              const month = ddMmYyyyDashMatch[2].padStart(2, '0');
              const year = ddMmYyyyDashMatch[3];
              d = new Date(`${year}-${month}-${day}T00:00:00`);
            } else {
              d = new Date(dateStr);
            }
          }
        }

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    // Search Query
    if (searchQueryReturn) {
      const query = searchQueryReturn.toLowerCase();
      data = data.filter(item => {
        return Object.entries(item).some(([key, val]) => 
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    return data;
  }, [rawDataReturn, filtersReturn, dateFilterReturn, searchQueryReturn]);

  // Extract Filter Options
  const filterOptions = useMemo(() => {
    const tokos = new Set<string>();
    const types = new Set<string>();
    const bulans = new Set<string>();

    const combined = [...rawData, ...rawDataOrderAll, ...rawDataIncome, ...rawDataReturn];
    combined.forEach(row => {
      if (row['Nama Toko']) tokos.add(row['Nama Toko']);
      if (row['Type Laporan']) types.add(row['Type Laporan']);
      if (row['Bulan Laporan']) bulans.add(row['Bulan Laporan']);
    });

    return {
      toko: Array.from(tokos).sort(),
      type: Array.from(types).sort(),
      bulan: Array.from(bulans).sort(),
      orderStatus: [] as string[]
    };
  }, [rawData, rawDataOrderAll, rawDataIncome, rawDataReturn]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand/10 p-2 rounded-lg text-brand">
            <Banknote size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-main">Cash Flow</h1>
            <p className="text-text-muted">Manajemen arus kas toko Anda (Data MyBalance)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const allExpanded = isExpandedMyBalance && isExpandedOrderAll && isExpandedIncome && isExpandedReturn;
              const newState = !allExpanded;
              setIsExpandedMyBalance(newState);
              setIsExpandedOrderAll(newState);
              setIsExpandedIncome(newState);
              setIsExpandedReturn(newState);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-brand/50 rounded-xl text-xs font-bold text-text-muted hover:text-brand transition-all shadow-sm"
          >
            {isExpandedMyBalance && isExpandedOrderAll && isExpandedIncome && isExpandedReturn ? (
              <>
                <ChevronDown size={16} />
                Collapse All
              </>
            ) : (
              <>
                <ChevronRight size={16} />
                Expand All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Order All Section */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">
        
        {/* Toolbar / Header */}
        <div 
          className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-app/40 border-b border-border sticky top-0 z-30 backdrop-blur-md cursor-pointer hover:bg-app/80 transition-all select-none group/header"
          onClick={() => setIsExpandedOrderAll(!isExpandedOrderAll)}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 flex items-center justify-center rounded-lg transition-all
              ${isExpandedOrderAll ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-violet-500/10 text-violet-500 group-hover/header:bg-violet-500/20'}
            `}>
              {isExpandedOrderAll ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
            <div className="text-violet-500 text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
              <FileText size={14} />
              Order All Data
            </div>
          </div>

          {isExpandedOrderAll && (
            <div className="flex items-center gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
               <button
                 onClick={() => setShowFiltersOrderAll(!showFiltersOrderAll)}
                 className={`
                   flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border h-[46px]
                   ${showFiltersOrderAll 
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
                  placeholder="Cari data Order All..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
                  value={searchQueryOrderAll}
                  onChange={(e) => setSearchQueryOrderAll(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {isExpandedOrderAll && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Filters Panel */}
            {showFiltersOrderAll && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
                 <FilterSection 
                   filters={filtersOrderAll} 
                   setFilters={setFiltersOrderAll} 
                   filterOptions={filterOptions} 
                   claimStatusOptions={CLAIM_STATUS_OPTIONS}
                   hideType={true}
                   hideOrderStatus={true}
                   hideCancelled={true}
                   hideIsiUlang={true}
                   hidePenarikan={true}
                   resiFilter={filtersOrderAll.resiFilter}
                   setResiFilter={(val) => setFiltersOrderAll(prev => ({ ...prev, resiFilter: val }))}
                   showOrderCrossFilters={true}
                 />
                 <DateFilterSection 
                   dateFilter={dateFilterOrderAll} 
                   setDateFilter={setDateFilterOrderAll} 
                   dateFilterColumns={DATE_FILTER_COLUMNS} 
                 />
              </div>
            )}

            <div className="p-4 md:p-6 min-h-[500px]">
               <DashboardTable 
                 data={filteredDataOrderAll}
                 isLoading={isLoading}
                 searchQuery={searchQueryOrderAll}
                 isExporting={false}
                 onExport={() => {}} 
                 onUpdateStatus={updateReportRowStatus}
                 onBulkUpdateStatus={updateBulkStatus}
                 tableId="order-all"
               />
            </div>
          </div>
        )}
      </section>

      {/* Income Section */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">
        
        {/* Toolbar / Header */}
        <div 
          className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-app/40 border-b border-border sticky top-0 z-30 backdrop-blur-md cursor-pointer hover:bg-app/80 transition-all select-none group/header"
          onClick={() => setIsExpandedIncome(!isExpandedIncome)}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 flex items-center justify-center rounded-lg transition-all
              ${isExpandedIncome ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/10 text-emerald-500 group-hover/header:bg-emerald-500/20'}
            `}>
              {isExpandedIncome ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
            <div className="text-emerald-500 text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp size={14} />
              Income Data
            </div>
          </div>

          {isExpandedIncome && (
            <div className="flex items-center gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
               <button
                 onClick={() => setShowFiltersIncome(!showFiltersIncome)}
                 className={`
                   flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border h-[46px]
                   ${showFiltersIncome 
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
                  placeholder="Cari data Income..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
                  value={searchQueryIncome}
                  onChange={(e) => setSearchQueryIncome(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {isExpandedIncome && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Filters Panel */}
            {showFiltersIncome && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
                 <FilterSection 
                   filters={filtersIncome} 
                   setFilters={setFiltersIncome} 
                   filterOptions={filterOptions} 
                   claimStatusOptions={CLAIM_STATUS_OPTIONS}
                 />
                 <DateFilterSection 
                   dateFilter={dateFilterIncome} 
                   setDateFilter={setDateFilterIncome} 
                   dateFilterColumns={DATE_FILTER_COLUMNS} 
                 />
              </div>
            )}

            <div className="p-4 md:p-6 min-h-[500px]">
               <DashboardTable 
                 data={filteredDataIncome}
                 isLoading={isLoading}
                 searchQuery={searchQueryIncome}
                 isExporting={false}
                 onExport={() => {}} 
                 onUpdateStatus={updateReportRowStatus}
                 onBulkUpdateStatus={updateBulkStatus}
                 tableId="income"
               />
            </div>
          </div>
        )}
      </section>

      {/* Main Content Area (MyBalance) */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">
        
        {/* Toolbar / Header */}
        <div 
          className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-app/40 border-b border-border sticky top-0 z-30 backdrop-blur-md cursor-pointer hover:bg-app/80 transition-all select-none group/header"
          onClick={() => setIsExpandedMyBalance(!isExpandedMyBalance)}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 flex items-center justify-center rounded-lg transition-all
              ${isExpandedMyBalance ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-blue-500/10 text-blue-500 group-hover/header:bg-blue-500/20'}
            `}>
              {isExpandedMyBalance ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
            <div className="text-blue-500 text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
              <DollarSign size={14} />
              MyBalance Data
            </div>
          </div>

          {isExpandedMyBalance && (
            <div className="flex items-center gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
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
                  placeholder="Cari data MyBalance..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {isExpandedMyBalance && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Filters Panel */}
            {showFilters && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
                 <FilterSection 
                   filters={filters} 
                   setFilters={setFilters} 
                   filterOptions={filterOptions} 
                   claimStatusOptions={CLAIM_STATUS_OPTIONS}
                 />
                 <DateFilterSection 
                   dateFilter={dateFilter} 
                   setDateFilter={setDateFilter} 
                   dateFilterColumns={DATE_FILTER_COLUMNS} 
                 />
              </div>
            )}

            {/* Content */}
            <div className="p-4 md:p-6 min-h-[500px]">
               <DashboardTable 
                 data={filteredData}
                 isLoading={isLoading}
                 searchQuery={searchQuery}
                 isExporting={false}
                 onExport={() => {}} 
                 onUpdateStatus={updateReportRowStatus}
                 onBulkUpdateStatus={updateBulkStatus}
                 tableId="my-balance"
               />
            </div>
          </div>
        )}
      </section>

      {/* Return Section */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">
        
        {/* Toolbar / Header */}
        <div 
          className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-app/40 border-b border-border sticky top-0 z-30 backdrop-blur-md cursor-pointer hover:bg-app/80 transition-all select-none group/header"
          onClick={() => setIsExpandedReturn(!isExpandedReturn)}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 flex items-center justify-center rounded-lg transition-all
              ${isExpandedReturn ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-amber-500/10 text-amber-500 group-hover/header:bg-amber-500/20'}
            `}>
              {isExpandedReturn ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
            <div className="text-amber-500 text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
              <RotateCcw size={14} />
              Return Data
            </div>
          </div>

          {isExpandedReturn && (
            <div className="flex items-center gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
               <button
                 onClick={() => setShowFiltersReturn(!showFiltersReturn)}
                 className={`
                   flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border h-[46px]
                   ${showFiltersReturn 
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
                  placeholder="Cari data Return..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-brand rounded-xl text-sm font-medium transition-all shadow-sm focus:shadow-md outline-none placeholder:text-text-muted/50"
                  value={searchQueryReturn}
                  onChange={(e) => setSearchQueryReturn(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {isExpandedReturn && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Filters Panel */}
            {showFiltersReturn && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
                 <FilterSection 
                   filters={filtersReturn} 
                   setFilters={setFiltersReturn} 
                   filterOptions={filterOptions} 
                   claimStatusOptions={CLAIM_STATUS_OPTIONS}
                   hideCancelled={true}
                 />
                 <DateFilterSection 
                   dateFilter={dateFilterReturn} 
                   setDateFilter={setDateFilterReturn} 
                   dateFilterColumns={DATE_FILTER_COLUMNS} 
                 />
              </div>
            )}

            <div className="p-4 md:p-6 min-h-[500px]">
               <DashboardTable 
                 data={filteredDataReturn}
                 isLoading={isLoading}
                 searchQuery={searchQueryReturn}
                 isExporting={false}
                 onExport={() => {}} 
                 onUpdateStatus={updateReportRowStatus}
                 onBulkUpdateStatus={updateBulkStatus}
                 tableId="merger"
               />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
