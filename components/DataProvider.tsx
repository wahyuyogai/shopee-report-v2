
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { ProcessedReport, LogEntry, ColumnSettingsMap, ColumnConfig, SkuMasterItem } from '../types';
import { useUI } from './UIProvider';
import { 
  fetchReportsAction, 
  saveReportAction, 
  clearReportsAction, 
  fetchLogsAction, 
  saveLogAction, 
  clearLogsAction,
  markAllLogsReadAction,
  updateReportDataAction,
  deleteReportAction,
  fetchColumnSettingsAction,
  saveColumnSettingsAction,
  resetColumnSettingsAction,
  fetchSkuMasterAction,
  saveSkuMasterAction,
  clearSkuMasterAction
} from '../app/actions';

interface DataContextType {
  failedDeliveryReports: ProcessedReport[];
  returnRefundReports: ProcessedReport[];
  cancelledReports: ProcessedReport[];
  orderAllReports: ProcessedReport[];
  incomeReports: ProcessedReport[];
  myBalanceReports: ProcessedReport[]; // New
  logs: LogEntry[];
  columnSettings: ColumnSettingsMap;
  skuMasterData: SkuMasterItem[];
  totalLogCount: number;
  unreadLogCount: number;
  addFailedDeliveryReport: (report: ProcessedReport) => Promise<void>;
  addReturnRefundReport: (report: ProcessedReport) => Promise<void>;
  addCancelledReport: (report: ProcessedReport) => Promise<void>;
  addOrderAllReport: (report: ProcessedReport) => Promise<void>;
  addIncomeReport: (report: ProcessedReport) => Promise<void>;
  addMyBalanceReport: (report: ProcessedReport) => Promise<void>; // New
  updateReportRowStatus: (reportId: string, rowIndex: number, newStatus: string) => Promise<void>;
  updateBulkStatus: (selections: { reportId: string, rowIndex: number }[], newStatus: string) => Promise<void>;
  deleteRows: (selections: { reportId: string, rowIndex: number }[]) => Promise<void>;
  addLog: (type: LogEntry['type'], message: string, details?: string) => Promise<void>;
  markLogsAsRead: () => Promise<void>;
  clearData: () => Promise<void>;
  clearLogs: () => Promise<void>;
  saveColumnConfig: (tableId: string, config: ColumnConfig[]) => Promise<void>;
  resetColumnConfig: (tableId: string) => Promise<void>;
  uploadSkuMaster: (items: SkuMasterItem[]) => Promise<void>;
  clearSkuData: () => Promise<void>;
  refreshData: () => Promise<void>; // Exposed for manual refresh (e.g. after restore)
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children?: ReactNode }) {
  const [failedDeliveryReports, setFailedDeliveryReports] = useState<ProcessedReport[]>([]);
  const [returnRefundReports, setReturnRefundReports] = useState<ProcessedReport[]>([]);
  const [cancelledReports, setCancelledReports] = useState<ProcessedReport[]>([]);
  const [orderAllReports, setOrderAllReports] = useState<ProcessedReport[]>([]);
  const [incomeReports, setIncomeReports] = useState<ProcessedReport[]>([]);
  const [myBalanceReports, setMyBalanceReports] = useState<ProcessedReport[]>([]); // New
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [columnSettings, setColumnSettings] = useState<ColumnSettingsMap>({});
  const [skuMasterData, setSkuMasterData] = useState<SkuMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { showToast } = useUI();

  // Fetch initial data from DB
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reportsData, logsData, settingsData, skuData] = await Promise.all([
        fetchReportsAction(),
        fetchLogsAction(),
        fetchColumnSettingsAction(),
        fetchSkuMasterAction()
      ]);
      
      setFailedDeliveryReports(reportsData.failed);
      setReturnRefundReports(reportsData.returned);
      setCancelledReports(reportsData.cancelled);
      setOrderAllReports(reportsData.orderAll);
      setIncomeReports(reportsData.income);
      setMyBalanceReports(reportsData.myBalance); // New
      setLogs(logsData);
      setColumnSettings(settingsData);
      setSkuMasterData(skuData);
    } catch (error: any) {
      console.error("Failed to fetch data from DB:", error);
      // Show error to user, helpful for debugging connection issues
      showToast('error', 'Database Connection Failed', error.message || 'Gagal terhubung ke database.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Derived state for log counts
  const totalLogCount = useMemo(() => logs.length, [logs]);
  const unreadLogCount = useMemo(() => logs.filter(l => !l.isRead).length, [logs]);

  const addLog = async (type: LogEntry['type'], message: string, details?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type,
      message,
      details,
      isRead: false
    };
    
    setLogs(prev => [newLog, ...prev]);
    try {
      await saveLogAction(newLog);
    } catch (error) {
      console.error("Failed to save log to DB", error);
    }
  };

  const markLogsAsRead = async () => {
    if (unreadLogCount === 0) return;

    setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
    try {
      await markAllLogsReadAction();
    } catch (error) {
      console.error("Failed to mark logs as read", error);
    }
  };

  const addFailedDeliveryReport = async (report: ProcessedReport) => {
    setFailedDeliveryReports(prev => [report, ...prev]);
    try {
      await saveReportAction(report);
    } catch (error) {
      console.error("Failed to save report to DB", error);
      addLog('error', 'Database Error', 'Gagal menyimpan laporan pengiriman gagal ke database.');
    }
  };

  const addReturnRefundReport = async (report: ProcessedReport) => {
    setReturnRefundReports(prev => [report, ...prev]);
    try {
      await saveReportAction(report);
    } catch (error) {
      console.error("Failed to save report to DB", error);
      addLog('error', 'Database Error', 'Gagal menyimpan laporan pengembalian ke database.');
    }
  };

  const addCancelledReport = async (report: ProcessedReport) => {
    setCancelledReports(prev => [report, ...prev]);
    try {
      await saveReportAction(report);
    } catch (error) {
      console.error("Failed to save report to DB", error);
      addLog('error', 'Database Error', 'Gagal menyimpan laporan pembatalan ke database.');
    }
  };

  const addOrderAllReport = async (report: ProcessedReport) => {
    setOrderAllReports(prev => [report, ...prev]);
    try {
      await saveReportAction(report);
    } catch (error) {
      console.error("Failed to save report to DB", error);
      addLog('error', 'Database Error', 'Gagal menyimpan laporan Order All ke database.');
    }
  };

  const addIncomeReport = async (report: ProcessedReport) => {
    setIncomeReports(prev => [report, ...prev]);
    try {
      await saveReportAction(report);
    } catch (error) {
      console.error("Failed to save report to DB", error);
      addLog('error', 'Database Error', 'Gagal menyimpan laporan Income ke database.');
    }
  };

  const addMyBalanceReport = async (report: ProcessedReport) => {
    setMyBalanceReports(prev => [report, ...prev]);
    try {
      await saveReportAction(report);
    } catch (error) {
      console.error("Failed to save report to DB", error);
      addLog('error', 'Database Error', 'Gagal menyimpan laporan MyBalance ke database.');
    }
  };

  const updateReportRowStatus = async (reportId: string, rowIndex: number, newStatus: string) => {
     await updateBulkStatus([{ reportId, rowIndex }], newStatus);
  };

  const updateBulkStatus = async (selections: { reportId: string, rowIndex: number }[], newStatus: string) => {
    const targetOrderIds = new Set<string>();
    const specificRowKeys = new Set<string>();

    const allReports = [...failedDeliveryReports, ...returnRefundReports, ...cancelledReports, ...orderAllReports, ...incomeReports, ...myBalanceReports];

    selections.forEach(sel => {
        const report = allReports.find(r => r.id === sel.reportId);
        if (report && report.data[sel.rowIndex]) {
            const orderId = report.data[sel.rowIndex]['No. Pesanan'];
            if (orderId && orderId !== '-' && String(orderId).trim() !== '') {
                targetOrderIds.add(String(orderId).trim());
            } else {
                specificRowKeys.add(`${sel.reportId}|${sel.rowIndex}`);
            }
        }
    });

    const successfulUpdates: string[] = [];

    const applyUpdates = async (
      currentReports: ProcessedReport[], 
      setReports: React.Dispatch<React.SetStateAction<ProcessedReport[]>>
    ) => {
        const updates: Promise<void>[] = [];
        const nextReports = currentReports.map(report => {
            let reportModified = false;
            const newData = report.data.map((row, idx) => {
                let shouldUpdate = false;
                const rowOrderId = String(row['No. Pesanan']).trim();

                if (rowOrderId && targetOrderIds.has(rowOrderId)) {
                    shouldUpdate = true;
                } else if (specificRowKeys.has(`${report.id}|${idx}`)) {
                    shouldUpdate = true;
                }

                if (shouldUpdate && row['Claim Status'] !== newStatus) {
                    reportModified = true;
                    // Track updated Order IDs for logging
                    if (rowOrderId && rowOrderId !== '-' && rowOrderId !== '') {
                        successfulUpdates.push(rowOrderId);
                    }
                    return { ...row, 'Claim Status': newStatus };
                }
                return row;
            });

            if (reportModified) {
                updates.push(updateReportDataAction(report.id, newData).catch(err => {
                    console.error(`Failed to update report ${report.id}`, err);
                    addLog('error', 'Update Gagal', `Gagal menyimpan status bulk untuk report ${report.fileName}`);
                }));
                return { ...report, data: newData };
            }
            return report;
        });

        if (updates.length > 0) {
            setReports(nextReports);
            await Promise.all(updates);
        }
    };

    await Promise.all([
        applyUpdates(failedDeliveryReports, setFailedDeliveryReports),
        applyUpdates(returnRefundReports, setReturnRefundReports),
        applyUpdates(cancelledReports, setCancelledReports),
        applyUpdates(orderAllReports, setOrderAllReports),
        applyUpdates(incomeReports, setIncomeReports),
        applyUpdates(myBalanceReports, setMyBalanceReports)
    ]);

    // --- AUTOMATIC LOGGING (UPDATED) ---
    // Remove duplicates from successfulUpdates
    const uniqueUpdatedOrders = Array.from(new Set(successfulUpdates));

    if (uniqueUpdatedOrders.length > 0) {
      if (uniqueUpdatedOrders.length === 1) {
        // Single Update Log
        const orderId = uniqueUpdatedOrders[0];
        await addLog('info', 'Status Update', `Pesanan #${orderId} diubah menjadi "${newStatus}"`);
      } else {
        // Bulk Update Log - List ALL IDs
        const allIds = uniqueUpdatedOrders.join(', ');
        await addLog('info', 'Bulk Status Update', `Mengubah ${uniqueUpdatedOrders.length} pesanan menjadi "${newStatus}". Daftar Pesanan: ${allIds}`);
      }
    } else if (specificRowKeys.size > 0) {
       // Log for rows without Order ID
       await addLog('info', 'Status Update', `Mengubah ${specificRowKeys.size} baris (Tanpa No. Pesanan) menjadi "${newStatus}"`);
    }
  };

  const deleteRows = async (selections: { reportId: string, rowIndex: number }[]) => {
    // 1. CAPTURE DATA FOR LOGGING BEFORE DELETION
    const deletedOrderIds: string[] = [];
    const allReports = [...failedDeliveryReports, ...returnRefundReports, ...cancelledReports, ...orderAllReports, ...incomeReports, ...myBalanceReports];

    selections.forEach(sel => {
        const report = allReports.find(r => r.id === sel.reportId);
        if (report && report.data[sel.rowIndex]) {
            const orderId = String(report.data[sel.rowIndex]['No. Pesanan'] || '').trim();
            if (orderId && orderId !== '-' && orderId !== '') {
                deletedOrderIds.push(orderId);
            }
        }
    });

    // 2. PREPARE DELETION
    const deletionsByReport: Record<string, Set<number>> = {};
    
    selections.forEach(s => {
        if (!deletionsByReport[s.reportId]) deletionsByReport[s.reportId] = new Set();
        deletionsByReport[s.reportId].add(s.rowIndex);
    });

    const processList = async (
        list: ProcessedReport[], 
        setList: React.Dispatch<React.SetStateAction<ProcessedReport[]>>
    ) => {
        const dbOperations: Promise<void>[] = [];
        
        // We filter the list to remove reports that become empty, 
        // and update data for reports that remain.
        const nextList = list.reduce<ProcessedReport[]>((acc, report) => {
            // If this report is not affected, keep it as is
            if (!deletionsByReport[report.id]) {
                acc.push(report);
                return acc;
            }

            const indicesToDelete = deletionsByReport[report.id];
            const newData = report.data.filter((_, idx) => !indicesToDelete.has(idx));

            if (newData.length === 0) {
                // Report is empty, delete it from DB
                dbOperations.push(deleteReportAction(report.id));
                // Do not push to accumulator (removes from state)
            } else {
                // Report has remaining rows, update DB and push to accumulator
                dbOperations.push(updateReportDataAction(report.id, newData));
                acc.push({ ...report, data: newData });
            }
            return acc;
        }, []);

        // Optimistic update
        setList(nextList);

        // Run DB operations
        try {
            await Promise.all(dbOperations);
        } catch (error) {
            console.error("Failed to delete rows", error);
            // We'll log the error below, outside this helper
            throw error;
        }
    };

    try {
        await Promise.all([
            processList(failedDeliveryReports, setFailedDeliveryReports),
            processList(returnRefundReports, setReturnRefundReports),
            processList(cancelledReports, setCancelledReports),
            processList(orderAllReports, setOrderAllReports),
            processList(incomeReports, setIncomeReports),
            processList(myBalanceReports, setMyBalanceReports)
        ]);

        // 3. SUCCESSFUL LOGGING (UPDATED)
        const uniqueIDs = Array.from(new Set(deletedOrderIds)); // Deduplicate IDs
        const totalDeleted = selections.length;
        const countWithId = uniqueIDs.length;

        if (countWithId > 0) {
            if (countWithId === 1) {
                // Single Delete with ID
                await addLog('info', 'Data Dihapus', `Menghapus Pesanan #${uniqueIDs[0]}`);
            } else {
                // Bulk Delete with IDs - List ALL IDs
                const allIds = uniqueIDs.join(', ');
                await addLog('info', 'Bulk Data Dihapus', `Menghapus ${countWithId} Pesanan. Daftar Pesanan: ${allIds}`);
            }
        } else if (totalDeleted > 0) {
             // Deletion without IDs
             await addLog('info', 'Data Dihapus', `Menghapus ${totalDeleted} baris data (Tanpa No. Pesanan).`);
        }

    } catch (error) {
        addLog('error', 'Delete Gagal', 'Gagal menghapus beberapa data dari database.');
    }
  };

  const clearData = async () => {
    setFailedDeliveryReports([]);
    setReturnRefundReports([]);
    setCancelledReports([]);
    setOrderAllReports([]);
    setIncomeReports([]);
    setMyBalanceReports([]);
    try {
      await clearReportsAction();
      addLog('info', 'Data Dihapus', 'Seluruh laporan dashboard telah dibersihkan dari database.');
    } catch (error) {
      console.error("Failed to clear data from DB", error);
    }
  };

  const clearLogs = async () => {
    setLogs([]);
    try {
      await clearLogsAction();
    } catch (error) {
      console.error("Failed to clear logs from DB", error);
    }
  };

  const saveColumnConfig = async (tableId: string, config: ColumnConfig[]) => {
    setColumnSettings(prev => ({ ...prev, [tableId]: config }));
    try {
      await saveColumnSettingsAction(tableId, config);
    } catch (error) {
      console.error("Failed to save column settings", error);
      addLog('error', 'Settings Error', 'Gagal menyimpan konfigurasi kolom.');
    }
  };

  const resetColumnConfig = async (tableId: string) => {
    setColumnSettings(prev => {
      const newState = { ...prev };
      delete newState[tableId];
      return newState;
    });

    try {
      await resetColumnSettingsAction(tableId);
    } catch (error) {
      console.error("Failed to reset column settings", error);
    }
  };

  const uploadSkuMaster = async (items: SkuMasterItem[]) => {
    setSkuMasterData(items);
    try {
      await saveSkuMasterAction(items);
      addLog('success', 'SKU Master Updated', `Berhasil menyimpan ${items.length} data SKU Master.`);
    } catch (error) {
      console.error("Failed to save SKU Master", error);
      addLog('error', 'SKU Master Error', 'Gagal menyimpan data SKU Master ke database.');
    }
  };

  const clearSkuData = async () => {
    setSkuMasterData([]);
    try {
      await clearSkuMasterAction();
      addLog('info', 'SKU Master Cleared', 'Seluruh data SKU Master telah dihapus.');
    } catch (error) {
      console.error("Failed to clear SKU Master", error);
      addLog('error', 'SKU Error', 'Gagal menghapus data SKU Master.');
    }
  };

  return (
    <DataContext.Provider value={{ 
      failedDeliveryReports, 
      returnRefundReports, 
      cancelledReports,
      orderAllReports,
      incomeReports,
      myBalanceReports,
      logs,
      columnSettings,
      skuMasterData,
      totalLogCount,
      unreadLogCount,
      addFailedDeliveryReport, 
      addReturnRefundReport,
      addCancelledReport,
      addOrderAllReport,
      addIncomeReport,
      addMyBalanceReport,
      updateReportRowStatus,
      updateBulkStatus,
      deleteRows,
      addLog,
      markLogsAsRead,
      clearData,
      clearLogs,
      saveColumnConfig,
      resetColumnConfig,
      uploadSkuMaster,
      clearSkuData,
      refreshData,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
