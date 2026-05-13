package com.example.gng.exceptions;

public class ForbiddenContentFoundException extends RuntimeException {

    private final String offerId;

    public ForbiddenContentFoundException(String message, String offerId) {
        super(message);
        this.offerId = offerId;
    }

    public String getOfferId() {
        return offerId;
    }
}


