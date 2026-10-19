package com.example.gng.notification.push;

/** Wynik pojedynczej próby wysłania pusha na jeden token urządzenia. */
public enum PushSendResult {
    SENT,
    /** Token martwy (wyrejestrowany, nieprawidłowy, z innego projektu) — do usunięcia. */
    INVALID_TOKEN,
    /** Błąd przejściowy po stronie dostawcy (niedostępność, limit) — warto ponowić. */
    TRANSIENT_ERROR,
    /** Błąd, którego ponowienie nie naprawi (np. zła konfiguracja wiadomości). */
    PERMANENT_ERROR,
    /** Wysyłka wyłączona — brak klucza serwisowego Firebase. */
    DISABLED
}
