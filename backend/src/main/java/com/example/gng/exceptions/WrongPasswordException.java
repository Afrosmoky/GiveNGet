package com.example.gng.exceptions;

public class WrongPasswordException extends RuntimeException
{
    public WrongPasswordException(String message) {
        super(message);
    }

    public WrongPasswordException() {
        super();
    }
}
