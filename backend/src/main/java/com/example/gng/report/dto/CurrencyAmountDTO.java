package com.example.gng.report.dto;

import java.math.BigDecimal;

/**
 * Wartość uratowanego towaru w jednej walucie.
 *
 * Nie sumujemy różnych walut do jednej liczby — nie mamy kursów, a wynik byłby
 * zmyśleniem. Klient dostaje rozbicie i sam decyduje, co z nim zrobić.
 */
public record CurrencyAmountDTO(String currency, BigDecimal amount) {
}
