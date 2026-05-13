package com.example.gng.moderation.dto;

public class ForbiddenPatternItemDTO {

    private Integer id;
    private String pattern;
    private Boolean active;
    private String category;

    public ForbiddenPatternItemDTO() {
    }

    public ForbiddenPatternItemDTO(Integer id, String pattern, Boolean active, String category) {
        this.id = id;
        this.pattern = pattern;
        this.active = active;
        this.category = category;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getPattern() {
        return pattern;
    }

    public void setPattern(String pattern) {
        this.pattern = pattern;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}


