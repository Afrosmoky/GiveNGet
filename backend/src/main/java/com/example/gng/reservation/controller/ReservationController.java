package com.example.gng.reservation.controller;

import com.example.gng.common.dto.PageResponse;
import com.example.gng.reservation.dto.CollectReservationRequest;
import com.example.gng.reservation.dto.CreateReservationRequest;
import com.example.gng.reservation.dto.ReservationDTO;
import com.example.gng.reservation.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Rezerwacje po stronie użytkownika (docs/04_REZERWACJE_DESIGN.md, sekcja 6).
 *
 * Endpointy pod /api/v1 (CLAUDE.md 6.2), wyłącznie DTO w odpowiedziach (6.1),
 * listy paginowane (6.4). Brak try/catch — wyjątki domenowe tłumaczy
 * {@code ApiExceptionHandler} na kształt {code, message, details} (6.3).
 *
 * Uwierzytelnienie i role egzekwuje {@code SecurityConfig}; tożsamość wywołującego
 * bierzemy z {@link Authentication}, nie ze statycznego SessionService.
 */
@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    /** Tworzy rezerwację. Zwraca 201 z kodem odbioru i treścią do QR. */
    @PostMapping
    public ResponseEntity<ReservationDTO> create(Authentication authentication,
                                                @Valid @RequestBody CreateReservationRequest request) {
        ReservationDTO created = reservationService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** Rezerwacje zalogowanego użytkownika, sortowane createdAt desc, id asc. */
    @GetMapping
    public ResponseEntity<PageResponse<ReservationDTO>> list(
            Authentication authentication,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {

        return ResponseEntity.ok(reservationService.listForCurrentUser(authentication.getName(), page, size));
    }

    /** Szczegóły własnej rezerwacji. */
    @GetMapping("/{id}")
    public ResponseEntity<ReservationDTO> get(Authentication authentication,
                                              @PathVariable("id") String id) {
        return ResponseEntity.ok(reservationService.getOwned(authentication.getName(), id));
    }

    /** Anuluje własną aktywną rezerwację i zwraca jej stan po zmianie. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ReservationDTO> cancel(Authentication authentication,
                                                 @PathVariable("id") String id) {
        return ResponseEntity.ok(reservationService.cancel(authentication.getName(), id));
    }

    /**
     * Potwierdza odbiór rezerwacji po kodzie okazanym przez klienta — panel pracownika
     * sklepu (wpisanie kodu albo skan QR). Dostęp: ROLE_STORE_EMPLOYEE oraz ADMIN.
     *
     * Ścieżka bez identyfikatora rezerwacji: pracownik zna tylko kod, a rezerwacja
     * nie jest jego zasobem.
     */
    @PostMapping("/collect")
    public ResponseEntity<ReservationDTO> collect(Authentication authentication,
                                                  @Valid @RequestBody CollectReservationRequest request) {
        return ResponseEntity.ok(reservationService.collect(authentication.getName(), request.pickupCode()));
    }
}
