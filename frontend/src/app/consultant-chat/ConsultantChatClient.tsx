"use client";
import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { environment } from "../../config";
import { authorizedFetch, getUserData } from "@/utils/auth";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { isMobile } from '../../config/breakpoints';

interface ConsultantChat {
  id: number;
  userId: number;
  userName: string;
  moderatorId: number | null;
  moderatorName: string | null;
  status: 'OPENED' | 'ASSIGNED' | 'CLOSED';
  createdAt: string;
  lastMessageAt: string | null;
  closedAt: string | null;
  lastMessagePreview: string | null;
}

interface ConsultantMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  messageType: string;
  chatType?: "REGULAR" | "CONSULTANT"; // Opcjonalne dla kompatybilności wstecznej
}

interface WebSocketNotificationData {
  type: 'NEW_CHAT' | 'CHAT_ASSIGNED' | 'CHAT_UNASSIGNED' | 'NEW_MESSAGE';
  chat?: ConsultantChat;
  message?: ConsultantMessage;
  chatType?: "REGULAR" | "CONSULTANT";
}

// Union type dla danych WebSocket - może być zarówno Message jak i WebSocketNotificationData
type WebSocketData = ConsultantMessage | WebSocketNotificationData;

export default function ConsultantChatClient() {
  const [chats, setChats] = useState<ConsultantChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConsultantMessage[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scrollToBottomOnNewMessage, setScrollToBottomOnNewMessage] = useState(false);
  const fetchingChatsRef = useRef(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const selectedChatIdRef = useRef<number | null>(selectedChatId);
  const chatsRef = useRef<ConsultantChat[]>([]);
  const wsCtx = useWebSocketContext();
  const wsCtxRef = useRef(wsCtx);
  const subscribeToChatsRef = useRef(wsCtx.subscribeToChats);
  const subscribedChatIdsRef = useRef<Set<number>>(new Set());
  const [isConsultantAvailable, setIsConsultantAvailable] = useState<boolean | null>(null);
  
  // Aktualizuj refy
  useEffect(() => {
    wsCtxRef.current = wsCtx;
    subscribeToChatsRef.current = wsCtx.subscribeToChats;
  }, [wsCtx]);

  // Pobierz userId
  useEffect(() => {
    const userData = getUserData();
    if (userData?.id) {
      setUserId(userData.id);
    }
  }, []);

  // Pobierz aktualną datę z backendu i sprawdź dostępność konsultanta
  useEffect(() => {
    const fetchActualDate = async () => {
      try {
        const res = await authorizedFetch(`${environment.apiUrl}/api/chats/actualDate`);
        if (res.ok) {
          const data = await res.json();
          console.log('Otrzymana data z backendu (raw):', data);
          console.log('Typ danych:', typeof data);
          
          // Parsuj datę z JSON (ZonedDateTime z backendu)
          // Format: "2025-11-24T18:40:21.944222987+01:00"
          // Spring Boot ResponseEntity<ZonedDateTime> może zwracać datę jako string w JSON
          let dateString: string;
          
          if (typeof data === 'string') {
            // Jeśli to bezpośrednio string
            dateString = data;
          } else if (data && typeof data === 'object') {
            // Jeśli to obiekt, sprawdź różne możliwe pola
            dateString = data.date || data.timestamp || data.time || data.value || JSON.stringify(data);
          } else {
            // W przeciwnym razie konwertuj na string
            dateString = String(data);
          }
          
          console.log('Parsowana data string:', dateString);
          
          // Parsuj datę - new Date() poprawnie obsługuje ISO 8601 z timezone
          const date = new Date(dateString);
          console.log('Sparsowana data obiekt:', date);
          console.log('Czy data jest poprawna:', !isNaN(date.getTime()));
          
          if (isNaN(date.getTime())) {
            console.error('Nieprawidłowa data:', dateString);
            setIsConsultantAvailable(false);
            return;
          }
          
          // Pobierz godzinę - getHours() zwraca godzinę w lokalnej strefie czasowej przeglądarki
          // Ale jeśli backend zwraca czas w konkretnej strefie (np. +01:00), 
          // to powinniśmy użyć czasu z tej strefie
          // Wyciągnijmy godzinę bezpośrednio z stringa jeśli ma format ISO z timezone
          let hour: number;
          const timezoneMatch = dateString.match(/T(\d{2}):\d{2}:/);
          if (timezoneMatch) {
            // Użyj godziny bezpośrednio z stringa (w strefie czasowej backendu)
            hour = parseInt(timezoneMatch[1], 10);
            console.log('Godzina z timezone backendu:', hour);
          } else {
            // Fallback: użyj lokalnej godziny
            hour = date.getHours();
            console.log('Godzina lokalna:', hour);
          }
          
          // Sprawdź czy jesteśmy między 10-18
          const isAvailable = hour >= 10 && hour < 18;
          console.log('Konsultant dostępny (10-18):', isAvailable, 'dla godziny:', hour);
          setIsConsultantAvailable(isAvailable);
        } else {
          console.error('Błąd odpowiedzi z endpointa actualDate:', res.status, res.statusText);
          setIsConsultantAvailable(false);
        }
      } catch (error) {
        console.error('Błąd pobierania aktualnej daty:', error);
        // W przypadku błędu, ustaw domyślną wartość na false
        setIsConsultantAvailable(false);
      }
    };
    
    fetchActualDate();
  }, []);

  // Pobierz chatId z URL
  useEffect(() => {
    const chatIdParam = searchParams.get("chatId");
    if (chatIdParam) {
      const chatId = parseInt(chatIdParam, 10);
      if (chatId) {
        setSelectedChatId(chatId);
        if (isMobileView) {
          setShowChatList(false);
        }
      }
    }
  }, [searchParams, isMobileView]);

  // Pobierz listę czatów
  useEffect(() => {
    const fetchChats = async () => {
      if (fetchingChatsRef.current) return;
      
      fetchingChatsRef.current = true;
      setLoading(true);
      try {
        const res = await authorizedFetch(`${environment.apiUrl}/api/user/consultant-chat`);
        if (res.ok) {
          const data = await res.json();
          setChats(data);
          // Znajdź aktywny czat (nie zamknięty)
          const activeChat = data.find((c: ConsultantChat) => c.status !== 'CLOSED');
          if (activeChat && !selectedChatId) {
            setSelectedChatId(activeChat.id);
            router.replace(`/consultant-chat?chatId=${activeChat.id}`);
          }
        }
      } catch (error) {
        console.error('Błąd pobierania czatów:', error);
      } finally {
        setLoading(false);
        fetchingChatsRef.current = false;
      }
    };
    
    fetchChats();
  }, []);

  // Rozpocznij nowy czat
  const startNewChat = async () => {
    if (creatingChat) return;
    
    setCreatingChat(true);
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/user/consultant-chat/start`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const newChat = await res.json();
        setChats(prev => [newChat, ...prev]);
        setSelectedChatId(newChat.id);
        router.replace(`/consultant-chat?chatId=${newChat.id}`);
        if (isMobileView) {
          setShowChatList(false);
        }
        // Pobierz wiadomości dla nowego czatu
        fetchMessages(newChat.id);
      }
    } catch (error) {
      console.error('Błąd tworzenia czatu:', error);
    } finally {
      setCreatingChat(false);
    }
  };

  // Pobierz wiadomości
  const fetchMessages = async (chatId: number) => {
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/user/consultant-chat/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setScrollToBottomOnNewMessage(true);
      }
    } catch (error) {
      console.error('Błąd pobierania wiadomości:', error);
    }
  };

  // Aktualizuj refy
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
    chatsRef.current = chats;
  }, [selectedChatId, chats]);

  // Pobierz wiadomości dla wybranego czatu
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId]);

  // Subskrybuj wszystkie aktywne czaty z konsultantem przez WebSocket
  useEffect(() => {
    if (subscribeToChatsRef.current && chats.length > 0) {
      // Subskrybuj wszystkie aktywne czaty (nie zamknięte)
      const activeChatIds = chats
        .filter(chat => chat.status !== 'CLOSED')
        .map(chat => chat.id);
      
      // Sprawdź czy są nowe czaty do subskrypcji
      const newChatIds = activeChatIds.filter(id => !subscribedChatIdsRef.current.has(id));
      
      if (newChatIds.length > 0) {
        // Dodaj nowe ID do zestawu subskrybowanych
        newChatIds.forEach(id => subscribedChatIdsRef.current.add(id));
        
        // Subskrybuj wszystkie aktywne czaty (nie tylko nowe, aby zachować synchronizację)
        subscribeToChatsRef.current(activeChatIds);
      }
    }
  }, [chats]);

  // Obsługa WebSocket dla nowych wiadomości z czatu z konsultantem
  useEffect(() => {
    if (!userId) {
      console.log('ConsultantChatClient: userId is null, skipping WebSocket handler setup');
      return;
    }
    console.log('ConsultantChatClient: Setting up WebSocket handler for userId:', userId);
    const handler = (data: WebSocketData) => {
      console.log('ConsultantChatClient: WebSocket message received:', data);
      console.log('ConsultantChatClient: selectedChatIdRef.current:', selectedChatIdRef.current);
      console.log('ConsultantChatClient: userId:', userId);
      console.log('ConsultantChatClient: Handler is being called!');
      
      // Obsłuż powiadomienia NEW_MESSAGE o nowych wiadomościach w czacie z konsultantem
      if ('type' in data && data.type === 'NEW_MESSAGE' && 'chat' in data && data.chat && 'message' in data && data.message) {
        const notificationData = data as WebSocketNotificationData;
        const chat = notificationData.chat!;
        const message = notificationData.message!;
        
        console.log('ConsultantChatClient: NEW_MESSAGE notification - chat.id:', chat.id, 'message:', message);
        
        // Zaktualizuj listę czatów
        setChats(prev => {
          const existingChat = prev.find(c => c.id === chat.id);
          if (existingChat) {
            return prev.map(c => c.id === chat.id ? chat : c);
          } else {
            return [chat, ...prev];
          }
        });
        
        // Jeśli to wybrany czat, dodaj wiadomość do listy
        console.log('ConsultantChatClient: Checking if chat is selected - selectedChatIdRef.current:', selectedChatIdRef.current, 'chat.id:', chat.id);
        if (selectedChatIdRef.current === chat.id && message) {
          console.log('ConsultantChatClient: Adding message to selected chat');
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              console.log('ConsultantChatClient: Message already exists, skipping');
              return prev;
            }
            console.log('ConsultantChatClient: Adding new message to list');
            return [...prev, message];
          });
          setScrollToBottomOnNewMessage(true);
          
          // Odtwórz dźwięk tylko jeśli nie jest to nasza własna wiadomość
          if (message.senderId !== userId) {
            try {
              const audio = new Audio('/sounds/message.wav');
              audio.volume = 0.3;
              audio.play().catch(err => console.log('Błąd odtwarzania dźwięku:', err));
            } catch (err) {
              console.log('Błąd tworzenia audio:', err);
            }
          }
        } else if (message.senderId !== userId) {
          // Odtwórz dźwięk dla nowych wiadomości w innych czatach
          try {
            const audio = new Audio('/sounds/message.wav');
            audio.volume = 0.3;
            audio.play().catch(err => console.log('Błąd odtwarzania dźwięku:', err));
          } catch (err) {
            console.log('Błąd tworzenia audio:', err);
          }
        }
        return;
      }
      
      // Ignoruj inne powiadomienia (NEW_CHAT, CHAT_ASSIGNED, etc.) - te są dla moderatorów
      if ('type' in data && data.type) {
        return;
      }
      
      // Obsługuj bezpośrednie wiadomości z czatów z konsultantem (CONSULTANT)
      // Ignoruj wiadomości ze zwykłych czatów (REGULAR)
      const messageData = data as ConsultantMessage;
      console.log('ConsultantChatClient: Checking chatType - messageData.chatType:', messageData.chatType);
      if (messageData.chatType && messageData.chatType !== "CONSULTANT") {
        console.log('ConsultantChatClient: Ignoring REGULAR chat message');
        return; // Ignoruj wiadomości ze zwykłych czatów
      }
      
      // Sprawdź czy to wiadomość z czatu z konsultantem (sprawdzamy czy chatId istnieje w naszych czatach)
      // Jeśli nie ma chatType, przyjmujemy że to wiadomość z czatu konsultanta jeśli chatId istnieje w naszej liście
      console.log('ConsultantChatClient: Checking if chat exists - messageData.chatId:', messageData.chatId, 'chatsRef.current:', chatsRef.current.map(c => c.id));
      const isConsultantChat = chatsRef.current.some(chat => chat.id === messageData.chatId);
      console.log('ConsultantChatClient: isConsultantChat:', isConsultantChat);
      
      if (!isConsultantChat) {
        console.log('ConsultantChatClient: Chat not found in chatsRef, ignoring message');
        return;
      }
      
      // Dodaj wiadomość do stanu tylko jeśli pochodzi z aktualnie wybranego czatu
      if (selectedChatIdRef.current === messageData.chatId) {
        setMessages(prev => {
          // Sprawdź czy wiadomość już istnieje (aby uniknąć duplikatów)
          if (prev.some(m => m.id === messageData.id)) {
            return prev;
          }
          return [...prev, messageData];
        });
        setScrollToBottomOnNewMessage(true);
      }
      
      // Odtwórz dźwięk wiadomości tylko jeśli nie jesteśmy na tym czacie
      if (selectedChatIdRef.current !== messageData.chatId) {
        try {
          const audio = new Audio('/sounds/message.wav');
          audio.volume = 0.3;
          audio.play().catch(err => console.log('Błąd odtwarzania dźwięku wiadomości:', err));
        } catch (err) {
          console.log('Błąd tworzenia audio wiadomości:', err);
        }
      }
      
      // Aktualizuj listę czatów z nową wiadomością
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(chat => chat.id === messageData.chatId);
        if (chatIndex !== -1) {
          const updatedChats = [...prevChats];
          const updatedChat = { ...updatedChats[chatIndex] };
          // Aktualizuj ostatnią wiadomość
          updatedChat.lastMessagePreview = messageData.content;
          updatedChat.lastMessageAt = messageData.timestamp;
          updatedChats[chatIndex] = updatedChat;
          // Przenieś zaktualizowany czat na górę listy
          const chatToMove = updatedChats.splice(chatIndex, 1)[0];
          updatedChats.unshift(chatToMove);
          return updatedChats;
        }
        return prevChats;
      });
    };
    
    // Użyj addMessageHandler zamiast setGlobalMessageHandler, aby nie nadpisywać innych handlerów
    if (!wsCtxRef.current.addMessageHandler) {
      console.log('ConsultantChatClient: addMessageHandler is not available');
      return;
    }
    const unregister = wsCtxRef.current.addMessageHandler(handler as (msg: ConsultantMessage) => void);
    
    return () => {
      if (unregister) {
        unregister();
      }
    };
  }, [userId]);


  // Automatyczne przewijanie do dołu
  useEffect(() => {
    if (scrollToBottomOnNewMessage && messages.length > 0) {
      if (messagesContainerRef.current) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      }
      setScrollToBottomOnNewMessage(false);
    }
  }, [messages, scrollToBottomOnNewMessage]);

  // Sprawdź rozmiar ekranu
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(isMobile());
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Wyślij wiadomość
  const sendMessage = async () => {
    if (!input.trim() || !selectedChatId) return;
    
    const messageContent = input.trim();
    setInput(""); // Wyczyść input od razu dla lepszego UX
    
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/user/consultant-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: selectedChatId,
          content: messageContent,
          messageType: 'TEXT'
        })
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, newMessage]);
        setScrollToBottomOnNewMessage(true);
        
        // Lista czatów zostanie zaktualizowana przez WebSocket
      }
    } catch (error) {
      console.error('Błąd wysyłania wiadomości:', error);
      // Przywróć input w przypadku błędu
      setInput(messageContent);
    }
  };

  // Zamknij czat
  const closeChat = async (chatId: number) => {
    if (!confirm('Czy na pewno chcesz zamknąć ten czat?')) return;
    
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/user/consultant-chat/${chatId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Odśwież listę czatów
        const chatsRes = await authorizedFetch(`${environment.apiUrl}/api/user/consultant-chat`);
        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          setChats(chatsData);
        }
        setSelectedChatId(null);
        setMessages([]);
        if (isMobileView) {
          setShowChatList(true);
        }
      }
    } catch (error) {
      console.error('Błąd zamykania czatu:', error);
    }
  };

  // Formatuj datę
  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const activeChat = chats.find(c => c.status !== 'CLOSED');

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', background: '#f7fafc' }}>
      {/* Lewy panel: lista czatów */}
      <div style={{ 
        width: isMobileView ? '100%' : '100%', 
        maxWidth: isMobileView ? '100%' : 320, 
        minWidth: isMobileView ? '100%' : 120, 
        background: '#23272f', 
        color: 'white', 
        padding: 8, 
        overflowY: 'auto',
        display: isMobileView && !showChatList ? 'none' : 'block'
      }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, paddingLeft: 8 }}>Czat z konsultantem</div>
        
        {/* Przycisk rozpocznij nowy czat */}
        {!activeChat && (
          <button
            onClick={startNewChat}
            disabled={creatingChat}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              borderRadius: '8px',
              background: creatingChat ? '#6b7280' : '#10b981',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: creatingChat ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {creatingChat ? 'Tworzenie...' : '+ Rozpocznij nowy czat'}
          </button>
        )}

        {loading ? (
          <div style={{ color: 'white', textAlign: 'center', marginTop: 32 }}>Ładowanie...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chats.map(chat => (
              <div
                key={chat.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: selectedChatId === chat.id ? '#374151' : '#23272f',
                  cursor: 'pointer',
                  marginBottom: 2,
                  transition: 'background 0.2s',
                  border: selectedChatId === chat.id ? '1px solid #4f46e5' : '1px solid transparent'
                }}
                onClick={() => {
                  setSelectedChatId(chat.id);
                  router.replace(`/consultant-chat?chatId=${chat.id}`);
                  if (isMobileView) {
                    setShowChatList(false);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '50%', 
                    background: chat.status === 'CLOSED' ? '#6b7280' : '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16
                  }}>
                    💬
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      Konsultant
                    </div>
                    <div style={{ fontSize: 13, color: '#d1d5db', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {chat.lastMessagePreview || 'Brak wiadomości'}
                    </div>
                    {chat.status === 'CLOSED' && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        Zamknięty
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prawy panel: okno rozmowy */}
      <div style={{ 
        flex: 1, 
        background: 'white', 
        flexDirection: 'column', 
        height: '100%',
        display: isMobileView && showChatList ? 'none' : 'flex'
      }}>
        {/* Komunikat o dostępności konsultanta - zawsze widoczny na górze */}
        {isConsultantAvailable !== null && (
          <div style={{ 
            padding: 12, 
            background: isConsultantAvailable ? '#dbeafe' : '#fef3c7', 
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'center',
            fontSize: 14,
            color: '#1e293b',
            fontWeight: 500
          }}>
            {isConsultantAvailable 
              ? 'Połączono z konsultantem. Przy dużym obłożeniu odpowiedź może potrwać.'
              : 'Konsultanci są dostępni 10–18. Zostaw wiadomość – odpiszemy po otwarciu biura.'}
          </div>
        )}

        {selectedChatId && selectedChat ? (
          <>
            {/* Pasek górny */}
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isMobileView && (
                  <button
                    onClick={() => {
                      setShowChatList(true);
                      setSelectedChatId(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: 18,
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4
                    }}
                  >
                    ←
                  </button>
                )}
                <div style={{ fontWeight: 600, fontSize: 18, color: '#23272f' }}>
                  Konsultant
                </div>
              </div>
              {selectedChat.status !== 'CLOSED' && (
                <button
                  onClick={() => closeChat(selectedChat.id)}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Zamknij czat
                </button>
              )}
            </div>

            {/* Wiadomości */}
            <div 
              ref={messagesContainerRef}
              style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f9fafb', display: 'flex', flexDirection: 'column' }}
            >
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.senderId === userId ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      flexDirection: msg.senderId === userId ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      marginBottom: 8,
                      maxWidth: '70%'
                    }}
                  >
                    <div
                      style={{
                        background: msg.senderId === userId ? '#fbbf24' : '#e5e7eb',
                        color: '#23272f',
                        borderRadius: 16,
                        padding: '8px 16px',
                        wordBreak: 'break-word',
                        fontSize: 15,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{msg.content}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                        {formatDateTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 32 }}>
                  Brak wiadomości
                </div>
              )}
            </div>

            {/* Pole do wpisywania wiadomości */}
            {selectedChat.status !== 'CLOSED' && (
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(); }}
                style={{ display: 'flex', padding: 16, borderTop: '1px solid #e5e7eb', background: '#f7fafc' }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Napisz wiadomość..."
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    borderRadius: 8, 
                    border: '1px solid #d1d5db', 
                    fontSize: 15, 
                    outline: 'none', 
                    marginRight: 8
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  style={{ 
                    background: input.trim() ? '#fbbf24' : '#d1d5db', 
                    color: '#23272f', 
                    border: 'none', 
                    borderRadius: 8, 
                    padding: '0 20px', 
                    fontWeight: 600, 
                    fontSize: 15, 
                    cursor: input.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Wyślij
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 18, margin: 'auto', textAlign: 'center' }}>
            {activeChat ? 'Wybierz czat z lewej strony' : 'Rozpocznij nowy czat z konsultantem'}
          </div>
        )}
      </div>
    </div>
  );
}

