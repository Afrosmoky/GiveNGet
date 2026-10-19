"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { environment } from '../config';
import { authorizedFetch, getUserLocation, updateUserData } from '../utils/auth';

/** Podpowiedź miejscowości z proxy Geoapify (/api/geocode/search). */
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

export interface Coords {
  lat: number;
  lon: number;
}

/** Spokojny komunikat pod polem lokalizacji — „info” to stan, nie błąd. */
export interface LocationNotice {
  tone: 'info' | 'warning';
  text: string;
}

const GPS_LABEL = 'Twoja lokalizacja (GPS)';
const SAVED_LABEL = 'Zapisana lokalizacja';
const MIN_QUERY = 3;

interface Options {
  /** Startuj od lokalizacji zapisanej w profilu/przeglądarce (getUserLocation). */
  useSavedLocation?: boolean;
}

/**
 * Wybór lokalizacji: pole „wpisz miasto” (Geoapify przez backend) + GPS z przeglądarki.
 *
 * Odmowa GPS albo niedziałające geokodowanie to normalne sytuacje, nie awarie — zwracamy
 * spokojny komunikat (`notice`), a pole miasta zostaje dostępne. Lokalnie Geoapify odpowiada
 * 401 (martwy klucz w .env), na VPS z ważnym GEOAPIFY_KEY wyszukiwanie miast działa.
 */
export function useLocationPicker({ useSavedLocation = false }: Options = {}) {
  const [input, setInputState] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [gpsPending, setGpsPending] = useState(false);
  const [notice, setNotice] = useState<LocationNotice | null>(null);
  /** Wartość wpisana przez program (GPS, podpowiedź, zapisana pozycja) — jej nie wyszukujemy. */
  const programmaticValue = useRef<string | null>(null);

  useEffect(() => {
    if (!useSavedLocation) return;
    const saved = getUserLocation();
    // getUserLocation zwraca 0,0, gdy nic nie zapisano — to nie jest prawdziwa pozycja
    if (saved.lat && saved.lon) {
      programmaticValue.current = SAVED_LABEL;
      setInputState(SAVED_LABEL);
      setCoords({ lat: saved.lat, lon: saved.lon });
    }
  }, [useSavedLocation]);

  const setInput = useCallback((value: string) => {
    programmaticValue.current = null;
    setInputState(value);
    setNotice(null);
    // Pozycję kasuje dopiero użytkownik, czyszcząc pole — nie efekt przy montowaniu,
    // bo ten nadpisałby zapisaną lokalizację ustawioną w tym samym cyklu
    if (value.trim().length === 0) setCoords(null);
  }, []);

  const apply = useCallback((next: Coords, label: string) => {
    programmaticValue.current = label;
    setInputState(label);
    setCoords(next);
    setSuggestions([]);
    setShowSuggestions(false);
    setNotice(null);
    // Następne wejście (mapa, wyszukiwarka) zacznie od tej pozycji
    updateUserData({ lat: next.lat, lon: next.lon });
  }, []);

  // Wyszukiwanie miejscowości z opóźnieniem
  useEffect(() => {
    if (programmaticValue.current !== null && input === programmaticValue.current) {
      return;
    }
    const query = input.trim();
    if (query.length < MIN_QUERY) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setGeocoding(true);
      try {
        const response = await authorizedFetch(
          `${environment.apiUrl}/api/geocode/search?text=${encodeURIComponent(query)}`
        );
        if (cancelled) return;
        if (!response.ok) {
          setSuggestions([]);
          setShowSuggestions(false);
          setNotice({
            tone: 'warning',
            text: 'Wyszukiwanie miejscowości jest chwilowo niedostępne. Użyj GPS albo spróbuj za chwilę.',
          });
          return;
        }
        const data = (await response.json()) as LocationSuggestion[];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setNotice(data.length === 0 ? { tone: 'info', text: `Nie znaleźliśmy „${query}”. Sprawdź nazwę miejscowości.` } : null);
      } catch {
        if (!cancelled) {
          setNotice({ tone: 'warning', text: 'Brak połączenia — nie udało się wyszukać miejscowości.' });
        }
      } finally {
        if (!cancelled) setGeocoding(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input]);

  const selectSuggestion = useCallback(
    (suggestion: LocationSuggestion) => apply({ lat: suggestion.lat, lon: suggestion.lon }, suggestion.formatted),
    [apply]
  );

  /** Pozycja z GPS przeglądarki; nazwę miejscowości dopisuje reverse geocoding, gdy działa. */
  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setNotice({ tone: 'info', text: 'Ta przeglądarka nie udostępnia GPS. Wpisz miasto.' });
      return;
    }
    setGpsPending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { lat: position.coords.latitude, lon: position.coords.longitude };
        let label = GPS_LABEL;
        try {
          const response = await authorizedFetch(
            `${environment.apiUrl}/api/geocode/reverse?lat=${next.lat}&lon=${next.lon}`
          );
          if (response.ok) {
            const data = (await response.json()) as Partial<LocationSuggestion>;
            if (data.formatted) label = data.formatted;
          }
        } catch {
          // Bez nazwy też działa — współrzędne wystarczą do wyszukiwania
        }
        apply(next, label);
        setGpsPending(false);
      },
      (error) => {
        setGpsPending(false);
        setNotice({
          tone: 'info',
          text:
            error.code === error.PERMISSION_DENIED
              ? 'Podaj lokalizację — wpisz miasto albo użyj GPS po zezwoleniu na dostęp do lokalizacji w przeglądarce.'
              : 'Nie udało się ustalić pozycji GPS. Podaj lokalizację — wpisz miasto.',
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, [apply]);

  return {
    input,
    setInput,
    coords,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    selectSuggestion,
    geocoding,
    requestGps,
    gpsPending,
    notice,
  };
}
