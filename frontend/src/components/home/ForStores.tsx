import { LuStore } from 'react-icons/lu';
import { Button, cn, pageContainer } from '../ui';

/** Pas dla sklepów — B2B: gość, który prowadzi sklep, powinien wiedzieć, że też może tu być. */
export function ForStores() {
  return (
    <section aria-labelledby="for-stores" className={cn(pageContainer, 'pb-12 sm:pb-16')}>
      <div className="flex flex-col gap-5 rounded-ui-xl bg-brand-strong p-6 text-brand-contrast sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-ui-md bg-white/10 sm:flex" aria-hidden>
            <LuStore size={24} />
          </span>
          <div>
            <h2 id="for-stores" className="text-xl font-semibold tracking-tight sm:text-2xl">
              Prowadzisz sklep, piekarnię albo restaurację?
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/80">
              Wystaw nadwyżki w kilka minut, potwierdzaj odbiory kodem i sprawdzaj w raporcie, ile jedzenia udało się uratować.
            </p>
          </div>
        </div>
        <Button href="/register?type=company" variant="secondary" size="lg" className="shrink-0 border-transparent">
          Załóż konto firmy
        </Button>
      </div>
    </section>
  );
}
