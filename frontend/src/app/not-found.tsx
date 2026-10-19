import { LuSearchX } from 'react-icons/lu';
import { Button, Card, cn, pageContainer } from '../components/ui';

export default function NotFound() {
  return (
    <div className={cn(pageContainer, 'py-12 sm:py-16')}>
      <Card padding="lg" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <LuSearchX size={24} aria-hidden />
        </span>
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">Błąd 404</p>
        <h1 className="text-xl font-semibold text-brand-ink">Strona nie została znaleziona</h1>
        <p className="text-sm text-ink-muted">Przepraszamy, ale strona, której szukasz, nie istnieje.</p>
        <Button href="/" className="mt-2">
          Wróć do strony głównej
        </Button>
      </Card>
    </div>
  );
}
