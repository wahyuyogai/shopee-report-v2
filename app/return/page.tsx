'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DashboardTab, ProcessedReport } from '../../types';
import { useData } from '../../components/DataProvider';
import { useUI } from '../../components/UIProvider';
import { DashboardTable } from '../../components/DashboardTable';
import { useDashboardData } from '../../hooks/useDashboardData';

// Modular Components
import { FilterSection } from '../../components/dashboard/FilterSection';
import { DateFilterSection } from '../../components/dashboard/DateFilterSection';
import { DashboardTabs } from '../../components/dashboard/DashboardTabs';
import { MissingSkuAlert } from '../../components/dashboard/MissingSkuAlert';
import { SummaryCards } from '../../components/dashboard/SummaryCards';
import { SkuSummaryCard } from '../../components/dashboard/SkuSummaryCard';
import { useAuth } from '../../components/AuthProvider';
import { CLAIM_STATUS_OPTIONS, DATE_FILTER_COLUMNS } from '../../lib/constants'; // Imported shared constants

export default function ReturnPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('merger');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // Default Hide Filters
  
  // -- FILTER STATES --
  const [filters, setFilters] = useState({
    status: [] as string[], 
    toko: '',
    type: '',
    bulan: [] as string[], // Changed to Array for Multi-select
    orderStatus: [] as string[]
  });

  // -- DATE FILTER STATE --
  const [dateFilter, setDateFilter] = useState({
    column: '',
    start: '',
    end: ''
  });

  const { failedDeliveryReports, returnRefundReports, cancelledReports, skuMasterData, isLoading, updateReportRowStatus, updateBulkStatus, addLog } = useData();
  const { showToast } = useUI();
  const { role } = useAuth();

  // --- USE CUSTOM HOOK FOR DATA LOGIC ---
  const { currentData, filterOptions, statusCounts, missingSkuCount } = useDashboardData({
    activeTab,
    failedDeliveryReports,
    returnRefundReports,
    cancelledReports,
    skuMasterData,
    filters,
    dateFilter,
    searchQuery
  });

  const handleResetFilters = () => {
    setFilters({ status: [], toko: '', type: '', bulan: [], orderStatus: [] });
    setDateFilter({ column: '', start: '', end: '' });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.status.length > 0 || filters.toko || filters.type || filters.bulan.length > 0 || searchQuery || dateFilter.column;

  const handleExport = () => {
    setIsExporting(true);
    
    // Log Guest Export
    if (role === 'guest') {
      addLog('info', 'Data Export', 'Guest user exported dashboard data to Excel.');
    }

    setTimeout(() => {
      try {
        if (currentData.length === 0) {
          showToast('warning', 'Data Kosong', 'Tidak ada data yang dapat diexport saat ini.');
          setIsExporting(false);
          return;
        }

        const fileName = `Export-${activeTab}-${new Date().toISOString().split('T')[0]}.xlsx`;
        
        const cleanData = currentData.map(row => {
          const { _updatedCols, _isMerged, _reportId, _rowIndex, _raw_timestamp, ...rest } = row;
          return rest;
        });

        const worksheet = XLSX.utils.json_to_sheet(cleanData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        
        XLSX.writeFile(workbook, fileName);
        showToast('success', 'Export Berhasil', `File ${fileName} telah diunduh.`);

      } catch (error) {
        console.error("Export failed", error);
        showToast('error', 'Export Gagal', 'Terjadi kesalahan saat membuat file Excel.');
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative pb-10">
      
      <MissingSkuAlert count={missingSkuCount} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">RETURN</h1>
          <p className="text-sm text-text-muted mt-1 font-medium flex items-center gap-2">
            <Info size={14} className="text-brand" />
            Pusat kendali manajemen data pengembalian dan pengiriman gagal.
          </p>
        </div>
      </div>

      {/* --- SECTION 1: MAIN SUMMARY CARDS --- */}
      <section>
         <SummaryCards data={currentData} />
      </section>
      
      {/* --- SECTION 2: SKU SUMMARY (SEPARATED) --- */}
      <section>
         <SkuSummaryCard data={currentData} />
      </section>

      {/* --- SECTION 3: MAIN DATA TABLE --- */}
      <section className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-500">
        
        <DashboardTabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          failedCount={failedDeliveryReports.length} 
          returnCount={returnRefundReports.length} 
          cancelledCount={cancelledReports.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          hasActiveFilters={!!hasActiveFilters}
          onResetFilters={handleResetFilters}
          isFiltersOpen={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {showFilters && (
          <div className="animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
            <FilterSection 
              filters={filters} 
              setFilters={setFilters} 
              filterOptions={filterOptions} 
              claimStatusOptions={CLAIM_STATUS_OPTIONS}
              statusCounts={statusCounts}
            />

            <DateFilterSection 
              dateFilter={dateFilter} 
              setDateFilter={setDateFilter} 
              dateFilterColumns={DATE_FILTER_COLUMNS} 
            />
          </div>
        )}

        {/* Dashboard Table */}
        <div className="p-4 md:p-6 min-h-[500px]">
          <DashboardTable 
            data={currentData}
            isLoading={isLoading}
            searchQuery={searchQuery}
            isExporting={isExporting}
            onExport={handleExport}
            onUpdateStatus={updateReportRowStatus}
            onBulkUpdateStatus={updateBulkStatus}
            tableId={activeTab}
          />
        </div>
      </section>
    </div>
  );
}
