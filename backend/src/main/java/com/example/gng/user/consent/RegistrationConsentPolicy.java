package com.example.gng.user.consent;

import com.example.gng.common.exception.BadRequestException;
import com.example.gng.register.dto.RegisterDTO;
import com.example.gng.register.model.UserModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Obowiązkowe zgody przy rejestracji: regulamin i polityka prywatności (docs/08, pozycja 2).
 *
 * <p>Wersja regulaminu pochodzi z {@code terms.current-version} — przy zmianie treści
 * podbija się property, a nowe konta zapisują nową wersję. Klient nie przysyła wersji:
 * akceptuje to, co serwer uznaje za obowiązujące w chwili rejestracji.
 */
@Component
public class RegistrationConsentPolicy {

    public static final String CODE = "CONSENT_REQUIRED";

    private final String currentTermsVersion;
    private final Clock clock;

    @Autowired
    public RegistrationConsentPolicy(@Value("${terms.current-version}") String currentTermsVersion) {
        this(currentTermsVersion, Clock.systemUTC());
    }

    /** Dla testów — stały zegar. */
    public RegistrationConsentPolicy(String currentTermsVersion, Clock clock) {
        if (currentTermsVersion == null || currentTermsVersion.isBlank()) {
            throw new IllegalStateException("Brak wersji regulaminu (terms.current-version)");
        }
        this.currentTermsVersion = currentTermsVersion.trim();
        this.clock = clock;
    }

    /**
     * Odrzuca rejestrację bez obu zgód, a przy komplecie zapisuje je na koncie.
     * Wołane przed zapisem konta, więc brak zgody nie zostawia niczego w bazie.
     */
    public void requireAndApply(RegisterDTO request, UserModel account) {
        List<String> missing = new ArrayList<>();
        if (!Boolean.TRUE.equals(request.getTermsAccepted())) {
            missing.add("terms");
        }
        if (!Boolean.TRUE.equals(request.getPrivacyAccepted())) {
            missing.add("privacy");
        }
        if (!missing.isEmpty()) {
            throw new BadRequestException(CODE,
                    "Aby założyć konto, zaakceptuj regulamin i politykę prywatności.",
                    Map.of("missing", missing));
        }

        LocalDateTime now = LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
        account.setTermsAcceptedVersion(currentTermsVersion);
        account.setTermsAcceptedAt(now);
        account.setPrivacyAcceptedAt(now);
    }
}
