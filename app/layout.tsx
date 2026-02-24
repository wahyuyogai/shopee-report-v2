
'use client';

import React from 'react';
import { LayoutShell } from '../components/LayoutShell';
import { ThemeProvider } from '../components/ThemeProvider';
import { DataProvider } from '../components/DataProvider';
import { UIProvider } from '../components/UIProvider';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { LoginScreen } from '../components/LoginScreen';

function AppContent({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <DataProvider>
      <LayoutShell>
        {children}
      </LayoutShell>
    </DataProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <title>Shopee Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            /* Default (Light Mode Base) */
            --bg-app: #f3f4f6;
            --bg-surface: #ffffff;
            --bg-sidebar: #ffffff;
            --border: #e5e7eb;
            --text-main: #111827;     /* Dark Gray text for Light bg */
            --text-muted: #6b7280;    /* Muted Gray text */
            --brand: #4f46e5;
            --brand-muted: #eef2ff;
            --text-on-brand: #ffffff;
            --radius: 12px;
            --border-width: 2px;
            --border-style: solid;
            --surface-blur: 0px;
            --neo-shadow: none;
            --app-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }

          /* --- EXISTING THEMES --- */
          .dark {
            --bg-app: #030712;
            --bg-surface: #111827;
            --bg-sidebar: #030712;
            --border: #1f2937;
            --text-main: #f9fafb;     /* White/Light Gray text for Dark bg */
            --text-muted: #9ca3af;
            --brand: #6366f1;
            --brand-muted: rgba(99, 102, 241, 0.1);
            --text-on-brand: #ffffff;
          }
          
          .theme-indigo {
            --bg-app: #0f172a;
            --bg-surface: #1e293b;
            --bg-sidebar: #0f172a;
            --border: #334155;
            --text-main: #f1f5f9;     /* FIX: Light Slate text */
            --text-muted: #94a3b8;    /* FIX: Muted Slate text */
            --brand: #818cf8;
            --brand-muted: rgba(129, 140, 248, 0.1);
            --text-on-brand: #0f172a;
          }

          .theme-emerald {
            --bg-app: #064e3b;
            --bg-surface: #065f46;
            --bg-sidebar: #022c22;
            --border: #067456;
            --text-main: #ecfdf5;     /* FIX: Light Mint text */
            --text-muted: #6ee7b7;    /* FIX: Muted Green text */
            --brand: #34d399;
            --brand-muted: rgba(52, 211, 153, 0.1);
            --text-on-brand: #022c22;
          }

          /* --- NEW THEMES --- */
          
          /* Facebook (Light Base) */
          .theme-facebook {
            --bg-app: #F0F2F5;
            --bg-surface: #ffffff;
            --bg-sidebar: #ffffff;
            --border: #dfe3ee;
            --text-main: #1c1e21;
            --text-muted: #65676b;
            --brand: #1877F2;
            --brand-muted: #e7f3ff;
            --text-on-brand: #ffffff;
          }

          /* Shopee (Light Base) */
          .theme-shopee {
            --bg-app: #f5f5f5;
            --bg-surface: #ffffff;
            --bg-sidebar: #ffffff;
            --border: #e5e7eb;
            --text-main: #222222;
            --text-muted: #757575;
            --brand: #EE4D2D;
            --brand-muted: #fff1f0;
            --text-on-brand: #ffffff;
          }

          /* Instagram (Light Base) */
          .theme-instagram {
            --bg-app: #fafafa;
            --bg-surface: #ffffff;
            --bg-sidebar: #ffffff;
            --border: #dbdbdb;
            --text-main: #262626;
            --text-muted: #8e8e8e;
            --brand: #d62976; /* Magenta Pink */
            --brand-muted: #fce7f3;
            --text-on-brand: #ffffff;
          }

          /* Indomaret (Light Base) */
          .theme-indomaret {
            --bg-app: #f1f5f9;
            --bg-surface: #ffffff;
            --bg-sidebar: #ffffff;
            --border: #cbd5e1;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --brand: #005DA6; /* Indomaret Blue */
            --brand-muted: #e0f2fe;
            --text-on-brand: #ffffff;
          }
          
          /* Alfamart (Light Base) */
          .theme-alfamart {
            --bg-app: #fff1f2;
            --bg-surface: #ffffff;
            --bg-sidebar: #ffffff;
            --border: #fecdd3;
            --text-main: #881337;
            --text-muted: #9f1239;
            --brand: #D71116; /* Alfamart Red */
            --brand-muted: #ffe4e6;
            --text-on-brand: #ffffff;
          }

          /* TikTok (Dark Base) */
          .theme-tiktok {
            --bg-app: #121212;
            --bg-surface: #1e1e1e;
            --bg-sidebar: #121212;
            --border: #2f2f2f;
            --text-main: #ffffff;     /* Explicit White */
            --text-muted: #8b8b8b;
            --brand: #FE2C55; /* TikTok Red/Pink */
            --brand-muted: rgba(254, 44, 85, 0.1);
            --text-on-brand: #ffffff;
          }

          /* Netflix (Dark Base) */
          .theme-netflix {
            --bg-app: #000000;
            --bg-surface: #141414;
            --bg-sidebar: #000000;
            --border: #333333;
            --text-main: #e5e5e5;     /* Explicit Light Gray */
            --text-muted: #808080;
            --brand: #E50914; /* Netflix Red */
            --brand-muted: rgba(229, 9, 20, 0.1);
            --text-on-brand: #ffffff;
          }

          /* Gradient (Dark Purple Base) */
          .theme-gradient {
            --bg-app: #0f0c29;
            --bg-surface: #24243e; /* Gradient actually applied via CSS classes later if needed, but keeping solid for text readable */
            --bg-sidebar: #0f0c29;
            --border: #4a4a6a;
            --text-main: #ffffff;     /* Explicit White */
            --text-muted: #a6a6c3;
            --brand: #7b4397; 
            --brand-muted: rgba(123, 67, 151, 0.2);
            --text-on-brand: #ffffff;
          }
          
          /* Specific overrides for Gradient Theme to make it pop */
          .theme-gradient body {
            background: linear-gradient(to right, #0f0c29, #302b63, #24243e);
            background-attachment: fixed;
          }
          .theme-gradient .bg-surface {
             background-color: rgba(36, 36, 62, 0.7) !important;
             backdrop-filter: blur(10px);
          }

          /* --- UI MODES --- */

          .ui-glass {
            --bg-surface: rgba(255, 255, 255, 0.7);
            --surface-blur: 12px;
          }
          .dark.ui-glass, 
          .theme-indigo.ui-glass,
          .theme-tiktok.ui-glass,
          .theme-netflix.ui-glass,
          .theme-gradient.ui-glass { 
             --bg-surface: rgba(17, 24, 39, 0.6); 
          }
          .theme-emerald.ui-glass { --bg-surface: rgba(6, 95, 70, 0.5); }

          .ui-neo {
            --border: #000000;
            --border-width: 3px;
            --neo-shadow: 4px 4px 0px 0px #000000;
            --app-shadow: none !important;
          }
          /* Dark themes needs white border in Neo mode */
          .dark.ui-neo, 
          .theme-netflix.ui-neo, 
          .theme-tiktok.ui-neo,
          .theme-gradient.ui-neo,
          .theme-indigo.ui-neo,
          .theme-emerald.ui-neo { 
             --border: #ffffff; --neo-shadow: 4px 4px 0px 0px #ffffff; 
          }

          body {
            background-color: var(--bg-app);
            color: var(--text-main);
            min-height: 100vh;
          }
          
          * {
            border-color: var(--border);
            border-width: 0;
            transition-property: background-color, border-color, color, border-radius, border-width, box-shadow;
            transition-duration: 300ms;
          }

          .bg-surface { 
            background-color: var(--bg-surface) !important;
            backdrop-filter: blur(var(--surface-blur));
          }

          .shadow-sm, .shadow-lg, .shadow-md, .shadow-xl {
             box-shadow: var(--app-shadow) !important;
          }
          
          .ui-neo .shadow-sm, .ui-neo .shadow-lg, .ui-neo .shadow-md, .ui-neo .shadow-xl {
            box-shadow: var(--neo-shadow) !important;
          }

          .rounded-xl { border-radius: var(--radius) !important; }
          .rounded-lg { border-radius: calc(var(--radius) * 0.75) !important; }
          
          .border { 
            border-width: var(--border-width) !important; 
            border-style: var(--border-style) !important;
          }
          .border-2 { 
            border-width: calc(var(--border-width) * 1.5) !important; 
            border-style: var(--border-style) !important;
          }
          .border-b { 
            border-bottom-width: var(--border-width) !important; 
            border-style: var(--border-style) !important;
          }
          .border-r { 
            border-right-width: var(--border-width) !important; 
            border-style: var(--border-style) !important;
          }

          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{__html: `
          window.tailwind = window.tailwind || {};
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                fontFamily: { sans: ['Montserrat', 'sans-serif'] },
                // Custom Font Sizes (Scaled Up by ~10-15%)
                fontSize: {
                  xs: ['0.8125rem', { lineHeight: '1.25rem' }], // ~13px
                  sm: ['0.9375rem', { lineHeight: '1.375rem' }], // ~15px
                  base: ['1.0625rem', { lineHeight: '1.625rem' }], // ~17px
                  lg: ['1.1875rem', { lineHeight: '1.75rem' }], // ~19px
                  xl: ['1.375rem', { lineHeight: '1.875rem' }], // ~22px
                  '2xl': ['1.625rem', { lineHeight: '2.125rem' }], // ~26px
                  '3xl': ['2rem', { lineHeight: '2.375rem' }], // ~32px
                  '4xl': ['2.5rem', { lineHeight: '2.75rem' }], // ~40px
                  '5xl': ['3.25rem', { lineHeight: '1' }],
                },
                colors: {
                  app: 'var(--bg-app)',
                  surface: 'var(--bg-surface)',
                  sidebar: 'var(--bg-sidebar)',
                  border: 'var(--border)',
                  brand: 'var(--brand)',
                  'brand-muted': 'var(--brand-muted)',
                  'brand-content': 'var(--text-on-brand)',
                  'text-main': 'var(--text-main)',
                  'text-muted': 'var(--text-muted)',
                }
              }
            }
          }
        `}} />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ThemeProvider>
            <UIProvider>
                <AppContent>
                  {children}
                </AppContent>
            </UIProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
