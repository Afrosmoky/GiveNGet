"use client";
import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { environment } from "../../config";
import { authorizedFetch } from "@/utils/auth";
import { getImageUrl } from "@/utils/imageUtils";
import { useWebSocketContext } from "@/context/WebSocketContext";
import Image from "next/image";
import { OutgoingMessagePayload } from '../types';
import { isMobile } from '../../config/breakpoints';

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

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  timestamp: string;
  messageType: string;
  chatType?: "REGULAR" | "CONSULTANT"; // Opcjonalne dla kompatybilności wstecznej
}

let lastChatsFetch = 0;

export default function ChatsClient() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [otherUserData, setOtherUserData] = useState<{name: string, avatarUrl?: string} | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showTimestampId, setShowTimestampId] = useState<number | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const selectedChatIdRef = useRef<number | null>(selectedChatId);
  const wsCtx = useWebSocketContext();
  const [scrollToBottomOnNewMessage, setScrollToBottomOnNewMessage] = useState(false);
  const fetchingChatsRef = useRef(false);
  const fetchingUserDataRef = useRef(false);

  // Stan dla modalu zgłaszania
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportExplanation, setReportExplanation] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // PAGINACJA
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Funkcja do formatowania daty bez sekund
  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funkcja do obsługi zgłaszania wiadomości
  const handleReportMessage = (message: Message) => {
    setReportingMessage(message);
    setReportExplanation("");
    setShowReportModal(true);
  };

  // Funkcja do wysyłania zgłoszenia
  const submitReport = async () => {
    if (!reportingMessage || !reportExplanation.trim()) return;
    
    setIsSubmittingReport(true);
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportedUserId: reportingMessage.senderId,
          chatId: reportingMessage.chatId,
          messageId: reportingMessage.id,
          explanation: reportExplanation
        })
      });

      if (response.status === 201) {
        setShowReportModal(false);
        setReportingMessage(null);
        setReportExplanation("");
        setShowReportSuccess(true);
        // Ukryj powiadomienie po 5 sekundach
        setTimeout(() => setShowReportSuccess(false), 5000);
      } else {
        console.error('Błąd podczas wysyłania zgłoszenia');
      }
    } catch (error) {
      console.error('Błąd podczas wysyłania zgłoszenia:', error);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    console.log('Pobrany userId z localStorage:', id);
    if (id) setUserId(Number(id));
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingChatsRef.current) return;
      
      fetchingChatsRef.current = true;
      setLoading(true);
      try {
        const res = await authorizedFetch(`${environment.apiUrl}/api/chats/me`, { cache: "no-store" });
        const data = await res.json();
        setChats(data);
        if (data && data.length > 0) {
          wsCtx.subscribeToChats(data.map((c: Chat) => c.id));
        }
      } catch {
        setChats([]);
      } finally {
        setLoading(false);
        fetchingChatsRef.current = false;
      }
    };
    fetchChats();
  }, []);

  useEffect(() => {
    if (!userId || loading) return;
    const userIdParam = searchParams.get("userId");
    if (userIdParam) {
      const otherId = parseInt(userIdParam, 10);
      if (!otherId || otherId === userId) return;
      const existing = chats.find(c => c.otherParticipantId === otherId);
      if (existing) {
        setSelectedChatId(existing.id);
        // Aktualizuj localStorage z aktualnie wybranym chatId
        localStorage.setItem('currentSelectedChatId', existing.id.toString());
        setOtherUserData(null);
        router.replace("/chats");
        // Na urządzeniach mobilnych ukryj listę czatów
        if (isMobileView) {
          setShowChatList(false);
        }
      } else {
        setSelectedChatId(null);
        // Wyczyść localStorage gdy nie ma wybranego czatu
        localStorage.removeItem('currentSelectedChatId');
        // Na urządzeniach mobilnych ukryj listę czatów i pokaż okienko czatu
        if (isMobileView) {
          setShowChatList(false);
        }
        // Pobierz dane użytkownika z endpointu
        const fetchOtherUserData = async () => {
          // Zapobiegaj podwójnym zapytaniom
          if (fetchingUserDataRef.current) return;
          
          fetchingUserDataRef.current = true;
          try {
            const res = await authorizedFetch(`${environment.apiUrl}/api/profile/${otherId}?withOffers=false&withRate=false`);
            if (res.ok) {
              const responseData = await res.json();
              const userData = responseData.userData;
              setOtherUserData({
                name: userData.name || `Użytkownik ${otherId}`,
                avatarUrl: userData.logoUrl
              });
            } else {
              setOtherUserData({
                name: `Użytkownik ${otherId}`,
                avatarUrl: undefined
              });
            }
          } catch (error) {
            console.error('Błąd podczas pobierania danych użytkownika:', error);
            setOtherUserData({
              name: `Użytkownik ${otherId}`,
              avatarUrl: undefined
            });
          } finally {
            fetchingUserDataRef.current = false;
          }
        };
        fetchOtherUserData();
      }
    } else {
      setOtherUserData(null);
    }
  }, [userId, loading, chats, searchParams, router, isMobileView]);

  // Pobieranie wiadomości z paginacją
  useEffect(() => {
    if (!selectedChatId) return;
    setMessages([]);
    setCurrentPage(0);
    setHasMore(true);
    setIsLoadingMore(false);
    setScrollToBottomOnNewMessage(true); // po wejściu na czat przewiń na dół
    const fetchMessages = async () => {
      try {
        const res = await authorizedFetch(`${environment.apiUrl}/api/chats/${selectedChatId}/messages?page=0`);
        const data = await res.json();
        // Odwróć kolejność, żeby najstarsze były na górze
        setMessages(data.content.slice().reverse());
        setHasMore(!data.last);
      } catch {
        setMessages([]);
        setHasMore(false);
      } finally {
        setTimeout(() => {
          if (messagesContainerRef.current && scrollToBottomOnNewMessage) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            setScrollToBottomOnNewMessage(false);
          }
        }, 100);
      }
    };
    fetchMessages();
  }, [selectedChatId]);

  // Ładowanie starszych wiadomości przy scrollu do góry
  const loadMoreMessages = async () => {
    if (!selectedChatId || isLoadingMore || !hasMore) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    setIsLoadingMore(true);
    // Zapamiętaj wysokość przed doładowaniem
    const prevScrollHeight = container.scrollHeight;
    try {
      const nextPage = currentPage + 1;
      const res = await authorizedFetch(`${environment.apiUrl}/api/chats/${selectedChatId}/messages?page=${nextPage}`);
      const data = await res.json();
      // Odwróć kolejność, żeby najstarsze były na górze
      setMessages(prev => {
        // Po aktualizacji wiadomości ustaw scroll na odpowiednią pozycję
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        }, 0);
        return [...data.content.slice().reverse(), ...prev];
      });
      setCurrentPage(nextPage);
      setHasMore(!data.last);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Obsługa scrolla do góry
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !isLoadingMore) {
        loadMoreMessages();
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, selectedChatId, currentPage]);

  // Automatyczne przewijanie do dołu po wysłaniu nowej wiadomości
  useEffect(() => {
    if (scrollToBottomOnNewMessage && messages.length > 0) {
      if (messagesContainerRef.current) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 0);
      }
      setScrollToBottomOnNewMessage(false);
    }
  }, [messages, scrollToBottomOnNewMessage]);

  // Oznacz czat jako przeczytany po wejściu na czat
  useEffect(() => {
    if (selectedChatId) {
      // Zeruj unreadCount dla wybranego czatu
      setChats(prev => prev.map(chat => chat.id === selectedChatId ? { ...chat, unreadCount: 0 } : chat));
      authorizedFetch(`${environment.apiUrl}/api/chats/${selectedChatId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch((err) => {
        console.error('Błąd podczas oznaczania czatu jako przeczytany:', err);
      });
    }
  }, [selectedChatId]);

  // Hook do sprawdzania rozmiaru ekranu
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(isMobile());
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (wsCtx.setGlobalMessageHandler) {
      wsCtx.setGlobalMessageHandler((data: Message) => {
        // Obsługuj tylko wiadomości ze zwykłych czatów (REGULAR) lub bez chatType (kompatybilność wsteczna)
        // Ignoruj wiadomości z czatów z konsultantem (CONSULTANT)
        if (data.chatType && data.chatType !== "REGULAR") {
          return; // Ignoruj wiadomości z czatów z konsultantem
        }
        
        // Dodaj wiadomość do stanu tylko jeśli pochodzi z aktualnie wybranego czatu
        if (selectedChatIdRef.current === data.chatId) {
          setMessages(prev => [...prev, data]);
        }
        // Odtwórz dźwięk wiadomości tylko jeśli nie jesteśmy na tym czacie
        if (selectedChatIdRef.current !== data.chatId) {
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
          const chatIndex = prevChats.findIndex(chat => chat.id === data.chatId);
          if (chatIndex !== -1) {
            const updatedChats = [...prevChats];
            const updatedChat = { ...updatedChats[chatIndex] };
            // Aktualizuj ostatnią wiadomość
            updatedChat.lastMessagePreview = data.content;
            updatedChat.lastMessageTimestamp = data.timestamp;
            // Zwiększ licznik nieprzeczytanych wiadomości tylko jeśli nie jesteśmy na tym czacie
            if (selectedChatIdRef.current !== data.chatId) {
              const oldCount = updatedChat.unreadCount || 0;
              updatedChat.unreadCount = oldCount + 1;
            } else {
              // Jeśli jesteśmy na tym czacie, zresetuj licznik
              updatedChat.unreadCount = 0;
              // Oznacz wiadomości jako przeczytane w backendzie
              authorizedFetch(`${environment.apiUrl}/api/chats/${data.chatId}/mark-read`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                }
              }).catch(error => {
                console.error('Błąd podczas oznaczania wiadomości jako przeczytane:', error);
              });
            }
            updatedChats[chatIndex] = updatedChat;
            // Przenieś zaktualizowany czat na górę listy
            const chatToMove = updatedChats.splice(chatIndex, 1)[0];
            updatedChats.unshift(chatToMove);
            return updatedChats;
          }
          // Jeśli czat nie istnieje w liście, może to być nowy czat
          // Debounce: nie fetchuj częściej niż co 2 sekundy
          const now = Date.now();
          if (now - lastChatsFetch > 2000) {
            lastChatsFetch = now;
            authorizedFetch(`${environment.apiUrl}/api/chats/me`, { cache: "no-store" })
              .then(res => res.json())
              .then((freshChats) => {
                setChats(freshChats);
              })
              .catch(error => {
                console.error('Błąd podczas odświeżania listy czatów:', error);
              });
          }
          return prevChats;
        });
      });
    }
    return () => {
      if (wsCtx.setGlobalMessageHandler) {
        wsCtx.setGlobalMessageHandler(null);
      }
    };
  }, [wsCtx]);

  // Wyczyść localStorage gdy komponent jest odmontowywany (użytkownik opuszcza stronę czatów)
  useEffect(() => {
    return () => {
      localStorage.removeItem('currentSelectedChatId');
    };
  }, []);

  const userIdParam = searchParams.get("userId");
  const otherId = userIdParam ? parseInt(userIdParam, 10) : null;
  const czatZUserId = otherId && chats.find((c: Chat) => c.otherParticipantId === otherId);
  const isComposingToUser = !!otherId && !czatZUserId;

  const sendMessage = () => {
    console.log('sendMessage called', { input, selectedChatId, userId, isComposingToUser });
    if (!input.trim() || !userId) return;
    
    let payload: OutgoingMessagePayload;
    if (selectedChatId) {
      payload = {
        chatId: selectedChatId,
        senderId: userId,
        content: input,
        messageType: "TEXT"
      };
    } else if (isComposingToUser && otherId) {
      payload = {
        chatId: null,
        recipientId: otherId,
        content: input,
        messageType: "TEXT"
      };
    } else {
      return;
    }

    console.log("Wysyłam przez WebSocket:", payload);
    const success = wsCtx.sendMessage(payload);
    if (!success) {
      console.log("WebSocket nie jest połączony");
      return;
    }
    setInput("");
    setScrollToBottomOnNewMessage(true);

    if (!selectedChatId && isComposingToUser && otherId) {
      setTimeout(() => {
        authorizedFetch(`${environment.apiUrl}/api/chats/me`, { cache: "no-store" })
          .then(res => res.json())
          .then((freshChats) => {
            setChats(freshChats);
            const created = freshChats.find((c: Chat) => c.otherParticipantId === otherId);
            if (created) {
              setSelectedChatId(created.id);
              router.replace("/chats");
            }
          });
      }, 1000);
    }
  };
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', background: '#f7fafc' }}>
      {/* Powiadomienie o pomyślnym zgłoszeniu - na górze ekranu */}
      {showReportSuccess && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1001,
          minWidth: 300,
          maxWidth: 500
        }}>
          ✓ Wiadomość została zgłoszona administratorom
        </div>
      )}
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
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, paddingLeft: 8 }}>Inbox</div>
        {/* Przycisk "Czatuj z konsultantem" */}
        <button
          onClick={() => {
            router.push('/consultant-chat');
          }}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '12px',
            borderRadius: '8px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#4338ca';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#4f46e5';
          }}
        >
          <span>💬</span>
          <span>Czatuj z konsultantem</span>
        </button>
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
                  border: selectedChatId === chat.id ? '1px solid #4f46e5' : '1px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
                onClick={() => {
                  setSelectedChatId(chat.id);
                  // Aktualizuj localStorage z aktualnie wybranym chatId
                  localStorage.setItem('currentSelectedChatId', chat.id.toString());
                  // Na urządzeniach mobilnych ukryj listę czatów
                  if (isMobileView) {
                    setShowChatList(false);
                  }
                  // Ukryj licznik nieprzeczytanych wiadomości
                  if (chat.unreadCount > 0) {
                    // setHiddenUnreadCounts(prev => new Set([...prev, chat.id])); // Removed
                  }
                  // Oznacz czat jako przeczytany
                  if (chat.unreadCount > 0) {
                    authorizedFetch(`${environment.apiUrl}/api/chats/${chat.id}/mark-read`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      }
                    }).catch(error => {
                      console.error('Błąd podczas oznaczania czatu jako przeczytanego:', error);
                    });
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {chat.avatarUrl ? (
                      <Image 
                        src={getImageUrl(chat.avatarUrl)} 
                        alt={chat.otherParticipantName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        width={32}
                        height={32}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLDivElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: '#4b5563', 
                      color: 'white', 
                      borderRadius: '50%', 
                      display: chat.avatarUrl ? 'none' : 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 700, 
                      fontSize: 16 
                    }}>
                      {chat.otherParticipantName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{chat.otherParticipantName}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {new Date(chat.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#d1d5db', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{chat.lastMessagePreview}</div>
                  </div>
                  {(() => {
                    return chat.unreadCount > 0 && (
                      <div style={{ background: '#fde047', color: '#23272f', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 4, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {chat.unreadCount}
                      </div>
                    );
                  })()}
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
        {(selectedChatId || isComposingToUser) ? (
          <>
            {/* Pasek górny */}
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f7fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobileView && (
                <button
                  onClick={() => {
                    setShowChatList(true);
                    setSelectedChatId(null);
                    // Wyczyść localStorage gdy nie ma wybranego czatu
                    localStorage.removeItem('currentSelectedChatId');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: 18,
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 32,
                    height: 32
                  }}
                >
                  ←
                </button>
              )}
              {selectedChatId ? (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => {
                      const selectedChat = chats.find(c => c.id === selectedChatId);
                      if (selectedChat?.avatarUrl) {
                        return (
                          <Image 
                            src={getImageUrl(selectedChat.avatarUrl)} 
                            alt={selectedChat.otherParticipantName}
                            width={40}
                            height={40}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLDivElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: '#4b5563', 
                      color: 'white', 
                      borderRadius: '50%', 
                      display: (() => {
                        const selectedChat = chats.find(c => c.id === selectedChatId);
                        return selectedChat?.avatarUrl ? 'none' : 'flex';
                      })(), 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 700, 
                      fontSize: 16 
                    }}>
                      {(() => {
                        const selectedChat = chats.find(c => c.id === selectedChatId);
                        return selectedChat?.otherParticipantName?.split(' ').map(n => n[0]).join('').toUpperCase() || '';
                      })()}
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: 18, 
                    color: '#23272f',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: isMobileView ? '150px' : 'none'
                  }}>
                    {chats.find(c => c.id === selectedChatId)?.otherParticipantName || "Czat"}
                  </div>
                </>
              ) : (
                <>
                  {otherUserData && (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {otherUserData.avatarUrl ? (
                        <Image 
                          src={getImageUrl(otherUserData.avatarUrl)} 
                          alt={otherUserData.name}
                          width={40}
                          height={40}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLDivElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        background: '#4b5563', 
                        color: 'white', 
                        borderRadius: '50%', 
                        display: otherUserData.avatarUrl ? 'none' : 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        fontSize: 16 
                      }}>
                        {otherUserData.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: 18, 
                    color: '#23272f',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: isMobileView ? '150px' : 'none'
                  }}>
                    {otherUserData ? otherUserData.name : `Nowa rozmowa z użytkownikiem ${otherId}`}
                  </div>
                </>
              )}
            </div>
            {/* Wiadomości */}
            <div 
              ref={messagesContainerRef}
              data-messages-container
              style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f9fafb', display: 'flex', flexDirection: 'column' }}
            >

              {selectedChatId && messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <div
                    key={msg.id + '-' + idx}
                    data-msg-id={msg.id}
                    style={{
                      alignSelf: msg.senderId === userId ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      flexDirection: msg.senderId === userId ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      marginBottom: 8,
                      maxWidth: '70%',
                      position: 'relative'
                    }}
                  >
                    {msg.senderId !== userId && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(() => {
                          // Znajdź awatar z listy czatów na podstawie senderId
                          const senderChat = chats.find(c => c.otherParticipantId === msg.senderId);
                          const avatarUrl = senderChat?.avatarUrl;
                          
                          if (avatarUrl) {
                            return (
                              <Image 
                                src={getImageUrl(avatarUrl)} 
                                alt={msg.senderName}
                                width={28}
                                height={28}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLDivElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          background: '#4b5563', 
                          color: 'white', 
                          borderRadius: '50%', 
                          display: (() => {
                            const senderChat = chats.find(c => c.otherParticipantId === msg.senderId);
                            return senderChat?.avatarUrl ? 'none' : 'flex';
                          })(), 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700, 
                          fontSize: 12 
                        }}>
                          {msg.senderName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div
                      style={{
                        background: msg.senderId === userId ? '#fbbf24' : '#e5e7eb',
                        color: msg.senderId === userId ? '#23272f' : '#23272f',
                        borderRadius: 16,
                        padding: '8px 16px',
                        wordBreak: 'break-word',
                        fontSize: 15,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        maxWidth: '100%'
                      }}
                      onClick={() => setShowTimestampId(showTimestampId === msg.id ? null : msg.id)}
                      onMouseEnter={() => {
                        setHoveredMsgId(msg.id);
                        hoverTimeout.current = setTimeout(() => setShowTooltip(true), 1000);
                      }}
                      onMouseLeave={() => {
                        setHoveredMsgId(null);
                        setShowTooltip(false);
                        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{msg.content}</div>
                      {/* Data pod wiadomością po kliknięciu */}
                      {showTimestampId === msg.id && (
                        <div style={{
                          marginTop: 6,
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: 13,
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}>
                          <span>{formatDateTime(msg.timestamp)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReportMessage(msg);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: 12,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 2
                            }}
                          >
                            zgłoś
                          </button>
                        </div>
                      )}
                      {/* Tooltip z datą */}
                      {hoveredMsgId === msg.id && showTooltip && (
                        <div style={{
                          position: 'absolute',
                          top: (() => {
                            // Sprawdź czy wiadomość jest na górze ekranu
                            const rect = document.querySelector('[data-messages-container]')?.getBoundingClientRect();
                            const msgRect = document.querySelector(`[data-msg-id="${msg.id}"]`)?.getBoundingClientRect();
                            if (rect && msgRect) {
                              // Jeśli wiadomość jest blisko góry, pokaż tooltip pod nią
                              if (msgRect.top - rect.top < 50) {
                                return '100%';
                              }
                            }
                            return '-32px';
                          })(),
                          left: (() => {
                            // Sprawdź czy tooltip zmieści się na ekranie
                            const rect = document.querySelector('[data-messages-container]')?.getBoundingClientRect();
                            const msgRect = document.querySelector(`[data-msg-id="${msg.id}"]`)?.getBoundingClientRect();
                            if (rect && msgRect) {
                              const tooltipWidth = 200; // Przybliżona szerokość tooltipa
                              const msgCenter = msgRect.left + msgRect.width / 2;
                              const containerRight = rect.right;
                              
                              // Jeśli tooltip nie zmieści się po prawej stronie, wyrównaj do prawej krawędzi
                              if (msgCenter + tooltipWidth / 2 > containerRight - 10) {
                                return 'auto';
                              }
                              // Jeśli tooltip nie zmieści się po lewej stronie, wyrównaj do lewej krawędzi
                              if (msgCenter - tooltipWidth / 2 < rect.left + 10) {
                                return '0px';
                              }
                            }
                            return '50%';
                          })(),
                          right: (() => {
                            const rect = document.querySelector('[data-messages-container]')?.getBoundingClientRect();
                            const msgRect = document.querySelector(`[data-msg-id="${msg.id}"]`)?.getBoundingClientRect();
                            if (rect && msgRect) {
                              const tooltipWidth = 200;
                              const msgCenter = msgRect.left + msgRect.width / 2;
                              const containerRight = rect.right;
                              
                              // Jeśli tooltip nie zmieści się po prawej stronie
                              if (msgCenter + tooltipWidth / 2 > containerRight - 10) {
                                return '10px';
                              }
                            }
                            return 'auto';
                          })(),
                          transform: (() => {
                            const rect = document.querySelector('[data-messages-container]')?.getBoundingClientRect();
                            const msgRect = document.querySelector(`[data-msg-id="${msg.id}"]`)?.getBoundingClientRect();
                            if (rect && msgRect) {
                              const tooltipWidth = 200;
                              const msgCenter = msgRect.left + msgRect.width / 2;
                              const containerRight = rect.right;
                              const containerLeft = rect.left;
                              
                              // Jeśli tooltip nie zmieści się po prawej lub lewej stronie, nie używaj transform
                              if (msgCenter + tooltipWidth / 2 > containerRight - 10 || msgCenter - tooltipWidth / 2 < containerLeft + 10) {
                                return 'none';
                              }
                            }
                            return 'translateX(-50%)';
                          })(),
                          background: '#23272f',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                          zIndex: 10,
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {formatDateTime(msg.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 32 }}>
                  {selectedChatId ? 'Brak wiadomości' : 'Napisz pierwszą wiadomość, aby rozpocząć rozmowę'}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Pole do wpisywania wiadomości */}
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              style={{ display: 'flex', padding: 16, borderTop: '1px solid #e5e7eb', background: '#f7fafc' }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Napisz wiadomość..."
                style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, outline: 'none', marginRight: 8 }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button
                type="submit"
                style={{ background: '#fbbf24', color: '#23272f', border: 'none', borderRadius: 8, padding: '0 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}
                disabled={!input.trim()}
              >
                Wyślij
              </button>
            </form>
          </>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 18, margin: 'auto' }}>Wybierz czat z lewej strony, aby rozpocząć rozmowę</div>
        )}
      </div>

      {/* Modal do zgłaszania wiadomości */}
      {showReportModal && reportingMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Zgłoś wiadomość</h3>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Zgłaszana wiadomość */}
            <div style={{
              background: '#f3f4f6',
              padding: 16,
              borderRadius: 8,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                Zgłaszana wiadomość:
              </div>
              <div style={{ fontSize: 15, color: '#23272f' }}>
                {reportingMessage?.content}
              </div>
            </div>

            {/* Formularz */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 500,
                color: '#23272f'
              }}>
                Wyjaśnienie:
              </label>
              <textarea
                value={reportExplanation}
                onChange={(e) => setReportExplanation(e.target.value)}
                placeholder="Opisz powód zgłoszenia..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Przyciski */}
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#23272f',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button
                onClick={submitReport}
                disabled={!reportExplanation.trim() || isSubmittingReport}
                style={{
                  background: reportExplanation.trim() && !isSubmittingReport ? '#ef4444' : '#f3f4f6',
                  color: reportExplanation.trim() && !isSubmittingReport ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: reportExplanation.trim() && !isSubmittingReport ? 'pointer' : 'not-allowed'
                }}
              >
                {isSubmittingReport ? 'Wysyłanie...' : 'Zgłoś'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 