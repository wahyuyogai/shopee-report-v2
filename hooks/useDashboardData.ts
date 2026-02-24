
import { useMemo } from 'react';
import { DashboardTab, ProcessedReport, SkuMasterItem } from '../types';

interface FilterState {
  status: string[]; 
  toko: string;
  type: string;
  bulan: string[]; // Changed to Array
}

interface DateFilterState {
  column: string;
  start: string;
  end: string;
}

interface UseDashboardDataProps {
  activeTab: DashboardTab;
  failedDeliveryReports: ProcessedReport[];
  returnRefundReports: ProcessedReport[];
  cancelledReports?: ProcessedReport[]; // New optional prop
  skuMasterData: SkuMasterItem[];
  filters: FilterState;
  dateFilter: DateFilterState;
  searchQuery: string;
}

export const useDashboardData = ({
  activeTab,
  failedDeliveryReports,
  returnRefundReports,
  cancelledReports = [],
  skuMasterData,
  filters,
  dateFilter,
  searchQuery
}: UseDashboardDataProps) => {

  // 1. Create a Lookup Map for SKU Master (Optimization)
  const skuMap = useMemo(() => {
    const map = new Map();
    skuMasterData.forEach(item => {
      if (item.sku1) map.set(item.sku1.toLowerCase().trim(), item);
      if (item.sku2) map.set(item.sku2.toLowerCase().trim(), item);
    });
    return map;
  }, [skuMasterData]);

  // Helper to flatten reports into single array of rows with metadata
  const getEnrichedData = (reports: ProcessedReport[]) => {
    return reports.flatMap(r => {
      const uploadTime = new Date(r.timestamp).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      return r.data.map((row, index) => {
        const { 
          'Nama Toko': namaToko, 
          'Jenis Laporan': jenisLaporan,
          'Type Laporan': typeLaporan,
          'Bulan Laporan': bulanLaporan, 
          ...rest 
        } = row;

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
          const qtyStr = row['Jumlah'] || row['Jumlah Produk Dikembalikan'] || '0';
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

  // Calculate Merger Data
  const mergerData = useMemo(() => {
    const failedRows = getEnrichedData(failedDeliveryReports);
    const returnRows = getEnrichedData(returnRefundReports);
    const cancelledRows = getEnrichedData(cancelledReports);
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

  // -- BASE DATA (Based on Active Tab) --
  const baseData = useMemo(() => {
    if (activeTab === 'merger') {
      return mergerData;
    } else if (activeTab === 'failed') {
      return getEnrichedData(failedDeliveryReports);
    } else if (activeTab === 'return') {
      return getEnrichedData(returnRefundReports);
    } else {
      return getEnrichedData(cancelledReports);
    }
  }, [activeTab, mergerData, failedDeliveryReports, returnRefundReports, cancelledReports, skuMap]);

  // -- DATE PARSING HELPER --
  const parseAnyDate = (val: any, isUploadTime: boolean = false): number | null => {
    if (!val) return null;
    
    if (isUploadTime && typeof val === 'number') {
      return val;
    }

    const str = String(val).trim();
    if (str === '-' || str === '') return null;

    let d = new Date(str);
    if (!isNaN(d.getTime())) return d.getTime();

    const parts = str.split(/[-/]/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      else if (parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) return d.getTime();
      }
    }
    return null;
  };

  // -- PRE-STATUS DATA --
  // Applies all filters EXCEPT "status". This allows us to calculate
  // the counts of each status based on the current context (Store, Date, Search).
  const preStatusData = useMemo(() => {
    let data = baseData;

    if (filters.toko) {
      data = data.filter(item => item['Nama Toko'] === filters.toko);
    }
    if (filters.type) {
      data = data.filter(item => item['Type Laporan'] === filters.type);
    }
    
    if (filters.bulan && filters.bulan.length > 0) {
      data = data.filter(item => filters.bulan.includes(item['Bulan Laporan']));
    }

    if (dateFilter.column && (dateFilter.start || dateFilter.end)) {
      const startTs = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00').getTime() : -Infinity;
      const endTs = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59').getTime() : Infinity;

      data = data.filter(item => {
        let valToCheck: any;
        let isUpload = false;

        if (dateFilter.column === 'Waktu Upload') {
          valToCheck = item['_raw_timestamp'];
          isUpload = true;
        } else {
          valToCheck = item[dateFilter.column];
        }

        const rowTs = parseAnyDate(valToCheck, isUpload);
        if (rowTs === null) return false;

        return rowTs >= startTs && rowTs <= endTs;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        return Object.entries(item).some(([key, val]) => 
          !key.startsWith('_') && String(val || '').toLowerCase().includes(query)
        );
      });
    }

    return data;
  }, [baseData, filters.toko, filters.type, filters.bulan, dateFilter, searchQuery]);


  // -- STATUS COUNTS (Unique Order IDs) --
  const statusCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    
    preStatusData.forEach(row => {
      const status = row['Claim Status'] || 'Pending';
      const orderId = String(row['No. Pesanan'] || '').trim();
      
      // Initialize Set if not exists
      if (!counts[status]) {
        counts[status] = new Set();
      }

      // Add Order ID to Set (automatically handles uniqueness)
      if (orderId && orderId !== '-' && orderId !== '') {
        counts[status].add(orderId);
      }
    });

    // Convert Sets to counts (numbers)
    const result: Record<string, number> = {};
    Object.keys(counts).forEach(key => {
      result[key] = counts[key].size;
    });

    return result;
  }, [preStatusData]);


  // -- FINAL DATA --
  // Applies the Status filter to the pre-filtered data
  const currentData = useMemo(() => {
    let data = preStatusData;

    if (filters.status && filters.status.length > 0) {
      data = data.filter(item => filters.status.includes(item['Claim Status']));
    }

    return data;
  }, [preStatusData, filters.status]);


  // -- CALCULATE UNIQUE FILTER OPTIONS --
  const filterOptions = useMemo(() => {
    // For general filter options, we usually look at the base dataset of the active tab
    // to show users all available possibilities, even if current filters hide them.
    
    const tokos = new Set<string>();
    const types = new Set<string>();
    const bulans = new Set<string>();

    baseData.forEach(row => {
      if (row['Nama Toko']) tokos.add(row['Nama Toko']);
      if (row['Type Laporan']) types.add(row['Type Laporan']);
      if (row['Bulan Laporan']) bulans.add(row['Bulan Laporan']);
    });

    return {
      toko: Array.from(tokos).sort(),
      type: Array.from(types).sort(),
      bulan: Array.from(bulans).sort()
    };
  }, [baseData]);

  // -- MISSING SKU DETECTION --
  const missingSkuCount = useMemo(() => {
    return currentData.filter(row => !row['SKU Final'] || !row['Total']).length;
  }, [currentData]);

  return {
    currentData,
    filterOptions,
    statusCounts, // Exported new property
    missingSkuCount
  };
};