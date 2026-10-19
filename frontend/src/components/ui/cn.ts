/** Skleja klasy CSS, pomijając puste wartości. Bez tailwind-merge — warianty nie nakładają się. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
