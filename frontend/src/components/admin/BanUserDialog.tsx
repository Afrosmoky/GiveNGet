"use client";

import { useEffect, useState } from 'react';
import { environment } from '../../config';
import { authorizedFetch } from '../../utils/auth';
import { Button, Dialog, Input, Select, Textarea, cn } from '../ui';

/** Kody powodów bana — muszą odpowiadać BanReason w backendzie. */
export const BAN_REASON_CODES = [
  { code: 101, label: 'Nieodpowiednia kategoria' },
  { code: 102, label: 'Wulgaryzmy/obraźliwe treści' },
  { code: 103, label: 'Towar niedozwolony' },
  { code: 104, label: 'Wprowadzające w błąd' },
  { code: 105, label: 'Naruszenie zdjęć/RODO' },
  { code: 201, label: 'Spam' },
  { code: 301, label: 'Nadużycie w transakcji' },
  { code: 401, label: 'Inne' },
] as const;

/** Kod „Inne” — wymaga opisu. */
const OTHER_REASON_CODE = 401;

export interface BanTarget {
  id: number;
  name: string;
  /** Obecny stan konta: zbanowane → okno odbanowania. */
  banned: boolean;
}

interface BanUserDialogProps {
  target: BanTarget | null;
  /** Rola wykonującego: moderator może banować tylko czasowo. */
  actorRole: 'ADMIN' | 'EMPLOYEE' | null;
  onClose: () => void;
  /** Po udanej operacji — odświeżenie listy w miejscu wywołania. */
  onDone: () => void;
}

/**
 * Ban / odbanowanie użytkownika (PATCH /api/mod/users/{id}/ban). Wspólne dla listy
 * użytkowników i skarg. Walidacja tutaj to tylko UX — reguły (np. ban permanentny
 * wyłącznie dla admina) egzekwuje backend.
 */
export function BanUserDialog({ target, actorRole, onClose, onDone }: BanUserDialogProps) {
  const isModerator = actorRole === 'EMPLOYEE';
  const [reasonCode, setReasonCode] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [permanent, setPermanent] = useState(false);
  const [days, setDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Każde otwarcie zaczyna od czystego formularza; moderator domyślnie 7 dni, admin też (permanentny świadomie)
  useEffect(() => {
    if (!target) return;
    setReasonCode(null);
    setReason('');
    setPermanent(false);
    setDays('7');
    setError(null);
  }, [target]);

  if (!target) return null;
  const unban = target.banned;

  const submit = async () => {
    const url = new URL(`${environment.apiUrl}/api/mod/users/${target.id}/ban`);
    // Parametr opisuje zamierzony stan po operacji, nie obecny
    url.searchParams.set('banned', String(!unban));

    if (!unban) {
      if (!reasonCode) {
        setError('Wybierz powód bana.');
        return;
      }
      if (reasonCode === OTHER_REASON_CODE && !reason.trim()) {
        setError('Powód „Inne” wymaga opisu.');
        return;
      }
      url.searchParams.set('reasonCode', String(reasonCode));
      if (!permanent || isModerator) {
        const parsedDays = Number(days);
        if (!Number.isInteger(parsedDays) || parsedDays < 1) {
          setError('Podaj czas bana — co najmniej 1 dzień.');
          return;
        }
        url.searchParams.set('durationDays', String(parsedDays));
      }
    }
    if (reason.trim()) url.searchParams.set('reason', reason.trim());

    setSubmitting(true);
    setError(null);
    try {
      const response = await authorizedFetch(url.toString(), { method: 'PATCH' });
      if (!response.ok) {
        // Stary endpoint zwraca goły tekst — pokazujemy go, bo zawiera konkretną przyczynę
        setError((await response.text()) || 'Nie udało się zmienić statusu użytkownika.');
        return;
      }
      onDone();
      onClose();
    } catch {
      setError('Błąd połączenia z serwerem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={unban ? 'Odblokuj użytkownika' : 'Zablokuj użytkownika'}
      description={target.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant={unban ? 'primary' : 'danger'} loading={submitting} onClick={submit}>
            {unban ? 'Odblokuj' : 'Zablokuj'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {unban ? (
          <Textarea
            label={<>Powód odblokowania <span className="font-normal text-ink-subtle">(opcjonalnie)</span></>}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Np. wyjaśniono sprawę z użytkownikiem"
            rows={3}
          />
        ) : (
          <>
            <Select
              label="Powód bana"
              value={reasonCode ?? ''}
              onChange={(e) => {
                const code = e.target.value ? Number(e.target.value) : null;
                setReasonCode(code);
                setError(null);
              }}
              hint="Zgodnie z regulaminem — kod trafia do historii banów."
            >
              <option value="">Wybierz powód…</option>
              {BAN_REASON_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.label}
                </option>
              ))}
            </Select>

            {reasonCode !== null && (
              <Textarea
                label={
                  reasonCode === OTHER_REASON_CODE ? (
                    'Opis powodu'
                  ) : (
                    <>Dodatkowy opis <span className="font-normal text-ink-subtle">(opcjonalnie)</span></>
                  )
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Szczegóły dla historii banów…"
                rows={3}
              />
            )}

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Czas trwania</legend>
              {!isModerator && (
                <div className="mb-2 grid grid-cols-2 gap-2" role="radiogroup">
                  <DurationOption selected={!permanent} onClick={() => setPermanent(false)}>
                    Czasowy
                  </DurationOption>
                  <DurationOption selected={permanent} onClick={() => setPermanent(true)}>
                    Permanentny
                  </DurationOption>
                </div>
              )}
              {(!permanent || isModerator) && (
                <Input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  aria-label="Liczba dni"
                  rightSlot={<span className="pr-2 text-sm text-ink-muted">dni</span>}
                  hint={isModerator ? 'Moderator banuje tylko czasowo. Ban permanentny może nałożyć administrator.' : undefined}
                />
              )}
            </fieldset>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-ui-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function DurationOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'h-10 rounded-ui-md border text-sm font-medium transition-colors',
        selected ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-surface text-ink-muted hover:border-line-strong'
      )}
    >
      {children}
    </button>
  );
}
