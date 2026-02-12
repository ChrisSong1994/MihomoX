'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // 3秒后自动移除
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[300px] max-w-md
              animate-in slide-in-from-right-full duration-300
              ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : ''}
              ${toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : ''}
              ${toast.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : ''}
              ${toast.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
