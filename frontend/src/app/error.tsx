'use client';

import { useEffect } from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import { Button, Card, cn, pageContainer } from '../components/ui';

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
    <div className={cn(pageContainer, 'py-12 sm:py-16')}>
      <Card padding="lg" role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <LuCircleAlert size={24} aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-brand-ink">Coś poszło nie tak</h1>
        <p className="text-sm text-ink-muted">Wystąpił nieoczekiwany błąd. Spróbuj ponownie.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Spróbuj ponownie</Button>
          <Button variant="secondary" href="/">
            Wróć do strony głównej
          </Button>
        </div>
      </Card>
    </div>
  );
}
