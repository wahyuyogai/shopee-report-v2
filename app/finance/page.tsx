
'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, FileText, TrendingUp, Wallet, Search, Filter, Megaphone } from 'lucide-react';
import { FinanceTab } from '../../types';
import { useData } from '../../components/DataProvider';
import { DashboardTable } from '../../components/DashboardTable';
import { useAuth } from '../../components/AuthProvider';
import { FilterSection } from '../../components/dashboard/FilterSection';
import { DateFilterSection } from '../../components/dashboard/DateFilterSection';
import { DATE_FILTER_COLUMNS, CLAIM_STATUS_OPTIONS } from '../../lib/constants';

// Helper to flatten reports
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
      
      if (harga) {
        const priceClean = String(harga).replace(/[^0-9]/g, '');
        const priceNumeric = parseFloat(priceClean);
        const qtyStr = row['Jumlah'] || '0';
        const qty = parseFloat(String(qtyStr));

        if (!isNaN(priceNumeric) && !isNaN(qty) && qty > 0) {
           total = (priceNumeric * qty).toLocaleString('id-ID');
        }
      }

      return {
        ...rest, 
        'Nama Toko': namaToko || r.namaToko,
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

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('order-all');
  const [searchQuery, setSearchQuery] = useState('');
  const { orderAllReports, incomeReports, myBalanceReports, adwordsBillReports, skuMasterData, isLoading, updateReportRowStatus, updateBulkStatus } = useData();
  const [showFilters, setShowFilters] = useState(false);
  
  // -- FILTER STATES --
  const [filters, setFilters] = useState({
    status: [] as string[], 
    toko: '',
    type: '',
    bulan: [] as string[],
    orderStatus: [] as string[]
  });

  // -- DATE FILTER STATE --
  const [dateFilter, setDateFilter] = useState({
    column: '',
    start: '',
    end: ''
  });

  const tabs = [
    { id: 'order-all' as FinanceTab, label: 'Order All', icon: <FileText size={16} />, color: 'text-brand' },
    { id: 'income' as FinanceTab, label: 'Income', icon: <TrendingUp size={16} />, color: 'text-emerald-500' },
    { id: 'my-balance' as FinanceTab, label: 'MyBalance', icon: <Wallet size={16} />, color: 'text-blue-500' },
    { id: 'adwords-bill' as FinanceTab, label: 'Adwords Bill', icon: <Megaphone size={16} />, color: 'text-amber-500' },
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
    if (activeTab === 'order-all') {
      return getEnrichedData(orderAllReports, skuMap);
    } else if (activeTab === 'income') {
      return getEnrichedData(incomeReports, skuMap);
    } else if (activeTab === 'my-balance') {
      // MyBalance rarely needs SKU processing, but getEnrichedData handles generic fields too
      return getEnrichedData(myBalanceReports, skuMap);
    } else if (activeTab === 'adwords-bill') {
      return getEnrichedData(adwordsBillReports, skuMap);
    }
    return [];
  }, [activeTab, orderAllReports, incomeReports, myBalanceReports, adwordsBillReports, skuMap]);

  // Apply Filters
  const filteredData = useMemo(() => {
    let data = rawData;

    // Standard Filters
    if (filters.toko) data = data.filter(item => item['Nama Toko'] === filters.toko);
    if (filters.bulan && filters.bulan.length > 0) data = data.filter(item => filters.bulan.includes(item['Bulan Laporan']));
    
    // Status Filter
    if (filters.status && filters.status.length > 0) data = data.filter(item => filters.status.includes(item['Claim Status']));

    // Date Filter
    if (dateFilter.column && (dateFilter.start || dateFilter.end)) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck = item[dateFilter.column];
        if (dateFilter.column === 'Waktu Upload') valToCheck = item['_raw_timestamp'];
        
        if (!valToCheck) return false;
        
        let d = new Date(valToCheck);
        // Handle numeric timestamp
        if (typeof valToCheck === 'number') d = new Date(valToCheck);
        
        if (isNaN(d.getTime())) {
           // Try parsing simple string date
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

  // Extract Filter Options
  const filterOptions = useMemo(() => {
    const tokos = new Set<string>();
    const types = new Set<string>();
    const bulans = new Set<string>();

    rawData.forEach(row => {
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
  }, [rawData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">FINANCE</h1>
          <p className="text-sm text-text-muted mt-1 font-medium flex items-center gap-2">
            <DollarSign size={14} className="text-brand" />
            Analisis pendapatan dan laporan keuangan toko.
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
             />
             <DateFilterSection 
               dateFilter={dateFilter} 
               setDateFilter={setDateFilter} 
               dateFilterColumns={DATE_FILTER_COLUMNS} 
             />
          </div>
        )}

        {/* Content */}
        {activeTab === 'order-all' || activeTab === 'income' || activeTab === 'my-balance' || activeTab === 'adwords-bill' ? (
          <div className="p-4 md:p-6 min-h-[500px]">
             <DashboardTable 
               data={filteredData}
               isLoading={isLoading}
               searchQuery={searchQuery}
               isExporting={false}
               onExport={() => {}} // Implemented later if needed
               onUpdateStatus={updateReportRowStatus}
               onBulkUpdateStatus={updateBulkStatus}
               tableId={activeTab}
             />
          </div>
        ) : (
          <div className="p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
            <div className={`p-4 rounded-full bg-app mb-4 ${currentTab.color}`}>
              {React.cloneElement(currentTab.icon as React.ReactElement<any>, { size: 48 })}
            </div>
            <h3 className="text-xl font-bold text-text-main">
              {currentTab.label}
            </h3>
            <p className="text-text-muted mt-2 max-w-sm">
              Tabel dan data untuk menu <b>{currentTab.label}</b> akan ditampilkan di sini.
              <br />
              <span className="text-xs opacity-70">(Data belum tersedia)</span>
            </p>
          </div>
        )}

      </section>
    </div>
  );
}
