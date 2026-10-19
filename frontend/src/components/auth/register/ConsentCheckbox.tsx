import Link from 'next/link';

export const CONSENT_REQUIRED_MESSAGE = 'Aby założyć konto, zaakceptuj regulamin i politykę prywatności.';

/**
 * Obowiązkowa zgoda przy rejestracji (docs/08, pozycja 2). Jeden checkbox obejmuje regulamin
 * i politykę prywatności; backend zapisuje je osobno i sam egzekwuje (CONSENT_REQUIRED).
 * Linki otwierają się w nowej karcie, żeby nie zgubić wypełnionego formularza.
 */
export function ConsentCheckbox({ checked, error, onChange }: { checked: boolean; error: string; onChange: (checked: boolean) => void }) {
  return (
    <div>
      <label
        htmlFor="consent"
        className={`flex cursor-pointer items-start gap-3 rounded-ui-md border p-3 text-sm text-ink-muted transition-colors ${
          error ? 'border-danger/50 bg-danger-soft/40' : 'border-line bg-surface-muted hover:border-line-strong'
        }`}
      >
        <input
          id="consent"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error !== ''}
          aria-describedby={error ? 'consent-error' : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line-strong accent-[rgb(var(--brand))]"
        />
        <span>
          Akceptuję{' '}
          <Link href="/static-content/terms-of-service" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-2 hover:underline">
            regulamin
          </Link>{' '}
          i{' '}
          <Link href="/static-content/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-2 hover:underline">
            politykę prywatności
          </Link>
          . <span className="text-danger" aria-hidden="true">*</span>
        </span>
      </label>
      {error && (
        <div id="consent-error" role="alert" className="mt-1 text-xs text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
