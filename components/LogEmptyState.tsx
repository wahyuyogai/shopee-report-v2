
'use client';

import React from 'react';
import { ClipboardList } from 'lucide-react';

export const LogEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 opacity-50">
      <ClipboardList size={64} className="text-text-muted" />
      <p className="font-medium text-text-muted">Belum ada aktivitas yang direkam.</p>
    </div>
  );
};
