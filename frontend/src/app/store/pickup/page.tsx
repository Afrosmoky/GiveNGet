"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LuCircleCheck, LuCircleX, LuKeyRound, LuShieldAlert } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { useRoleGate } from '../../../hooks/useRoleGate';
import PickupScanner from '../../../components/PickupScanner';
import { NETWORK_FAILURE, describePickupFailure, type PickupFailure } from '../../../components/store/pickupOutcome';
import { Badge, Button, Card, Input, Spinner, StatusPill, cn, reservationPillStatus } from '../../../components/ui';
import { Reservation, extractPickupCode, formatTime } from '../../../types/reservation';

type Outcome =
  | { kind: 'success'; reservation: Reservation }
  | { kind: 'failure'; failure: PickupFailure };

/** Długość kodu odbioru (alfabet 32 znaków, 6 pozycji) — tylko podpowiedź w UI, waliduje backend. */
const PICKUP_CODE_LENGTH = 6;

export default function StorePickupPage() {
  // Te same role co reguła /api/v1/reservations/collect w SecurityConfig
  const gate = useRoleGate(['STORE_EMPLOYEE', 'ADMIN']);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inputHint, setInputHint] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  /** Chroni przed dubletem, gdy skaner odczyta ten sam kod kilka razy pod rząd. */
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (gate !== 'granted') return;
    setIsPlatformAdmin(getUserData()?.userType === 'ADMIN');
    inputRef.current?.focus();
  }, [gate]);

  const focusInput = useCallback((select = false) => {
    // Pole wraca do DOM w tym samym renderze — fokus po klatce
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (select) inputRef.current?.select();
    });
  }, []);

  const collect = useCallback(async (rawCode: string) => {
    const pickupCode = extractPickupCode(rawCode);
    if (!pickupCode) {
      setInputHint('Wpisz lub zeskanuj kod odbioru.');
      return;
    }
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setSubmitting(true);
    setInputHint(null);
    setOutcome(null);
    // Chowamy klawiaturę na telefonie, żeby wynik był widoczny bez przewijania
    inputRef.current?.blur();

    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/v1/reservations/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode }),
      });
      const body = await response.text();

      if (!response.ok) {
        const failure = describePickupFailure(response.status, body);
        // Przy literówce kod zostaje w polu, żeby poprawić jeden znak. Kodu odebranego,
        // wygasłego czy z innego sklepu nie ma po co zostawiać — tylko kusiłby ponowieniem.
        setCode(failure.retryable ? pickupCode : '');
        setOutcome({ kind: 'failure', failure });
        return;
      }

      setOutcome({ kind: 'success', reservation: JSON.parse(body) as Reservation });
      setSessionCount((n) => n + 1);
      setCode('');
    } catch {
      setCode(pickupCode);
      setOutcome({ kind: 'failure', failure: NETWORK_FAILURE });
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, []);

  const handleScan = useCallback(
    (rawValue: string) => {
      void collect(rawValue);
    },
    [collect]
  );

  const startNext = () => {
    setOutcome(null);
    setCode('');
    setInputHint(null);
    focusInput();
  };

  const fixCode = () => {
    setOutcome(null);
    focusInput(true);
  };

  if (gate !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        {gate === 'checking' ? <Spinner className="h-6 w-6 text-brand" /> : <p className="text-sm text-ink-muted">Brak dostępu do tego panelu.</p>}
      </div>
    );
  }

  const success = outcome?.kind === 'success' ? outcome.reservation : null;
  const failure = outcome?.kind === 'failure' ? outcome.failure : null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-5 sm:py-10">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-ink sm:text-[28px]">Potwierdź odbiór</h1>
          <p className="mt-1 text-sm text-ink-muted">Wpisz kod z telefonu klienta albo zeskanuj jego kod QR.</p>
        </div>
        {sessionCount > 0 && (
          <Badge tone="success" size="md" className="mt-1 shrink-0">
            Wydano: {sessionCount}
          </Badge>
        )}
      </div>

      {isPlatformAdmin && (
        <div role="note" className="mb-4 flex gap-2.5 rounded-ui-md border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
          <LuShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            Działasz jako administrator platformy — potwierdzenie pominie sprawdzenie, czy oferta należy do Twojego
            sklepu. Używaj tylko wtedy, gdy pracownik sklepu nie może tego zrobić.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {success ? (
          <SuccessPanel reservation={success} onNext={startNext} />
        ) : (
          <>
            {failure && <FailurePanel failure={failure} onFix={fixCode} onNext={startNext} />}

            {/* Wpisanie ręczne jest pierwsze: działa zawsze, także bez HTTPS i bez kamery */}
            <Card padding="lg">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void collect(code);
                }}
                noValidate
                className="flex flex-col gap-4"
              >
                <Input
                  ref={inputRef}
                  id="pickup-code"
                  label="Kod odbioru"
                  size="lg"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setInputHint(null);
                  }}
                  // Kropki zamiast przykładowego kodu: przykład wyglądał jak już wpisana wartość
                  placeholder={'·'.repeat(PICKUP_CODE_LENGTH)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  enterKeyHint="done"
                  // Zapas na treść QR („id:KOD”) wklejaną przez czytnik działający jak klawiatura
                  maxLength={32}
                  disabled={submitting}
                  aria-invalid={failure?.retryable || inputHint ? true : undefined}
                  error={inputHint ?? undefined}
                  hint={`${PICKUP_CODE_LENGTH} znaków z ekranu klienta. Wielkość liter nie ma znaczenia.`}
                  className="!h-16 !px-3 text-center font-mono !text-3xl font-semibold uppercase tracking-[0.3em] sm:!h-20 sm:!text-4xl"
                />
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={!code.trim()}
                  className="!h-14 !text-lg"
                >
                  {submitting ? 'Potwierdzam…' : 'Potwierdź odbiór'}
                </Button>
              </form>
            </Card>
          </>
        )}

        {/* Skaner wstrzymany, gdy na ekranie jest wynik: ten sam QR odczytany drugi raz
            nadpisałby „Odebrano” komunikatem „Już odebrana”. „Następny” wznawia skanowanie. */}
        <PickupScanner
          onScan={handleScan}
          paused={submitting || outcome !== null}
          pausedLabel={submitting ? 'Potwierdzam odbiór…' : 'Skanowanie wstrzymane — dotknij „Następny”, żeby skanować dalej.'}
        />
      </div>
    </div>
  );
}

