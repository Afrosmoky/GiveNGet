package com.example.gng.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Email jest wymagany")
    @Email(message = "Email ma niepoprawny format")
    private String email;

    @NotBlank(message = "Hasło jest wymagane")
    private String password;
} 