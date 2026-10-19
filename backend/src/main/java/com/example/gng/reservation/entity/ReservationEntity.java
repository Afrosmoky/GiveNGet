package com.example.gng.reservation.entity;

import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.register.model.UserModel;
import com.example.gng.util.UniqueIdGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Rezerwacja sztuk z oferty (docs/04_REZERWACJE_DESIGN.md, sekcja 3).
 *
 * Wszystkie znaczniki czasu trzymamy w UTC — kolumny są typu DATETIME, nie TIMESTAMP,
 * żeby MySQL nie konwertował wartości wg strefy sesji.
 */
@Entity
@Table(name = "reservation")
@Data
public class ReservationEntity {

    /** Identyfikator w konwencji reszty systemu: losowy 12-znakowy string. */
    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "offer_id", nullable = false)
    private OfferEntity offer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserModel user;

    /** Liczba zarezerwowanych sztuk, >= 1. */
    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReservationStatus status = ReservationStatus.RESERVED;

    /**
     * Krótki kod do podania przy kasie. Osobne pole, nie {@code id} — musi być
     * czytelny dla człowieka i niezgadywalny. Unikalny (indeks w bazie).
     */
    @Column(name = "pickup_code", nullable = false, length = 6, unique = true)
    private String pickupCode;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Moment wygaśnięcia holdu. Po nim rezerwacja nie blokuje już dostępności. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    /**
     * Kiedy wysłano push „rezerwacja wkrótce wygaśnie”; NULL = jeszcze nie. Ustawiany wyłącznie
     * warunkowym UPDATE-em ({@code ReservationRepository.claimExpiryWarning}) — to on gwarantuje
     * wysyłkę co najwyżej raz.
     */
    @Column(name = "expiry_warning_sent_at")
    private LocalDateTime expiryWarningSentAt;

    /** Kiedy wysłano push „możesz już odebrać”; NULL = jeszcze nie. Jak {@link #expiryWarningSentAt}. */
    @Column(name = "pickup_reminder_sent_at")
    private LocalDateTime pickupReminderSentAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UniqueIdGenerator.generateUniqueId(12);
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneOffset.UTC);
        }
        if (status == null) {
            status = ReservationStatus.RESERVED;
        }
    }

    /**
     * Czy rezerwacja zajmuje stan magazynowy oferty w podanej chwili (sekcja 1 designu).
     *
     * Zajmują: {@code RESERVED} przed terminem (trwa hold) oraz {@code COLLECTED}
     * (towar wydany). {@code EXPIRED} i {@code CANCELLED} stan zwalniają.
     */
    public boolean occupiesStockAt(LocalDateTime now) {
        if (status == ReservationStatus.COLLECTED) {
            return true;
        }
        return status == ReservationStatus.RESERVED
                && expiresAt != null
                && expiresAt.isAfter(now);
    }

    /** Czy hold wciąż trwa — czyli czy rezerwację da się jeszcze anulować. */
    public boolean isHoldActiveAt(LocalDateTime now) {
        return status == ReservationStatus.RESERVED
                && expiresAt != null
                && expiresAt.isAfter(now);
    }

    /**
     * Status widoczny dla klienta. Rezerwacja, której termin minął, ale której scheduler
     * jeszcze nie przestawił, raportowana jest jako {@code EXPIRED} — inaczej klient
     * widziałby przez chwilę nieprawdziwe {@code RESERVED} i pozwalał na akcje,
     * które i tak zostaną odrzucone.
     */
    public ReservationStatus effectiveStatus(LocalDateTime now) {
        if (status == ReservationStatus.RESERVED && expiresAt != null && !expiresAt.isAfter(now)) {
            return ReservationStatus.EXPIRED;
        }
        return status;
    }
}
