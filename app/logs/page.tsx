
'use client';

import React, { useEffect } from 'react';
import { Info } from 'lucide-react';
import { useData } from '../../components/DataProvider';
import { LogHeader } from '../../components/LogHeader';
import { LogItem } from '../../components/LogItem';
import { LogEmptyState } from '../../components/LogEmptyState';

export default function LogsPage() {
  const { logs, clearLogs, markLogsAsRead } = useData();

  // Mark all logs as read when visiting this page
  useEffect(() => {
    markLogsAsRead();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-5xl">
      <LogHeader hasLogs={logs.length > 0} onClear={clearLogs} />

      <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
        {logs.length === 0 ? (
          <LogEmptyState />
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
      
      <div className="p-6 bg-surface border border-border rounded-xl flex items-center gap-4 text-xs text-text-muted italic shadow-sm">
        <Info size={16} className="text-brand flex-shrink-0" />
        <p>Aplikasi menyimpan 100 aktivitas terbaru secara otomatis di database dan penyimpanan lokal browser.</p>
      </div>
    </div>
  );
}
