package com.example.gng.store.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Zmiana statusu konta pracownika przez firmę. {@code false} odbiera dostęp,
 * {@code true} go przywraca — operacja jest odwracalna i idempotentna.
 */
public record UpdateStoreEmployeeStatusRequest(

        @NotNull(message = "Pole active jest wymagane")
        Boolean active
) {
}
