package com.example.gng.register.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

import java.math.BigDecimal;

@Data
public class RegisterDTO {

    @NotBlank(message = "Imię jest wymagane")
    private String firstName;

    @NotBlank(message = "Nazwisko jest wymagane")
    private String lastName;

    @NotBlank(message = "Email jest wymagany")
    @Email(message = "Email ma niepoprawny format")
    private String email;

    @NotBlank(message = "Numer telefonu jest wymagany")
    private String phoneNumber;

    @NotBlank(message = "Adres jest wymagany")
    private String address;

    @NotNull(message = "Szerokość geograficzna jest wymagana")
    private BigDecimal lat;

    @NotNull(message = "Długość geograficzna jest wymagana")
    private BigDecimal lon;

    @NotBlank(message = "Hasło jest wymagane")
    @Size(min = 6, message = "Hasło musi mieć co najmniej 6 znaków")
    // Hasło nigdy nie trafia do logów — toString() (używany m.in. przez logi DEBUG Springa) je pomija
    @ToString.Exclude
    private String password;

    /**
     * Akceptacja regulaminu i polityki prywatności. Celowo bez adnotacji walidacyjnych —
     * sprawdza je RegistrationConsentPolicy, żeby brak zgody dał kod CONSENT_REQUIRED
     * (CLAUDE.md 6.3), a nie ogólny błąd walidacji formularza.
     */
    private Boolean termsAccepted;

    private Boolean privacyAccepted;
}
