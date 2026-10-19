"use client";

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import { useWebSocketContext } from '../context/WebSocketContext';
import { Message } from './useGlobalWebSocket';

// Typ powiadomienia o nieprzeczytanej wiadomości
export interface UnreadChatNotification {
  userId: number;
  senderName: string;
}

interface ChatSummary {
  id: number;
}

/**
 * Powiadomienia o nieprzeczytanych czatach — logika przeniesiona 1:1 z dawnego Header.tsx:
 * subskrypcja czatów po WS, lista nieprzeczytanych z API, globalny handler wiadomości z dźwiękiem
 * i mark-read po kliknięciu.
 *
 * Wywoływać RAZ, w pasku górnym renderowanym PRZED treścią strony — kolejność efektów względem
 * ChatsClient (który też ustawia globalny handler) musi zostać taka jak dotąd.
 */
export function useChatNotifications() {
  const wsCtx = useWebSocketContext();
  const pathname = usePathname();
  const [unreadChats, setUnreadChats] = useState<UnreadChatNotification[]>([]);

  // Subskrybuj czaty po zalogowaniu
  useEffect(() => {
    if (wsCtx.userId) {
      authorizedFetch(`${environment.apiUrl}/api/chats/me`, { cache: 'no-store' })
        .then(res => res.json())
        .then((chats: ChatSummary[]) => {
          if (Array.isArray(chats)) {
            wsCtx.subscribeToChats(chats.map(c => c.id));
          }
        })
        .catch(err => console.error('Błąd pobierania czatów do subskrypcji:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsCtx.userId]);

  // Pobierz powiadomienia z endpointa po zalogowaniu
  useEffect(() => {
    if (wsCtx.userId) {
      authorizedFetch(`${environment.apiUrl}/api/chats/unread`, { cache: 'no-store' })
        .then(res => res.json())
        .then((data: UnreadChatNotification[]) => {
          if (Array.isArray(data)) {
            setUnreadChats(prev => {
              // Dodaj tylko te powiadomienia, których jeszcze nie ma
              const existingIds = new Set(prev.map(c => c.userId));
              const newNotifs = data.filter(c => !existingIds.has(c.userId));
              return [...prev, ...newNotifs];
            });
          }
        })
        .catch(err => console.error('Błąd pobierania nieprzeczytanych czatów:', err));
    } else {
      // Wylogowanie — nie pokazuj powiadomień poprzedniego konta
      setUnreadChats([]);
    }
  }, [wsCtx.userId]);

  // Dynamiczne powiadomienia przez WebSocket.
  // Zależności jak w starym Header: provider czyści handler przy zmianie userId,
  // a nowa referencja setGlobalMessageHandler przy każdym renderze providera go odtwarza.
  useEffect(() => {
    if (wsCtx.setGlobalMessageHandler) {
      wsCtx.setGlobalMessageHandler((msg: Message) => {
        // Obsługuj tylko wiadomości ze zwykłych czatów (REGULAR)
        // Ignoruj wiadomości z czatów z konsultantem (CONSULTANT) lub powiadomienia (mają pole 'type')
        if (msg.type) {
          return; // To jest powiadomienie, nie wiadomość - ignoruj
        }

        if (msg.chatType && msg.chatType !== 'REGULAR') {
          return; // Ignoruj wiadomości z czatów z konsultantem
        }

        const isOnChatsPage = window.location.pathname === '/chats';
        const currentSelectedChatId = localStorage.getItem('currentSelectedChatId');
        const shouldAddNotification =
          !isOnChatsPage || (isOnChatsPage && currentSelectedChatId && currentSelectedChatId !== msg.chatId?.toString());
        if (shouldAddNotification) {
          setUnreadChats(prev => {
            if (prev.some(c => c.userId === msg.senderId)) return prev;
            try {
              const audio = new Audio('/sounds/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(err => console.log('Błąd odtwarzania dźwięku:', err));
            } catch (err) {
              console.log('Błąd tworzenia audio:', err);
            }
            return [...prev, { userId: msg.senderId, senderName: msg.senderName }];
          });
        }
      });
    }
    return () => {
      if (wsCtx.setGlobalMessageHandler) {
        wsCtx.setGlobalMessageHandler(null);
      }
    };
    // Celowo bez `wsCtx` — zależności 1:1 ze starego Header (patrz komentarz wyżej)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsCtx.setGlobalMessageHandler, pathname]);

  /** Usuwa powiadomienie i oznacza czat jako przeczytany w backendzie. */
  const markRead = useCallback((userId: number) => {
    setUnreadChats(prev => prev.filter(c => c.userId !== userId));
    authorizedFetch(`${environment.apiUrl}/api/chats/${userId}/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }, []);

  return { unreadChats, markRead };
}
