package com.example.gng.report.service;

import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.time.UtcDayRange;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.report.dto.CurrencyAmountDTO;
import com.example.gng.report.dto.SavingsReportDTO;
import com.example.gng.report.repository.SavingsReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Raport oszczędności: ile towaru faktycznie uratowano.
 *
 * <p>Źródłem są rezerwacje ze statusem {@code COLLECTED}, agregowane zapytaniem przez
 * {@code reservation → offer → offer.user}. Bez własnej encji i bez denormalizacji
 * {@code store_id} — jedna droga do prawdy, więc nie ma czego rozjeżdżać.
 */
@Service
public class SavingsReportService {

    private static final Logger logger = LoggerFactory.getLogger(SavingsReportService.class);

    /** Miejsca po przecinku w wynikach szacunkowych — więcej sugerowałoby precyzję, której nie ma. */
    private static final int ESTIMATE_SCALE = 2;
    private static final int MONEY_SCALE = 2;

    private final SavingsReportRepository savingsReportRepository;
    private final UserRepository userRepository;
    private final BigDecimal avgWeightKgPerUnit;
    private final BigDecimal co2FactorKgPerKg;

    public SavingsReportService(SavingsReportRepository savingsReportRepository,
                               UserRepository userRepository,
                               @Value("${report.avg-weight-kg-per-unit:0.4}") BigDecimal avgWeightKgPerUnit,
                               @Value("${report.co2-factor-kg-per-kg:2.5}") BigDecimal co2FactorKgPerKg) {
        this.savingsReportRepository = savingsReportRepository;
        this.userRepository = userRepository;
        this.avgWeightKgPerUnit = avgWeightKgPerUnit;
        this.co2FactorKgPerKg = co2FactorKgPerKg;
    }

    /**
     * Buduje raport dla wywołującego.
     *
     * <p>Zakres widoczności wynika z typu konta, nie z parametru:
     * <ul>
     *   <li>{@code COMPANY} — wyłącznie własne oferty; podanie cudzego {@code storeId}
     *       kończy się {@code FORBIDDEN}, a nie cichym zawężeniem do własnych danych,
     *       bo ciche zawężenie ukrywałoby przed klientem, że pyta o coś, do czego nie ma prawa,</li>
     *   <li>{@code ADMIN} — cała platforma, opcjonalnie zawężona do jednej firmy.</li>
     * </ul>
     *
     * @param from początek zakresu włącznie (dzień UTC) albo null
     * @param to   koniec zakresu włącznie (dzień UTC) albo null
     */
    @Transactional(readOnly = true)
    public SavingsReportDTO getSavingsReport(String currentUserEmail, LocalDate from, LocalDate to, Long storeId) {
        // collectedAt jest zapisywane w UTC, więc dzień z żądania to dzień UTC
        UtcDayRange range = UtcDayRange.of(from, to);

        UserModel caller = requireUser(currentUserEmail);
        Long effectiveStoreId = resolveStoreScope(caller, storeId);

        LocalDateTime rangeStart = range.start();
        LocalDateTime rangeEnd = range.end();

        long savedProductsCount = savingsReportRepository
                .sumCollectedQuantity(rangeStart, rangeEnd, effectiveStoreId);

        List<CurrencyAmountDTO> valueByCurrency = savingsReportRepository
                .sumCollectedValueByCurrency(rangeStart, rangeEnd, effectiveStoreId)
                .stream()
                .map(row -> new CurrencyAmountDTO(
                        (String) row[0],
                        toMoney((BigDecimal) row[1])))
                .toList();

        BigDecimal estimatedKg = BigDecimal.valueOf(savedProductsCount)
                .multiply(avgWeightKgPerUnit)
                .setScale(ESTIMATE_SCALE, RoundingMode.HALF_UP);

        BigDecimal estimatedCo2Kg = estimatedKg
                .multiply(co2FactorKgPerKg)
                .setScale(ESTIMATE_SCALE, RoundingMode.HALF_UP);

        logger.debug("Raport oszczędności dla {} (store={}, {}..{}): {} szt.",
                caller.getId(), effectiveStoreId, from, to, savedProductsCount);

        return new SavingsReportDTO(
                from, to, effectiveStoreId,
                savedProductsCount, valueByCurrency,
                estimatedKg, estimatedCo2Kg,
                true);
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    /**
     * Ustala, do jakiej firmy zawęzić raport.
     *
     * @return identyfikator firmy albo null dla całej platformy
     */
    private Long resolveStoreScope(UserModel caller, Long requestedStoreId) {
        if (caller.getType() == UserType.ADMIN) {
            return requestedStoreId; // null = cała platforma
        }

        if (caller.getType() == UserType.COMPANY) {
            if (requestedStoreId != null && !requestedStoreId.equals(caller.getId())) {
                throw new ForbiddenOperationException(
                        "Konto firmowe ma dostęp wyłącznie do raportu własnego sklepu.",
                        Map.of("requestedStoreId", requestedStoreId));
            }
            return caller.getId();
        }

        // Obrona w głębi: reguła w SecurityConfig dopuszcza tylko COMPANY i ADMIN,
        // ale gdyby kiedyś się rozjechała, żadne inne konto nie zobaczy raportu
        throw new ForbiddenOperationException(
                "To konto nie ma dostępu do raportu oszczędności.", Map.of());
    }

    private UserModel requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new ForbiddenOperationException("Operacja wymaga zalogowanego użytkownika.", Map.of());
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));
    }

    private static BigDecimal toMoney(BigDecimal amount) {
        return (amount != null ? amount : BigDecimal.ZERO).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}
