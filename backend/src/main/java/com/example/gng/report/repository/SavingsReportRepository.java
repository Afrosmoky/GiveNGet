package com.example.gng.report.repository;

import com.example.gng.reservation.entity.ReservationEntity;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Zapytania agregujące pod raport oszczędności.
 *
 * <p>Raport nie ma własnej encji — liczymy z rezerwacji przez
 * {@code reservation → offer → offer.user} (firma wystawiająca ofertę), bez denormalizacji
 * {@code store_id}. Osobne repozytorium, a nie dopisek do {@code ReservationRepository},
 * żeby agregaty raportowe nie mieszały się z operacjami domeny rezerwacji; Spring Data
 * dopuszcza wiele repozytoriów nad jedną encją.
 *
 * <p>Wszystko liczymy zapytaniem — rezerwacje nigdy nie są ładowane do pamięci, bo przy
 * pilotażu sieci handlowej ich liczba rośnie liniowo z obrotem.
 *
 * <p><b>Wliczamy wyłącznie status COLLECTED</b> — tylko potwierdzony odbiór oznacza,
 * że towar faktycznie został uratowany. RESERVED to obietnica, EXPIRED i CANCELLED
 * to jej brak.
 */
public interface SavingsReportRepository extends Repository<ReservationEntity, String> {

    /**
     * Łączna liczba uratowanych sztuk.
     *
     * Granice czasowe są zawsze konkretne (serwis podstawia szerokie zamiast null), więc
     * zapytanie nie potrzebuje warunków na NULL dla daty. {@code storeId} pozostaje
     * opcjonalny i zawęża wynik do jednej firmy.
     */
    @Query("""
           SELECT COALESCE(SUM(r.quantity), 0)
           FROM ReservationEntity r
           WHERE r.status = com.example.gng.reservation.entity.ReservationStatus.COLLECTED
             AND r.collectedAt >= :from
             AND r.collectedAt <= :to
             AND (:storeId IS NULL OR r.offer.user.id = :storeId)
           """)
    long sumCollectedQuantity(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              @Param("storeId") Long storeId);

    /**
     * Liczba potwierdzonych odbiorów (rezerwacji COLLECTED) w zakresie {@code collectedAt}.
     * Ta sama definicja co {@link #sumCollectedQuantity} — liczy rezerwacje zamiast sztuk.
     */
    @Query("""
           SELECT COUNT(r)
           FROM ReservationEntity r
           WHERE r.status = com.example.gng.reservation.entity.ReservationStatus.COLLECTED
             AND r.collectedAt >= :from
             AND r.collectedAt <= :to
             AND (:storeId IS NULL OR r.offer.user.id = :storeId)
           """)
    long countCollected(@Param("from") LocalDateTime from,
                        @Param("to") LocalDateTime to,
                        @Param("storeId") Long storeId);

    /**
     * Wartość uratowanego towaru w rozbiciu na waluty ofert: pary [currency, suma].
     *
     * Pomijamy oferty bez ceny albo bez waluty — dziś to wszystkie oferty w bazie, bo
     * {@code price} i {@code currency} nie są nigdzie ustawiane przy tworzeniu oferty.
     * Bez tego warunku SUM po grupie NULL dawałby wiersz bez waluty, czyli liczbę,
     * której nie da się zinterpretować.
     *
     * Sortowanie po walucie dla deterministycznego wyniku (CLAUDE.md 6.4).
     */
    @Query("""
           SELECT o.currency, COALESCE(SUM(r.quantity * o.price), 0)
           FROM ReservationEntity r
           JOIN r.offer o
           WHERE r.status = com.example.gng.reservation.entity.ReservationStatus.COLLECTED
             AND r.collectedAt >= :from
             AND r.collectedAt <= :to
             AND (:storeId IS NULL OR o.user.id = :storeId)
             AND o.price IS NOT NULL
             AND o.currency IS NOT NULL
           GROUP BY o.currency
           ORDER BY o.currency ASC
           """)
    List<Object[]> sumCollectedValueByCurrency(@Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to,
                                               @Param("storeId") Long storeId);
}
