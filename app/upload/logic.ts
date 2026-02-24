
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ProcessedReport, PreviewData } from '../../types';
import { FAILED_DELIVERY_COLUMNS, RETURN_REFUND_COLUMNS, CANCELLED_COLUMNS, ORDER_ALL_COLUMNS, INCOME_COLUMNS, MY_BALANCE_COLUMNS, ADWORDS_BILL_COLUMNS, generateUniqueKey } from './constants';

const monthMap: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
};

export const extractMonth = (fileName: string) => {
  const match = fileName.match(/\d{8}/);
  if (match) {
    const monthCode = match[0].substring(4, 6);
    return monthMap[monthCode] || 'Unknown';
  }
  return 'Unknown';
};

const validateColumns = (data: any[], required: string[]) => {
  if (data.length === 0) return false;
  const fileHeaders = Object.keys(data[0]);
  const missing = required.filter(req => !fileHeaders.includes(req));
  return missing.length === 0;
};

const formatDateValue = (dateValue: any): string => {
  if (!dateValue) return '';

  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  }

  const dateStr = String(dateValue);
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (month > 12 && day <= 12) {
      // Likely MM/DD/YYYY, swap them
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  return dateStr;
};

export const processFileBuffer = (
  buffer: ArrayBuffer, 
  fileName: string, 
  results: PreviewData,
  existingKeys: { failed: Set<string>, returned: Set<string>, cancelled: Set<string>, orderAll: Set<string>, income: Set<string>, myBalance: Set<string>, adwordsBill: Set<string> },
  parentMetadata: { namaToko?: string, bulan?: string } = {}
) => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // Sheet Detection Logic
  // First check for specific sheet names
  let sheetName: string | undefined;
  
  const lowerName = fileName.toLowerCase();
  const isFilenameOrderAll = lowerName.includes('order.all');
  const isFilenameIncome = lowerName.includes('income');
  const isFilenameMyBalance = lowerName.includes('my_balance') || lowerName.includes('transaction_report');
  const isFilenameAdwordsBill = lowerName.includes('adwords_bill');

  let readOpts: XLSX.Sheet2JSONOpts = { defval: '' };

  if (isFilenameOrderAll) {
     sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'orders');
  } else if (isFilenameIncome) {
     sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'income');
     readOpts.range = 5; // Income starts from row 6
  } else if (isFilenameMyBalance) {
     sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'transaction report');
     readOpts.range = 17; // MyBalance starts from row 18 (index 17)
  } else if (isFilenameAdwordsBill) {
     sheetName = workbook.SheetNames[0]; // Only one sheet
     readOpts.range = 6; // Header is on row 7 (index 6)
  }

  // Fallback for standard files if sheet not found by name logic
  if (!sheetName) {
      if (isFilenameOrderAll) sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'orders');
      else if (isFilenameIncome) sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'income');
      else if (isFilenameMyBalance) sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'transaction report');
      else if (isFilenameAdwordsBill) sheetName = workbook.SheetNames[0];
  }
  
  if (!sheetName && workbook.SheetNames.length > 0) sheetName = workbook.SheetNames[0];
  
  if (!sheetName) return false;

  const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], readOpts);
  if (rawData.length === 0) return false;

  // --- DETECT EXISTING STATUS ---
  let fileHasStatus = false;
  const hasExistingStatus = rawData.some((row: any) => {
      const val = row['Claim Status'];
      return val && typeof val === 'string' && val.trim() !== '' && val.trim() !== '-' && val.trim() !== 'Pending';
  });
  if (hasExistingStatus) fileHasStatus = true;

  // --- SMART TYPE DETECTION ---
  const isExportFile = rawData[0] && 'Type Laporan' in (rawData[0] as object);
  
  const isFilenameFailed = lowerName.includes('failed_delivery');
  const isFilenameReturn = lowerName.includes('return_refund') || lowerName.includes('return');
  const isFilenameCancelled = lowerName.includes('cancellation') || lowerName.includes('pembatalan');

  const failedRowsBatch: any[] = [];
  const returnRowsBatch: any[] = [];
  const cancelledRowsBatch: any[] = [];
  const orderAllRowsBatch: any[] = [];
  const incomeRowsBatch: any[] = [];
  const myBalanceRowsBatch: any[] = [];
  const adwordsBillRowsBatch: any[] = [];

  // Metadata
  let namaToko = parentMetadata.namaToko;
  let bulan = parentMetadata.bulan;

  if (!namaToko) {
    const parts = fileName.split(' - ');
    if (parts.length > 1) {
      namaToko = parts[0].trim();
    } else if (fileName.startsWith('Export-') || fileName.startsWith('Return-App-Export')) {
      namaToko = 'Exported Data'; 
    } else if (isFilenameAdwordsBill) {
      const match = fileName.match(/(.*?)_adwords_bill/i);
      if (match && match[1]) {
        namaToko = match[1].toUpperCase();
      } else {
        namaToko = 'Unknown';
      }
    } else {
      namaToko = 'Unknown';
    }
  }

  if (!bulan || bulan === 'Unknown') {
    bulan = extractMonth(fileName);
    if (bulan === 'Unknown') {
       const now = new Date();
       bulan = monthMap[String(now.getMonth() + 1).padStart(2, '0')] || 'Unknown';
    }
  }

  // Row Iteration
  rawData.forEach((row: any) => {
    let rowType: 'failed' | 'return' | 'cancelled' | 'order-all' | 'income' | 'my-balance' | 'adwords-bill' | null = null;

    if (isExportFile) {
      const typeVal = row['Type Laporan'];
      if (typeVal === 'Pengiriman Gagal') rowType = 'failed';
      else if (typeVal === 'Pengembalian') rowType = 'return';
      else if (typeVal === 'Pembatalan') rowType = 'cancelled';
      else if (typeVal === 'Order All') rowType = 'order-all';
      else if (typeVal === 'Income') rowType = 'income';
      else if (typeVal === 'MyBalance') rowType = 'my-balance';
      else if (typeVal === 'Adwords Bill') rowType = 'adwords-bill';
    } else {
      if (isFilenameOrderAll) rowType = 'order-all';
      else if (isFilenameIncome) rowType = 'income';
      else if (isFilenameMyBalance) rowType = 'my-balance';
      else if (isFilenameAdwordsBill) rowType = 'adwords-bill';
      else if (isFilenameFailed) rowType = 'failed';
      else if (isFilenameReturn) rowType = 'return';
      else if (isFilenameCancelled) rowType = 'cancelled';
      else {
         if ('Alasan Pembatalan' in row) rowType = 'cancelled';
         else if ('No. Pengembalian' in row) rowType = 'return';
         else if ('Status pengiriman gagal' in row) rowType = 'failed';
      }
    }

    if (rowType) {
      const specificNamaToko = isExportFile && row['Nama Toko'] ? row['Nama Toko'] : namaToko;
      const specificBulan = isExportFile && row['Bulan Laporan'] ? row['Bulan Laporan'] : bulan;
      const rawStatus = row['Claim Status'];
      
      let reportTypeLabel = '';
      if (rowType === 'failed') reportTypeLabel = 'Pengiriman Gagal';
      else if (rowType === 'return') reportTypeLabel = 'Pengembalian';
      else if (rowType === 'cancelled') reportTypeLabel = 'Pembatalan';
      else if (rowType === 'income') reportTypeLabel = 'Income';
      else if (rowType === 'my-balance') reportTypeLabel = 'MyBalance';
      else if (rowType === 'adwords-bill') reportTypeLabel = 'Adwords Bill';
      else reportTypeLabel = 'Order All';

      const enrichedRow = {
        ...row,
        'Claim Status': rawStatus || 'Pending', 
        'Nama Toko': specificNamaToko,
        'Type Laporan': reportTypeLabel,
        'Bulan Laporan': specificBulan,
        'Nama File': fileName,
        'SKU Final': row['SKU Final'] || '',
        'Harga': row['Harga'] || '',
        'Total': row['Total'] || ''
      };

      if (rowType === 'failed') failedRowsBatch.push(enrichedRow);
      else if (rowType === 'return') returnRowsBatch.push(enrichedRow);
      else if (rowType === 'cancelled') cancelledRowsBatch.push(enrichedRow);
      else if (rowType === 'income') incomeRowsBatch.push(enrichedRow);
      else if (rowType === 'my-balance') myBalanceRowsBatch.push(enrichedRow);
      if (rowType === 'adwords-bill') {
        enrichedRow['Waktu'] = formatDateValue(enrichedRow['Waktu']);
        adwordsBillRowsBatch.push(enrichedRow);
      } else {
        orderAllRowsBatch.push(enrichedRow);
      }
    }
  });

  const timestamp = Date.now();
  
  // BATCH PROCESSING
  const processBatch = (rows: any[], type: 'failed' | 'return' | 'cancelled' | 'order-all' | 'income' | 'my-balance' | 'adwords-bill', columns: string[], reportType: string) => {
      if (rows.length === 0) return;
      
      if (!isExportFile && !validateColumns(rows, columns)) {
          console.warn(`File ${fileName} detected as ${type} but missing columns.`);
          return;
      }

      const reportId = `${timestamp}-${type.charAt(0).toUpperCase()}-${Math.random().toString(36).substr(2, 5)}`;
      const validNewRows: any[] = [];
      const duplicateRows: any[] = [];

      // Determine correct set based on type
      let targetSet: Set<string>;
      if (type === 'failed') targetSet = existingKeys.failed;
      else if (type === 'return') targetSet = existingKeys.returned;
      else if (type === 'cancelled') targetSet = existingKeys.cancelled;
      else if (type === 'income') targetSet = existingKeys.income;
      else if (type === 'my-balance') targetSet = existingKeys.myBalance;
      else if (type === 'adwords-bill') targetSet = existingKeys.adwordsBill;
      else targetSet = existingKeys.orderAll;

      rows.forEach(row => {
          const key = generateUniqueKey(row, type);
          if (targetSet.has(key)) {
              duplicateRows.push(row);
          } else {
              validNewRows.push(row);
          }
      });

      // Update Results
      if (type === 'failed') {
          results.failed.duplicateRows.push(...duplicateRows);
          results.failed.newRows.push(...validNewRows);
      } else if (type === 'return') {
          results.returned.duplicateRows.push(...duplicateRows);
          results.returned.newRows.push(...validNewRows);
      } else if (type === 'cancelled') {
          results.cancelled.duplicateRows.push(...duplicateRows);
          results.cancelled.newRows.push(...validNewRows);
      } else if (type === 'income') {
          results.income.duplicateRows.push(...duplicateRows);
          results.income.newRows.push(...validNewRows);
      } else if (type === 'my-balance') {
          results.myBalance.duplicateRows.push(...duplicateRows);
          results.myBalance.newRows.push(...validNewRows);
      } else if (type === 'adwords-bill') {
          results.adwordsBill.duplicateRows.push(...duplicateRows);
          results.adwordsBill.newRows.push(...validNewRows);
      } else {
          results.orderAll.duplicateRows.push(...duplicateRows);
          results.orderAll.newRows.push(...validNewRows);
      }

      if (validNewRows.length > 0) {
          results.reportsToSave.push({
              id: reportId,
              namaToko: validNewRows[0]['Nama Toko'],
              jenisLaporan: reportType,
              bulanLaporan: validNewRows[0]['Bulan Laporan'],
              data: validNewRows,
              fileName: isExportFile ? `(Re-upload) ${fileName}` : fileName,
              timestamp
          });
      }
  };

  processBatch(failedRowsBatch, 'failed', FAILED_DELIVERY_COLUMNS, 'Pengiriman Gagal');
  processBatch(returnRowsBatch, 'return', RETURN_REFUND_COLUMNS, 'Pengembalian');
  processBatch(cancelledRowsBatch, 'cancelled', CANCELLED_COLUMNS, 'Pembatalan');
  processBatch(orderAllRowsBatch, 'order-all', ORDER_ALL_COLUMNS, 'Order All');
  processBatch(incomeRowsBatch, 'income', INCOME_COLUMNS, 'Income');
  processBatch(myBalanceRowsBatch, 'my-balance', MY_BALANCE_COLUMNS, 'MyBalance');
  processBatch(adwordsBillRowsBatch, 'adwords-bill', ADWORDS_BILL_COLUMNS, 'Adwords Bill');

  return fileHasStatus;
};
