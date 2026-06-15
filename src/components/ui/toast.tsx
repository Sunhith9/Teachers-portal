'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 min-w-[320px]',
                {
                  'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/80 dark:border-emerald-700 dark:text-emerald-200': toast.type === 'success',
                  'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/80 dark:border-red-700 dark:text-red-200': toast.type === 'error',
                  'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/80 dark:border-amber-700 dark:text-amber-200': toast.type === 'warning',
                  'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/80 dark:border-blue-700 dark:text-blue-200': toast.type === 'info',
                }
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
