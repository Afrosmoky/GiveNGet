package com.example.gng.user.dto;

import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.rates.dto.SimplyRatesDto;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class UserOffersDto {
    private UserData userData;
    private SimplyRatesDto rate;
    private List<OfferPreview> offers;
}
