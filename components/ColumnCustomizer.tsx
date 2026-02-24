
'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { ColumnConfig } from '../types';

interface ColumnCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  allColumns: string[];
  currentConfig: ColumnConfig[] | undefined;
  onSave: (config: ColumnConfig[]) => void;
  onReset: () => void;
  defaultPriority: string[];
}

export const ColumnCustomizer: React.FC<ColumnCustomizerProps> = ({
  isOpen,
  onClose,
  allColumns,
  currentConfig,
  onSave,
  onReset,
  defaultPriority
}) => {
  const [items, setItems] = useState<ColumnConfig[]>([]);

  // Initialize Items
  useEffect(() => {
    if (!isOpen) return;

    let initialItems: ColumnConfig[] = [];

    if (currentConfig && currentConfig.length > 0) {
      // Use saved config, but check for new columns in data that might be missing
      initialItems = [...currentConfig];
      const savedKeys = new Set(currentConfig.map(c => c.key));
      
      // Add missing columns (newly uploaded data)
      allColumns.forEach(col => {
        if (!savedKeys.has(col)) {
          initialItems.push({ key: col, visible: true, order: initialItems.length });
        }
      });
    } else {
      // Create Default Config based on Priority List
      initialItems = allColumns.map((col, index) => {
        // Sort logic for default view
        let order = index;
        const priorityIndex = defaultPriority.indexOf(col);
        if (priorityIndex !== -1) {
            order = priorityIndex - 1000; // Force to top
        } else if (col === 'No' || col === 'Claim Status') {
            order = -2000; // Force absolute top
        }
        
        return { key: col, visible: true, order };
      });
      initialItems.sort((a, b) => a.order - b.order);
      // Re-normalize order
      initialItems = initialItems.map((item, idx) => ({ ...item, order: idx }));
    }

    setItems(initialItems);
  }, [isOpen, allColumns, currentConfig, defaultPriority]);

  const toggleVisibility = (index: number) => {
    const newItems = [...items];
    newItems[index].visible = !newItems[index].visible;
    setItems(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    
    // Update order property
    newItems.forEach((item, idx) => item.order = idx);
    
    setItems(newItems);
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-text-main">Customize Columns</h2>
            <p className="text-sm text-text-muted">Pilih kolom yang ingin ditampilkan dan atur urutannya.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-app rounded-lg text-text-muted">
            <X size={20} />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          <div className="space-y-1">
            {items.map((item, index) => (
              <div 
                key={item.key}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-all
                  ${item.visible ? 'bg-surface border-border hover:border-brand/30' : 'bg-app/40 border-transparent opacity-60'}
                `}
              >
                <button 
                  onClick={() => toggleVisibility(index)}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${item.visible ? 'text-brand bg-brand/10' : 'text-text-muted hover:bg-black/5'}
                  `}
                >
                  {item.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                <div className="flex-1 font-medium text-sm text-text-main truncate" title={item.key}>
                  {item.key}
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 hover:bg-app rounded text-text-muted disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="p-1.5 hover:bg-app rounded text-text-muted disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-surface/50 rounded-b-2xl">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Restore Default
          </button>
          
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-brand text-brand-content rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Save size={16} />
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
