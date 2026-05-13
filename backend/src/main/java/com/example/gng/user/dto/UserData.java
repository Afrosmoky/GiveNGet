package com.example.gng.user.dto;

import com.example.gng.register.model.UserType;
import com.example.gng.user.entity.UserRank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UserData {
    private Long id;
    private String name;
    private String description;
    private String logoUrl;
    private String location;
    private BigDecimal lat;
    private BigDecimal lon;
    private UserType userType;
    private UserRank userRank;
    private Integer trustPoints;
    private Integer freeOffersCount;
}
