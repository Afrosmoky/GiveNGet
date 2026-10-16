package com.example.gng.reservation.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kod odbioru jest przepisywany ręcznie przez pracownika sklepu i jest jednocześnie
 * sekretem potwierdzającym odbiór — testujemy oba wymagania.
 */
class PickupCodeGeneratorTest {

    private final PickupCodeGenerator generator = new PickupCodeGenerator();

    @Test
    void generatesCodeOfExpectedLength() {
        assertEquals(6, generator.generate().length());
    }

    @Test
    void usesOnlyAllowedCharacters() {
        for (int i = 0; i < 500; i++) {
            String code = generator.generate();
            for (char c : code.toCharArray()) {
                assertTrue(PickupCodeGenerator.ALPHABET.indexOf(c) >= 0,
                        "Znak '" + c + "' nie należy do dozwolonego alfabetu (kod: " + code + ")");
            }
        }
    }

    @Test
    void alphabetExcludesConfusableCharacters() {
        // O/0 oraz I/1 są nieodróżnialne przy przepisywaniu z ekranu
        for (char forbidden : new char[]{'O', 'I', '0', '1'}) {
            assertFalse(PickupCodeGenerator.ALPHABET.indexOf(forbidden) >= 0,
                    "Alfabet nie powinien zawierać znaku mylącego: " + forbidden);
        }
    }

    @Test
    void alphabetHasNoDuplicates() {
        Set<Character> seen = new HashSet<>();
        for (char c : PickupCodeGenerator.ALPHABET.toCharArray()) {
            assertTrue(seen.add(c), "Znak powtórzony w alfabecie: " + c);
        }
        // A-Z bez O i I (24) + 2-9 (8)
        assertEquals(32, seen.size());
    }

    @Test
    void generatesVariedCodes() {
        // Nie dowód losowości, ale wyłapuje generator zwracający stałą albo o zerowej entropii
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            codes.add(generator.generate());
        }
        assertTrue(codes.size() > 990,
                "Oczekiwano niemal wyłącznie unikalnych kodów, otrzymano " + codes.size() + "/1000");
    }
}
