
'use server';

import pool from '../lib/db';
import { ProcessedReport, LogEntry, ColumnSettingsMap, ColumnConfig, SkuMasterItem, UserRole } from '../types';

// Helper to ensure tables exist
async function ensureTables() {
  const connection = await pool.getConnection();
  try {
    // Table for Reports
    // MENGUBAH TIPE DATA KE LONGTEXT UNTUK KAPASITAS 4GB
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(255) PRIMARY KEY,
        nama_toko VARCHAR(255),
        jenis_laporan VARCHAR(50),
        bulan_laporan VARCHAR(50),
        file_name VARCHAR(255),
        data LONGTEXT,
        created_at BIGINT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // AUTO MIGRATION: Fix existing table if it was created with JSON or TEXT type
    // This ensures users with existing DBs get the capacity upgrade
    try {
      await connection.query(`ALTER TABLE reports MODIFY COLUMN data LONGTEXT`);
    } catch (e) {
      // Ignore error if column mismatch isn't critical or table locked
      // console.log("Migration check for reports data column skipped or failed", e);
    }

    // Table for Logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50),
        message TEXT,
        details TEXT,
        created_at BIGINT,
        is_read BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Migration: Check if is_read column exists
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM logs LIKE 'is_read'");
      if ((columns as any[]).length === 0) {
         await connection.query(`ALTER TABLE logs ADD COLUMN is_read BOOLEAN DEFAULT FALSE`);
      }
    } catch (e) {
       console.log("Migration check for logs table skipped");
    }

    // Table for Column Settings
    await connection.query(`
      CREATE TABLE IF NOT EXISTS column_settings (
        table_id VARCHAR(50) PRIMARY KEY,
        config JSON,
        updated_at BIGINT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table for SKU Master
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sku_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku1 VARCHAR(255),
        sku2 VARCHAR(255),
        harga VARCHAR(255),
        id_produk VARCHAR(255),
        updated_at BIGINT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

  } finally {
    connection.release();
  }
}

// Helper for Batching
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

// --- AUTH ACTION ---
export async function verifyLoginAction(username: string, password: string): Promise<{ success: boolean; role: UserRole }> {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const guestUser = process.env.GUEST_USERNAME;
  const guestPass = process.env.GUEST_PASSWORD;

  await ensureTables(); 

  if (username === adminUser && password === adminPass) {
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await pool.query(
      'INSERT INTO logs (id, type, message, details, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?)',
      [logId, 'info', 'User Login', 'Super Admin logged in successfully', Date.now(), false]
    );
    return { success: true, role: 'super_admin' };
  }

  if (username === guestUser && password === guestPass) {
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await pool.query(
      'INSERT INTO logs (id, type, message, details, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?)',
      [logId, 'info', 'User Login', 'Guest user logged in successfully', Date.now(), false]
    );
    return { success: true, role: 'guest' };
  }

  return { success: false, role: null };
}

// --- EXISTING ACTIONS BELOW ---

export async function fetchReportsAction(): Promise<{ failed: ProcessedReport[], returned: ProcessedReport[], cancelled: ProcessedReport[], orderAll: ProcessedReport[], income: ProcessedReport[], myBalance: ProcessedReport[] }> {
  await ensureTables();
  // Ensure we get raw rows. MySQL2 handles JSON parsing automatically if column type is JSON.
  const [rows] = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
  
  const reports = (rows as any[]).map(row => {
    // Robust parsing: Handle if DB returns object (JSON type) or string (Longtext type)
    let parsedData = row.data;
    if (typeof row.data === 'string') {
      try {
        parsedData = JSON.parse(row.data);
      } catch (e) {
        console.error('Failed to parse JSON data for report:', row.id, e);
        parsedData = [];
      }
    }

    return {
      id: row.id,
      namaToko: row.nama_toko,
      jenisLaporan: row.jenis_laporan,
      bulanLaporan: row.bulan_laporan,
      fileName: row.file_name,
      data: parsedData, 
      timestamp: Number(row.created_at) // Cast BIGINT to Number
    };
  });

  return {
    failed: reports.filter(r => r.jenisLaporan === 'Pengiriman Gagal'),
    returned: reports.filter(r => r.jenisLaporan === 'Pengembalian'),
    cancelled: reports.filter(r => r.jenisLaporan === 'Pembatalan'),
    orderAll: reports.filter(r => r.jenisLaporan === 'Order All'),
    income: reports.filter(r => r.jenisLaporan === 'Income'),
    myBalance: reports.filter(r => r.jenisLaporan === 'MyBalance')
  };
}

export async function saveReportAction(report: ProcessedReport) {
  await ensureTables();
  await pool.query(
    'INSERT INTO reports (id, nama_toko, jenis_laporan, bulan_laporan, file_name, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      report.id,
      report.namaToko,
      report.jenisLaporan,
      report.bulanLaporan,
      report.fileName,
      JSON.stringify(report.data), // Explicit stringify ensures valid JSON storage
      report.timestamp
    ]
  );
}

export async function updateReportDataAction(reportId: string, newData: any[]) {
  await ensureTables();
  await pool.query(
    'UPDATE reports SET data = ? WHERE id = ?',
    [JSON.stringify(newData), reportId]
  );
}

export async function deleteReportAction(reportId: string) {
  await ensureTables();
  await pool.query('DELETE FROM reports WHERE id = ?', [reportId]);
}

export async function clearReportsAction() {
  await ensureTables();
  await pool.query('DELETE FROM reports');
}

export async function fetchLogsAction(): Promise<LogEntry[]> {
  await ensureTables();
  const [rows] = await pool.query('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100');
  
  return (rows as any[]).map(row => ({
    id: row.id,
    type: row.type,
    message: row.message,
    details: row.details,
    timestamp: Number(row.created_at),
    isRead: Boolean(row.is_read)
  }));
}

export async function saveLogAction(log: LogEntry) {
  await ensureTables();
  await pool.query(
    'INSERT INTO logs (id, type, message, details, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?)',
    [log.id, log.type, log.message, log.details || '', log.timestamp, false]
  );
}

export async function markAllLogsReadAction() {
  await ensureTables();
  await pool.query('UPDATE logs SET is_read = TRUE WHERE is_read = FALSE');
}

export async function clearLogsAction() {
  await ensureTables();
  await pool.query('DELETE FROM logs');
}

// --- COLUMN SETTINGS ACTIONS ---

export async function fetchColumnSettingsAction(): Promise<ColumnSettingsMap> {
  await ensureTables();
  const [rows] = await pool.query('SELECT * FROM column_settings');
  
  const settings: ColumnSettingsMap = {};
  (rows as any[]).forEach(row => {
    try {
      settings[row.table_id] = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
    } catch (e) {
      console.error('Failed to parse column config', e);
    }
  });
  
  return settings;
}

export async function saveColumnSettingsAction(tableId: string, config: ColumnConfig[]) {
  await ensureTables();
  await pool.query(
    `INSERT INTO column_settings (table_id, config, updated_at) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE config = VALUES(config), updated_at = VALUES(updated_at)`,
    [tableId, JSON.stringify(config), Date.now()]
  );
}

export async function resetColumnSettingsAction(tableId: string) {
  await ensureTables();
  await pool.query('DELETE FROM column_settings WHERE table_id = ?', [tableId]);
}

// --- SKU MASTER ACTIONS ---

export async function fetchSkuMasterAction(): Promise<SkuMasterItem[]> {
  await ensureTables();
  const [rows] = await pool.query('SELECT * FROM sku_master ORDER BY sku1 ASC');
  
  return (rows as any[]).map(row => ({
    sku1: row.sku1,
    sku2: row.sku2 || '',
    harga: row.harga || '',
    idProduk: row.id_produk || '',
    updatedAt: Number(row.updated_at)
  }));
}

export async function saveSkuMasterAction(items: SkuMasterItem[]) {
  await ensureTables();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM sku_master');

    if (items.length > 0) {
      const chunks = chunkArray(items, 100); 
      for (const chunk of chunks) {
        const values = chunk.map(item => [
            item.sku1,
            item.sku2,
            item.harga,
            item.idProduk,
            item.updatedAt
        ]);
        await connection.query(
            'INSERT INTO sku_master (sku1, sku2, harga, id_produk, updated_at) VALUES ?',
            [values]
        );
      }
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function clearSkuMasterAction() {
  await ensureTables();
  await pool.query('DELETE FROM sku_master');
}

// --- BACKUP & RESTORE ACTIONS (PRECISION MODE) ---

export async function fetchFullBackupAction() {
  await ensureTables();
  
  // 1. Fetch Reports (Use SELECT * to ensure no column is missed)
  const [reports] = await pool.query('SELECT * FROM reports ORDER BY created_at ASC');
  const processedReports = (reports as any[]).map(row => ({
    id: row.id,
    namaToko: row.nama_toko,
    jenisLaporan: row.jenis_laporan,
    bulanLaporan: row.bulan_laporan,
    fileName: row.file_name,
    // Ensure data is always an Object in JSON file
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    timestamp: Number(row.created_at) // Ensure number format
  }));

  // 2. Fetch Logs
  const [logs] = await pool.query('SELECT * FROM logs ORDER BY created_at ASC');
  const processedLogs = (logs as any[]).map(row => ({
    id: row.id,
    type: row.type,
    message: row.message,
    details: row.details,
    timestamp: Number(row.created_at),
    isRead: Boolean(row.is_read)
  }));

  // 3. Fetch Settings
  const [settings] = await pool.query('SELECT * FROM column_settings');
  const processedSettings = (settings as any[]).map(row => ({
    tableId: row.table_id,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    updatedAt: Number(row.updated_at)
  }));

  // 4. Fetch SKU Master
  const [skus] = await pool.query('SELECT * FROM sku_master');
  const processedSkus = (skus as any[]).map(row => ({
    sku1: row.sku1,
    sku2: row.sku2,
    harga: row.harga,
    idProduk: row.id_produk,
    updatedAt: Number(row.updated_at)
  }));

  return {
    version: "1.0",
    backupDate: Date.now(),
    reports: processedReports,
    logs: processedLogs,
    settings: processedSettings,
    skuMaster: processedSkus,
  };
}

export async function restoreFullBackupAction(backupData: any) {
  await ensureTables();
  const connection = await pool.getConnection();

  // BATCH CONFIGURATION
  // Small batch size for heavy JSON data to prevent 'Packet Too Large' errors
  const REPORT_CHUNK_SIZE = 20; 
  const STANDARD_CHUNK_SIZE = 100;

  try {
    // START TRANSACTION - This ensures ATOMICITY.
    // If anything fails, NOTHING is changed.
    await connection.beginTransaction();

    // 1. Clear existing data
    await connection.query('DELETE FROM reports');
    await connection.query('DELETE FROM logs');
    await connection.query('DELETE FROM column_settings');
    await connection.query('DELETE FROM sku_master');

    // 2. Restore Reports (Batch Insert)
    if (backupData.reports && Array.isArray(backupData.reports)) {
      const chunks = chunkArray(backupData.reports, REPORT_CHUNK_SIZE);
      for (const chunk of chunks) {
        const reportValues = chunk.map((r: any) => [
          r.id,
          r.namaToko,
          r.jenisLaporan,
          r.bulanLaporan,
          r.fileName,
          JSON.stringify(r.data), // Convert Object back to JSON String for DB
          r.timestamp
        ]);
        if (reportValues.length > 0) {
            await connection.query(
            'INSERT INTO reports (id, nama_toko, jenis_laporan, bulan_laporan, file_name, data, created_at) VALUES ?',
            [reportValues]
            );
        }
      }
    }

    // 3. Restore Logs (Batch Insert)
    if (backupData.logs && Array.isArray(backupData.logs)) {
      const chunks = chunkArray(backupData.logs, STANDARD_CHUNK_SIZE);
      for (const chunk of chunks) {
        const logValues = chunk.map((l: any) => [
          l.id,
          l.type,
          l.message,
          l.details || '',
          l.timestamp,
          l.isRead ? 1 : 0 // Ensure Boolean maps to MySQL tinyint
        ]);
        if (logValues.length > 0) {
            await connection.query(
            'INSERT INTO logs (id, type, message, details, created_at, is_read) VALUES ?',
            [logValues]
            );
        }
      }
    }

    // 4. Restore Settings (Batch Insert)
    if (backupData.settings && Array.isArray(backupData.settings)) {
      const chunks = chunkArray(backupData.settings, STANDARD_CHUNK_SIZE);
      for (const chunk of chunks) {
        const settingValues = chunk.map((s: any) => [
          s.tableId,
          JSON.stringify(s.config),
          s.updatedAt
        ]);
        if (settingValues.length > 0) {
            await connection.query(
            'INSERT INTO column_settings (table_id, config, updated_at) VALUES ?',
            [settingValues]
            );
        }
      }
    }

    // 5. Restore SKU Master (Batch Insert)
    if (backupData.skuMaster && Array.isArray(backupData.skuMaster)) {
      const chunks = chunkArray(backupData.skuMaster, STANDARD_CHUNK_SIZE);
      for (const chunk of chunks) {
        const skuValues = chunk.map((s: any) => [
          s.sku1,
          s.sku2 || null, // Handle potential nulls
          s.harga,
          s.idProduk,
          s.updatedAt
        ]);
        if (skuValues.length > 0) {
            await connection.query(
            'INSERT INTO sku_master (sku1, sku2, harga, id_produk, updated_at) VALUES ?',
            [skuValues]
            );
        }
      }
    }

    // If we reached here, everything is perfect. Commit changes.
    await connection.commit();
    
    // Log success for audit
    const reportCount = backupData.reports?.length || 0;
    const skuCount = backupData.skuMaster?.length || 0;
    
    // We return stats to show in UI
    return { success: true, stats: { reports: reportCount, skus: skuCount } };

  } catch (error) {
    // If ANY error occurs, revert DB to state before restore started
    await connection.rollback();
    console.error('Restore CRITICAL FAILURE - Rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
}
