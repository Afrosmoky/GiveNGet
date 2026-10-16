package com.example.gng.offer.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Walidacja pola quantity na DTO tworzenia i edycji oferty.
 * Sprawdzamy wyłącznie naruszenia dotyczące quantity — pozostałe pola DTO
 * mają własne constrainty, które nie są przedmiotem tego testu.
 */
class OfferQuantityValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDownValidator() {
        if (validatorFactory != null) {
            validatorFactory.close();
        }
    }

    private Set<String> quantityViolations(Object dto) {
        Set<ConstraintViolation<Object>> violations = validator.validate(dto);
        return violations.stream()
                .filter(v -> "quantity".equals(v.getPropertyPath().toString()))
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    // ---------- CreateOfferDTO ----------

    @Test
    void createDto_nullQuantity_isAllowed() {
        // Brak pola = zgodność wsteczna ze starszymi klientami (serwis ustawi 1)
        CreateOfferDTO dto = new CreateOfferDTO();
        dto.setQuantity(null);

        assertTrue(quantityViolations(dto).isEmpty(),
                "Brak quantity nie powinien być błędem walidacji");
    }

    @Test
    void createDto_zeroQuantity_isAllowed() {
        CreateOfferDTO dto = new CreateOfferDTO();
        dto.setQuantity(0);

        assertTrue(quantityViolations(dto).isEmpty(), "quantity = 0 jest dozwolone");
    }

    @Test
    void createDto_positiveQuantity_isAllowed() {
        CreateOfferDTO dto = new CreateOfferDTO();
        dto.setQuantity(25);

        assertTrue(quantityViolations(dto).isEmpty(), "quantity dodatnie jest dozwolone");
    }

    @Test
    void createDto_negativeQuantity_isRejected() {
        CreateOfferDTO dto = new CreateOfferDTO();
        dto.setQuantity(-1);

        Set<String> messages = quantityViolations(dto);
        assertEquals(1, messages.size(), "Ujemne quantity powinno dać dokładnie jedno naruszenie");
        assertTrue(messages.contains("Ilość sztuk nie może być ujemna"), "Nieoczekiwany komunikat: " + messages);
    }

    // ---------- UpdateOfferDTO ----------

    @Test
    void updateDto_nullQuantity_isAllowed() {
        // Brak pola = "nie zmieniaj ilości"
        UpdateOfferDTO dto = new UpdateOfferDTO();
        dto.setQuantity(null);

        assertTrue(quantityViolations(dto).isEmpty(),
                "Brak quantity przy edycji nie powinien być błędem walidacji");
    }

    @Test
    void updateDto_zeroQuantity_isAllowed() {
        UpdateOfferDTO dto = new UpdateOfferDTO();
        dto.setQuantity(0);

        assertTrue(quantityViolations(dto).isEmpty(), "quantity = 0 jest dozwolone przy edycji");
    }

    @Test
    void updateDto_negativeQuantity_isRejected() {
        UpdateOfferDTO dto = new UpdateOfferDTO();
        dto.setQuantity(-5);

        Set<String> messages = quantityViolations(dto);
        assertEquals(1, messages.size(), "Ujemne quantity powinno dać dokładnie jedno naruszenie");
        assertTrue(messages.contains("Ilość sztuk nie może być ujemna"), "Nieoczekiwany komunikat: " + messages);
    }
}
