
'use client';

import React, { useState } from 'react';
import { verifyLoginAction } from '../app/actions';
import { useAuth } from './AuthProvider';
import { Loader2, Lock, ShieldCheck, UserCircle } from 'lucide-react';
import { useUI } from './UIProvider';

export const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setRole } = useAuth();
  const { showToast } = useUI();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await verifyLoginAction(username, password);
      
      if (result.success && result.role) {
        setRole(result.role);
        showToast('success', 'Login Berhasil', `Selamat datang, ${result.role === 'super_admin' ? 'Super User' : 'Guest'}`);
      } else {
        showToast('error', 'Login Gagal', 'Username atau Password salah.');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Error', 'Terjadi kesalahan saat login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        <div className="bg-brand p-8 text-center text-brand-content">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold">Shopee Report</h1>
          <p className="text-brand-content/80 text-sm mt-1">Silahkan login untuk melanjutkan</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Username</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-app border border-border rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-medium text-text-main"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-app border border-border rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-medium text-text-main"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand text-brand-content rounded-xl font-bold shadow-lg shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Login'}
          </button>
        </form>
        
        <div className="px-8 pb-8 text-center">
            <p className="text-xs text-text-muted">
                System access is monitored. <br/>
                Unauthorized access is prohibited.
            </p>
        </div>
      </div>
    </div>
  );
};
