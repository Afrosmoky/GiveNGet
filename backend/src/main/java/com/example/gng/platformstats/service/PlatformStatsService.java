package com.example.gng.platformstats.service;

import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.time.UtcDayRange;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.platformstats.dto.PlatformStatsDTO;
import com.example.gng.platformstats.repository.PlatformStatsRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.report.repository.SavingsReportRepository;
import com.example.gng.reservation.entity.ReservationStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;

/**
 * Statystyki platformy pod pilotaż (docs/08, pozycja 4) — materiał do rozmów z siecią.
 *
 * <p>Wzorzec jak raport oszczędności: agregaty zapytaniem, zakres dat jako twarde granice
 * w dniach UTC. Odbiory i uratowane sztuki pochodzą z tych samych zapytań co raport
 * ({@link SavingsReportRepository} bez zawężenia do sklepu), więc obie liczby zawsze się zgadzają.
 */
@Service
public class PlatformStatsService {

    private final PlatformStatsRepository statsRepository;
    private final SavingsReportRepository savingsReportRepository;
    private final UserRepository userRepository;

    public PlatformStatsService(PlatformStatsRepository statsRepository,
                                SavingsReportRepository savingsReportRepository,
                                UserRepository userRepository) {
        this.statsRepository = statsRepository;
        this.savingsReportRepository = savingsReportRepository;
        this.userRepository = userRepository;
    }

    /**
     * @param from dzień początkowy włącznie (UTC) albo null
     * @param to   dzień końcowy włącznie (UTC) albo null
     */
    @Transactional(readOnly = true)
    public PlatformStatsDTO getPlatformStats(String currentUserEmail, LocalDate from, LocalDate to) {
        UtcDayRange range = UtcDayRange.of(from, to);
        requireAdmin(currentUserEmail);

        PlatformStatsDTO.Users users = new PlatformStatsDTO.Users(
                statsRepository.countUsers(UserType.REGULAR),
                statsRepository.countVerifiedUsers(UserType.REGULAR),
                statsRepository.countUsersCreatedBetween(UserType.REGULAR, range.start(), range.end()));

        PlatformStatsDTO.Stores stores = new PlatformStatsDTO.Stores(
                statsRepository.countVerifiedUsers(UserType.COMPANY));

        PlatformStatsDTO.Offers offers = new PlatformStatsDTO.Offers(
                statsRepository.countOffersByStatus(OfferStatus.ACTIVE),
                statsRepository.countOffersCreatedBetween(range.start(), range.end()));

        Map<ReservationStatus, Long> byStatus = new EnumMap<>(ReservationStatus.class);
        for (ReservationStatus status : ReservationStatus.values()) {
            byStatus.put(status, 0L);
        }
        for (Object[] row : statsRepository.countReservationsByStatusCreatedBetween(range.start(), range.end())) {
            byStatus.put((ReservationStatus) row[0], ((Number) row[1]).longValue());
        }
        long reservationsTotal = byStatus.values().stream().mapToLong(Long::longValue).sum();
        PlatformStatsDTO.Reservations reservations = new PlatformStatsDTO.Reservations(
                reservationsTotal,
                new PlatformStatsDTO.ByStatus(
                        byStatus.get(ReservationStatus.RESERVED),
                        byStatus.get(ReservationStatus.COLLECTED),
                        byStatus.get(ReservationStatus.EXPIRED),
                        byStatus.get(ReservationStatus.CANCELLED)));

        // storeId = null: cała platforma, ta sama definicja co raport oszczędności ADMIN-a
        PlatformStatsDTO.Pickups pickups = new PlatformStatsDTO.Pickups(
                savingsReportRepository.countCollected(range.start(), range.end(), null),
                savingsReportRepository.sumCollectedQuantity(range.start(), range.end(), null));

        return new PlatformStatsDTO(range.from(), range.to(), users, stores, offers, reservations, pickups);
    }

    /**
     * Obrona w głębi: SecurityConfig wpuszcza tylko ROLE_ADMIN, ale gdyby reguła się
     * rozjechała, statystyki całej platformy nie wyjdą do nikogo innego.
     */
    private void requireAdmin(String email) {
        if (email == null || email.isBlank()) {
            throw new ForbiddenOperationException("Operacja wymaga zalogowanego użytkownika.", Map.of());
        }
        UserModel user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));
        if (user.getType() != UserType.ADMIN) {
            throw new ForbiddenOperationException(
                    "Statystyki platformy są dostępne wyłącznie dla administratora.", Map.of());
        }
    }
}
