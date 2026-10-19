import type { ReactNode } from 'react';
import { LuClock, LuLeaf, LuMapPin, LuQrCode, LuStore } from 'react-icons/lu';
import { cn, pageContainer } from '../ui';

interface HomeHeroProps {
  /** Przyciski CTA — zależne od tego, kto patrzy (gość / rola konta). */
  actions: ReactNode;
  /** Powitanie zalogowanego zamiast ogólnego nadtytułu. */
  greeting?: string;
}

const HIGHLIGHTS = [
  { icon: LuLeaf, label: 'Mniej zmarnowanego jedzenia' },
  { icon: LuMapPin, label: 'Sklepy i sąsiedzi z okolicy' },
  { icon: LuQrCode, label: 'Odbiór z kodem' },
];

export function HomeHero({ actions, greeting }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      {/* Delikatne tło w kolorze marki */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-soft blur-3xl sm:h-[28rem] sm:w-[28rem]" />

      <div className={cn(pageContainer, 'relative grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20')}>
        <div>
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
            <LuLeaf size={13} aria-hidden />
            {greeting ?? 'Biovlo — jedzenie z krótkim terminem'}
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-brand-ink sm:text-5xl">
            Ratuj jedzenie z okolicy — <span className="text-brand">taniej albo za darmo</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
            Sklepy, piekarnie i sąsiedzi wystawiają produkty, które inaczej trafiłyby do kosza.
            Rezerwujesz w aplikacji, odbierasz osobiście i oszczędzasz.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">{actions}</div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon size={15} className="text-brand" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}

/**
 * Ilustracja z elementów interfejsu (karta oferty + kod odbioru) — pokazuje, jak wygląda
 * rezerwacja, bez zdjęć stockowych. Dekoracja: ukryta przed czytnikami ekranu.
 */
function HeroIllustration() {
  return (
    <div aria-hidden className="relative mx-auto hidden w-full max-w-sm select-none sm:block lg:max-w-none">
      <div className="rounded-ui-xl border border-line bg-surface p-3 shadow-pop lg:ml-8">
        <div className="relative flex aspect-[16/10] items-center justify-center rounded-ui-lg bg-brand-soft text-brand/70">
          <LuStore size={56} strokeWidth={1.25} />
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink shadow-card">
            Piekarnia na rogu · 0,8 km
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
            Zostały 3
          </span>
        </div>
        <div className="px-1 pb-1 pt-3">
          <p className="text-sm font-semibold text-ink">Paczka pieczywa z dzisiejszego wypieku</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
            <LuClock size={12} />
            odbiór do 20:00
          </p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-base font-bold text-ink">
              9,90 zł <span className="ml-1 text-xs font-normal text-ink-subtle line-through">24,00 zł</span>
            </p>
            <span className="rounded-ui-sm bg-brand px-3 py-1.5 text-xs font-semibold text-brand-contrast">Rezerwuj</span>
          </div>
        </div>
      </div>

      <div className="absolute -left-3 top-[42%] flex items-center gap-3 rounded-ui-lg border border-line bg-surface px-4 py-3 shadow-pop lg:-left-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-ui-sm bg-brand text-brand-contrast">
          <LuQrCode size={22} />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Kod odbioru</p>
          <p className="font-mono text-lg font-bold tracking-[0.2em] text-ink">K7M2QX</p>
        </div>
      </div>
    </div>
  );
}
