package com.example.gng.report.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Raport oszczędności (docs/01_MVP_ZAKRES.md — trzeci element przepływu pilotażu).
 *
 * @param from                 początek zakresu; null = od początku danych
 * @param to                   koniec zakresu; null = do teraz
 * @param storeId              firma, do której zawężono raport; null = cała platforma
 * @param savedProductsCount   liczba uratowanych sztuk — tylko rezerwacje odebrane
 * @param valueByCurrency      wartość w rozbiciu na waluty ofert; pusta, gdy oferty nie mają ceny
 * @param estimatedKg          szacowana masa: sztuki × średnia waga z konfiguracji
 * @param estimatedCo2Kg       szacowany ekwiwalent CO2: masa × współczynnik z konfiguracji
 * @param estimated            zawsze true — kg i CO2 są przybliżeniem opartym na stałych
 *                             na sztukę, identycznych dla chleba i dla zgrzewki wody.
 *                             Liczba sztuk i wartość są policzone, nie szacowane.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record SavingsReportDTO(
        LocalDate from,
        LocalDate to,
        Long storeId,
        long savedProductsCount,
        List<CurrencyAmountDTO> valueByCurrency,
        BigDecimal estimatedKg,
        BigDecimal estimatedCo2Kg,
        boolean estimated
) {
}
