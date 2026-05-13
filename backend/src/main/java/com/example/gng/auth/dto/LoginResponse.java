package com.example.gng.auth.dto;

import com.example.gng.register.model.Currency;
import com.example.gng.register.model.Language;
import com.example.gng.register.model.UserType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private String token;
    private String tokenType = "Bearer";
    private String email;
    private String firstName;
    private String lastName;
    private UserType userType;
    private String phoneNumber;
    private Long id;
    private Language lang;
    private Currency currency;
    private BigDecimal lat;
    private BigDecimal lon;
    private String profilePhotoUrl;
    private String homeUrl;
    // Pole opcjonalne: tylko jeśli użytkownik ma rolę ADMIN lub MOD
    private String elevatedRole;

    public LoginResponse(String token, String email, String firstName, String lastName, UserType userType, String phoneNumber, Long id,
                         Language lang, Currency currency, BigDecimal lat, BigDecimal lon, String profilePhotoUrl, String homeUrl) {
        this.token = token;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.userType = userType;
        this.phoneNumber = phoneNumber;
        this.id = id;
        this.lang = lang;
        this.currency = currency;
        this.lat = lat;
        this.lon = lon;
        this.profilePhotoUrl = profilePhotoUrl;
        this.homeUrl = homeUrl;
    }
}