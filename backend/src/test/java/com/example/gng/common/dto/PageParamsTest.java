package com.example.gng.common.dto;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Normalizacja page/size wspólna dla list /api/v1 (CLAUDE.md 6.4). */
class PageParamsTest {

    private static final Sort SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    @Test
    void missingValues_defaultToFirstPageOfTwenty() {
        Pageable pageable = PageParams.of(null, null, SORT);
        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
        assertEquals(SORT, pageable.getSort());
    }

    @Test
    void outOfRangeValues_areClampedNotRejected() {
        assertEquals(0, PageParams.of(-3, 10, SORT).getPageNumber());
        assertEquals(20, PageParams.of(0, 0, SORT).getPageSize());
        assertEquals(20, PageParams.of(0, -5, SORT).getPageSize());
        assertEquals(100, PageParams.of(0, 500, SORT).getPageSize());
    }

    @Test
    void validValues_arePassedThrough() {
        Pageable pageable = PageParams.of(4, 50, SORT);
        assertEquals(4, pageable.getPageNumber());
        assertEquals(50, pageable.getPageSize());
    }
}
