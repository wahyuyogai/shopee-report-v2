
'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Search, Filter } from 'lucide-react';
import { useData } from '../components/DataProvider';
import { DashboardTable } from '../components/DashboardTable';
import { FilterSection } from '../components/dashboard/FilterSection';
import { DateFilterSection } from '../components/dashboard/DateFilterSection';
import { DailyProfitSummary } from '../components/dashboard/DailyProfitSummary';
import { DATE_FILTER_COLUMNS, CLAIM_STATUS_OPTIONS } from '../lib/constants';

// Helper to enrich data (copied from FinancePage for consistency)
const getEnrichedData = (reports: any[], skuMap: Map<string, any>, feeToggles: any) => {
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
        const qtyStr = row['Jumlah'] || '0';
        const qty = parseFloat(String(qtyStr));

        if (!isNaN(priceNumeric) && !isNaN(qty) && qty > 0) {
           total = (priceNumeric * qty).toLocaleString('id-ID');
        }

        // Calculate Estimasi Profit
        // Formula: (Harga Setelah Diskon - Harga) * Jumlah
        // Normalize "Harga Setelah Diskon": "82.500" (string with dot as thousand separator) -> 82500 (number)
        const hargaSetelahDiskonStr = row['Harga Setelah Diskon'] || '0';
        // Remove non-numeric characters except potential decimal comma (though usually it's just dots for thousands in this dataset)
        // Assuming format "82.500" means 82500.
        const hargaSetelahDiskonClean = String(hargaSetelahDiskonStr).replace(/\./g, '').replace(/,/g, '.'); 
        const hargaSetelahDiskon = parseFloat(hargaSetelahDiskonClean) || 0;

        if (!isNaN(hargaSetelahDiskon) && !isNaN(priceNumeric) && !isNaN(qty)) {
            const grossProfit = (hargaSetelahDiskon - priceNumeric) * qty;

            // Calculate Biaya Lainnya
            const orderId = row['No. Pesanan'];
            const rowCount = orderCounts.get(orderId) || 1;
            
            const voucherStr = row['Voucher Ditanggung Penjual'] || '0';
            const voucherClean = String(voucherStr).replace(/\./g, '').replace(/,/g, '.');
            const voucherTotal = parseFloat(voucherClean) || 0;
            const voucherRow = voucherTotal / rowCount;

            const txFeeTotal = 1250;
            const txFeeRow = txFeeTotal / rowCount;

            const revenueBase = (hargaSetelahDiskon * qty) - voucherRow;
            revenueBaseStr = revenueBase.toLocaleString('id-ID', { maximumFractionDigits: 0 });
            
            // Calculate components with rounding or read from columns
            let adminFee = row['Admin Shopee 8.25%'] !== undefined ? parseFloat(String(row['Admin Shopee 8.25%']).replace(/\./g, '').replace(/,/g, '.')) || 0 : Math.round(revenueBase * 0.0825);
            let freeShipFee = row['Gratis Ongkir Xtra 5%'] !== undefined ? parseFloat(String(row['Gratis Ongkir Xtra 5%']).replace(/\./g, '').replace(/,/g, '.')) || 0 : Math.round(revenueBase * 0.05);
            let promoFee = row['Promo Xtra 4.5%'] !== undefined ? parseFloat(String(row['Promo Xtra 4.5%']).replace(/\./g, '').replace(/,/g, '.')) || 0 : Math.round(revenueBase * 0.045);
            let premiFee = row['Biaya Premi 0.5%'] !== undefined ? parseFloat(String(row['Biaya Premi 0.5%']).replace(/\./g, '').replace(/,/g, '.')) || 0 : Math.round(revenueBase * 0.005);
            let txFeeRowCalc = row['Biaya Per Transaksi Rp. 1,250'] !== undefined ? parseFloat(String(row['Biaya Per Transaksi Rp. 1,250']).replace(/\./g, '').replace(/,/g, '.')) || 0 : txFeeRow;

            if (!feeToggles.admin) adminFee = 0;
            if (!feeToggles.freeShip) freeShipFee = 0;
            if (!feeToggles.promo) promoFee = 0;
            if (!feeToggles.premi) premiFee = 0;
            if (!feeToggles.tx) txFeeRowCalc = 0;
            
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

      return {
        ...rest,
        'Nama Toko': namaToko || r.namaToko,
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
  const { orderAllReports, myBalanceReports, adwordsBillReports, skuMasterData, isLoading, updateReportRowStatus, updateBulkStatus } = useData();
  const [showFilters, setShowFilters] = useState(false);

  const [activeAdTab, setActiveAdTab] = useState('top-up-iklan');
  const [adSpendMode, setAdSpendMode] = useState<'top-up' | 'gmv-max'>('top-up');

  // -- FILTER STATES --
  const [filters, setFilters] = useState({
    status: [] as string[],
    toko: '',
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[],
  });

  const [hasInitializedOrderStatus, setHasInitializedOrderStatus] = useState(false);

  // -- DATE FILTER STATE --
  const [dateFilter, setDateFilter] = useState({
    column: '',
    start: '',
    end: ''
  });

  const [feeToggles, setFeeToggles] = useState({
    admin: true,
    freeShip: true,
    promo: true,
    premi: true,
    tx: true,
  });

  const tabs = [
    { id: 'estimasi-profit', label: 'Estimasi Profit', icon: <BarChart3 size={16} />, color: 'text-brand' },
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

  const rawData = useMemo(() => {
    if (activeTab === 'estimasi-profit') {
      return getEnrichedData(orderAllReports, skuMap, feeToggles);
    }
    return [];
  }, [activeTab, orderAllReports, skuMap, feeToggles]);

  const isiUlangSaldoData = useMemo(() => {
    let filtered = myBalanceReports.flatMap((report: any) => report.data)
      .filter((row: any) => row['Deskripsi'] === 'Isi Ulang Saldo Iklan/Koin Penjual');

    if (filters.toko) {
      filtered = filtered.filter((row: any) => row['Nama Toko'] === filters.toko);
    }

    // Sort by 'Tanggal Transaksi' ascending (older first)
    return filtered.sort((a, b) => {
      // The date format is 'YYYY-MM-DD HH:MM:SS', which can be parsed directly.
      const dateA = new Date(a['Tanggal Transaksi']);
      const dateB = new Date(b['Tanggal Transaksi']);
      return dateA.getTime() - dateB.getTime();
    });
  }, [myBalanceReports, filters.toko]);

  const gmvMaxBudgetData = useMemo(() => {
    let filtered = adwordsBillReports.flatMap((report: any) => report.data)
      .filter((row: any) => {
        const desc = row['Deskripsi'] || '';
        return desc === 'Deduction for Product Ad (Auto Bidding - GMV Max)' || 
               desc === 'ROAS Protection Free Ads Credit Rebate';
      });

    if (filters.toko) {
      filtered = filtered.filter((row: any) => row['Nama Toko'] === filters.toko);
    }

    // Sort by 'Tanggal Transaksi' ascending (older first)
    return filtered.sort((a, b) => {
      // The date format is 'YYYY-MM-DD HH:MM:SS', which can be parsed directly.
      const dateA = new Date(a['Tanggal Transaksi']);
      const dateB = new Date(b['Tanggal Transaksi']);
      return dateA.getTime() - dateB.getTime();
    });
  }, [adwordsBillReports, filters.toko]);

  // Apply Filters
  const filteredData = useMemo(() => {
    let data = rawData;

    // Standard Filters
    if (filters.toko) data = data.filter(item => item['Nama Toko'] === filters.toko);
    if (filters.bulan && filters.bulan.length > 0) data = data.filter(item => filters.bulan.includes(item['Bulan Laporan']));

    // Status Filter
    if (filters.status && filters.status.length > 0) data = data.filter(item => filters.status.includes(item['Claim Status']));

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
    if (dateFilter.column && (dateFilter.start || dateFilter.end)) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item[dateFilter.column];
        if (dateFilter.column === 'Waktu Upload') valToCheck = item['_raw_timestamp'];

        if (!valToCheck) return false;

        let d = new Date(valToCheck);
        if (typeof valToCheck === 'number') d = new Date(valToCheck);

        if (isNaN(d.getTime())) {
           const parts = String(valToCheck).split(/[-/]/);
           if (parts.length >= 3) d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
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

  const dailyProfitData = useMemo(() => {
    const profitByDate = new Map<string, number>();
    const adSpendByDate = new Map<string, number>();

    // Process Order All data for profit
    filteredData.forEach(row => {
      const dateStr = row['Waktu Pesanan Dibuat']?.split(' ')[0];
      if (dateStr) {
        const profitStr = row['Estimasi Profit'] || '0';
        const profit = parseFloat(profitStr.replace(/[^0-9-]/g, '')) || 0;
        profitByDate.set(dateStr, (profitByDate.get(dateStr) || 0) + profit);
      }
    });

    // Process Biaya Iklan data based on adSpendMode
    let adSourceData = adSpendMode === 'top-up' ? isiUlangSaldoData : gmvMaxBudgetData;

    if (dateFilter.start || dateFilter.end) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      adSourceData = adSourceData.filter((item: any) => {
        let valToCheck = adSpendMode === 'top-up' ? item['Tanggal Transaksi'] : item['Waktu'];
        if (!valToCheck) return false;
        
        let d;
        if (adSpendMode === 'gmv-max') {
            const parts = valToCheck.split('/');
            if (parts.length === 3) {
                // DD/MM/YYYY to YYYY-MM-DD
                d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                d = new Date(valToCheck);
            }
        } else {
            d = new Date(valToCheck);
        }

        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startTs && d.getTime() <= endTs;
      });
    }

    adSourceData.forEach(row => {
      let dateStr;
      const rawDate = adSpendMode === 'top-up' ? row['Tanggal Transaksi'] : row['Waktu'];
      if(adSpendMode === 'gmv-max') {
        const parts = rawDate.split('/');
        if(parts.length === 3) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      } else {
        dateStr = rawDate?.split(' ')[0];
      }

      if (dateStr) {
        const spendStr = String(row['Jumlah'] || '0');
        const spend = parseFloat(spendStr.replace(/[^0-9-]/g, '')) || 0;
        
        if (adSpendMode === 'gmv-max') {
            // Rebate is positive, Deduction is negative
            adSpendByDate.set(dateStr, (adSpendByDate.get(dateStr) || 0) + spend);
        } else {
            // Top up is always a cost (absolute value)
            adSpendByDate.set(dateStr, (adSpendByDate.get(dateStr) || 0) + Math.abs(spend));
        }
      }
    });

    const allDates = new Set([...profitByDate.keys(), ...adSpendByDate.keys()]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return sortedDates.map(date => {
      const estimasiProfit = profitByDate.get(date) || 0;
      const jumlahBiayaIklan = adSpendByDate.get(date) || 0;
      const estProfitBersih = estimasiProfit - jumlahBiayaIklan;
      return {
        tanggal: date,
        estimasiProfit,
        jumlahBiayaIklan,
        estProfitBersih
      };
    });

  }, [filteredData, isiUlangSaldoData, gmvMaxBudgetData, dateFilter, adSpendMode]);

  // Extract Filter Options
  const filterOptions = useMemo(() => {
    const tokos = new Set<string>();
    const types = new Set<string>();
    const bulans = new Set<string>();
    const orderStatuses = new Set<string>();

    rawData.forEach(row => {
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

    return {
      toko: Array.from(tokos).sort(),
      type: Array.from(types).sort(),
      bulan: Array.from(bulans).sort(),
      orderStatus: Array.from(orderStatuses).sort(),
    };
  }, [rawData]);

  React.useEffect(() => {
    if (!hasInitializedOrderStatus && filterOptions.orderStatus.length > 0) {
      setFilters(prev => ({
        ...prev,
        orderStatus: filterOptions.orderStatus.filter(status => status !== 'Batal')
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
      {/* Daily Profit Summary */}
      {activeTab === 'estimasi-profit' && (
        <DailyProfitSummary 
          data={dailyProfitData} 
          isLoading={isLoading} 
          adSpendMode={adSpendMode}
          setAdSpendMode={setAdSpendMode}
        />
      )}

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
               dateFilterColumns={DATE_FILTER_COLUMNS}
             />
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-6 min-h-[500px]">
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
    </div>
  );
}
