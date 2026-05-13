package com.example.gng.file.controller;

import com.example.gng.file.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/static")
public class FileController {

    private final FileStorageService fileStorageService;

    @Autowired
    public FileController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @GetMapping("/offer/{offerId}/{fileName:.+}")
    public ResponseEntity<Resource> serveOfferFile(@PathVariable String offerId, @PathVariable String fileName) {
        String filePath = "/static/offer/" + offerId + "/" + fileName;
        try {
            return serveFile(filePath, fileName);
        } catch (Exception e) {
            log.error("Błąd podczas serwowania pliku: {}/{}", offerId, fileName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private ResponseEntity<Resource> serveFile(String filePath, String fileName) {
        byte[] fileBytes = fileStorageService.loadFileAsBytes(filePath);

        if (fileBytes == null) {
            log.warn("Plik nie znaleziony: {}", filePath);
            return ResponseEntity.notFound().build();
        }

        // Określenie typu MIME na podstawie rozszerzenia pliku
        MediaType mediaType = getMediaTypeForFileName(fileName);

        ByteArrayResource resource = new ByteArrayResource(fileBytes);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(fileBytes.length)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=3600") // Cache na 1 godzinę
                .body(resource);


    }

    @GetMapping("/{userId}/{fileName:.+}")
    public ResponseEntity<Resource> serveLogoFile(@PathVariable String userId, @PathVariable String fileName) {
        String filePath = "/static/" + userId + "/" + fileName;
        try {
            return serveFile(filePath, fileName);
        } catch (Exception e) {
            log.error("Błąd podczas serwowania pliku: {}/{}", userId, fileName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{userId}/profilePicture")
    public ResponseEntity<Resource> serveProfilePicture(@PathVariable String userId) {
        try {
            // Znajdź plik profilowy użytkownika (możemy mieć różne rozszerzenia)
            String[] extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"};

            for (String ext : extensions) {
                String fileName = "profilePicture" + ext;
                String filePath = "/static/" + userId + "/" + fileName;

                if (fileStorageService.fileExists(filePath)) {
                    byte[] fileBytes = fileStorageService.loadFileAsBytes(filePath);
                    if (fileBytes != null) {
                        MediaType mediaType = getMediaTypeForFileName(fileName);
                        ByteArrayResource resource = new ByteArrayResource(fileBytes);

                        return ResponseEntity.ok()
                                .contentType(mediaType)
                                .contentLength(fileBytes.length)
                                .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                                .body(resource);
                    }
                }
            }

            log.warn("Zdjęcie profilowe nie znalezione dla użytkownika: {}", userId);
            return ResponseEntity.notFound().build();

        } catch (Exception e) {
            log.error("Błąd podczas serwowania zdjęcia profilowego dla użytkownika: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private MediaType getMediaTypeForFileName(String fileName) {
        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();

        switch (extension) {
            case "jpg":
            case "jpeg":
                return MediaType.IMAGE_JPEG;
            case "png":
                return MediaType.IMAGE_PNG;
            case "gif":
                return MediaType.IMAGE_GIF;
            case "webp":
                return MediaType.valueOf("image/webp");
            default:
                return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}