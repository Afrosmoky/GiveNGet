package com.example.gng.platformstats.service;

import com.example.gng.common.exception.ApiException;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.platformstats.dto.PlatformStatsDTO;
import com.example.gng.platformstats.repository.PlatformStatsRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.report.repository.SavingsReportRepository;
import com.example.gng.reservation.entity.ReservationStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Składanie statystyk platformy (docs/08, pozycja 4): granice dat, uzupełnianie statusów,
 * źródło odbiorów (to samo co raport oszczędności) i dostęp tylko dla ADMIN.
 * Same zapytania sprawdza {@code PlatformStatsQueryTest} na prawdziwym MySQL.
 */
class PlatformStatsServiceTest {

    private static final String ADMIN_EMAIL = "admin@example.com";

    @Mock private PlatformStatsRepository statsRepository;
    @Mock private SavingsReportRepository savingsReportRepository;
    @Mock private UserRepository userRepository;

    private AutoCloseable mocks;
    private PlatformStatsService service;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        service = new PlatformStatsService(statsRepository, savingsReportRepository, userRepository);

        lenient().when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(user(ADMIN_EMAIL, UserType.ADMIN)));
        lenient().when(statsRepository.countReservationsByStatusCreatedBetween(any(), any())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    @Test
    void assemblesAllMetrics() {
        when(statsRepository.countUsers(UserType.REGULAR)).thenReturn(120L);
        when(statsRepository.countVerifiedUsers(UserType.REGULAR)).thenReturn(100L);
        when(statsRepository.countUsersCreatedBetween(eq(UserType.REGULAR), any(), any())).thenReturn(15L);
        when(statsRepository.countVerifiedUsers(UserType.COMPANY)).thenReturn(4L);
        when(statsRepository.countOffersByStatus(OfferStatus.ACTIVE)).thenReturn(37L);
        when(statsRepository.countOffersCreatedBetween(any(), any())).thenReturn(52L);
        when(statsRepository.countReservationsByStatusCreatedBetween(any(), any())).thenReturn(rows(
                new Object[]{ReservationStatus.CANCELLED, 2L},
                new Object[]{ReservationStatus.COLLECTED, 9L},
                new Object[]{ReservationStatus.EXPIRED, 3L},
                new Object[]{ReservationStatus.RESERVED, 5L}));
        when(savingsReportRepository.countCollected(any(), any(), isNull())).thenReturn(9L);
        when(savingsReportRepository.sumCollectedQuantity(any(), any(), isNull())).thenReturn(21L);

        PlatformStatsDTO stats = service.getPlatformStats(ADMIN_EMAIL, null, null);

        assertEquals(new PlatformStatsDTO.Users(120, 100, 15), stats.users());
        assertEquals(new PlatformStatsDTO.Stores(4), stats.stores());
        assertEquals(new PlatformStatsDTO.Offers(37, 52), stats.offers());
        assertEquals(19, stats.reservations().createdInRange(), "suma po wszystkich statusach");
        assertEquals(new PlatformStatsDTO.ByStatus(5, 9, 3, 2), stats.reservations().byStatus());
        assertEquals(new PlatformStatsDTO.Pickups(9, 21), stats.pickups());
        assertNull(stats.from());
        assertNull(stats.to());
    }

    @Test
    void missingStatusesAreZeroNotNull() {
        when(statsRepository.countReservationsByStatusCreatedBetween(any(), any())).thenReturn(rows(
                new Object[]{ReservationStatus.COLLECTED, 4L}));

        PlatformStatsDTO stats = service.getPlatformStats(ADMIN_EMAIL, null, null);

        assertEquals(new PlatformStatsDTO.ByStatus(0, 4, 0, 0), stats.reservations().byStatus());
        assertEquals(4, stats.reservations().createdInRange());
    }

    @Test
    void dateRangeIsPassedAsInclusiveUtcDays() {
        LocalDate from = LocalDate.of(2026, 10, 1);
        LocalDate to = LocalDate.of(2026, 10, 31);
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        PlatformStatsDTO stats = service.getPlatformStats(ADMIN_EMAIL, from, to);

        assertEquals(from, stats.from());
        assertEquals(to, stats.to());
        verify(statsRepository).countUsersCreatedBetween(UserType.REGULAR, start, end);
        verify(statsRepository).countOffersCreatedBetween(start, end);
        verify(statsRepository).countReservationsByStatusCreatedBetween(start, end);
        // Odbiory i sztuki: te same zapytania co raport oszczędności, cała platforma (storeId = null)
        verify(savingsReportRepository).countCollected(start, end, null);
        verify(savingsReportRepository).sumCollectedQuantity(start, end, null);
    }

    @Test
    void invertedRangeIsRejectedBeforeAnyQuery() {
        ApiException ex = assertThrows(ApiException.class,
                () -> service.getPlatformStats(ADMIN_EMAIL, LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 1)));

        assertEquals("INVALID_DATE_RANGE", ex.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verifyNoInteractions(statsRepository, savingsReportRepository);
    }

    @Test
    void onlyAdminHasAccess() {
        for (UserType type : List.of(UserType.REGULAR, UserType.COMPANY, UserType.EMPLOYEE, UserType.STORE_EMPLOYEE)) {
            String email = type.name().toLowerCase() + "@example.com";
            when(userRepository.findByEmail(email)).thenReturn(Optional.of(user(email, type)));

            ApiException ex = assertThrows(ApiException.class, () -> service.getPlatformStats(email, null, null),
                    () -> type + " nie może widzieć statystyk platformy");
            assertEquals("FORBIDDEN", ex.getCode());
        }
        verifyNoInteractions(statsRepository, savingsReportRepository);
    }

    private static List<Object[]> rows(Object[]... rows) {
        return new ArrayList<>(List.of(rows));
    }

    private static UserModel user(String email, UserType type) {
        UserModel user = new UserModel();
        user.setEmail(email);
        user.setType(type);
        return user;
    }
}
