"use client";

import { forwardRef, type FormEvent, type ReactNode } from 'react';
import { LuArrowLeft, LuMessagesSquare, LuSendHorizontal } from 'react-icons/lu';
import { Avatar, Spinner, cn } from '../ui';

/**
 * Wspólna warstwa prezentacji czatów (/chats, /consultant-chat, /admin/consultant-chats).
 * Wyłącznie markup i klasy — stan, WebSocket, wysyłka i przewijanie zostają w stronach.
 */

// ---------- Ramka: lista + rozmowa ----------

/** Wysokość ramki: ekran minus pasek górny (na mobile z wyszukiwarką) i dolna nawigacja / marginesy. */
export const chatFrameHeight = 'h-[calc(100dvh-12.5rem)] min-h-[24rem] md:h-[calc(100dvh-9rem)] md:min-h-[32rem]';

export function ChatFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex overflow-hidden rounded-ui-xl border border-line bg-surface shadow-card', chatFrameHeight, className)}>
      {children}
    </div>
  );
}

/** Lewa kolumna z listą rozmów. `hidden` — na mobile, gdy otwarta jest rozmowa. */
export function ChatSidebar({ title, actions, hidden, children }: { title: ReactNode; actions?: ReactNode; hidden?: boolean; children: ReactNode }) {
  return (
    <aside className={cn('flex w-full shrink-0 flex-col border-line md:w-80 md:border-r', hidden && 'hidden')}>
      <div className="border-b border-line px-4 pb-3 pt-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        {actions && <div className="mt-3">{actions}</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </aside>
  );
}

/** Prawa kolumna z rozmową. `hidden` — na mobile, gdy widoczna jest lista. */
export function ChatPane({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  return <section className={cn('min-w-0 flex-1 flex-col bg-surface', hidden ? 'hidden' : 'flex')}>{children}</section>;
}

// ---------- Lista rozmów ----------

interface ConversationItemProps {
  name: string;
  avatarSrc?: string | null;
  /** Zamiast awatara (np. ikona konsultanta). */
  icon?: ReactNode;
  preview?: string | null;
  time?: string | null;
  unread?: number;
  selected?: boolean;
  badge?: ReactNode;
  onClick: () => void;
}

export function ConversationItem({ name, avatarSrc, icon, preview, time, unread = 0, selected, badge, onClick }: ConversationItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-ui-md border px-3 py-2.5 text-left transition-colors',
        selected ? 'border-brand/30 bg-brand-soft' : 'border-transparent hover:bg-surface-muted'
      )}
    >
      {icon ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</span>
      ) : (
        <Avatar name={name} src={avatarSrc} size="lg" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm text-ink', unread > 0 ? 'font-semibold' : 'font-medium')}>{name}</span>
          {time && <span className={cn('shrink-0 text-[11px]', unread > 0 ? 'font-semibold text-brand' : 'text-ink-subtle')}>{time}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-xs', unread > 0 ? 'text-ink' : 'text-ink-muted')}>{preview || 'Brak wiadomości'}</span>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-contrast">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
        {badge && <span className="mt-1.5 block">{badge}</span>}
      </span>
    </button>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-1" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <div className="h-11 w-11 animate-pulse rounded-full bg-surface-sunken" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface-sunken" />
          </div>
        </div>
      ))}
      <span className="sr-only">Ładowanie rozmów…</span>
    </div>
  );
}

// ---------- Rozmowa ----------

export function ChatHeader({
  title,
  subtitle,
  avatarSrc,
  icon,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  avatarSrc?: string | null;
  icon?: ReactNode;
  /** Strzałka powrotu do listy — tylko na mobile. */
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Wróć do listy rozmów"
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <LuArrowLeft size={20} />
        </button>
      )}
      {icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</span>
      ) : (
        <Avatar name={title} src={avatarSrc} size="md" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-ink">{title}</p>
        {subtitle && <div className="truncate text-xs text-ink-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Przewijany obszar wiadomości. Ref jest potrzebny stronie do auto-scrolla i doładowywania historii. */
export const MessageScroller = forwardRef<HTMLDivElement, { children: ReactNode }>(function MessageScroller({ children }, ref) {
  return (
    <div ref={ref} data-messages-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface-muted px-3 py-4 sm:px-5">
      {children}
    </div>
  );
});

/** Etykieta dnia między wiadomościami („Dziś”, „Wczoraj”, „16 października”). */
export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center first:mt-0">
      <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-ink-muted shadow-card">{label}</span>
    </div>
  );
}

interface MessageBubbleProps {
  mine: boolean;
  content: string;
  time: string;
  /** Awatar rozmówcy przy jego wiadomościach (pierwszej z serii). */
  avatar?: ReactNode;
  /** Wiersz pod dymkiem (np. pełna data + „Zgłoś”) — po kliknięciu dymka. */
  footer?: ReactNode;
  onClick?: () => void;
  'data-msg-id'?: number;
}

export function MessageBubble({ mine, content, time, avatar, footer, onClick, ...rest }: MessageBubbleProps) {
  return (
    <div {...rest} className={cn('mb-1.5 flex max-w-[85%] items-end gap-2 sm:max-w-[70%]', mine ? 'flex-row-reverse self-end' : 'self-start')}>
      {!mine && <span className="w-8 shrink-0">{avatar}</span>}
      <div className={cn('flex min-w-0 flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onClick={onClick}
          onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}
          className={cn(
            'max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-card',
            mine ? 'rounded-br-md bg-brand text-brand-contrast' : 'rounded-bl-md bg-surface text-ink',
            onClick && 'cursor-pointer'
          )}
        >
          {content}
          <span className={cn('ml-2 inline-block translate-y-0.5 text-[10px] tabular-nums', mine ? 'text-brand-contrast/70' : 'text-ink-subtle')}>
            {time}
          </span>
        </div>
        {footer && <div className="mt-1 px-1 text-xs text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

export function ChatPlaceholder({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="m-auto flex max-w-xs flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
        {icon ?? <LuMessagesSquare size={22} aria-hidden />}
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function MessagesLoading() {
  return (
    <div className="m-auto py-10">
      <Spinner className="h-6 w-6 text-brand" label="Ładowanie wiadomości" />
    </div>
  );
}

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Pole wiadomości + „Wyślij”. Enter wysyła (jak dotąd), wysyłkę robi strona. */
export function Composer({ value, onChange, onSend, placeholder = 'Napisz wiadomość…', disabled }: ComposerProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSend();
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-line bg-surface px-3 py-3 sm:px-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Treść wiadomości"
        className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface-muted px-4 text-[15px] text-ink placeholder:text-ink-subtle focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Wyślij"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-contrast transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuSendHorizontal size={18} />
      </button>
    </form>
  );
}

// ---------- Daty ----------

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Etykieta dnia dla separatora. */
export function dayLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return 'Dziś';
  if (dayKey(date) === dayKey(yesterday)) return 'Wczoraj';
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** Czy wiadomość zaczyna nowy dzień względem poprzedniej (do wstawienia separatora). */
export function startsNewDay(timestamp: string, previous?: string): boolean {
  if (!previous) return true;
  const a = new Date(timestamp);
  const b = new Date(previous);
  return Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) ? false : dayKey(a) !== dayKey(b);
}

export function timeLabel(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/** Czas na liście rozmów: godzina dziś, „wczoraj”, a dalej data. */
export function listTimeLabel(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const label = dayLabel(timestamp);
  if (label === 'Dziś') return timeLabel(timestamp);
  if (label === 'Wczoraj') return 'wczoraj';
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}
