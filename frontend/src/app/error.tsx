'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-container">
      <div className="form-container">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#dc2626' }}>
            Błąd
          </h1>
          <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#4a5568' }}>
            Coś poszło nie tak
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '30px', color: '#718096' }}>
            Wystąpił nieoczekiwany błąd. Spróbuj ponownie.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              className="btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              Spróbuj ponownie
            </button>
            <Link href="/" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Wróć do strony głównej
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 