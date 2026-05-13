package com.example.gng.user.controller;

import com.example.gng.exceptions.InvalidRequestException;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.register.dto.RegisterUserDTO;
import com.example.gng.register.company.dto.RegisterCompanyDTO;
import com.example.gng.user.service.UserService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@CrossOrigin(origins = "localhost:3000")
@RequestMapping("/api")
public class RegistrationController {

    private final UserRepository userRepository;
    private final UserService userService;

    @Autowired
    public RegistrationController(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @PostMapping("/resentVerification")
    public ResponseEntity resentVerificationCode(@Validated @RequestBody String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            if (!user.getVerified()) {
                userService.sendVerifyEmail(user);
            }
        });
        return ResponseEntity.ok().build();
    }

    @GetMapping("/verify/{code}")
    public ResponseEntity verifyCode(@PathVariable String code) {
        try {
            userService.verifyUser(code);
            return ResponseEntity.ok().build();
        } catch (InvalidRequestException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity resetPassword(@Validated @RequestBody String email) {
        userRepository.findByEmail(email).ifPresent(userService::resetPassword);
        return ResponseEntity.ok().build();
    }
    @PostMapping("/reset-password/{code}")
    public ResponseEntity resetPassword(@PathVariable String code, @Validated @RequestBody String password) {
        userService.resetPassword(code, password);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/registerUser", consumes = {"multipart/form-data"})
    public ResponseEntity<?> registerUser(
            @Valid @ModelAttribute RegisterUserDTO user,
            @RequestParam(value = "profilePhoto", required = false) MultipartFile profilePhoto) {
        try {
            log.debug("Otrzymano żądanie rejestracji użytkownika");
            log.debug("Dane użytkownika: {}", user);
            log.debug("Zdjęcie profilowe obecne: {}", profilePhoto != null && !profilePhoto.isEmpty());
            log.debug("Content type żądania: {}", user.toString());

            userService.registerUser(user, profilePhoto);

            log.info("Zarejestrowano użytkownika: {}", user.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .build();

        } catch (Exception e) {
            log.error("Błąd podczas rejestracji użytkownika: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Błąd podczas rejestracji: " + e.getMessage());
        }
    }

    @PostMapping(value = "/registerCompany", consumes = {"multipart/form-data"})
    public ResponseEntity<?> registerCompany(
            @Valid @ModelAttribute RegisterCompanyDTO company,
            @RequestParam(value = "companyLogo", required = false) MultipartFile companyLogo) {

        log.debug("Received registerCompany request");
        log.debug("Company data: {}", company);
        log.debug("Company logo present: {}", companyLogo != null && !companyLogo.isEmpty());

        try {
            // Rejestracja firmy
            userService.registerCompany(company, companyLogo);


            log.info("Zarejestrowano firmę: {}", company.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .build();

        } catch (Exception e) {
            log.error("Błąd podczas rejestracji firmy: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

}
