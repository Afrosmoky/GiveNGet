package com.example.gng.common.time;

import com.example.gng.common.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Granice zakresu dni dla zapytań agregujących (raport oszczędności, statystyki platformy). */
class UtcDayRangeTest {

    @Test
    void daysBecomeInclusiveUtcBounds() {
        UtcDayRange range = UtcDayRange.of(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));

        assertEquals(LocalDateTime.of(2026, 10, 1, 0, 0), range.start());
        assertEquals(LocalDate.of(2026, 10, 31).atTime(LocalTime.MAX), range.end(), "ostatni dzień w całości");
    }

    @Test
    void missingBoundsAreWideConcreteValues() {
        UtcDayRange range = UtcDayRange.of(null, null);

        assertEquals(UtcDayRange.OPEN_START, range.start());
        assertEquals(UtcDayRange.OPEN_END, range.end());
        assertEquals(null, range.from());
        assertEquals(null, range.to());
    }

    @Test
    void singleDayRangeIsAllowed() {
        LocalDate day = LocalDate.of(2026, 10, 9);
        UtcDayRange range = UtcDayRange.of(day, day);
        assertEquals(day.atStartOfDay(), range.start());
    }

    @Test
    void invertedRangeIsRejected() {
        ApiException ex = assertThrows(ApiException.class,
                () -> UtcDayRange.of(LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 1)));
        assertEquals("INVALID_DATE_RANGE", ex.getCode());
    }
}
