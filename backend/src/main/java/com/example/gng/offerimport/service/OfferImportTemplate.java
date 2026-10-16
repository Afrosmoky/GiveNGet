package com.example.gng.offerimport.service;

import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.SubcategoryEntity;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Szablon pliku importu — jedno źródło prawdy o kolumnach dla parsera, walidacji
 * i pliku do pobrania. Klient (web/mobile) nie zna listy kolumn, pobiera szablon.
 */
public final class OfferImportTemplate {

    /** Nazwa arkusza z danymi. Parser czyta zawsze pierwszy arkusz, niezależnie od nazwy. */
    static final String DATA_SHEET = "Oferty";

    private OfferImportTemplate() {
    }

    /**
     * Kolumny szablonu. Nagłówki porównujemy bez względu na wielkość liter i kolejność.
     */
    public enum Column {
        NAZWA("nazwa", true, "Nazwa produktu (maks. 255 znaków)"),
        OPIS("opis", true, "Opis oferty"),
        TYP_TRANSAKCJI("typ_transakcji", true, "sprzedaz / za_darmo / wymiana"),
        CENA("cena", false, "Cena za sztukę — wymagana tylko dla sprzedaży, np. 4.99"),
        WALUTA("waluta", false, "PLN / EUR / GBP — tylko dla sprzedaży, domyślnie PLN"),
        ILOSC("ilosc", false, "Liczba sztuk (liczba całkowita ≥ 0), domyślnie 1"),
        TERMIN_WAZNOSCI("termin_waznosci", true, "Data w formacie RRRR-MM-DD, nie wcześniejsza niż dziś"),
        GODZINY_ODBIORU_OD("godziny_odbioru_od", true, "Godzina w formacie GG:MM, np. 09:00"),
        GODZINY_ODBIORU_DO("godziny_odbioru_do", true, "Godzina w formacie GG:MM, np. 18:00"),
        KATEGORIA("kategoria", true, "Nazwa kategorii — lista w arkuszu „Kategorie”"),
        PODKATEGORIA("podkategoria", false, "Wymagana, gdy kategoria ma podkategorie"),
        LOKALIZACJA("lokalizacja", false, "Adres odbioru — domyślnie adres firmy"),
        SZEROKOSC_GEO("szerokosc_geo", false, "Szerokość geograficzna — domyślnie lokalizacja firmy"),
        DLUGOSC_GEO("dlugosc_geo", false, "Długość geograficzna — domyślnie lokalizacja firmy");

        private final String header;
        private final boolean required;
        private final String hint;

        Column(String header, boolean required, String hint) {
            this.header = header;
            this.required = required;
            this.hint = hint;
        }

        public String header() {
            return header;
        }

        public boolean required() {
            return required;
        }

        public String hint() {
            return hint;
        }

        static Optional<Column> fromHeader(String header) {
            if (header == null) {
                return Optional.empty();
            }
            String normalized = header.trim().toLowerCase(Locale.ROOT);
            return Arrays.stream(values()).filter(c -> c.header.equals(normalized)).findFirst();
        }
    }

    /**
     * Generuje plik szablonu: arkusz danych z przykładowymi wierszami, instrukcję
     * i aktualną listę kategorii z bazy (nazwy muszą się zgadzać co do znaku).
     */
    public static byte[] build(List<CategoryEntity> categories, LocalDate today) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = boldStyle(workbook);

