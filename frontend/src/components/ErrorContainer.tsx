"use client";

import React from 'react';
import ErrorMessage from './ErrorMessage';
import { useErrorContext } from '../context/ErrorContext';

export default function ErrorContainer() {
  const { errors, removeError } = useErrorContext();

  return (
    <>
      {errors.map((error) => (
        <ErrorMessage
          key={error.id}
          message={error.message}
          onClose={() => removeError(error.id)}
          autoHide={true}
          autoHideDelay={5000}
        />
      ))}
    </>
  );
}
