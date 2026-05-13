package com.example.gng.auth.controller;

import com.example.gng.auth.dto.LoginRequest;
import com.example.gng.auth.dto.LoginResponse;
import com.example.gng.auth.service.CustomUserDetailsService;
import com.example.gng.auth.service.JwtService;
import com.example.gng.ban.entity.UserBanEntity;
import com.example.gng.ban.enums.BanReason;
import com.example.gng.ban.service.UserBanService;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.register.model.Currency;
import com.example.gng.register.model.Language;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "localhost:3000")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final UserBanService userBanService;

    public AuthController(AuthenticationManager authenticationManager,
                         CustomUserDetailsService userDetailsService,
                         JwtService jwtService,
                         UserRepository userRepository,
                         FileStorageService fileStorageService,
                         UserBanService userBanService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.userBanService = userBanService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()
                    )
            );

            UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getEmail());
            
            // Pobierz dodatkowe dane użytkownika
            UserModel user = userRepository.findByEmail(loginRequest.getEmail())
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            // Sprawdź czy użytkownik ma aktywny ban
            java.util.Optional<UserBanEntity> activeBan = userBanService.getActiveBan(user.getId());
            if (activeBan.isPresent()) {
                UserBanEntity ban = activeBan.get();
                String banMessage = "Twoje konto zostało zablokowane";
                if (ban.getEndDate() != null) {
                    banMessage += " do " + ban.getEndDate().toString();
                } else {
                    banMessage += " permanentnie";
                }
                
                // Wyświetl powód bana - użyj opisu z enum, a jeśli OTHER to użyj reason
                BanReason reasonCode = ban.getReasonCode();
                String reasonText = reasonCode != null ? reasonCode.getDescription() : "Nieznany powód";
                if (reasonCode == BanReason.OTHER && ban.getReason() != null && !ban.getReason().isEmpty()) {
                    reasonText = ban.getReason();
                }
                banMessage += ". Powód: " + reasonText;
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(banMessage);
            }

            String jwt = jwtService.generateToken(userDetails);

            // Pobierz URL awatara użytkownika
            String profilePhotoUrl = null;
            try {
                if (user.getAvatar() != null) {
                    String filePath = user.getAvatar().getFilePath();
                    log.info("Ścieżka do pliku usera: " + filePath);
                    if (filePath != null && !filePath.isEmpty()) {
                        profilePhotoUrl = filePath;
                    }
                }
            } catch (Exception ignored) {}


            LoginResponse response = new LoginResponse(
                    jwt,
                    user.getEmail(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getType(),
                    user.getPhoneNumber(),
                    user.getId(),
                    Language.valueOf(user.getLang()),
                    Currency.valueOf(user.getCurrency()),
                    user.getLat(),
                    user.getLon(),
                    profilePhotoUrl,
                    "/dashboard"
            );

            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Bad credentials");
        }
        catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("User not confirmed");
        }
        catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd serwera podczas logowania");
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            String email = jwtService.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            if (jwtService.validateToken(token, userDetails)) {
                return ResponseEntity.ok("Token jest ważny");
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token jest nieważny");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token jest nieważny");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        try {
            // W przypadku JWT logout jest po stronie klienta - token zostanie usunięty z localStorage
            // Można tu dodatkowo zaimplementować blacklistę tokenów dla większego bezpieczeństwa

            String token = authHeader.substring(7);
            String email = jwtService.extractUsername(token);

            log.info("Użytkownik {} został wylogowany", email);

            return ResponseEntity.ok("Wylogowano pomyślnie");
        } catch (Exception e) {
            log.error("Błąd podczas wylogowania: {}", e.getMessage());
            return ResponseEntity.ok("Wylogowano pomyślnie"); // Zawsze zwracamy sukces dla bezpieczeństwa
        }
    }
}