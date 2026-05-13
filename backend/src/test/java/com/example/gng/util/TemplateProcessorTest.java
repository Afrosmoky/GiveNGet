package com.example.gng.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class TemplateProcessorTest {

    private TemplateProcessor templateProcessor;
    private Map<String, String> defaultTags;

    @BeforeEach
    void setUp() {
        // Inicjalizacja procesora szablonów przed każdym testem
        templateProcessor = new TemplateProcessor();

        // Standardowa mapa tagów, używana w wielu testach
        defaultTags = new HashMap<>();
        defaultTags.put("name", "Anna");
        defaultTags.put("city", "Warszawa");
        defaultTags.put("product", "Laptop");
    }

    @Test
    @DisplayName("Should correctly replace single tag")
    void shouldReplaceSingleTag() {
        String template = "Witaj, ${name}!";
        String expected = "Witaj, Anna!";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should correctly replace multiple different tags")
    void shouldReplaceMultipleDifferentTags() {
        String template = "Witaj, ${name}! Twoje zamówienie na ${product} zostanie wysłane do ${city}.";
        String expected = "Witaj, Anna! Twoje zamówienie na Laptop zostanie wysłane do Warszawa.";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should correctly replace repeated tags")
    void shouldReplaceRepeatedTags() {
        String template = "Witaj, ${name}! Jak się masz, ${name}?";
        String expected = "Witaj, Anna! Jak się masz, Anna?";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should leave unknown tags unchanged")
    void shouldLeaveUnknownTagsUnchanged() {
        String template = "Witaj, ${name}! Twój numer klienta: ${customer_id}.";
        String expected = "Witaj, Anna! Twój numer klienta: ${customer_id}.";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should return original template if no tags found")
    void shouldReturnOriginalTemplateIfNoTagsFound() {
        String template = "To jest zwykły tekst bez tagów.";
        String expected = "To jest zwykły tekst bez tagów.";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should return empty string for empty template")
    void shouldReturnEmptyStringForEmptyTemplate() {
        String template = "";
        String expected = "";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should return null for null template")
    void shouldReturnNullForNullTemplate() {
        String template = null;
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertNull(actual); // Oczekujemy, że metoda zwróci null, jeśli otrzyma null
    }

    @Test
    @DisplayName("Should return original template if tags map is empty")
    void shouldReturnOriginalTemplateIfTagsMapIsEmpty() {
        String template = "Witaj, ${name}!";
        Map<String, String> emptyTagsMap = Collections.emptyMap();
        String expected = "Witaj, ${name}!"; // Tag powinien pozostać nienaruszony
        String actual = TemplateProcessor.processTemplate(template, emptyTagsMap);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should return original template if tags map is null")
    void shouldReturnOriginalTemplateIfTagsMapIsNull() {
        String template = "Witaj, ${name}!";
        Map<String, String> nullTagsMap = null;
        String expected = "Witaj, ${name}!"; // Tag powinien pozostać nienaruszony
        String actual = TemplateProcessor.processTemplate(template, nullTagsMap);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should handle tags with special characters in value")
    void shouldHandleSpecialCharactersInTagValue() {
        Map<String, String> specialTags = new HashMap<>();
        specialTags.put("message", "Hello, World! @#$%^&*()_+-=[]{};':\"|,.<>/?");
        String template = "Wiadomość: ${message}";
        String expected = "Wiadomość: Hello, World! @#$%^&*()_+-=[]{};':\"|,.<>/?";
        String actual = TemplateProcessor.processTemplate(template, specialTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should handle tags right next to each other")
    void shouldHandleAdjacentTags() {
        String template = "${name}${city}";
        String expected = "AnnaWarszawa";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Should handle tags at the beginning and end of the template")
    void shouldHandleTagsAtStartAndEnd() {
        String template = "${name} to ${city}";
        String expected = "Anna to Warszawa";
        String actual = TemplateProcessor.processTemplate(template, defaultTags);
        assertEquals(expected, actual);
    }
}