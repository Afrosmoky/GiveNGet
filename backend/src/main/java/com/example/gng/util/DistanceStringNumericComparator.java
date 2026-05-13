package com.example.gng.util;

import java.util.Comparator;

public class DistanceStringNumericComparator implements Comparator<String> {

    @Override
    public int compare(String first, String second) {
        long firstValue = extractNumericDistance(first);
        long secondValue = extractNumericDistance(second);
        return Long.compare(firstValue, secondValue);
    }

    private static long extractNumericDistance(String distance) {
        if (distance == null) {
            return Long.MAX_VALUE;
        }
        String digitsOnly = distance.replaceAll("\\D+", "");
        if (digitsOnly.isEmpty()) {
            return Long.MAX_VALUE;
        }
        try {
            return Long.parseLong(digitsOnly);
        } catch (NumberFormatException ex) {
            return Long.MAX_VALUE;
        }
    }
}


