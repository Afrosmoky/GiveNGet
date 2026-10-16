package com.example.gng.reservation.repository;

import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<ReservationEntity, String> {

    boolean existsByPickupCode(String pickupCode);

    Optional<ReservationEntity> findByPickupCode(String pickupCode);

    /**
     * Pobiera rezerwację po kodzie odbioru z pesymistyczną blokadą wiersza.
     *
     * Wymaga aktywnej transakcji. Bez blokady dwa równoczesne potwierdzenia tego samego
     * kodu (np. dubel kliknięcia w panelu albo dwa terminale) odczytałyby status RESERVED
     * i oba zapisały COLLECTED — towar zostałby wydany raz, a policzony dwa razy.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ReservationEntity r WHERE r.pickupCode = :pickupCode")
    Optional<ReservationEntity> findByPickupCodeForUpdate(@Param("pickupCode") String pickupCode);

    /**
     * Suma sztuk zajmujących stan magazynowy jednej oferty (sekcja 1 designu).
     *
     * Stan zajmują:
     * <ul>
     *   <li>{@code RESERVED}, którego termin jeszcze nie minął — hold trwa,</li>
     *   <li>{@code COLLECTED} — towar fizycznie wydany.</li>
     * </ul>
     * {@code EXPIRED} i {@code CANCELLED} stan zwalniają.
     *
     * Uwzględnienie COLLECTED jest istotne: bez tego potwierdzenie odbioru
     * „odblokowywałoby" sztuki, które już wyszły ze sklepu. {@code Offer.quantity}
     * pozostaje niezmienne — to pula wystawiona przez sprzedawcę.
     *
     * COALESCE, żeby brak rezerwacji dawał 0, a nie null.
     */
    @Query("""
           SELECT COALESCE(SUM(r.quantity), 0)
           FROM ReservationEntity r
           WHERE r.offer.id = :offerId
             AND (
                   (r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED AND r.expiresAt > :now)
                   OR r.status = com.example.gng.reservation.entity.ReservationStatus.COLLECTED
                 )
           """)
    int sumOccupiedQuantityByOfferId(@Param("offerId") String offerId, @Param("now") LocalDateTime now);

    /**
     * Wariant batchowy dla list ofert — jedno zapytanie na całą stronę wyników
     * zamiast zapytania na ofertę (analogicznie do sprawdzania ulubionych).
     * Zwraca pary [offerId, sumaSztuk] tylko dla ofert, które mają zajęty stan.
     */
    @Query("""
           SELECT r.offer.id, COALESCE(SUM(r.quantity), 0)
           FROM ReservationEntity r
           WHERE r.offer.id IN :offerIds
             AND (
                   (r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED AND r.expiresAt > :now)
                   OR r.status = com.example.gng.reservation.entity.ReservationStatus.COLLECTED
                 )
           GROUP BY r.offer.id
           """)
    List<Object[]> sumOccupiedQuantityByOfferIds(@Param("offerIds") Collection<String> offerIds,
                                                 @Param("now") LocalDateTime now);

    /**
     * Rezerwacje użytkownika. Sortowanie przekazuje Pageable — serwis wymusza
     * stabilny porządek (createdAt desc, id), bez którego infinite scroll na mobile
     * duplikuje i gubi rekordy (CLAUDE.md 6.4).
     */
    Page<ReservationEntity> findByUserId(Long userId, Pageable pageable);

    /**
     * Ile rezerwacji użytkownika trzyma w tej chwili towar.
     *
     * Liczy tylko RESERVED przed terminem — COLLECTED jest zakończone, a EXPIRED
     * i CANCELLED zwolniły stan. Podstawa twardego limitu jednoczesnych rezerwacji,
     * który chroni przed masowym zajmowaniem towaru i no-showami.
     */
    @Query("""
           SELECT COUNT(r)
           FROM ReservationEntity r
           WHERE r.user.id = :userId
             AND r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
             AND r.expiresAt > :now
           """)
    int countActiveByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Rezerwacje do wygaszenia przez scheduler: wciąż RESERVED, ale termin minął. */
    List<ReservationEntity> findByStatusAndExpiresAtLessThanEqual(ReservationStatus status, LocalDateTime now);
}
