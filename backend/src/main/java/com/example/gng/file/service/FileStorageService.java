package com.example.gng.file.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private final Path rootLocation;
    private final Path imagesLocation;

    public FileStorageService(@Value("${file.storage.base-path}") String basePath,
                              @Value("${file.storage.images.path}") String imagesPath) {
        this.rootLocation = Paths.get(basePath);
        this.imagesLocation = Paths.get(imagesPath);
        init();
    }

    private void init() {
        try {
            Files.createDirectories(rootLocation);
            Files.createDirectories(imagesLocation);
            log.info("Utworzono katalogi dla plików: {}", rootLocation.toAbsolutePath());
        } catch (IOException e) {
            log.error("Nie można utworzyć katalogu dla plików", e);
            throw new RuntimeException("Nie można utworzyć katalogu dla plików", e);
        }
    }

    /**
     * Zapisuje zdjęcie profilowe użytkownika z MultipartFile
     * @param userId ID użytkownika
     * @param file przesłany plik
     * @return ścieżka do zapisanego pliku
     */
    public String saveProfilePicture(Long userId, MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Plik jest pusty");
            }

            // Walidacja typu pliku
            if (!isValidImageFile(file)) {
                throw new RuntimeException("Nieprawidłowy typ pliku. Dozwolone są tylko obrazy.");
            }

            // Utworzenie katalogu dla użytkownika
            Path userDirectory = imagesLocation.resolve(userId.toString());
            Files.createDirectories(userDirectory);

            // Generowanie unikalnej nazwy pliku
            String fileExtension = getFileExtension(file.getOriginalFilename(), file.getContentType());
            String uniqueFileName = "profilePicture_" + UUID.randomUUID().toString() + fileExtension;

            // Ścieżka do pliku
            Path targetLocation = userDirectory.resolve(uniqueFileName);

            // Zapis pliku
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Zwrócenie względnej ścieżki
            String relativePath = "images/" + userId + "/" + uniqueFileName;
            log.info("Zapisano zdjęcie profilowe: {}", relativePath);
            return relativePath;

        } catch (IOException e) {
            log.error("Błąd podczas zapisywania zdjęcia profilowego dla użytkownika {}", userId, e);
            throw new RuntimeException("Nie można zapisać zdjęcia profilowego", e);
        }
    }

    /**
     * Zapisuje zdjęcie oferty z MultipartFile
     * @param offerId ID oferty
     * @param file przesłany plik
     * @return ścieżka do zapisanego pliku
     */
    public String saveOfferImage(String offerId, MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Plik jest pusty");
            }

            // Walidacja typu pliku
            if (!isValidImageFile(file)) {
                throw new RuntimeException("Nieprawidłowy typ pliku. Dozwolone są tylko obrazy.");
            }

            // Utworzenie katalogu dla oferty
            Path offerDirectory = imagesLocation.resolve("offer").resolve(offerId);
            Files.createDirectories(offerDirectory);

            // Generowanie unikalnej nazwy pliku
            String fileExtension = getFileExtension(file.getOriginalFilename(), file.getContentType());
            String uniqueFileName = "offerImage_" + UUID.randomUUID().toString() + fileExtension;

            // Ścieżka do pliku
            Path targetLocation = offerDirectory.resolve(uniqueFileName);

            // Zapis pliku
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Zwrócenie względnej ścieżki
            String relativePath = "images/offer/" + offerId + "/" + uniqueFileName;
            log.info("Zapisano zdjęcie oferty: {}", relativePath);
            return relativePath;

        } catch (IOException e) {
            log.error("Błąd podczas zapisywania zdjęcia oferty dla oferty {}", offerId, e);
            throw new RuntimeException("Nie można zapisać zdjęcia oferty", e);
        }
    }

    /**
     * Usuwa stare zdjęcie profilowe
     * @param filePath ścieżka do pliku do usunięcia
     */
    public void deleteFile(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return;
        }

        try {
            // Konwersja ścieżki statycznej do rzeczywistej ścieżki pliku
            String actualPath = filePath.replace("/static/", "");
            Path fileToDelete = imagesLocation.resolve(actualPath);

            if (Files.exists(fileToDelete)) {
                Files.delete(fileToDelete);
                log.info("Usunięto plik: {}", filePath);
            }
        } catch (IOException e) {
            log.error("Błąd podczas usuwania pliku: {}", filePath, e);
        }
    }

    /**
     * Pobiera plik jako tablicę bajtów
     * @param filePath ścieżka do pliku
     * @return tablica bajtów pliku
     */
    public byte[] loadFileAsBytes(String filePath) {
        try {
            String actualPath = filePath.replace("/static/", "");
            Path file = imagesLocation.resolve(actualPath);

            if (Files.exists(file)) {
                return Files.readAllBytes(file);
            } else {
                log.warn("Plik nie istnieje: {}", filePath);
                return null;
            }
        } catch (IOException e) {
            log.error("Błąd podczas odczytywania pliku: {}", filePath, e);
            return null;
        }
    }

    /**
     * Sprawdza czy plik istnieje
     * @param filePath ścieżka do pliku
     * @return true jeśli plik istnieje
     */
    public boolean fileExists(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return false;
        }

        String actualPath = filePath.replace("/static/", "");
        Path file = imagesLocation.resolve(actualPath);
        return Files.exists(file);
    }

    /**
     * Sprawdza czy plik jest prawidłowym obrazem
     * @param file plik do sprawdzenia
     * @return true jeśli plik jest obrazem
     */
    private boolean isValidImageFile(MultipartFile file) {
        if (file.getContentType() == null) {
            return false;
        }

        String contentType = file.getContentType().toLowerCase();
        return contentType.equals("image/jpeg") ||
               contentType.equals("image/jpg") ||
               contentType.equals("image/png") ||
               contentType.equals("image/gif") ||
               contentType.equals("image/webp");
    }

    private String getFileExtension(String fileName, String mimeType) {
        // Próbuj wyciągnąć rozszerzenie z nazwy pliku
        if (StringUtils.hasText(fileName)) {
            String extension = StringUtils.getFilenameExtension(fileName);
            if (extension != null) {
                return "." + extension.toLowerCase();
            }
        }

        // Jeśli nie ma rozszerzenia, określ na podstawie MIME type
        if (mimeType != null) {
            switch (mimeType.toLowerCase()) {
                case "image/jpeg":
                case "image/jpg":
                    return ".jpg";
                case "image/png":
                    return ".png";
                case "image/gif":
                    return ".gif";
                case "image/webp":
                    return ".webp";
                default:
                    return ".jpg"; // domyślne
            }
        }

        return ".jpg"; // domyślne rozszerzenie
    }
}