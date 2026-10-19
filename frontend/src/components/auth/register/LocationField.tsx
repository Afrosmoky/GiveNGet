"use client";

import type { ChangeEvent, FocusEvent } from 'react';
import { LuLocateFixed, LuMapPin } from 'react-icons/lu';
import { IconButton, Input, Spinner } from '../../ui';

export interface LocationSuggestion {
  country: string;
  country_code: string;
  state: string;
  county: string | null;
  city: string;
  lon: number;
  lat: number;
  formatted: string;
}

interface LocationFieldProps {
  value: string;
  error?: string;
  hint?: string;
  searching: boolean;
  suggestions: LocationSuggestion[];
  showSuggestions: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
  onOpenMap: () => void;
}

/**
 * Pole lokalizacji z podpowiedziami (geokodowanie) i wyborem na mapie. Tylko widok — stan,
 * wyszukiwanie z debounce i walidacja zostają w formularzu rejestracji.
 */
export function LocationField({
  value,
  error,
  hint,
  searching,
  suggestions,
  showSuggestions,
  onChange,
  onBlur,
  onSelectSuggestion,
  onOpenMap,
}: LocationFieldProps) {
  return (
    <div className="relative">
      <Input
        label="Lokalizacja"
        type="text"
        name="localization"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="Wpisz adres albo wybierz na mapie"
        autoComplete="off"
        error={error || undefined}
        hint={hint}
        leftIcon={<LuMapPin size={16} />}
        rightSlot={
          <span className="flex items-center gap-1">
            {searching && <Spinner className="h-4 w-4 text-ink-subtle" label="Szukam adresu" />}
            <IconButton
              label="Wybierz lokalizację na mapie"
              icon={<LuLocateFixed size={18} />}
              onClick={onOpenMap}
              className="h-8 w-8"
            />
          </span>
        }
        className={searching ? 'pr-16' : undefined}
      />
      {showSuggestions && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-ui-md border border-line bg-surface py-1 shadow-pop">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-ink hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
              >
                <LuMapPin size={14} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden />
                {suggestion.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
