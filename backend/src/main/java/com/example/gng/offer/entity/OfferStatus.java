package com.example.gng.offer.entity;

public enum OfferStatus {
    ACTIVE("Aktywna"),
    INACTIVE("Nieaktywna"),
    BLOCKED("Zablokowana"),
    PENDING("Oczekująca");

    private final String displayName;

    OfferStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
