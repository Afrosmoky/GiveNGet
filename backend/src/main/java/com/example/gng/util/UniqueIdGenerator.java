package com.example.gng.util;

import java.security.SecureRandom;

public class UniqueIdGenerator {

    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int ID_LENGTH = 10;
    private static final SecureRandom random = new SecureRandom(); // Bezpieczny generator liczb losowych

    public static String generateUniqueId(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int randomIndex = random.nextInt(ALPHABET.length());
            sb.append(ALPHABET.charAt(randomIndex));
        }
        return sb.toString();
    }

    public static String generateUniqueId() {
        return generateUniqueId(ID_LENGTH);
    }
}