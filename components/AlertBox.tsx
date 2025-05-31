'use client';

import { useEffect, useState } from 'react';

type AlertMode = 'normal' | 'popup' | 'bottom';

interface AlertBoxProps {
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  onClose?: () => void;
  duration?: number; // in ms
  mode?: AlertMode;
  className?: string;
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
  mode = 'normal',
  className = '',
}: AlertBoxProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timeout);
  }, [duration, onClose]);

  if (!visible) return null;

  const baseClasses = `border-l-4 p-4 rounded-md shadow-md transition-all ${typeStyles[type]} ${className}`;

  const alertContent = (
    <div
      className={`${baseClasses} ${
        mode === 'popup'
          ? 'max-w-md w-full text-center'
          : 'w-full max-w-xl mx-auto'
      }`}
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

  // Render different modes
  if (mode === 'popup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        {alertContent}
      </div>
    );
  }

  if (mode === 'bottom') {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full px-4">
        {alertContent}
      </div>
    );
  }

  // Normal inline
  return <div className="mt-4">{alertContent}</div>;
}
