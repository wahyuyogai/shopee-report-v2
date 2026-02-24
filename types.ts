
export type View = 'dashboard' | 'upload' | 'settings' | 'logs';
export type DashboardTab = 'merger' | 'failed' | 'return' | 'cancelled';
export type FinanceTab = 'order-all' | 'income' | 'my-balance' | 'adwords-bill';
export type Theme = 'light' | 'dark' | 'indigo' | 'emerald' | 'facebook' | 'shopee' | 'tiktok' | 'netflix' | 'indomaret' | 'alfamart' | 'instagram' | 'gradient';
export type BorderStyle = 'sharp' | 'modern' | 'soft';
export type BorderWeight = 'thin' | 'regular' | 'bold';
export type OutlineStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'transparent' | 'shadow-wrapper';
export type UIMode = 'standard' | 'glass' | 'neo';
export type ShadowStyle = 'none' | 'subtle' | 'elevated' | 'floating';
export type UserRole = 'super_admin' | 'guest' | null;

export interface ProcessedReport {
  id: string;
  namaToko: string;
  jenisLaporan: string;
  bulanLaporan: string;
  data: any[];
  fileName: string;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'error';
  message: string;
  details?: string;
  isRead: boolean;
}

export interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
}

export interface ColumnSettingsMap {
  [tableId: string]: ColumnConfig[];
}

export interface SkuMasterItem {
  sku1: string;
  sku2: string;
  harga: string;
  idProduk: string;
  updatedAt: number;
}

export interface PreviewData {
  failed: {
    newRows: any[];
    duplicateRows: any[];
  };
  returned: {
    newRows: any[];
    duplicateRows: any[];
  };
  cancelled: {
    newRows: any[];
    duplicateRows: any[];
  };
  orderAll: {
    newRows: any[];
    duplicateRows: any[];
  };
  income: {
    newRows: any[];
    duplicateRows: any[];
  };
  myBalance: {
    newRows: any[];
    duplicateRows: any[];
  };
  adwordsBill: {
    newRows: any[];
    duplicateRows: any[];
  };
  reportsToSave: ProcessedReport[];
}
