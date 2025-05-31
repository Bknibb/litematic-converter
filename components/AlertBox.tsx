'use client';

import { useEffect, useState } from 'react';

interface AlertBoxProps {
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  onClose?: () => void;
  duration?: number; // in ms
  popup?: boolean;   // ⬅️ New
}

const typeStyles = {
  error: 'bg-red-100 border-red-400 text-red-700',
  warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
  success: 'bg-green-100 border-green-400 text-green-700',
  info: 'bg-blue-100 border-blue-400 text-blue-700',
};

export default function AlertBox({
  message,
  type = 'info',
  onClose,
  duration = 4000,
  popup = false
}: AlertBoxProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!popup) {
      const timeout = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [duration, onClose, popup]);

  if (!visible) return null;

  const alertContent = (
    <div
      className={`border-l-4 p-4 rounded-md shadow-md transition-all
        ${typeStyles[type]}
        ${popup ? 'max-w-md w-full text-center' : 'w-full max-w-xl mx-auto mt-4'}
      `}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium pr-4">{message}</p>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="text-2xl font-bold leading-none text-inherit hover:text-black/60 transition ml-4"
          aria-label="Close alert"
        >
          &times;
        </button>
      </div>
    </div>
  );

  if (!popup) return alertContent;

  // Wrap with modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {alertContent}
    </div>
  );
}
