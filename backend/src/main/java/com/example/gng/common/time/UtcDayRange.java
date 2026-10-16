package com.example.gng.common.time;

import com.example.gng.common.exception.BadRequestException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Zakres dni z żądania zamieniony na twarde granice czasowe do zapytań agregujących.
 *
 * <p>Dni są dniami UTC (znaczniki czasu w bazie zapisujemy w UTC), oba końce włącznie.
 * Pominięty koniec zakresu zastępujemy granicą mieszczącą się w typie MySQL DATETIME
 * (1000-01-01 .. 9999-12-31), dzięki czemu zapytania nie potrzebują warunków na NULL.
 *
 * @param from  dzień początkowy z żądania albo null
 * @param to    dzień końcowy z żądania albo null
 * @param start początek zakresu do zapytania (włącznie)
 * @param end   koniec zakresu do zapytania (włącznie)
 */
public record UtcDayRange(LocalDate from, LocalDate to, LocalDateTime start, LocalDateTime end) {

    static final LocalDateTime OPEN_START = LocalDateTime.of(1000, 1, 1, 0, 0);
    static final LocalDateTime OPEN_END = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    /** @throws BadRequestException {@code INVALID_DATE_RANGE}, gdy {@code from} jest po {@code to} */
    public static UtcDayRange of(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw BadRequestException.invalidDateRange(from, to);
        }
        return new UtcDayRange(
                from, to,
                from != null ? from.atStartOfDay() : OPEN_START,
                to != null ? to.atTime(LocalTime.MAX) : OPEN_END);
    }
}
