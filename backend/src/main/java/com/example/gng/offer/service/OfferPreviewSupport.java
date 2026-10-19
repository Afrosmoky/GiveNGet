package com.example.gng.offer.service;

import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import org.hibernate.Hibernate;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Wspólne fragmenty mapowania oferty na kafelek ({@link OfferPreview}).
 *
 * Kafelki budują dwa mappery — {@code OfferService} (listy, wyszukiwanie, sklep) i
 * {@code FavoriteOfferService} (ulubione). Pola sprzedawcy i ceny muszą wyglądać w obu
 * identycznie, inaczej ten sam kafelek wygląda inaczej zależnie od ekranu.
 */
public final class OfferPreviewSupport {

    private OfferPreviewSupport() {
    }

    /**
     * Sprzedawca — do linku na profil sklepu / osoby z kafelka. Nazwę podajemy tylko dla firm:
     * imię i nazwisko osoby prywatnej nie musi wisieć na każdym kafelku listy.
     */
    public static void applySeller(OfferPreview preview, UserModel seller) {
        if (seller == null) {
            return;
        }
        preview.setSellerId(seller.getId());
        preview.setSellerType(seller.getType());
        if (seller.getType() == UserType.COMPANY
                && Hibernate.unproxy(seller) instanceof BusinessUserModel company) {
            preview.setStoreName(company.getCompanyName());
        }
    }

    /** Cena, waluta i przecena (null dla ofert darmowych i wymian). */
    public static void applyPricing(OfferPreview preview, OfferEntity offer) {
        preview.setPrice(offer.getPrice());
        preview.setCurrency(offer.getCurrency());
        preview.setOriginalPrice(offer.getOriginalPrice());
        preview.setDiscountPercent(discountPercent(offer.getPrice(), offer.getOriginalPrice()));
    }

    /**
     * Rabat w procentach, zaokrąglony HALF_UP do całości (np. 4,50 zamiast 7,99 → 44).
     * Liczymy w backendzie, żeby web i aplikacja mobilna pokazywały tę samą liczbę.
     *
     * @return null, gdy brak przeceny, dane są niespójne albo rabat zaokrągla się do 0 % —
     *         badge „−0%” nic by nie mówił
     */
    public static Integer discountPercent(BigDecimal price, BigDecimal originalPrice) {
        if (price == null || originalPrice == null || originalPrice.signum() <= 0
                || price.compareTo(originalPrice) >= 0) {
            return null;
        }
        int percent = originalPrice.subtract(price)
                .multiply(BigDecimal.valueOf(100))
                .divide(originalPrice, 0, RoundingMode.HALF_UP)
                .intValueExact();
        return percent > 0 ? percent : null;
    }
}
