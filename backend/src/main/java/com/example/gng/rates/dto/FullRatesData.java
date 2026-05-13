package com.example.gng.rates.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class FullRatesData {
    public FullRatesData() {
        // Liczniki dla czystości
        this.cleanlinessOneStarCount = 0;
        this.cleanlinessTwoStarCount = 0;
        this.cleanlinessThreeStarCount = 0;
        this.cleanlinessFourStarCount = 0;
        this.cleanlinessFiveStarCount = 0;
        
        // Liczniki dla jakości
        this.qualityOneStarCount = 0;
        this.qualityTwoStarCount = 0;
        this.qualityThreeStarCount = 0;
        this.qualityFourStarCount = 0;
        this.qualityFiveStarCount = 0;
        
        // Liczniki dla oceny transakcji
        this.transactionOneStarCount = 0;
        this.transactionTwoStarCount = 0;
        this.transactionThreeStarCount = 0;
        this.transactionFourStarCount = 0;
        this.transactionFiveStarCount = 0;
        
        this.ratesList = new ArrayList<>();
        this.currentPage = 0;
        this.pageSize = 10;
        this.totalPages = 0;
        this.totalElements = 0L;
    }

    // Liczniki dla czystości
    private Integer cleanlinessOneStarCount;
    private Integer cleanlinessTwoStarCount;
    private Integer cleanlinessThreeStarCount;
    private Integer cleanlinessFourStarCount;
    private Integer cleanlinessFiveStarCount;
    
    // Liczniki dla jakości
    private Integer qualityOneStarCount;
    private Integer qualityTwoStarCount;
    private Integer qualityThreeStarCount;
    private Integer qualityFourStarCount;
    private Integer qualityFiveStarCount;
    
    // Liczniki dla oceny transakcji
    private Integer transactionOneStarCount;
    private Integer transactionTwoStarCount;
    private Integer transactionThreeStarCount;
    private Integer transactionFourStarCount;
    private Integer transactionFiveStarCount;
    
    private List<RatesDto> ratesList;
    
    // Informacje o paginacji
    private Integer currentPage;
    private Integer pageSize;
    private Integer totalPages;
    private Long totalElements;
}
