package com.example.gng.exceptions;

public class TooManyTagsException extends RuntimeException {
    
    public TooManyTagsException(String message) {
        super(message);
    }
    
    public TooManyTagsException(String message, Throwable cause) {
        super(message, cause);
    }
} 