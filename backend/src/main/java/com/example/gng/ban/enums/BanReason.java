package com.example.gng.ban.enums;

import lombok.Getter;

@Getter
public enum BanReason {
    INAPPROPRIATE_CATEGORY(101, "Nieodpowiednia kategoria"),
    PROFANITY_OFFENSIVE_CONTENT(102, "Wulgaryzmy/obraźliwe treści"),
    PROHIBITED_GOODS(103, "Towar niedozwolony"),
    MISLEADING(104, "Wprowadzające w błąd"),
    PHOTO_VIOLATION_GDPR(105, "Naruszenie zdjęć/RODO"),
    SPAM(201, "Spam"),
    TRANSACTION_ABUSE(301, "Nadużycie w transakcji"),
    OTHER(401, "Inne");

    private final int code;
    private final String description;

    BanReason(int code, String description) {
        this.code = code;
        this.description = description;
    }

    /**
     * Znajduje BanReason na podstawie kodu
     */
    public static BanReason fromCode(int code) {
        for (BanReason reason : values()) {
            if (reason.code == code) {
                return reason;
            }
        }
        throw new IllegalArgumentException("Nieprawidłowy kod powodu bana: " + code);
    }

    /**
     * Sprawdza czy powód wymaga dodatkowego opisu (reason)
     */
    public boolean requiresDescription() {
        return this == OTHER;
    }
}

