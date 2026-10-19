import { LuCalendarCheck, LuPiggyBank, LuShoppingBag } from 'react-icons/lu';
import { cn, pageContainer } from '../ui';

const STEPS = [
  {
    icon: LuCalendarCheck,
    title: 'Rezerwuj',
    text: 'Znajdź ofertę w okolicy i zarezerwuj tyle sztuk, ile potrzebujesz. Dostaniesz kod odbioru.',
  },
  {
    icon: LuShoppingBag,
    title: 'Odbierz',
    text: 'Przyjdź w podanych godzinach i pokaż kod w sklepie. Pracownik potwierdzi odbiór.',
  },
  {
    icon: LuPiggyBank,
    title: 'Oszczędzaj',
    text: 'Płacisz mniej albo nic, a dobre jedzenie nie ląduje w koszu.',
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className={cn(pageContainer, 'py-12 sm:py-16')}>
      <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
        Jak to działa
      </h2>
      <p className="mt-2 text-sm text-ink-muted sm:text-base">Trzy kroki od oferty do odbioru.</p>

      <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="relative rounded-ui-xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-ui-md bg-brand-soft text-brand" aria-hidden>
                <Icon size={22} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Krok {index + 1}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
