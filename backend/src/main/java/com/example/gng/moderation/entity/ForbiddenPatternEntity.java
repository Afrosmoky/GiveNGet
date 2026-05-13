package com.example.gng.moderation.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "forbidden_pattern")
public class ForbiddenPatternEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "pattern", nullable = false, length = 512)
    private String pattern;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private ForbiddenPatternType type;

    @Column(name = "category", length = 64)
    private String category;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

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
}


