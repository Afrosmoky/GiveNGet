package com.example.gng.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Koperta paginacji dla endpointów /api/v1 (CLAUDE.md, sekcja 6.4).
 *
 * Nie zwracamy wprost {@link Page} z kontrolera — jego serializacja przez Jacksona
 * nie jest stabilnym kontraktem między wersjami Springa, a klient mobilny nie da się
 * zaktualizować razem z backendem.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    /** Konwertuje stronę encji na stronę DTO przy użyciu podanego mappera. */
    public static <E, D> PageResponse<D> from(Page<E> page, Function<E, D> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}
