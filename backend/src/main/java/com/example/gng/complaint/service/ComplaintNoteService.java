package com.example.gng.complaint.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.complaint.dto.ComplaintNoteRequest;
import com.example.gng.complaint.dto.ComplaintNoteResponse;
import com.example.gng.complaint.entity.ComplaintEntity;
import com.example.gng.complaint.entity.ComplaintNoteEntity;
import com.example.gng.complaint.repository.ComplaintNoteRepository;
import com.example.gng.complaint.repository.ComplaintRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ComplaintNoteService {

    private final ComplaintNoteRepository complaintNoteRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public ComplaintNoteService(ComplaintNoteRepository complaintNoteRepository,
                               ComplaintRepository complaintRepository,
                               UserRepository userRepository) {
        this.complaintNoteRepository = complaintNoteRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }

    /**
     * Tworzy nową notatkę do skargi
     * @param complaintId ID skargi
     * @param request Request z treścią notatki
     * @return Utworzona notatka
     */
    @Transactional
    public ComplaintNoteResponse createNote(Long complaintId, ComplaintNoteRequest request) {
        // Pobierz zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel author = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        // Sprawdź czy użytkownik jest moderatorem lub administratorem
        if (author.getType() != UserType.ADMIN && author.getType() != UserType.EMPLOYEE) {
            throw new RuntimeException("Tylko moderatorzy i administratorzy mogą dodawać notatki do skarg");
        }

        // Sprawdź czy skarga istnieje
        ComplaintEntity complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Skarga nie znaleziona"));

        // Walidacja treści
        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Treść notatki nie może być pusta");
        }

        // Utwórz notatkę
        ComplaintNoteEntity note = new ComplaintNoteEntity();
        note.setComplaint(complaint);
        note.setAuthor(author);
        note.setContent(request.getContent().trim());

        ComplaintNoteEntity savedNote = complaintNoteRepository.save(note);
        return convertToResponse(savedNote);
    }

    /**
     * Pobiera wszystkie notatki dla danej skargi
     * @param complaintId ID skargi
     * @return Lista notatek
     */
    public List<ComplaintNoteResponse> getNotes(Long complaintId) {
        // Pobierz zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        // Sprawdź czy użytkownik jest moderatorem lub administratorem
        if (user.getType() != UserType.ADMIN && user.getType() != UserType.EMPLOYEE) {
            throw new RuntimeException("Tylko moderatorzy i administratorzy mogą przeglądać notatki do skarg");
        }

        // Sprawdź czy skarga istnieje
        if (!complaintRepository.existsById(complaintId)) {
            throw new RuntimeException("Skarga nie znaleziona");
        }

        List<ComplaintNoteEntity> notes = complaintNoteRepository.findByComplaintIdOrderByCreatedAtAsc(complaintId);
        return notes.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Usuwa notatkę (tylko autor może usunąć swoją notatkę)
     * @param noteId ID notatki
     */
    @Transactional
    public void deleteNote(Long noteId) {
        // Pobierz zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        // Sprawdź czy użytkownik jest moderatorem lub administratorem
        if (user.getType() != UserType.ADMIN && user.getType() != UserType.EMPLOYEE) {
            throw new RuntimeException("Tylko moderatorzy i administratorzy mogą usuwać notatki");
        }

        ComplaintNoteEntity note = complaintNoteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Notatka nie znaleziona"));

        // Sprawdź czy użytkownik jest autorem notatki lub administratorem
        if (!note.getAuthor().getId().equals(user.getId()) && user.getType() != UserType.ADMIN) {
            throw new RuntimeException("Możesz usunąć tylko swoje notatki");
        }

        complaintNoteRepository.delete(note);
    }

    private ComplaintNoteResponse convertToResponse(ComplaintNoteEntity note) {
        ComplaintNoteResponse response = new ComplaintNoteResponse();
        response.setId(note.getId());
        response.setComplaintId(note.getComplaint().getId());
        response.setAuthorId(note.getAuthor().getId());
        response.setAuthorName(note.getAuthor().getFirstName() + " " + note.getAuthor().getLastName());
        response.setContent(note.getContent());
        response.setCreatedAt(note.getCreatedAt());
        return response;
    }
}

