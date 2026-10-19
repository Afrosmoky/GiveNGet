"use client";
import React, { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { AuthGuard } from '../../../components/AuthGuard';
import { useWebSocketContext } from '../../../context/WebSocketContext';
import { isMobile } from '../../../config/breakpoints';
import { LuHeadphones, LuRefreshCw } from 'react-icons/lu';
import { Avatar, Badge, Button, Card, Chip, PageHeader, cn, consolePage } from '../../../components/ui';
import { formatShortDateTime } from '../../../utils/dateFormat';
import { ChatHeader, ChatPane, ChatPlaceholder, Composer, DaySeparator, MessageBubble, MessageScroller, dayLabel, startsNewDay, timeLabel } from '../../../components/chat/ChatUI';

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

function ConsultantChatsPageContent() {
  const [chats, setChats] = useState<ConsultantChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConsultantMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentModeratorId, setCurrentModeratorId] = useState<number | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fetchingChatsRef = useRef(false);
  const [assigningChat, setAssigningChat] = useState<number | null>(null);
  const [unassigningChat, setUnassigningChat] = useState<number | null>(null);
  const [listFilter, setListFilter] = useState<'all' | 'waiting' | 'mine'>('all');
  const selectedChatIdRef = useRef<number | null>(selectedChatId);
  const chatsRef = useRef<ConsultantChat[]>([]);
  const wsCtx = useWebSocketContext();
  const subscribeToChatsRef = useRef(wsCtx.subscribeToChats);
  const subscribedChatIdsRef = useRef<Set<number>>(new Set());

  // Pobierz ID moderatora
  useEffect(() => {
    const userData = getUserData();
    if (userData?.id) {
      setCurrentModeratorId(userData.id);
    }
  }, []);

  // Sprawdź rozmiar ekranu
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(isMobile());
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Pobierz listę czatów
  const fetchChats = useCallback(async () => {
    if (fetchingChatsRef.current) return;
    
    fetchingChatsRef.current = true;
    setLoading(true);
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/mod/consultant-chat`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Błąd pobierania czatów:', error);
    } finally {
      setLoading(false);
      fetchingChatsRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Pobierz wiadomości
  const fetchMessages = async (chatId: number) => {
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/mod/consultant-chat/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // Przewiń na dół
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Błąd pobierania wiadomości:', error);
    }
  };

  // Aktualizuj ref przy zmianie selectedChatId
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Pobierz wiadomości dla wybranego czatu
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId]);

  // Aktualizuj refy
  useEffect(() => {
    chatsRef.current = chats;
    subscribeToChatsRef.current = wsCtx.subscribeToChats;
  }, [chats, wsCtx]);

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

  // Obsługa WebSocket dla powiadomień i wiadomości
  useEffect(() => {
    if (!currentModeratorId) {
      console.log('ConsultantChatsPageContent: currentModeratorId is null, skipping WebSocket handler setup');
      return;
    }
    console.log('ConsultantChatsPageContent: Setting up WebSocket handler for moderatorId:', currentModeratorId);
    const handler = (data: WebSocketData) => {
        console.log('ConsultantChatsPageContent: WebSocket message received:', data);
        console.log('ConsultantChatsPageContent: selectedChatIdRef.current:', selectedChatIdRef.current);
        console.log('ConsultantChatsPageContent: currentModeratorId:', currentModeratorId);
        
        // Sprawdź czy to powiadomienie o czacie z konsultantem (ma pole 'type' ale nie ma 'chatType')
        if ('type' in data && data.type && 'chat' in data && data.chat && !('chatType' in data && data.chatType)) {
          // To jest powiadomienie (NEW_CHAT, CHAT_ASSIGNED, CHAT_UNASSIGNED, NEW_MESSAGE)
          const notificationData = data as WebSocketNotificationData;
          const notificationType = notificationData.type;
          const chat = notificationData.chat!; // chat jest sprawdzony w warunku powyżej
          const message = notificationData.message;
          
          console.log('Consultant chat notification:', notificationType, chat);
          
          switch (notificationType) {
            case 'NEW_CHAT':
              // Dodaj nowy czat do listy (jeśli nie ma go już)
              setTimeout(() => {
                setChats(prev => {
                  if (prev.some(c => c.id === chat.id)) {
                    return prev;
                  }
                  const newChats = [chat, ...prev];
                  
                  // Subskrybuj nowy czat przez WebSocket
                  if (subscribeToChatsRef.current && chat.status !== 'CLOSED' && !subscribedChatIdsRef.current.has(chat.id)) {
                    subscribedChatIdsRef.current.add(chat.id);
                    const activeChatIds = newChats
                      .filter(c => c.status !== 'CLOSED')
                      .map(c => c.id);
                    subscribeToChatsRef.current(activeChatIds);
                  }
                  
                  return newChats;
                });
              }, 0);
              break;
              
            case 'CHAT_ASSIGNED':
              // Zaktualizuj czat w liście
              setTimeout(() => {
                setChats(prev => {
                  const existingChat = prev.find(c => c.id === chat.id);
                  if (existingChat) {
                    // Jeśli czat jest przypisany do mnie, zaktualizuj go
                    if (chat.moderatorId === currentModeratorId) {
                      return prev.map(c => c.id === chat.id ? chat : c);
                    } else {
                      // Jeśli czat jest przypisany do kogoś innego, usuń go z listy
                      return prev.filter(c => c.id !== chat.id);
                    }
                  } else if (chat.moderatorId === currentModeratorId) {
                    // Jeśli czat jest przypisany do mnie i nie ma go w liście, dodaj go
                    return [chat, ...prev];
                  }
                  return prev;
                });
              }, 0);
              break;
              
            case 'CHAT_UNASSIGNED':
              // Zaktualizuj czat w liście (status zmienia się na OPENED)
              setTimeout(() => {
                setChats(prev => {
                  const existingChat = prev.find(c => c.id === chat.id);
                  if (existingChat) {
                    // Zaktualizuj status na OPENED
                    return prev.map(c => c.id === chat.id ? chat : c);
                  } else if (chat.status === 'OPENED') {
                    // Jeśli czat jest OPENED i nie ma go w liście, dodaj go
                    return [chat, ...prev];
                  }
                  return prev;
                });
              }, 0);
              break;
              
            case 'NEW_MESSAGE':
              console.log('ConsultantChatsPageContent: NEW_MESSAGE notification - chat.id:', chat.id, 'message:', message);
              // Zaktualizuj czat w liście (lastMessagePreview)
              setChats(prev => {
                const existingChat = prev.find(c => c.id === chat.id);
                if (existingChat) {
                  return prev.map(c => c.id === chat.id ? chat : c);
                } else if (chat.status === 'OPENED') {
                  // Jeśli to nowa wiadomość w nieprzypisanym czacie, dodaj czat do listy
                  return [chat, ...prev];
                }
                return prev;
              });
              
              // Jeśli to wybrany czat, dodaj wiadomość do listy
              console.log('ConsultantChatsPageContent: Checking if chat is selected - selectedChatIdRef.current:', selectedChatIdRef.current, 'chat.id:', chat.id);
              if (selectedChatIdRef.current === chat.id && message) {
                console.log('ConsultantChatsPageContent: Adding message to selected chat');
                setMessages(prev => {
                  if (prev.some(m => m.id === message.id)) {
                    console.log('ConsultantChatsPageContent: Message already exists, skipping');
                    return prev;
                  }
                  console.log('ConsultantChatsPageContent: Adding new message to list');
                  return [...prev, message];
                });
                
                // Przewiń na dół
                setTimeout(() => {
                  if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                  }
                }, 100);
                
                // Odtwórz dźwięk
                if (message.senderId !== currentModeratorId) {
                  try {
                    const audio = new Audio('/sounds/message.wav');
                    audio.volume = 0.3;
                    audio.play().catch(err => console.log('Błąd odtwarzania dźwięku:', err));
                  } catch (err) {
                    console.log('Błąd tworzenia audio:', err);
                  }
                }
              } else if (chat.status === 'OPENED' && message && message.senderId !== currentModeratorId) {
                // Odtwórz dźwięk dla nowych wiadomości w nieprzypisanych czatach
                try {
                  const audio = new Audio('/sounds/message.wav');
                  audio.volume = 0.3;
                  audio.play().catch(err => console.log('Błąd odtwarzania dźwięku:', err));
                } catch (err) {
                  console.log('Błąd tworzenia audio:', err);
                }
              }
              break;
          }
        } else if ('chatId' in data && data.chatId) {
          // To jest zwykła wiadomość z czatu (bez powiadomienia)
          const messageData = data as ConsultantMessage;
          // Obsługuj tylko wiadomości z czatów z konsultantem (CONSULTANT)
          // Ignoruj wiadomości ze zwykłych czatów (REGULAR)
          if (messageData.chatType && messageData.chatType !== "CONSULTANT") {
            return; // Ignoruj wiadomości ze zwykłych czatów
          }
          
          // Jeśli nie ma chatType, sprawdź czy chatId istnieje w liście czatów konsultanta
          const isConsultantChat = chatsRef.current.some(chat => chat.id === messageData.chatId);
          
          if (!isConsultantChat) {
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
          }
          
          // Przewiń na dół
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          }, 100);
          
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
        }
      };
    
    // Użyj addMessageHandler zamiast setGlobalMessageHandler, aby nie nadpisywać innych handlerów
    const unregister = wsCtx.addMessageHandler ? wsCtx.addMessageHandler(handler as (msg: ConsultantMessage) => void) : null;
    
    return () => {
      if (unregister) {
        unregister();
      }
    };
  }, [currentModeratorId, wsCtx]);

  // Przypisz czat do siebie
  const assignChat = async (chatId: number) => {
    setAssigningChat(chatId);
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/mod/consultant-chat/${chatId}/assign`, {
        method: 'PATCH'
      });
      
      if (res.ok) {
        const updatedChat = await res.json();
        setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));
        setSelectedChatId(chatId);
        if (isMobileView) {
          setShowChatList(false);
        }
        fetchMessages(chatId);
      }
    } catch (error) {
      console.error('Błąd przypisywania czatu:', error);
    } finally {
      setAssigningChat(null);
    }
  };

  // Odepnij czat
  const unassignChat = async (chatId: number) => {
    setUnassigningChat(chatId);
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/mod/consultant-chat/${chatId}/unassign`, {
        method: 'PATCH'
      });
      
      if (res.ok) {
        const updatedChat = await res.json();
        setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
          setMessages([]);
          if (isMobileView) {
            setShowChatList(true);
          }
        }
      }
    } catch (error) {
      console.error('Błąd odpinania czatu:', error);
    } finally {
      setUnassigningChat(null);
    }
  };

  // Wyślij wiadomość
  const sendMessage = async () => {
    if (!input.trim() || !selectedChatId) return;
    
    try {
      const res = await authorizedFetch(`${environment.apiUrl}/api/mod/consultant-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: selectedChatId,
          content: input.trim(),
          messageType: 'TEXT'
        })
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, newMessage]);
        setInput("");
        
        // Lista czatów zostanie zaktualizowana przez WebSocket
        
        // Przewiń na dół
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Błąd wysyłania wiadomości:', error);
    }
  };


  const selectedChat = chats.find(c => c.id === selectedChatId);
  const isAssignedToMe = selectedChat?.moderatorId === currentModeratorId;

  const waitingCount = chats.filter(c => c.status === 'OPENED').length;
  const mineCount = chats.filter(c => c.status === 'ASSIGNED' && c.moderatorId === currentModeratorId).length;
  const visibleChats = chats.filter(chat =>
    listFilter === 'all' ? true : listFilter === 'waiting' ? chat.status === 'OPENED' : chat.status === 'ASSIGNED' && chat.moderatorId === currentModeratorId
  );

  return (
    <div className={cn(consolePage, 'flex flex-col')}>
      <PageHeader
        title="Czaty z konsultantem"
        description="Pytania użytkowników do zespołu. Przypisz rozmowę do siebie, żeby odpowiadać."
        actions={
          <Button variant="secondary" leftIcon={<LuRefreshCw size={16} />} onClick={() => void fetchChats()} disabled={loading}>
            Odśwież
          </Button>
        }
      />

    <Card padding="none" className="flex h-[calc(100dvh-14rem)] min-h-[28rem] overflow-hidden">
      {/* Lewy panel: lista czatów */}
      <div
        className={cn(
          'flex w-full shrink-0 flex-col border-line md:w-96 md:border-r',
          isMobileView && !showChatList && 'hidden'
        )}
      >
        <div className="flex flex-wrap gap-2 border-b border-line p-3" role="group" aria-label="Filtr czatów">
          <Chip selected={listFilter === 'all'} count={chats.length} onClick={() => setListFilter('all')}>Wszystkie</Chip>
          <Chip selected={listFilter === 'waiting'} count={waitingCount} onClick={() => setListFilter('waiting')}>Czekające</Chip>
          <Chip selected={listFilter === 'mine'} count={mineCount} onClick={() => setListFilter('mine')}>Moje</Chip>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && chats.length === 0 ? (
            <div className="space-y-2 p-1">
              {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-ui-md bg-surface-sunken" />)}
            </div>
          ) : visibleChats.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
                <LuHeadphones size={20} aria-hidden />
              </span>
              <p className="text-sm font-medium text-ink">{chats.length === 0 ? 'Brak rozmów' : 'Nic w tym filtrze'}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {chats.length === 0 ? 'Nowe pytania użytkowników pojawią się tu same.' : 'Zmień filtr, żeby zobaczyć pozostałe rozmowy.'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {visibleChats.map(chat => {
                const selected = selectedChatId === chat.id;
                const mine = chat.moderatorId === currentModeratorId;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChatId(chat.id);
                        if (isMobileView) {
                          setShowChatList(false);
                        }
                      }}
                      aria-current={selected || undefined}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-ui-md border p-3 text-left transition-colors',
                        selected ? 'border-brand/40 bg-brand-soft' : 'border-transparent hover:bg-surface-muted'
                      )}
                    >
                      <Avatar name={chat.userName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink">{chat.userName}</span>
                          {chat.lastMessageAt && (
                            <span className="shrink-0 text-[11px] text-ink-subtle">{formatShortDateTime(chat.lastMessageAt)}</span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">{chat.lastMessagePreview || 'Brak wiadomości'}</span>
                        <span className="mt-1.5 block">
                          {chat.status === 'OPENED' ? (
                            <Badge tone="warning" dot>Czeka na konsultanta</Badge>
                          ) : chat.status === 'ASSIGNED' ? (
                            <Badge tone={mine ? 'success' : 'neutral'} dot>{mine ? 'Przypisany do mnie' : `Prowadzi: ${chat.moderatorName ?? '—'}`}</Badge>
                          ) : (
                            <Badge dot>Zamknięty</Badge>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Prawy panel: okno rozmowy */}
      <ChatPane hidden={isMobileView && showChatList}>
        {selectedChatId && selectedChat ? (
          <>
            <ChatHeader
              title={selectedChat.userName}
              subtitle={
                selectedChat.status === 'ASSIGNED'
                  ? isAssignedToMe ? 'Przypisany do mnie' : `Prowadzi: ${selectedChat.moderatorName ?? '—'}`
                  : selectedChat.status === 'OPENED' ? 'Czeka na konsultanta' : 'Zamknięty'
              }
              onBack={
                isMobileView
                  ? () => {
                      setShowChatList(true);
                      setSelectedChatId(null);
                    }
                  : undefined
              }
              actions={
                <>
                  {selectedChat.status === 'OPENED' && (
                    <Button size="sm" loading={assigningChat === selectedChat.id} onClick={() => assignChat(selectedChat.id)}>
                      {assigningChat === selectedChat.id ? 'Przypisywanie…' : 'Przypisz do mnie'}
                    </Button>
                  )}
                  {isAssignedToMe && (
                    <Button variant="secondary" size="sm" loading={unassigningChat === selectedChat.id} onClick={() => unassignChat(selectedChat.id)}>
                      {unassigningChat === selectedChat.id ? 'Odpinanie…' : 'Odepnij'}
                    </Button>
                  )}
                </>
              }
            />

            <MessageScroller ref={messagesContainerRef}>
              {messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const mine = msg.senderId === currentModeratorId;
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
                        avatar={!mine && firstInSeries ? <Avatar name={msg.senderName} size="sm" /> : undefined}
                      />
                    </Fragment>
                  );
                })
              ) : (
                <ChatPlaceholder title="Brak wiadomości" />
              )}
            </MessageScroller>

            {isAssignedToMe && <Composer value={input} onChange={setInput} onSend={sendMessage} />}
            {!isAssignedToMe && selectedChat.status === 'OPENED' && (
              <p className="border-t border-line bg-surface-muted px-4 py-3 text-center text-xs text-ink-muted">
                Przypisz czat do siebie, aby móc wysyłać wiadomości.
              </p>
            )}
          </>
        ) : (
          <ChatPlaceholder icon={<LuHeadphones size={22} aria-hidden />} title="Wybierz rozmowę" description="Kliknij rozmowę na liście po lewej." />
        )}
      </ChatPane>
    </Card>
    </div>
  );
}

export default function ConsultantChatsPage() {
  return (
    <AuthGuard>
      <ConsultantChatsPageContent />
    </AuthGuard>
  );
}

