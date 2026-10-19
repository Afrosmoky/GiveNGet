import { environment } from './environment';

/**
 * Adres backendu dla fetchy wykonywanych na serwerze Next (SSR, server components).
 *
 * `NEXT_PUBLIC_API_URL` to adres widziany z przeglądarki (np. http://localhost:8080) — z wnętrza
 * kontenera frontendu `localhost` wskazuje na sam kontener, więc fetch kończy się ECONNREFUSED.
 * W Dockerze ustawiamy `INTERNAL_API_URL=http://backend:8080` (sieć compose). Zmienna jest
 * czytana w czasie działania, nie przy buildzie, więc nie wymaga przebudowy obrazu.
 * Poza Dockerem (yarn dev) jej brak oznacza powrót do `apiUrl`.
 */
export function serverApiUrl(): string {
  return process.env.INTERNAL_API_URL || environment.apiUrl;
}
