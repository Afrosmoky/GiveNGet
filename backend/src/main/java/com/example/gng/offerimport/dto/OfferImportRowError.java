package com.example.gng.offerimport.dto;

/**
 * Błąd pojedynczego wiersza importu.
 *
 * @param wiersz  numer wiersza tak, jak widzi go użytkownik w Excelu (nagłówek = 1)
 * @param code    stabilny kod maszynowy (CLAUDE.md 6.3) — klient rozgałęzia się po nim
 * @param message komunikat dla użytkownika (PL)
 */
public record OfferImportRowError(int wiersz, String code, String message) {
}
