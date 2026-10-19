package com.example.gng.auth;

import com.example.gng.auth.dto.LoginRequest;
import com.example.gng.register.company.dto.RegisterCompanyDTO;
import com.example.gng.register.model.UserModel;
import com.example.gng.user.dto.ChangeEmailDto;
import com.example.gng.user.dto.ChangePasswordDto;
import com.example.gng.user.register.dto.RegisterUserDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Hasło nigdy nie trafia do logów. Spring na DEBUG loguje ciała żądań przez toString(),
 * a encje i DTO bywają logowane w całości — każda klasa niosąca hasło musi je pomijać.
 */
class PasswordNotLoggedTest {

    private static final String SECRET = "Sekret123!";

    @Test
    void loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail("jan@test.pl");
        request.setPassword(SECRET);

        assertHidden(request.toString());
        assertTrue(request.toString().contains("jan@test.pl"), "reszta pól zostaje — przydaje się w debugowaniu");
    }

    @Test
    void registrationDtos() {
        RegisterUserDTO user = new RegisterUserDTO();
        user.setPassword(SECRET);
        RegisterCompanyDTO company = new RegisterCompanyDTO();
        company.setPassword(SECRET);

        assertHidden(user.toString());
        assertHidden(company.toString());
    }

    @Test
    void userEntityHidesPasswordHash() {
        UserModel user = new UserModel();
        user.setPassword(SECRET);

        assertHidden(user.toString());
    }

    @Test
    void passwordAndEmailChangeRecords() {
        assertHidden(new ChangePasswordDto(SECRET, SECRET + "x").toString());
        ChangeEmailDto changeEmail = new ChangeEmailDto(SECRET, "nowy@test.pl");
        assertHidden(changeEmail.toString());
        assertTrue(changeEmail.toString().contains("nowy@test.pl"));
    }

    private static void assertHidden(String text) {
        assertFalse(text.contains(SECRET), () -> "hasło widoczne w toString(): " + text);
    }
}