            Sheet data = workbook.createSheet(DATA_SHEET);
            Row header = data.createRow(0);
            Column[] columns = Column.values();
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i].header());
                cell.setCellStyle(headerStyle);
            }
            // Daty i godziny jako tekst — komórka typu data w Excelu formatuje się
            // według ustawień regionalnych i użytkownik widziałby inny format niż wymagany
            addExample(data, 1, "Chleb żytni", "Pieczywo z dzisiejszego wypieku", "sprzedaz", 4.99, "PLN", 10,
                    today.plusDays(2), "16:00", "19:00", "Pieczywo i wypieki", "Pieczywo i bułki");
            addExample(data, 2, "Jabłka", "Lekko obite, idealne do szarlotki", "za_darmo", null, null, 5,
                    today.plusDays(3), "09:00", "18:00", "Owoce i warzywa", "Świeże owoce");
            addExample(data, 3, "Ser gouda 150 g", "Zamienię na pieczywo", "wymiana", null, null, 2,
                    today.plusDays(5), "10:00", "17:00", "Nabiał i alternatywy", "Sery");
            for (int i = 0; i < columns.length; i++) {
                data.setColumnWidth(i, 22 * 256);
            }

            Sheet instructions = workbook.createSheet("Instrukcja");
            Row instructionsHeader = instructions.createRow(0);
            String[] instructionHeaders = {"kolumna", "wymagana", "opis"};
            for (int i = 0; i < instructionHeaders.length; i++) {
                Cell cell = instructionsHeader.createCell(i);
                cell.setCellValue(instructionHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            for (int i = 0; i < columns.length; i++) {
                Row row = instructions.createRow(i + 1);
                row.createCell(0).setCellValue(columns[i].header());
                row.createCell(1).setCellValue(columns[i].required() ? "tak" : "nie");
                row.createCell(2).setCellValue(columns[i].hint());
            }
            instructions.setColumnWidth(0, 22 * 256);
            instructions.setColumnWidth(1, 10 * 256);
            instructions.setColumnWidth(2, 70 * 256);

            Sheet categorySheet = workbook.createSheet("Kategorie");
            Row categoryHeader = categorySheet.createRow(0);
            String[] categoryHeaders = {"kategoria", "podkategoria", "dozwolone typy"};
            for (int i = 0; i < categoryHeaders.length; i++) {
                Cell cell = categoryHeader.createCell(i);
                cell.setCellValue(categoryHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            int rowIndex = 1;
            for (CategoryEntity category : sortedById(categories)) {
                List<SubcategoryEntity> subcategories = category.getSubcategories() == null
                        ? List.of() : category.getSubcategories();
                if (subcategories.isEmpty()) {
                    Row row = categorySheet.createRow(rowIndex++);
                    row.createCell(0).setCellValue(category.getName());
                    row.createCell(2).setCellValue(describeAllowed(category.getAllowedTransactionTypes()));
                    continue;
                }
                for (SubcategoryEntity subcategory : subcategories) {
                    Row row = categorySheet.createRow(rowIndex++);
                    row.createCell(0).setCellValue(category.getName());
                    row.createCell(1).setCellValue(subcategory.getName());
                    row.createCell(2).setCellValue(describeAllowed(subcategory.getAllowedTransactionTypes()));
                }
            }
            categorySheet.setColumnWidth(0, 36 * 256);
            categorySheet.setColumnWidth(1, 36 * 256);
            categorySheet.setColumnWidth(2, 30 * 256);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Nie udało się wygenerować szablonu importu", e);
        }
    }

    private static List<CategoryEntity> sortedById(List<CategoryEntity> categories) {
        return categories.stream()
                .sorted(Comparator.comparing(CategoryEntity::getId, Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }

    /** Tłumaczy zapis z bazy (np. ["free", "sale"]) na wartości kolumny typ_transakcji. */
    private static String describeAllowed(String allowedTransactionTypes) {
        if (allowedTransactionTypes == null || allowedTransactionTypes.isBlank()) {
            return "sprzedaz, za_darmo, wymiana";
        }
        StringBuilder sb = new StringBuilder();
        if (allowedTransactionTypes.contains("\"sale\"")) sb.append("sprzedaz, ");
        if (allowedTransactionTypes.contains("\"free\"")) sb.append("za_darmo, ");
        if (allowedTransactionTypes.contains("\"exchange\"")) sb.append("wymiana, ");
        return sb.length() > 2 ? sb.substring(0, sb.length() - 2) : "";
    }

    private static void addExample(Sheet sheet, int rowIndex, String name, String description, String type,
                                   Double price, String currency, int quantity, LocalDate expiry,
                                   String from, String to, String category, String subcategory) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(Column.NAZWA.ordinal()).setCellValue(name);
        row.createCell(Column.OPIS.ordinal()).setCellValue(description);
        row.createCell(Column.TYP_TRANSAKCJI.ordinal()).setCellValue(type);
        if (price != null) {
            row.createCell(Column.CENA.ordinal()).setCellValue(price);
        }
        if (currency != null) {
            row.createCell(Column.WALUTA.ordinal()).setCellValue(currency);
        }
        row.createCell(Column.ILOSC.ordinal()).setCellValue(quantity);
        row.createCell(Column.TERMIN_WAZNOSCI.ordinal()).setCellValue(expiry.toString());
        row.createCell(Column.GODZINY_ODBIORU_OD.ordinal()).setCellValue(from);
        row.createCell(Column.GODZINY_ODBIORU_DO.ordinal()).setCellValue(to);
        row.createCell(Column.KATEGORIA.ordinal()).setCellValue(category);
        row.createCell(Column.PODKATEGORIA.ordinal()).setCellValue(subcategory);
    }

    private static CellStyle boldStyle(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        return style;
    }
}
