package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Podany kod odbioru nie odpowiada żadnej rezerwacji.
 *
 * <p>404 i osobny kod od {@code RESERVATION_NOT_FOUND}: tam klient pyta o własną rezerwację
 * po identyfikatorze, tutaj pracownik sklepu przepisuje kod z ekranu klienta, więc to zwykła
 * pomyłka przy wpisywaniu, a nie brakujący zasób. Details nie zawierają wpisanego kodu —
 * nie odbijamy sekretu w odpowiedzi ani w logach dostępu.
 */
public class InvalidPickupCodeException extends ApiException {

    public static final String CODE = "INVALID_PICKUP_CODE";

    public InvalidPickupCodeException() {
        super(CODE, HttpStatus.NOT_FOUND,
                "Nie znaleziono rezerwacji o podanym kodzie odbioru.", Map.of());
    }
}
