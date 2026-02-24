
'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, Clock } from 'lucide-react';
import { LogEntry } from '../types';

interface LogItemProps {
  log: LogEntry;
}

/**
 * Fix: Explicitly typing the component as React.FC<LogItemProps> 
 * ensures that reserved props like 'key' are correctly handled by the TypeScript 
 * compiler when the component is rendered in a loop.
 */
export const LogItem: React.FC<LogItemProps> = ({ log }) => {
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-brand" />;
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="p-4 hover:bg-app/20 transition-colors flex items-start gap-4 group">
      <div className="flex flex-col items-center gap-1 min-w-[60px] pt-1">
        <span className="text-xs font-bold text-text-muted uppercase">{formatDate(log.timestamp)}</span>
        <span className="text-xs font-medium text-text-main flex items-center gap-1">
          <Clock size={10} className="text-brand" />
          {formatTime(log.timestamp)}
        </span>
      </div>
      
      <div className="h-6 w-px bg-border my-auto hidden sm:block" />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {getLogIcon(log.type)}
          <h3 className="text-sm font-bold text-text-main">{log.message}</h3>
        </div>
        {log.details && (
          <p className="text-xs text-text-muted font-medium ml-6 font-mono bg-app/40 inline-block px-1.5 py-0.5 rounded">
            {log.details}
          </p>
        )}
      </div>

      <div className={`
        text-xs font-bold px-2 py-0.5 rounded-full uppercase
        ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : log.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-brand/10 text-brand'}
      `}>
        {log.type}
      </div>
    </div>
  );
};
