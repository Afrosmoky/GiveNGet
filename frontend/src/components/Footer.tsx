"use client";

import Link from 'next/link';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Logo, cn, pageContainer } from './ui';

interface FooterLink {
  label: string;
  href: string;
  /** Tylko dla zalogowanych — np. oferty, które dziś są za logowaniem. */
  requiresAuth?: boolean;
}

/**
 * Tylko strony, które istnieją. „Kontakt” dołożymy, gdy będą prawdziwe dane kontaktowe
 * (static-content/contact nie jest zseedowany — backend zwraca dla niego „404 - NOT FOUND”).
 */
const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Biovlo',
    links: [
      // Tymczasowo ukryte dla gości: przeglądanie ofert wymaga logowania
      { label: 'Przeglądaj oferty', href: '/offers/search', requiresAuth: true },
      { label: 'Jak to działa', href: '/#how-it-works' },
      { label: 'Załóż konto', href: '/register' },
    ],
  },
  {
    title: 'Dla firm',
    links: [
      { label: 'Załóż konto firmy', href: '/register?type=company' },
      { label: 'Zaloguj się do panelu', href: '/login' },
    ],
  },
  {
    title: 'Informacje',
    links: [
      { label: 'O nas', href: '/static-content/about' },
      { label: 'Pomoc', href: '/static-content/help' },
      { label: 'Regulamin', href: '/static-content/terms-of-service' },
      { label: 'Polityka prywatności', href: '/static-content/privacy-policy' },
    ],
  },
];

export function Footer() {
  const { isLoggedIn } = useCurrentUser();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className={cn(pageContainer, 'grid gap-8 py-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:py-12')}>
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Ratuj jedzenie z okolicy — taniej albo za darmo. Sklepy i sąsiedzi wystawiają produkty z krótkim terminem, Ty odbierasz.
          </p>
        </div>

        {/* Na mobile dwie kolumny linków, od md każda grupa w swojej kolumnie siatki */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:contents">
          {COLUMNS.map(column => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-sm font-semibold text-brand-ink">{column.title}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.filter(link => isLoggedIn || !link.requiresAuth).map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-brand">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-line">
        <p className={cn(pageContainer, 'py-4 text-xs text-ink-subtle')}>© 2026 Biovlo</p>
      </div>
    </footer>
  );
}
