"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { AuthGuard } from '../../../components/AuthGuard';
import { useWebSocketContext } from '../../../context/WebSocketContext';
import { isMobile } from '../../../config/breakpoints';

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
  const isAssignedToMe = selectedChat?.moderatorId === currentModeratorId;

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
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, paddingLeft: 8 }}>Czaty z konsultantem</div>

        {loading ? (
          <div style={{ color: 'white', textAlign: 'center', marginTop: 32 }}>Ładowanie...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chats.length === 0 ? (
              <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: 32, padding: 16 }}>
                Brak dostępnych czatów
              </div>
            ) : (
              chats.map(chat => (
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
                    if (isMobileView) {
                      setShowChatList(false);
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        background: chat.status === 'ASSIGNED' ? '#10b981' : '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16
                      }}>
                        {chat.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {chat.userName}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {chat.status === 'ASSIGNED' 
                            ? chat.moderatorId === currentModeratorId 
                              ? 'Przypisany do mnie' 
                              : `Przypisany do ${chat.moderatorName}`
                            : 'Oczekuje na przypisanie'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#d1d5db', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {chat.lastMessagePreview || 'Brak wiadomości'}
                    </div>
                  </div>
                </div>
              ))
            )}
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
                  {selectedChat.userName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedChat.status === 'OPENED' && (
                  <button
                    onClick={() => assignChat(selectedChat.id)}
                    disabled={assigningChat === selectedChat.id}
                    style={{
                      background: assigningChat === selectedChat.id ? '#6b7280' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: assigningChat === selectedChat.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {assigningChat === selectedChat.id ? 'Przypisywanie...' : 'Przypisz do mnie'}
                  </button>
                )}
                {isAssignedToMe && (
                  <button
                    onClick={() => unassignChat(selectedChat.id)}
                    disabled={unassigningChat === selectedChat.id}
                    style={{
                      background: unassigningChat === selectedChat.id ? '#6b7280' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: unassigningChat === selectedChat.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {unassigningChat === selectedChat.id ? 'Odpinanie...' : 'Odepnij'}
                  </button>
                )}
              </div>
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
                      alignSelf: msg.senderId === currentModeratorId ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      flexDirection: msg.senderId === currentModeratorId ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      marginBottom: 8,
                      maxWidth: '70%'
                    }}
                  >
                    <div
                      style={{
                        background: msg.senderId === currentModeratorId ? '#fbbf24' : '#e5e7eb',
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
            {isAssignedToMe && (
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
            {!isAssignedToMe && selectedChat.status === 'OPENED' && (
              <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', background: '#f7fafc', borderTop: '1px solid #e5e7eb' }}>
                Przypisz czat do siebie, aby móc wysyłać wiadomości
              </div>
            )}
          </>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 18, margin: 'auto', textAlign: 'center' }}>
            Wybierz czat z lewej strony
          </div>
        )}
      </div>
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

