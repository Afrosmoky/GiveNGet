package com.example.gng.user.entity;

public enum UserRank {
    STARTER("Starter"),
    RELIABLE_SELLER("Rzetelny Sprzedawca"),
    TRUSTED_PARTNER("Zaufany Partner"),
    LOCAL_HERO("Bohater Lokalny"),
    AMBASSADOR("Ambasador");

    private final String displayName;

    UserRank(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * Sprawdza czy użytkownik kwalifikuje się do danej rangi
     */
    public boolean qualifies(double averageRating, int trustPoints) {
        switch (this) {
            case STARTER:
                return true; // Każdy nowy użytkownik
            case RELIABLE_SELLER:
                return averageRating >= 4.0 && trustPoints >= 100;
            case TRUSTED_PARTNER:
                return averageRating >= 4.5 && trustPoints >= 300;
            case LOCAL_HERO:
                return averageRating >= 4.7 && trustPoints >= 700;
            case AMBASSADOR:
                return averageRating >= 4.9 && trustPoints >= 1500;
            default:
                return false;
        }
    }

    /**
     * Zwraca liczbę darmowych ofert dla danej rangi
     */
    public int getFreeOffersCount() {
        switch (this) {
            case STARTER:
                return 5;
            case RELIABLE_SELLER:
                return 10; // 5 + 5 bonus
            case TRUSTED_PARTNER:
                return 10;
            case LOCAL_HERO:
                return 10;
            case AMBASSADOR:
                return 10;
            default:
                return 5;
        }
    }
}
