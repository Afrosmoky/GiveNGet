package com.example.gng.offerimport.service;

import com.example.gng.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

/**
 * Plik importu nie nadaje się do przetworzenia jako całość — odrzucamy całe żądanie.
 * Błędy pojedynczych wierszy nie trafiają tutaj, tylko do raportu w odpowiedzi.
 */
public class ImportFileException extends ApiException {

    private ImportFileException(String code, HttpStatus status, String message, Map<String, Object> details) {
        super(code, status, message, details);
    }

    public static ImportFileException fileRequired() {
        return new ImportFileException("FILE_REQUIRED", HttpStatus.BAD_REQUEST,
                "Wybierz plik .xlsx do importu.", Map.of());
    }

    public static ImportFileException invalidFileType() {
        return new ImportFileException("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                "Nieobsługiwany typ pliku. Prześlij arkusz Excel w formacie .xlsx.",
                Map.of("allowed", List.of(".xlsx")));
    }

    public static ImportFileException fileTooLarge(long maxBytes) {
        return new ImportFileException("FILE_TOO_LARGE", HttpStatus.PAYLOAD_TOO_LARGE,
                "Plik jest za duży.", Map.of("maxBytes", maxBytes));
    }

    public static ImportFileException unreadable() {
        return new ImportFileException("FILE_UNREADABLE", HttpStatus.BAD_REQUEST,
                "Nie udało się odczytać pliku. Upewnij się, że to poprawny, niezaszyfrowany arkusz .xlsx.",
                Map.of());
    }

    public static ImportFileException emptyFile() {
        return new ImportFileException("EMPTY_FILE", HttpStatus.BAD_REQUEST,
                "Plik nie zawiera żadnych ofert.", Map.of());
    }

    public static ImportFileException missingColumns(List<String> missing) {
        return new ImportFileException("MISSING_COLUMNS", HttpStatus.BAD_REQUEST,
                "W pierwszym wierszu brakuje wymaganych kolumn: " + String.join(", ", missing) + ".",
                Map.of("missing", missing));
    }

    public static ImportFileException tooManyRows(int maxRows) {
        return new ImportFileException("TOO_MANY_ROWS", HttpStatus.UNPROCESSABLE_ENTITY,
                "Plik zawiera za dużo wierszy. Podziel go na mniejsze części.",
                Map.of("maxRows", maxRows));
    }
}
