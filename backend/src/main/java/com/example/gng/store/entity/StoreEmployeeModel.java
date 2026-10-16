package com.example.gng.store.entity;

import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Konto pracownika sklepu (docs/04_REZERWACJE_DESIGN.md, sekcja 7).
 *
 * <p>Potwierdza odbiór rezerwacji, ale tylko dla ofert wystawionych przez firmę, do której
 * jest przypisany. Wiązanie ze sklepem trzymamy w osobnej tabeli, a nie jako kolumnę
 * {@code users.store_id}, bo dla wszystkich pozostałych typów kont byłaby zawsze NULL —
 * tym samym wzorcem inheritance JOINED działają już {@code RegularUserModel}
 * i {@code BusinessUserModel}.
 *
 * <p>Ten typ nie ma żadnych uprawnień moderacyjnych; istniejące sprawdzenia w moderacji
 * porównują z {@code ADMIN}/{@code EMPLOYEE}, więc odrzucają go automatycznie.
 */
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "store_employees_details")
@PrimaryKeyJoinColumn(name = "user_id")
@Data
public class StoreEmployeeModel extends UserModel {

    /** Sklep (konto firmowe), w którego imieniu pracownik potwierdza odbiory. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private BusinessUserModel store;

    /**
     * Czy firma dopuszcza pracownika do pracy. Nieaktywny nie zaloguje się
     * ({@code CustomUserDetailsService}) ani nie potwierdzi odbioru starym tokenem
     * ({@code ReservationService}). Celowo nie {@code verified} — patrz migracja 52.
     */
    @Column(name = "active", nullable = false)
    private boolean active = true;
}
