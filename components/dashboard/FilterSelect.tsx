
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface FilterSelectProps {
  label: string;
  value: string | string[];
  onChange: (val: any) => void;
  options: string[];
  placeholder?: string;
  multiple?: boolean;
  counts?: Record<string, number>; // New prop for badge counts
  customLabels?: Record<string, string>; // New prop for custom display labels
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Semua",
  multiple = false,
  counts,
  customLabels
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(option)
        ? currentValues.filter(v => v !== option)
        : [...currentValues, option];
      onChange(newValues);
    } else {
      onChange(option);
      setIsOpen(false);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  // Display Text Logic
  let displayText = placeholder;
  if (multiple) {
    const arr = Array.isArray(value) ? value : [];
    if (arr.length > 0) {
      displayText = `${arr.length} Terpilih`;
      if (arr.length === 1) {
        const val = arr[0];
        displayText = customLabels && customLabels[val] ? customLabels[val] : val;
      }
    }
  } else {
    if (value) {
      const val = value as string;
      displayText = customLabels && customLabels[val] ? customLabels[val] : val;
    }
  }

  const hasValue = multiple ? (value as string[]).length > 0 : !!value;

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="text-xs uppercase font-bold text-text-muted tracking-wider">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between pl-3 pr-2 py-2 text-xs font-bold rounded-lg border-2 transition-all outline-none
            ${hasValue || isOpen
              ? 'bg-brand/5 border-brand text-brand'
              : 'bg-surface border-border text-text-main hover:border-brand/30'}
          `}
        >
          <span className="truncate">{displayText}</span>
          <div className="flex items-center gap-1">
            {hasValue && (
              <div 
                onClick={clearSelection}
                className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full cursor-pointer transition-colors"
              >
                <X size={12} />
              </div>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-surface border border-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-border animate-in fade-in zoom-in-95 duration-200">
             {multiple && (
                <div 
                    onClick={() => onChange([])}
                    className="px-3 py-2 text-xs font-bold text-text-muted hover:bg-app/50 cursor-pointer uppercase tracking-wider sticky top-0 bg-surface z-10 border-b border-border"
                >
                    Clear All
                </div>
             )}
            {!multiple && (
                 <div
                    onClick={() => handleSelect('')}
                    className={`px-4 py-2 text-xs font-medium cursor-pointer hover:bg-brand/5 transition-colors ${!value ? 'text-brand font-bold bg-brand/5' : 'text-text-main'}`}
                 >
                    {placeholder}
                 </div>
            )}
            {options.map(opt => {
              const isSelected = multiple 
                ? (value as string[]).includes(opt) 
                : value === opt;

              // Calculate badge count
              const count = counts ? counts[opt] || 0 : 0;
              const hasCount = counts && count > 0;

              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`
                    px-4 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between group
                    ${isSelected ? 'bg-brand/5 text-brand font-bold' : 'text-text-main hover:bg-app'}
                  `}
                >
                  <span className="flex-1">
                    {customLabels && customLabels[opt] ? customLabels[opt] : opt}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Count Badge */}
                    {hasCount && (
                        <span className={`
                           text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                           ${isSelected 
                             ? 'bg-brand text-white' 
                             : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'}
                        `}>
                           {count > 99 ? '99+' : count}
                        </span>
                    )}
                    
                    {/* Checkmark */}
                    {isSelected && <Check size={14} className="flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
