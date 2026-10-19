"use client";

import type { Ref } from 'react';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { LuInfo, LuTriangleAlert } from 'react-icons/lu';
import { IconButton, Input, Spinner, cn } from '../ui';
import type { useLocationPicker } from '../../hooks/useLocationPicker';

type Picker = ReturnType<typeof useLocationPicker>;

interface LocationFieldProps {
  picker: Picker;
  label?: string;
  /** Błąd walidacji z formularza (np. „Szukaj” bez lokalizacji). */
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Pole „wpisz miasto albo użyj GPS”. Komunikaty o odmowie GPS i niedziałającym geokodowaniu
 * są spokojne (info/ostrzeżenie pod polem) — nie blokują widoku i nie wyglądają jak awaria.
 */
export function LocationField({ picker, label = 'Lokalizacja', error, inputRef, size = 'md', className }: LocationFieldProps) {
  const { input, setInput, suggestions, showSuggestions, setShowSuggestions, selectSuggestion, geocoding, requestGps, gpsPending, notice } =
    picker;

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={inputRef}
        label={label}
        size={size}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="Wpisz miasto albo użyj GPS"
        autoComplete="off"
        error={error || undefined}
        rightSlot={
          <span className="flex items-center gap-1">
            {(geocoding || gpsPending) && <Spinner className="h-4 w-4 text-ink-subtle" />}
            <IconButton
              label="Użyj mojej lokalizacji (GPS)"
              icon={<FaLocationCrosshairs size={18} />}
              onClick={requestGps}
              disabled={gpsPending}
              className="h-8 w-8 hover:text-brand"
            />
          </span>
        }
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-ui-md border border-line bg-surface shadow-pop">
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.lat},${suggestion.lon},${suggestion.formatted}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => selectSuggestion(suggestion)}
                className="w-full border-b border-line px-4 py-3 text-left text-sm text-ink last:border-b-0 hover:bg-surface-muted"
              >
                {suggestion.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <p
          role="status"
          className={cn(
            'mt-2 flex items-start gap-2 rounded-ui-md px-3 py-2 text-xs leading-5',
            notice.tone === 'info' ? 'bg-surface-muted text-ink-muted' : 'bg-warning-soft text-warning'
          )}
        >
          {notice.tone === 'info' ? (
            <LuInfo size={14} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <LuTriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          )}
          {notice.text}
        </p>
      )}
    </div>
  );
}
