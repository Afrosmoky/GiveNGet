package com.example.gng.platformstats.repository;

import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Agregaty platformowe pod statystyki pilotażu (docs/08, pozycja 4).
 *
 * <p>Wszystko liczymy w bazie (COUNT, GROUP BY) — żadne konta, oferty ani rezerwacje nie są
 * ładowane do pamięci. Osobne repozytorium, żeby zapytania statystyczne nie mieszały się
 * z repozytoriami domeny; odbiory i uratowane sztuki są w {@code SavingsReportRepository},
 * żeby obie funkcje miały jedną definicję.
 *
 * <p>Granice czasowe są zawsze konkretne (patrz {@code UtcDayRange}), więc zapytania nie mają
 * warunków na NULL dla dat.
 */
public interface PlatformStatsRepository extends Repository<UserModel, Long> {

    @Query("SELECT COUNT(u) FROM UserModel u WHERE u.type = :type")
    long countUsers(@Param("type") UserType type);

    @Query("SELECT COUNT(u) FROM UserModel u WHERE u.type = :type AND u.verified = true")
    long countVerifiedUsers(@Param("type") UserType type);

    /** Konta bez zapisanej daty założenia (NULL) nie spełniają warunku — świadomie. */
    @Query("""
           SELECT COUNT(u) FROM UserModel u
           WHERE u.type = :type
             AND u.createDate >= :from
             AND u.createDate <= :to
           """)
    long countUsersCreatedBetween(@Param("type") UserType type,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(o) FROM OfferEntity o WHERE o.status = :status")
    long countOffersByStatus(@Param("status") OfferStatus status);

    @Query("SELECT COUNT(o) FROM OfferEntity o WHERE o.createdAt >= :from AND o.createdAt <= :to")
    long countOffersCreatedBetween(@Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to);

    /**
     * Rezerwacje utworzone w zakresie, pogrupowane po obecnym statusie: pary [status, liczba].
     * Status bez rezerwacji nie pojawia się w wyniku — uzupełnia go serwis.
     */
    @Query("""
           SELECT r.status, COUNT(r)
           FROM ReservationEntity r
           WHERE r.createdAt >= :from
             AND r.createdAt <= :to
           GROUP BY r.status
           ORDER BY r.status ASC
           """)
    List<Object[]> countReservationsByStatusCreatedBetween(@Param("from") LocalDateTime from,
                                                           @Param("to") LocalDateTime to);
}
