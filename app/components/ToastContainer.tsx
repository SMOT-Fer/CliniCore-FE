'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '@/app/context/ToastContext';

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-900';
    case 'error':
      return 'bg-red-50 border-red-200 text-red-900';
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-900';
    case 'info':
    default:
      return 'bg-blue-50 border-blue-200 text-blue-900';
  }
};

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />;
    case 'info':
    default:
      return <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />;
  }
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function Toast({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  return (
    <div
      className={`
        animate-in fade-in slide-in-from-right-4 duration-300
        pointer-events-auto
        flex items-center gap-3 px-4 py-3 rounded-full
        border shadow-lg backdrop-blur-sm
        ${getToastStyles(toast.type)}
      `}
    >
      {getToastIcon(toast.type)}
      <p className="text-sm font-medium max-w-xs line-clamp-3">
        {toast.message}
      </p>
      <button
        onClick={onRemove}
        className="ml-2 p-0.5 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
