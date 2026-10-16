"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch, getUserData, isAuthenticated } from '../../../utils/auth';
import { describeApiError, parseApiError } from '../../../utils/apiErrors';
import { formatDateTime, PageResponse } from '../../../types/reservation';
import { CreateStoreEmployeePayload, StoreEmployee } from '../../../types/storeEmployee';

/** Panel dostępny tylko dla konta firmowego — zgodnie z regułą /api/v1/store-employees/**. */
const ALLOWED_USER_TYPE = 'COMPANY';
const PAGE_SIZE = 20;
const ENDPOINT = `${environment.apiUrl}/api/v1/store-employees`;

type Authorization = 'checking' | 'granted' | 'denied';
type FormFields = Required<CreateStoreEmployeePayload>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY_FORM: FormFields = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '' };

const INPUT_CLASSES =
  'w-full rounded-lg border-2 border-gray-200 p-2.5 text-base transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200';

export default function StoreEmployeesPage() {
  const router = useRouter();
  const [authorization, setAuthorization] = useState<Authorization>('checking');

  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(0);
  const [employees, setEmployees] = useState<PageResponse<StoreEmployee> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // Bramka roli: AuthGuard zna tylko fakt zalogowania, więc rolę sprawdzamy tutaj
  useEffect(() => {
    if (!isAuthenticated()) {
      setAuthorization('denied');
      router.replace('/login');
      return;
    }
    if (getUserData()?.userType !== ALLOWED_USER_TYPE) {
      setAuthorization('denied');
      router.replace('/unauthorized');
      return;
    }
    setAuthorization('granted');
  }, [router]);

  const loadEmployees = useCallback(async (targetPage: number) => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await authorizedFetch(`${ENDPOINT}?page=${targetPage}&size=${PAGE_SIZE}`);
      if (!response.ok) {
        setListError(describeApiError(await response.text(), 'Nie udało się pobrać listy pracowników.'));
        return;
      }
      const data: PageResponse<StoreEmployee> = await response.json();
      // Strona za końcem (np. po zmianie danych w innej karcie) — cofamy na ostatnią istniejącą
      if (data.content.length === 0 && targetPage > 0 && data.totalPages > 0) {
        setPage(data.totalPages - 1);
        return;
      }
      setEmployees(data);
    } catch {
      setListError('Brak połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorization === 'granted') {
      void loadEmployees(page);
    }
  }, [authorization, page, loadEmployees]);

  const updateField = (field: keyof FormFields, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    setFieldErrors({});

    const payload: CreateStoreEmployeePayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
    };

    try {
      const response = await authorizedFetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.text();
        const apiError = parseApiError(body);
        // Walidacja przychodzi z naruszeniami per pole — pokazujemy je przy polach
        const fields = apiError?.code === 'VALIDATION_FAILED'
          ? (apiError.details?.fields as FieldErrors | undefined)
          : undefined;
        if (fields) setFieldErrors(fields);
        if (apiError?.code === 'EMAIL_ALREADY_EXISTS') {
          setFieldErrors({ email: describeApiError(body, '') });
        }
        setFormError(describeApiError(body, 'Nie udało się utworzyć konta pracownika.'));
        return;
      }
      const created: StoreEmployee = await response.json();
      setForm(EMPTY_FORM);
      setFormSuccess(`Utworzono konto ${created.firstName} ${created.lastName} (${created.email}).`);
      // Nowe konto jest najnowsze, więc ląduje na pierwszej stronie listy
      if (page === 0) {
        void loadEmployees(0);
      } else {
        setPage(0);
      }
    } catch {
      setFormError('Brak połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (employee: StoreEmployee) => {
    setTogglingId(employee.id);
    setRowError(null);
    try {
      const response = await authorizedFetch(`${ENDPOINT}/${employee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !employee.active }),
      });
      if (!response.ok) {
        setRowError(describeApiError(await response.text(), 'Nie udało się zmienić statusu pracownika.'));
        return;
      }
      // Stan bierzemy z odpowiedzi serwera, nie zakładamy wyniku po stronie klienta
      const updated: StoreEmployee = await response.json();
      setEmployees((prev) =>
        prev ? { ...prev, content: prev.content.map((e) => (e.id === updated.id ? updated : e)) } : prev
      );
    } catch {
      setRowError('Brak połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setTogglingId(null);
    }
  };

  if (authorization !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-gray-600">
          {authorization === 'checking' ? 'Sprawdzanie uprawnień…' : 'Brak dostępu do tej strony.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Pracownicy sklepu</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pracownik loguje się własnym kontem i potwierdza odbiory rezerwacji na oferty Twojego sklepu.
        </p>
      </header>

      {/* Formularz dodania */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Dodaj pracownika</h2>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="employee-first-name" label="Imię" error={fieldErrors.firstName}>
              <input
                id="employee-first-name"
                type="text"
                autoComplete="off"
                required
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className={INPUT_CLASSES}
              />
            </Field>
            <Field id="employee-last-name" label="Nazwisko" error={fieldErrors.lastName}>
              <input
                id="employee-last-name"
                type="text"
                autoComplete="off"
                required
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className={INPUT_CLASSES}
              />
            </Field>
            <Field id="employee-email" label="E-mail" error={fieldErrors.email}>
              <input
                id="employee-email"
                type="email"
                autoComplete="off"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={INPUT_CLASSES}
              />
            </Field>
            <Field
              id="employee-password"
              label="Hasło"
              hint="co najmniej 8 znaków — przekaż je pracownikowi"
              error={fieldErrors.password}
            >
              <input
                id="employee-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={INPUT_CLASSES}
              />
            </Field>
            <Field id="employee-phone" label="Telefon" optional error={fieldErrors.phoneNumber}>
              <input
                id="employee-phone"
                type="tel"
                autoComplete="off"
                value={form.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className={INPUT_CLASSES}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Tworzę konto…' : 'Utwórz konto pracownika'}
              </button>
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {formSuccess}
            </p>
          )}
        </form>
      </section>

      {/* Lista */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Konta pracowników</h2>
          {employees && (
            <span className="text-sm text-gray-500">łącznie: {employees.totalElements}</span>
          )}
        </div>

        {rowError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {rowError}
          </p>
        )}

        {listError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{listError}</p>
            <button
              type="button"
              onClick={() => void loadEmployees(page)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {!listError && !employees && listLoading && (
          <p aria-busy="true" className="py-6 text-center text-sm text-gray-500">
            Wczytywanie…
          </p>
        )}

        {!listError && employees && employees.totalElements === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="font-semibold text-gray-900">Nie masz jeszcze pracowników</p>
            <p className="mt-1 text-sm text-gray-600">Dodaj pierwsze konto formularzem powyżej.</p>
          </div>
        )}

        {!listError && employees && employees.content.length > 0 && (
          <div className={listLoading ? 'opacity-60' : ''}>
            {/* Wąski ekran: karty zamiast tabeli */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {employees.content.map((employee) => (
                <li key={employee.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="break-all text-sm text-gray-600">{employee.email}</p>
                      {employee.phoneNumber && (
                        <p className="text-sm text-gray-600">{employee.phoneNumber}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Utworzono: {formatDateTime(employee.createdAt)}
                      </p>
                    </div>
                    <StatusBadge active={employee.active} />
                  </div>
                  <ToggleButton
                    employee={employee}
                    busy={togglingId === employee.id}
                    onClick={() => void toggleActive(employee)}
                    className="mt-2 w-full"
                  />
                </li>
              ))}
            </ul>

            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-semibold">Imię i nazwisko</th>
                  <th className="py-2 pr-3 font-semibold">E-mail</th>
                  <th className="py-2 pr-3 font-semibold">Telefon</th>
                  <th className="py-2 pr-3 font-semibold">Utworzono</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">
                    <span className="sr-only">Akcje</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.content.map((employee) => (
                  <tr key={employee.id}>
                    <td className="py-3 pr-3 font-semibold text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td className="break-all py-3 pr-3 text-gray-700">{employee.email}</td>
                    <td className="py-3 pr-3 text-gray-700">{employee.phoneNumber || '—'}</td>
                    <td className="whitespace-nowrap py-3 pr-3 text-gray-700">
                      {formatDateTime(employee.createdAt)}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge active={employee.active} />
                    </td>
                    <td className="py-3 text-right">
                      <ToggleButton
                        employee={employee}
                        busy={togglingId === employee.id}
                        onClick={() => void toggleActive(employee)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {employees.totalPages > 1 && (
              <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Strony listy pracowników">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || listLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ‹ Poprzednia
                </button>
                <span className="text-sm text-gray-600">
                  Strona {employees.page + 1} z {employees.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= employees.totalPages || listLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Następna ›
                </button>
              </nav>
            )}
          </div>
        )}

        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Dezaktywowany pracownik nie zaloguje się ani nie potwierdzi odbioru. Konto można w każdej
          chwili aktywować ponownie.
        </p>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  optional = false,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-gray-700">
        {label}
        {optional && <span className="font-normal text-gray-500"> (opcjonalnie)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-block shrink-0 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">
      aktywny
    </span>
  ) : (
    <span className="inline-block shrink-0 rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
      dezaktywowany
    </span>
  );
}

function ToggleButton({
  employee,
  busy,
  onClick,
  className = '',
}: {
  employee: StoreEmployee;
  busy: boolean;
  onClick: () => void;
  className?: string;
}) {
  const label = employee.active ? 'Dezaktywuj' : 'Aktywuj';
  const tone = employee.active
    ? 'border-red-300 text-red-700 hover:bg-red-50'
    : 'border-green-300 text-green-700 hover:bg-green-50';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={`${label}: ${employee.firstName} ${employee.lastName}`}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tone} ${className}`}
    >
      {busy ? 'Zapisuję…' : label}
    </button>
  );
}
