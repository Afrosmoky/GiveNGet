package com.example.gng.geocode.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReverseGeocodeKeyGeneratorTest {

    @Test
    void wspolrzedneZEncjiIZFrontenduDajaTenSamKlucz() {
        assertThat(ReverseGeocodeKeyGenerator.key("52.193500", "21.004700"))
                .isEqualTo(ReverseGeocodeKeyGenerator.key("52.1935", "21.0047"))
                .isEqualTo("52.1935,21.0047");
    }

    @Test
    void zaokraglaDoCzterechMiejsc() {
        assertThat(ReverseGeocodeKeyGenerator.key("52.19354", "21.00475"))
                .isEqualTo("52.1935,21.0048");
        assertThat(ReverseGeocodeKeyGenerator.key("52", " 21.1 "))
                .isEqualTo("52.0000,21.1000");
    }

    @Test
    void kolejnoscWspolrzednychMaZnaczenie() {
        assertThat(ReverseGeocodeKeyGenerator.key("52.1935", "21.0047"))
                .isNotEqualTo(ReverseGeocodeKeyGenerator.key("21.0047", "52.1935"));
    }

    @Test
    void nieparsowalnaWartoscNieRzucaWyjatku() {
        assertThat(ReverseGeocodeKeyGenerator.key("abc", "21.0047"))
                .isEqualTo("abc,21.0047");
    }

    @Test
    void generatePrzekazujeParametryMetody() {
        Object key = new ReverseGeocodeKeyGenerator().generate(null, null, "52.193500", "21.0047");
        assertThat(key).isEqualTo("52.1935,21.0047");
    }
}
