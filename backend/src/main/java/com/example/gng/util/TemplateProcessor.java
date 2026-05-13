package com.example.gng.util;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TemplateProcessor {

    /**
     * Wyszukuje i zamienia tagi w szablonie.
     * Tagi w szablonie powinny być w formacie ${klucz}.
     *
     * @param template Szablon zawierający tagi do podmiany.
     * @param tags     Mapa, gdzie kluczem jest nazwa tagu (bez ${}), a wartością jest tekst do wstawienia.
     * @return Szablon z podmienionymi tagami.
     */
    public static String processTemplate(String template, Map<String, String> tags) {
        if (template == null || template.isEmpty()) {
            return template;
        }
        if (tags == null || tags.isEmpty()) {
            return template;
        }


        Pattern pattern = Pattern.compile("\\$\\{([a-zA-Z0-9_]+)\\}");
        Matcher matcher = pattern.matcher(template);

        StringBuilder result = new StringBuilder();
        int lastIndex = 0;

        while (matcher.find()) {
            result.append(template, lastIndex, matcher.start());

            String key = matcher.group(1);

            if (tags.containsKey(key)) {
                result.append(tags.get(key));
            } else {
                result.append(matcher.group(0));
            }
            lastIndex = matcher.end();
        }

        result.append(template, lastIndex, template.length());

        return result.toString();
    }

    public static void main(String[] args) {
        TemplateProcessor processor = new TemplateProcessor();

        // Przykład użycia
        Map<String, String> myTags = Map.of(
                "name", "Jan",
                "city", "Toruń",
                "product", "Kawa Zbożowa"
        );

        String myTemplate1 = "Witaj, ${name}! Mamy dla Ciebie specjalną ofertę w ${city}.";
        String myTemplate2 = "Twoje zamówienie na ${product} zostanie wysłane jutro. Dziękujemy, ${name}!";
        String myTemplate3 = "Ten tag ${unknown_tag} nie istnieje w mapie. A ten ${product} tak.";
        String myTemplate4 = "Brak tagów w tym szablonie.";
        String myTemplate5 = null;
        String myTemplate6 = "";
        Map<String, String> emptyTags = Map.of();


        System.out.println("Szablon 1 (oryginalny): " + myTemplate1);
        System.out.println("Szablon 1 (po przetworzeniu): " + processor.processTemplate(myTemplate1, myTags));
        System.out.println("---");

        System.out.println("Szablon 2 (oryginalny): " + myTemplate2);
        System.out.println("Szablon 2 (po przetworzeniu): " + processor.processTemplate(myTemplate2, myTags));
        System.out.println("---");

        System.out.println("Szablon 3 (oryginalny): " + myTemplate3);
        System.out.println("Szablon 3 (po przetworzeniu): " + processor.processTemplate(myTemplate3, myTags));
        System.out.println("---");

        System.out.println("Szablon 4 (oryginalny): " + myTemplate4);
        System.out.println("Szablon 4 (po przetworzeniu): " + processor.processTemplate(myTemplate4, myTags));
        System.out.println("---");

        System.out.println("Szablon 5 (null): " + myTemplate5);
        System.out.println("Szablon 5 (po przetworzeniu): " + processor.processTemplate(myTemplate5, myTags));
        System.out.println("---");

        System.out.println("Szablon 6 (pusty): " + myTemplate6);
        System.out.println("Szablon 6 (po przetworzeniu): " + processor.processTemplate(myTemplate6, myTags));
        System.out.println("---");

        System.out.println("Szablon 1 (z pustą mapą tagów): " + processor.processTemplate(myTemplate1, emptyTags));
    }
}
