package com.example.gng.moderation.dto;

import com.example.gng.moderation.entity.ForbiddenPatternType;

public class UpsertForbiddenPatternDTO {

    private Integer id; // null dla nowego
    private String pattern;
    private ForbiddenPatternType type; // WORD lub REGEX
    private String category; // opcjonalnie
    private Boolean active; // opcjonalnie
    private Boolean _delete; // opcjonalnie: true = usuń wpis

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

    public ForbiddenPatternType getType() {
        return type;
    }

    public void setType(ForbiddenPatternType type) {
        this.type = type;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Boolean get_delete() {
        return _delete;
    }

    public void set_delete(Boolean _delete) {
        this._delete = _delete;
    }
}


