package com.example.gng.offer.service;

import com.example.gng.common.exception.BadRequestException;
import com.example.gng.offer.entity.TransactionType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Cena przed obniżką (docs/08 #7): reguły w OfferService i rabat w OfferPreviewSupport.
 * Te same metody obsługują formularz, edycję i import Excela.
 */
class OfferOriginalPriceTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    // ---------- tworzenie ----------

    @Test
    void create_saleWithHigherOriginalPrice_isStoredAtPriceScale() {
        var pricing = OfferService.resolvePricingForCreate(TransactionType.sale, d("4.5"), "PLN", d("7.99"));

        assertEquals(d("4.50"), pricing.price());
        assertEquals(d("7.99"), pricing.originalPrice());
    }

    @Test
    void create_saleWithoutOriginalPrice_hasNoDiscount() {
        var pricing = OfferService.resolvePricingForCreate(TransactionType.sale, d("4.50"), "PLN", null);
        assertNull(pricing.originalPrice());
    }

    @Test
    void create_originalPriceEqualToPrice_isRejected() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(TransactionType.sale, d("4.50"), "PLN", d("4.50")));
        assertEquals("ORIGINAL_PRICE_NOT_HIGHER", ex.getCode());
        assertEquals("4.50", ex.getDetails().get("originalPrice"));
    }

    @Test
    void create_originalPriceLowerThanPrice_isRejected() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(TransactionType.sale, d("4.50"), "PLN", d("3.00")));
        assertEquals("ORIGINAL_PRICE_NOT_HIGHER", ex.getCode());
    }

    @Test
    void create_originalPriceForFreeOrExchange_isRejected() {
        for (TransactionType type : new TransactionType[]{TransactionType.free, TransactionType.exchange}) {
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> OfferService.resolvePricingForCreate(type, null, null, d("5.00")));
            assertEquals("ORIGINAL_PRICE_NOT_ALLOWED", ex.getCode(), type.name());
        }
    }

    @Test
    void create_invalidOriginalPriceFormat_isRejectedWithOwnCode() {
        for (String bad : new String[]{"0", "-1", "7.999", "100000000.00"}) {
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> OfferService.resolvePricingForCreate(TransactionType.sale, d("1.00"), "PLN", d(bad)));
            assertEquals("INVALID_ORIGINAL_PRICE", ex.getCode(), bad);
        }
    }

    // ---------- edycja ----------

    @Test
    void update_nullOriginalPrice_keepsStoredValue() {
        var pricing = OfferService.resolvePricingForUpdate(TransactionType.sale, d("4.00"), null,
                null, false, d("4.50"), "PLN", d("7.99"));

        assertEquals(d("4.00"), pricing.price());
        assertEquals(d("7.99"), pricing.originalPrice(), "brak pola = bez zmian");
    }

    @Test
    void update_clearFlag_removesDiscount() {
        var pricing = OfferService.resolvePricingForUpdate(TransactionType.sale, null, null,
                null, true, d("4.50"), "PLN", d("7.99"));
        assertNull(pricing.originalPrice());
    }

    @Test
    void update_clearFlagTogetherWithValue_isRejected() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForUpdate(TransactionType.sale, null, null,
                        d("9.00"), true, d("4.50"), "PLN", d("7.99")));
        assertEquals("INVALID_ORIGINAL_PRICE", ex.getCode());
    }

    @Test
    void update_changeToFreeOrExchange_clearsDiscount() {
        var pricing = OfferService.resolvePricingForUpdate(TransactionType.free, null, null,
                null, false, d("4.50"), "PLN", d("7.99"));
        assertNull(pricing.price());
        assertNull(pricing.originalPrice());
    }

    @Test
    void update_raisingPriceAboveStoredOriginal_isRejectedWithHint() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForUpdate(TransactionType.sale, d("8.00"), null,
                        null, false, d("4.50"), "PLN", d("7.99")));

        assertEquals("ORIGINAL_PRICE_NOT_HIGHER", ex.getCode());
        assertTrue(ex.getMessage().contains("Podnieś też cenę przed obniżką albo ją usuń"),
                "komunikat podpowiada, że trzeba poprawić też cenę przed obniżką: " + ex.getMessage());
    }

    @Test
    void update_newOriginalPrice_isValidatedAgainstEffectivePrice() {
        // Cena bez zmian (null) — porównujemy z zapisaną
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForUpdate(TransactionType.sale, null, null,
                        d("4.00"), false, d("4.50"), "PLN", null));
        assertEquals("ORIGINAL_PRICE_NOT_HIGHER", ex.getCode());

        var ok = OfferService.resolvePricingForUpdate(TransactionType.sale, null, null,
                d("6.00"), false, d("4.50"), "PLN", null);
        assertEquals(d("6.00"), ok.originalPrice());
    }

    // ---------- rabat ----------

    @Test
    void discountPercent_isRoundedHalfUp() {
        assertEquals(44, OfferPreviewSupport.discountPercent(d("4.50"), d("7.99")));   // 43,67 %
        assertEquals(50, OfferPreviewSupport.discountPercent(d("5.00"), d("10.00")));
        assertEquals(1, OfferPreviewSupport.discountPercent(d("9.95"), d("10.00")));   // 0,5 % → 1
    }

    @Test
    void discountPercent_isNullWithoutMeaningfulDiscount() {
        assertNull(OfferPreviewSupport.discountPercent(d("9.96"), d("10.00")), "0,4 % → 0 → bez badge'a");
        assertNull(OfferPreviewSupport.discountPercent(d("4.50"), null));
        assertNull(OfferPreviewSupport.discountPercent(null, d("7.99")));
        assertNull(OfferPreviewSupport.discountPercent(d("8.00"), d("7.99")), "dane niespójne — bez badge'a");
    }
}
