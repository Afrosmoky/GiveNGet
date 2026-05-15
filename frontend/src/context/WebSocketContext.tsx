import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { environment } from '../config';
import { Message } from '@/hooks/useGlobalWebSocket';
import { OutgoingMessagePayload } from '@/app/types';

interface WebSocketContextType {
  subscribeToChats: (chatIds: number[]) => void;
  setGlobalMessageHandler: (handler: ((msg: Message) => void) | null) => void;
  addMessageHandler: (handler: ((msg: Message) => void) | null) => () => void;
  sendMessage: (payload: OutgoingMessagePayload) => boolean;
  userId: number | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children, userId }: { children: ReactNode; userId: number | null }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [subscribedChats, setSubscribedChats] = useState<number[]>([]);
  const subscribedChatsRef = useRef<number[]>([]); // ref zawsze aktualny, używany w onopen
  const globalMessageHandler = useRef<((msg: Message) => void) | null>(null);
  const messageHandlers = useRef<Set<((msg: Message) => void)>>(new Set());
  
  const setGlobalMessageHandler = (handler: ((msg: Message) => void) | null) => {
    globalMessageHandler.current = handler;
  };
  
  const addMessageHandler = (handler: ((msg: Message) => void) | null) => {
    if (!handler) {
      return () => {};
    }
    console.log('WebSocketContext: Adding message handler, current size:', messageHandlers.current.size);
    messageHandlers.current.add(handler);
    console.log('WebSocketContext: Added message handler, new size:', messageHandlers.current.size);
    return () => {
      console.log('WebSocketContext: Removing message handler');
      messageHandlers.current.delete(handler);
      console.log('WebSocketContext: Removed message handler, new size:', messageHandlers.current.size);
    };
  };

  // Funkcja do wysyłania wiadomości
  const sendMessage = (payload: OutgoingMessagePayload): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  // Funkcja do subskrypcji czatów
  const subscribeToChats = (chatIds: number[]) => {
    setSubscribedChats(chatIds);
    subscribedChatsRef.current = chatIds; // zawsze aktualny ref dla onopen
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      chatIds.forEach(chatId => {
        wsRef.current?.send(JSON.stringify({ type: 'SUBSCRIBE', chatId }));
      });
    }
  };

  useEffect(() => {
    if (!userId) return;
    let ws: WebSocket | null = null;
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    ws = new WebSocket(`${environment.apiUrl.replace('http', 'ws')}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Używamy ref zamiast state — ref zawsze ma aktualną wartość,
      // nawet jeśli onopen odpala się po tym jak subscribeToChats już zostało wywołane
      subscribedChatsRef.current.forEach(chatId => {
        ws?.send(JSON.stringify({ type: 'SUBSCRIBE', chatId }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data: Message = JSON.parse(event.data);
        console.log('WebSocketContext: Received message:', data);
        console.log('WebSocketContext: globalMessageHandler.current:', globalMessageHandler.current ? 'exists' : 'null');
        console.log('WebSocketContext: messageHandlers.current.size:', messageHandlers.current.size);
        
        // Wywołaj globalny handler (dla kompatybilności wstecznej)
        if (isMounted && globalMessageHandler.current) {
          console.log('WebSocketContext: Calling globalMessageHandler');
          globalMessageHandler.current(data);
        }
        
        // Wywołaj wszystkie zarejestrowane handlery
        if (isMounted) {
          console.log('WebSocketContext: Calling', messageHandlers.current.size, 'registered handlers');
          Array.from(messageHandlers.current).forEach((handler, index) => {
            try {
              console.log('WebSocketContext: Calling handler', index + 1);
              handler(data);
            } catch (err) {
              console.error('Błąd w handlerze WebSocket:', err);
            }
          });
        }
      } catch (err) {
        console.error('Błąd parsowania wiadomości WebSocket', err);
      }
    };

    return () => {
      isMounted = false;
      ws?.close();
      wsRef.current = null;
      globalMessageHandler.current = null;
      messageHandlers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Subskrybuj nowe czaty jeśli lista się zmieni
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      subscribedChats.forEach(chatId => {
        wsRef.current?.send(JSON.stringify({ type: 'SUBSCRIBE', chatId }));
      });
    }
  }, [subscribedChats]);

  return (
    <WebSocketContext.Provider value={{ subscribeToChats, setGlobalMessageHandler, addMessageHandler, sendMessage, userId }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  return ctx;
}; 