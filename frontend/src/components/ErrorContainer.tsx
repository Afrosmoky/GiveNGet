"use client";

import React from 'react';
import ErrorMessage from './ErrorMessage';
import { useErrorContext } from '../context/ErrorContext';

export default function ErrorContainer() {
  const { errors, removeError } = useErrorContext();

  if (errors.length === 0) return null;

  // Kolumna toastów u góry ekranu — kolejne błędy układają się pod sobą zamiast nachodzić
  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-4 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4">
      {errors.map((error) => (
        <ErrorMessage
          key={error.id}
          message={error.message}
          onClose={() => removeError(error.id)}
          autoHide={true}
          autoHideDelay={5000}
        />
      ))}
    </div>
  );
}
