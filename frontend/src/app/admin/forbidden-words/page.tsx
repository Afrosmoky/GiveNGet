"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuCircleAlert, LuPencil, LuPlus, LuRefreshCw, LuSearch, LuX } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';
import { Badge, Button, Card, CardHeader, Chip, Dialog, IconButton, Input, PageHeader, Select, Spinner, cn, consolePage } from '../../../components/ui';

interface ForbiddenWord {
  id: number;
  pattern: string;
  active: boolean;
  category: string | null;
}

type PatternType = 'WORD' | 'REGEX';

/** Element listy wysyłanej do POST /api/admin/forbidden-patterns (upsert: id=null → nowy, _delete → usuń). */
interface EditableWord {
  id?: number;
  pattern: string;
  type: PatternType;
  category?: string;
  active?: boolean;
  _delete?: boolean;
}

interface ForbiddenWordsData {
  wordsByCategory: Record<string, ForbiddenWord[]>;
  regexesByCategory: Record<string, ForbiddenWord[]>;
}

const TYPE_LABELS: Record<PatternType, string> = { WORD: 'Słowa', REGEX: 'Wyrażenia regularne' };

async function upsert(items: EditableWord[]): Promise<string | null> {
  try {
    const response = await authorizedFetch(`${environment.apiUrl}/api/admin/forbidden-patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    return response.ok ? null : (await response.text()) || 'Nie udało się zapisać zmian.';
  } catch {
    return 'Błąd połączenia z serwerem.';
  }
}

export default function ForbiddenWordsPage() {
  const [data, setData] = useState<ForbiddenWordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ word: ForbiddenWord; type: PatternType } | null>(null);
  const [editing, setEditing] = useState<{ category: string; type: PatternType } | null>(null);

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/forbidden-patterns`);
      if (response.ok) setData((await response.json()) as ForbiddenWordsData);
      else if (response.status === 403) setError('Wzorce zakazane może zmieniać tylko administrator.');
      else setError((await response.text()) || 'Nie udało się pobrać wzorców.');
    } catch {
      setError('Błąd połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPatterns();
  }, [fetchPatterns]);

  const categories = useMemo(() => {
    if (!data) return [];
    const names = new Set([...Object.keys(data.wordsByCategory), ...Object.keys(data.regexesByCategory)]);
    return [...names]
      .sort((a, b) => a.localeCompare(b, 'pl'))
      .map((name) => ({
        name,
        count: (data.wordsByCategory[name]?.length ?? 0) + (data.regexesByCategory[name]?.length ?? 0),
      }));
  }, [data]);

  // Domyślnie pierwsza kategoria; po usunięciu ostatniego wzorca kategorii — kolejna
  useEffect(() => {
    if (categories.length > 0 && (!category || !categories.some((c) => c.name === category))) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  const searching = query.trim().length > 0;
  const needle = query.trim().toLowerCase();

  /** Przy wyszukiwaniu przeszukujemy wszystkie kategorie, inaczej pokazujemy wybraną. */
  const sections = useMemo(() => {
    if (!data) return [];
    const names = searching ? categories.map((c) => c.name) : category ? [category] : [];
    return names.flatMap((name) =>
      (['WORD', 'REGEX'] as PatternType[]).map((type) => {
        const source = type === 'WORD' ? data.wordsByCategory[name] : data.regexesByCategory[name];
        const words = (source ?? []).filter((w) => !searching || w.pattern.toLowerCase().includes(needle));
        return { category: name, type, words, total: source?.length ?? 0 };
      })
    ).filter((s) => (searching ? s.words.length > 0 : true));
  }, [data, categories, category, searching, needle]);

  const setLocalActive = (id: number, active: boolean) =>
    setData((prev) => {
      if (!prev) return prev;
      const update = (groups: Record<string, ForbiddenWord[]>) =>
        Object.fromEntries(Object.entries(groups).map(([cat, words]) => [cat, words.map((w) => (w.id === id ? { ...w, active } : w))]));
      return { wordsByCategory: update(prev.wordsByCategory), regexesByCategory: update(prev.regexesByCategory) };
    });

  const toggle = async (word: ForbiddenWord) => {
    setUpdatingIds((prev) => new Set(prev).add(word.id));
    setActionError(null);
    try {
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/admin/forbidden-patterns/${word.id}?active=${!word.active}`,
        { method: 'PATCH' }
      );
      if (response.ok) setLocalActive(word.id, !word.active);
      else setActionError((await response.text()) || 'Nie udało się zmienić statusu wzorca.');
    } catch {
      setActionError('Błąd połączenia z serwerem.');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(word.id);
        return next;
      });
    }
  };

  return (
    <div className={consolePage}>
      <PageHeader
        title="Słowa zakazane"
        description="Wzorce wyłapywane w ofertach i wiadomościach. Zmiany działają od razu."
        actions={
          <Button variant="secondary" leftIcon={<LuRefreshCw size={16} />} onClick={() => void fetchPatterns()} disabled={loading}>
            Odśwież
          </Button>
        }
      />

      {error ? (
        <Card role="alert" className="flex flex-col items-start gap-3 border-danger/30 bg-danger-soft">
          <p className="flex items-center gap-2 text-sm text-danger">
            <LuCircleAlert size={16} aria-hidden /> {error}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void fetchPatterns()}>
            Spróbuj ponownie
          </Button>
        </Card>
      ) : !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : (
        <>
          <AddPatternCard
            categories={categories.map((c) => c.name)}
            defaultCategory={category ?? ''}
            onAdded={(cat) => {
              setCategory(cat);
              setQuery('');
              void fetchPatterns();
            }}
          />

          <Card className="mb-4">
            <Input
              type="search"
              label="Szukaj wzorca"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szuka we wszystkich kategoriach…"
              leftIcon={<LuSearch size={16} />}
              containerClassName="mb-4"
            />
            <div role="group" aria-label="Kategoria" className={cn('flex flex-wrap gap-2', searching && 'opacity-50')}>
              {categories.map((c) => (
                <Chip key={c.name} selected={!searching && category === c.name} count={c.count} onClick={() => { setQuery(''); setCategory(c.name); }}>
                  {c.name}
                </Chip>
              ))}
            </div>
          </Card>

          {actionError && (
            <p role="alert" className="mb-4 rounded-ui-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {actionError}
            </p>
          )}

          {sections.length === 0 ? (
            <Card className="border-dashed text-center">
              <p className="text-sm text-ink-muted">{searching ? `Brak wzorców pasujących do „${query.trim()}”.` : 'Brak wzorców.'}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sections.map((s) => (
                <Card key={`${s.category}-${s.type}`}>
                  <CardHeader
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {searching && <span>{s.category} ·</span>}
                        {TYPE_LABELS[s.type]}
                        <Badge>{searching ? `${s.words.length} z ${s.total}` : s.total}</Badge>
                      </span>
                    }
                    description={s.type === 'REGEX' ? 'Dopasowanie wyrażeniem regularnym — testuj ostrożnie.' : undefined}
                    actions={
                      s.total > 0 && (
                        <Button variant="secondary" size="sm" leftIcon={<LuPencil size={14} />} onClick={() => setEditing({ category: s.category, type: s.type })}>
                          Edytuj
                        </Button>
                      )
                    }
                  />
                  {s.words.length === 0 ? (
                    <p className="text-sm text-ink-muted">Brak wzorców tego typu w kategorii.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {s.words.map((word) => (
                        <PatternPill
                          key={word.id}
                          word={word}
                          busy={updatingIds.has(word.id)}
                          onToggle={() => void toggle(word)}
                          onDelete={() => setToDelete({ word, type: s.type })}
                        />
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-ink-subtle">
            Kliknij wzorzec, żeby go wyłączyć albo włączyć. Wyłączony zostaje na liście, ale nie blokuje treści.
          </p>
        </>
      )}

      <DeletePatternDialog
        target={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={() => {
          setToDelete(null);
          void fetchPatterns();
        }}
      />
      {editing && data && (
        <EditCategoryDialog
          category={editing.category}
          type={editing.type}
          words={(editing.type === 'WORD' ? data.wordsByCategory : data.regexesByCategory)[editing.category] ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void fetchPatterns();
          }}
        />
      )}
    </div>
  );
}

function PatternPill({ word, busy, onToggle, onDelete }: { word: ForbiddenWord; busy: boolean; onToggle: () => void; onDelete: () => void }) {
  return (
    <li
      className={cn(
        'inline-flex h-8 items-center overflow-hidden rounded-full border text-sm',
        word.active ? 'border-line bg-surface' : 'border-dashed border-line-strong bg-surface-muted'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-pressed={word.active}
        title={word.active ? 'Aktywny — kliknij, by wyłączyć' : 'Wyłączony — kliknij, by włączyć'}
        className={cn(
          'flex h-full items-center gap-1.5 pl-3 pr-1.5 font-mono transition-colors hover:bg-surface-muted disabled:cursor-wait',
          word.active ? 'text-ink' : 'text-ink-subtle line-through'
        )}
      >
        {busy ? (
          <Spinner className="h-3 w-3" />
        ) : (
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', word.active ? 'bg-success' : 'bg-ink-subtle')} />
        )}
        <span className="max-w-[16rem] truncate">{word.pattern}</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Usuń wzorzec ${word.pattern}`}
        className="flex h-full items-center px-2 text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <LuX size={14} />
      </button>
    </li>
  );
}

function AddPatternCard({ categories, defaultCategory, onAdded }: { categories: string[]; defaultCategory: string; onAdded: (category: string) => void }) {
  const [pattern, setPattern] = useState('');
  const [type, setType] = useState<PatternType>('WORD');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveCategory = (category || defaultCategory).trim();

  const submit = async () => {
    if (!pattern.trim()) {
      setError('Wpisz wzorzec.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await upsert([{ pattern: pattern.trim(), type, category: effectiveCategory || undefined, active: true }]);
    setSaving(false);
    if (result) {
      setError(result);
      return;
    }
    setPattern('');
    onAdded(effectiveCategory);
  };

  return (
    <Card className="mb-4">
      <CardHeader title="Dodaj wzorzec" description="Nowa kategoria powstaje sama, gdy wpiszesz nazwę spoza listy." className="mb-3" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end"
      >
        <Input label="Wzorzec" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder={type === 'REGEX' ? 'np. \\bkup\\s+teraz\\b' : 'np. gratis'} className="font-mono" error={error ?? undefined} />
        <Select label="Typ" value={type} onChange={(e) => setType(e.target.value as PatternType)}>
          <option value="WORD">Słowo</option>
          <option value="REGEX">Wyrażenie regularne</option>
        </Select>
        <Input label="Kategoria" value={category} onChange={(e) => setCategory(e.target.value.toUpperCase())} placeholder={defaultCategory || 'np. SPAM'} list="forbidden-categories" />
        <datalist id="forbidden-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button type="submit" loading={saving} leftIcon={<LuPlus size={16} />} className="sm:col-span-2 lg:col-span-1">
          Dodaj
        </Button>
      </form>
    </Card>
  );
}

function DeletePatternDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: { word: ForbiddenWord; type: PatternType } | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [target]);

  const confirm = async () => {
    if (!target) return;
    setDeleting(true);
    const result = await upsert([{ id: target.word.id, pattern: target.word.pattern, type: target.type, _delete: true }]);
    setDeleting(false);
    if (result) setError(result);
    else onDeleted();
  };

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title="Usunąć wzorzec?"
      description="Usunięcia nie da się cofnąć. Jeśli chcesz tylko przestać go stosować — wyłącz go."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant="danger" loading={deleting} onClick={confirm}>
            Usuń
          </Button>
        </>
      }
    >
      {target && (
        <p className="text-sm text-ink">
          <span className="rounded-ui-sm bg-surface-sunken px-2 py-1 font-mono">{target.word.pattern}</span>
          <span className="ml-2 text-ink-muted">· {target.word.category ?? 'bez kategorii'}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}

/** Edycja hurtowa kategorii — zmiana treści, typu i stanu wielu wzorców jednym zapisem. */
function EditCategoryDialog({
  category,
  type,
  words,
  onClose,
  onSaved,
}: {
  category: string;
  type: PatternType;
  words: ForbiddenWord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<EditableWord[]>(() =>
    words.map((w) => ({ id: w.id, pattern: w.pattern, type, category: w.category ?? undefined, active: w.active }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (index: number, patch: Partial<EditableWord>) => setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = async () => {
    setSaving(true);
    setError(null);
    // Puste nowe wiersze pomijamy, żeby nie zapisać pustego wzorca
    const result = await upsert(items.filter((item) => item.id || item.pattern.trim()));
    setSaving(false);
    if (result) setError(result);
    else onSaved();
  };

  const marked = items.filter((i) => i._delete).length;

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Edytuj: ${category}`}
      description={`${TYPE_LABELS[type]} · ${items.length} pozycji${marked ? ` · ${marked} do usunięcia` : ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button loading={saving} onClick={save}>
            Zapisz zmiany
          </Button>
        </>
      }
    >
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={item.id ?? `new-${index}`}
            className={cn('flex items-center gap-2 rounded-ui-md border p-2', item._delete ? 'border-danger/30 bg-danger-soft' : 'border-line')}
          >
            <Input
              aria-label="Wzorzec"
              value={item.pattern}
              onChange={(e) => update(index, { pattern: e.target.value })}
              disabled={item._delete}
              className={cn('font-mono', item._delete && 'line-through')}
              placeholder="Nowy wzorzec…"
            />
            <Select
              aria-label="Typ"
              value={item.type}
              onChange={(e) => update(index, { type: e.target.value as PatternType })}
              disabled={item._delete}
              containerClassName="w-28 shrink-0"
            >
              <option value="WORD">Słowo</option>
              <option value="REGEX">Regex</option>
            </Select>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={item.active ?? true}
                onChange={(e) => update(index, { active: e.target.checked })}
                disabled={item._delete}
                className="h-4 w-4 accent-[rgb(var(--brand))]"
              />
              <span className="hidden sm:inline">Aktywny</span>
            </label>
            <IconButton
              label={item._delete ? 'Przywróć' : 'Usuń'}
              icon={item._delete ? <LuRefreshCw size={16} /> : <LuX size={16} />}
              onClick={() =>
                item.id ? update(index, { _delete: !item._delete }) : setItems((prev) => prev.filter((_, i) => i !== index))
              }
              className="h-9 w-9 shrink-0"
            />
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<LuPlus size={14} />}
        className="mt-3"
        onClick={() => setItems((prev) => [...prev, { pattern: '', type, category, active: true }])}
      >
        Dodaj wiersz
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
