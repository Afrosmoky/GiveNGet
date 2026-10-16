package com.example.gng.store.service;

import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.exception.InvalidStateException;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.store.dto.CreateStoreEmployeeRequest;
import com.example.gng.store.dto.StoreEmployeeDTO;
import com.example.gng.store.entity.StoreEmployeeModel;
import com.example.gng.store.repository.StoreEmployeeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.ResourceNotFoundException;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Provisioning kont pracowników sklepu (docs/04_REZERWACJE_DESIGN.md, sekcja 7).
 */
class StoreEmployeeServiceTest {

    private static final String COMPANY_EMAIL = "sklep@example.com";
    private static final Long COMPANY_ID = 7L;

    @Mock private StoreEmployeeRepository storeEmployeeRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CacheManager cacheManager;
    @Mock private Cache usersCache;

    private AutoCloseable mocks;
    private StoreEmployeeService service;
    private BusinessUserModel company;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        service = new StoreEmployeeService(storeEmployeeRepository, userRepository, passwordEncoder, cacheManager);

        company = new BusinessUserModel();
        company.setId(COMPANY_ID);
        company.setEmail(COMPANY_EMAIL);
        company.setType(UserType.COMPANY);
        company.setCompanyName("Piekarnia Testowa");
        company.setLang("pl");
        company.setCurrency("PLN");
        company.setLat(new BigDecimal("50.064700"));
        company.setLon(new BigDecimal("19.945000"));
        company.setAddress("Kraków, Polska");

        lenient().when(userRepository.findByEmail(COMPANY_EMAIL)).thenReturn(Optional.of(company));
        lenient().when(cacheManager.getCache("users")).thenReturn(usersCache);
        lenient().when(passwordEncoder.encode(any())).thenReturn("$2a$10$zahaszowane");
        lenient().when(storeEmployeeRepository.save(any(StoreEmployeeModel.class)))
                .thenAnswer(invocation -> {
                    StoreEmployeeModel e = invocation.getArgument(0);
                    e.setId(123L);
                    return e;
                });
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    @Test
    void create_bindsEmployeeToCallersOwnStore() {
        StoreEmployeeDTO dto = service.createForCurrentCompany(COMPANY_EMAIL, validRequest());

        StoreEmployeeModel saved = capturedEmployee();
        assertEquals(COMPANY_ID, saved.getStore().getId(), "Pracownik musi trafić do sklepu wywołującego");
        assertEquals(UserType.STORE_EMPLOYEE, saved.getType());
        assertTrue(saved.getVerified(), "Konto zakładane przez firmę jest od razu aktywne");
        assertTrue(saved.isActive());

        assertEquals(123L, dto.id());
        assertEquals(COMPANY_ID, dto.storeId());
        assertEquals("Piekarnia Testowa", dto.storeName());
    }

    @Test
    void create_hashesPasswordAndNeverReturnsIt() {
        service.createForCurrentCompany(COMPANY_EMAIL, validRequest());

        StoreEmployeeModel saved = capturedEmployee();
        verify(passwordEncoder).encode("tajneHaslo123");
        assertEquals("$2a$10$zahaszowane", saved.getPassword());
        assertNotEquals("tajneHaslo123", saved.getPassword());
    }

    @Test
    void create_copiesNotNullSettingsFromStore() {
        // users.default_language, default_currency, lat i lon są NOT NULL —
        // bez skopiowania ze sklepu zapis konta rozbiłby się o constraint bazy
        service.createForCurrentCompany(COMPANY_EMAIL, validRequest());

        StoreEmployeeModel saved = capturedEmployee();
        assertEquals("pl", saved.getLang());
        assertEquals("PLN", saved.getCurrency());
        assertEquals(new BigDecimal("50.064700"), saved.getLat());
        assertEquals(new BigDecimal("19.945000"), saved.getLon());
    }

    @Test
    void create_normalizesEmail() {
        service.createForCurrentCompany(COMPANY_EMAIL,
                new CreateStoreEmployeeRequest("Anna", "Kowalska", "  Anna.Kowalska@Example.COM ",
                        "tajneHaslo123", "600100200"));

        assertEquals("anna.kowalska@example.com", capturedEmployee().getEmail());
    }

