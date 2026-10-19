"use client";
import React, { Fragment, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { environment } from "../../config";
import { authorizedFetch } from "@/utils/auth";
import { getImageUrl } from "@/utils/imageUtils";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { OutgoingMessagePayload } from '../types';
import { isMobile } from '../../config/breakpoints';
import { LuCircleCheck, LuFlag, LuHeadphones } from 'react-icons/lu';
import { Avatar, Button, Dialog, Textarea, cn, pageContainer } from '@/components/ui';
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
  const selectedChat = chats.find(c => c.id === selectedChatId);
  const avatarFor = (participantId: number) => {
    const url = chats.find(c => c.otherParticipantId === participantId)?.avatarUrl;
    return url ? getImageUrl(url) : null;
  };
  const backToList = () => {
    setShowChatList(true);
    setSelectedChatId(null);
    // Wyczyść localStorage gdy nie ma wybranego czatu
    localStorage.removeItem('currentSelectedChatId');
  };

  return (
    <div className={cn(pageContainer, 'py-4 md:py-6')}>
      {/* Potwierdzenie zgłoszenia — znika samo po 5 s */}
      {showReportSuccess && (
        <div role="status" className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-ui-md bg-success px-4 py-2.5 text-sm font-medium text-white shadow-pop">
          <LuCircleCheck size={16} aria-hidden /> Wiadomość została zgłoszona moderatorom
        </div>
      )}

      <ChatFrame>
        {/* Lewy panel: lista czatów */}
        <ChatSidebar
          title="Wiadomości"
          hidden={isMobileView && !showChatList}
          actions={
            <Button variant="secondary" size="sm" fullWidth leftIcon={<LuHeadphones size={16} />} onClick={() => router.push('/consultant-chat')}>
              Czat z konsultantem
            </Button>
          }
        >
          {loading ? (
            <ConversationListSkeleton />
          ) : chats.length === 0 ? (
            <ChatPlaceholder
              title="Brak rozmów"
              description="Napisz do sprzedawcy z karty oferty — rozmowa pojawi się tutaj."
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {chats.map(chat => (
                <li key={chat.id}>
                  <ConversationItem
                    name={chat.otherParticipantName}
                    avatarSrc={chat.avatarUrl ? getImageUrl(chat.avatarUrl) : null}
                    preview={chat.lastMessagePreview}
                    time={listTimeLabel(chat.lastMessageTimestamp)}
                    unread={chat.unreadCount}
                    selected={selectedChatId === chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      // Aktualizuj localStorage z aktualnie wybranym chatId
                      localStorage.setItem('currentSelectedChatId', chat.id.toString());
                      // Na urządzeniach mobilnych ukryj listę czatów
                      if (isMobileView) {
                        setShowChatList(false);
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
                  />
                </li>
              ))}
            </ul>
          )}
        </ChatSidebar>

        {/* Prawy panel: okno rozmowy */}
        <ChatPane hidden={isMobileView && showChatList}>
          {(selectedChatId || isComposingToUser) ? (
            <>
              <ChatHeader
                title={
                  selectedChatId
                    ? selectedChat?.otherParticipantName || 'Czat'
                    : otherUserData ? otherUserData.name : `Nowa rozmowa z użytkownikiem ${otherId}`
                }
                avatarSrc={
                  selectedChatId
                    ? (selectedChat?.avatarUrl ? getImageUrl(selectedChat.avatarUrl) : null)
                    : (otherUserData?.avatarUrl ? getImageUrl(otherUserData.avatarUrl) : null)
                }
                subtitle={!selectedChatId ? 'Nowa rozmowa' : undefined}
                onBack={isMobileView ? backToList : undefined}
              />

              <MessageScroller ref={messagesContainerRef}>
                {selectedChatId && messages.length > 0 ? (
                  messages.map((msg, idx) => {
                    const mine = msg.senderId === userId;
                    const previous = messages[idx - 1];
                    const newDay = startsNewDay(msg.timestamp, previous?.timestamp);
                    // Awatar tylko przy pierwszej wiadomości z serii rozmówcy
                    const firstInSeries = newDay || previous?.senderId !== msg.senderId;
                    return (
                      <Fragment key={msg.id + '-' + idx}>
                        {newDay && <DaySeparator label={dayLabel(msg.timestamp)} />}
                        <MessageBubble
                          data-msg-id={msg.id}
                          mine={mine}
                          content={msg.content}
                          time={timeLabel(msg.timestamp)}
                          avatar={!mine && firstInSeries ? <Avatar name={msg.senderName} src={avatarFor(msg.senderId)} size="sm" /> : undefined}
                          onClick={() => setShowTimestampId(showTimestampId === msg.id ? null : msg.id)}
                          footer={
                            showTimestampId === msg.id ? (
                              <span className="flex items-center gap-2">
                                {formatDateTime(msg.timestamp)}
                                {/* Zgłosić można wiadomość rozmówcy — własnej nie ma sensu */}
                                {!mine && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportMessage(msg);
                                    }}
                                    className="inline-flex items-center gap-1 font-medium text-danger hover:underline"
                                  >
                                    <LuFlag size={12} aria-hidden /> Zgłoś
                                  </button>
                                )}
                              </span>
                            ) : undefined
                          }
                        />
                      </Fragment>
                    );
                  })
                ) : (
                  <ChatPlaceholder
                    title={selectedChatId ? 'Brak wiadomości' : 'Nowa rozmowa'}
                    description={selectedChatId ? 'Napisz coś, żeby zacząć.' : 'Napisz pierwszą wiadomość, aby rozpocząć rozmowę.'}
                  />
                )}
                <div ref={messagesEndRef} />
              </MessageScroller>

              <Composer value={input} onChange={setInput} onSend={sendMessage} />
            </>
          ) : (
            <ChatPlaceholder
              title="Wybierz rozmowę"
              description={chats.length > 0 ? 'Kliknij rozmowę na liście, żeby ją otworzyć.' : 'Gdy napiszesz do sprzedawcy, rozmowa pojawi się na liście.'}
            />
          )}
        </ChatPane>
      </ChatFrame>

      {/* Modal do zgłaszania wiadomości */}
      <Dialog
        open={showReportModal && !!reportingMessage}
        onClose={() => setShowReportModal(false)}
        title="Zgłoś wiadomość"
        description="Zgłoszenie trafi do moderatorów."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReportModal(false)}>
              Anuluj
            </Button>
            <Button variant="danger" onClick={submitReport} disabled={!reportExplanation.trim()} loading={isSubmittingReport}>
              Zgłoś
            </Button>
          </>
        }
      >
        <div className="mb-4 rounded-ui-md border border-line bg-surface-muted p-3">
          <p className="mb-1 text-xs text-ink-muted">Zgłaszana wiadomość</p>
          <p className="whitespace-pre-wrap break-words text-sm text-ink">{reportingMessage?.content}</p>
        </div>
        <Textarea
          label="Powód zgłoszenia"
          value={reportExplanation}
          onChange={(e) => setReportExplanation(e.target.value)}
          placeholder="Opisz, co jest nie tak…"
          rows={4}
        />
      </Dialog>
    </div>
  );
}
