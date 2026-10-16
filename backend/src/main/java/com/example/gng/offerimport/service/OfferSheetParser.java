package com.example.gng.offerimport.service;

import com.example.gng.offerimport.service.OfferImportTemplate.Column;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.NumberToTextConverter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.format.DateTimeFormatter;

/**
 * Czyta pierwszy arkusz pliku .xlsx do postaci tekstowej: nagłówki z wiersza 1,
 * każda kolejna niepusta linia to jedna oferta.
 *
 * <p>Parser nie zna reguł domeny — zamienia komórki na tekst i oznacza te, których
 * nie wolno użyć. Walidacja wartości jest w {@link OfferImportService}.
 *
 * <p>Formuł nie wyliczamy: wartość komórki z formułą zależy od tego, czy i czym
 * Excel ją ostatnio przeliczył, a ewaluacja po stronie serwera to niepotrzebna
 * powierzchnia ataku. Taka komórka jest błędem wiersza.
 */
final class OfferSheetParser {

    /**
     * Górny limit rozmiaru pojedynczego wpisu ZIP po rozpakowaniu. POI domyślnie
     * dopuszcza ~4 GB i pilnuje tylko współczynnika kompresji, co przy pliku 2 MB
     * nadal pozwala nadmuchać arkusz do setek MB w pamięci. Ustawienie jest globalne
     * dla POI w JVM — import ofert jest jego jedynym użytkownikiem.
     */
    private static final long MAX_ZIP_ENTRY_BYTES = 50L * 1024 * 1024;

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    static {
        ZipSecureFile.setMaxEntrySize(MAX_ZIP_ENTRY_BYTES);
    }

    private OfferSheetParser() {
    }

    /**
     * @param rowNumber        numer wiersza w Excelu (nagłówek = 1)
     * @param values           niepuste wartości komórek jako tekst
     * @param invalidCells     kolumny z formułą lub błędem Excela
     */
    record ParsedRow(int rowNumber, Map<Column, String> values, Set<Column> invalidCells) {
        String get(Column column) {
            return values.get(column);
        }
    }

    static List<ParsedRow> parse(InputStream input, int maxRows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(input)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw ImportFileException.emptyFile();
            }
            Sheet sheet = workbook.getSheetAt(0);
            Map<Integer, Column> columnsByIndex = readHeader(sheet.getRow(0));

            List<ParsedRow> rows = new ArrayList<>();
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                ParsedRow parsed = readRow(sheet.getRow(r), r + 1, columnsByIndex);
                if (parsed == null) {
                    continue;
                }
                if (rows.size() >= maxRows) {
                    throw ImportFileException.tooManyRows(maxRows);
                }
                rows.add(parsed);
            }
            if (rows.isEmpty()) {
                throw ImportFileException.emptyFile();
            }
            return rows;
        } catch (ImportFileException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            // Uszkodzony ZIP, zaszyfrowany plik, przekroczony limit ZipSecureFile, inny
            // dokument OOXML (np. .docx) — dla klienta to ten sam przypadek
            throw ImportFileException.unreadable();
        }
    }

    private static Map<Integer, Column> readHeader(Row header) {
        if (header == null) {
            throw ImportFileException.emptyFile();
        }
        Map<Integer, Column> columnsByIndex = new HashMap<>();
        Set<Column> seen = EnumSet.noneOf(Column.class);
        boolean anyHeader = false;
        for (Cell cell : header) {
            if (cell.getCellType() != CellType.STRING) {
                continue;
            }
            String text = cell.getStringCellValue();
            if (!text.isBlank()) {
                anyHeader = true;
            }
            // Powtórzona kolumna — liczy się pierwsze wystąpienie
            Column.fromHeader(text)
                    .filter(seen::add)
                    .ifPresent(column -> columnsByIndex.put(cell.getColumnIndex(), column));
        }
        if (!anyHeader) {
            throw ImportFileException.emptyFile();
        }
        List<String> missing = Arrays.stream(Column.values())
                .filter(Column::required)
                .filter(column -> !seen.contains(column))
                .map(Column::header)
                .toList();
        if (!missing.isEmpty()) {
            throw ImportFileException.missingColumns(missing);
        }
        return columnsByIndex;
    }

    /** Zwraca null dla wiersza bez żadnej wartości w znanych kolumnach. */
    private static ParsedRow readRow(Row row, int rowNumber, Map<Integer, Column> columnsByIndex) {
        if (row == null) {
            return null;
        }
        Map<Column, String> values = new EnumMap<>(Column.class);
        Set<Column> invalid = EnumSet.noneOf(Column.class);
        for (Map.Entry<Integer, Column> entry : columnsByIndex.entrySet()) {
            Cell cell = row.getCell(entry.getKey());
            if (cell == null) {
                continue;
            }
            CellType type = cell.getCellType();
            if (type == CellType.FORMULA || type == CellType.ERROR) {
                invalid.add(entry.getValue());
                continue;
            }
            String text = cellText(cell);
            if (text != null) {
                values.put(entry.getValue(), text);
            }
        }
        if (values.isEmpty() && invalid.isEmpty()) {
            return null;
        }
        return new ParsedRow(rowNumber, Collections.unmodifiableMap(values), Collections.unmodifiableSet(invalid));
    }

    private static String cellText(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING -> {
                String text = cell.getStringCellValue().trim();
                yield text.isEmpty() ? null : text;
            }
            case NUMERIC -> numericText(cell);
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    /**
     * Komórka liczbowa sformatowana jako data/godzina: ułamek < 1 to sama godzina
     * (Excel trzyma ją jako część doby), pozostałe to data. Zwykłe liczby oddajemy
     * w zapisie Excela, żeby 4.99 nie zamieniło się w 4.9900000000000002.
     */
    private static String numericText(Cell cell) {
        double value = cell.getNumericCellValue();
        if (DateUtil.isCellDateFormatted(cell)) {
            if (value >= 0 && value < 1) {
                long seconds = Math.round(value * 24 * 60 * 60) % (24 * 60 * 60);
                return LocalTime.ofSecondOfDay(seconds).format(TIME_FORMAT);
            }
            return cell.getLocalDateTimeCellValue().toLocalDate().toString();
        }
        return NumberToTextConverter.toText(value);
    }
}
