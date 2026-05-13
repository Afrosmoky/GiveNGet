package com.example.gng.moderation.service;

import com.example.gng.moderation.repository.ForbiddenPatternRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class ForbiddenPatternService {

    private static final Logger logger = LoggerFactory.getLogger(ForbiddenPatternService.class);

    private final ForbiddenPatternCacheService cacheService;

    public ForbiddenPatternService(ForbiddenPatternRepository forbiddenPatternRepository,
                                   ForbiddenPatternCacheService cacheService) {
        this.cacheService = cacheService;
    }

    public boolean containsForbiddenContent(String... contents) {
        if (contents == null) {
            return false;
        }

        StringBuilder sb = new StringBuilder();
        for (String c : contents) {
            if (c != null && !c.isBlank()) {
                if (!sb.isEmpty()) {
                    sb.append(" ");
                }
                sb.append(c);
            }
        }

        String text = sb.toString();
        if (text.isBlank()) {
            return false;
        }

        String normalized = normalize(text);

        // Słowa (WORD) - prosty contains po granicach słowa i po lowercase
        for (String word : cacheService.getWordList()) {
            if (containsWord(normalized, word)) {
                logger.debug("Forbidden WORD matched: {}", word);
                return true;
            }
        }

        // Regexy
        for (Pattern pattern : cacheService.getCompiledRegexList()) {
            if (pattern.matcher(text).find() || pattern.matcher(normalized).find()) {
                logger.debug("Forbidden REGEX matched: {}", pattern);
                return true;
            }
        }

        return false;
    }

    private boolean containsWord(String haystack, String word) {
        // dopasowanie całych słów: \bword\b; tekst już jest znormalizowany do lowercase
        String regex = "\\b" + Pattern.quote(word.toLowerCase()) + "\\b";
        return Pattern.compile(regex).matcher(haystack).find();
    }

    private String normalize(String input) {
        // uproszczona normalizacja: do lowercase, zamiana polskich znaków i niektórych znaków maskujących
        String s = input.toLowerCase();
        s = s.replace('ą', 'a').replace('ć', 'c').replace('ę', 'e').replace('ł', 'l')
             .replace('ń', 'n').replace('ó', 'o').replace('ś', 's').replace('ż', 'z').replace('ź', 'z');
        s = s.replace('@', 'a').replace('€', 'e').replace('$', 's').replace('1', 'l').replace('0', 'o');
        s = s.replace('!', 'i').replace('|', 'l').replace('3', 'e').replace('5', 's').replace('4', 'a');
        return s;
    }

    // Metody cache’owane przeniesione do ForbiddenPatternCacheService, aby uniknąć self-invocation
}


