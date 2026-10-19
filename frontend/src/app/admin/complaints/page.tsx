"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LuCircleAlert,
  LuCircleCheck,
  LuEyeOff,
  LuLock,
  LuMessageSquare,
  LuNotebookPen,
  LuPackage,
  LuRefreshCw,
  LuRotateCcw,
  LuTrash2,
} from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { BanUserDialog, type BanTarget } from '../../../components/admin/BanUserDialog';
import { ReasonDialog } from '../../../components/admin/ReasonDialog';
import { ActionMenu, Badge, Button, Card, Chip, Dialog, PageHeader, Pager, Select, Spinner, Textarea, cn, consolePage } from '../../../components/ui';
import type { ChatSnippetMessage, ComplaintDto, ComplaintNote } from '../../../types/complaint';
import { formatShortDateTime } from '../../../utils/dateFormat';

type ResolvedFilter = '' | 'true' | 'false';
type TypeFilter = '' | 'CHAT' | 'OFFER';

/**
 * API skarg zwraca pełną listę (bez paginacji) — dzielimy ją na strony tylko do wyświetlenia.
 * Filtrowanie po statusie i typie robi backend.
 */
const PAGE_SIZE = 20;

type Notice = { tone: 'success' | 'danger'; text: string } | null;

export default function ComplaintsPage() {
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE' | null>(null);
  const [data, setData] = useState<ComplaintDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [resolved, setResolved] = useState<ResolvedFilter>('');
  const [type, setType] = useState<TypeFilter>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const [snippetFor, setSnippetFor] = useState<ComplaintDto | null>(null);
  const [notesFor, setNotesFor] = useState<ComplaintDto | null>(null);
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [blockOfferId, setBlockOfferId] = useState<string | null>(null);
  const [deleteOfferId, setDeleteOfferId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${environment.apiUrl}/api/mod/complaints`);
      if (resolved) url.searchParams.set('resolved', resolved);
      if (type) url.searchParams.set('type', type);
      const response = await authorizedFetch(url.toString());
      if (response.ok) {
        setData((await response.json()) as ComplaintDto[]);
      } else {
        setError((await response.text()) || 'Nie udało się pobrać skarg.');
      }
    } catch {
      setError('Błąd połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  }, [resolved, type]);

  useEffect(() => {
    const userType = getUserData()?.userType;
    if (userType === 'ADMIN' || userType === 'EMPLOYEE') setRole(userType);
  }, []);

  // Zmiana filtra = nowe zapytanie i powrót na pierwszą stronę
  useEffect(() => {
    setPage(0);
    void fetchComplaints();
  }, [fetchComplaints]);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    });
    return copy;
  }, [data, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleResolved = async (c: ComplaintDto) => {
    setTogglingId(c.id);
    try {
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/mod/complaints/${c.id}/resolve?resolved=${!c.resolved}`,
        { method: 'PATCH' }
      );
      if (response.ok) {
        setData((prev) => prev.map((x) => (x.id === c.id ? { ...x, resolved: !c.resolved } : x)));
        setNotice({ tone: 'success', text: c.resolved ? `Skarga #${c.id} otwarta ponownie.` : `Skarga #${c.id} oznaczona jako rozwiązana.` });
      } else {
        setNotice({ tone: 'danger', text: (await response.text()) || 'Nie udało się zmienić statusu skargi.' });
      }
    } catch {
      setNotice({ tone: 'danger', text: 'Błąd połączenia z serwerem.' });
    } finally {
      setTogglingId(null);
    }
  };

  const offerAction = async (url: string, method: 'PATCH' | 'DELETE', success: string): Promise<string | null> => {
    try {
      const response = await authorizedFetch(url, { method });
      if (!response.ok) return (await response.text()) || 'Operacja nie powiodła się.';
      setNotice({ tone: 'success', text: success });
      return null;
    } catch {
      return 'Błąd połączenia z serwerem.';
    }
  };

  const actionsFor = (c: ComplaintDto) => [
    { label: 'Notatki', icon: <LuNotebookPen size={16} />, onSelect: () => setNotesFor(c) },
    {
      label: c.resolved ? 'Otwórz ponownie' : 'Oznacz jako rozwiązaną',
      icon: c.resolved ? <LuRotateCcw size={16} /> : <LuCircleCheck size={16} />,
      onSelect: () => void toggleResolved(c),
    },
    {
      label: 'Zbanuj zgłoszonego',
      icon: <LuLock size={16} />,
      tone: 'danger' as const,
      disabled: !c.reportedUserId,
      onSelect: () =>
        c.reportedUserId && setBanTarget({ id: c.reportedUserId, name: c.reportedUserName || `Użytkownik #${c.reportedUserId}`, banned: false }),
    },
    {
      label: 'Zablokuj ofertę',
      icon: <LuEyeOff size={16} />,
      tone: 'danger' as const,
      hidden: !(c.type === 'OFFER' && c.offerId),
      onSelect: () => setBlockOfferId(c.offerId),
    },
    {
      // Usunięcie oferty stoi na /api/admin/** — tylko administrator
      label: 'Usuń ofertę',
      icon: <LuTrash2 size={16} />,
      tone: 'danger' as const,
      hidden: !(c.type === 'OFFER' && c.offerId) || role !== 'ADMIN',
      onSelect: () => setDeleteOfferId(c.offerId),
    },
  ];

  return (
    <div className={consolePage}>
      <PageHeader
        title="Skargi"
        description="Zgłoszenia użytkowników dotyczące ofert i rozmów."
        actions={
          <Button variant="secondary" leftIcon={<LuRefreshCw size={16} />} onClick={() => void fetchComplaints()} disabled={loading}>
            Odśwież
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <FilterGroup label="Status">
              <Chip selected={resolved === ''} onClick={() => setResolved('')}>Wszystkie</Chip>
              <Chip selected={resolved === 'false'} onClick={() => setResolved('false')}>Nierozwiązane</Chip>
              <Chip selected={resolved === 'true'} onClick={() => setResolved('true')}>Rozwiązane</Chip>
            </FilterGroup>
            <FilterGroup label="Dotyczy">
              <Chip selected={type === ''} onClick={() => setType('')}>Wszystko</Chip>
              <Chip selected={type === 'OFFER'} onClick={() => setType('OFFER')}>Oferty</Chip>
              <Chip selected={type === 'CHAT'} onClick={() => setType('CHAT')}>Czaty</Chip>
            </FilterGroup>
          </div>
          <Select
            containerClassName="w-full sm:w-52"
            label="Kolejność"
            value={sortDirection}
            onChange={(e) => {
              setSortDirection(e.target.value as 'asc' | 'desc');
              setPage(0);
            }}
          >
            <option value="asc">Najstarsze najpierw</option>
            <option value="desc">Najnowsze najpierw</option>
          </Select>
        </div>
      </Card>

      {notice && (
        <div
          role={notice.tone === 'danger' ? 'alert' : 'status'}
          className={cn(
            'mb-4 flex items-start justify-between gap-3 rounded-ui-md border px-3.5 py-2.5 text-sm',
            notice.tone === 'success' ? 'border-success/30 bg-success-soft text-brand-strong' : 'border-danger/30 bg-danger-soft text-danger'
          )}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-xs font-medium underline-offset-2 hover:underline">
            Ukryj
          </button>
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        {error ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm text-danger">
              <LuCircleAlert size={16} aria-hidden /> {error}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void fetchComplaints()}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : loading && data.length === 0 ? (
          <div className="space-y-2 p-4 sm:p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-ui-sm bg-surface-sunken" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-ink">Brak skarg</p>
            <p className="mt-1 text-sm text-ink-muted">
              {resolved || type ? 'Żadna skarga nie pasuje do filtrów.' : 'Nikt jeszcze niczego nie zgłosił.'}
            </p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : undefined}>
            <ComplaintsTable complaints={visible} actionsFor={actionsFor} togglingId={togglingId} onSnippet={setSnippetFor} onNotes={setNotesFor} />
            <ComplaintsCards complaints={visible} actionsFor={actionsFor} togglingId={togglingId} onSnippet={setSnippetFor} onNotes={setNotesFor} />
          </div>
        )}
      </Card>

      <Pager page={page} totalPages={totalPages} onChange={setPage} summary={`${sorted.length} skarg`} />

      <ChatSnippetDialog complaint={snippetFor} onClose={() => setSnippetFor(null)} />
      <NotesDialog complaint={notesFor} onClose={() => setNotesFor(null)} onAdded={() => void fetchComplaints()} />
      <BanUserDialog target={banTarget} actorRole={role} onClose={() => setBanTarget(null)} onDone={() => void fetchComplaints()} />
      <ReasonDialog
        open={blockOfferId !== null}
        title="Zablokuj ofertę"
        description={blockOfferId ? `Oferta ${blockOfferId}` : undefined}
        label="Powód blokady"
        placeholder="Np. naruszenie regulaminu — nieprawidłowa kategoria"
        hint="Powód trafi do autora oferty w e-mailu."
        confirmLabel="Zablokuj ofertę"
        onClose={() => setBlockOfferId(null)}
        onConfirm={(reason) =>
          offerAction(
            `${environment.apiUrl}/api/mod/offers/${blockOfferId}/block?reason=${encodeURIComponent(reason)}`,
            'PATCH',
            'Oferta zablokowana. Autor dostanie e-mail z powodem.'
          )
        }
      />
      <ReasonDialog
        open={deleteOfferId !== null}
        title="Usuń ofertę"
        description={deleteOfferId ? `Oferta ${deleteOfferId} — tej operacji nie da się cofnąć.` : undefined}
        label="Powód usunięcia"
        placeholder="Np. towar niedozwolony na platformie"
        hint="Powód trafi do autora oferty w e-mailu."
        confirmLabel="Usuń ofertę"
        onClose={() => setDeleteOfferId(null)}
        onConfirm={(reason) =>
          offerAction(
            `${environment.apiUrl}/api/admin/offers/${deleteOfferId}?reason=${encodeURIComponent(reason)}`,
            'DELETE',
            'Oferta usunięta. Autor dostanie e-mail z powodem.'
          )
        }
      />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface ListProps {
  complaints: ComplaintDto[];
  actionsFor: (c: ComplaintDto) => Parameters<typeof ActionMenu>[0]['items'];
  togglingId: number | null;
  onSnippet: (c: ComplaintDto) => void;
  onNotes: (c: ComplaintDto) => void;
}

function TypeBadge({ type }: { type: ComplaintDto['type'] }) {
  return type === 'CHAT' ? (
    <Badge tone="accent" icon={<LuMessageSquare size={12} />}>
      Czat
    </Badge>
  ) : (
    <Badge tone="warning" icon={<LuPackage size={12} />}>
      Oferta
    </Badge>
  );
}

function ResolvedBadge({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <Badge tone="success" dot>
      Rozwiązana
    </Badge>
  ) : (
    <Badge tone="danger" dot>
      Otwarta
    </Badge>
  );
}

function Person({ id, name }: { id: number | null; name: string | null }) {
  if (!id && !name) return <span className="text-ink-subtle">—</span>;
  const label = name || `Użytkownik #${id}`;
  return id ? (
    <Link href={`/profile/${id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-brand" title={`ID ${id}`}>
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  );
}

function SubjectLink({ c, onSnippet }: { c: ComplaintDto; onSnippet: (c: ComplaintDto) => void }) {
  if (c.type === 'OFFER' && c.offerId) {
    return (
      <Button href={`/offers/${c.offerId}`} variant="secondary" size="sm" leftIcon={<LuPackage size={14} />}>
        Oferta
      </Button>
    );
  }
  if (c.type === 'CHAT' && c.chatId) {
    return (
      <Button variant="secondary" size="sm" leftIcon={<LuMessageSquare size={14} />} disabled={!c.messageId} onClick={() => onSnippet(c)}>
        Czat
      </Button>
    );
  }
  return <span className="text-ink-subtle">—</span>;
}

function NotesButton({ c, onNotes }: { c: ComplaintDto; onNotes: (c: ComplaintDto) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNotes(c)}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors',
        c.notesCount > 0 ? 'bg-brand-soft text-brand-strong hover:bg-brand-soft/70' : 'bg-surface-sunken text-ink-muted hover:text-ink'
      )}
      title="Notatki moderatorskie"
    >
      <LuNotebookPen size={12} aria-hidden />
      {c.notesCount}
    </button>
  );
}

function ComplaintsTable({ complaints, actionsFor, togglingId, onSnippet, onNotes }: ListProps) {
  return (
    <table className="hidden w-full table-fixed text-sm lg:table">
      <thead>
        <tr className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-subtle">
          <th className="w-28 px-4 py-2.5 font-medium sm:px-5">Skarga</th>
          <th className="px-3 py-2.5 font-medium">Opis</th>
          <th className="w-52 px-3 py-2.5 font-medium">Kto → na kogo</th>
          <th className="w-28 px-3 py-2.5 font-medium">Dotyczy</th>
          <th className="w-32 px-3 py-2.5 font-medium">Stan</th>
          <th className="w-16 px-3 py-2.5 font-medium">Notatki</th>
          <th className="w-14 px-3 py-2.5">
            <span className="sr-only">Akcje</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {complaints.map((c) => (
          <tr key={c.id} className="border-b border-line align-top last:border-0 hover:bg-surface-muted/60">
            <td className="px-4 py-3 sm:px-5">
              <p className="font-medium tabular-nums text-ink">#{c.id}</p>
              <div className="mt-1">
                <TypeBadge type={c.type} />
              </div>
            </td>
            <td className="px-3 py-3">
              <p className="line-clamp-2 text-ink" title={c.explanation}>
                {c.explanation || <span className="text-ink-subtle">Bez opisu</span>}
              </p>
              <p className="mt-1 text-xs text-ink-muted">{formatShortDateTime(c.createdAt)}</p>
            </td>
            <td className="px-3 py-3 text-ink-muted">
              <p className="truncate">
                <Person id={c.reporterId} name={c.reporterUserName} />
              </p>
              <p className="truncate text-xs">
                → <Person id={c.reportedUserId} name={c.reportedUserName} />
              </p>
            </td>
            <td className="px-3 py-3">
              <SubjectLink c={c} onSnippet={onSnippet} />
            </td>
            <td className="px-3 py-3">
              {togglingId === c.id ? <Spinner className="h-4 w-4 text-ink-muted" /> : <ResolvedBadge resolved={c.resolved} />}
            </td>
            <td className="px-3 py-3">
              <NotesButton c={c} onNotes={onNotes} />
            </td>
            <td className="px-3 py-2 text-right">
              <ActionMenu label={`Akcje dla skargi #${c.id}`} items={actionsFor(c)} disabled={togglingId === c.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ComplaintsCards({ complaints, actionsFor, togglingId, onSnippet, onNotes }: ListProps) {
  return (
    <ul className="divide-y divide-line lg:hidden">
      {complaints.map((c) => (
        <li key={c.id} className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium tabular-nums text-ink">#{c.id}</span>
              <TypeBadge type={c.type} />
              {togglingId === c.id ? <Spinner className="h-4 w-4 text-ink-muted" /> : <ResolvedBadge resolved={c.resolved} />}
            </div>
            <ActionMenu label={`Akcje dla skargi #${c.id}`} items={actionsFor(c)} disabled={togglingId === c.id} />
          </div>
          <p className="mt-1.5 line-clamp-3 text-sm text-ink">{c.explanation || <span className="text-ink-subtle">Bez opisu</span>}</p>
          <p className="mt-1.5 text-xs text-ink-muted">
            <Person id={c.reporterId} name={c.reporterUserName} /> → <Person id={c.reportedUserId} name={c.reportedUserName} />
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-ink-subtle">{formatShortDateTime(c.createdAt)}</span>
            <div className="flex items-center gap-2">
              <NotesButton c={c} onNotes={onNotes} />
              <SubjectLink c={c} onSnippet={onSnippet} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Fragment rozmowy wokół zgłoszonej wiadomości (ta wiadomość podświetlona). */
function ChatSnippetDialog({ complaint, onClose }: { complaint: ComplaintDto | null; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatSnippetMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!complaint?.chatId || !complaint.messageId) return;
    setMessages(null);
    setError(null);
    (async () => {
      try {
        const response = await authorizedFetch(
          `${environment.apiUrl}/api/mod/chats/${complaint.chatId}/messages/snippet?messageId=${complaint.messageId}`
        );
        if (response.ok) setMessages((await response.json()) as ChatSnippetMessage[]);
        else setError((await response.text()) || 'Nie udało się pobrać fragmentu czatu.');
      } catch {
        setError('Błąd połączenia z serwerem.');
      }
    })();
  }, [complaint]);

  return (
    <Dialog open={complaint !== null} onClose={onClose} title="Fragment czatu" description={complaint ? `Skarga #${complaint.id}` : undefined} size="lg">
      {error ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : messages === null ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Brak wiadomości do wyświetlenia.</p>
      ) : (
        <ol className="space-y-2">
          {messages.map((m) => {
            const reported = m.id === complaint?.messageId;
            return (
              <li
                key={m.id}
                className={cn('rounded-ui-md border p-3', reported ? 'border-warning/40 bg-warning-soft' : 'border-line bg-surface-muted')}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink">{m.senderName}</span>
                  <span className="flex items-center gap-2">
                    {reported && <Badge tone="warning">Zgłoszona</Badge>}
                    {formatShortDateTime(m.timestamp)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{m.content}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Dialog>
  );
}

/** Notatki moderatorskie — wewnętrzne, niewidoczne dla użytkowników. */
function NotesDialog({ complaint, onClose, onAdded }: { complaint: ComplaintDto | null; onClose: () => void; onAdded: () => void }) {
  const [notes, setNotes] = useState<ComplaintNote[] | null>(null);
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!complaint) return;
    setNotes(null);
    setContent('');
    setError(null);
    (async () => {
      try {
        const response = await authorizedFetch(`${environment.apiUrl}/api/mod/complaints/${complaint.id}/notes`);
        setNotes(response.ok ? ((await response.json()) as ComplaintNote[]) : []);
        if (!response.ok) setError('Nie udało się pobrać notatek.');
      } catch {
        setNotes([]);
        setError('Błąd połączenia z serwerem.');
      }
    })();
  }, [complaint]);

  const add = async () => {
    if (!complaint || !content.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/mod/complaints/${complaint.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (response.ok) {
        const note = (await response.json()) as ComplaintNote;
        setNotes((prev) => [...(prev ?? []), note]);
        setContent('');
        onAdded(); // odświeża licznik notatek na liście
      } else {
        setError((await response.text()) || 'Nie udało się dodać notatki.');
      }
    } catch {
      setError('Błąd połączenia z serwerem.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog
      open={complaint !== null}
      onClose={onClose}
      title={complaint ? `Notatki do skargi #${complaint.id}` : 'Notatki'}
      description="Widoczne tylko dla moderatorów i administratorów."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
          <Button loading={adding} disabled={!content.trim()} onClick={add}>
            Dodaj notatkę
          </Button>
        </>
      }
    >
      {notes === null ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : notes.length === 0 ? (
        <p className="pb-4 text-sm text-ink-muted">Brak notatek do tej skargi.</p>
      ) : (
        <ol className="mb-4 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-ui-md border border-line bg-surface-muted p-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                <span className="font-medium text-ink">{note.authorName}</span>
                <span>{formatShortDateTime(note.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink">{note.content}</p>
            </li>
          ))}
        </ol>
      )}
      <Textarea label="Nowa notatka" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Co ustalono, co zrobiono…" rows={3} />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
