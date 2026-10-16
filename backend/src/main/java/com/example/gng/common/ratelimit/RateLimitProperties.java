package com.example.gng.common.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Limity tempa żądań, konfigurowalne przez properties (prefiks {@code ratelimit}).
 *
 * <p>Każdy limit to para: {@code capacity} (ile żądań) na {@code period} (w jakim czasie).
 * Wartości domyślne są punktem wyjścia do dostrojenia na pilotażu — celowo luźne,
 * żeby nie blokować normalnego użycia.
 */
@Component
@ConfigurationProperties(prefix = "ratelimit")
public class RateLimitProperties {

    /** Tworzenie rezerwacji, klucz: identyfikator użytkownika. */
    private Limit reservationCreate = new Limit(10, Duration.ofHours(1));

    /** Potwierdzanie odbioru, klucz: konto pracownika. Spowalnia zgadywanie pickupCode. */
    private Limit reservationCollect = new Limit(30, Duration.ofMinutes(1));

    /** Logowanie, klucz: adres IP klienta. Ochrona przed brute-force. */
    private Limit login = new Limit(10, Duration.ofMinutes(1));

    public Limit getReservationCreate() {
        return reservationCreate;
    }

    public void setReservationCreate(Limit reservationCreate) {
        this.reservationCreate = reservationCreate;
    }

    public Limit getReservationCollect() {
        return reservationCollect;
    }

    public void setReservationCollect(Limit reservationCollect) {
        this.reservationCollect = reservationCollect;
    }

    public Limit getLogin() {
        return login;
    }

    public void setLogin(Limit login) {
        this.login = login;
    }

    /** Pojedynczy limit. Mutowalna klasa, bo tak wiąże Spring Boot z properties. */
    public static class Limit {
        private int capacity;
        private Duration period;

        public Limit() {
        }

        public Limit(int capacity, Duration period) {
            this.capacity = capacity;
            this.period = period;
        }

        public int getCapacity() {
            return capacity;
        }

        public void setCapacity(int capacity) {
            this.capacity = capacity;
        }

        public Duration getPeriod() {
            return period;
        }

        public void setPeriod(Duration period) {
            this.period = period;
        }
    }
}
