package com.example.gng.offer.dto;

import com.example.gng.offer.entity.OfferStatus;

public class OfferActionResponse {

    private String offerId;
    private OfferStatus status;
    private boolean pendingVerification;
    private String message;

    public OfferActionResponse() {
    }

    public OfferActionResponse(String offerId, OfferStatus status, boolean pendingVerification, String message) {
        this.offerId = offerId;
        this.status = status;
        this.pendingVerification = pendingVerification;
        this.message = message;
    }

    public String getOfferId() {
        return offerId;
    }

    public void setOfferId(String offerId) {
        this.offerId = offerId;
    }

    public OfferStatus getStatus() {
        return status;
    }

    public void setStatus(OfferStatus status) {
        this.status = status;
    }

    public boolean isPendingVerification() {
        return pendingVerification;
    }

    public void setPendingVerification(boolean pendingVerification) {
        this.pendingVerification = pendingVerification;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}


