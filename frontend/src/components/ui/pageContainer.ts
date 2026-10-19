/**
 * Szerokość i boczne marginesy stron publicznych (landing, rejestracja, treści statyczne,
 * pasek górny i stopka konsumenta). Jedno źródło prawdy — zmiana tu przesuwa wszystkie naraz,
 * więc logo w pasku, treść i stopka zawsze leżą w tej samej kolumnie.
 * Wyjątek: /login i ekrany statusowe (AuthCard) — celowo wąskie.
 */
export const pageContainer = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

/** Treść stron konsoli (panel firmy/admina, obok sidebara) — wspólne marginesy i max szerokość. */
export const consolePage = 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8';
