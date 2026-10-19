package com.example.gng.config;

import com.example.gng.auth.filter.JwtAuthenticationFilter;
import com.example.gng.auth.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsProperties corsProperties;

    public SecurityConfig(CustomUserDetailsService userDetailsService,
                          JwtAuthenticationFilter jwtAuthenticationFilter,
                          CorsProperties corsProperties) {
        log.info("Inicjalizacja SecurityConfig");
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.corsProperties = corsProperties;
        log.info("SecurityConfig zainicjalizowany");
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        log.info("Konfiguracja WebSecurityCustomizer");
        return (web) -> web.ignoring()
                .requestMatchers("/uploads/**", "/ws/**");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        log.info("Konfiguracja SecurityFilterChain");
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/auth/**", "/api/registerUser", "/api/registerCompany", "/api/verify/**", "/api/resentVerification",
                                "/api/reset-password", "/api/reset-password/**", "/api/static/**", "/api/static/offer/**", "/api/static-content/**", "/api/geocode/**",
                                "/api/profile/**", "/api/rates/**", "/ws/**").permitAll()
                        // /api/chats/** BYŁO w permitAll powyżej. Wszystkie endpointy czatu i tak
                        // wymagają tożsamości (poza trywialnym /actualDate), a jedyny, który na tym
                        // korzystał — GET /{chatId}/messages — pozwalał czytać dowolną rozmowę
                        // bez logowania. Uczestnictwo weryfikuje dodatkowo ChatService.
                        .requestMatchers("/api/chats/**").authenticated()
                        .requestMatchers("/api/user/**").authenticated()
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN")
                        .requestMatchers("/api/mod/**").hasAnyRole("ADMIN", "EMPLOYEE")
                        // Tworzenie rezerwacji jest zarezerwowane dla konta konsumenckiego
                        // (docs/04_REZERWACJE_DESIGN.md, sekcja 6). Reguła musi stać przed
                        // ogólną regułą /api/v1/**, bo dopasowania są sprawdzane po kolei.
                        .requestMatchers(HttpMethod.POST, "/api/v1/reservations").hasRole("USER")
                        // Potwierdzenie odbioru: pracownik sklepu oraz ADMIN platformy.
                        // Rola to tylko pierwsza bramka — serwis dodatkowo sprawdza, czy oferta
                        // należy do firmy tego pracownika. Reguła powyżej dopasowuje dokładnie
                        // /api/v1/reservations, więc nie przechwytuje tej głębszej ścieżki.
                        .requestMatchers(HttpMethod.POST, "/api/v1/reservations/collect")
                                .hasAnyRole("STORE_EMPLOYEE", "ADMIN")
                        // Rezerwacje na oferty sklepu (panel firmy) — tylko konto firmowe. Zakres
                        // (wyłącznie własne oferty) wyznacza dodatkowo ReservationService.listForStore.
                        .requestMatchers(HttpMethod.GET, "/api/v1/reservations/for-store").hasRole("COMPANY")
                        // Pracownicy sklepu (zakładanie, lista, dezaktywacja) — tylko konto firmowe.
                        // ADMIN nie ma firmy, więc nie byłoby czym powiązać pracowników. Zakres
                        // danych (wyłącznie własny sklep) pilnuje dodatkowo StoreEmployeeService.
                        .requestMatchers("/api/v1/store-employees", "/api/v1/store-employees/**").hasRole("COMPANY")
                        // Import ofert z Excela i jego szablon — tylko konto firmowe. Oferty należą
                        // do konta wywołującego, a ADMIN nie ma sklepu, któremu mógłby je przypisać.
                        .requestMatchers("/api/v1/offers/import", "/api/v1/offers/import/**").hasRole("COMPANY")
                        // Raport oszczędności: firma i admin. Zakres danych rozstrzyga serwis —
                        // konto firmowe widzi wyłącznie własny sklep, niezależnie od parametrów.
                        .requestMatchers("/api/v1/reports/**").hasAnyRole("COMPANY", "ADMIN")
                        // Statystyki całej platformy — wyłącznie administrator (moderator EMPLOYEE też nie)
                        .requestMatchers("/api/v1/stats/**").hasRole("ADMIN")
                        // Publiczny profil sklepu: dostęp jak przy przeglądaniu ofert (/api/offer
                        // wymaga logowania), czyli każdy zalogowany, niezależnie od roli.
                        .requestMatchers(HttpMethod.GET, "/api/v1/stores/**").authenticated()
                        // Cała powierzchnia /api/v1 jest niepubliczna. Reguła jest jawna,
                        // mimo anyRequest() poniżej, żeby nie dało się przypadkiem odsłonić
                        // nowego modułu wpisem w liście permitAll.
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        log.info("SecurityFilterChain skonfigurowany - endpointy /api/user/** wymagają uwierzytelnienia");
        return http.build();
    }

    /**
     * Jedyna konfiguracja CORS dla HTTP. Originy pochodzą z {@link CorsProperties}, czyli
     * ze zmiennej CORS_ALLOWED_ORIGINS.
     *
     * <p>Wcześniej ta metoda ustawiała {@code allowedOriginPatterns("*")}, co unieważniało
     * zarówno listę poniżej, jak i property czytaną w WebConfig — API było otwarte na dowolny
     * origin. Wildcard jest tu świadomie niedozwolony; {@code StartupConfigurationCheck}
     * odrzuca go już na starcie aplikacji.
     *
     * <p>{@code allowedOriginPatterns} nie jest używane celowo — wymaga go tylko dopasowywanie
     * wzorców, a przy konkretnych originach {@code setAllowedOrigins} współpracuje
     * z {@code allowCredentials(true)} zgodnie ze specyfikacją CORS.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = corsProperties.resolvedOrigins();
        log.info("Konfiguracja CORS dla originów: {}", origins);

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        log.info("Konfiguracja PasswordEncoder");
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        log.info("Konfiguracja DaoAuthenticationProvider");
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        log.info("DaoAuthenticationProvider skonfigurowany");
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        log.info("Konfiguracja AuthenticationManager");
        return config.getAuthenticationManager();
    }
}


