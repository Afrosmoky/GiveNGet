package com.example.gng.consultant.entity;

public enum ConsultantChatStatus {
    OPENED("Rozpoczęta"),      // Rozpoczęta przez użytkownika
    ASSIGNED("Przypisana"),    // Przypisana do moderatora
    CLOSED("Zamknięta");       // Zamknięta przez użytkownika lub automatycznie

    private final String displayName;

    ConsultantChatStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

