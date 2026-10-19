package com.example.gng.user.dto;

public record ChangeEmailDto(String currentPassword, String newEmail) {

    /** Hasło nigdy nie trafia do logów — domyślny toString() rekordu wypisałby je jawnym tekstem. */
    @Override
    public String toString() {
        return "ChangeEmailDto[currentPassword=***, newEmail=" + newEmail + "]";
    }
}
