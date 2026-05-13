package com.example.gng.moderation.controller;

import com.example.gng.moderation.service.ForbiddenPatternCacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpointy administracyjne do odświeżania cache wzorców zakazanych.
 *
 * Użycie:
 * - /admin/moderation/cache/evict/words  – czyści cache WORD (słowa zakazane)
 * - /admin/moderation/cache/evict/regex  – czyści cache REGEX (wzorce regex)
 * - /admin/moderation/cache/evict/all    – czyści oba cache naraz
 */
@RestController
@RequestMapping("/admin/moderation/cache/evict")
public class ForbiddenPatternAdminController {

    private final ForbiddenPatternCacheService cacheService;

    public ForbiddenPatternAdminController(ForbiddenPatternCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @PostMapping("/words")
    public ResponseEntity<String> evictWords() {
        cacheService.evictForbiddenWordsCache();
        return ResponseEntity.ok("Cleared cache: forbiddenWords");
    }

    @PostMapping("/regex")
    public ResponseEntity<String> evictRegex() {
        cacheService.evictForbiddenRegexCache();
        return ResponseEntity.ok("Cleared cache: forbiddenRegex");
    }

    @PostMapping("/all")
    public ResponseEntity<String> evictAll() {
        cacheService.evictAllForbiddenPatternsCache();
        return ResponseEntity.ok("Cleared cache: forbiddenWords, forbiddenRegex");
        }
}


