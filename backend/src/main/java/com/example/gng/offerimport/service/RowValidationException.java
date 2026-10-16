package com.example.gng.offerimport.service;

/**
 * Wiersz importu nie przeszedł walidacji. Wyjątek nie opuszcza serwisu —
 * jest zamieniany na pozycję w raporcie błędów, a import trwa dalej.
 */
class RowValidationException extends RuntimeException {

    private final String code;

    RowValidationException(String code, String message) {
        super(message);
        this.code = code;
    }

    String getCode() {
        return code;
    }
}
