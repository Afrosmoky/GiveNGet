package com.example.gng.register.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

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
    private String password;
}
