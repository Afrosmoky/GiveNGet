package com.example.gng.register.model;

public enum UserType {
    /** Konto konsumenckie. */
    REGULAR,
    /** Konto firmowe / sklep — wystawia oferty. */
    COMPANY,
    /** Moderator platformy. Uwaga: to NIE pracownik sklepu. */
    EMPLOYEE,
    /** Administrator platformy. */
    ADMIN,
    /**
     * Pracownik sklepu — potwierdza odbiór rezerwacji w sklepie, do którego jest przypisany
     * (docs/04_REZERWACJE_DESIGN.md, sekcja 7). Celowo oddzielony od EMPLOYEE: nie ma
     * żadnych uprawnień moderacyjnych na platformie.
     */
    STORE_EMPLOYEE
}