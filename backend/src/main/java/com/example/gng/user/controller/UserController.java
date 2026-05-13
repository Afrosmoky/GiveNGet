package com.example.gng.user.controller;

import com.example.gng.exceptions.UserNotFoundException;
import com.example.gng.exceptions.WrongPasswordException;
import com.example.gng.user.dto.ChangeEmailDto;
import com.example.gng.user.dto.ChangePasswordDto;
import com.example.gng.user.dto.UpdateUserInfoDTO;
import com.example.gng.auth.service.SessionService;
import com.example.gng.consultant.dto.ConsultantChatDto;
import com.example.gng.consultant.dto.ConsultantMessageDto;
import com.example.gng.consultant.dto.SendConsultantMessageRequest;
import com.example.gng.consultant.service.ConsultantChatService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.dto.UpdateAddressDto;
import com.example.gng.user.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;
    private final ConsultantChatService consultantChatService;
    private final UserRepository userRepository;

    @Autowired
    public UserController(UserService userService, ConsultantChatService consultantChatService, UserRepository userRepository) {
        this.userService = userService;
        this.consultantChatService = consultantChatService;
        this.userRepository = userRepository;
    }

    @PutMapping("/personalData")
    public ResponseEntity<?> updatePersonalData(@RequestBody UpdateUserInfoDTO updateUserInfo) {
        try {
            userService.updateUserInfo(updateUserInfo);
            return ResponseEntity.ok().build();
        } catch (UserNotFoundException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/changePassword")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordDto changePasswordDto) {
        try {
            userService.changePassword(changePasswordDto);
            return ResponseEntity.ok().build();
        } catch (UserNotFoundException e) {
            return ResponseEntity.badRequest().body("Nie znaleziono użytkownika");
        } catch (WrongPasswordException e) {
            return ResponseEntity.badRequest().body("Wprowadzono błędne hasło");
        }
    }

    @PutMapping("/changeEmail")
    public ResponseEntity<?> changeEmail(@RequestBody ChangeEmailDto changeEmailDto) {
        try {
            userService.changeEmail(changeEmailDto);
            return ResponseEntity.ok().build();
        } catch (UserNotFoundException e) {
            return ResponseEntity.badRequest().body("Nie znaleziono użytkownika");
        } catch (WrongPasswordException e) {
            return ResponseEntity.badRequest().body("Wprowadzono błędne hasło");
        }
    }

    @PostMapping("/uploadPhoto")
    public ResponseEntity<?> uploadPhoto(@RequestParam(value = "profilePhoto", required = false) MultipartFile profilePhoto) {
        try {
            String avatarUrl = userService.setAvatar(profilePhoto);
            return ResponseEntity.ok().body(avatarUrl);
        } catch (UserNotFoundException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/address")
    public ResponseEntity<?> updateAddress(@RequestBody UpdateAddressDto updateAddressDto) {
        try {
            userService.updateUserAddress(updateAddressDto);
            return ResponseEntity.ok().body("Adres został zaktualizowany pomyślnie");
        } catch (UserNotFoundException e) {
            return ResponseEntity.badRequest().body("Nie znaleziono użytkownika");
        } catch (Exception e) {
            log.error("Błąd podczas aktualizacji adresu: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas aktualizacji adresu: " + e.getMessage());
        }
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount() {
        log.info("Otrzymano żądanie usunięcia konta");
        try {
            userService.requestAccountDeletion();
            log.info("Pomyślnie zgłoszono usunięcie konta");
            return ResponseEntity.ok().body("Zgłoszono usunięcie konta. Konto zostanie usunięte za 2 tygodnie, chyba że się zalogujesz.");
        } catch (Exception e) {
            log.error("Błąd podczas zgłaszania usunięcia konta: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas zgłaszania usunięcia konta: " + e.getMessage());
        }
    }

    @PostMapping("/consultant-chat/start")
    public ResponseEntity<?> startConsultantChat() {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).body("Brak autoryzacji");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            ConsultantChatDto chat = consultantChatService.createConsultantChat(user.getId());
            return ResponseEntity.ok(chat);
        } catch (Exception e) {
            log.error("Błąd podczas tworzenia czatu z konsultantem: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas tworzenia czatu: " + e.getMessage());
        }
    }

    @GetMapping("/consultant-chat")
    public ResponseEntity<?> getConsultantChats() {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).body("Brak autoryzacji");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            List<ConsultantChatDto> chats = consultantChatService.getUserChats(user.getId());
            return ResponseEntity.ok(chats);
        } catch (Exception e) {
            log.error("Błąd podczas pobierania czatów z konsultantem: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas pobierania czatów: " + e.getMessage());
        }
    }

    @GetMapping("/consultant-chat/{chatId}/messages")
    public ResponseEntity<?> getConsultantChatMessages(@PathVariable("chatId") Long chatId) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).body("Brak autoryzacji");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            List<ConsultantMessageDto> messages = consultantChatService.getChatMessages(chatId, user.getId());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Błąd podczas pobierania wiadomości z czatu: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas pobierania wiadomości: " + e.getMessage());
        }
    }

    @PostMapping("/consultant-chat/message")
    public ResponseEntity<?> sendConsultantMessage(@RequestBody SendConsultantMessageRequest request) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).body("Brak autoryzacji");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            ConsultantMessageDto message = consultantChatService.sendMessage(request, user.getId());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Błąd podczas wysyłania wiadomości: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas wysyłania wiadomości: " + e.getMessage());
        }
    }

    @DeleteMapping("/consultant-chat/{chatId}")
    public ResponseEntity<?> closeConsultantChat(@PathVariable("chatId") Long chatId) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).body("Brak autoryzacji");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            consultantChatService.closeChat(chatId, user.getId());
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Błąd podczas zamykania czatu: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Błąd podczas zamykania czatu: " + e.getMessage());
        }
    }
}
