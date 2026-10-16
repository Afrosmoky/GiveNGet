package com.example.gng.common.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Ustala adres IP klienta dla limitów per-IP.
 *
 * <p>Backend stoi za nginx, więc {@code request.getRemoteAddr()} zwraca adres proxy —
 * limit oparty wyłącznie na nim zablokowałby logowanie <b>wszystkim</b> po jednej serii
 * nieudanych prób jednego użytkownika. Dlatego czytamy pierwszy wpis z
 * {@code X-Forwarded-For}, a na {@code remoteAddr} spadamy tylko, gdy nagłówka nie ma.
 *
 * <p><b>Założenie zaufania:</b> nagłówek musi być nadpisywany przez reverse proxy
 * ({@code proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for}). Bez tego klient
 * może go podać sam i obejść limit per-IP, zmieniając wartość przy każdym żądaniu.
 * Pozycja w docs/05_DLUG_I_DECYZJE.md do potwierdzenia na konfiguracji pilotażu.
 */
@Component
public class ClientIpResolver {

    private static final String FORWARDED_FOR = "X-Forwarded-For";
    private static final String UNKNOWN = "unknown";

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return UNKNOWN;
        }

        String forwarded = request.getHeader(FORWARDED_FOR);
        if (forwarded != null && !forwarded.isBlank()) {
            // Format: "klient, proxy1, proxy2" — pierwszy wpis to adres klienta
            String first = forwarded.split(",")[0].trim();
            if (!first.isEmpty()) {
                return first;
            }
        }

        String remote = request.getRemoteAddr();
        return remote != null && !remote.isBlank() ? remote : UNKNOWN;
    }
}
