package com.example.gng.store.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Żądanie utworzenia konta pracownika sklepu. Sklep wynika z konta wywołującego
 * (ROLE_COMPANY) i nie jest parametrem — firma może zakładać pracowników tylko sobie.
 */
public record CreateStoreEmployeeRequest(

        @NotBlank(message = "Imię jest wymagane")
        String firstName,

        @NotBlank(message = "Nazwisko jest wymagane")
        String lastName,

        @NotBlank(message = "Adres e-mail jest wymagany")
        @Email(message = "Nieprawidłowy format adresu e-mail")
        String email,

        @NotBlank(message = "Hasło jest wymagane")
        @Size(min = 8, message = "Hasło musi mieć co najmniej 8 znaków")
        String password,

        String phoneNumber
) {
}
