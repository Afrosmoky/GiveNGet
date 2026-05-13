package com.example.gng.user.register.dto;

import com.example.gng.register.dto.RegisterDTO;
import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@EqualsAndHashCode(callSuper = true)
@Data
public class RegisterUserDTO extends RegisterDTO {

    @NotNull(message = "Data urodzenia jest wymagana")
    private LocalDate dateOfBirth;

    @Size(max = 2000, message = "Bio nie może przekraczać 2000 znaków")
    private String bio;
}
