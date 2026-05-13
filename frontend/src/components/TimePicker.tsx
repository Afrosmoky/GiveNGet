"use client";

import React from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className = "" }: TimePickerProps) {
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
    <div className={`flex gap-2 ${className}`}>
      {/* Hours dropdown */}
      <select
        value={hours}
        onChange={(e) => handleHourChange(Number(e.target.value))}
        className="w-20 p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-200 rounded-lg transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none cursor-pointer bg-white text-center"
      >
        {hourOptions.map(hour => (
          <option key={hour} value={hour}>
            {hour.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      
      {/* Separator */}
      <div className="flex items-center text-gray-500 font-bold text-lg">
        :
      </div>
      
      {/* Minutes dropdown */}
      <select
        value={minutes}
        onChange={(e) => handleMinuteChange(Number(e.target.value))}
        className="w-20 p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-200 rounded-lg transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none cursor-pointer bg-white text-center"
      >
        {minuteOptions.map(minute => (
          <option key={minute} value={minute}>
            {minute.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
} 