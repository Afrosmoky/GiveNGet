package com.example.gng.auth.admin.controller;

import com.example.gng.auth.admin.service.AdminService;
import com.example.gng.auth.service.SessionService;
import com.example.gng.ban.enums.BanReason;
import com.example.gng.ban.service.UserBanService;
import com.example.gng.complaint.dto.ComplaintListItemDTO;
import com.example.gng.complaint.dto.ComplaintNoteRequest;
import com.example.gng.complaint.dto.ComplaintNoteResponse;
import com.example.gng.chat.dto.MessageDto;
import com.example.gng.chat.service.ChatService;
import com.example.gng.complaint.service.ComplaintService;
import com.example.gng.complaint.service.ComplaintNoteService;
import com.example.gng.offer.dto.ModeratorUpdateOfferDTO;
import com.example.gng.offer.service.OfferService;
import com.example.gng.consultant.dto.ConsultantChatDto;
import com.example.gng.consultant.dto.ConsultantMessageDto;
import com.example.gng.consultant.dto.SendConsultantMessageRequest;
import com.example.gng.consultant.service.ConsultantChatService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/mod")
public class ModeratorController {
    private final AdminService adminService;
    private final ComplaintService complaintService;
    private final ChatService chatService;
    private final ConsultantChatService consultantChatService;
    private final UserRepository userRepository;
    private final UserBanService userBanService;
    private final ComplaintNoteService complaintNoteService;
    private final OfferService offerService;

    public ModeratorController(AdminService adminService, ComplaintService complaintService, ChatService chatService,
                               ConsultantChatService consultantChatService, UserRepository userRepository,
                               UserBanService userBanService, ComplaintNoteService complaintNoteService,
                               OfferService offerService) {
        this.adminService = adminService;
        this.complaintService = complaintService;
        this.chatService = chatService;
        this.consultantChatService = consultantChatService;
        this.userRepository = userRepository;
        this.userBanService = userBanService;
        this.complaintNoteService = complaintNoteService;
        this.offerService = offerService;
    }

    @GetMapping
    public ResponseEntity<String> ok() {
        return ResponseEntity.ok("Jesteś moderatorem");
    }

