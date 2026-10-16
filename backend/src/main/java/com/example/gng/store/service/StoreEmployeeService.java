package com.example.gng.store.service;

import com.example.gng.common.dto.PageParams;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.exception.InvalidStateException;
import com.example.gng.common.exception.ResourceNotFoundException;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.store.dto.CreateStoreEmployeeRequest;
import com.example.gng.store.dto.StoreEmployeeDTO;
import com.example.gng.store.entity.StoreEmployeeModel;
import com.example.gng.store.repository.StoreEmployeeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Minimalny provisioning kont pracowników sklepu (docs/04_REZERWACJE_DESIGN.md, sekcja 7).
 *
 * <p>Firma zakłada pracowników, przegląda ich listę i odbiera/przywraca dostęp.
 * Każda operacja działa wyłącznie na pracownikach sklepu wywołującego — sklep zawsze
 * bierzemy z konta, nigdy z parametrów żądania.
 */
@Service
public class StoreEmployeeService {

    private static final Logger logger = LoggerFactory.getLogger(StoreEmployeeService.class);

    /**
     * Najnowsi najpierw, id jako tie-breaker — konta zakładane seryjnie mogą mieć tę samą
     * datę utworzenia, a bez drugiego klucza strony by się nakładały (CLAUDE.md 6.4).
     */
    static final Sort EMPLOYEES_SORT = Sort.by(Sort.Order.desc("createDate"), Sort.Order.desc("id"));

    /** Cache z {@code UserRepository.findByEmail} — klucz to e-mail. */
    static final String USERS_CACHE = "users";

    private final StoreEmployeeRepository storeEmployeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CacheManager cacheManager;

    public StoreEmployeeService(StoreEmployeeRepository storeEmployeeRepository,
                               UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               CacheManager cacheManager) {
        this.storeEmployeeRepository = storeEmployeeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cacheManager = cacheManager;
    }

    /**
     * Zakłada konto pracownika przypisane do firmy wywołującego.
     *
     * <p>Sklep nie jest parametrem żądania — bierzemy go z konta wywołującego, więc firma
     * nie może podpiąć pracownika pod cudzy sklep, niezależnie od tego, co przyśle.
     *
     * <p>Konto powstaje od razu aktywne ({@code verified = true}), bez maila aktywacyjnego:
     * zakłada je firma, która zna adres pracownika, a dodatkowy krok tylko wydłużyłby
     * uruchomienie pilotażu. Jeśli pracownicy mają potwierdzać adres samodzielnie,
     * to zmiana jednej linii i dołożenie wysyłki szablonu.
     */
    @Transactional
    public StoreEmployeeDTO createForCurrentCompany(String currentUserEmail, CreateStoreEmployeeRequest request) {
        BusinessUserModel store = requireCompany(currentUserEmail);

        String email = normalizeEmail(request.email());
        if (userRepository.findByEmail(email).isPresent()) {
            throw InvalidStateException.emailAlreadyExists(email);
        }

        StoreEmployeeModel employee = new StoreEmployeeModel();
        employee.setFirstName(request.firstName().trim());
        employee.setLastName(request.lastName().trim());
        employee.setEmail(email);
        employee.setPhoneNumber(request.phoneNumber());
        employee.setPassword(passwordEncoder.encode(request.password()));
        employee.setType(UserType.STORE_EMPLOYEE);
        employee.setVerified(true);
        employee.setBanned(false);
        employee.setStore(store);
        employee.setActive(true);

        // Kolumny NOT NULL na users — dziedziczymy ustawienia po sklepie, bo pracownik
        // działa w jego lokalizacji i walucie
        employee.setLang(store.getLang());
        employee.setCurrency(store.getCurrency());
        employee.setLat(store.getLat());
        employee.setLon(store.getLon());
        employee.setAddress(store.getAddress());

        StoreEmployeeModel saved = storeEmployeeRepository.save(employee);
        logger.info("Utworzono konto pracownika {} dla sklepu {} ({})",
                saved.getId(), store.getId(), store.getCompanyName());

        return toDto(saved);
    }

    /** Pracownicy sklepu wywołującego — paginowani i stabilnie posortowani. */
    @Transactional(readOnly = true)
    public PageResponse<StoreEmployeeDTO> listForCurrentCompany(String currentUserEmail, Integer page, Integer size) {
        BusinessUserModel store = requireCompany(currentUserEmail);
        Pageable pageable = PageParams.of(page, size, EMPLOYEES_SORT);
        return PageResponse.from(storeEmployeeRepository.findByStore_Id(store.getId(), pageable),
                StoreEmployeeService::toDto);
    }

    /**
     * Odbiera albo przywraca pracownikowi dostęp.
     *
     * <p>Pracownika szukamy od razu w obrębie sklepu wywołującego, więc cudzy i nieistniejący
     * dają ten sam 404 — odpowiedź nie zdradza, czy konto o danym id istnieje.
     *
     * <p>Po zmianie usuwamy wpis z cache {@code users}: logowanie i potwierdzanie odbioru
     * czytają konto przez {@code findByEmail}, które bez tego zwracałoby stary stan
     * aż do restartu aplikacji.
     */
    @Transactional
    public StoreEmployeeDTO setActiveForCurrentCompany(String currentUserEmail, Long employeeId, boolean active) {
        BusinessUserModel store = requireCompany(currentUserEmail);
        StoreEmployeeModel employee = storeEmployeeRepository.findByIdAndStore_Id(employeeId, store.getId())
                .orElseThrow(() -> ResourceNotFoundException.storeEmployee(employeeId));

        if (employee.isActive() != active) {
            employee.setActive(active);
            employee = storeEmployeeRepository.save(employee);
            logger.info("Sklep {} {} konto pracownika {}",
                    store.getId(), active ? "aktywował" : "dezaktywował", employee.getId());
        }
        evictUserCache(employee.getEmail());
        return toDto(employee);
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    /**
     * Zwraca konto firmowe wywołującego.
     *
     * Sprawdzamy zarówno typ, jak i rzeczywistą klasę encji: {@code ROLE_COMPANY} wynika
     * z {@code UserType}, ale bez {@link BusinessUserModel} nie ma z czym powiązać pracownika.
     */
    private BusinessUserModel requireCompany(String email) {
        if (email == null || email.isBlank()) {
            throw new ForbiddenOperationException("Operacja wymaga zalogowanego użytkownika.", Map.of());
        }
        UserModel user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));

        if (user.getType() != UserType.COMPANY || !(user instanceof BusinessUserModel store)) {
            throw ForbiddenOperationException.notACompanyAccount();
        }
        return store;
    }

    private void evictUserCache(String email) {
        Cache cache = cacheManager.getCache(USERS_CACHE);
        if (cache != null && email != null) {
            cache.evict(email);
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private static StoreEmployeeDTO toDto(StoreEmployeeModel employee) {
        BusinessUserModel store = employee.getStore();
        return new StoreEmployeeDTO(
                employee.getId(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getEmail(),
                employee.getPhoneNumber(),
                store != null ? store.getId() : null,
                store != null ? store.getCompanyName() : null,
                employee.getCreateDate(),
                employee.isActive());
    }
}
