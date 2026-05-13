"use client";

import React from 'react';

interface FreeOffersCounterProps {
  freeOffersCount: number;
  size?: 'small' | 'medium' | 'large';
  showWarning?: boolean;
  className?: string;
}

export const FreeOffersCounter: React.FC<FreeOffersCounterProps> = ({
  freeOffersCount,
  size = 'medium',
  showWarning = true,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-1 text-xs',
          text: 'text-xs',
          icon: 'text-xs'
        };
      case 'medium':
        return {
          container: 'px-3 py-1.5 text-sm',
          text: 'text-sm',
          icon: 'text-sm'
        };
      case 'large':
        return {
          container: 'px-4 py-2 text-base',
          text: 'text-base',
          icon: 'text-base'
        };
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          text: 'text-sm',
          icon: 'text-sm'
        };
    }
  };

  const getColorClasses = () => {
    if (freeOffersCount === 0) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300'
      };
    } else if (freeOffersCount <= 2) {
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300'
      };
    } else {
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300'
      };
    }
  };

  const sizes = getSizeClasses();
  const colors = getColorClasses();

  const getWarningMessage = () => {
    if (freeOffersCount === 0) {
      return "Brak darmowych ofert! Utwórz ofertę w następnym miesiącu lub rozważ boost.";
    } else if (freeOffersCount <= 2) {
      return "Pozostało tylko kilka darmowych ofert w tym miesiącu.";
    }
    return null;
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizes.container} ${className}`}>
      <span className={sizes.icon}>📝</span>
      <span className={`font-medium ${sizes.text}`}>
        {freeOffersCount} darmowych ofert
      </span>
      {showWarning && getWarningMessage() && (
        <div className="mt-1 text-xs opacity-75">
          {getWarningMessage()}
        </div>
      )}
    </div>
  );
};

export default FreeOffersCounter;
