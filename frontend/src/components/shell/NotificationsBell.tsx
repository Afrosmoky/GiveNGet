"use client";

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiBell, FiMessageSquare } from 'react-icons/fi';
import { IconButton } from '../ui';
import type { UnreadChatNotification } from '../../hooks/useChatNotifications';
import { useDismiss } from './useDismiss';

interface NotificationsBellProps {
  unreadChats: UnreadChatNotification[];
  markRead: (userId: number) => void;
}

export function NotificationsBell({ unreadChats, markRead }: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative">
      <IconButton
        label="Powiadomienia"
        icon={<FiBell size={20} />}
        badge={unreadChats.length}
        active={open}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(v => !v)}
      />
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(320px,calc(100vw-32px))] rounded-ui-lg border border-line bg-surface p-2 shadow-pop">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Powiadomienia</p>
          {unreadChats.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-ink-muted">Brak nowych powiadomień</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {unreadChats.map(chat => (
                <li key={chat.userId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-ui-sm px-2 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-sunken"
                    onClick={() => {
                      setOpen(false);
                      markRead(chat.userId);
                      router.push(`/chats?userId=${chat.userId}`);
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <FiMessageSquare size={15} />
                    </span>
                    <span className="min-w-0 truncate">
                      Nowa wiadomość od <span className="font-semibold">{chat.senderName}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
