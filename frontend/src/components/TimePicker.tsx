"use client";

import React from 'react';
import { LuChevronDown } from 'react-icons/lu';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
  /** Nazwa pola dla czytników ekranu, np. „Odbiór od”. */
  label?: string;
}

const selectClass =
  'h-10 w-full appearance-none rounded-ui-md border border-line bg-surface pl-3 pr-8 text-center text-sm text-ink transition-colors ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer';

export function TimePicker({ value, onChange, className = "", label }: TimePickerProps) {
  // Parse current value
  const [hours, minutes] = value.split(':').map(Number);

  // Generate options for hours (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  // Generate options for minutes (0, 5, 10, ..., 55)
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourChange = (newHour: number) => {
    const newTime = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleMinuteChange = (newMinute: number) => {
    const newTime = `${hours.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Hours dropdown */}
      <div className="relative flex-1">
        <select
          value={hours}
          onChange={(e) => handleHourChange(Number(e.target.value))}
          aria-label={label ? `${label} — godzina` : 'Godzina'}
          className={selectClass}
        >
          {hourOptions.map(hour => (
            <option key={hour} value={hour}>
              {hour.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        <LuChevronDown aria-hidden size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
      </div>

      {/* Separator */}
      <span className="font-semibold text-ink-muted">:</span>

      {/* Minutes dropdown */}
      <div className="relative flex-1">
        <select
          value={minutes}
          onChange={(e) => handleMinuteChange(Number(e.target.value))}
          aria-label={label ? `${label} — minuty` : 'Minuty'}
          className={selectClass}
        >
          {minuteOptions.map(minute => (
            <option key={minute} value={minute}>
              {minute.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        <LuChevronDown aria-hidden size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
      </div>
    </div>
  );
}
