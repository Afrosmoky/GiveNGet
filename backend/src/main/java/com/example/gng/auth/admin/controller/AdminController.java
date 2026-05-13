package com.example.gng.auth.admin.controller;

import com.example.gng.auth.admin.dto.UserListResponseDTO;
import com.example.gng.auth.admin.dto.UserStatsDTO;
import com.example.gng.auth.admin.service.AdminService;
import com.example.gng.moderation.dto.ForbiddenPatternsResponseDTO;
import com.example.gng.moderation.dto.UpsertForbiddenPatternDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping
    public ResponseEntity<String> ok() {
        return ResponseEntity.ok("Jesteś adminem");
    }

    @GetMapping("/forbidden-patterns")
    public ResponseEntity<ForbiddenPatternsResponseDTO> getForbiddenPatterns() {
        return ResponseEntity.ok(adminService.getForbiddenPatterns());
    }

    /**
     * Upsert (dodanie lub modyfikacja) listy wzorców zakazanych.
     * - jeśli id == null: tworzymy nowy wpis
     * - jeśli id != null: aktualizujemy istniejący (pattern, type, active, category)
     * Po operacji czyścimy cache, aby nowe wartości były używane natychmiast.
     */
    @PostMapping("/forbidden-patterns")
    public ResponseEntity<String> upsertForbiddenPatterns(@RequestBody List<UpsertForbiddenPatternDTO> items) {
        adminService.upsertForbiddenPatterns(items);
        return ResponseEntity.ok("OK");
    }

    @PatchMapping("/forbidden-patterns/{id}")
    public ResponseEntity<String> setForbiddenPatternActive(@PathVariable("id") Integer id,
                                                            @RequestParam("active") boolean active) {
        adminService.setForbiddenPatternActive(id, active);
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/user-stats")
    public ResponseEntity<UserStatsDTO> getUserStats() {
        return ResponseEntity.ok(adminService.getUserStats());
    }

    

    @GetMapping("/users")
    public ResponseEntity<UserListResponseDTO> getUsers(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sortBy", defaultValue = "createDate") String sortBy,
            @RequestParam(value = "sortDirection", defaultValue = "desc") String sortDirection,
            @RequestParam(value = "searchTerm", required = false) String searchTerm,
            @RequestParam(value = "userType", required = false) String userType,
            @RequestParam(value = "verified", required = false) Boolean verified,
            @RequestParam(value = "banned", required = false) Boolean banned) {
        return ResponseEntity.ok(adminService.getUsers(page, size, sortBy, sortDirection, searchTerm, userType, verified, banned));
    }

    @DeleteMapping("/offers/{id}")
    public ResponseEntity<String> deleteOffer(@PathVariable("id") String offerId,
                                             @RequestParam("reason") String reason) {
        adminService.deleteOffer(offerId, reason);
        return ResponseEntity.ok("OK");
    }
}


