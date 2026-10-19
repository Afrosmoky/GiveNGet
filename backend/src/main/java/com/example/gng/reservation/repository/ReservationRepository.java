package com.example.gng.reservation.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

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

    /**
     * Rezerwacje na oferty sklepu (panel firmy, docs/08 #8). Zakres po właścicielu oferty —
     * to jest sprawdzenie własności: firma nie dostanie rezerwacji na cudze oferty.
     *
     * <p>Filtr po statusie EFEKTYWNYM (jak w DTO): RESERVED po terminie, którego scheduler
     * jeszcze nie przestawił, liczy się jako EXPIRED, a nie RESERVED. Bez tego lista „aktywne”
     * pokazywałaby rezerwacje, które klient już stracił. {@code status = null} → wszystkie.
     *
     * <p>Oferta i klient dociągane jednym zapytaniem (nazwa oferty i imię klienta są w DTO).
     */
    @EntityGraph(attributePaths = {"offer", "user"})
    @Query("""
           SELECT r FROM ReservationEntity r
           WHERE r.offer.user.id = :storeId
             AND (
                   :status IS NULL
                   OR (:status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
                       AND r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
                       AND r.expiresAt > :now)
                   OR (:status = com.example.gng.reservation.entity.ReservationStatus.EXPIRED
                       AND (r.status = com.example.gng.reservation.entity.ReservationStatus.EXPIRED
                            OR (r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
                                AND r.expiresAt <= :now)))
                   OR (:status IN (com.example.gng.reservation.entity.ReservationStatus.COLLECTED,
                                   com.example.gng.reservation.entity.ReservationStatus.CANCELLED)
                       AND r.status = :status)
                 )
           """)
    Page<ReservationEntity> findForStore(@Param("storeId") Long storeId,
                                         @Param("status") ReservationStatus status,
                                         @Param("now") LocalDateTime now,
                                         Pageable pageable);

    /** Rezerwacje do wygaszenia przez scheduler: wciąż RESERVED, ale termin minął. */
    List<ReservationEntity> findByStatusAndExpiresAtLessThanEqual(ReservationStatus status, LocalDateTime now);

    // ------------------------------------------------------------------
    // Powiadomienia push (docs/08 #5)
    // ------------------------------------------------------------------

    /**
     * Kandydaci do ostrzeżenia o wygaśnięciu: aktywny hold kończący się w oknie
     * (now, until], bez wysłanego ostrzeżenia. Oferta i klient dociągnięte od razu —
     * scheduler buduje z nich treść powiadomienia poza transakcją.
     */
    @EntityGraph(attributePaths = {"offer", "user"})
    @Query("""
            SELECT r FROM ReservationEntity r
            WHERE r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
              AND r.expiresAt > :now AND r.expiresAt <= :until
              AND r.expiryWarningSentAt IS NULL
            """)
    List<ReservationEntity> findExpiryWarningCandidates(@Param("now") LocalDateTime now,
                                                        @Param("until") LocalDateTime until);

    /**
     * Kandydaci do przypomnienia o odbiorze: aktywny hold, utworzony przed {@code createdBefore}
     * (żeby nie dublować świeżego potwierdzenia), bez wysłanego przypomnienia. Czy okno
     * odbioru oferty jest właśnie otwarte, rozstrzyga serwis — godziny są tekstem „HH:mm”.
     */
    @EntityGraph(attributePaths = {"offer", "user"})
    @Query("""
            SELECT r FROM ReservationEntity r
            WHERE r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
              AND r.expiresAt > :now
              AND r.createdAt <= :createdBefore
              AND r.pickupReminderSentAt IS NULL
            """)
    List<ReservationEntity> findPickupReminderCandidates(@Param("now") LocalDateTime now,
                                                         @Param("createdBefore") LocalDateTime createdBefore);

    /**
     * Przejęcie wysyłki ostrzeżenia — co najwyżej raz. Warunkowy UPDATE jest atomowy w bazie:
     * z równoległych przebiegów (także różnych instancji) wiersz zmieni tylko jeden i tylko on
     * dostanie 1 i wyśle push. Własna transakcja: claim musi być zatwierdzony przed wysyłką.
     *
     * @return 1 — przejęto, 0 — ktoś wysłał wcześniej albo rezerwacja przestała być aktywna
     */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE ReservationEntity r SET r.expiryWarningSentAt = :now
            WHERE r.id = :id AND r.expiryWarningSentAt IS NULL
              AND r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
            """)
    int claimExpiryWarning(@Param("id") String id, @Param("now") LocalDateTime now);

    /** Przejęcie wysyłki przypomnienia o odbiorze — co najwyżej raz (jak {@link #claimExpiryWarning}). */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE ReservationEntity r SET r.pickupReminderSentAt = :now
            WHERE r.id = :id AND r.pickupReminderSentAt IS NULL
              AND r.status = com.example.gng.reservation.entity.ReservationStatus.RESERVED
            """)
    int claimPickupReminder(@Param("id") String id, @Param("now") LocalDateTime now);
}
