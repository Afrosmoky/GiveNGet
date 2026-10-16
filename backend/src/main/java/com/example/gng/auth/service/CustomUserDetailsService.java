package com.example.gng.auth.service;

import com.example.gng.ban.service.UserBanService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.store.entity.StoreEmployeeModel;
import com.example.gng.user.service.AccountDeletionService;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final AccountDeletionService accountDeletionService;
    private final UserBanService userBanService;

    public CustomUserDetailsService(UserRepository userRepository, 
                                   AccountDeletionService accountDeletionService,
                                   UserBanService userBanService) {
        this.userRepository = userRepository;
        this.accountDeletionService = accountDeletionService;
        this.userBanService = userBanService;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserModel user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Użytkownik o adresie e-mail " + email + " nie został znaleziony"));

        // Czyść deleteDate przy logowaniu
        accountDeletionService.clearDeleteDateOnLogin(email);

        // Sprawdź czy użytkownik ma aktywny ban
        boolean isBanned = userBanService.isUserBanned(user.getId());

        return new User(
                user.getEmail(),
                user.getPassword(),
                isEnabled(user),
                true, // account non expired
                true, // credentials non expired
                !isBanned, // account non locked - false jeśli użytkownik ma ban
                getAuthorities(user)
        );
    }

    /**
     * Konto jest włączone tylko, gdy jest zweryfikowane. Pracownik sklepu musi być
     * dodatkowo aktywny — firma może mu odebrać dostęp bez ruszania {@code verified}
     * (patrz migracja 52).
     */
    static boolean isEnabled(UserModel user) {
        boolean verified = user.getVerified() != null && user.getVerified();
        if (user instanceof StoreEmployeeModel employee) {
            return verified && employee.isActive();
        }
        return verified;
    }

        private Collection<? extends GrantedAuthority> getAuthorities(UserModel user) {
        String role;
        if (user.getType() == UserType.ADMIN) {
            role = "ROLE_ADMIN";
        } else if (user.getType() == UserType.EMPLOYEE) {
            role = "ROLE_EMPLOYEE";
        } else if (user.getType() == UserType.COMPANY) {
            role = "ROLE_COMPANY";
        } else if (user.getType() == UserType.STORE_EMPLOYEE) {
            // Pracownik sklepu — potwierdza odbiory swojego sklepu, bez uprawnień moderacyjnych
            role = "ROLE_STORE_EMPLOYEE";
        } else {
            role = "ROLE_USER";
        }
        return Collections.singletonList(new SimpleGrantedAuthority(role));
    }
} 