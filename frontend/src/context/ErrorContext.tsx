"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Error {
  id: string;
  message: string;
  timestamp: number;
}

interface ErrorContextType {
  errors: Error[];
  addError: (message: string) => void;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<Error[]>([]);

  const addError = useCallback((message: string) => {
    const id = `error-${Date.now()}-${Math.random()}`;
    const newError: Error = {
      id,
      message,
      timestamp: Date.now()
    };
    
    setErrors(prev => [...prev, newError]);
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearAllErrors
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
