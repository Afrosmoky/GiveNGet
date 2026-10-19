"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuCircleAlert, LuCircleCheck, LuLock, LuMail, LuPhone, LuUserPlus, LuUsers } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';
import { useRoleGate } from '../../../hooks/useRoleGate';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Spinner, consolePage } from '../../../components/ui';
import { describeApiError, parseApiError } from '../../../utils/apiErrors';
import { formatDateTime, PageResponse } from '../../../types/reservation';
import { CreateStoreEmployeePayload, StoreEmployee } from '../../../types/storeEmployee';

const PAGE_SIZE = 20;
const ENDPOINT = `${environment.apiUrl}/api/v1/store-employees`;

type FormFields = Required<CreateStoreEmployeePayload>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY_FORM: FormFields = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '' };


export default function StoreEmployeesPage() {
  // Panel tylko dla konta firmowego — zgodnie z regułą /api/v1/store-employees/**
  const authorization = useRoleGate('COMPANY');
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Sprawdzanie uprawnień" />
      </div>
    );
  }

  return (
    <div className={consolePage}>
      <PageHeader
        title="Pracownicy sklepu"
        description="Pracownik loguje się własnym kontem i potwierdza odbiory rezerwacji na oferty Twojego sklepu."
      />

      {/* Formularz dodania */}
      <Card className="mb-6">
        <CardHeader title="Dodaj pracownika" description="Pracownik zaloguje się tym e-mailem i hasłem — przekaż mu je." />
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input id="employee-first-name" label="Imię" autoComplete="off" required value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} error={fieldErrors.firstName} />
            <Input id="employee-last-name" label="Nazwisko" autoComplete="off" required value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} error={fieldErrors.lastName} />
            <Input id="employee-email" label="E-mail" type="email" autoComplete="off" required value={form.email} onChange={(e) => updateField('email', e.target.value)} error={fieldErrors.email} leftIcon={<LuMail size={16} />} />
            <Input
              id="employee-password"
              label="Hasło"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={fieldErrors.password}
              hint="Co najmniej 8 znaków."
              leftIcon={<LuLock size={16} />}
            />
            <Input
              id="employee-phone"
              label={<>Telefon <span className="font-normal text-ink-subtle">(opcjonalnie)</span></>}
              type="tel"
              autoComplete="off"
              value={form.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              error={fieldErrors.phoneNumber}
              leftIcon={<LuPhone size={16} />}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="submit" loading={submitting} leftIcon={<LuUserPlus size={16} />} className="w-full sm:w-auto">
              {submitting ? 'Tworzę konto…' : 'Utwórz konto pracownika'}
            </Button>
          </div>

          {formError && (
            <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-danger">
              <LuCircleAlert size={16} aria-hidden /> {formError}
            </p>
          )}
          {formSuccess && (
            <p role="status" className="mt-4 flex items-center gap-2 rounded-ui-md border border-success/30 bg-success-soft px-3 py-2.5 text-sm text-brand-strong">
              <LuCircleCheck size={16} aria-hidden /> {formSuccess}
            </p>
          )}
        </form>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader
          title="Konta pracowników"
          description={employees ? `Łącznie: ${employees.totalElements}` : undefined}
        />

        {rowError && (
          <p role="alert" className="mb-3 flex items-center gap-2 text-sm text-danger">
            <LuCircleAlert size={16} aria-hidden /> {rowError}
          </p>
        )}

        {listError && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-ui-md border border-danger/30 bg-danger-soft p-4">
            <p className="text-sm text-danger">{listError}</p>
            <Button variant="secondary" size="sm" onClick={() => void loadEmployees(page)}>
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {!listError && !employees && listLoading && (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-ui-md bg-surface-sunken" />
            ))}
          </div>
        )}

        {!listError && employees && employees.totalElements === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
              <LuUsers size={22} />
            </span>
            <p className="font-medium text-ink">Nie masz jeszcze pracowników</p>
            <p className="text-sm text-ink-muted">Dodaj pierwsze konto formularzem powyżej.</p>
          </div>
        )}

        {!listError && employees && employees.content.length > 0 && (
          <div className={listLoading ? 'opacity-60 transition-opacity' : undefined}>
            {/* Wąski ekran: karty zamiast tabeli */}
            <ul className="divide-y divide-line md:hidden">
              {employees.content.map((employee) => (
                <li key={employee.id} className="py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="break-all text-sm text-ink-muted">{employee.email}</p>
                      {employee.phoneNumber && <p className="text-sm text-ink-muted">{employee.phoneNumber}</p>}
                      <p className="mt-1 text-xs text-ink-subtle">Utworzono: {formatDateTime(employee.createdAt)}</p>
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
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="py-2.5 pr-3 font-medium">Imię i nazwisko</th>
                  <th className="px-3 py-2.5 font-medium">E-mail</th>
                  <th className="px-3 py-2.5 font-medium">Telefon</th>
                  <th className="px-3 py-2.5 font-medium">Utworzono</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-3 font-medium">
                    <span className="sr-only">Akcje</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.content.map((employee) => (
                  <tr key={employee.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3 font-medium text-ink">
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td className="break-all px-3 py-3 text-ink-muted">{employee.email}</td>
                    <td className="px-3 py-3 text-ink-muted">{employee.phoneNumber || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink-muted">{formatDateTime(employee.createdAt)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge active={employee.active} />
                    </td>
                    <td className="py-3 pl-3 text-right">
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
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || listLoading} leftIcon={<LuChevronLeft size={16} />}>
                  Poprzednia
                </Button>
                <span className="text-sm text-ink-muted">
                  Strona {employees.page + 1} z {employees.totalPages}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= employees.totalPages || listLoading} rightIcon={<LuChevronRight size={16} />}>
                  Następna
                </Button>
              </nav>
            )}
          </div>
        )}

        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-subtle">
          Dezaktywowany pracownik nie zaloguje się ani nie potwierdzi odbioru. Konto można w każdej chwili aktywować ponownie.
        </p>
      </Card>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success" dot className="shrink-0">
      Aktywny
    </Badge>
  ) : (
    <Badge tone="neutral" dot className="shrink-0">
      Dezaktywowany
    </Badge>
  );
}

function ToggleButton({
  employee,
  busy,
  onClick,
  className,
}: {
  employee: StoreEmployee;
  busy: boolean;
  onClick: () => void;
  className?: string;
}) {
  const label = employee.active ? 'Dezaktywuj' : 'Aktywuj';
  return (
    <Button
      variant={employee.active ? 'ghost' : 'secondary'}
      size="sm"
      onClick={onClick}
      loading={busy}
      aria-label={`${label}: ${employee.firstName} ${employee.lastName}`}
      className={employee.active ? `!text-danger hover:bg-danger-soft ${className ?? ''}` : className}
    >
      {busy ? 'Zapisuję…' : label}
    </Button>
  );
}
