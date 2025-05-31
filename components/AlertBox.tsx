'use client';

import { useEffect, useState } from 'react';

interface AlertBoxProps {
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  onClose?: () => void;
  duration?: number; // in ms
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
  duration = 4000
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

  return (
    <div
      className={`border-l-4 p-4 rounded-md shadow-md max-w-xl mx-auto mt-4 transition-all ${typeStyles[type]}`}
    >
      <div className="flex items-center justify-between">
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
}
