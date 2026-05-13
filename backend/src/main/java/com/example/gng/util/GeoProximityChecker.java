package com.example.gng.util;

import com.example.gng.offer.dto.DistanceUnit;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

public class GeoProximityChecker {

    // Promień Ziemi w kilometrach i milach (średnie wartości)
    private static final BigDecimal EARTH_RADIUS_KM = new BigDecimal("6371.0"); // Średni promień Ziemi w km
    private static final BigDecimal EARTH_RADIUS_MILES = new BigDecimal("3958.8"); // Średni promień Ziemi w milach

    // Precyzja obliczeń BigDecimal
    private static final MathContext MC = new MathContext(15, RoundingMode.HALF_UP); // Zwiększona precyzja dla lepszych wyników

    /**
     * Oblicza odległość między dwoma punktami na powierzchni Ziemi przy użyciu wzoru haversine'a.
     *
     * @param lat1 Szerokość geograficzna pierwszego punktu w stopniach.
     * @param lon1 Długość geograficzna pierwszego punktu w stopniach.
     * @param lat2 Szerokość geograficzna drugiego punktu w stopniach.
     * @param lon2 Długość geograficzna drugiego punktu w stopniach.
     * @param unit Jednostka, w której ma być zwrócona odległość (KILOMETERS lub MILES).
     * @return Odległość między dwoma punktami.
     * @throws IllegalArgumentException jeśli którykolwiek z parametrów jest null.
     */
    public static BigDecimal calculateHaversineDistance(
            BigDecimal lat1, BigDecimal lon1, BigDecimal lat2, BigDecimal lon2, DistanceUnit unit) {

        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null || unit == null) {
            throw new IllegalArgumentException("All coordinate and unit parameters must not be null.");
        }

        // Konwertuj stopnie na radiany
        double lat1Rad = Math.toRadians(lat1.doubleValue());
        double lon1Rad = Math.toRadians(lon1.doubleValue());
        double lat2Rad = Math.toRadians(lat2.doubleValue());
        double lon2Rad = Math.toRadians(lon2.doubleValue());

        // Różnica w szerokościach i długościach
        double deltaLat = lat2Rad - lat1Rad;
        double deltaLon = lon2Rad - lon1Rad;

        // Wzór haversine'a
        double a = Math.pow(Math.sin(deltaLat / 2), 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                        Math.pow(Math.sin(deltaLon / 2), 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        BigDecimal radius = (unit == DistanceUnit.KILOMETERS) ? EARTH_RADIUS_KM : EARTH_RADIUS_MILES;

        return radius.multiply(new BigDecimal(c), MC);
    }

    /**
     * Sprawdza, czy punkt (actualLat, actualLon) znajduje się w okręgu
     * o środku w (baseLat, baseLon) i promieniu 'range'.
     *
     * @param baseLat Szerokość geograficzna środka okręgu.
     * @param baseLon Długość geograficzna środka okręgu.
     * @param range Promień okręgu.
     * @param distanceUnit Jednostka promienia (KILOMETERS lub MILES).
     * @param actualLat Szerokość geograficzna punktu do sprawdzenia.
     * @param actualLon Długość geograficzna punktu do sprawdzenia.
     * @return true, jeśli punkt znajduje się w okręgu; false w przeciwnym razie.
     * @throws IllegalArgumentException jeśli którykolwiek z parametrów jest null lub range jest ujemne.
     */
    public static boolean isPointInCircle(
            BigDecimal baseLat, BigDecimal baseLon, Integer range,
            DistanceUnit distanceUnit, BigDecimal actualLat, BigDecimal actualLon) {

        if (baseLat == null || baseLon == null || range == null || distanceUnit == null ||
                actualLat == null || actualLon == null) {
            throw new IllegalArgumentException("All parameters must not be null.");
        }
        if (range < 0) {
            throw new IllegalArgumentException("Range cannot be negative.");
        }

        // Oblicz odległość między punktem bazowym a punktem aktualnym
        BigDecimal distance = calculateHaversineDistance(
                baseLat, baseLon, actualLat, actualLon, distanceUnit);

        // Porównaj obliczoną odległość z promieniem
        return distance.compareTo(new BigDecimal(range)) <= 0;
    }
}
