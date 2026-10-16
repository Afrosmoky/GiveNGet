package com.example.gng.offer.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Domyślna wartość quantity na encji oferty.
 * Test leży w tym samym pakiecie co encja, żeby móc wywołać chroniony hook @PrePersist.
 */
class OfferEntityQuantityTest {

    @Test
    void newOffer_hasQuantityOneByDefault() {
        OfferEntity offer = new OfferEntity();

        assertEquals(1, offer.getQuantity(), "Nowa oferta powinna mieć domyślnie 1 sztukę");
    }

    @Test
    void onCreate_fillsQuantityWhenNull() {
        // Symuluje ścieżkę, w której ktoś jawnie wyzerował pole przed zapisem
        OfferEntity offer = new OfferEntity();
        offer.setQuantity(null);

        offer.onCreate();

        assertEquals(1, offer.getQuantity(), "@PrePersist powinien uzupełnić brakujące quantity wartością 1");
    }

    @Test
    void onCreate_keepsExplicitQuantity() {
        OfferEntity offer = new OfferEntity();
        offer.setQuantity(7);

        offer.onCreate();

        assertEquals(7, offer.getQuantity(), "@PrePersist nie powinien nadpisywać jawnie ustawionej ilości");
    }

    @Test
    void onCreate_keepsZeroQuantity() {
        // 0 to poprawna wartość (wyprzedane), nie "brak wartości"
        OfferEntity offer = new OfferEntity();
        offer.setQuantity(0);

        offer.onCreate();

        assertEquals(0, offer.getQuantity(), "quantity = 0 nie może być traktowane jak brak wartości");
    }
}
