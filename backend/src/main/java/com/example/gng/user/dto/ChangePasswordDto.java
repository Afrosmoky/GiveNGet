package com.example.gng.user.dto;

public record ChangePasswordDto(String currentPassword, String newPassword) {

    /** Hasła nigdy nie trafiają do logów — domyślny toString() rekordu wypisałby je jawnym tekstem. */
    @Override
    public String toString() {
        return "ChangePasswordDto[currentPassword=***, newPassword=***]";
    }
}
