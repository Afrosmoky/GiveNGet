package com.example.gng.store.dto;

import java.time.LocalDateTime;

/**
 * Konto pracownika sklepu w odpowiedzi. Nigdy nie zwracamy encji JPA (CLAUDE.md 6.1),
 * co tutaj ma dodatkowe znaczenie: encja użytkownika nosi hash hasła.
 *
 * @param createdAt data założenia konta (UTC)
 * @param active    czy pracownik może się logować i potwierdzać odbiory
 */
public record StoreEmployeeDTO(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        Long storeId,
        String storeName,
        LocalDateTime createdAt,
        boolean active
) {
}
