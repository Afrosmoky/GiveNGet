package com.example.gng.complaint.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.chat.entity.ChatEntity;
import com.example.gng.chat.entity.MessageEntity;
import com.example.gng.chat.repository.ChatRepository;
import com.example.gng.chat.repository.MessageRepository;
import com.example.gng.complaint.dto.ComplaintListItemDTO;
import com.example.gng.complaint.dto.ComplaintRequest;
import com.example.gng.complaint.entity.ComplaintEntity;
import com.example.gng.complaint.repository.ComplaintNoteRepository;
import com.example.gng.complaint.repository.ComplaintRepository;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final OfferRepository offerRepository;
    private final ComplaintNoteRepository complaintNoteRepository;

    @Autowired
    public ComplaintService(ComplaintRepository complaintRepository,
                          UserRepository userRepository,
                          ChatRepository chatRepository,
                          MessageRepository messageRepository,
                          OfferRepository offerRepository,
                          ComplaintNoteRepository complaintNoteRepository) {
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.offerRepository = offerRepository;
        this.complaintNoteRepository = complaintNoteRepository;
    }

    @Transactional
    public void createComplaint(ComplaintRequest request) {
        // Pobierz zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany, aby utworzyć skargę");
        }

        UserModel reporter = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Zalogowany użytkownik nie znaleziony"));

        ComplaintEntity complaintEntity = new ComplaintEntity();
        complaintEntity.setExplanation(request.getExplanation());
        complaintEntity.setReporter(reporter);

        // Sprawdź czy zgłaszana jest oferta
        if (request.getOfferId() != null && !request.getOfferId().trim().isEmpty()) {
            OfferEntity offerEntity = offerRepository.findById(request.getOfferId())
                    .orElseThrow(() -> new RuntimeException("Oferta nie znaleziona"));

            complaintEntity.setOfferEntity(offerEntity);
        } else {
            // Zgłaszanie użytkownika/wiadomości/czatu
            if (request.getReportedUserId() == null) {
                throw new RuntimeException("Musi być podany reportedUserId lub offerId");
            }

            // Sprawdź czy zgłaszany użytkownik istnieje
            UserModel reportedUser = userRepository.findById(request.getReportedUserId())
                    .orElseThrow(() -> new RuntimeException("Zgłaszany użytkownik nie znaleziony"));

            // Sprawdź czy użytkownik nie zgłasza samego siebie
            if (reporter.getId().equals(request.getReportedUserId())) {
                throw new RuntimeException("Nie można zgłosić samego siebie");
            }

            complaintEntity.setReportedUser(reportedUser);

            // Pobierz chat jeśli podano
            if (request.getChatId() != null) {
                ChatEntity chatEntity = chatRepository.findById(request.getChatId())
                        .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));
                complaintEntity.setChatEntity(chatEntity);
            }

            // Pobierz message jeśli podano
            if (request.getMessageId() != null) {
                MessageEntity messageEntity = messageRepository.findById(request.getMessageId())
                        .orElseThrow(() -> new RuntimeException("Wiadomość nie znaleziona"));
                complaintEntity.setMessageEntity(messageEntity);
            }
        }

        complaintRepository.save(complaintEntity);
        //TODO powiadomienie administratora o nowej skardze
    }

    public java.util.List<ComplaintListItemDTO> getAllComplaints(Boolean resolved, ComplaintListItemDTO.Type filterType) {
        java.util.List<ComplaintEntity> entities;
        if (resolved != null) {
            entities = complaintRepository.findByResolved(resolved);
        } else {
            entities = complaintRepository.findAll();
        }

        return entities.stream()
        .sorted(java.util.Comparator.comparing(ComplaintEntity::getCreatedAt))
        .filter(entity -> {
            if (filterType == null) return true;
            boolean isOffer = entity.getOfferEntity() != null;
            return (filterType == ComplaintListItemDTO.Type.OFFER && isOffer) || (filterType == ComplaintListItemDTO.Type.CHAT && !isOffer);
        }).map(entity -> {
            ComplaintListItemDTO.Type computedType = entity.getOfferEntity() != null
                    ? ComplaintListItemDTO.Type.OFFER
                    : ComplaintListItemDTO.Type.CHAT;

            Long reporterId = entity.getReporter() != null ? entity.getReporter().getId() : null;
            String reporterUserName = null;
            if (entity.getReporter() != null) {
                var reporter = entity.getReporter();
                if (reporter.getType() == com.example.gng.register.model.UserType.COMPANY && reporter instanceof com.example.gng.register.company.model.BusinessUserModel) {
                    reporterUserName = ((com.example.gng.register.company.model.BusinessUserModel) reporter).getCompanyName();
                } else {
                    reporterUserName = reporter.getFirstName() + " " + reporter.getLastName();
                }
            }
            Long reportedUserId;
            String reportedUserName;
            if (computedType == ComplaintListItemDTO.Type.OFFER && entity.getOfferEntity() != null && entity.getOfferEntity().getUser() != null) {
                var user = entity.getOfferEntity().getUser();
                reportedUserId = user.getId();
                if (user.getType() == com.example.gng.register.model.UserType.COMPANY && user instanceof com.example.gng.register.company.model.BusinessUserModel) {
                    reportedUserName = ((com.example.gng.register.company.model.BusinessUserModel) user).getCompanyName();
                } else {
                    reportedUserName = user.getFirstName() + " " + user.getLastName();
                }
            } else {
                reportedUserId = entity.getReportedUser() != null ? entity.getReportedUser().getId() : null;
                reportedUserName = entity.getReportedUser() != null ? (entity.getReportedUser().getFirstName() + " " + entity.getReportedUser().getLastName()) : null;
            }
            Long chatId = entity.getChatEntity() != null ? entity.getChatEntity().getId() : null;
            Long messageId = entity.getMessageEntity() != null ? entity.getMessageEntity().getId() : null;
            String offerId = entity.getOfferEntity() != null ? entity.getOfferEntity().getId() : null;
            
            // Zlicz liczbę notatek dla skargi
            Long notesCount = complaintNoteRepository.countByComplaintId(entity.getId());

            return new ComplaintListItemDTO(
                    entity.getId(),
                    computedType,
                    entity.getExplanation(),
                    reporterId,
                    reporterUserName,
                    reportedUserId,
                    reportedUserName,
                    chatId,
                    messageId,
                    offerId,
                    entity.getResolved(),
                    entity.getCreatedAt(),
                    notesCount
            );
        }).toList();
    }

    public void updateComplaintResolvedStatus(Long complaintId, boolean resolved) {
        ComplaintEntity entity = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Skarga nie znaleziona"));
        entity.setResolved(resolved);
        complaintRepository.save(entity);
    }
}