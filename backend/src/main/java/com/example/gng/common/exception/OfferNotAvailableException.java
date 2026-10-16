package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Oferty nie da się zarezerwować: nie jest aktywna albo dostępna liczba sztuk
 * jest mniejsza niż żądana. 409, bo to konflikt ze stanem zasobu, nie błąd żądania.
 */
public class OfferNotAvailableException extends ApiException {

    public static final String CODE = "OFFER_NOT_AVAILABLE";

    public OfferNotAvailableException(String message, Map<String, Object> details) {
        super(CODE, HttpStatus.CONFLICT, message, details);
    }

    public static OfferNotAvailableException notEnoughQuantity(String offerId, int requested, int available) {
        return new OfferNotAvailableException(
                "Dostępna liczba sztuk jest mniejsza niż żądana.",
                Map.of("offerId", offerId, "requested", requested, "available", available));
    }

    public static OfferNotAvailableException offerNotActive(String offerId, String status) {
        return new OfferNotAvailableException(
                "Oferta nie jest aktywna i nie można jej zarezerwować.",
                Map.of("offerId", offerId, "offerStatus", status));
    }
}