/**
 * Potwierdzenie odbioru. Zastępuje formularz, żeby przy kasie nie było wątpliwości, co
 * właśnie się stało; „Następny” jednym tapnięciem wraca do pustego pola.
 */
function SuccessPanel({ reservation, onNext }: { reservation: Reservation; onNext: () => void }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-ui-xl border-2 border-success/40 bg-success-soft shadow-card"
    >
      <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center sm:pt-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white shadow-card sm:h-20 sm:w-20">
          <LuCircleCheck className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden />
        </span>
        <p className="mt-3 text-3xl font-bold tracking-tight text-success sm:text-4xl">Odebrano</p>
        <StatusPill status={reservationPillStatus(reservation.status)} size="md" className="mt-2" label="Odbiór potwierdzony" />
      </div>

      <dl className="mx-4 mb-4 divide-y divide-line rounded-ui-lg border border-line bg-surface sm:mx-5">
        <SummaryRow label="Oferta" value={reservation.offerName || reservation.offerId} strong />
        <SummaryRow label="Ilość" value={`${reservation.quantity} szt.`} strong />
        <SummaryRow label="Godzina odbioru" value={formatTime(reservation.collectedAt)} />
        <SummaryRow label="Kod" value={<span className="font-mono tracking-widest">{reservation.pickupCode}</span>} />
      </dl>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        {/* Fokus od razu na „Następny”: Enter albo jeden tap wraca do pustego pola */}
        <Button variant="success" size="lg" fullWidth autoFocus onClick={onNext} className="!h-14 !text-lg">
          Następny
        </Button>
      </div>
    </section>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className={cn('min-w-0 text-right text-ink', strong ? 'text-base font-semibold' : 'text-sm font-medium')}>{value}</dd>
    </div>
  );
}

/** Odmowa backendu — czerwony panel nad polem kodu, z decyzją „poprawić” albo „następny klient”. */
function FailurePanel({
  failure,
  onFix,
  onNext,
}: {
  failure: PickupFailure;
  onFix: () => void;
  onNext: () => void;
}) {
  return (
    <section role="alert" className="rounded-ui-xl border-2 border-danger/40 bg-danger-soft p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger text-white">
          <LuCircleX className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold tracking-tight text-danger">{failure.title}</p>
            {failure.status && <StatusPill status={reservationPillStatus(failure.status)} />}
          </div>
          <p className="mt-1 text-sm leading-5 text-ink">{failure.message}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {failure.retryable && (
          <Button size="lg" variant="secondary" fullWidth leftIcon={<LuKeyRound size={18} />} onClick={onFix}>
            Popraw kod
          </Button>
        )}
        <Button
          size="lg"
          variant={failure.retryable ? 'secondary' : 'primary'}
          fullWidth
          onClick={onNext}
          className={cn(!failure.retryable && 'sm:col-span-2')}
        >
          Następny klient
        </Button>
      </div>
    </section>
  );
}
