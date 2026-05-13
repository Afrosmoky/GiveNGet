package com.example.gng.moderation.service;

import com.example.gng.moderation.entity.ForbiddenPatternEntity;
import com.example.gng.moderation.entity.ForbiddenPatternType;
import com.example.gng.moderation.repository.ForbiddenPatternRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class ForbiddenPatternCacheService {

    private static final Logger logger = LoggerFactory.getLogger(ForbiddenPatternCacheService.class);

    private final ForbiddenPatternRepository forbiddenPatternRepository;

    public ForbiddenPatternCacheService(ForbiddenPatternRepository forbiddenPatternRepository) {
        this.forbiddenPatternRepository = forbiddenPatternRepository;
    }

    @Cacheable("forbiddenWords")
    public List<String> getWordList() {
        List<ForbiddenPatternEntity> all = forbiddenPatternRepository.findByTypeAndActiveTrue(ForbiddenPatternType.WORD);
        List<String> words = new ArrayList<>();
        for (ForbiddenPatternEntity e : all) {
            String p = e.getPattern();
            if (p != null && !p.isBlank()) {
                words.add(p.trim().toLowerCase());
            }
        }
        return words;
    }

    @Cacheable("forbiddenRegex")
    public List<Pattern> getCompiledRegexList() {
        List<ForbiddenPatternEntity> all = forbiddenPatternRepository.findByTypeAndActiveTrue(ForbiddenPatternType.REGEX);
        List<Pattern> patterns = new ArrayList<>();
        for (ForbiddenPatternEntity e : all) {
            String p = e.getPattern();
            if (p == null || p.isBlank()) continue;
            try {
                Pattern compiled = compileSlashDelimitedRegex(p.trim());
                if (compiled != null) {
                    patterns.add(compiled);
                }
            } catch (Exception ex) {
                logger.warn("Błąd kompilacji regexu '{}': {}", p, ex.getMessage());
            }
        }
        return patterns;
    }

    private Pattern compileSlashDelimitedRegex(String slashDelimited) {
        String s = slashDelimited;
        if (s.startsWith("/") && s.lastIndexOf('/') > 0) {
            int last = s.lastIndexOf('/');
            String body = s.substring(1, last);
            String flags = s.substring(last + 1);
            int javaFlags = 0;
            if (flags.contains("i")) {
                javaFlags |= Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
            }
            javaFlags |= Pattern.UNICODE_CHARACTER_CLASS;
            return Pattern.compile(body, javaFlags);
        }
        return Pattern.compile(s, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS);
    }

    /**
     * Czyści cache listy słów zakazanych. Użyj po dodaniu/edycji/usunięciu wzorca typu WORD,
     * aby kolejne sprawdzenia używały świeżych danych z bazy.
     */
    @CacheEvict(value = "forbiddenWords", allEntries = true)
    public void evictForbiddenWordsCache() {
        // intencjonalnie puste – adnotacja usuwa wpisy z cache
    }

    /**
     * Czyści cache skompilowanych regexów zakazanych. Użyj po dodaniu/edycji/usunięciu wzorca typu REGEX,
     * aby kolejne sprawdzenia używały świeżych danych z bazy.
     */
    @CacheEvict(value = "forbiddenRegex", allEntries = true)
    public void evictForbiddenRegexCache() {
        // intencjonalnie puste – adnotacja usuwa wpisy z cache
    }

    /**
     * Czyści oba cache jednocześnie (słowa i regexy). Wygodne po większych aktualizacjach listy wzorców.
     */
    @CacheEvict(value = {"forbiddenWords", "forbiddenRegex"}, allEntries = true)
    public void evictAllForbiddenPatternsCache() {
        // intencjonalnie puste – adnotacja usuwa wpisy z cache
    }
}


