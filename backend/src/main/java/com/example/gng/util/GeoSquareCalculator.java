package com.example.gng.util;

import com.example.gng.offer.dto.DistanceUnit;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

public class GeoSquareCalculator {

    // Stałe przeliczeniowe
    private static final BigDecimal KM_PER_DEGREE_LATITUDE = new BigDecimal("111.32"); // Przybliżona odległość 1 stopnia szerokości na Ziemi (w km)
    private static final BigDecimal MILES_PER_KM = new BigDecimal("0.621371"); // Ile mil w 1 km
    private static final BigDecimal KM_PER_MILE = new BigDecimal("1.60934"); // Ile km w 1 mili

    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP); // Precyzja obliczeń BigDecimal

    /**
     * Wylicza maksymalne współrzędne narożników kwadratu
     * a długość boku jest równa 2 * range.
     * UWAGA: Jest to APROKSYMACJA dla małych odległości. Dla dużych zakresów
     * i wysokiej precyzji, wymagane są bardziej zaawansowane algorytmy geodezyjne.
     *
     * @param lat Szerokość geograficzna środka kwadratu (BigDecimal).
     * @param lon Długość geograficzna środka kwadratu (BigDecimal).
     * @param range Promień od środka do każdego boku kwadratu (Integer).
     * @param distanceUnit Jednostka odległości (MILES lub KILOMETERS).
     * @return Tablica BigDecimal[] zawierająca maksymalne współrzędne w kolejności:
     * [góra, prawa, dół, lewa]
     * lub null, jeśli wejście jest nieprawidłowe.
     */
    public static BigDecimal[] calculateRange(
            BigDecimal lat, BigDecimal lon, Integer range, DistanceUnit distanceUnit) {

        if (lat == null || lon == null || range == null || distanceUnit == null || range < 0) {
            return null; // Nieprawidłowe dane wejściowe
        }

        // 1. Konwersja range na kilometry
        BigDecimal halfSideLengthKm;
        if (distanceUnit == DistanceUnit.MILES) {
            halfSideLengthKm = new BigDecimal(range).multiply(KM_PER_MILE, MC);
        } else { // DistanceUnit.KILOMETERS
            halfSideLengthKm = new BigDecimal(range);
        }

        // Długość całego boku kwadratu (odległość od lewej do prawej, od góry do dołu)
        BigDecimal sideLengthKm = halfSideLengthKm.multiply(new BigDecimal("2"), MC);

        // 2. Obliczenie zmiany szerokości geograficznej (delta_lat)
        // 1 stopień szerokości to w przybliżeniu 111.32 km wszędzie
        BigDecimal deltaLat = sideLengthKm.divide(KM_PER_DEGREE_LATITUDE, MC);

        // 3. Obliczenie zmiany długości geograficznej (delta_lon)
        // Długość 1 stopnia długości geograficznej zmienia się w zależności od szerokości geograficznej
        // Długość stopnia długości = (111.32 * cos(lat_w_radianach)) km
        double latRadians = Math.toRadians(lat.doubleValue());
        BigDecimal kmPerDegreeLongitude = KM_PER_DEGREE_LATITUDE.multiply(
                new BigDecimal(Math.cos(latRadians)), MC);

        // Zapobieganie dzieleniu przez zero lub bardzo małe wartości blisko biegunów
        if (kmPerDegreeLongitude.compareTo(BigDecimal.ZERO) == 0 || kmPerDegreeLongitude.abs().compareTo(new BigDecimal("0.01")) < 0) {
            // Na biegunach cos(lat) jest bliskie 0. Długość stopnia długości dąży do zera.
            // W praktyce oznacza to, że bardzo mała zmiana w długości może oznaczać dużą odległość.
            // Dla tego przypadku aproksymacja staje się bardzo niedokładna.
            // Można tu zwrócić null, rzucić wyjątek, lub przyjąć jakąś domyślną wartość.
            // Dla celów tej aproksymacji, jeśli jesteśmy bardzo blisko bieguna,
            // po prostu sprawimy, że deltaLon będzie bardzo duża, co może być niepraktyczne.
            // Zamiast tego, dla celów walidacji, lepiej uznać to za niemożliwe do obliczenia
            // przy tej aproksymacji lub wymagać wyspecjalizowanych algorytmów.
            System.err.println("Warning: Approaching poles, longitude calculation is highly inaccurate. Returning null.");
            return null;
        }

        BigDecimal deltaLon = sideLengthKm.divide(kmPerDegreeLongitude, MC);

        BigDecimal[] points = new BigDecimal[4];

        // Góra
        points[0] = lon.add(deltaLon, MC);
        // Prawa
        points[1] = lat.add(deltaLat, MC);


        // Dół
        points[2] = lon.subtract(deltaLon, MC);
        // Lewa
        points[3] = lat.subtract(deltaLat, MC);

        return points;
    }

}