    @PatchMapping("/users/{id}/ban")
    public ResponseEntity<String> banUser(@PathVariable("id") Long userId,
                                         @RequestParam("banned") boolean banned,
                                         @RequestParam(value = "reasonCode", required = false) Integer reasonCode,
                                         @RequestParam(value = "reason", required = false) String reason,
                                         @RequestParam(value = "durationDays", required = false) Integer durationDays) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).body("Brak autoryzacji");
            }

            UserModel moderator = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Moderator nie znaleziony"));

            if (banned) {
                // Banowanie użytkownika
                if (reasonCode == null) {
                    return ResponseEntity.badRequest().body("Kod powodu bana (reasonCode) jest wymagany");
                }
                
                BanReason banReason;
                try {
                    banReason = BanReason.fromCode(reasonCode);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body("Nieprawidłowy kod powodu bana: " + reasonCode);
                }
                
                userBanService.banUser(userId, moderator.getId(), banReason, reason, durationDays);
            } else {
                // Odbanowanie użytkownika
                userBanService.unbanUser(userId, moderator.getId(), reason);
            }
            return ResponseEntity.ok("OK");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd podczas operacji banowania: " + e.getMessage());
        }
    }

    @GetMapping("/complaints")
    public ResponseEntity<java.util.List<ComplaintListItemDTO>> getComplaints(
            @RequestParam(value = "resolved", required = false) Boolean resolved,
            @RequestParam(value = "type", required = false) ComplaintListItemDTO.Type type
    ) {
        return ResponseEntity.ok(complaintService.getAllComplaints(resolved, type));
    }

    @GetMapping("/chats/{chatId}/messages/snippet")
    public ResponseEntity<java.util.List<MessageDto>> getConversationSnippet(
            @PathVariable("chatId") Long chatId,
            @RequestParam("messageId") Long messageId
    ) {
        return ResponseEntity.ok(chatService.getConversationSnippet(chatId, messageId));
    }

    @PatchMapping("/complaints/{id}/resolve")
    public ResponseEntity<String> setComplaintResolved(
            @PathVariable("id") Long complaintId,
            @RequestParam("resolved") boolean resolved
    ) {
        complaintService.updateComplaintResolvedStatus(complaintId, resolved);
        return ResponseEntity.ok("OK");
    }

    @PatchMapping("/offers/{id}/block")
    public ResponseEntity<String> blockOffer(
            @PathVariable("id") String offerId,
            @RequestParam("reason") String reason
    ) {
        adminService.blockOffer(offerId, reason);
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/consultant-chat")
    public ResponseEntity<List<ConsultantChatDto>> getAvailableConsultantChats() {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).build();
            }

            UserModel moderator = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Moderator nie znaleziony"));

            List<ConsultantChatDto> chats = consultantChatService.getAvailableChatsForModerator(moderator.getId());
            return ResponseEntity.ok(chats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/consultant-chat/{chatId}/assign")
    public ResponseEntity<ConsultantChatDto> assignConsultantChat(@PathVariable("chatId") Long chatId) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).build();
            }

            UserModel moderator = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Moderator nie znaleziony"));

            ConsultantChatDto chat = consultantChatService.assignChatToModerator(chatId, moderator.getId());
            return ResponseEntity.ok(chat);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/consultant-chat/{chatId}/unassign")
    public ResponseEntity<ConsultantChatDto> unassignConsultantChat(@PathVariable("chatId") Long chatId) {
        try {
            ConsultantChatDto chat = consultantChatService.unassignChatFromModerator(chatId);
            return ResponseEntity.ok(chat);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/consultant-chat/{chatId}/messages")
    public ResponseEntity<List<ConsultantMessageDto>> getConsultantChatMessages(@PathVariable("chatId") Long chatId) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).build();
            }

            UserModel moderator = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Moderator nie znaleziony"));

            List<ConsultantMessageDto> messages = consultantChatService.getChatMessages(chatId, moderator.getId());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/consultant-chat/message")
    public ResponseEntity<ConsultantMessageDto> sendConsultantMessage(@RequestBody SendConsultantMessageRequest request) {
        try {
            String userEmail = SessionService.getCurrentUserEmail();
            if (userEmail == null) {
                return ResponseEntity.status(401).build();
            }

            UserModel moderator = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Moderator nie znaleziony"));

            ConsultantMessageDto message = consultantChatService.sendMessage(request, moderator.getId());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/complaints/{complaintId}/notes")
    public ResponseEntity<ComplaintNoteResponse> createComplaintNote(@PathVariable("complaintId") Long complaintId,
                                                                      @RequestBody ComplaintNoteRequest request) {
        try {
            ComplaintNoteResponse note = complaintNoteService.createNote(complaintId, request);
            return ResponseEntity.ok(note);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/complaints/{complaintId}/notes")
    public ResponseEntity<List<ComplaintNoteResponse>> getComplaintNotes(@PathVariable("complaintId") Long complaintId) {
        try {
            List<ComplaintNoteResponse> notes = complaintNoteService.getNotes(complaintId);
            return ResponseEntity.ok(notes);
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/complaints/{complaintId}/notes/{noteId}")
    public ResponseEntity<String> deleteComplaintNote(@PathVariable("complaintId") Long complaintId,
                                                       @PathVariable("noteId") Long noteId) {
        try {
            complaintNoteService.deleteNote(noteId);
            return ResponseEntity.ok("OK");
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd podczas usuwania notatki");
        }
    }

    @PutMapping(value = "/offers/{offerId}", consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<String> updateOfferByModerator(@PathVariable("offerId") String offerId,
                                                         @ModelAttribute ModeratorUpdateOfferDTO updateDTO,
                                                         @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        try {
            String result = offerService.updateOfferByModerator(offerId, updateDTO, images);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd podczas aktualizacji oferty: " + e.getMessage());
        }
    }
}
