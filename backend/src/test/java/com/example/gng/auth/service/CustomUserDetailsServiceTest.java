package com.example.gng.auth.service;

import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.store.entity.StoreEmployeeModel;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Flaga enabled: zweryfikowane konto, a dla pracownika sklepu dodatkowo aktywne
 * (dezaktywacja przez firmę — migracja 52).
 */
class CustomUserDetailsServiceTest {

    @Test
    void verifiedRegularUserIsEnabled() {
        UserModel user = new UserModel();
        user.setType(UserType.REGULAR);
        user.setVerified(true);

        assertTrue(CustomUserDetailsService.isEnabled(user));
    }

    @Test
    void unverifiedUserIsDisabled() {
        UserModel user = new UserModel();
        user.setType(UserType.REGULAR);
        user.setVerified(false);

        assertFalse(CustomUserDetailsService.isEnabled(user));
    }

    @Test
    void activeStoreEmployeeIsEnabled() {
        assertTrue(CustomUserDetailsService.isEnabled(employee(true, true)));
    }

    @Test
    void deactivatedStoreEmployeeIsDisabledDespiteBeingVerified() {
        assertFalse(CustomUserDetailsService.isEnabled(employee(true, false)));
    }

    @Test
    void unverifiedStoreEmployeeStaysDisabledEvenIfActive() {
        assertFalse(CustomUserDetailsService.isEnabled(employee(false, true)));
    }

    private static StoreEmployeeModel employee(boolean verified, boolean active) {
        StoreEmployeeModel employee = new StoreEmployeeModel();
        employee.setType(UserType.STORE_EMPLOYEE);
        employee.setVerified(verified);
        employee.setActive(active);
        return employee;
    }
}
