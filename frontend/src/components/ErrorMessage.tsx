"use client";

import React, { useEffect, useState } from 'react';
import { LuCircleAlert, LuX } from 'react-icons/lu';
import { cn } from './ui';

interface ErrorMessageProps {
  message: string;
  onClose: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

/** Globalny komunikat błędu (toast) — renderowany przez ErrorContainer. */
export default function ErrorMessage({
  message,
  onClose,
  autoHide = true,
  autoHideDelay = 5000
}: ErrorMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 200); // Opóźnienie dla animacji
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Opóźnienie dla animacji
  };

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex w-full items-start gap-2.5 rounded-ui-lg border border-danger/30 bg-danger-soft px-4 py-3 text-danger shadow-pop transition-all duration-200 motion-safe:animate-toast-in',
        isVisible ? 'opacity-100' : '-translate-y-2 opacity-0'
      )}
    >
      <LuCircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Zamknij"
        className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      >
        <LuX size={16} />
      </button>
    </div>
  );
}
