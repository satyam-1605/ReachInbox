import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
}) => {
  const iconConfig = {
    success: { icon: CheckCircle2, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
    error: { icon: AlertCircle, color: 'text-rose-800 bg-rose-50 border-rose-200' },
    info: { icon: Info, color: 'text-primary-800 bg-primary-50 border-primary-200' },
  }[type];

  const Icon = iconConfig.icon;

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 px-4 py-3 border rounded-xl shadow-lg ${iconConfig.color} text-sm`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