    @Test
    void create_rejectsDuplicateEmail() {
        UserModel existing = new UserModel();
        existing.setId(99L);
        existing.setEmail("anna.kowalska@example.com");
        when(userRepository.findByEmail("anna.kowalska@example.com")).thenReturn(Optional.of(existing));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.createForCurrentCompany(COMPANY_EMAIL, validRequest()));

        assertEquals("EMAIL_ALREADY_EXISTS", ex.getCode());
        verify(storeEmployeeRepository, never()).save(any());
    }

    @Test
    void create_rejectsNonCompanyCaller() {
        // Obrona w głębi wobec reguły hasRole("COMPANY") w SecurityConfig
        UserModel regular = new UserModel();
        regular.setId(5L);
        regular.setEmail("zwykly@example.com");
        regular.setType(UserType.REGULAR);
        when(userRepository.findByEmail("zwykly@example.com")).thenReturn(Optional.of(regular));

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.createForCurrentCompany("zwykly@example.com", validRequest()));

        assertEquals("FORBIDDEN", ex.getCode());
        verify(storeEmployeeRepository, never()).save(any());
    }

    @Test
    void create_rejectsUnknownCaller() {
        when(userRepository.findByEmail("nieznany@example.com")).thenReturn(Optional.empty());

        assertThrows(ForbiddenOperationException.class,
                () -> service.createForCurrentCompany("nieznany@example.com", validRequest()));
    }

    // ------------------------------------------------------------------
    // Lista pracowników
    // ------------------------------------------------------------------

    @Test
    void list_queriesOnlyCallersOwnStore() {
        StoreEmployeeModel own = employee(201L, "a@example.com", true);
        when(storeEmployeeRepository.findByStore_Id(eq(COMPANY_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(own), PageRequest.of(0, 20), 1));

        PageResponse<StoreEmployeeDTO> result = service.listForCurrentCompany(COMPANY_EMAIL, null, null);

        // Zapytanie idzie wyłącznie z id sklepu wywołującego — innego sklepu nie da się podać
        verify(storeEmployeeRepository).findByStore_Id(eq(COMPANY_ID), any(Pageable.class));
        verify(storeEmployeeRepository, never()).findByStore_Id(org.mockito.ArgumentMatchers.argThat(
                id -> !COMPANY_ID.equals(id)), any(Pageable.class));
        assertEquals(1, result.content().size());
        StoreEmployeeDTO dto = result.content().get(0);
        assertEquals(201L, dto.id());
        assertEquals(COMPANY_ID, dto.storeId());
        assertTrue(dto.active());
        assertEquals(LocalDateTime.of(2026, 10, 1, 12, 0), dto.createdAt());
    }

    @Test
    void list_usesDefaultPagingAndDeterministicSort() {
        when(storeEmployeeRepository.findByStore_Id(eq(COMPANY_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        service.listForCurrentCompany(COMPANY_EMAIL, null, null);

        Pageable pageable = capturedPageable();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
        assertEquals(Sort.by(Sort.Order.desc("createDate"), Sort.Order.desc("id")), pageable.getSort(),
                "Sort musi mieć id jako tie-breaker (CLAUDE.md 6.4)");
    }

    @Test
    void list_passesRequestedPageAndCapsSize() {
        when(storeEmployeeRepository.findByStore_Id(eq(COMPANY_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 100), 250));

        PageResponse<StoreEmployeeDTO> result = service.listForCurrentCompany(COMPANY_EMAIL, 2, 500);

        Pageable pageable = capturedPageable();
        assertEquals(2, pageable.getPageNumber());
        assertEquals(100, pageable.getPageSize());
        assertEquals(2, result.page());
        assertEquals(250, result.totalElements());
        assertEquals(3, result.totalPages());
    }

    @Test
    void list_rejectsNonCompanyCaller() {
        givenRegularUser("zwykly@example.com");

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.listForCurrentCompany("zwykly@example.com", 0, 20));

        assertEquals("FORBIDDEN", ex.getCode());
        verify(storeEmployeeRepository, never()).findByStore_Id(anyLong(), any());
    }

    // ------------------------------------------------------------------
    // Dezaktywacja / aktywacja
    // ------------------------------------------------------------------

    @Test
    void setActive_deactivatesOwnEmployeeAndEvictsUserCache() {
        StoreEmployeeModel own = employee(201L, "a@example.com", true);
        when(storeEmployeeRepository.findByIdAndStore_Id(201L, COMPANY_ID)).thenReturn(Optional.of(own));

        StoreEmployeeDTO dto = service.setActiveForCurrentCompany(COMPANY_EMAIL, 201L, false);

        assertFalse(own.isActive());
        assertFalse(dto.active());
        assertTrue(own.getVerified(), "Dezaktywacja nie może ruszać verified — patrz migracja 52");
        verify(storeEmployeeRepository).save(own);
        // Bez tego findByEmail zwracałby z cache stary, aktywny stan
        verify(usersCache).evict("a@example.com");
    }

    @Test
    void setActive_reactivatesOwnEmployee() {
        StoreEmployeeModel own = employee(201L, "a@example.com", false);
        when(storeEmployeeRepository.findByIdAndStore_Id(201L, COMPANY_ID)).thenReturn(Optional.of(own));

        StoreEmployeeDTO dto = service.setActiveForCurrentCompany(COMPANY_EMAIL, 201L, true);

        assertTrue(own.isActive());
        assertTrue(dto.active());
        verify(usersCache).evict("a@example.com");
    }

    @Test
    void setActive_isIdempotent() {
        StoreEmployeeModel own = employee(201L, "a@example.com", false);
        when(storeEmployeeRepository.findByIdAndStore_Id(201L, COMPANY_ID)).thenReturn(Optional.of(own));

        service.setActiveForCurrentCompany(COMPANY_EMAIL, 201L, false);

        assertFalse(own.isActive());
        verify(storeEmployeeRepository, never()).save(any());
    }

    @Test
    void setActive_foreignOrMissingEmployeeIsNotFound() {
        // Pracownik innego sklepu nie przechodzi przez zapytanie zawężone do sklepu
        // wywołującego — dla firmy wygląda dokładnie jak nieistniejący
        when(storeEmployeeRepository.findByIdAndStore_Id(301L, COMPANY_ID)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.setActiveForCurrentCompany(COMPANY_EMAIL, 301L, false));

        assertEquals("STORE_EMPLOYEE_NOT_FOUND", ex.getCode());
        verify(storeEmployeeRepository, never()).save(any());
        verify(usersCache, never()).evict(any());
    }

    @Test
    void setActive_rejectsNonCompanyCaller() {
        givenRegularUser("zwykly@example.com");

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.setActiveForCurrentCompany("zwykly@example.com", 201L, false));

        assertEquals("FORBIDDEN", ex.getCode());
        verify(storeEmployeeRepository, never()).findByIdAndStore_Id(anyLong(), anyLong());
    }

    private void givenRegularUser(String email) {
        UserModel regular = new UserModel();
        regular.setId(5L);
        regular.setEmail(email);
        regular.setType(UserType.REGULAR);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(regular));
    }

    private StoreEmployeeModel employee(Long id, String email, boolean active) {
        StoreEmployeeModel e = new StoreEmployeeModel();
        e.setId(id);
        e.setEmail(email);
        e.setFirstName("Jan");
        e.setLastName("Nowak");
        e.setType(UserType.STORE_EMPLOYEE);
        e.setVerified(true);
        e.setStore(company);
        e.setActive(active);
        e.setCreateDate(LocalDateTime.of(2026, 10, 1, 12, 0));
        return e;
    }

    private Pageable capturedPageable() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(storeEmployeeRepository).findByStore_Id(eq(COMPANY_ID), captor.capture());
        return captor.getValue();
    }

    private static CreateStoreEmployeeRequest validRequest() {
        return new CreateStoreEmployeeRequest("Anna", "Kowalska", "anna.kowalska@example.com",
                "tajneHaslo123", "600100200");
    }

    private StoreEmployeeModel capturedEmployee() {
        ArgumentCaptor<StoreEmployeeModel> captor = ArgumentCaptor.forClass(StoreEmployeeModel.class);
        verify(storeEmployeeRepository).save(captor.capture());
        return captor.getValue();
    }
}
