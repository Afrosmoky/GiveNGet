package com.example.gng.common.dto;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Normalizacja parametrów paginacji list /api/v1 (CLAUDE.md 6.4): brak lub ujemny
 * {@code page} → 0, brak lub niedodatni {@code size} → 20, górny limit 100.
 *
 * <p>Wartości spoza zakresu przycinamy zamiast odrzucać — klient mobilny ze starą
 * stałą rozmiaru strony dostaje dane, a nie błąd.
 */
public final class PageParams {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    private PageParams() {
    }

    public static Pageable of(Integer page, Integer size, Sort sort) {
        return PageRequest.of(normalizePage(page), normalizeSize(size), sort);
    }

    static int normalizePage(Integer page) {
        return page == null || page < 0 ? 0 : page;
    }

    static int normalizeSize(Integer size) {
        if (size == null || size < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
