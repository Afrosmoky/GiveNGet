package com.example.gng.register.company.dto;

import com.example.gng.register.dto.RegisterDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@EqualsAndHashCode(callSuper = true)
@Data
public class RegisterCompanyDTO extends RegisterDTO {

    @NotBlank(message = "Nazwa firmy jest wymagana")
    private String companyName;

    @Size(max = 2000, message = "Opis firmy nie może przekraczać 2000 znaków")
    private String companyDescription;

    private String category;

    @Size(max = 500, message = "Tagi nie mogą przekraczać 500 znaków")
    private String tags; // Jako string oddzielony przecinkami, np. "fast_food,pizza,pierogi"

    @Size(max = 1000, message = "Linki społecznościowe nie mogą przekraczać 1000 znaków")
    private String socialLinks; // Format: "etykieta1,link1;etykieta2,link2" np. "Facebook,https://facebook.com;Instagram,https://instagram.com"
}