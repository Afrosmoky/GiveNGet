package com.example.gng.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.ToString;

@Data
public class LoginRequest {
    @NotBlank(message = "Email jest wymagany")
    @Email(message = "Email ma niepoprawny format")
    private String email;

    @NotBlank(message = "Hasło jest wymagane")
    // Hasło nigdy nie trafia do logów — toString() (używany m.in. przez logi DEBUG Springa) je pomija
    @ToString.Exclude
    private String password;
} 