"use client";
import React, { Fragment, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { environment } from "../../config";
import { authorizedFetch, getUserData } from "@/utils/auth";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { isMobile } from '../../config/breakpoints';
import { LuHeadphones, LuPlus } from 'react-icons/lu';
import { Badge, Button, Dialog, cn, pageContainer } from '@/components/ui';
import {
  ChatFrame,
  ChatHeader,
  ChatPane,
  ChatPlaceholder,
  ChatSidebar,
  Composer,
  ConversationItem,
  ConversationListSkeleton,
  DaySeparator,
  MessageBubble,
  MessageScroller,
  dayLabel,
  listTimeLabel,
  startsNewDay,
  timeLabel,
} from '@/components/chat/ChatUI';

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
  const [confirmCloseId, setConfirmCloseId] = useState<number | null>(null);
  
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
  // Potwierdzenie w oknie modalnym (confirmCloseId) zamiast natywnego confirm()
  const closeChat = async (chatId: number) => {
    
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


  const selectedChat = chats.find(c => c.id === selectedChatId);
  const activeChat = chats.find(c => c.status !== 'CLOSED');

  const startButton = !activeChat && (
    <Button fullWidth leftIcon={<LuPlus size={16} />} loading={creatingChat} onClick={startNewChat}>
      {creatingChat ? 'Tworzenie…' : 'Rozpocznij nowy czat'}
    </Button>
  );

  return (
    <div className={cn(pageContainer, 'py-4 md:py-6')}>
      <ChatFrame>
        {/* Lewy panel: lista czatów */}
        <ChatSidebar title="Czat z konsultantem" hidden={isMobileView && !showChatList} actions={startButton || undefined}>
          {loading ? (
            <ConversationListSkeleton />
          ) : chats.length === 0 ? (
            <ChatPlaceholder
              icon={<LuHeadphones size={22} aria-hidden />}
              title="Nie masz jeszcze rozmów"
              description="Masz pytanie o ofertę, rezerwację albo konto? Rozpocznij czat — odpowie ktoś z zespołu Biovlo."
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {chats.map(chat => (
                <li key={chat.id}>
                  <ConversationItem
                    name={chat.moderatorName ? `Konsultant · ${chat.moderatorName}` : 'Konsultant'}
                    icon={<LuHeadphones size={20} aria-hidden />}
                    preview={chat.lastMessagePreview}
                    time={listTimeLabel(chat.lastMessageAt ?? chat.createdAt)}
                    selected={selectedChatId === chat.id}
                    badge={<ConsultantStatusBadge status={chat.status} />}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      router.replace(`/consultant-chat?chatId=${chat.id}`);
                      if (isMobileView) {
                        setShowChatList(false);
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </ChatSidebar>

        {/* Prawy panel: okno rozmowy */}
        <ChatPane hidden={isMobileView && showChatList}>
          {/* Komunikat o dostępności konsultanta - zawsze widoczny na górze */}
          {isConsultantAvailable !== null && (
            <div
              className={cn(
                'flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-xs font-medium',
                isConsultantAvailable ? 'border-success/20 bg-success-soft text-brand-strong' : 'border-warning/20 bg-warning-soft text-warning'
              )}
            >
              <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', isConsultantAvailable ? 'bg-success' : 'bg-warning')} />
              {isConsultantAvailable
                ? 'Konsultanci są dostępni. Przy dużym obłożeniu odpowiedź może chwilę potrwać.'
                : 'Konsultanci są dostępni 10–18. Zostaw wiadomość — odpiszemy po otwarciu biura.'}
            </div>
          )}

          {selectedChatId && selectedChat ? (
            <>
              <ChatHeader
                title="Konsultant"
                icon={<LuHeadphones size={20} aria-hidden />}
                subtitle={<ConsultantStatusBadge status={selectedChat.status} moderatorName={selectedChat.moderatorName} plain />}
                onBack={
                  isMobileView
                    ? () => {
                        setShowChatList(true);
                        setSelectedChatId(null);
                      }
                    : undefined
                }
                actions={
                  selectedChat.status !== 'CLOSED' && (
                    <Button variant="ghost" size="sm" className="!text-danger" onClick={() => setConfirmCloseId(selectedChat.id)}>
                      Zamknij czat
                    </Button>
                  )
                }
              />

              <MessageScroller ref={messagesContainerRef}>
                {messages.length > 0 ? (
                  messages.map((msg, idx) => {
                    const mine = msg.senderId === userId;
                    const previous = messages[idx - 1];
                    const newDay = startsNewDay(msg.timestamp, previous?.timestamp);
                    const firstInSeries = newDay || previous?.senderId !== msg.senderId;
                    return (
                      <Fragment key={msg.id}>
                        {newDay && <DaySeparator label={dayLabel(msg.timestamp)} />}
                        <MessageBubble
                          mine={mine}
                          content={msg.content}
                          time={timeLabel(msg.timestamp)}
                          avatar={
                            !mine && firstInSeries ? (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand" title={msg.senderName}>
                                <LuHeadphones size={14} aria-hidden />
                              </span>
                            ) : undefined
                          }
                        />
                      </Fragment>
                    );
                  })
                ) : (
                  <ChatPlaceholder
                    icon={<LuHeadphones size={22} aria-hidden />}
                    title="Brak wiadomości"
                    description={selectedChat.status === 'CLOSED' ? 'Ta rozmowa jest zamknięta.' : 'Opisz swoją sprawę — konsultant odpowie w tym oknie.'}
                  />
                )}
              </MessageScroller>

              {selectedChat.status !== 'CLOSED' ? (
                <Composer value={input} onChange={setInput} onSend={sendMessage} />
              ) : (
                <p className="border-t border-line bg-surface-muted px-4 py-3 text-center text-xs text-ink-muted">
                  Rozmowa jest zamknięta.{!activeChat && ' Możesz rozpocząć nową z listy.'}
                </p>
              )}
            </>
          ) : (
            <ChatPlaceholder
              icon={<LuHeadphones size={22} aria-hidden />}
              title={activeChat ? 'Wybierz rozmowę' : 'Porozmawiaj z konsultantem'}
              description={activeChat ? 'Kliknij rozmowę na liście.' : 'Pomożemy z ofertą, rezerwacją albo kontem. Rozpocznij czat przyciskiem na liście.'}
            />
          )}
        </ChatPane>
      </ChatFrame>

      <Dialog
        open={confirmCloseId !== null}
        onClose={() => setConfirmCloseId(null)}
        title="Zamknąć czat?"
        description="Konsultant nie zobaczy już nowych wiadomości w tej rozmowie. W razie potrzeby rozpoczniesz nową."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCloseId(null)}>
              Anuluj
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const chatId = confirmCloseId;
                setConfirmCloseId(null);
                if (chatId !== null) void closeChat(chatId);
              }}
            >
              Zamknij czat
            </Button>
          </>
        }
      />
    </div>
  );
}

function ConsultantStatusBadge({
  status,
  moderatorName,
  plain,
}: {
  status: ConsultantChat['status'];
  moderatorName?: string | null;
  /** Bez plakietki — tekst do podtytułu nagłówka. */
  plain?: boolean;
}) {
  const label =
    status === 'CLOSED' ? 'Zamknięta' : status === 'ASSIGNED' ? (moderatorName ? `Odpowiada: ${moderatorName}` : 'Konsultant przypisany') : 'Czeka na konsultanta';
  if (plain) return <>{label}</>;
  const tone = status === 'CLOSED' ? 'neutral' : status === 'ASSIGNED' ? 'success' : 'warning';
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
