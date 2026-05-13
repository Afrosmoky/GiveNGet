package com.example.gng.user.service;

import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
public class AccountDeletionService {

    private final UserRepository userRepository;

    @Autowired
    public AccountDeletionService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Czyści deleteDate przy logowaniu użytkownika
     * Powinno być wywoływane przy każdym logowaniu
     */
    public void clearDeleteDateOnLogin(String userEmail) {
        Optional<UserModel> optUser = userRepository.findByEmail(userEmail);
        if (optUser.isPresent()) {
            UserModel userModel = optUser.get();
            if (userModel.getDeleteDate() != null) {
                userModel.setDeleteDate(null);
                userRepository.save(userModel);
                log.info("Anulowano usunięcie konta dla użytkownika: {}", userEmail);
            }
        }
    }
}
