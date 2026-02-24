
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, BorderStyle, BorderWeight, UIMode, ShadowStyle, OutlineStyle } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  borderStyle: BorderStyle;
  setBorderStyle: (style: BorderStyle) => void;
  borderWeight: BorderWeight;
  setBorderWeight: (weight: BorderWeight) => void;
  outlineStyle: OutlineStyle;
  setOutlineStyle: (style: OutlineStyle) => void;
  uiMode: UIMode;
  setUiMode: (mode: UIMode) => void;
  shadowStyle: ShadowStyle;
  setShadowStyle: (style: ShadowStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [borderStyle, setBorderStyleState] = useState<BorderStyle>('modern');
  const [borderWeight, setBorderWeightState] = useState<BorderWeight>('regular');
  const [outlineStyle, setOutlineStyleState] = useState<OutlineStyle>('solid');
  const [uiMode, setUiModeState] = useState<UIMode>('standard');
  const [shadowStyle, setShadowStyleState] = useState<ShadowStyle>('subtle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    const savedBorder = localStorage.getItem('app-border-style') as BorderStyle;
    const savedWeight = localStorage.getItem('app-border-weight') as BorderWeight;
    const savedOutline = localStorage.getItem('app-outline-style') as OutlineStyle;
    const savedUiMode = localStorage.getItem('app-ui-mode') as UIMode;
    const savedShadow = localStorage.getItem('app-shadow-style') as ShadowStyle;
    
    if (savedTheme) setThemeState(savedTheme);
    if (savedBorder) setBorderStyleState(savedBorder);
    if (savedWeight) setBorderWeightState(savedWeight);
    if (savedOutline) setOutlineStyleState(savedOutline);
    if (savedUiMode) setUiModeState(savedUiMode);
    if (savedShadow) setShadowStyleState(savedShadow);
    
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  const setBorderStyle = (style: BorderStyle) => {
    setBorderStyleState(style);
    localStorage.setItem('app-border-style', style);
  };

  const setBorderWeight = (weight: BorderWeight) => {
    setBorderWeightState(weight);
    localStorage.setItem('app-border-weight', weight);
  };

  const setOutlineStyle = (style: OutlineStyle) => {
    setOutlineStyleState(style);
    localStorage.setItem('app-outline-style', style);
  };

  const setUiMode = (mode: UIMode) => {
    setUiModeState(mode);
    localStorage.setItem('app-ui-mode', mode);
  };

  const setShadowStyle = (style: ShadowStyle) => {
    setShadowStyleState(style);
    localStorage.setItem('app-shadow-style', style);
  };

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    
    // Clean all possible theme classes
    const allThemes = [
        'light', 'dark', 
        'theme-indigo', 'theme-emerald', 
        'theme-facebook', 'theme-shopee', 
        'theme-tiktok', 'theme-netflix', 
        'theme-indomaret', 'theme-alfamart', 
        'theme-instagram', 'theme-gradient'
    ];
    root.classList.remove(...allThemes);

    // Apply active theme
    if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      // For custom themes, check if they are based on dark mode usually
      // For this app logic, let's just add the theme class.
      // Some themes might need the 'dark' utility class from Tailwind for dark-mode specific overrides if configured in tailwind.config
      // For now, our layout CSS handles the variables.
      root.classList.add(`theme-${theme}`);
    }

    // UI Mode logic
    root.classList.remove('ui-standard', 'ui-glass', 'ui-neo');
    root.classList.add(`ui-${uiMode}`);

    // Shadow logic
    const shadowMap = {
      none: 'none',
      subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      floating: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
    };
    root.style.setProperty('--app-shadow', shadowMap[shadowStyle]);

    // Border Radius logic
    const radiusMap = { sharp: '0px', modern: '12px', soft: '24px' };
    root.style.setProperty('--radius', radiusMap[borderStyle]);

    // Border Weight logic
    const weightMap = { thin: '1px', regular: '2px', bold: '3px' };
    root.style.setProperty('--border-width', weightMap[borderWeight]);

    // Outline Style logic (Mapping internal types to CSS border-style)
    const outlineMap: Record<string, string> = {
      solid: 'solid',
      dashed: 'dashed',
      dotted: 'dotted',
      double: 'double',
      transparent: 'none',
      'shadow-wrapper': 'groove' // Using groove to simulate a wrapper/frame effect
    };
    root.style.setProperty('--border-style', outlineMap[outlineStyle] || 'solid');

  }, [theme, borderStyle, borderWeight, outlineStyle, uiMode, shadowStyle, mounted]);

  return (
    <ThemeContext.Provider value={{ 
      theme, setTheme, 
      borderStyle, setBorderStyle, 
      borderWeight, setBorderWeight,
      outlineStyle, setOutlineStyle,
      uiMode, setUiMode,
      shadowStyle, setShadowStyle
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
