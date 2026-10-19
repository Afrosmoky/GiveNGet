package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Wywołujący jest uwierzytelniony, ale nie ma prawa wykonać tej operacji.
 */
public class ForbiddenOperationException extends ApiException {

    public static final String CODE = "FORBIDDEN";

    public ForbiddenOperationException(String message, Map<String, Object> details) {
        this(CODE, message, details);
    }

    private ForbiddenOperationException(String code, String message, Map<String, Object> details) {
        super(code, HttpStatus.FORBIDDEN, message, details);
    }

    public static ForbiddenOperationException ownOffer(String offerId) {
        return new ForbiddenOperationException(
                "Nie można zarezerwować własnej oferty.",
                Map.of("offerId", offerId));
    }

    /**
     * Pracownik próbuje potwierdzić odbiór rezerwacji na ofertę innego sklepu.
     * Details celowo nie zawierają identyfikatora oferty ani rezerwacji — pracownik obcego
     * sklepu nie powinien z odpowiedzi wyczytać, czyj jest kod, który wpisał.
     */
    public static ForbiddenOperationException foreignStore() {
        return new ForbiddenOperationException(
                "Ta rezerwacja dotyczy oferty innego sklepu.",
                Map.of());
    }

    /** Konto pracownika bez przypisanego sklepu nie ma czyjego odbioru potwierdzać. */
    public static ForbiddenOperationException noStoreAssigned() {
        return new ForbiddenOperationException(
                "Konto nie jest przypisane do żadnego sklepu.",
                Map.of());
    }

    /**
     * Firma dezaktywowała konto pracownika. Osobny kod (nie {@code FORBIDDEN}), bo klient
     * pokazuje tu konkretny komunikat zamiast ogólnego braku uprawnień.
     */
    public static ForbiddenOperationException employeeDeactivated() {
        return new ForbiddenOperationException(
                "EMPLOYEE_DEACTIVATED",
                "Konto pracownika zostało dezaktywowane przez sklep.",
                Map.of());
    }

    /** Lista rezerwacji sklepu — tylko konto firmowe (obrona w głębi za regułą SecurityConfig). */
    public static ForbiddenOperationException storeReservationsCompanyOnly() {
        return new ForbiddenOperationException(
                "Lista rezerwacji sklepu jest dostępna tylko dla konta firmowego.",
                Map.of());
    }

    /** Provisioning pracowników jest dostępny wyłącznie dla konta firmowego. */
    public static ForbiddenOperationException notACompanyAccount() {
        return new ForbiddenOperationException(
                "Tylko konto firmowe może zarządzać kontami pracowników sklepu.",
                Map.of());
    }
}
