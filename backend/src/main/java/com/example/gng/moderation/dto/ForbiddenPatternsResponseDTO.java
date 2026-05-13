package com.example.gng.moderation.dto;

import java.util.List;
import java.util.Map;

public class ForbiddenPatternsResponseDTO {

    // Mapowanie: kategoria -> lista elementów
    private Map<String, List<ForbiddenPatternItemDTO>> wordsByCategory;
    private Map<String, List<ForbiddenPatternItemDTO>> regexesByCategory;

    public ForbiddenPatternsResponseDTO() {}

    public ForbiddenPatternsResponseDTO(Map<String, List<ForbiddenPatternItemDTO>> wordsByCategory,
                                        Map<String, List<ForbiddenPatternItemDTO>> regexesByCategory) {
        this.wordsByCategory = wordsByCategory;
        this.regexesByCategory = regexesByCategory;
    }

    public Map<String, List<ForbiddenPatternItemDTO>> getWordsByCategory() {
        return wordsByCategory;
    }

    public void setWordsByCategory(Map<String, List<ForbiddenPatternItemDTO>> wordsByCategory) {
        this.wordsByCategory = wordsByCategory;
    }

    public Map<String, List<ForbiddenPatternItemDTO>> getRegexesByCategory() {
        return regexesByCategory;
    }

    public void setRegexesByCategory(Map<String, List<ForbiddenPatternItemDTO>> regexesByCategory) {
        this.regexesByCategory = regexesByCategory;
    }
}


