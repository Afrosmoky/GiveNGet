import { useEffect, useRef } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '@/utils/auth';

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  messageType: string;
  type?: string;
  chatType?: "REGULAR" | "CONSULTANT"; // Opcjonalne dla kompatybilności wstecznej
}

// Typ dla czatu
interface Chat {
  id: number;
  avatarUrl: string;
  createdAt: string;
  otherParticipantId: number;
  otherParticipantName: string;
  lastMessagePreview: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

const useGlobalWebSocket = (
  userId: number | null,
  onMessage: (msg: Message) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    let ws: WebSocket | null = null;
    let chats: Chat[] = [];

    const connect = async () => {
      try {
        // Pobierz czaty użytkownika
        const res = await authorizedFetch(`${environment.apiUrl}/api/chats/me`, { cache: 'no-store' });
        chats = await res.json();
        const token = localStorage.getItem('authToken');
        ws = new WebSocket(`${environment.apiUrl.replace('http', 'ws')}/ws?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          // Subskrybuj wszystkie czaty
          chats.forEach(chat => {
            ws?.send(JSON.stringify({ type: 'SUBSCRIBE', chatId: chat.id }));
          });
        };

        ws.onmessage = (event) => {
          try {
            const data: Message = JSON.parse(event.data);
            if (isMounted) onMessage(data);
          } catch (err) {
            console.error('Błąd parsowania wiadomości WebSocket', err);
          }
        };
      } catch (err) {
        console.error('Błąd połączenia z WebSocket:', err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      wsRef.current?.close();
    };
  }, [userId, onMessage]);
};

export default useGlobalWebSocket; 