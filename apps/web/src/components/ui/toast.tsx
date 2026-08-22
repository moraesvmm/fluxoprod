'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose?: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-500/10',
    borderColor: 'border-green-200 dark:border-green-500/20',
    textColor: 'text-green-800 dark:text-green-500',
    iconColor: 'text-green-500'
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-500/20',
    textColor: 'text-red-800 dark:text-red-500',
    iconColor: 'text-red-500'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-500/20',
    textColor: 'text-blue-800 dark:text-blue-500',
    iconColor: 'text-blue-500'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500'
  }
};

export function Toast({ message, type, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50
      flex items-center gap-3 px-4 py-3 rounded-lg border
      ${config.bgColor} ${config.borderColor} ${config.textColor}
      shadow-lg animate-in slide-in-from-right duration-300
    `}>
      <Icon className={`h-5 w-5 ${config.iconColor}`} />
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hook para usar toasts facilmente
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    info: (message: string) => showToast(message, 'info'),
    warning: (message: string) => showToast(message, 'warning')
  };
}
