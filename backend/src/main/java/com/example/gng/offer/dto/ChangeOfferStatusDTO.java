package com.example.gng.offer.dto;

import com.example.gng.offer.entity.OfferStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeOfferStatusDTO {
    @NotNull(message = "Status oferty jest wymagany")
    private OfferStatus status;
}
