package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Zasób nie istnieje albo nie należy do wywołującego.
 *
 * Uwaga: rezerwacja cudza również kończy się tym wyjątkiem w ścieżce odczytu,
 * żeby nie ujawniać istnienia identyfikatorów innych użytkowników.
 */
public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String code, String message, Map<String, Object> details) {
        super(code, HttpStatus.NOT_FOUND, message, details);
    }

    public static ResourceNotFoundException reservation(String reservationId) {
        return new ResourceNotFoundException(
                "RESERVATION_NOT_FOUND",
                "Rezerwacja nie została znaleziona.",
                Map.of("reservationId", reservationId));
    }

    /**
     * Brak publicznego profilu sklepu. Ten sam kod dla nieistniejącego id, konta prywatnego,
     * zbanowanego i nieaktywnego — odpowiedź nie zdradza, które konta istnieją.
     */
    public static ResourceNotFoundException store(Long companyId) {
        return new ResourceNotFoundException(
                "STORE_NOT_FOUND",
                "Sklep nie został znaleziony.",
                Map.of("companyId", companyId));
    }

    /**
     * Pracownik nie istnieje albo należy do innej firmy — jeden kod dla obu przypadków,
     * żeby firma nie mogła sprawdzać, które identyfikatory kont istnieją.
     */
    public static ResourceNotFoundException storeEmployee(Long employeeId) {
        return new ResourceNotFoundException(
                "STORE_EMPLOYEE_NOT_FOUND",
                "Pracownik nie został znaleziony.",
                Map.of("employeeId", employeeId));
    }

    public static ResourceNotFoundException offer(String offerId) {
        return new ResourceNotFoundException(
                "OFFER_NOT_FOUND",
                "Oferta nie została znaleziona.",
                Map.of("offerId", offerId));
    }
}
