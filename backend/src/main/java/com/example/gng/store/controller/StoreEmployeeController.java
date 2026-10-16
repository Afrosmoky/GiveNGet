package com.example.gng.store.controller;

import com.example.gng.common.dto.PageResponse;
import com.example.gng.store.dto.CreateStoreEmployeeRequest;
import com.example.gng.store.dto.StoreEmployeeDTO;
import com.example.gng.store.dto.UpdateStoreEmployeeStatusRequest;
import com.example.gng.store.service.StoreEmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Konta pracowników sklepu zarządzane przez konto firmowe: zakładanie, lista,
 * dezaktywacja (docs/04_REZERWACJE_DESIGN.md, sekcja 7).
 *
 * Cała ścieżka ograniczona do ROLE_COMPANY w {@code SecurityConfig}; sklep bierzemy z konta
 * wywołującego, więc firma nie widzi ani nie zmienia pracowników cudzej firmy.
 */
@RestController
@RequestMapping("/api/v1/store-employees")
public class StoreEmployeeController {

    private final StoreEmployeeService storeEmployeeService;

    public StoreEmployeeController(StoreEmployeeService storeEmployeeService) {
        this.storeEmployeeService = storeEmployeeService;
    }

    @PostMapping
    public ResponseEntity<StoreEmployeeDTO> create(Authentication authentication,
                                                   @Valid @RequestBody CreateStoreEmployeeRequest request) {
        StoreEmployeeDTO created = storeEmployeeService.createForCurrentCompany(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<PageResponse<StoreEmployeeDTO>> list(
            Authentication authentication,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        return ResponseEntity.ok(storeEmployeeService.listForCurrentCompany(authentication.getName(), page, size));
    }

    @PatchMapping("/{employeeId}")
    public ResponseEntity<StoreEmployeeDTO> updateStatus(Authentication authentication,
                                                         @PathVariable Long employeeId,
                                                         @Valid @RequestBody UpdateStoreEmployeeStatusRequest request) {
        return ResponseEntity.ok(storeEmployeeService.setActiveForCurrentCompany(
                authentication.getName(), employeeId, request.active()));
    }
}
